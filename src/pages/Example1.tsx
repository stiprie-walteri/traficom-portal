import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw";
import orgSubmission from "@/assets/org_submission.md?raw"

export function Example1() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
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
