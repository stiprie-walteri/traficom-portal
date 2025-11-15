import { useRef, useState, useMemo, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw";
import orgSubmission from "@/assets/org_submission.md?raw"
import { ChessLoader } from "@/components/ChessLoader"

const textsComments=[
  {
    id: 'comment-1',
    text: 'It is accepted that these procedures do not override the necessity of complying with any new or amended regulation published by EASA from time to time where these new or amended regulations are in conflict with these procedures.',
    comment: 'This is a standard disclaimer to ensure compliance with EASA regulations.',
    references: ["European Union Aviation Safety Agency (EASA) Regulations No. 216/2008 and its subsequent amendments" , "European Union Aviation Safety Agency (EASA) Regulations No. 748/2012 and its subsequent amendments"]
  },
  {
    id: 'comment-2',
    text: 'Mr Stuart Hood Accountable Manager Air X Jet Support Limited',
    comment: 'Skibidi',
    references: ["Asian Union Aviation Safety Agency (EASA) Regulations No. 216/2008 and its subsequent amendments" , "Asian Union Aviation Safety Agency (EASA) Regulations No. 748/2012 and its subsequent amendments"]

  },
  {
    id: 'comment-3',
    text: 'The report shall include a brief summary, details of the maintenance error occurrence, root cause analysis, corrective action and recommended preventative action.',
    comment: 'suka puka',
    references: []

  },
  {
    id: 'comment-4',
    text: 'MAINTENANCE PROCEDURES',
    comment: 'Skibassasasasaidi',
    references: []

  },
  {
    id: 'comment-5',
    text: 'When a task is required to be handed over from one shift to the oncoming shift, the shift engineer handing over the task shall ensure that, as required, all work that has been accomplished on the off going shift has been signed for or certified on the maintenance records. This assures continuity of inspection',
    comment: 'Skibidiasdasasdasdasdasd',
    references: []

  }
]

export function Example1() {
  const [activeComment, setActiveComment] = useState<{ id: string; text: string; comment: string; references: string[] } | null>(null)
  const [showCommentsList, setShowCommentsList] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const hasProcessed = useRef(false)

  const markdownContent = useMemo(() => (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
    >
      {orgSubmission}
    </ReactMarkdown>
  ), [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 10000)
    return () => clearTimeout(timer)
  }, [])
  
  // Mock data - to be replaced with backend API call
  const documentSummary = {
    name: "JET SUPPORT MAINTENANCE ORGANISATION EXPOSITION",
    missingSections: 3,
    incorrectSections: 7,
    correctnessScore: 85,
    aiSummary: "This maintenance organization exposition document demonstrates substantial compliance with Part 145 regulations. The organization has established comprehensive management procedures and quality control systems. However, several sections require updates to align with current EASA requirements, and three mandatory sections are missing from the current submission."
  }

  // Helper function to get color class based on correctness score
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 75) return "text-yellow-600"
    return "text-red-600"
  }
  
  const articleRef = (element: HTMLElement | null) => {
    if (element && !hasProcessed.current) {
      hasProcessed.current = true
      // Small delay to ensure ReactMarkdown has fully rendered
      setTimeout(() => processHighlights(element), 0)
    }
  }

  const navigateToComment = (direction: 'prev' | 'next') => {
    if (!activeComment) return
    
    const currentIndex = textsComments.findIndex(tc => tc.id === activeComment.id)
    let newIndex: number
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : textsComments.length - 1
    } else {
      newIndex = currentIndex < textsComments.length - 1 ? currentIndex + 1 : 0
    }
    
    const newComment = textsComments[newIndex]
    setActiveComment(newComment)
    
    // Scroll to the element only if it's not in view
    const element = document.getElementById(newComment.id)
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

    // Process each text-comment pair
    textsComments.forEach(({ id, text: highlightText, comment, references }) => {
      // Find the text to highlight (normalize whitespace for matching)
      const normalizedCurrent = currentText.replace(/\s+/g, ' ')
      const normalizedHighlight = highlightText.replace(/\s+/g, ' ')
      const normalizedIndex = normalizedCurrent.indexOf(normalizedHighlight)

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
        span.title = comment
        span.dataset.commentId = id
        span.dataset.commentText = highlightText
        span.dataset.comment = comment
        span.dataset.references = JSON.stringify(references)

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
      }
    })
  }

  // Event delegation handler - use click but with optimized spans
  const handleArticleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const commentId = target.dataset.commentId
    
    if (commentId) {
      const commentText = target.dataset.commentText
      const comment = target.dataset.comment
      const referencesStr = target.dataset.references
      
      if (commentText && comment && referencesStr) {
        // Direct state update
        setActiveComment({
          id: commentId,
          text: commentText,
          comment,
          references: JSON.parse(referencesStr)
        })
        e.stopPropagation()
      }
    }
  }

  return (
    <div className="relative p-8" onClick={() => setActiveComment(null)}>

      {isLoading ? (
        <div className="bg-white w-full h-full flex items-center justify-center">
          <ChessLoader duration={180} />
        </div>
      ) : (

      /* Page content shown only after loading */
      <>
      {textsComments.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowCommentsList(!showCommentsList);
          }}
          className="fixed top-6 right-6 bg-black hover:bg-gray-800 text-white rounded-full p-4 shadow-lg z-40 flex items-center gap-2"
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
          <span className="font-medium">{textsComments.length}</span>
        </button>
      )}

      {showCommentsList && (
        <div
          className="fixed top-24 right-6 bg-white border border-gray-400 rounded shadow-lg p-4 max-w-sm z-40 max-h-96 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-sm text-gray-900">
              All Comments ({textsComments.length})
            </h3>
            <button
              onClick={() => setShowCommentsList(false)}
              className="text-gray-500 hover:text-gray-800 ml-2"
              style={{ touchAction: "manipulation" }}
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {textsComments.slice(0, 3).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveComment(item);
                  setShowCommentsList(false);
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
                  {item.text}
                </p>
                <p className="text-xs text-gray-600 line-clamp-1">
                  {item.comment}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeComment && (
        <div
          className="fixed top-4 right-4 bg-white border border-gray-400 rounded shadow-lg p-4 max-w-md z-50"
          style={{ willChange: "contents" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-sm text-gray-900">Comment</h3>
            <button
              onClick={() => setActiveComment(null)}
              className="text-gray-500 hover:text-gray-800 ml-2"
              style={{ touchAction: "manipulation" }}
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-800 mb-3">{activeComment.comment}</p>
          {activeComment.references && activeComment.references.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold text-xs text-gray-900 mb-1">
                References
              </h4>
              <ul className="text-xs text-gray-700 space-y-1">
                {activeComment.references.map((ref, index) => (
                  <li key={index} className="pl-2 border-l-2 border-gray-500">
                    {ref}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-gray-300">
            <button
              onClick={() => navigateToComment("prev")}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded"
              style={{ touchAction: "manipulation" }}
              title="Previous comment"
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
              {textsComments.findIndex((tc) => tc.id === activeComment.id) + 1}{" "}
              / {textsComments.length}
            </span>
            <button
              onClick={() => navigateToComment("next")}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded"
              style={{ touchAction: "manipulation" }}
              title="Next comment"
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
          {/* Document Name */}
          <h1 className="text-3xl font-bold text-foreground">
            {documentSummary.name}
          </h1>

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
                  documentSummary.correctnessScore
                )}`}
              >
                {documentSummary.correctnessScore}%
              </span>
              <span className="text-lg leading-none">Correctness Score</span>
            </div>

            <div className="flex items-center gap-2 p-4 rounded-sm backdrop-blur-sm bg-white/30">
              <span className="text-2xl font-bold text-orange-600 leading-none">
                {documentSummary.missingSections}
              </span>
              <span className="text-lg leading-none">Missing Sections</span>
            </div>

            <div className="flex items-center gap-2 p-4 rounded-sm backdrop-blur-sm bg-white/30">
              <span className="text-2xl font-bold text-amber-600 leading-none">
                {documentSummary.incorrectSections}
              </span>
              <span className="text-lg leading-none">Incorrect Sections</span>
            </div>
          </div>

          {/* Separator */}
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
    </div>
  );
}
