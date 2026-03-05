import { useRef, useState, useMemo, useEffect, useCallback } from "react"
import { Pencil } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw";
import orgSubmission from "@/assets/org_submission.md?raw"
import { ChessLoader } from "@/components/ChessLoader"
import { Badge } from "@/components/ui/badge"
import documentService, { ParseResult, NormalizedIssue } from "@/lib/documentService"
import { storeAnalysisResult, hasAnalysisResult, mockDocuments } from "@/lib/mockData"

const severityHighlightClasses: Record<string, string> = {
  error: "bg-red-300 hover:bg-red-400",
  warning: "bg-amber-200 hover:bg-amber-300",
  info: "bg-sky-100 hover:bg-sky-200",
}

const getHighlightClassBySeverity = (severity?: string) => {
  const normalized = severity?.toLowerCase()
  const severityClasses = normalized && severityHighlightClasses[normalized] ? severityHighlightClasses[normalized] : "bg-yellow-200 hover:bg-yellow-300"
  return `cursor-pointer relative ${severityClasses}`
}

const getSeverityLabel = (severity?: string) => {
  const normalized = severity?.toLowerCase()
  if (normalized === "error") return "Error"
  if (normalized === "info") return "Info"
  return "Warning"
}

// warnings and highlights are provided by the backend `issues` list

