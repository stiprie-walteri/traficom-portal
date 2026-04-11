import { AxiosInstance } from "axios";

export interface WorkspaceMe {
    organization_id: string;
}

export interface ProjectItem {
    project_id: string;
    organization_id: string;
    name: string;
    description?: string | null;
    legislation_template_ids?: string[] | null;
    created_at?: string;
    updated_at?: string;
}

export interface LegislationTemplate {
    id: string;
    name: string;
}

export interface ProjectEvaluationResult {
    legislation_id?: string | null;
    legislation_name?: string | null;
    task: string[];
    exists: boolean;
    explanation: string;
    is_correct?: boolean;
    correctness_score?: number;
    missing_sections?: string[];
    incorrect_sections?: IncorrectSection[];
    issues?: DocumentationIssue[];
    reasoning_steps?: ReasoningStep[];
}

export interface ProjectComplianceDocument {
    document_id: string;
    title: string;
    version_id: string;
    version_no: number;
}

export interface ProjectComplianceLegislationGroup {
    template_id: string;
    template_name: string;
    task_count: number;
    results: ProjectEvaluationResult[];
}

export interface ProjectComplianceResult {
    evaluation_job_id: string;
    project_id: string;
    documents: ProjectComplianceDocument[];
    legislation_template_ids: string[];
    legislations: ProjectComplianceLegislationGroup[];
    results: ProjectEvaluationResult[];
}

export interface ProjectEvaluationJob {
    job_id: string;
    project_id: string;
    status: "running";
}

export interface ProjectEvaluationStatus {
    job_id: string;
    status: "running" | "completed" | "failed";
    organization_id: string;
    project_id: string;
    status_message?: string | null;
    progress_percent?: number | null;
    total_tasks: number;
    completed_count: number;
    current_task: string[] | null;
    estimated_seconds_remaining?: number | null;
    estimated_completion_at?: string | null;
    results: ProjectEvaluationResult[];
    compliance_result: ProjectComplianceResult | null;
    error: string | null;
    started_at: string;
    updated_at: string;
    documents: ProjectComplianceDocument[];
    legislation_template_ids: string[];
}

export interface DocumentVersion {
    version_id: string;
    organization_id: string;
    document_id: string;
    version_no: number;
    content_hash: string;
    object_key: string;
    size_bytes: number;
    created_at: string;
    created_by: string;
    message?: string;
    parent_version_id?: string;
    compliance_result?: object | null;
}

export interface StoredDocument {
    document_id: string;
    organization_id: string;
    title: string;
    project_id?: string | null;
    project?: ProjectItem | null;
    created_at: string;
    created_by: string;
    updated_at: string;
    current_version?: DocumentVersion;
}

export interface PaginatedResponse<T> {
    items: T[];
    limit: number;
    offset: number;
    next_offset: number | null;
}

export interface UploadResponse {
    organization_id?: string;
    project_id?: string;
    document_id: string;
    version_id: string;
    version_no: number;
    content_hash: string;
}

export interface GetDocumentResponse {
    document: StoredDocument;
    version: DocumentVersion;
    content_md: string;
}

export interface DocumentChunk {
    id: string;
    organization_id: string;
    document_id: string;
    version_id: string;
    chunk_level: number;
    title: string;
    start_page: number;
    end_page: number;
    text_content: string;
    created_at: string;
}

export interface DocumentChunksResponse {
    organization_id: string;
    document_id: string;
    version_id: string;
    chunks: DocumentChunk[];
}

export interface DeleteDocumentResponse {
    document_id: string;
    organization_id: string;
    chunks_deleted: number;
    versions_deleted: number;
    objects_deleted: number;
    objects_failed: number;
}

export interface EvaluateTasksRequest {
    tasks?: string[][];
}

export interface IncorrectSection {
    ID: string;
    Quote: string;
    Comment: string;
}

export interface IssueSectionReference {
    id?: string | null;
    title?: string | null;
    quote?: string | null;
}

