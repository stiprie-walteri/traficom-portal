import { useOutletContext, useParams } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { getAnalysisResult, hasAnalysisResult } from "@/lib/mockData"
import { RealResults } from "./RealResults"
import { useUser } from "@clerk/clerk-react"
import { useApiClient } from "@/hooks/useApiClient"
import { DocumentStorageService } from "@/lib/documentStorageService"
import { ChessLoaderLong } from "@/components/ChessLoaderLong"
import { extractNormalizedIssues, type ParseResult } from "@/lib/documentService"
import type { DashboardOutletContext } from "@/layouts/DashboardLayout"

/** Convert a raw compliance result JSON into a ParseResult for RealResults. */
function buildParseResult(
  raw: Record<string, unknown>,
  fallbackMarkdown: string,
  fallbackTitle: string
): ParseResult {
  const markdown = typeof raw["markdown"] === "string" ? raw["markdown"] : fallbackMarkdown
  const metrics = raw["metrics"] && typeof raw["metrics"] === "object"
    ? raw["metrics"] as Record<string, unknown>
    : undefined
  const metadata = (raw["parsed_codes"] as Record<string, unknown> | undefined)?.["document_metadata"] as Record<string, unknown> | undefined ?? {}
  const summaryText = [metadata["organization"], metadata["approval_number"]].filter(Boolean).join(" - ") || fallbackTitle

  return {
    ok: true,
    markdown,
    issues: extractNormalizedIssues(raw),
    metrics,
    summary: {
      text: summaryText,
      organization: typeof metadata["organization"] === "string" ? metadata["organization"] : fallbackTitle || undefined,
      approval_number: typeof metadata["approval_number"] === "string" ? metadata["approval_number"] : undefined,
      parsed_date: typeof metadata["parsed_date"] === "string" ? metadata["parsed_date"] : undefined,
      raw: metadata,
    },
    raw,
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

      if (hasAnalysisResult(id)) {
        setRealData(getAnalysisResult(id))
        setIsLoading(false)
        return
      }

      try {
        const [response, evaluationStatus] = await Promise.all([
          storageService.getDocument(organizationId, id),
          storageService.getEvaluationStatus(organizationId, id).catch(() => null),
        ])

        const savedComplianceResult = response.version?.compliance_result
        const statusComplianceResult = evaluationStatus?.results?.length ? evaluationStatus : null
        const complianceResult = savedComplianceResult || statusComplianceResult
        const filename = (response.document.title || id) + ".pdf"

        if (complianceResult) {
          setRealData({
            parseResult: buildParseResult(
              complianceResult as Record<string, unknown>,
              response.content_md,
              response.document.title || ""
            ),
            filename,
            document_id: id,
            organization_id: organizationId,
          })
        } else {
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
            filename,
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

    void fetchDoc()
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