export function Example1() {
  const [activewarning, setActivewarning] = useState<{ id: string; text: string; warning: string; references: string[]; severity?: string } | null>(null)
  const [showwarningsList, setShowwarningsList] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [, setApiError] = useState<string | null>(null)
  const [issues, setIssues] = useState<NormalizedIssue[]>([])
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
  const hasProcessed = useRef(false)

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

    const documentId = "5"

    // Only set to analyzing if document hasn't been analyzed yet
    // Only check if document hasn't been analyzed yet
    const doc = mockDocuments.find(d => d.id === documentId)
    if (doc && doc.status !== "analyzed" && !hasAnalysisResult(documentId)) {
      // Mock analyzing state if needed
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
        setIssues([])
        setMarkdown(orgSubmission)
      } else {
        setMarkdown(res.markdown || orgSubmission)
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

          setDocumentSummary(prev => ({ ...prev, correctnessScore: correctness }))

          storeAnalysisResult(documentId, {
            parseResult: res,
            filename: "Jet Support Maintinence"
          })
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
  }, [])

  // documentSummary is loaded from API (see useEffect)

  // Helper function to get color class based on correctness score
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-blue-600"
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  useEffect(() => {
    void load()
  }, [])

  const articleRef = (element: HTMLElement | null) => {
    if (!element) return
    // Avoid re-processing highlights multiple times (prevents duplicate wrapping)
    if (hasProcessed.current) return

    // Process highlights after ReactMarkdown finishes rendering
    setTimeout(() => {
      hasProcessed.current = true
      processHighlights(element)
    }, 50)
  }

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
    setActivewarning({
      id: newwarning.id,
      text: newwarning.submission_excerpt ?? '',
      warning: newwarning.explanation ?? '',
      references: newwarning.main_code ? [newwarning.main_code] : [],
      severity: newwarning.severity ?? 'warning',
    })

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

    // Helper function to try multiple variations of the excerpt
    const findTextVariations = (excerpt: string): string[] => {
      const variations: string[] = []

      // Original
      variations.push(excerpt)

      // Remove leading punctuation/whitespace
      const noLeading = excerpt.replace(/^[.\s]+/, '')
      if (noLeading !== excerpt) variations.push(noLeading)

      // Remove trailing punctuation/whitespace
      const noTrailing = excerpt.replace(/[.\s]+$/, '')
      if (noTrailing !== excerpt) variations.push(noTrailing)

      // Remove both
      const trimmed = excerpt.replace(/^[.\s]+/, '').replace(/[.\s]+$/, '')
      if (trimmed !== excerpt && trimmed.length > 0) variations.push(trimmed)

      // Remove markdown headers (##, ###, etc.)
      const noHeader = excerpt.replace(/^#+\s*/, '')
      if (noHeader !== excerpt) variations.push(noHeader)

      // Remove markdown formatting
      const noBold = excerpt.replace(/\*\*/g, '').replace(/\*/g, '')
      if (noBold !== excerpt) variations.push(noBold)

      // Remove markdown headers and formatting
      const noHeaderBold = excerpt.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/\*/g, '')
      if (noHeaderBold !== excerpt && noHeaderBold.length > 0) variations.push(noHeaderBold)

      return [...new Set(variations)].filter(v => v.length > 0)
    }

    // Process each issue as a warning pair
    let matchedIds: string[] = []
    let unmatchedIds: string[] = []
    issues.forEach(({ id, submission_excerpt: highlightText = '', explanation: warning = '', main_code, severity }) => {
      const references = main_code ? [main_code] : []
      const highlightClass = getHighlightClassBySeverity(severity)

      // Normalize whitespace for both texts (keep original structure for position mapping)
      const normalizedCurrent = currentText.replace(/\s+/g, ' ')

      // Try to find the text using multiple variations
      const variations = findTextVariations(highlightText)
      let normalizedIndex = -1
      let matchedVariation = highlightText

      for (const variation of variations) {
        const normalizedHighlight = variation.replace(/\s+/g, ' ')
        if (normalizedHighlight && normalizedHighlight.length > 3) {
          const index = normalizedCurrent.indexOf(normalizedHighlight)
          if (index !== -1) {
            normalizedIndex = index
            matchedVariation = variation
            break
          }
        }
      }

      // If still not found, try finding a substantial substring (fallback)
      if (normalizedIndex === -1 && highlightText.length > 20) {
        const normalizedHighlight = highlightText.replace(/\s+/g, ' ')
        const minLength = Math.min(30, normalizedHighlight.length)
        for (let start = 0; start <= normalizedHighlight.length - minLength; start++) {
          const substring = normalizedHighlight.substring(start, start + minLength)
          const index = normalizedCurrent.indexOf(substring)
          if (index !== -1) {
            // Found a match, try to extend it to find the full match
            let extendedEnd = start + minLength
            while (extendedEnd < normalizedHighlight.length) {
              const extended = normalizedHighlight.substring(start, extendedEnd + 1)
              if (normalizedCurrent.indexOf(extended) !== -1) {
                extendedEnd++
              } else {
                break
              }
            }
            normalizedIndex = index
            // Use the original highlightText but adjust for the substring match
            matchedVariation = highlightText.substring(start, Math.min(start + (extendedEnd - start), highlightText.length))
            break
          }
        }
      }

      if (normalizedIndex !== -1) {
        matchedIds.push(id)
        const normalizedHighlight = matchedVariation.replace(/\s+/g, ' ')

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
        span.className = highlightClass
        span.style.willChange = 'background-color'
        span.style.touchAction = 'manipulation'
        span.style.userSelect = 'none'
        span.style.webkitUserSelect = 'none'
        span.title = warning
        span.dataset.warningId = id
        span.dataset.warningText = highlightText ?? ''
        span.dataset.warning = warning ?? ''
        span.dataset.references = JSON.stringify(references)
        span.dataset.severity = severity ?? "warning"

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
          }
        }
      } else {
        unmatchedIds.push(id)
        // Debug logging for unmatched issues
        console.warn(`[Highlight] Could not find text for issue ${id}:`, {
          excerpt: highlightText.substring(0, 100),
          excerptLength: highlightText.length,
          mainCode: main_code
        })
      }
    })

    // Reorder issues: matched at start and end, unmatched in middle
    setIssues(prev => {
      const matchedIssues = prev.filter(i => matchedIds.includes(i.id))
      const unmatchedIssues = prev.filter(i => unmatchedIds.includes(i.id))
      const half = Math.floor(matchedIssues.length / 2)

      // Debug summary
      if (unmatchedIssues.length > 0) {
        console.log(`[Highlight] Summary: ${matchedIssues.length} matched, ${unmatchedIssues.length} unmatched out of ${prev.length} total issues`)
      }

      return [...matchedIssues.slice(0, half), ...unmatchedIssues, ...matchedIssues.slice(half)]
    })
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
          references: JSON.parse(referencesStr),
          severity: target.dataset.severity ?? "warning",
        })
        e.stopPropagation()
      }
    }
  }

  return (
    <div className="relative p-8" onClick={() => setActivewarning(null)}>

      {/* Page content shown only after loading */}
      {isLoading ? (
        <div className="bg-white w-full h-full flex items-center justify-center">
          <ChessLoader duration={180} />
        </div>
      ) : (
        <>
          {issues.length > 0 && !activewarning && !showwarningsList && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowwarningsList(!showwarningsList);
              }}
              className="fixed bottom-6 right-6 bg-black hover:bg-gray-800 text-white rounded-full p-4 shadow-lg z-30 flex items-center gap-2"
              style={{ touchAction: "manipulation" }}
              title="View all comments"
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
              className="fixed bottom-0 left-0 right-0 md:left-auto md:right-6 md:bottom-6 md:max-w-sm bg-white/80 border border-gray-400 md:rounded rounded-t-lg shadow-lg p-6 md:p-4 z-20 md:z-30 backdrop-blur-sm flex flex-col h-[280px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-3 flex-shrink-0">
                <h3 className="font-semibold text-sm text-gray-900">
                  All comments ({issues.length})
                </h3>
                <button
                  onClick={() => setShowwarningsList(false)}
                  className="text-gray-500 hover:text-gray-800 ml-2"
                  style={{ touchAction: "manipulation" }}
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
                {issues.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActivewarning({
                        id: item.id,
                        text: item.submission_excerpt ?? '',
                        warning: item.explanation ?? '',
                        references: item.main_code ? [item.main_code] : [],
                        severity: item.severity ?? 'warning',
                      });
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
                <h3 className="font-semibold text-sm text-gray-900">
                  {getSeverityLabel(activewarning?.severity)}
                </h3>
                <button
                  onClick={() => setActivewarning(null)}
                  className="text-gray-500 hover:text-gray-800 ml-2"
                  style={{ touchAction: "manipulation" }}
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-800 mb-3">{activewarning.warning}</p>
              {activewarning.references && activewarning.references.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-semibold text-xs text-gray-900 mb-1">
                    References
                  </h4>
                  <ul className="text-xs text-gray-700 space-y-1">
                    {activewarning.references.map((ref, index) => (
                      <li key={index} className="pl-2 border-l-2 border-gray-500">
                        {ref}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
            {/* Summary Section */}
            <div className="mb-8 space-y-4">
              <div className="flex justify-between items-center">
                {/* Document Name */}
                <h1 className="text-3xl font-bold text-foreground">
                  {documentSummary.name}
                </h1>

                {/* Edit Button with Chess Hover Effect */}
                <button
                  className="relative px-6 py-2 bg-white border-2 border-black font-bold text-xs tracking-widest uppercase transition-all duration-300 hover:bg-black hover:text-white flex items-center gap-2 overflow-hidden group/btn shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  {/* Checkerboard background revealed on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover/btn:opacity-20 pointer-events-none transition-opacity duration-300 bg-white"
                    style={{
                      backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)`,
                      backgroundSize: '10px 10px',
                      backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px'
                    }}
                  />

                  <span className="relative z-10 flex items-center gap-2">
                    <span className="text-lg opacity-0 group-hover/btn:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover/btn:translate-x-0 group-hover/btn:animate-knight-jump">
                      ♞
                    </span>
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </span>
                </button>
              </div>

              {/* Separator */}
              <div className="border-t border-slate-300 my-6"></div>

              {/* Summary Subtitle */}
              <h2 className="text-lg font-semibold text-foreground">Summary</h2>

              {/* AI Summary */}
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {documentSummary.aiSummary}
                </p>
              </div>

              <div className="space-y-3 md:grid md:grid-cols-3 md:gap-6 md:space-y-0">
                <div className="flex items-center gap-2 p-4 rounded-sm backdrop-blur-sm bg-white/30">
                  <span
                    className={`text-2xl font-bold leading-none ${getScoreColor(
                      documentSummary.correctnessScore ?? 0
                    )}`}
                  >
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
                      <Badge key={index} variant="destructive" className="rounded-sm bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1">
                        {section}
                      </Badge>
                    ))}
                  </div>

                </div>
              )}

              <div className="border-t border-slate-300 my-6"></div>

            </div>

            <article
              ref={articleRef}
              className="prose max-w-none"
              onClick={handleArticleClick}
            >
              {markdownContent}
            </article>
          </div>
        </>
      )}

      <style>{`
        @keyframes knight-jump {
          0% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-8px) translateX(0); }
          50% { transform: translateY(-8px) translateX(-4px); }
          75% { transform: translateY(-4px) translateX(-4px); }
          100% { transform: translateY(0) translateX(0); }
        }
        .animate-knight-jump {
          animation: knight-jump 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
