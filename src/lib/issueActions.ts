import type { DocumentationIssue } from "@/lib/documentStorageService"
import type { NormalizedIssue } from "@/lib/documentService"

export function getIssueBackendPayload(issue: NormalizedIssue) {
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
