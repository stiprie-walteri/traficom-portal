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
}

export interface StoredDocument {
    document_id: string;
    organization_id: string;
    title: string;
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
}
