import { useRef, useState, useMemo, useEffect, useCallback } from "react"
import { useLocation } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw";
import orgSubmission from "@/assets/org_submission.md?raw"
import { ChessLoader } from "@/components/ChessLoader"
import { Badge } from "@/components/ui/badge"
import documentService, { ParseResult, NormalizedIssue } from "@/lib/documentService"
import { useApiClient } from "@/hooks/useApiClient"
import { DocumentStorageService, DocumentVersion } from "@/lib/documentStorageService"
import { History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppAlert } from "@/hooks/useAppAlert"

// warnings and highlights are provided by the backend `issues` list

interface RealResultsProps {
  storedData?: {
    parseResult: ParseResult
    filename: string
    document_id?: string
    organization_id?: string
  }
  documentOnly?: boolean
}

export function RealResults({ storedData, documentOnly = false }: RealResultsProps = {}) {
  const location = useLocation()
  const [activewarning, setActivewarning] = useState<{ id: string; text: string; warning: string; references: string[] } | null>(null)
  // Use stored data if provided, otherwise use location state
  const filename = storedData?.filename || (location.state?.filename as string | undefined)
  const [showwarningsList, setShowwarningsList] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [, setApiError] = useState<string | null>(null)
  const [issues, setIssues] = useState<NormalizedIssue[]>([])
  // rawIssues is the source of truth from load() — processHighlights reads from this so it
  // can re-run safely without losing unmatched entries after setIssues replaces the display list.
  const [rawIssues, setRawIssues] = useState<NormalizedIssue[]>([])
  const [unmatchedIssues, setUnmatchedIssues] = useState<NormalizedIssue[]>([])
  const [showUnmatched, setShowUnmatched] = useState(false)
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [, setLastResponse] = useState<ParseResult | null>(null)
  // Always send fake file payload for testing
  const [documentSummary, setDocumentSummary] = useState<{
    name?: string;
    missingSections?: number;
    incorrectSections?: number;
    correctnessScore?: number;
    aiSummary?: string;
  }>({})
  const [metricsCounts, setMetricsCounts] = useState<{
    mainFound: number;
    mainNotFound: number;
    subsectionsFound: number;
    subsectionsNotFound: number;
    sectionsNotInLegislation: number;
    mainNotFoundList: string[];
  }>({ mainFound: 0, mainNotFound: 0, subsectionsFound: 0, subsectionsNotFound: 0, sectionsNotInLegislation: 0, mainNotFoundList: [] })
  const articleElRef = useRef<HTMLElement | null>(null)
  const { toast } = useAppAlert()

  // Versions state
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [currentVersionNo, setCurrentVersionNo] = useState<number | null>(null)
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)

  const apiClient = useApiClient()
  const storageService = useMemo(() => new DocumentStorageService(apiClient), [apiClient])

  const documentId = storedData?.document_id
  const organizationId = storedData?.organization_id

  const markdownContent = useMemo(() => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        table: ({ ...props }) => (
          <div className="table-wrapper">
            <table {...props} className="rounded-sm" />
          </div>
        ),
        pre: ({ ...props }) => (
          <pre {...props} className="rounded-sm" />
        ),
        code: ({ ...props }) => (
          <code {...props} className="rounded-sm" />
        ),
      }}
    >
      {markdown ?? orgSubmission}
    </ReactMarkdown>
  ), [markdown])

  // Load function to fetch parsed document from the API
  const load = useCallback(async () => {
    setIsLoading(true)
    setApiError(null)

    // Check if data was passed via navigation state or props
    const passedResult = storedData?.parseResult || (location.state?.parseResult as ParseResult | undefined)
    if (passedResult) {
      console.log('Using passed parse result:', passedResult);
      setLastResponse(passedResult)

      if (!passedResult.ok) {
        setApiError(passedResult.error ?? 'Failed to parse document')
        setRawIssues([])
        setIssues([])
        setUnmatchedIssues([])
        setMarkdown(orgSubmission)
      } else {
        setMarkdown(passedResult.markdown || orgSubmission)
        setRawIssues(passedResult.issues || [])
        setIssues(passedResult.issues || [])
        setDocumentSummary({
          name: passedResult.summary?.organization ? `${passedResult.summary.organization} MAINTENANCE ORGANISATION EXPOSITION` : undefined,
          aiSummary: passedResult.summary?.text,
        })

        // Read metrics arrays and set counts for the Summary UI
        try {
          const raw = (passedResult.raw && typeof passedResult.raw === 'object') ? (passedResult.raw as Record<string, unknown>) : {}
          const m = (passedResult.metrics && typeof passedResult.metrics === 'object')
            ? (passedResult.metrics as Record<string, unknown>)
            : (raw.metrics && typeof raw.metrics === 'object')
              ? (raw.metrics as Record<string, unknown>)
              : {}

          const count = (v: unknown): number => Array.isArray(v) ? v.length : 0

          const newMetrics = {
            mainFound: count(m['all_main_codes_found'] ?? m['allMainCodesFound'] ?? m['all_main_codes_found']),
            mainNotFound: count(m['all_main_codes_not_found'] ?? m['allMainCodesNotFound'] ?? m['all_main_codes_not_found']),
            subsectionsFound: count(m['all_subsections_found'] ?? m['allSubsectionsFound'] ?? m['all_subsections_found']),
            subsectionsNotFound: count(m['all_subsections_not_found'] ?? m['allSubsectionsNotFound'] ?? m['all_subsections_not_found']),
            sectionsNotInLegislation: count(m['all_sections_not_in_legislation'] ?? m['allSectionsNotInLegislation'] ?? m['all_sections_not_in_legislation']),
            mainNotFoundList: Array.isArray(m['all_main_codes_not_found'] ?? m['allMainCodesNotFound'] ?? m['all_main_codes_not_found']) ? (m['all_main_codes_not_found'] ?? m['allMainCodesNotFound'] ?? m['all_main_codes_not_found']) as string[] : [],
          }

          setMetricsCounts(newMetrics)

          // correctness = mainFound / (mainFound + mainNotFound) as percentage
          const totalMain = newMetrics.mainFound + newMetrics.mainNotFound
          const correctness = totalMain > 0 ? Math.round((newMetrics.mainFound / totalMain) * 100) : 0

          setDocumentSummary((prev: any) => ({ ...prev, correctnessScore: correctness }))
        } catch {
          setMetricsCounts({ mainFound: 0, mainNotFound: 0, subsectionsFound: 0, subsectionsNotFound: 0, sectionsNotInLegislation: 0, mainNotFoundList: [] })
        }
      }
      setIsLoading(false)
      return
    }

    try {
      // Always send a fake file object in the request body for testing

      // send fake file as string in `content` to satisfy ParseRequest type
      // we send a multipart/form-data fake file from the service
      const res: ParseResult = await documentService.parseLegislation()
      console.log('Parse result:', res);
      setLastResponse(res)

      if (!res.ok) {
        setApiError(res.error ?? 'Failed to parse document')
        setRawIssues([])
        setIssues([])
        setUnmatchedIssues([])
        setMarkdown(orgSubmission)
      } else {
        setMarkdown(res.markdown || orgSubmission)
        setRawIssues(res.issues || [])
        setIssues(res.issues || [])
        setDocumentSummary({
          name: res.summary?.organization ? `${res.summary.organization} MAINTENANCE ORGANISATION EXPOSITION` : undefined,
          aiSummary: res.summary?.text,
        })

        // Read metrics arrays and set counts for the Summary UI
        try {
          const raw = (res.raw && typeof res.raw === 'object') ? (res.raw as Record<string, unknown>) : {}
          const m = (res.metrics && typeof res.metrics === 'object')
            ? (res.metrics as Record<string, unknown>)
            : (raw.metrics && typeof raw.metrics === 'object')
              ? (raw.metrics as Record<string, unknown>)
              : {}

          const count = (v: unknown): number => Array.isArray(v) ? v.length : 0

          const newMetrics = {
            mainFound: count(m['all_main_codes_found'] ?? m['allMainCodesFound'] ?? m['all_main_codes_found']),
            mainNotFound: count(m['all_main_codes_not_found'] ?? m['allMainCodesNotFound'] ?? m['all_main_codes_not_found']),
            subsectionsFound: count(m['all_subsections_found'] ?? m['allSubsectionsFound'] ?? m['all_subsections_found']),
            subsectionsNotFound: count(m['all_subsections_not_found'] ?? m['allSubsectionsNotFound'] ?? m['all_subsections_not_found']),
            sectionsNotInLegislation: count(m['all_sections_not_in_legislation'] ?? m['allSectionsNotInLegislation'] ?? m['all_sections_not_in_legislation']),
            mainNotFoundList: Array.isArray(m['all_main_codes_not_found'] ?? m['allMainCodesNotFound'] ?? m['all_main_codes_not_found']) ? (m['all_main_codes_not_found'] ?? m['allMainCodesNotFound'] ?? m['all_main_codes_not_found']) as string[] : [],
          }

          setMetricsCounts(newMetrics)

          // correctness = mainFound / (mainFound + mainNotFound) as percentage
          const totalMain = newMetrics.mainFound + newMetrics.mainNotFound
          const correctness = totalMain > 0 ? Math.round((newMetrics.mainFound / totalMain) * 100) : 0

          setDocumentSummary((prev: any) => ({ ...prev, correctnessScore: correctness }))
        } catch {
          setMetricsCounts({ mainFound: 0, mainNotFound: 0, subsectionsFound: 0, subsectionsNotFound: 0, sectionsNotInLegislation: 0, mainNotFoundList: [] })
        }
      }
    } catch (err) {
      setApiError(String(err ?? 'Unknown error'))
      setMarkdown(orgSubmission)
    } finally {
      setIsLoading(false)
    }
  }, [location.state, storedData])

  // Fetch versions if we have a document ID
  useEffect(() => {
    const fetchVersions = async () => {
      if (!documentId || !organizationId) return

      setIsLoadingVersions(true)
      try {
        const response = await storageService.listVersions(organizationId, documentId)
        setVersions(response?.items || [])
        if (response?.items?.length > 0 && currentVersionNo === null) {
          setCurrentVersionNo(response.items[0].version_no)
        }
      } catch (err) {
        console.error("Error fetching versions:", err)
      } finally {
        setIsLoadingVersions(false)
      }
    }

    fetchVersions()
  }, [documentId, organizationId, storageService])

  const handleVersionChange = async (versionNo: number) => {
    if (!documentId || !organizationId) return

    setIsLoading(true)
    setCurrentVersionNo(versionNo)

    try {
      const response = await storageService.getVersion(organizationId, documentId, versionNo)

      setMarkdown(response.content_md)
      // Reset state for new content
      setRawIssues([])
      setIssues([])
      setUnmatchedIssues([])

      setDocumentSummary((prev: any) => ({
        ...prev,
        aiSummary: response.version.message || "Viewing version history."
      }))

    } catch (err) {
      console.error("Error fetching version content:", err)
      toast({
        variant: "destructive",
        title: "Version load failed",
        description: "Failed to load version content. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // documentSummary is loaded from API (see useEffect)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    document.querySelectorAll<HTMLElement>('[data-warning-id]').forEach(el => {
      el.style.backgroundColor = ''
      el.style.zIndex = ''
    })
    if (activewarning) {
      document.querySelectorAll<HTMLElement>(`[data-warning-id="${activewarning.id}"]`).forEach(el => {
        el.style.backgroundColor = '#fbbf24' // amber-400 — visibly darker than yellow-200
        el.style.zIndex = '1'
        // Any nested highlight spans inside this one would paint their bg-yellow-200 on top.
        // Make them transparent so this span's amber shows through.
        el.querySelectorAll<HTMLElement>('[data-warning-id]').forEach(child => {
          child.style.backgroundColor = 'transparent'
        })
      })
    }
  }, [activewarning])

  // Re-run processHighlights whenever the source (rawIssues) or document (markdown) changes.
  // Depending on rawIssues (not issues) prevents a loop: processHighlights calls setIssues,
  // which doesn't touch rawIssues, so the effect doesn't re-fire on its own output.
  useEffect(() => {
    if (isLoading || !markdown || rawIssues.length === 0) return

    const timer = setTimeout(() => {
      const articleEl = articleElRef.current
      if (articleEl) {
        processHighlights(articleEl)
      }
    }, 50)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, markdown, rawIssues])

  const navigateTowarning = (direction: 'prev' | 'next') => {
    if (!activewarning) return

    const currentIndex = issues.findIndex(tc => tc.id === activewarning.id)
    let newIndex: number

    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : issues.length - 1
    } else {
      newIndex = currentIndex < issues.length - 1 ? currentIndex + 1 : 0
    }

    const newwarning = issues[newIndex]
    setActivewarning({ id: newwarning.id, text: newwarning.submission_excerpt ?? '', warning: newwarning.explanation ?? '', references: newwarning.main_code ? [newwarning.main_code] : [] })

    // Scroll to the element only if it's not in view
    const element = document.getElementById(newwarning.id)
    if (element) {
      const rect = element.getBoundingClientRect()
      const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight

      if (!isInView) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const processHighlights = (articleElement: HTMLElement) => {
    if (!articleElement) return

    // Idempotent cleanup: unwrap any existing highlight spans from previous runs
    // so repeated runs (e.g. after rawIssues change) don't accumulate duplicate spans.
    articleElement.querySelectorAll<HTMLElement>('[data-warning-id]').forEach(span => {
      const parent = span.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(span.textContent || ''), span)
      }
    })
    articleElement.normalize()

    // Source of truth for matching is rawIssues — processHighlights must NEVER iterate over
    // `issues` (which it mutates via setIssues), or it would lose unmatched entries on re-runs.
    const sourceIssues = rawIssues
    if (sourceIssues.length === 0) return

    // Find and highlight the text after ReactMarkdown has rendered
    const walker = document.createTreeWalker(
      articleElement,
      NodeFilter.SHOW_TEXT,
      null
    )

    let currentText = ''
    const nodes: Text[] = []
    const nodePositions: { node: Text; start: number; end: number }[] = []

    // Collect all text nodes and build the full text
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text
      const start = currentText.length
      const content = textNode.textContent || ''
      currentText += content
      nodes.push(textNode)
      nodePositions.push({ node: textNode, start, end: start + content.length })
    }

    // Process each issue as a warning pair
    const insertedIds: string[] = []
    const unmatchedIds: string[] = []
    sourceIssues.forEach(({ id, submission_excerpt: highlightText = '', explanation: warning = '', main_code }) => {
      const references = main_code ? [main_code] : []
      const normalizedCurrent = currentText.replace(/\s+/g, ' ')
      const normalizedHighlight = (highlightText || '').replace(/\s+/g, ' ')
      const normalizedIndex = normalizedHighlight ? normalizedCurrent.indexOf(normalizedHighlight) : -1

      if (normalizedIndex !== -1) {
        // Map back to original text position for start
        let normalizedPos = 0
        let originalStartIndex = 0

        for (let i = 0; i < currentText.length; i++) {
          if (normalizedPos === normalizedIndex) {
            originalStartIndex = i
            break
          }
          if (!/\s/.test(currentText[i])) {
            normalizedPos++
          } else if (normalizedCurrent[normalizedPos] === ' ') {
            normalizedPos++
          }
        }

        // Map back to original text position for end
        normalizedPos = 0
        let originalEndIndex = 0
        const targetEndPos = normalizedIndex + normalizedHighlight.length

        for (let i = 0; i < currentText.length; i++) {
          if (normalizedPos === targetEndPos) {
            originalEndIndex = i
            break
          }
          if (!/\s/.test(currentText[i])) {
            normalizedPos++
          } else if (normalizedCurrent[normalizedPos] === ' ') {
            normalizedPos++
          }
        }

        // If we didn't find the end, set it to the end of the text
        if (originalEndIndex === 0 && targetEndPos >= normalizedCurrent.length) {
          originalEndIndex = currentText.length
        }

        // Find all nodes that contain parts of the text to highlight
        const affectedNodes = nodePositions.filter(
          np => np.start < originalEndIndex && np.end > originalStartIndex
        )

        // Create wrapper span
        const span = document.createElement('span')
        span.id = id
        span.className = 'bg-yellow-200 hover:bg-yellow-300 cursor-pointer px-1 rounded relative'
        span.style.willChange = 'background-color'
        span.style.touchAction = 'manipulation'
        span.style.userSelect = 'none'
        span.style.webkitUserSelect = 'none'
        span.title = warning
        span.dataset.warningId = id
        span.dataset.warningText = highlightText ?? ''
        span.dataset.warning = warning ?? ''
        span.dataset.references = JSON.stringify(references)

        let inserted = false

        if (affectedNodes.length === 1) {
          // Single node case
          const { node, start } = affectedNodes[0]
          const textContent = node.textContent || ''
          const relativeStart = originalStartIndex - start
          const relativeEnd = originalEndIndex - start

          const before = textContent.substring(0, relativeStart)
          const highlighted = textContent.substring(relativeStart, relativeEnd)
          const after = textContent.substring(relativeEnd)

          const parent = node.parentNode
          if (parent) {
            if (before) parent.insertBefore(document.createTextNode(before), node)
            span.textContent = highlighted
            parent.insertBefore(span, node)
            if (after) parent.insertBefore(document.createTextNode(after), node)
            parent.removeChild(node)
            inserted = true
          }
        } else if (affectedNodes.length > 1) {
          // Multiple nodes case - need to wrap across nodes
          const firstNode = affectedNodes[0]
          const lastNode = affectedNodes[affectedNodes.length - 1]

          // Build the complete highlighted text
          let highlightedText = ''

          affectedNodes.forEach(({ node, start }, index) => {
            const textContent = node.textContent || ''

            if (index === 0) {
              // First node
              const relativeStart = originalStartIndex - start
              highlightedText += textContent.substring(relativeStart)
            } else if (index === affectedNodes.length - 1) {
              // Last node
              const relativeEnd = originalEndIndex - start
              highlightedText += textContent.substring(0, relativeEnd)
            } else {
              // Middle nodes
              highlightedText += textContent
            }
          })

          span.textContent = highlightedText

          // Insert the span and clean up nodes
          const firstParent = firstNode.node.parentNode
          if (firstParent) {
            // Handle first node
            const firstContent = firstNode.node.textContent || ''
            const firstRelativeStart = originalStartIndex - firstNode.start
            const before = firstContent.substring(0, firstRelativeStart)

            if (before) {
              firstParent.insertBefore(document.createTextNode(before), firstNode.node)
            }
            firstParent.insertBefore(span, firstNode.node)

            // Handle last node
            const lastContent = lastNode.node.textContent || ''
            const lastRelativeEnd = originalEndIndex - lastNode.start
            const after = lastContent.substring(lastRelativeEnd)

            if (after) {
              const lastParent = lastNode.node.parentNode
              if (lastParent) {
                lastParent.insertBefore(document.createTextNode(after), lastNode.node)
              }
            }

            // Remove all affected nodes
            affectedNodes.forEach(({ node }) => {
              node.parentNode?.removeChild(node)
            })
            inserted = true
          }
        }

        if (inserted) {
          insertedIds.push(id)
        } else {
          // Matched in text but DOM insertion failed (e.g. text node already consumed by a prior highlight)
          unmatchedIds.push(id)
        }
      } else {
        unmatchedIds.push(id)
      }
    })

    // Sort by actual DOM position (top-to-bottom in the rendered document).
    // compareDocumentPosition handles nested, sibling, and separated spans correctly,
    // whereas indexOf-based sorting gives the same key to duplicate excerpts.
    const sortedInsertedIssues = sourceIssues
      .filter(i => insertedIds.includes(i.id))
      .sort((a, b) => {
        const elA = articleElement.querySelector(`[data-warning-id="${a.id}"]`)
        const elB = articleElement.querySelector(`[data-warning-id="${b.id}"]`)
        if (!elA || !elB) return 0
        const pos = elA.compareDocumentPosition(elB)
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1
        return 0
      })
    setIssues(sortedInsertedIssues)
    setUnmatchedIssues(sourceIssues.filter(i => unmatchedIds.includes(i.id)))
  }  // Event delegation handler - use click but with optimized spans
  const handleArticleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const warningId = target.dataset.warningId

    if (warningId) {
      const warningText = target.dataset.warningText
      const warning = target.dataset.warning
      const referencesStr = target.dataset.references

      if (warningText && warning && referencesStr) {
        // Direct state update
        setActivewarning({
          id: warningId,
          text: warningText,
          warning,
          references: JSON.parse(referencesStr)
        })
        e.stopPropagation()
      }
    }
  }

  return (
    <div className="relative p-8" onClick={() => setActivewarning(null)}>

      {/* Page content shown only after loading */}
      {isLoading ? (
        <ChessLoader duration={10} />
      ) : (
        <>
          {issues.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowwarningsList(!showwarningsList);
              }}
              className="fixed bottom-6 right-6 bg-black hover:bg-gray-800 text-white rounded-full p-4 shadow-lg z-40 flex items-center gap-2"
              style={{ touchAction: "manipulation" }}
              title="View all warnings"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
              <span className="font-medium">{issues.length}</span>
            </button>
          )}

          {showwarningsList && (
            <div
              className="fixed bottom-0 left-0 right-0 md:left-auto md:right-6 md:bottom-6 md:max-w-sm bg-white/80 border border-gray-400 md:rounded rounded-t-lg shadow-lg p-6 md:p-4 z-20 md:z-40 max-h-96 overflow-y-auto backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-sm text-gray-900">
                  All warnings ({issues.length})
                </h3>
                <button
                  onClick={() => setShowwarningsList(false)}
                  className="text-gray-500 hover:text-gray-800 ml-2"
                  style={{ touchAction: "manipulation" }}
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                {issues.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivewarning({ id: item.id, text: item.submission_excerpt ?? '', warning: item.explanation ?? '', references: item.main_code ? [item.main_code] : [] });
                      setShowwarningsList(false);
                      const element = document.getElementById(item.id);
                      if (element) {
                        element.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }
                    }}
                    className="w-full text-left p-2 hover:bg-gray-100 rounded border border-gray-300"
                  >
                    <p className="text-xs text-gray-800 font-medium mb-1 line-clamp-2">
                      {item.submission_excerpt}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-1">
                      {item.explanation}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activewarning && (
            <div
              className="fixed bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-6 md:max-w-md bg-white/90 border border-gray-400 md:rounded rounded-t-lg shadow-lg p-6 md:p-4 z-20 md:z-50 backdrop-blur-md"
              style={{ willChange: "contents" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-sm text-gray-900">Warning</h3>
                <button
                  onClick={() => setActivewarning(null)}
                  className="text-gray-500 hover:text-gray-800 ml-2"
                  style={{ touchAction: "manipulation" }}
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-800 mb-3">{activewarning.warning}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-300">
                <button
                  onClick={() => navigateTowarning("prev")}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded"
                  style={{ touchAction: "manipulation" }}
                  title="Previous warning"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Previous
                </button>
                <span className="text-xs text-gray-600">
                  {issues.findIndex((tc) => tc.id === activewarning.id) + 1} {" "}
                  / {issues.length}
                </span>
                <button
                  onClick={() => navigateTowarning("next")}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded"
                  style={{ touchAction: "manipulation" }}
                  title="Next warning"
                >
                  Next
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto md:pt-4">
            <div className="mb-8 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-foreground">
                  {filename || documentSummary.name}
                </h1>

                {!documentOnly && versions.length > 1 && (
                  <div className="flex items-center gap-3 bg-white/50 border border-slate-300 p-2 rounded-sm shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <History className="h-4 w-4" />
                      <span>Version {currentVersionNo}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-300 mx-1" />
                    <div className="flex gap-1">
                      {versions.slice(0, 5).map((v) => (
                        <Button
                          key={v.version_id}
                          variant={currentVersionNo === v.version_no ? "default" : "ghost"}
                          size="sm"
                          className="h-8 px-2 min-w-8"
                          onClick={() => handleVersionChange(v.version_no)}
                          disabled={isLoadingVersions || isLoading}
                          title={v.message || `Version ${v.version_no}`}
                        >
                          {v.version_no}
                        </Button>
                      ))}
                      {versions.length > 5 && (
                        <span className="text-xs text-slate-400 self-center ml-1">...</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!documentOnly && (
                <>
                  <div className="border-t border-slate-300 my-6"></div>

                  <h2 className="text-lg font-semibold text-foreground">Summary</h2>

                  <div className="space-y-3 md:grid md:grid-cols-3 md:gap-6 md:space-y-0">
                    <div className="flex items-center gap-2 p-4 rounded-sm backdrop-blur-sm bg-white/30">
                      <span className="text-2xl font-bold leading-none text-foreground">
                        {documentSummary.correctnessScore ?? 0}%
                      </span>
                      <span className="text-lg leading-none">Correctness Score</span>
                    </div>

                    <div className="flex items-center gap-2 p-4 rounded-sm backdrop-blur-sm bg-white/30">
                      <span className="text-2xl font-bold text-orange-600 leading-none">
                        {metricsCounts.mainNotFound ?? 0}
                      </span>
                      <span className="text-lg leading-none">Missing Sections</span>
                    </div>

                    <div className="flex items-center gap-2 p-4 rounded-sm backdrop-blur-sm bg-white/30">
                      <span className="text-2xl font-bold text-amber-600 leading-none">
                        {issues.length ?? 0}
                      </span>
                      <span className="text-lg leading-none">Incorrect Sections</span>
                    </div>
                  </div>

                  {metricsCounts.mainNotFoundList.length > 0 && (
                    <div className="mt-6 p-4 rounded-sm bg-red-50 border border-red-200">
                      <h3 className="text-lg font-semibold text-red-900 mb-3">Missing Sections</h3>
                      <div className="flex flex-wrap gap-2">
                        {metricsCounts.mainNotFoundList.map((section, index) => (
                          <Badge key={index} variant="destructive" className="rounded-none bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1">
                            {section}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {unmatchedIssues.length > 0 && (
              <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50">
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                  onClick={(e) => { e.stopPropagation(); setShowUnmatched(p => !p) }}
                  style={{ touchAction: "manipulation" }}
                >
                  <span className="text-sm font-semibold uppercase tracking-wide text-amber-900">
                    Additional Findings ({unmatchedIssues.length})
                  </span>
                  <svg
                    className={`h-4 w-4 text-amber-700 transition-transform ${showUnmatched ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showUnmatched && (
                  <div className="space-y-3 px-5 pb-5">
                    {unmatchedIssues.map((issue) => (
                      <div key={issue.id} className="border-l-2 border-amber-400 pl-3">
                        <p className="text-sm text-amber-900">{issue.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <article
              ref={articleElRef}
              className="prose max-w-none"
              onClick={handleArticleClick}
            >
              {markdownContent}
            </article>
          </div>
        </>
      )}
    </div>
  );
}