export interface SuggestedInsertLocation {
    action?: string;
    target_section_id?: string | null;
    target_section_title?: string | null;
    anchor_quote?: string | null;
    placement?: string;
}

export interface SuggestedFix {
    insertable_text?: string;
    insert_location?: SuggestedInsertLocation;
}

export interface DocumentationIssue {
    id?: string;
    issue_type?: string;
    title?: string;
    legislation_reference?: string | null;
    current_section?: IssueSectionReference | null;
    problem?: string;
    solution?: string;
    suggested_fix?: SuggestedFix;
}

export interface ReasoningStep {
    step: number;
    thought?: string | null;
    sections_queried?: number[];
    section_titles?: string[];
    references_queried?: string[];
}

export interface EvaluateTaskResult {
    task: string[];
    exists: boolean;
    explanation: string;
    is_correct?: boolean;
    correctness_score?: number;
    missing_sections?: string[];
    incorrect_sections?: IncorrectSection[];
    issues?: DocumentationIssue[];
    reasoning_steps?: ReasoningStep[];
}

export type DocumentCompliancePayload = EvaluateTaskResult[] | {
    results?: EvaluateTaskResult[];
    legislations?: ProjectComplianceLegislationGroup[];
    [key: string]: unknown;
};

export interface ApplySuggestionsRequest {
    issue_ids?: string[];
    issues?: DocumentationIssue[];
    save: boolean;
    allow_partial?: boolean;
    message?: string;
    expected_content_hash?: string;
}

export interface SuggestionApplicationResult {
    issue_id?: string;
    status?: string;
    action?: string;
    message?: string;
    [key: string]: unknown;
}

export interface ApplySuggestionsResponse {
    patched_content_md: string;
    applied_count: number;
    skipped_count: number;
    failed_count: number;
    applications: SuggestionApplicationResult[];
    saved_version?: DocumentVersion | null;
}

/** 202 response from POST .../evaluate */
export interface EvaluationJob {
    job_id: string;
    document_id: string;
    version_id: string;
    status: "running";
}

/** GET .../evaluation/status */
export interface EvaluationStatus {
    job_id: string;
    status: "running" | "completed" | "failed";
    total_tasks: number;
    completed_count: number;
    current_task: string[] | null;
    status_message?: string | null;
    progress_percent?: number | null;
    estimated_seconds_remaining?: number | null;
    estimated_completion_at?: string | null;
    results: EvaluateTaskResult[];
    error: string | null;
    started_at: string;
    updated_at: string;
}

/** GET /api/orgs/{organization_id}/documents/evaluation-statuses */
export interface DocumentEvaluationStatus {
    document_id: string;
    status: string | null;
    is_analyzing: boolean;
    total_tasks: number;
    completed_count: number;
    current_task: string[] | null;
    compliance_result: DocumentCompliancePayload | null;
}

/** @deprecated use startEvaluation + getEvaluationStatus instead */
export interface EvaluateTasksResponse {
    organization_id: string;
    document_id: string;
    version_id: string;
    results: EvaluateTaskResult[];
}

export interface UploadDocumentParams {
    organizationId: string;
    projectId?: string;
    file: File;
    documentId?: string;
    title?: string;
    message?: string;
}

export interface ListDocumentsParams {
    limit?: number;
    offset?: number;
    project_id?: string;
}

/**
 * Service class for interacting with the Document Storage API.
 * It takes an authenticated Axios instance (obtained from useApiClient hook).
 */
export class DocumentStorageService {
    constructor(private apiClient: AxiosInstance) { }
    private static readonly RATE_LIMIT_GRACE_MS = 5 * 60 * 1000;

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    private isRateLimitError(error: unknown): boolean {
        const maybeError = error as {
            response?: {
                status?: number;
                data?: {
                    error?: {
                        code?: number | string;
                    };
                };
            };
        };

        return (
            maybeError?.response?.status === 429 ||
            maybeError?.response?.data?.error?.code === 429
        );
    }

