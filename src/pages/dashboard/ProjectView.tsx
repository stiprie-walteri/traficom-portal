import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useOutletContext, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApiClient } from "@/hooks/useApiClient"
import { useAppAlert } from "@/hooks/useAppAlert"
import {
  DocumentStorageService,
  type LegislationTemplate,
  type ProjectComplianceResult,
  type ProjectEvaluationResult,
  type ProjectItem,
  type StoredDocument,
} from "@/lib/documentStorageService"
import {
  extractNormalizedIssues,
  getIssueFixLocation,
  getIssueProblem,
  getIssueSolution,
  getIssueSuggestedInsertText,
  getIssueTitle,
} from "@/lib/documentService"
import { ChessLoader } from "@/components/ChessLoader"
import { UploadChessLoader } from "@/components/ChessLoader"
import type { DashboardOutletContext } from "@/layouts/DashboardLayout"
import { FileWarning, Pencil, Sparkles, X, CheckCircle2, Ban } from "lucide-react"


function getShortProjectStatus(statusMessage?: string | null, currentTask?: string[] | null) {
  const fromMessage = statusMessage?.replace(/^Running\s+/i, "").trim()
  const fromTask = currentTask?.[0]?.trim()
  return fromMessage || fromTask || "Preparing project analysis"
}

type FindingRow = {
  legislationName: string
  title: string
  taskLabel: string
  explanation: string
  solution: string
  suggestedText: string
  fixLocation: string | null
  missingSections: string[]
  incorrectSections: string[]
  isCorrect: boolean
  isCancelled: boolean
  correctnessScore?: number
}

function uniqueItems(items: Array<string | undefined | null>) {
  return Array.from(new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item))))
}

function isTaskCorrect(result: ProjectEvaluationResult) {
  if (typeof result.is_correct === "boolean") {
    return result.is_correct
  }

  const missingSections = uniqueItems(result.missing_sections || [])
  const incorrectSections = uniqueItems((result.incorrect_sections || []).map((section) => section.ID || section.Quote))

  return result.exists !== false && missingSections.length === 0 && incorrectSections.length === 0
}

function hasReportableContent(result: ProjectEvaluationResult) {
  if (result.status === "cancelled") return true
  if (extractNormalizedIssues(result).length > 0) return true
  return Boolean(result.explanation && result.explanation.trim())
}

function summarizeProjectCheck(documents: StoredDocument[], complianceResult: ProjectComplianceResult | null) {
  const rawResults = complianceResult?.legislations?.flatMap((group) => group.results) || complianceResult?.results || []
  const results = rawResults.filter(hasReportableContent)
  const completedResults = results.filter((item) => item.status !== "cancelled")

  let findings = 0
  let missingSections = 0
  let correctSections = 0
  let correctnessTotal = 0
  let scoredItems = 0
  const allSections = completedResults.length
  const cancelledCount = results.length - completedResults.length

  for (const item of completedResults) {
    const issueCount = item.issues?.length || 0
    const missingForTask = uniqueItems(item.missing_sections || [])
    const taskIsCorrect = isTaskCorrect(item) && issueCount === 0

    if (taskIsCorrect) {
      correctSections += 1
    } else {
      findings += issueCount > 0 ? issueCount : 1
    }

    missingSections += missingForTask.length

    if (typeof item.correctness_score === "number") {
      correctnessTotal += item.correctness_score
      scoredItems += 1
    }
  }

  return {
    totalDocuments: documents.length,
    completedDocuments: complianceResult ? documents.length : 0,
    findings,
    correctSections,
    missingSections,
    allSections,
    cancelledCount,
    isPartial: cancelledCount > 0,
    averageCorrectScore: scoredItems > 0
      ? Math.round(correctnessTotal / scoredItems)
      : allSections > 0
        ? Math.round((correctSections / allSections) * 100)
        : 0,
  }
}

