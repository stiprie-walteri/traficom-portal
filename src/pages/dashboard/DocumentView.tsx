import { useOutletContext, useParams } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { getAnalysisResult, hasAnalysisResult } from "@/lib/mockData"
import { RealResults } from "./RealResults"
import { useUser } from "@clerk/clerk-react"
import { useApiClient } from "@/hooks/useApiClient"
import { DocumentStorageService } from "@/lib/documentStorageService"
import { ChessLoaderLong } from "@/components/ChessLoaderLong"
import { type NormalizedIssue, type ParseResult } from "@/lib/documentService"
import type { DashboardOutletContext } from "@/layouts/DashboardLayout"

/** Convert a raw compliance result JSON (as stored in DB) into a ParseResult for RealResults. */
function buildParseResult(raw: Record<string, unknown>): ParseResult {
  const markdown = typeof raw["markdown"] === "string" ? raw["markdown"] : ""
  const metrics = (raw["metrics"] && typeof raw["metrics"] === "object")
    ? (raw["metrics"] as Record<string, unknown>)
    : undefined

  const metadata = (raw["parsed_codes"] as Record<string, unknown> | undefined)?.["document_metadata"] as Record<string, unknown> | undefined ?? {}
  const rawIssues: Record<string, unknown>[] =
    Array.isArray((raw["issues"] as Record<string, unknown> | undefined)?.["issues"])
      ? ((raw["issues"] as Record<string, unknown>)["issues"] as Record<string, unknown>[])
      : []

  const issues: NormalizedIssue[] = rawIssues.map((r, i) => ({
    id: `issue-${i}`,
    code: typeof r["code"] === "string" ? r["code"] : undefined,
    main_code: typeof r["main_code"] === "string" ? r["main_code"] : undefined,
    submission_excerpt: typeof r["submission_excerpt"] === "string" ? r["submission_excerpt"] : undefined,
    explanation: typeof r["explanation"] === "string" ? r["explanation"] : undefined,
    legislation_source: typeof r["legislation_source"] === "string" ? r["legislation_source"] : undefined,
    severity: typeof r["severity"] === "string" ? r["severity"] : undefined,
    submission_sections: Array.isArray(r["submission_sections"]) ? r["submission_sections"] as string[] : undefined,
    raw: r,
  }))

  return {
    ok: true,
    markdown,
    issues,
    metrics,
    summary: {
      text: [metadata["organization"], metadata["approval_number"]].filter(Boolean).join(" — ") as string,
      organization: typeof metadata["organization"] === "string" ? metadata["organization"] : undefined,
      approval_number: typeof metadata["approval_number"] === "string" ? metadata["approval_number"] : undefined,
      parsed_date: typeof metadata["parsed_date"] === "string" ? metadata["parsed_date"] : undefined,
      raw: metadata,
    },
    raw: raw as Record<string, unknown>,
  }
}

export function DocumentView() {
  const { id } = useParams<{ id: string }>()
  const { user } = useUser()
  const apiClient = useApiClient()
  const storageService = useMemo(() => new DocumentStorageService(apiClient), [apiClient])
  const { organizationId } = useOutletContext<DashboardOutletContext>()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realData, setRealData] = useState<{
    parseResult: ParseResult
    filename: string
    document_id?: string
    organization_id?: string
  } | null>(null)

  useEffect(() => {
    const fetchDoc = async () => {
      if (!id || !user || !organizationId) return
      setIsLoading(true)
      setError(null)

      // 1. Check in-memory session cache first (populated right after upload in same session)
      if (hasAnalysisResult(id)) {
        setRealData(getAnalysisResult(id))
        setIsLoading(false)
        return
      }

      // 2. Fetch from storage API
      try {
        const response = await storageService.getDocument(organizationId, id)
        const complianceResult = response.version?.compliance_result

        if (complianceResult) {
          // We have a persisted compliance result — reconstruct the ParseResult from it
          setRealData({
            parseResult: buildParseResult(complianceResult as Record<string, unknown>),
            filename: (response.document.title || id) + ".pdf",
            document_id: id,
            organization_id: organizationId,
          })
        } else {
          // Document exists but no compliance result yet — show markdown only
          setRealData({
            parseResult: {
              ok: true,
              markdown: response.content_md,
              issues: [],
              summary: {
                text: response.document.title || "",
                organization: response.document.title || undefined,
                raw: {},
              },
            },
            filename: (response.document.title || id) + ".pdf",
            document_id: id,
            organization_id: organizationId,
          })
        }
      } catch (err: unknown) {
        console.error("Error fetching document:", err)
        setError("Document not found.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDoc()
  }, [id, user, organizationId, storageService])

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><ChessLoaderLong /></div>
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => window.history.back()} className="mt-6">Go Back</Button>
      </div>
    )
  }

  if (realData) {
    return <RealResults storedData={realData} documentOnly />
  }

  return (
    <div className="container mx-auto px-6 py-12 text-center">
      <h2 className="text-2xl font-bold mb-4">No Data</h2>
      <p className="text-muted-foreground">This document could not be loaded.</p>
      <Button onClick={() => window.history.back()} className="mt-6">Go Back</Button>
    </div>
  )
}