    private getRateLimitDelayMs(error: unknown): number {
        const maybeError = error as {
            response?: {
                headers?: Record<string, string | number | undefined>;
                data?: {
                    error?: {
                        metadata?: {
                            headers?: Record<string, string | number | undefined>;
                        };
                    };
                };
            };
        };

        const responseHeaders = maybeError?.response?.headers;
        const metadataHeaders = maybeError?.response?.data?.error?.metadata?.headers;
        const resetValue =
            responseHeaders?.["x-ratelimit-reset"] ??
            responseHeaders?.["X-RateLimit-Reset"] ??
            metadataHeaders?.["X-RateLimit-Reset"] ??
            metadataHeaders?.["x-ratelimit-reset"];

        if (resetValue) {
            const resetAt = Number(resetValue);
            if (!Number.isNaN(resetAt) && resetAt > Date.now()) {
                return Math.max(1000, resetAt - Date.now());
            }
        }

        return 15000;
    }

    private async retryOnRateLimit<T>(operation: () => Promise<T>): Promise<T> {
        const startedAt = Date.now();

        while (true) {
            try {
                return await operation();
            } catch (error) {
                if (!this.isRateLimitError(error)) {
                    throw error;
                }

                if (Date.now() - startedAt >= DocumentStorageService.RATE_LIMIT_GRACE_MS) {
                    throw error;
                }

                await this.sleep(this.getRateLimitDelayMs(error));
            }
        }
    }

    private getPollingErrorMessage(error: unknown): string {
        const maybeError = error as {
            response?: {
                status?: number;
                data?: {
                    error?: {
                        message?: string;
                    };
                };
            };
            message?: string;
        };

        const apiMessage = maybeError?.response?.data?.error?.message;
        const fallbackMessage = maybeError?.message || "Temporary polling error";

        if (maybeError?.response?.status === 429) {
            return apiMessage || "Rate limit reached. Waiting before retrying.";
        }

        return apiMessage || fallbackMessage;
    }

    private hasProjectProgress(
        previous: ProjectEvaluationStatus | null,
        next: ProjectEvaluationStatus
    ): boolean {
        if (!previous) return true;

        return (
            next.completed_count > previous.completed_count ||
            next.updated_at !== previous.updated_at ||
            next.status !== previous.status ||
            next.progress_percent !== previous.progress_percent ||
            (next.status_message || "") !== (previous.status_message || "") ||
            (next.current_task || []).join("|") !== (previous.current_task || []).join("|")
        );
    }

    private hasDocumentProgress(
        previous: EvaluationStatus | null,
        next: EvaluationStatus
    ): boolean {
        if (!previous) return true;

        return (
            next.completed_count > previous.completed_count ||
            next.updated_at !== previous.updated_at ||
            next.status !== previous.status ||
            next.progress_percent !== previous.progress_percent ||
            (next.status_message || "") !== (previous.status_message || "") ||
            (next.current_task || []).join("|") !== (previous.current_task || []).join("|")
        );
    }

    async getMe(): Promise<WorkspaceMe> {
        const response = await this.apiClient.get<WorkspaceMe>("/me");
        return response.data;
    }

    /**
     * Upload a Markdown file to create a new document or add a new version to an existing one.
     * POST /api/documents/upload
     */
    async uploadDocument(params: UploadDocumentParams): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append("organization_id", params.organizationId);
        formData.append("file", params.file);

        if (params.projectId) formData.append("project_id", params.projectId);
        if (params.documentId) formData.append("document_id", params.documentId);
        if (params.title) formData.append("title", params.title);
        if (params.message) formData.append("message", params.message);

        const response = await this.apiClient.post<UploadResponse>(
            "/documents/upload",
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return response.data;
    }

    /**
     * Returns a paginated list of all documents for an organization.
     * GET /api/orgs/{organization_id}/documents
     */
    async listDocuments(
        organizationId: string,
        params?: ListDocumentsParams
    ): Promise<PaginatedResponse<StoredDocument>> {
        const response = await this.apiClient.get<PaginatedResponse<StoredDocument>>(
            `/orgs/${organizationId}/documents`,
            { params }
        );
        return response.data;
    }

