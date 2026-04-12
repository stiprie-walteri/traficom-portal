import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom"
import { ArrowLeft, Check, ChevronDown, Pencil, Save, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useApiClient } from "@/hooks/useApiClient"
import { useAppAlert } from "@/hooks/useAppAlert"
import {
  DocumentStorageService,
  type ApplySuggestionsResponse,
  type StoredDocument,
} from "@/lib/documentStorageService"
import {
  buildIssuesFromProjectCompliance,
  dedupeNormalizedIssues,
  extractNormalizedIssues,
  getIssueFixLocation,
  getIssueProblem,
  getIssueSolution,
  getIssueSuggestedInsertText,
  getIssueTitle,
  type NormalizedIssue,
} from "@/lib/documentService"
import {
  applyIssuePatch,
  findSuggestionTarget,
} from "@/lib/markdownSuggestions"
import { getIssueBackendPayload } from "@/lib/issueActions"
import { ChessLoaderLong } from "@/components/ChessLoaderLong"
import type { DashboardOutletContext } from "@/layouts/DashboardLayout"
import { cn } from "@/lib/utils"
import { env } from "@/lib/env"

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; response: ApplySuggestionsResponse }
  | { status: "error"; message: string }

type PendingLeave = {
  href: string
  isInternal: boolean
}

function createMarkdownFile(markdown: string, title: string) {
  const safeTitle = (title || "document")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "document"

  return new File([markdown], `${safeTitle}.md`, { type: "text/markdown" })
}

function getRouterPathFromHref(href: string) {
  const url = new URL(href)
  const path = `${url.pathname}${url.search}${url.hash}`
  const basePath = env.BASE_PATH.replace(/\/$/, "")

  if (basePath && basePath !== "/" && path === basePath) return "/"
  if (basePath && basePath !== "/" && path.startsWith(`${basePath}/`)) {
    return path.slice(basePath.length) || "/"
  }

  return path
}

