import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Upload as UploadIcon,
  File,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  Bot,
  ChevronRight
} from "lucide-react"
import { InlineChessLoader } from "@/components/ChessLoader"
import { cn } from "@/lib/utils"
import { useApiClient } from "@/hooks/useApiClient"
import { DocumentStorageService, StoredDocument, EvaluateTaskResult, EvaluationStatus, DocumentEvaluationStatus, DocumentCompliancePayload } from "@/lib/documentStorageService"
import {
  extractNormalizedIssues,
  getIssueFixLocation,
  getIssueProblem,
  getIssueSolution,
  getIssueSuggestedInsertText,
  getIssueTitle,
} from "@/lib/documentService"
import { useAppAlert } from "@/hooks/useAppAlert"
import type { DashboardOutletContext } from "@/layouts/DashboardLayout"

type UploadStep = "idle" | "uploading" | "done" | "error"

const STEP_LABELS: Record<UploadStep, string> = {
  idle: "",
  uploading: "Uploading document...",
  done: "Complete",
  error: "Failed",
}

function getComplianceResults(payload: DocumentCompliancePayload | null): EvaluateTaskResult[] | null {
  if (!payload) return null
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.results)) return payload.results
  if (Array.isArray(payload.legislations)) {
    return payload.legislations.flatMap((group) => group.results || [])
  }

  return null
}