    async listProjects(organizationId: string): Promise<ProjectItem[]> {
        const response = await this.apiClient.get<ProjectItem[] | PaginatedResponse<ProjectItem>>(
            `/orgs/${organizationId}/projects`
        );
        const data = response.data;
        return Array.isArray(data) ? data : data?.items || [];
    }

    async createProject(
        organizationId: string,
        payload: { name: string; description?: string; legislation_template_ids: string[] }
    ): Promise<ProjectItem> {
        const response = await this.apiClient.post<ProjectItem>(
            `/orgs/${organizationId}/projects`,
            payload
        );
        return response.data;
    }

    async getProject(organizationId: string, projectId: string): Promise<ProjectItem> {
        const response = await this.apiClient.get<ProjectItem>(
            `/orgs/${organizationId}/projects/${projectId}`
        );
        return response.data;
    }

    async updateProject(
        organizationId: string,
        projectId: string,
        payload: { name?: string; description?: string; legislation_template_ids?: string[] }
    ): Promise<ProjectItem> {
        const response = await this.apiClient.patch<ProjectItem>(
            `/orgs/${organizationId}/projects/${projectId}`,
            payload
        );
        return response.data;
    }

    async deleteProject(organizationId: string, projectId: string): Promise<void> {
        await this.apiClient.delete(`/orgs/${organizationId}/projects/${projectId}`);
    }

    async listProjectDocuments(
        organizationId: string,
        projectId: string
    ): Promise<PaginatedResponse<StoredDocument>> {
        const response = await this.apiClient.get<PaginatedResponse<StoredDocument>>(
            `/orgs/${organizationId}/projects/${projectId}/documents`
        );
        return response.data;
    }

    async startProjectEvaluation(
        organizationId: string,
        projectId: string,
        templateIds?: string[]
    ): Promise<ProjectEvaluationJob> {
        const response = await this.retryOnRateLimit(() =>
            this.apiClient.post<ProjectEvaluationJob>(
                `/orgs/${organizationId}/projects/${projectId}/evaluate`,
                templateIds && templateIds.length > 0 ? { template_ids: templateIds } : {}
            )
        );
        return response.data;
    }

    async getProjectEvaluationStatus(
        organizationId: string,
        projectId: string
    ): Promise<ProjectEvaluationStatus> {
        const response = await this.retryOnRateLimit(() =>
            this.apiClient.get<ProjectEvaluationStatus>(
                `/orgs/${organizationId}/projects/${projectId}/evaluation/status`
            )
        );
        return response.data;
    }

    async waitForProjectEvaluationCompletion(
        organizationId: string,
        projectId: string,
        options?: {
            intervalMs?: number;
            stallTimeoutMs?: number;
            onProgress?: (status: ProjectEvaluationStatus) => void;
            onTransientError?: (message: string, lastStatus: ProjectEvaluationStatus | null) => void;
        }
    ): Promise<ProjectEvaluationStatus> {
        const intervalMs = options?.intervalMs ?? 4000;
        const stallTimeoutMs = options?.stallTimeoutMs ?? 5 * 60 * 1000;
        let lastStatus: ProjectEvaluationStatus | null = null;
        let lastProgressAt = Date.now();

        while (true) {
            try {
                const status = await this.getProjectEvaluationStatus(organizationId, projectId);

                if (this.hasProjectProgress(lastStatus, status)) {
                    lastProgressAt = Date.now();
                }

                lastStatus = status;
                options?.onProgress?.(status);

                if (status.status === "completed" || status.status === "failed") {
                    return status;
                }
            } catch (error) {
                options?.onTransientError?.(this.getPollingErrorMessage(error), lastStatus);

                if (Date.now() - lastProgressAt >= stallTimeoutMs) {
                    throw error;
                }
            }

            await this.sleep(intervalMs);
        }
    }