export function MarkdownEditorView() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { organizationId, refreshWorkspaceData } = useOutletContext<DashboardOutletContext>()
  const apiClient = useApiClient()
  const storageService = useMemo(() => new DocumentStorageService(apiClient), [apiClient])
  const { toast } = useAppAlert()
  const requestedEditorState = location.state as {
    issueId?: string;
    issue?: NormalizedIssue;
    issues?: NormalizedIssue[];
    mode?: "edit";
  } | null
  const requestedIssueId = requestedEditorState?.issueId
  const requestedIssue = requestedEditorState?.issue
  const requestedIssues = requestedEditorState?.issues
  const requestedMode = requestedEditorState?.mode

  const [documentMeta, setDocumentMeta] = useState<StoredDocument | null>(null)
  const [versionNo, setVersionNo] = useState<number | null>(null)
  const [contentHash, setContentHash] = useState<string | null>(null)
  const [originalMarkdown, setOriginalMarkdown] = useState("")
  const [markdown, setMarkdown] = useState("")
  const [issues, setIssues] = useState<NormalizedIssue[]>([])
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [openIssueIds, setOpenIssueIds] = useState<Set<string>>(new Set())
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null)
  const [acceptedIssueIds, setAcceptedIssueIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<PreviewState>({ status: "idle" })
  const [pendingLeave, setPendingLeave] = useState<PendingLeave | null>(null)

  const sourceRef = useRef<HTMLTextAreaElement | null>(null)
  const allowNavigationRef = useRef(false)

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
  const visibleSuggestionPreviews = useMemo(() => (
    issues
      .filter((issue) => !acceptedIssueIds.has(issue.id) && getIssueSuggestedInsertText(issue))
      .map((issue) => ({
        issue,
        target: findSuggestionTarget(markdown, issue),
        insertText: getIssueSuggestedInsertText(issue),
      }))
      .sort((left, right) => left.target.lineIndex - right.target.lineIndex)
  ), [acceptedIssueIds, issues, markdown])
  const suggestionsByLine = useMemo(() => {
    const grouped = new Map<number, typeof visibleSuggestionPreviews>()

    for (const preview of visibleSuggestionPreviews) {
      const linePreviews = grouped.get(preview.target.lineIndex) || []
      linePreviews.push(preview)
      grouped.set(preview.target.lineIndex, linePreviews)
    }

    return grouped
  }, [visibleSuggestionPreviews])
  const markdownLines = useMemo(() => markdown.split(/\n/), [markdown])
  const isEditingText = Boolean(editingIssueId)
  const hasChanges = markdown !== originalMarkdown
  const acceptedCount = acceptedIssueIds.size
  const visibleIssues = useMemo(
    () => issues.filter((issue) => !acceptedIssueIds.has(issue.id)),
    [acceptedIssueIds, issues]
  )

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
        const projectId = documentResponse.document.project_id || documentResponse.document.project?.project_id
        const projectCompliance = projectId
          ? await storageService.getProjectCompliance(organizationId, projectId).catch(() => null)
          : null

        setDocumentMeta(documentResponse.document)
        setVersionNo(documentResponse.version.version_no)
        setContentHash(documentResponse.version.content_hash)
        setOriginalMarkdown(documentResponse.content_md)
        setMarkdown(documentResponse.content_md)
        const loadedIssues = dedupeNormalizedIssues([
          ...(requestedIssue ? [requestedIssue] : []),
          ...(requestedIssues || []),
          ...(projectCompliance?.compliance_result
            ? buildIssuesFromProjectCompliance(projectCompliance.compliance_result)
            : []),
          ...extractNormalizedIssues(documentResponse.version.compliance_result),
          ...extractNormalizedIssues(evaluationStatus),
        ])
        const editorIssues = loadedIssues
        const matchedRequestedIssue = requestedIssueId
          ? editorIssues.find((issue) => issue.id === requestedIssueId)
          : null

        const initialIssueId = matchedRequestedIssue?.id || editorIssues[0]?.id || null

        setIssues(editorIssues)
        setSelectedIssueId(initialIssueId)
        setEditingIssueId(matchedRequestedIssue && requestedMode === "edit" ? matchedRequestedIssue.id : null)
        setOpenIssueIds(initialIssueId ? new Set([initialIssueId]) : new Set())
        setAcceptedIssueIds(new Set())
      } catch (loadError) {
        console.error(loadError)
        setError("Could not load this document for editing.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadEditorData()
  }, [id, organizationId, requestedIssue, requestedIssueId, requestedIssues, requestedMode, storageService])

  const focusSourceAtIssue = useCallback((issue: NormalizedIssue) => {
    const target = findSuggestionTarget(markdown, issue)
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

  const handleToggleIssue = (issue: NormalizedIssue) => {
    setSelectedIssueId(issue.id)
    setEditingIssueId(null)
    setOpenIssueIds((prev) => {
      const next = new Set(prev)
      if (next.has(issue.id)) {
        next.delete(issue.id)
      } else {
        next.add(issue.id)
      }
      return next
    })
    void loadBackendPreview(issue)
  }

  const handleEditIssue = (issue: NormalizedIssue) => {
    setSelectedIssueId(issue.id)
    setOpenIssueIds((prev) => new Set(prev).add(issue.id))
    setEditingIssueId(issue.id)
    void loadBackendPreview(issue)
    window.setTimeout(() => focusSourceAtIssue(issue), 0)
  }

  const handleAcceptIssue = (issue: NormalizedIssue) => {
    if (acceptedIssueIds.has(issue.id)) return

    const patched = applyIssuePatch(markdown, issue)
    if (!patched) {
      toast({
        variant: "warning",
        title: "No patch available",
        description: "This issue does not include insertable Markdown text.",
      })
      return
    }

    setMarkdown(patched.markdown)
    setSelectedIssueId(issue.id)
    setAcceptedIssueIds((prev) => new Set(prev).add(issue.id))
    setOpenIssueIds((prev) => {
      const next = new Set(prev)
      next.delete(issue.id)
      return next
    })
    if (editingIssueId === issue.id) setEditingIssueId(null)
    setPreviewState({ status: "idle" })
    toast({ variant: "success", title: "Suggestion accepted", description: "The document text was updated." })
  }

  const continueToPendingLeave = useCallback((leave: PendingLeave) => {
    allowNavigationRef.current = true

    if (leave.isInternal) {
      navigate(getRouterPathFromHref(leave.href))
      return
    }

    window.location.assign(leave.href)
  }, [navigate])

  const handleSaveVersion = async (options?: { afterSave?: () => void }) => {
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
      if (options?.afterSave) {
        options.afterSave()
      } else {
        allowNavigationRef.current = true
        navigate(`/dashboard/document/${id}`)
      }
    } catch (saveError) {
      console.error(saveError)
      toast({ variant: "destructive", title: "Save failed", description: "Could not save the edited Markdown." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLeaveWithoutSaving = () => {
    if (!pendingLeave) return
    continueToPendingLeave(pendingLeave)
  }

  const handleSaveAndLeave = async () => {
    if (!pendingLeave) return
    const leave = pendingLeave
    await handleSaveVersion({ afterSave: () => continueToPendingLeave(leave) })
  }

  useEffect(() => {
    if (!editingIssueId || !selectedIssue) return

    const timer = window.setTimeout(() => focusSourceAtIssue(selectedIssue), 0)
    return () => window.clearTimeout(timer)
  }, [editingIssueId, focusSourceAtIssue, selectedIssue])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasChanges || allowNavigationRef.current) return

      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasChanges])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!hasChanges || allowNavigationRef.current || event.defaultPrevented) return
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target instanceof Element ? event.target : null
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return

      const href = anchor.href
      if (!href || href === window.location.href) return

      event.preventDefault()
      event.stopPropagation()
      setPendingLeave({
        href,
        isInternal: new URL(href).origin === window.location.origin,
      })
    }

    document.addEventListener("click", handleDocumentClick, true)
    return () => document.removeEventListener("click", handleDocumentClick, true)
  }, [hasChanges])

  useEffect(() => {
    if (!hasChanges) setPendingLeave(null)
  }, [hasChanges])

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
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <section className="flex min-h-[calc(100vh-9rem)] flex-col rounded-md border border-slate-200 bg-white/80">
          {isEditingText ? (
            <textarea
              ref={sourceRef}
              value={markdown}
              onChange={(event) => {
                setMarkdown(event.target.value)
                setPreviewState({ status: "idle" })
              }}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none bg-transparent p-5 font-mono text-sm leading-6 outline-none"
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-auto p-4 font-mono text-sm leading-6">
              {markdownLines.map((line, index) => {
                const lineSuggestions = suggestionsByLine.get(index) || []
                const isTarget = selectedTarget?.lineIndex === index

                return (
                  <div key={`${index}-${line}`}>
                    <div
                      className={cn(
                        "grid grid-cols-[3rem_1fr] rounded-sm px-2",
                        isTarget && "bg-slate-100"
                      )}
                    >
                      <span className="select-none pr-3 text-right text-xs text-muted-foreground">{index + 1}</span>
                      <span className="whitespace-pre-wrap break-words">{line || " "}</span>
                    </div>

                    {lineSuggestions.map(({ issue, insertText }) => {
                      const isSelected = issue.id === selectedIssueId

                      return (
                        <div
                          key={issue.id}
                          onMouseEnter={() => setSelectedIssueId(issue.id)}
                          onFocus={() => setSelectedIssueId(issue.id)}
                          className={cn(
                            "group ml-12 mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 transition-colors hover:border-slate-300 hover:bg-white",
                            isSelected && "border-slate-400 bg-white text-slate-600"
                          )}
                        >
                          <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Suggested addition</p>
                              <p className="text-xs text-slate-500">{getIssueTitle(issue)}</p>
                            </div>
                            <div className="flex gap-2 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                              <Button size="sm" variant="outline" onClick={() => handleEditIssue(issue)}>
                                <Pencil />
                                Edit
                              </Button>
                              <Button size="sm" onClick={() => handleAcceptIssue(issue)}>
                                <Check />
                                Accept
                              </Button>
                            </div>
                          </div>
                          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6 text-slate-400">
                            {insertText.trim()}
                          </pre>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <aside className="w-[380px] shrink-0 border-l border-slate-200 bg-white/85 px-4 py-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AI Issues</p>
            <h2 className="mt-1 text-lg font-semibold">{visibleIssues.length} suggestions</h2>
          </div>
          <Wand2 className="mt-1 text-muted-foreground" />
        </div>

        <div className="flex max-h-[calc(100vh-8rem)] flex-col gap-3 overflow-y-auto pr-1">
          {visibleIssues.map((issue) => {
            const isSelected = issue.id === selectedIssueId
            const isOpen = openIssueIds.has(issue.id)
            const insertText = getIssueSuggestedInsertText(issue)
            const solution = getIssueSolution(issue)
            const fixLocation = getIssueFixLocation(issue)

            return (
              <div
                key={issue.id}
                className={cn(
                  "rounded-md border p-3 text-left transition-colors",
                  isSelected ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <button
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => handleToggleIssue(issue)}
                  aria-expanded={isOpen}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{getIssueTitle(issue)}</p>
                    {!isOpen && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-700">{getIssueProblem(issue)}</p>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="mt-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Problem</p>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{getIssueProblem(issue)}</p>
                    </div>
                    {(solution || insertText || fixLocation) && (
                      <div className="mt-3 rounded-sm bg-slate-50 p-2">
                        <p className="text-xs font-semibold text-slate-700">Insertion request</p>
                        {solution && (
                          <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{solution}</p>
                        )}
                        {insertText && insertText !== solution && (
                          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-muted-foreground">
                            {insertText}
                          </pre>
                        )}
                        {fixLocation && (
                          <p className="mt-2 text-xs text-muted-foreground">{fixLocation}</p>
                        )}
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptIssue(issue)}
                      >
                        <Check />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditIssue(issue)}
                      >
                        <Pencil />
                        Edit
                      </Button>
                    </div>
                    {isSelected && previewState.status === "loading" && (
                      <p className="mt-2 text-xs text-muted-foreground">Checking backend preview...</p>
                    )}
                    {isSelected && previewState.status === "ready" && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Backend preview: {previewState.response.applied_count} applied, {previewState.response.skipped_count} skipped.
                      </p>
                    )}
                    {isSelected && previewState.status === "error" && (
                      <p className="mt-2 text-xs text-muted-foreground">{previewState.message}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {visibleIssues.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-muted-foreground">
              {acceptedCount > 0 ? "All suggestions have been accepted." : "No AI issues found for this document."}
            </div>
          )}
        </div>
      </aside>

      {pendingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Save changes?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This document has unsaved edits. Save a new version before leaving, or leave without saving.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setPendingLeave(null)}
                disabled={isSaving}
              >
                Stay
              </Button>
              <Button
                variant="outline"
                onClick={handleLeaveWithoutSaving}
                disabled={isSaving}
              >
                Leave without saving
              </Button>
              <Button
                onClick={() => void handleSaveAndLeave()}
                disabled={isSaving}
              >
                <Save />
                {isSaving ? "Saving..." : "Save and leave"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
