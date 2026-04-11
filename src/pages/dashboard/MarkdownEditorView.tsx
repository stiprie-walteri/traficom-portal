import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom"
import { ArrowLeft, Check, Eye, Save, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useApiClient } from "@/hooks/useApiClient"
import { useAppAlert } from "@/hooks/useAppAlert"
import {
  DocumentStorageService,
  type ApplySuggestionsResponse,
  type DocumentationIssue,
  type StoredDocument,
} from "@/lib/documentStorageService"
import {
  extractNormalizedIssues,
  getIssueProblem,
  getIssueSolution,
  getIssueSuggestedInsertText,
  getIssueTitle,
  type NormalizedIssue,
} from "@/lib/documentService"
import {
  applyIssuePatch,
  findSuggestionTarget,
  getPreviewLines,
} from "@/lib/markdownSuggestions"
import { ChessLoaderLong } from "@/components/ChessLoaderLong"
import type { DashboardOutletContext } from "@/layouts/DashboardLayout"
import { cn } from "@/lib/utils"

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; response: ApplySuggestionsResponse }
  | { status: "error"; message: string }

function getIssueBackendPayload(issue: NormalizedIssue) {
  const rawId = typeof issue.raw?.["id"] === "string" ? issue.raw["id"] : undefined

  if (rawId) {
    return { issue_ids: [rawId] }
  }

  return {
    issues: [{
      ...(issue.raw || {}),
      id: issue.id,
      title: issue.title,
      problem: issue.problem,
      solution: issue.solution,
      legislation_reference: issue.legislation_source,
      current_section: issue.current_section,
      suggested_fix: issue.suggested_fix,
    } as DocumentationIssue],
  }
}

function createMarkdownFile(markdown: string, title: string) {
  const safeTitle = (title || "document")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "document"

  return new File([markdown], `${safeTitle}.md`, { type: "text/markdown" })
}