function EvaluationIssues({ result }: { result: EvaluateTaskResult }) {
  const issues = extractNormalizedIssues(result)

  if (issues.length === 0) return null

  return (
    <div className="mt-2">
      <p className="text-xs font-semibold text-emerald-700">Suggestions and fixes:</p>
      <div className="mt-1 space-y-2">
        {issues.map((issue) => {
          const solution = getIssueSolution(issue)
          const suggestedText = getIssueSuggestedInsertText(issue)
          const fixLocation = getIssueFixLocation(issue)

          return (
            <div key={issue.id} className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs">
              <p className="font-medium text-emerald-950">{getIssueTitle(issue)}</p>
              <p className="mt-1 text-emerald-900">{getIssueProblem(issue)}</p>
              {(solution || suggestedText) && (
                <div className="mt-2">
                  <p className="font-semibold text-emerald-950">How to fix</p>
                  {solution && <p className="mt-1 whitespace-pre-wrap text-emerald-900">{solution}</p>}
                  {suggestedText && suggestedText !== solution && (
                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-white/80 p-2 text-emerald-950">
                      {suggestedText}
                    </pre>
                  )}
                  {fixLocation && <p className="mt-1 text-emerald-800">{fixLocation}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Upload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [docTitle, setDocTitle] = useState("")
  const [docMessage, setDocMessage] = useState("")
  const [step, setStep] = useState<UploadStep>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // New state for querying chunks
  const [queryDocId, setQueryDocId] = useState("")
  const [queryVersionNo, setQueryVersionNo] = useState("1")
  const [isQueryingChunks, setIsQueryingChunks] = useState(false)
  const [queryChunksResult, setQueryChunksResult] = useState<any>(null)
  const [availableDocuments, setAvailableDocuments] = useState<StoredDocument[]>([])
  const [projectId, setProjectId] = useState("")

  // Delete state
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  // Evaluate state
  const [evalDocId, setEvalDocId] = useState("")
  const [evalVersionNo, setEvalVersionNo] = useState("1")
  const [evalTaskGroups, setEvalTaskGroups] = useState<string[][]>([[""]])
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalResults, setEvalResults] = useState<EvaluateTaskResult[] | null>(null)
  const [evalJobStatus, setEvalJobStatus] = useState<EvaluationStatus | null>(null)
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set())
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  
  // Bulk Evaluation Status state
  const [docStatuses, setDocStatuses] = useState<Record<string, DocumentEvaluationStatus>>({})
  const [isPollingStatuses, setIsPollingStatuses] = useState(false)

  const navigate = useNavigate()
  const { toast } = useAppAlert()
  const apiClient = useApiClient()
  const storageService = useMemo(() => new DocumentStorageService(apiClient), [apiClient])
  const { organizationId, projects, selectedProjectId, setSelectedProjectId } = useOutletContext<DashboardOutletContext>()

  useEffect(() => {
    setProjectId(selectedProjectId ?? "")
  }, [selectedProjectId])

  const isProcessing = useMemo(() =>
    step === "uploading" || isQueryingChunks || isEvaluating || !!deletingDocId,
    [step, isQueryingChunks, isEvaluating, deletingDocId]
  )

  const fetchStatuses = useCallback(async () => {
    if (!organizationId) return false
    try {
      const statuses = await storageService.getEvaluationStatuses(organizationId)
      const statusMap: Record<string, DocumentEvaluationStatus> = {}
      let anyAnalyzing = false
      for (const s of statuses) {
        statusMap[s.document_id] = s
        if (s.is_analyzing) anyAnalyzing = true
      }
      setDocStatuses(statusMap)
      return anyAnalyzing
    } catch (err) {
      console.error("Failed to fetch evaluation statuses:", err)
      return false
    }
  }, [organizationId, storageService])

  const refreshDocuments = useCallback(async () => {
    if (organizationId) {
      try {
        const res = await storageService.listDocuments(organizationId)
        setAvailableDocuments(res?.items || [])
        // Fetch statuses immediately
        const shouldPoll = await fetchStatuses()
        if (shouldPoll && !isPollingStatuses) {
          setIsPollingStatuses(true)
        }
      } catch (err) {
        console.error(err)
      }
    }
  }, [organizationId, storageService, fetchStatuses, isPollingStatuses])

  // Fetch available documents for the dropdown
  useEffect(() => {
    refreshDocuments()
  }, [refreshDocuments])

  // Map polling looping effect
  useEffect(() => {
    let timeout: NodeJS.Timeout
    const poll = async () => {
      const shouldContinue = await fetchStatuses()
      if (shouldContinue) {
        timeout = setTimeout(poll, 4000)
      } else {
        setIsPollingStatuses(false)
      }
    }
    if (isPollingStatuses) poll()
    return () => clearTimeout(timeout)
  }, [isPollingStatuses, fetchStatuses])


  // Fetch templates for evaluation
  useEffect(() => {
    storageService.getTemplates()
      .then(res => setTemplates(res?.templates || []))
      .catch((err) => {
        console.error('Failed to load templates:', err)
        toast({ variant: 'destructive', title: 'Templates unavailable', description: 'Could not load evaluation templates from the server.' })
      })
  }, [storageService])

  // Fetch previous compliance result when a document is selected
  useEffect(() => {
    if (!organizationId || !evalDocId) {
      // Don't auto-clear evalResults here if they just ran an evaluation
      return
    }
    
    // Only attempt fetch if we aren't already looking at results for this exact doc
    setEvalJobStatus(null)
    
    const fetchPrevCompliance = async () => {
      try {
        const res = await storageService.getCompliance(organizationId, evalDocId);
        if (res.compliance_result) {
          setEvalResults(getComplianceResults(res.compliance_result));
        } else {
          setEvalResults(null);
        }
      } catch (err) {
        console.error("Failed to load previous compliance:", err);
      }
    };
    fetchPrevCompliance();
  }, [organizationId, evalDocId, storageService]);

  const handleFileSelect = (file: File) => {
    if (file.type === "application/pdf") {
      setSelectedFile(file)
      if (!docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ""))
    } else {
      toast({ variant: "warning", title: "Invalid file type", description: "Please select a PDF document." })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setDocTitle("")
    setDocMessage("")
    setStep("idle")
    setErrorMsg(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDeleteDocument = async (doc: StoredDocument) => {
    if (!organizationId || !doc.document_id) return
    const confirmDelete = confirm(`Are you sure you want to delete ${doc.title || doc.document_id}?`)
    if (!confirmDelete) return

    setDeletingDocId(doc.document_id)
    try {
      await storageService.deleteDocument(organizationId, doc.document_id)
      toast({ title: "Document deleted", description: "Document and all its data were removed." })
      refreshDocuments()
      window.dispatchEvent(new Event("documentListUpdated"))
    } catch (err) {
      console.error("Failed to delete document:", err)
      toast({ variant: "destructive", title: "Delete failed", description: "Could not delete document." })
    } finally {
      setDeletingDocId(null)
    }
  }

  const addTaskGroup = () => setEvalTaskGroups([...evalTaskGroups, [""]])
  const removeTaskGroup = (gi: number) => setEvalTaskGroups(evalTaskGroups.filter((_, i) => i !== gi))
  const addItemToGroup = (gi: number) => {
    const next = [...evalTaskGroups]
    next[gi] = [...next[gi], ""]
    setEvalTaskGroups(next)
  }
  const removeItemFromGroup = (gi: number, ii: number) => {
    const next = [...evalTaskGroups]
    next[gi] = next[gi].filter((_, i) => i !== ii)
    setEvalTaskGroups(next)
  }
  const updateGroupItem = (gi: number, ii: number, val: string) => {
    const next = [...evalTaskGroups]
    next[gi] = [...next[gi]]
    next[gi][ii] = val
    setEvalTaskGroups(next)
  }

  const handleEvaluate = async () => {
    if (!organizationId || !evalDocId || !evalVersionNo) {
      toast({ variant: "warning", title: "Missing info", description: "Please select a document and version." })
      return
    }

    const tasks = evalTaskGroups
      .map(g => g.filter(s => s.trim()))
      .filter(g => g.length > 0)

    if (tasks.length === 0 && !selectedTemplateId) {
      toast({ variant: "warning", title: "No tasks", description: "Please select a template or add at least one task item." })
      return
    }

    setIsEvaluating(true)
    setEvalResults(null)
    setEvalJobStatus(null)
    try {
      const finalTasks = tasks.length > 0 ? tasks : undefined
      const job = await storageService.startEvaluation(organizationId, evalDocId, parseInt(evalVersionNo), finalTasks, selectedTemplateId || undefined)
      
      setIsPollingStatuses(true)

      setEvalJobStatus({
        job_id: job.job_id,
        status: "running",
        total_tasks: 0,
        completed_count: 0,
        current_task: ["Preparing analysis"],
        status_message: "Preparing analysis",
        progress_percent: 0,
        estimated_seconds_remaining: null,
        estimated_completion_at: null,
        results: [],
        error: null,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const finalStatus = await storageService.waitForEvaluationCompletion(
        organizationId,
        evalDocId,
        {
          intervalMs: 3000,
          onProgress: (status) => {
            setEvalJobStatus(status)
            if (status.results) {
              setEvalResults(status.results)
            }
          },
          onTransientError: (message, lastStatus) => {
            if (!lastStatus) return

            setEvalJobStatus({
              ...lastStatus,
              status: "running",
              status_message: message,
              error: null,
            })
          },
        }
      )

      if (finalStatus.status === "failed") {
        toast({ variant: "destructive", title: "Evaluation failed", description: finalStatus.error || "The AI agent encountered an error." })
      }
    } catch (err) {
      console.error("Evaluation failed to start:", err)
      toast({ variant: "destructive", title: "Evaluation failed", description: "Could not complete evaluation after repeated retries." })
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !organizationId || !projectId) return
    setErrorMsg(null)

    setStep("uploading")
    let uploadResult: { document_id: string; version_no: number; organization_id?: string }
    try {
      uploadResult = await storageService.uploadDocument({
        organizationId,
        projectId,
        file: selectedFile,
        title: docTitle || undefined,
        message: docMessage || undefined,
      })
    } catch (err) {
      console.error("Upload failed:", err)
      setStep("error")
      setErrorMsg("Upload failed. Please try again.")
      return
    }

    // Done — dispatch event so sidebar refreshes
    window.dispatchEvent(new Event("documentListUpdated"))
    setStep("done")
    navigate(`/dashboard/document/${uploadResult.document_id}`)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const steps: UploadStep[] = ["uploading"]

  return (
    <div className="w-full">
      <div className="container mx-auto px-6 py-12">
        {/* Slogan */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <p className="text-3xl font-bold italic text-muted-foreground tracking-wide font-['Courier_New',monospace]">
            "Consider it Checked"
          </p>
        </div>

        <div className="mb-8 text-center max-w-3xl mx-auto font-['Courier_New',monospace]">
          <h1 className="text-2xl mb-2">Project Workspace</h1>
          <p className="text-sm text-muted-foreground italic">Upload PDFs into a project and run compliance analysis across shared document sets</p>
        </div>

        <div className="space-y-6 max-w-3xl mx-auto mb-16">
          {!selectedFile ? (
            <div
              className={cn(
                "p-12 text-center transition-all duration-300 border-2 border-dotted border-slate-300 dark:border-slate-700 rounded-sm cursor-pointer group hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md backdrop-blur-sm",
                isDragging && "bg-primary/10 border-primary scale-105 shadow-lg backdrop-blur-md"
              )}
              style={{ backgroundColor: isDragging ? undefined : "hsl(var(--sidebar-bg))" }}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-4">
                <div
                  className={cn(
                    "p-4 backdrop-blur-sm rounded-lg group-hover:bg-primary/10 transition-colors",
                    isDragging && "bg-primary/20"
                  )}
                  style={{ backgroundColor: isDragging ? undefined : "hsl(var(--sidebar-hover))" }}
                >
                  <UploadIcon className={cn("h-12 w-12 text-black dark:text-black group-hover:text-primary transition-colors", isDragging && "text-primary")} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Drop your document here</h3>
                  <p className="text-sm text-muted-foreground mb-1">or click to browse files</p>
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2 justify-center">
                    <FileText className="h-3 w-3" />
                    PDF only • Max 50MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div
                className="p-6 transition-all duration-300 border-2 border-slate-300 dark:border-slate-500 rounded-sm backdrop-blur-sm"
                style={{ backgroundColor: "hsl(var(--sidebar-bg))" }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <File className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{selectedFile.name}</h4>
                        <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)} • PDF DOCUMENT</p>
                      </div>
                      {!isProcessing && (
                        <Button variant="ghost" size="sm" onClick={handleRemoveFile} className="shrink-0">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {!isProcessing && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Project</label>
                          <select
                            value={projectId}
                            onChange={(e) => {
                              setProjectId(e.target.value)
                              setSelectedProjectId(e.target.value || null)
                            }}
                            className="w-full text-sm p-3 rounded border focus:outline-none focus:ring-1 focus:ring-primary bg-transparent"
                          >
                            <option value="">{projects.length === 0 ? "Create a project from the left sidebar first" : "Select project..."}</option>
                            {projects.map((project) => (
                              <option key={project.project_id} value={project.project_id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Document Title</label>
                          <input
                            type="text"
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            className="w-full text-sm p-3 rounded border focus:outline-none focus:ring-1 focus:ring-primary bg-transparent"
                            placeholder="e.g. Maintenance Organisation Exposition"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Description / Note (Optional)</label>
                          <textarea
                            value={docMessage}
                            onChange={(e) => setDocMessage(e.target.value)}
                            rows={2}
                            className="w-full text-sm p-3 rounded border focus:outline-none focus:ring-1 focus:ring-primary bg-transparent resize-none"
                            placeholder="Add a brief description..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action / Progress */}
              <div className="flex gap-3">
                {!isProcessing && step !== "error" ? (
                  <Button onClick={handleUpload} className="flex-1 bg-primary text-primary-foreground" size="lg" disabled={!projectId}>
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Upload to Project
                  </Button>
                ) : step === "error" ? (
                  <div className="flex-1 py-5 px-6 flex items-center gap-3 border border-red-500/40 rounded-sm bg-red-500/5">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-600">{errorMsg}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRemoveFile}>Try again</Button>
                  </div>
                ) : (
                  <div className="flex-1 py-6 flex flex-col items-center gap-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50/50 dark:bg-slate-900/20 backdrop-blur-sm">
                    <InlineChessLoader duration={8} />
                    {/* Step indicators */}
                    <div className="flex items-center gap-3">
                      {steps.map((s, i) => {
                        const stepIndex = steps.indexOf(step)
                        const isDone = i < stepIndex
                        const isCurrent = s === step
                        return (
                          <div key={s} className="flex items-center gap-1.5">
                            {i > 0 && <div className="w-6 h-px bg-slate-300 dark:bg-slate-600" />}
                            <div className={cn(
                              "flex items-center gap-1.5 text-xs font-medium",
                              isCurrent ? "text-primary" : isDone ? "text-green-600" : "text-muted-foreground"
                            )}>
                              {isDone ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <div className={cn("h-3.5 w-3.5 rounded-full border-2", isCurrent ? "border-primary bg-primary/20" : "border-slate-300")} />
                              )}
                              <span>{i + 1}. {STEP_LABELS[s].split("...")[0].replace("Running compliance ", "Analysing").replace(" document", "")}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground animate-pulse">{STEP_LABELS[step]}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Query Chunks Section */}
        <div className="mb-4 mt-8 text-center max-w-3xl mx-auto font-['Courier_New',monospace]">
          <h2 className="text-xl mb-2 text-muted-foreground">Query Document Chunks</h2>
        </div>

        <div className="space-y-6 max-w-3xl mx-auto mb-12">
          <div
            className="p-6 border-2 border-slate-300 dark:border-slate-700 rounded-sm backdrop-blur-sm"
            style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
          >
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Select Document</label>
                <select
                  className="w-full text-sm p-2 rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  onChange={(e) => setQueryDocId(e.target.value)}
                  value={queryDocId}
                  disabled={isQueryingChunks || availableDocuments.length === 0}
                >
                  <option value="">{availableDocuments.length === 0 ? "Loading documents..." : "Select existing..."}</option>
                  {availableDocuments.map(doc => (
                    <option key={doc.document_id} value={doc.document_id}>
                      {doc.title || doc.document_id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Version Number</label>
                <input
                  type="number"
                  min="1"
                  value={queryVersionNo}
                  onChange={(e) => setQueryVersionNo(e.target.value)}
                  disabled={isQueryingChunks}
                  className="w-full text-sm p-2 rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. 1"
                />
              </div>

              <Button
                onClick={async () => {
                  const selectedDoc = availableDocuments.find(d => d.document_id === queryDocId);
                  const orgIdToUse = selectedDoc?.organization_id || organizationId;

                  if (!orgIdToUse || !queryDocId || !queryVersionNo) {
                    toast({
                      variant: "warning",
                      title: "Missing info",
                      description: "Please select a document and enter a version number.",
                    });
                    return;
                  }

                  setIsQueryingChunks(true);
                  setQueryChunksResult(null);

                  try {
                    const result = await storageService.getChunks(orgIdToUse, queryDocId, parseInt(queryVersionNo));
                    // Check if it returned a struct with chunks or is a flat array
                    setQueryChunksResult(result.chunks ? result.chunks : result);
                  } catch (error) {
                    console.error("Error querying chunks:", error);
                    toast({
                      variant: "destructive",
                      title: "Query failed",
                      description: "Failed to query chunks. See console for details.",
                    });
                  } finally {
                    setIsQueryingChunks(false);
                  }
                }}
                className="w-full mt-4"
                size="lg"
                disabled={isQueryingChunks}
              >
                {isQueryingChunks ? (
                  <>
                    <UploadIcon className="mr-2 h-4 w-4 animate-bounce" />
                    Querying...
                  </>
                ) : (
                  "Fetch Sections"
                )}
              </Button>

              {queryChunksResult && (
                <div className="mt-6">
                  <h3 className="text-md font-semibold mb-2 flex items-center justify-between">
                    <span>Results ({Array.isArray(queryChunksResult) ? queryChunksResult.length : Object.keys(queryChunksResult).length} chunks)</span>
                    <Button variant="outline" size="sm" onClick={() => setQueryChunksResult(null)}>Clear</Button>
                  </h3>
                  <div className="max-h-80 overflow-y-auto rounded border border-border bg-black/50 p-4 text-xs font-mono text-green-400">
                    <pre className="whitespace-pre-wrap word-break">{JSON.stringify(queryChunksResult, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workspace Documents Section */}
        {availableDocuments.length > 0 && (
          <>
            <div className="mb-4 mt-8 text-center max-w-3xl mx-auto font-['Courier_New',monospace]">
              <h2 className="text-xl mb-2 text-muted-foreground">Workspace Documents</h2>
            </div>
            <div className="space-y-2 max-w-3xl mx-auto mb-12">
              {availableDocuments.map(doc => {
                const status = docStatuses[doc.document_id]
                return (
                <div
                  key={doc.document_id}
                  className="flex flex-col p-4 border border-slate-300 dark:border-slate-700 rounded-sm"
                  style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium truncate">{doc.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1.5 rounded text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-40"
                        onClick={() => void handleDeleteDocument(doc)}
                        disabled={!!deletingDocId}
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-sm">
                    {!status ? (
                      <span className="text-muted-foreground text-xs italic">Not analyzed</span>
                    ) : status.is_analyzing ? (
                       <div className="flex items-center gap-3">
                         <InlineChessLoader duration={4} />
                         <div className="flex-1">
                           <div className="flex justify-between text-xs mb-1">
                             <span className="text-muted-foreground animate-pulse">Analyzing...</span>
                             <span className="text-muted-foreground">{status.completed_count} / {status.total_tasks || 1} tasks</span>
                           </div>
                           <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                             <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.max(5, (status.completed_count / (status.total_tasks || 1)) * 100)}%` }}></div>
                           </div>
                           {status.current_task && status.current_task.length > 0 && <p className="text-[10px] text-muted-foreground mt-1 truncate text-right">{status.current_task.join(" · ")}</p>}
                         </div>
                       </div>
                    ) : status.compliance_result != null ? (
                       <div className="flex items-center justify-between">
                         <span className="text-green-600 font-medium flex items-center gap-1.5 text-xs"><CheckCircle2 className="h-4 w-4" /> Results Ready ({getComplianceResults(status.compliance_result)?.length ?? 0} items)</span>
                         <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/document/${doc.document_id}`)}>View Results</Button>
                       </div>
                    ) : status.status === "failed" ? (
                       <div className="flex items-center justify-between text-red-500 text-xs">
                         <div className="flex items-center gap-1.5">
                           <AlertCircle className="h-4 w-4" />
                           <span className="font-semibold">Analysis Failed</span>
                         </div>
                       </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">Not analyzed</span>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </>
        )}

        {/* Evaluate Document Section */}
        <div className="mb-4 mt-8 text-center max-w-3xl mx-auto font-['Courier_New',monospace]">
          <h2 className="text-xl mb-2 text-muted-foreground">Evaluate Document Tasks</h2>
        </div>
        <div className="space-y-4 max-w-3xl mx-auto mb-12">
          <div
            className="p-6 border-2 border-slate-300 dark:border-slate-700 rounded-sm"
            style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
          >
            <div className="space-y-4">
              {/* Doc & version selectors */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">Document</label>
                  <select
                    className="w-full text-sm p-2 rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    value={evalDocId}
                    onChange={e => { setEvalDocId(e.target.value); setEvalResults(null) }}
                    disabled={isEvaluating || availableDocuments.length === 0}
                  >
                    <option value="">{availableDocuments.length === 0 ? "No documents" : "Select document..."}</option>
                    {availableDocuments.map(doc => (
                      <option key={doc.document_id} value={doc.document_id}>
                        {doc.title || doc.document_id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Version</label>
                  <input
                    type="number" min="1"
                    value={evalVersionNo}
                    onChange={e => setEvalVersionNo(e.target.value)}
                    disabled={isEvaluating}
                    className="w-full text-sm p-2 rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Template Selection */}
              {templates.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium block">Select Evaluation Template</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates.map(tpl => (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(selectedTemplateId === tpl.id ? null : tpl.id)}
                        className={cn(
                          "p-4 border rounded cursor-pointer transition-colors",
                          selectedTemplateId === tpl.id
                            ? "border-primary bg-primary/10"
                            : "border-slate-300 dark:border-slate-600 hover:border-primary/50"
                        )}
                      >
                        <h4 className="font-semibold text-sm mb-1">{tpl.name}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 line-clamp-2 leading-relaxed">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Overrides system prompts & rules
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task groups */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Task Groups</label>
                  <Button
                    size="sm" variant="outline"
                    onClick={addTaskGroup}
                    disabled={isEvaluating}
                    className="text-xs h-7"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Group
                  </Button>
                </div>
                {evalTaskGroups.map((group, gi) => (
                  <div key={gi} className="border border-dashed border-slate-300 dark:border-slate-600 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Group {gi + 1}</span>
                      {evalTaskGroups.length > 1 && (
                        <button
                          onClick={() => removeTaskGroup(gi)}
                          disabled={isEvaluating}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {group.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={e => updateGroupItem(gi, ii, e.target.value)}
                          disabled={isEvaluating}
                          placeholder={`Task item ${ii + 1}...`}
                          className="flex-1 text-sm p-1.5 rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {group.length > 1 && (
                          <button
                            onClick={() => removeItemFromGroup(gi, ii)}
                            disabled={isEvaluating}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addItemToGroup(gi)}
                      disabled={isEvaluating}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add item
                    </button>
                  </div>
                ))}
              </div>

              {!isEvaluating ? (
                <Button
                  onClick={handleEvaluate}
                  disabled={!evalDocId}
                  className="w-full"
                  size="lg"
                >
                  <Bot className="mr-2 h-4 w-4" />Run AI Evaluation
                </Button>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50/50 dark:bg-slate-900/20 backdrop-blur-sm">
                  <InlineChessLoader duration={8} />
                  {evalJobStatus && evalJobStatus.status === "running" ? (
                      <div className="mt-4 w-full px-8 text-center">
                          <p className="text-xs font-medium animate-pulse mb-2">Analyzing... ({evalJobStatus.completed_count} / {evalJobStatus.total_tasks || 1} tasks)</p>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                              <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.max(5, (evalJobStatus.completed_count / (evalJobStatus.total_tasks || 1)) * 100)}%` }}></div>
                          </div>
                          {evalJobStatus.current_task && evalJobStatus.current_task.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-1">Checking: {evalJobStatus.current_task.join(" · ")}</p>
                          )}
                      </div>
                  ) : (
                      <p className="text-xs font-medium animate-pulse mt-2">Starting AI evaluation...</p>
                  )}
                </div>
              )}

              {/* Results */}
              {evalResults && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-semibold mb-2">Results ({evalResults.length})</h3>
                  {evalResults.map((r, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded border transition-colors",
                        r.exists
                          ? "border-green-500/40 bg-green-500/5"
                          : "border-red-500/40 bg-red-500/5"
                      )}
                    >
                      <button
                        className="w-full flex items-center gap-3 p-3 text-left"
                        onClick={() =>
                          setExpandedResults(prev => {
                            const next = new Set(prev)
                            if (next.has(i)) {
                              next.delete(i)
                            } else {
                              next.add(i)
                            }
                            return next
                          })
                        }
                      >
                        {r.exists
                          ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          : <X className="h-4 w-4 text-red-500 shrink-0" />
                        }
                        <span className="text-sm flex-1 font-medium truncate">
                          {Array.isArray(r.task) ? r.task.join(" · ") : String(r.task || "Unknown task")}
                        </span>
                        {r.correctness_score !== undefined && (
                            <span className="text-xs font-medium mr-2">Score: {r.correctness_score}</span>
                        )}
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                            expandedResults.has(i) && "rotate-90"
                          )}
                        />
                      </button>
                      {expandedResults.has(i) && (
                        <div className="px-3 pb-3 space-y-2">
                          <p className="text-xs text-muted-foreground leading-relaxed">{r.explanation}</p>
                          <EvaluationIssues result={r} />
                          {r.missing_sections && r.missing_sections.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-red-500">Missing Sections:</p>
                              <ul className="list-disc pl-4 mt-1">
                                {r.missing_sections.map((sec, sid) => (
                                    <li key={sid} className="text-xs text-muted-foreground">{sec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {r.incorrect_sections && r.incorrect_sections.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-orange-500">Incorrect Sections:</p>
                              <div className="space-y-2 mt-1">
                                {r.incorrect_sections.map((sec, sid) => (
                                    <div key={sid} className="bg-orange-500/10 p-2 rounded text-xs border border-orange-500/20">
                                      <p className="font-medium text-orange-600 mb-1">Quote: "{sec.Quote}"</p>
                                      <p className="text-muted-foreground">Comment: {sec.Comment}</p>
                                    </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.reasoning_steps && r.reasoning_steps.length > 0 && (
                            <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-3">
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Agent Reasoning:</p>
                              <div className="space-y-3">
                                {r.reasoning_steps.map((rs, rsid) => (
                                    <div key={rsid} className="text-xs bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded">
                                        <div className="flex items-start gap-2 mb-1">
                                            <span className="font-semibold text-primary">Step {rs.step}:</span>
                                            <span className="text-muted-foreground italic">{rs.thought}</span>
                                        </div>
                                        {rs.section_titles && rs.section_titles.length > 0 && (
                                            <div className="ml-9 text-slate-500 mt-1">
                                                Sections checked: {rs.section_titles.join(" · ")}
                                            </div>
                                        )}
                                        {rs.references_queried && rs.references_queried.length > 0 && (
                                            <div className="ml-9 text-slate-500 mt-1">
                                                References checked: {rs.references_queried.join(", ")}
                                            </div>
                                        )}
                                    </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => { setEvalResults(null); setExpandedResults(new Set()); setEvalJobStatus(null); }}
                  >
                    Clear Results
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Learn More Collapsible Section */}
        {!selectedFile && (
          <div className="text-center max-w-3xl mx-auto">
            <button
              onClick={() => setIsLearnMoreOpen(!isLearnMoreOpen)}
              className="inline-flex items-center gap-1.5 text-xs font-light text-gray-500 hover:text-gray-600 transition-colors"
            >
              Learn more
              {isLearnMoreOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {isLearnMoreOpen && (
              <Card className="my-6 max-h-[65vh] overflow-hidden text-sm text-gray-500 backdrop-blur-sm">
                <CardContent className="pt-6 space-y-3 text-left overflow-y-auto max-h-[55vh] pr-4">
                  <p>
                    Checkmate is the latest in RegTech solutions, combining the best of AI and traditional IT to revolutionize regulatory compliance.
                    We save companies tens of thousands of hours and hundreds of thousands of euros.
                  </p>
                  <p>
                    Upload your document and our hybrid AI engine analyses it against EASA Part-145 legislation,
                    generating actionable compliance reports in minutes — stored permanently so you can revisit them any time.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