    async waitForEvaluationCompletion(
        organizationId: string,
        documentId: string,
        options?: {
            intervalMs?: number;
            stallTimeoutMs?: number;
            onProgress?: (status: EvaluationStatus) => void;
            onTransientError?: (message: string, lastStatus: EvaluationStatus | null) => void;
        }
    ): Promise<EvaluationStatus> {
        const intervalMs = options?.intervalMs ?? 4000;
        const stallTimeoutMs = options?.stallTimeoutMs ?? 5 * 60 * 1000;
        let lastStatus: EvaluationStatus | null = null;
        let lastProgressAt = Date.now();

        while (true) {
            try {
                const status = await this.getEvaluationStatus(organizationId, documentId);

                if (this.hasDocumentProgress(lastStatus, status)) {
                    lastProgressAt = Date.now();
                }

                lastStatus = status;
                options?.onProgress?.(status);

                if (status.status === "completed" || status.status === "failed") {
                    return status;
                }
            } catch (error) {
                options?.onTransientError?.(this.getPollingErrorMessage(error), lastStatus);

                if (Date.now() - lastProgressAt >= stallTimeoutMs) {
                    throw error;
                }
            }

            await this.sleep(intervalMs);
        }
    }

    async getProjectCompliance(
        organizationId: string,
        projectId: string
    ): Promise<{ project_id: string; compliance_result: ProjectComplianceResult | null }> {
        const response = await this.apiClient.get<{ project_id: string; compliance_result: ProjectComplianceResult | null }>(
            `/orgs/${organizationId}/projects/${projectId}/compliance`
        );
        return response.data;
    }

    /**
     * Returns the latest version of a document including the full Markdown body.
     * GET /api/orgs/{organization_id}/documents/{document_id}
     */
    async getDocument(
        organizationId: string,
        documentId: string,
        actorUserId?: string
    ): Promise<GetDocumentResponse> {
        const params = actorUserId ? { actor_user_id: actorUserId } : undefined;
        const response = await this.apiClient.get<GetDocumentResponse>(
            `/orgs/${organizationId}/documents/${documentId}`,
            { params }
        );
        return response.data;
    }

    /**
     * Returns a paginated list of all versions for a document.
     * GET /api/orgs/{organization_id}/documents/{document_id}/versions
     */
    async listVersions(
        organizationId: string,
        documentId: string,
        params?: ListDocumentsParams
    ): Promise<PaginatedResponse<DocumentVersion>> {
        const response = await this.apiClient.get<PaginatedResponse<DocumentVersion>>(
            `/orgs/${organizationId}/documents/${documentId}/versions`,
            { params }
        );
        return response.data;
    }

    /**
     * Returns a specific version by its version number, including the full Markdown body.
     * GET /api/orgs/{organization_id}/documents/{document_id}/versions/{version_no}
     */
    async getVersion(
        organizationId: string,
        documentId: string,
        versionNo: number,
        actorUserId?: string
    ): Promise<GetDocumentResponse> {
        const params = actorUserId ? { actor_user_id: actorUserId } : undefined;
        const response = await this.apiClient.get<GetDocumentResponse>(
            `/orgs/${organizationId}/documents/${documentId}/versions/${versionNo}`,
            { params }
        );
        return response.data;
    }

    /**
     * Returns a list of chunks for a document version.
     * GET /api/orgs/{organization_id}/documents/{document_id}/versions/{version_no}/chunks
     */
    async getChunks(
        organizationId: string,
        documentId: string,
        versionNo: number
    ): Promise<DocumentChunksResponse> {
        const response = await this.apiClient.get<DocumentChunksResponse>(
            `/orgs/${organizationId}/documents/${documentId}/versions/${versionNo}/chunks`
        );
        return response.data;
    }