export function MarkdownEditorView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { organizationId, refreshWorkspaceData } = useOutletContext<DashboardOutletContext>()
  const apiClient = useApiClient()
  const storageService = useMemo(() => new DocumentStorageService(apiClient), [apiClient])
  const { toast } = useAppAlert()

  const [documentMeta, setDocumentMeta] = useState<StoredDocument | null>(null)
  const [versionNo, setVersionNo] = useState<number | null>(null)
  const [contentHash, setContentHash] = useState<string | null>(null)
  const [originalMarkdown, setOriginalMarkdown] = useState("")
  const [markdown, setMarkdown] = useState("")
  const [issues, setIssues] = useState<NormalizedIssue[]>([])
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [acceptedIssueIds, setAcceptedIssueIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<PreviewState>({ status: "idle" })

  const sourceRef = useRef<HTMLTextAreaElement | null>(null)
  const previewLineRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const selectedIssue = useMemo(
    () => issues.find((issue) => issue.id === selectedIssueId) || null,
    [issues, selectedIssueId]
  )
  const selectedIssueAccepted = selectedIssue ? acceptedIssueIds.has(selectedIssue.id) : false
  const selectedPreviewIssue = selectedIssue && !selectedIssueAccepted ? selectedIssue : null
  const selectedTarget = useMemo(
    () => selectedPreviewIssue ? findSuggestionTarget(markdown, selectedPreviewIssue) : null,
    [markdown, selectedPreviewIssue]
  )
  const previewLines = useMemo(
    () => getPreviewLines(markdown, selectedPreviewIssue),
    [markdown, selectedPreviewIssue]
  )
  const previewInsertLineCount = selectedPreviewIssue
    ? getIssueSuggestedInsertText(selectedPreviewIssue).trim().split(/\n/).filter(Boolean).length
    : 0
  const hasChanges = markdown !== originalMarkdown
  const acceptedCount = acceptedIssueIds.size

  useEffect(() => {
    const loadEditorData = async () => {
      if (!organizationId || !id) return

      setIsLoading(true)
      setError(null)

      try {
        const [documentResponse, evaluationStatus] = await Promise.all([
          storageService.getDocument(organizationId, id),
          storageService.getEvaluationStatus(organizationId, id).catch(() => null),
        ])

        const compliancePayload = documentResponse.version.compliance_result
          || (evaluationStatus?.results?.length ? evaluationStatus : null)

        setDocumentMeta(documentResponse.document)
        setVersionNo(documentResponse.version.version_no)
        setContentHash(documentResponse.version.content_hash)
        setOriginalMarkdown(documentResponse.content_md)
        setMarkdown(documentResponse.content_md)
        setIssues(extractNormalizedIssues(compliancePayload))
        setSelectedIssueId(null)
        setAcceptedIssueIds(new Set())
      } catch (loadError) {
        console.error(loadError)
        setError("Could not load this document for editing.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadEditorData()
  }, [id, organizationId, storageService])

  const scrollToIssue = useCallback((issue: NormalizedIssue) => {
    const target = findSuggestionTarget(markdown, issue)
    const previewLine = previewLineRefs.current[target.lineIndex]

    previewLine?.scrollIntoView({ behavior: "smooth", block: "center" })

    const source = sourceRef.current
    if (source) {
      source.focus()
      source.setSelectionRange(target.offset, target.offset)
    }
  }, [markdown])

  const loadBackendPreview = useCallback(async (issue: NormalizedIssue) => {
    if (!organizationId || !id || !versionNo || hasChanges || acceptedIssueIds.size > 0) {
      setPreviewState({ status: "idle" })
      return
    }

    setPreviewState({ status: "loading" })

    try {
      const response = await storageService.applySuggestions(
        organizationId,
        id,
        versionNo,
        {
          ...getIssueBackendPayload(issue),
          save: false,
          allow_partial: false,
          expected_content_hash: contentHash || undefined,
        }
      )

      setPreviewState({ status: "ready", response })
    } catch (previewError) {
      console.error(previewError)
      setPreviewState({ status: "error", message: "Backend preview unavailable. Local preview is shown." })
    }
  }, [acceptedIssueIds.size, contentHash, hasChanges, id, organizationId, storageService, versionNo])

  const handleSelectIssue = (issue: NormalizedIssue) => {
    setSelectedIssueId(issue.id)
    window.setTimeout(() => scrollToIssue(issue), 0)
    void loadBackendPreview(issue)
  }

  const handleAcceptSelected = () => {
    if (!selectedIssue || acceptedIssueIds.has(selectedIssue.id)) return

    const patched = applyIssuePatch(markdown, selectedIssue)
    if (!patched) {
      toast({
        variant: "warning",
        title: "No patch available",
        description: "This issue does not include insertable Markdown text.",
      })
      return
    }

    setMarkdown(patched.markdown)
    setAcceptedIssueIds((prev) => new Set(prev).add(selectedIssue.id))
    setPreviewState({ status: "idle" })
    toast({ variant: "success", title: "Suggestion accepted", description: "The Markdown source was updated." })
  }

  const handleSaveVersion = async () => {
    if (!organizationId || !id || !documentMeta) return

    setIsSaving(true)
    try {
      const file = createMarkdownFile(markdown, documentMeta.title || id)
      const upload = await storageService.uploadDocument({
        organizationId,
        projectId: documentMeta.project_id || undefined,
        documentId: id,
        title: documentMeta.title || undefined,
        message: acceptedCount > 0
          ? `Applied ${acceptedCount} AI compliance suggestion${acceptedCount === 1 ? "" : "s"}`
          : "Edited Markdown",
        file,
      })

      setOriginalMarkdown(markdown)
      setVersionNo(upload.version_no)
      setContentHash(upload.content_hash)
      setAcceptedIssueIds(new Set())
      window.dispatchEvent(new Event("documentListUpdated"))
      await refreshWorkspaceData()
      toast({ variant: "success", title: "Saved new version", description: `Version ${upload.version_no} is ready.` })
      navigate(`/dashboard/document/${id}`)
    } catch (saveError) {
      console.error(saveError)
      toast({ variant: "destructive", title: "Save failed", description: "Could not save the edited Markdown." })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><ChessLoaderLong /></div>
  }

  if (error || !documentMeta || !versionNo) {
    return (
      <div className="container mx-auto px-6 py-12">
        <p className="text-sm text-muted-foreground">{error || "Document not found."}</p>
        <Button asChild className="mt-4">
          <Link to={id ? `/dashboard/document/${id}` : "/dashboard"}>Back</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-screen bg-background">
      <main className="min-w-0 flex-1 px-6 py-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Button asChild variant="ghost" size="sm" className="mb-2 px-0">
              <Link to={`/dashboard/document/${id}`}>
                <ArrowLeft />
                Back to document
              </Link>
            </Button>
            <h1 className="truncate text-2xl font-semibold text-foreground">{documentMeta.title || "Untitled document"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Editing version {versionNo}. Save creates a new Markdown version.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={hasChanges ? "default" : "secondary"}>{hasChanges ? "Unsaved changes" : "No changes"}</Badge>
            <Badge variant="secondary">{acceptedCount} accepted</Badge>
            <Button onClick={() => void handleSaveVersion()} disabled={!hasChanges || isSaving}>
              <Save />
              {isSaving ? "Saving..." : "Save New Version"}
            </Button>
          </div>
        </div>

        <div className="grid min-h-[calc(100vh-9rem)] gap-4 xl:grid-cols-2">
          <section className="flex min-h-[520px] flex-col rounded-md border border-slate-200 bg-white/75">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Markdown source</h2>
                <p className="text-xs text-muted-foreground">This text is the editable source of truth.</p>
              </div>
            </div>
            <textarea
              ref={sourceRef}
              value={markdown}
              onChange={(event) => {
                setMarkdown(event.target.value)
                setPreviewState({ status: "idle" })
              }}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-6 outline-none"
            />
          </section>

          <section className="flex min-h-[520px] flex-col rounded-md border border-slate-200 bg-white/75">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Insertion preview</h2>
                <p className="text-xs text-muted-foreground">Grey text is not applied until you accept it.</p>
              </div>
              {selectedPreviewIssue && (
                <Button onClick={handleAcceptSelected} size="sm">
                  <Check />
                  Accept
                </Button>
              )}
            </div>
            {previewState.status === "loading" && (
              <p className="border-b border-slate-200 px-4 py-2 text-xs text-muted-foreground">Checking backend preview...</p>
            )}
            {previewState.status === "ready" && (
              <p className="border-b border-slate-200 px-4 py-2 text-xs text-muted-foreground">
                Backend preview: {previewState.response.applied_count} applied, {previewState.response.skipped_count} skipped.
              </p>
            )}
            {previewState.status === "error" && (
              <p className="border-b border-slate-200 px-4 py-2 text-xs text-muted-foreground">{previewState.message}</p>
            )}
            <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-sm leading-6">
              {previewLines.map((line, index) => {
                const isTarget = selectedTarget?.lineIndex === index
                const isPreviewLine = Boolean(
                  selectedTarget
                  && previewInsertLineCount > 0
                  && index > selectedTarget.lineIndex
                  && index <= selectedTarget.lineIndex + previewInsertLineCount
                )

                return (
                  <div
                    key={`${index}-${line}`}
                    ref={(element) => {
                      previewLineRefs.current[index] = element
                    }}
                    className={cn(
                      "grid grid-cols-[3rem_1fr] rounded-sm px-2",
                      isTarget && "bg-slate-100",
                      isPreviewLine && "bg-slate-50 text-slate-400"
                    )}
                  >
                    <span className="select-none pr-3 text-right text-xs text-muted-foreground">{index + 1}</span>
                    <span className="whitespace-pre-wrap break-words">{isPreviewLine ? line.replace(/^\+\s?/, "") : line || " "}</span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      <aside className="w-[360px] shrink-0 border-l border-slate-200 bg-white/85 px-4 py-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AI Issues</p>
            <h2 className="mt-1 text-lg font-semibold">{issues.length} suggestions</h2>
          </div>
          <Wand2 className="mt-1 text-muted-foreground" />
        </div>

        <div className="flex max-h-[calc(100vh-8rem)] flex-col gap-3 overflow-y-auto pr-1">
          {issues.map((issue) => {
            const isSelected = issue.id === selectedIssueId
            const isAccepted = acceptedIssueIds.has(issue.id)
            const insertText = getIssueSuggestedInsertText(issue)
            const solution = getIssueSolution(issue)

            return (
              <button
                key={issue.id}
                onClick={() => handleSelectIssue(issue)}
                className={cn(
                  "rounded-md border p-3 text-left transition-colors",
                  isSelected ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-300",
                  isAccepted && "opacity-65"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-semibold">{getIssueTitle(issue)}</p>
                  {isAccepted ? (
                    <Badge variant="secondary">Accepted</Badge>
                  ) : (
                    <Eye className="mt-0.5 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-slate-700">{getIssueProblem(issue)}</p>
                {(solution || insertText) && (
                  <div className="mt-3 rounded-sm bg-slate-50 p-2">
                    <p className="text-xs font-semibold text-slate-700">Fix</p>
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{solution || insertText}</p>
                  </div>
                )}
              </button>
            )
          })}

          {issues.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-muted-foreground">
              No AI issues found for this document.
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
