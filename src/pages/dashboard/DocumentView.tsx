import { useLocation, useOutletContext, useParams } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { getAnalysisResult, hasAnalysisResult } from "@/lib/mockData"
import { RealResults } from "./RealResults"
import { useUser } from "@clerk/clerk-react"
import { useApiClient } from "@/hooks/useApiClient"
import {
  DocumentStorageService,
} from "@/lib/documentStorageService"
import { ChessLoader } from "@/components/ChessLoader"
import {
  buildIssuesFromProjectCompliance,
  dedupeNormalizedIssues,
  extractNormalizedIssues,
  type ParseResult,
} from "@/lib/documentService"
import type { DashboardOutletContext } from "@/layouts/DashboardLayout"

function buildParseResult(raw: unknown, fallbackMarkdown: string, fallbackTitle: string): ParseResult {
  const rawRecord = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  const markdown = typeof rawRecord["markdown"] === "string" ? rawRecord["markdown"] : fallbackMarkdown
  const metrics = rawRecord["metrics"] && typeof rawRecord["metrics"] === "object"
    ? rawRecord["metrics"] as Record<string, unknown>
    : undefined
  const metadata = (rawRecord["parsed_codes"] as Record<string, unknown> | undefined)?.["document_metadata"] as Record<string, unknown> | undefined ?? {}
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
    raw: rawRecord,
  }
}

export function DocumentView() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { user } = useUser()
  const apiClient = useApiClient()
  const storageService = useMemo(() => new DocumentStorageService(apiClient), [apiClient])
  const { organizationId, selectedProjectId } = useOutletContext<DashboardOutletContext>()
  const projectId = (location.state as { projectId?: string } | null)?.projectId ?? selectedProjectId

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
        const [response, evaluationStatus, projectComplianceResponse] = await Promise.all([
          storageService.getDocument(organizationId, id),
          storageService.getEvaluationStatus(organizationId, id).catch(() => null),
          projectId
            ? storageService.getProjectCompliance(organizationId, projectId).catch(() => null)
            : Promise.resolve(null),
        ])

        const savedComplianceResult = response.version?.compliance_result
        const statusComplianceResult = evaluationStatus?.results?.length ? evaluationStatus : null
        const complianceResult = savedComplianceResult || statusComplianceResult
        const filename = (response.document.title || id) + ".pdf"
        const parseResult = complianceResult
          ? buildParseResult(complianceResult, response.content_md, response.document.title || "")
          : {
              ok: true,
              markdown: response.content_md,
              issues: [],
              summary: {
                text: response.document.title || "",
                organization: response.document.title || undefined,
                raw: {},
              },
            }

        if (projectComplianceResponse?.compliance_result) {
          const projectIssues = buildIssuesFromProjectCompliance(projectComplianceResponse.compliance_result)
          if (projectIssues.length > 0) {
            parseResult.issues = dedupeNormalizedIssues([...projectIssues, ...parseResult.issues])
          }
        }

        setRealData({
          parseResult,
          filename,
          document_id: id,
          organization_id: organizationId,
        })
      } catch (err: unknown) {
        console.error("Error fetching document:", err)
        setError("Document not found.")
      } finally {
        setIsLoading(false)
      }
    }

    void fetchDoc()
  }, [id, user, organizationId, projectId, storageService])

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><ChessLoader duration={10} /></div>
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
