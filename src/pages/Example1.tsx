import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw";
import orgSubmission from "@/assets/org_submission.md?raw"

export function Example1() {
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

  return (
    <div className="p-8">
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
          <h2 className="text-lg font-semibold text-foreground">
            Summary
          </h2>

          {/* AI Summary */}
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {documentSummary.aiSummary}
            </p>
          </div>

          {/* Stats List */}
          <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${getScoreColor(documentSummary.correctnessScore)}`}>
                {documentSummary.correctnessScore}%
              </span>
              <span className="text-lg">
                Correctness Score
              </span>
            </div>

          <div className="space-y-3 md:grid md:grid-cols-3 md:gap-6 md:space-y-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-orange-600">
                {documentSummary.missingSections}
              </span>
              <span className="text-lg">
                Missing Sections
              </span>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-600">
                {documentSummary.incorrectSections}
              </span>
              <span className="text-lg">
                Incorrect Sections
              </span>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-slate-300 my-6"></div>
        </div>

        {/* Document Content */}
        <article className="prose max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          >
            {orgSubmission}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