function buildFindingRows(results: ProjectEvaluationResult[]): FindingRow[] {
  return results
    .filter(hasReportableContent)
    .flatMap<FindingRow>((result) => {
      const taskLabel = Array.isArray(result.task) ? result.task.join(" / ") : "Finding"
      const isCancelled = result.status === "cancelled"
      const base = {
        legislationName: result.legislation_name || "Legislation",
        taskLabel,
        missingSections: uniqueItems(result.missing_sections || []),
        incorrectSections: uniqueItems((result.incorrect_sections || []).map((section) => section.ID || section.Quote)),
        isCancelled,
        correctnessScore: result.correctness_score,
      }
      const issues = isCancelled ? [] : extractNormalizedIssues(result)

      if (issues.length > 0) {
        return issues.map((issue) => ({
          ...base,
          title: getIssueTitle(issue),
          explanation: getIssueProblem(issue),
          solution: getIssueSolution(issue),
          suggestedText: getIssueSuggestedInsertText(issue),
          fixLocation: getIssueFixLocation(issue),
          isCorrect: false,
        }))
      }

      return [{
        ...base,
        title: taskLabel,
        explanation: result.explanation || (isTaskCorrect(result) ? "Task passed all checks." : ""),
        solution: "",
        suggestedText: "",
        fixLocation: null,
        isCorrect: !isCancelled && isTaskCorrect(result),
      }]
    })
    .sort((left, right) => {
      if (left.isCancelled !== right.isCancelled) return Number(left.isCancelled) - Number(right.isCancelled)
      return Number(left.isCorrect) - Number(right.isCorrect)
    })
}