    /**
     * Retrieves the compliance result if one exists.
     * GET /api/orgs/{organization_id}/documents/{document_id}/compliance
     */
    async getCompliance(
        organizationId: string,
        documentId: string
    ): Promise<{ document_id: string; version_id: string; compliance_result: DocumentCompliancePayload | null }> {
        const response = await this.apiClient.get<{ document_id: string; version_id: string; compliance_result: DocumentCompliancePayload | null }>(
            `/orgs/${organizationId}/documents/${documentId}/compliance`
        );
        return response.data;
    }

    /**
     * Persists a compliance analysis result for a specific document version.
     * POST /api/orgs/{organization_id}/documents/{document_id}/versions/{version_no}/compliance
     */
    async saveComplianceResult(
        organizationId: string,
        documentId: string,
        versionNo: number,
        result: object
    ): Promise<void> {
        await this.apiClient.post(
            `/orgs/${organizationId}/documents/${documentId}/versions/${versionNo}/compliance`,
            { result }
        );
    }

    async applySuggestions(
        organizationId: string,
        documentId: string,
        versionNo: number,
        payload: ApplySuggestionsRequest
    ): Promise<ApplySuggestionsResponse> {
        const response = await this.apiClient.post<ApplySuggestionsResponse>(
            `/orgs/${organizationId}/documents/${documentId}/versions/${versionNo}/suggestions/apply`,
            payload
        );
        return response.data;
    }

    /**
     * Deletes a document and all its chunks, versions, and MinIO objects atomically.
     * DELETE /api/orgs/{organization_id}/documents/{document_id}
     */
    async deleteDocument(
        organizationId: string,
        documentId: string
    ): Promise<DeleteDocumentResponse> {
        const response = await this.apiClient.delete<DeleteDocumentResponse>(
            `/orgs/${organizationId}/documents/${documentId}`
        );
        return response.data;
    }

    /**
     * Fetch available agent templates
     * GET /api/legislation/templates
     */
    async getTemplates(): Promise<{ templates: LegislationTemplate[] }> {
        const response = await this.apiClient.get<{ templates: LegislationTemplate[] }>(
            `/legislation/templates`
        );
        return response.data;
    }

    /**
     * Starts an async evaluation job.
     * POST /api/orgs/{organization_id}/documents/{document_id}/versions/{version_no}/evaluate
     * Returns 202 with a job_id to poll.
     */
    async startEvaluation(
        organizationId: string,
        documentId: string,
        versionNo: number,
        tasks?: string[][],
        templateId?: string
    ): Promise<EvaluationJob> {
        const body: EvaluateTasksRequest | Record<string, never> = tasks ? { tasks } : {};
        const params = templateId ? { template_id: templateId } : undefined;
        const response = await this.retryOnRateLimit(() =>
            this.apiClient.post<EvaluationJob>(
                `/orgs/${organizationId}/documents/${documentId}/versions/${versionNo}/evaluate`,
                body,
                { params }
            )
        );
        return response.data;
    }

    /**
     * Polls the evaluation status for a document.
     * GET /api/orgs/{organization_id}/documents/{document_id}/evaluation/status
     */
    async getEvaluationStatus(
        organizationId: string,
        documentId: string
    ): Promise<EvaluationStatus> {
        const response = await this.retryOnRateLimit(() =>
            this.apiClient.get<EvaluationStatus>(
                `/orgs/${organizationId}/documents/${documentId}/evaluation/status`
            )
        );
        return response.data;
    }

    /**
     * Polls the evaluation statuses for all documents.
     * GET /api/orgs/{organization_id}/documents/evaluation-statuses
     */
    async getEvaluationStatuses(
        organizationId: string
    ): Promise<DocumentEvaluationStatus[]> {
        const response = await this.retryOnRateLimit(() =>
            this.apiClient.get<{ items: DocumentEvaluationStatus[] }>(
                `/orgs/${organizationId}/documents/evaluation-statuses`
            )
        );
        return response.data.items;
    }

    async moveDocumentToProject(
        organizationId: string,
        documentId: string,
        projectId: string
    ): Promise<void> {
        await this.apiClient.patch(
            `/orgs/${organizationId}/documents/${documentId}/project`,
            { project_id: projectId }
        );
    }
}
