import { AxiosInstance } from "axios";

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
    folder_id?: string | null;
    created_at: string;
    created_by: string;
    updated_at: string;
    current_version?: DocumentVersion;
}

export interface FolderItem {
    id: string;
    organization_id: string;
    name: string;
    created_at: string;
    created_by: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    limit: number;
    offset: number;
    next_offset: number | null;
}

export interface UploadResponse {
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

export interface ReasoningStep {
    step: number;
    thought: string;
    sections_queried: number[];
    section_titles: string[];
    references_queried: string[];
}

export interface EvaluateTaskResult {
    task: string[];
    exists: boolean;
    explanation: string;
    correctness_score?: number;
    missing_sections?: string[];
    incorrect_sections?: IncorrectSection[];
    reasoning_steps?: ReasoningStep[];
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
    compliance_result: EvaluateTaskResult[] | null;
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
    actorUserId: string;
    file: File;
    documentId?: string;
    title?: string;
    message?: string;
}

export interface ListDocumentsParams {
    limit?: number;
    offset?: number;
}

/**
 * Service class for interacting with the Document Storage API.
 * It takes an authenticated Axios instance (obtained from useApiClient hook).
 */
export class DocumentStorageService {
    constructor(private apiClient: AxiosInstance) { }

    /**
     * Upload a Markdown file to create a new document or add a new version to an existing one.
     * POST /api/documents/upload
     */
    async uploadDocument(params: UploadDocumentParams): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append("organization_id", params.organizationId);
        formData.append("actor_user_id", params.actorUserId);
        formData.append("file", params.file);

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
    ): Promise<{ document_id: string; version_id: string; compliance_result: EvaluateTaskResult[] | null }> {
        const response = await this.apiClient.get<{ document_id: string; version_id: string; compliance_result: EvaluateTaskResult[] | null }>(
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
    async getTemplates(): Promise<{ templates: { id: string; name: string }[] }> {
        const response = await this.apiClient.get<{ templates: { id: string; name: string }[] }>(
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
        const response = await this.apiClient.post<EvaluationJob>(
            `/orgs/${organizationId}/documents/${documentId}/versions/${versionNo}/evaluate`,
            body,
            { params }
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
        const response = await this.apiClient.get<EvaluationStatus>(
            `/orgs/${organizationId}/documents/${documentId}/evaluation/status`
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
        const response = await this.apiClient.get<{ items: DocumentEvaluationStatus[] }>(
            `/orgs/${organizationId}/documents/evaluation-statuses`
        );
        return response.data.items;
    }

    // ------------------------------------------------------------------
    // Folder management
    // ------------------------------------------------------------------

    async listFolders(organizationId: string): Promise<FolderItem[]> {
        const response = await this.apiClient.get<FolderItem[]>(
            `/orgs/${organizationId}/folders`
        );
        return response.data;
    }

    async createFolder(organizationId: string, name: string): Promise<FolderItem> {
        const response = await this.apiClient.post<FolderItem>(
            `/orgs/${organizationId}/folders`,
            { name }
        );
        return response.data;
    }

    async renameFolder(organizationId: string, folderId: string, name: string): Promise<void> {
        await this.apiClient.patch(`/orgs/${organizationId}/folders/${folderId}`, { name });
    }

    async deleteFolder(organizationId: string, folderId: string): Promise<void> {
        await this.apiClient.delete(`/orgs/${organizationId}/folders/${folderId}`);
    }

    async moveDocumentToFolder(
        organizationId: string,
        documentId: string,
        folderId: string | null
    ): Promise<void> {
        await this.apiClient.patch(
            `/orgs/${organizationId}/documents/${documentId}/folder`,
            { folder_id: folderId }
        );
    }
}