export function ProjectView() {
  const { id } = useParams<{ id: string }>()
  const {
    organizationId,
    projects,
    refreshWorkspaceData,
    projectEvaluationStatuses,
    refreshProjectEvaluationStatuses,
    setProjectEvaluationStatus,
  } = useOutletContext<DashboardOutletContext>()
  const apiClient = useApiClient()
  const storageService = useMemo(() => new DocumentStorageService(apiClient), [apiClient])
  const { toast } = useAppAlert()

  const [project, setProject] = useState<ProjectItem | null>(null)
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [projectCompliance, setProjectCompliance] = useState<ProjectComplianceResult | null>(null)
  const [templates, setTemplates] = useState<LegislationTemplate[]>([])
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editTemplateIds, setEditTemplateIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [blockingEvaluationStatus, setBlockingEvaluationStatus] = useState<{
    status: "running" | "cancelling"
    completed_count: number
    total_tasks: number
    current_task: string[] | null
    status_message?: string | null
    progress_percent?: number | null
    estimated_seconds_remaining?: number | null
    estimated_completion_at?: string | null
  } | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const listProject = projects.find((item) => item.project_id === id)
  const detailedProjectStatus = id ? projectEvaluationStatuses[id] : undefined
  const progressStatus = blockingEvaluationStatus || detailedProjectStatus
  const isProjectRunning = progressStatus?.status === "running" || progressStatus?.status === "cancelling"

  const loadProjectData = useCallback(async () => {
    if (!organizationId || !id) return

    setIsLoading(true)
    try {
      const [projectData, projectDocs, templateResponse, complianceResponse] = await Promise.all([
        storageService.getProject(organizationId, id),
        storageService.listProjectDocuments(organizationId, id),
        storageService.getTemplates(),
        storageService.getProjectCompliance(organizationId, id),
      ])

      const mergedProject = {
        ...projectData,
        legislation_template_ids: projectData.legislation_template_ids ?? listProject?.legislation_template_ids ?? [],
      }

      setProject(mergedProject)
      setEditName(mergedProject.name || "")
      setEditDescription(mergedProject.description || "")
      setEditTemplateIds(mergedProject.legislation_template_ids || [])
      setDocuments(projectDocs.items || [])
      setTemplates(templateResponse.templates || [])
      setProjectCompliance(complianceResponse.compliance_result)
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Project unavailable", description: "Could not load the project." })
    } finally {
      setIsLoading(false)
    }
  }, [id, listProject?.legislation_template_ids, organizationId, storageService, toast])

  useEffect(() => {
    void loadProjectData()
  }, [loadProjectData])

  const effectiveCompliance = detailedProjectStatus?.compliance_result || projectCompliance
  const effectiveResults = detailedProjectStatus?.results?.length
    ? detailedProjectStatus.results
    : effectiveCompliance?.legislations?.flatMap((group: { results: ProjectEvaluationResult[] }) => group.results) || effectiveCompliance?.results || []

  const summary = summarizeProjectCheck(documents, effectiveCompliance)
  const findingRows = buildFindingRows(effectiveResults)
  const activeTemplateNames = templates
    .filter((template) => project?.legislation_template_ids?.includes(template.id))
    .map((template) => template.name)

  const toggleTemplate = (templateId: string) => {
    setEditTemplateIds((prev) =>
      prev.includes(templateId)
        ? prev.filter((item) => item !== templateId)
        : [...prev, templateId]
    )
  }

  const handleSave = async () => {
    if (!organizationId || !id || !editName.trim() || editTemplateIds.length === 0) return

    setIsSaving(true)
    try {
      const updated = await storageService.updateProject(organizationId, id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        legislation_template_ids: editTemplateIds,
      })

      setProject({
        ...updated,
        legislation_template_ids: updated.legislation_template_ids ?? editTemplateIds,
      })
      await refreshWorkspaceData()
      setIsEditOpen(false)
      toast({ variant: "success", title: "Project updated", description: "Project details saved." })
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Save failed", description: "Could not update the project." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRerunProject = async () => {
    if (!organizationId || !id || documents.length === 0) return

    try {
      const job = await storageService.startProjectEvaluation(
        organizationId,
        id,
        project?.legislation_template_ids || undefined
      )

      const initialRunningStatus = {
        status: "running" as const,
        completed_count: 0,
        total_tasks: 0,
        current_task: ["Preparing project analysis"],
        status_message: "Preparing project analysis",
        progress_percent: 0,
        estimated_seconds_remaining: null,
        estimated_completion_at: null,
      }
      setBlockingEvaluationStatus(initialRunningStatus)

      setProjectEvaluationStatus(id, {
        job_id: job.job_id,
        status: "running",
        organization_id: organizationId,
        project_id: id,
        total_tasks: 0,
        completed_count: 0,
        current_task: ["Preparing project analysis"],
        results: [],
        compliance_result: null,
        error: null,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        documents: [],
        legislation_template_ids: project?.legislation_template_ids || [],
      })

      const finalStatus = await storageService.waitForProjectEvaluationCompletion(
        organizationId,
        id,
        {
          intervalMs: 3500,
          onProgress: (status) => {
            setBlockingEvaluationStatus({
              status: "running",
              completed_count: status.completed_count,
              total_tasks: status.total_tasks,
              current_task: status.current_task,
              status_message: status.status_message,
              progress_percent: status.progress_percent,
              estimated_seconds_remaining: status.estimated_seconds_remaining,
              estimated_completion_at: status.estimated_completion_at,
            })
            setProjectEvaluationStatus(id, status)
          },
          onTransientError: (message, lastStatus) => {
            if (!lastStatus) return

            setBlockingEvaluationStatus({
              status: "running",
              completed_count: lastStatus.completed_count,
              total_tasks: lastStatus.total_tasks,
              current_task: lastStatus.current_task,
              status_message: message,
              progress_percent: lastStatus.progress_percent,
              estimated_seconds_remaining: lastStatus.estimated_seconds_remaining,
              estimated_completion_at: lastStatus.estimated_completion_at,
            })
            setProjectEvaluationStatus(id, {
              ...lastStatus,
              status: "running",
              status_message: message,
            })
          },
        }
      )

      setBlockingEvaluationStatus(null)
      setIsCancelling(false)
      setProjectEvaluationStatus(id, finalStatus)

      if (finalStatus.status === "failed") {
        throw new Error(finalStatus.error || "Project analysis failed")
      }

      const hasCancelledTasks = finalStatus.results?.some((r) => r.status === "cancelled")
      await refreshWorkspaceData()
      await refreshProjectEvaluationStatuses()
      await loadProjectData()
      toast({
        variant: "success",
        title: hasCancelledTasks ? "Analysis stopped" : "Analysis complete",
        description: hasCancelledTasks
          ? "Evaluation was cancelled. Partial results have been saved."
          : "Project analysis finished successfully.",
      })
    } catch (error) {
      console.error(error)
      setBlockingEvaluationStatus(null)
      setIsCancelling(false)
      await refreshProjectEvaluationStatuses()
      toast({ variant: "destructive", title: "Rerun failed", description: "Could not complete analysis for the whole project." })
    }
  }

  const handleCancelProject = async () => {
    if (!organizationId || !id) return

    setIsCancelling(true)
    try {
      await storageService.cancelProjectEvaluation(organizationId, id)
      setBlockingEvaluationStatus((prev) =>
        prev ? { ...prev, status: "cancelling", status_message: "Cancelling evaluation..." } : prev
      )
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Cancel failed", description: "Could not cancel the evaluation." })
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><ChessLoader duration={10} /></div>
  }

  if (!project) {
    return (
      <div className="container mx-auto px-6 py-12">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </div>
    )
  }

  return (
    <div className="relative container mx-auto max-w-6xl px-6 py-10">
      {isEditOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Edit Project</p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">Project settings</h2>
                <p className="mt-1 text-sm text-muted-foreground">Update the project info and legislation templates here.</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsEditOpen(false)} disabled={isSaving || isProjectRunning}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Project name</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Legislation templates</label>
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  {templates.map((template) => {
                    const checked = editTemplateIds.includes(template.id)
                    return (
                      <label
                        key={template.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${checked ? "border-slate-400 bg-white" : "border-slate-200 bg-white/80 hover:border-slate-300"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTemplate(template.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{template.name}</p>
                          <p className="mt-1 break-all text-xs text-muted-foreground">{template.id}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving || isProjectRunning}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={isSaving || isProjectRunning || !editName.trim() || editTemplateIds.length === 0}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={isProjectRunning ? "pointer-events-none select-none" : undefined}>
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Project</p>
                <h1 className="mt-2 text-3xl font-semibold text-foreground">{project.name}</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Project-level summary, legislation scope, and AI-check status across all documents.
                </p>
              </div>
              <Button variant="outline" onClick={() => setIsEditOpen(true)} disabled={isProjectRunning}>
                <Pencil className="h-4 w-4" />
                Edit Project
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Rerun analysis for the whole project</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use this when multiple documents together describe the same topic and need to be rechecked as one project set.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="min-w-[220px] hover:bg-slate-700"
                  onClick={() => void handleRerunProject()}
                  disabled={isProjectRunning || documents.length === 0}
                >
                  <Sparkles className="h-4 w-4" />
                  {isProjectRunning ? "Analysis Running..." : "Rerun Full Project Analysis"}
                </Button>
              </div>
            </div>

            {project.description && (
              <p className="text-sm text-slate-700">{project.description}</p>
            )}

            <div>
              <p className="mb-2 text-sm font-medium">Legislation templates</p>
              <div className="flex flex-wrap gap-2">
                {activeTemplateNames.length > 0 ? activeTemplateNames.map((item) => (
                  <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                    {item}
                  </span>
                )) : (
                  <span className="text-sm text-muted-foreground">No legislation templates configured.</span>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AI Check</p>
                {summary.isPartial && (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Partial
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-2xl font-semibold">Project Summary</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Average score</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{summary.averageCorrectScore}%</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.isPartial ? "Correct tasks / completed tasks" : "Correct tasks / all tasks"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Documents checked</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{summary.completedDocuments}/{summary.totalDocuments}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Correct sections</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{summary.correctSections}</p>
                <p className="mt-1 text-xs text-muted-foreground">Tasks with no missing or incorrect sections</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Open findings</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{summary.findings}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Missing sections</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{summary.missingSections}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">All sections</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{summary.allSections}</p>
                <p className="mt-1 text-xs text-muted-foreground">Each task counts as one section</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {isProjectRunning
                ? "Project-wide analysis is in progress."
                : "No active AI checks are running for this project."}
            </p>
          </section>
        </div>

        <section className="mt-16 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Documents</p>
              <h2 className="mt-2 text-2xl font-semibold">Project documents</h2>
            </div>
          </div>

          <div className="space-y-3">
            {documents.map((doc) => {
              const documentMeta = effectiveCompliance?.documents?.find((item: { document_id: string }) => item.document_id === doc.document_id)

              return (
                <Link
                  key={doc.document_id}
                  to={`/dashboard/document/${doc.document_id}`}
                  state={{ projectId: id }}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-colors hover:border-slate-300"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{doc.title || "Untitled"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}{isProjectRunning ? " - analyzing" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Version</p>
                      <p className="text-sm font-semibold">{documentMeta?.version_no ?? doc.current_version?.version_no ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                      <p className="text-sm font-semibold">
                        {isProjectRunning ? "Running" : effectiveCompliance ? "Ready" : "Not checked"}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}

            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground">No documents in this project yet.</p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AI Checks</p>
                {summary.isPartial && (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Partial
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-2xl font-semibold">All project checks</h2>
            </div>
            <div className="flex items-center gap-2">
              {summary.cancelledCount > 0 && (
                <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500">
                  {summary.cancelledCount} cancelled
                </div>
              )}
              <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                {findingRows.length} total
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {findingRows.map((finding, index) => (
              <div
                key={`${finding.legislationName}-${index}`}
                className={`rounded-2xl border p-4 ${
                  finding.isCancelled
                    ? "border-slate-200 bg-slate-50 opacity-60"
                    : finding.isCorrect
                      ? "border-green-200 bg-green-50/30"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {finding.isCancelled ? (
                        <Ban className="h-4 w-4 text-slate-400" />
                      ) : finding.isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <FileWarning className="h-4 w-4 text-amber-600" />
                      )}
                      <p className={`truncate text-sm font-semibold ${finding.isCancelled ? "text-slate-400" : finding.isCorrect ? "text-green-800" : ""}`}>
                        {finding.title}
                      </p>
                      {finding.isCancelled && (
                        <span className="ml-2 whitespace-nowrap rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Cancelled
                        </span>
                      )}
                      {!finding.isCancelled && finding.isCorrect && (
                        <span className="ml-2 whitespace-nowrap rounded-full border border-green-300 bg-green-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700">
                          Correct section
                        </span>
                      )}
                    </div>
                    <p className={`mt-2 text-sm ${finding.isCancelled ? "text-slate-400" : finding.isCorrect ? "text-green-700/80" : "text-slate-700"}`}>
                      {finding.isCancelled
                        ? "Task was not analyzed due to evaluation cancellation."
                        : finding.explanation || (finding.isCorrect ? "Task passed all checks." : "")}
                    </p>
                    {!finding.isCancelled && finding.isCorrect && (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-green-700">
                        This task is correct.
                      </p>
                    )}
                    {finding.missingSections.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Missing sections</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {finding.missingSections.map((section) => (
                            <span key={section} className="rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700">
                              {section}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {finding.incorrectSections.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Incorrect sections</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {finding.incorrectSections.map((section) => (
                            <span key={section} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                              {section}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Legislation</p>
                    <p className="mt-1 max-w-[220px] truncate text-sm font-semibold">{finding.legislationName}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Status: {finding.isCancelled ? "Cancelled" : finding.isCorrect ? "Correct" : "Needs review"}
                    </p>
                    {typeof finding.correctnessScore === "number" && (
                      <p className="mt-1 text-xs text-muted-foreground">Score: {finding.correctnessScore}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {findingRows.length === 0 && (
              <p className="text-sm text-muted-foreground">No findings yet for this project.</p>
            )}
          </div>
        </section>

      </div>

      {isProjectRunning && progressStatus && (
        <div className="absolute inset-0 z-20 flex items-start justify-center px-6 py-10">
          <div className="w-full max-w-3xl">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-10 shadow-lg backdrop-blur-md">
              <h2 className="text-xl font-semibold text-center mb-2">
                {progressStatus.status === "cancelling" ? "Cancelling evaluation" : "Analyzing project"}
              </h2>
              <p className="text-center text-muted-foreground text-sm mb-8">
                {progressStatus.status === "cancelling"
                  ? "Waiting for in-flight tasks to finish. Remaining tasks will be skipped."
                  : "The full project workflow is still running. Project actions stay disabled until the evaluation finishes."}
              </p>
              <UploadChessLoader
                duration={8}
                statusText={
                  progressStatus.status === "cancelling"
                    ? "Cancelling..."
                    : getShortProjectStatus(progressStatus.status_message, progressStatus.current_task) || "Preparing project analysis..."
                }
              />
              {progressStatus.status !== "cancelling" && (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCancelProject()}
                    disabled={isCancelling}
                  >
                    <Ban className="h-4 w-4" />
                    {isCancelling ? "Cancelling..." : "Cancel Evaluation"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
