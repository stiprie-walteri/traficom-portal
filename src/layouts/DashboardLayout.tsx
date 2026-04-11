import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  FolderPlus,
  LogIn,
  Menu,
  PanelLeftClose,
  PanelRightClose,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import logoSvg from "@/assets/logo.svg"
import { useAuth, useUser, useOrganization, UserButton, SignInButton } from "@clerk/clerk-react"
import { useApiClient } from "@/hooks/useApiClient"
import { DocumentStorageService, LegislationTemplate, ProjectEvaluationStatus, ProjectItem, StoredDocument, type BatchUploadFailure } from "@/lib/documentStorageService"
import { useAppAlert } from "@/hooks/useAppAlert"
import { UploadChessLoader } from "@/components/ChessLoader"

const MAX_PROJECT_BATCH_FILES = 20
const PROJECT_BATCH_ACCEPTED_EXTENSIONS = [".pdf", ".md", ".markdown"]
const PROJECT_BATCH_ACCEPTED_TYPES = new Set([
  "application/pdf",
  "text/markdown",
  "text/x-markdown",
  "application/x-markdown",
])

function formatProjectEta(secondsRemaining?: number | null, completionAt?: string | null) {
  if (typeof secondsRemaining === "number" && secondsRemaining > 0) {
    const minutes = Math.ceil(secondsRemaining / 60)
    return minutes <= 1 ? "About 1 min left" : `About ${minutes} min left`
  }

  if (completionAt) {
    const date = new Date(completionAt)
    if (!Number.isNaN(date.getTime())) {
      return `ETA ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    }
  }

  return null
}


function getShortProjectStatus(status?: ProjectEvaluationStatus | null) {
  if (!status) return null

  const fromMessage = status.status_message?.replace(/^Running\s+/i, "").trim()
  const fromTask = status.current_task?.[0]?.trim()

  return fromMessage || fromTask || "Preparing project analysis"
}

function getProjectFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function isAcceptedProjectBatchFile(file: File) {
  const lowerName = file.name.toLowerCase()
  return (
    PROJECT_BATCH_ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
    || PROJECT_BATCH_ACCEPTED_TYPES.has(file.type)
  )
}

function summarizeBatchUploadFailures(failedUploads: BatchUploadFailure[]) {
  if (failedUploads.length === 0) return ""

  const [firstFailure] = failedUploads
  if (!firstFailure) return ""

  if (failedUploads.length === 1) {
    return ` 1 file failed: ${firstFailure.filename}. ${firstFailure.error}`
  }

  return ` ${failedUploads.length} files failed. First issue: ${firstFailure.filename}. ${firstFailure.error}`
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const maybeError = error as {
    response?: {
      data?: {
        error?: {
          message?: string
        }
        message?: string
      }
    }
    message?: string
  }

  return maybeError?.response?.data?.error?.message
    || maybeError?.response?.data?.message
    || maybeError?.message
    || fallback
}

export interface DashboardOutletContext {
  organizationId: string | null
  projects: ProjectItem[]
  selectedProjectId: string | null
  setSelectedProjectId: (projectId: string | null) => void
  isWorkspaceLoading: boolean
  openCreateProjectModal: () => void
  refreshWorkspaceData: () => Promise<void>
  projectEvaluationStatuses: Record<string, ProjectEvaluationStatus>
  refreshProjectEvaluationStatuses: () => Promise<void>
  setProjectEvaluationStatus: (projectId: string, status: ProjectEvaluationStatus | null) => void
}

function SidebarDocumentRow({
  doc,
  isActive,
  onDeleteDocument,
  onNavClick,
  disabled = false,
}: {
  doc: StoredDocument
  isActive: (path: string) => boolean
  onDeleteDocument: (docId: string) => void
  onNavClick: () => void
  disabled?: boolean
}) {
  const docPath = `/dashboard/document/${doc.document_id}`

  return (
    <Link
      to={disabled ? "#" : docPath}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault()
          return
        }
        onNavClick()
      }}
      aria-disabled={disabled}
      className={disabled ? "pointer-events-none opacity-60" : undefined}
    >
      <div
        className={cn(
          "group flex items-start gap-2 rounded-md px-2 py-2 transition-colors",
          isActive(docPath)
            ? "bg-[hsl(var(--sidebar-active))]"
            : "hover:bg-[hsl(var(--sidebar-hover))]"
        )}
      >
        <FileText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{doc.title || "Untitled"}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-0 transition-opacity group-hover:opacity-100"
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDeleteDocument(doc.document_id)
          }}
          title="Delete document"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    </Link>
  )
}

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const { organization } = useOrganization()
  const { toast, confirm } = useAppAlert()
  const apiClient = useApiClient()
  const storageService = useMemo(() => new DocumentStorageService(apiClient), [apiClient])

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [legislationTemplates, setLegislationTemplates] = useState<LegislationTemplate[]>([])
  const [selectedLegislationIds, setSelectedLegislationIds] = useState<string[]>([])
  const [newProjectFiles, setNewProjectFiles] = useState<File[]>([])
  const [createAndRunAnalysis, setCreateAndRunAnalysis] = useState(true)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [createProjectStage, setCreateProjectStage] = useState<string | null>(null)

  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(null)
  const [projectUploadState, setProjectUploadState] = useState<{
    projectId: string
    projectName: string
    fileName: string
  } | null>(null)
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true)
  const [projectEvaluationStatuses, setProjectEvaluationStatuses] = useState<Record<string, ProjectEvaluationStatus>>({})
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const createProjectUploadInputRef = useRef<HTMLInputElement>(null)

  const resetCreateProjectFiles = () => {
    setNewProjectFiles([])
    if (createProjectUploadInputRef.current) {
      createProjectUploadInputRef.current.value = ""
    }
  }

  const refreshWorkspaceData = useCallback(async () => {
    if (!isSignedIn) {
      setOrganizationId(null)
      setProjects([])
      setDocuments([])
      setIsWorkspaceLoading(false)
      return
    }

    setIsWorkspaceLoading(true)
    try {
      const me = await storageService.getMe()
      setOrganizationId(me.organization_id)

      const [projectItems, documentItems] = await Promise.all([
        storageService.listProjects(me.organization_id),
        storageService.listDocuments(me.organization_id),
      ])

      setProjects(Array.isArray(projectItems) ? projectItems : [])
      setDocuments(Array.isArray(documentItems?.items) ? documentItems.items : [])

      setExpandedProjects((prev) => {
        const next = { ...prev }
        for (const project of projectItems) {
          if (next[project.project_id] === undefined) {
            next[project.project_id] = true
          }
        }
        return next
      })

      setSelectedProjectId((prev) => {
        if (prev && projectItems.some((project) => project.project_id === prev)) {
          return prev
        }
        return projectItems[0]?.project_id ?? null
      })
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 403) {
        navigate("/no-organization")
        return
      }
      console.error(error)
      setProjects([])
      setDocuments([])
      toast({
        variant: "destructive",
        title: "Workspace unavailable",
        description: "Could not load projects and documents.",
      })
    } finally {
      setIsWorkspaceLoading(false)
    }
  }, [isSignedIn, storageService, toast, navigate])

  useEffect(() => {
    void refreshWorkspaceData()
  }, [refreshWorkspaceData])

  useEffect(() => {
    const handleDocumentUpdate = () => {
      void refreshWorkspaceData()
    }

    window.addEventListener("documentListUpdated", handleDocumentUpdate)
    return () => window.removeEventListener("documentListUpdated", handleDocumentUpdate)
  }, [refreshWorkspaceData])

  useEffect(() => {
    if (!isSignedIn) return

    storageService.getTemplates()
      .then((response) => setLegislationTemplates(response.templates || []))
      .catch((error) => {
        console.error(error)
        setLegislationTemplates([])
      })
  }, [isSignedIn, storageService])

  const refreshProjectEvaluationStatuses = useCallback(async () => {
    if (!organizationId || projects.length === 0) {
      setProjectEvaluationStatuses({})
      return
    }

    const entries = await Promise.all(
      projects.map(async (project) => {
        try {
          const status = await storageService.getProjectEvaluationStatus(organizationId, project.project_id)
          return [project.project_id, status] as const
        } catch {
          return [project.project_id, null] as const
        }
      })
    )

    setProjectEvaluationStatuses((prev) => {
      const next: Record<string, ProjectEvaluationStatus> = {}

      for (const project of projects) {
        const match = entries.find((entry) => entry?.[0] === project.project_id)
        if (match?.[1]) {
          next[project.project_id] = match[1]
        } else if (prev[project.project_id]) {
          next[project.project_id] = prev[project.project_id]
        }
      }

      return next
    })
  }, [organizationId, projects, storageService])

  const setProjectEvaluationStatus = useCallback((projectId: string, status: ProjectEvaluationStatus | null) => {
    setProjectEvaluationStatuses((prev) => {
      if (!status) {
        const next = { ...prev }
        delete next[projectId]
        return next
      }

      return {
        ...prev,
        [projectId]: status,
      }
    })
  }, [])

  useEffect(() => {
    void refreshProjectEvaluationStatuses()
  }, [refreshProjectEvaluationStatuses])

  useEffect(() => {
    const runningProjects = Object.values(projectEvaluationStatuses).filter((status) => status.status === "running")
    if (runningProjects.length === 0) return

    const timeout = window.setTimeout(() => {
      void refreshProjectEvaluationStatuses()
    }, 4000)

    return () => window.clearTimeout(timeout)
  }, [projectEvaluationStatuses, refreshProjectEvaluationStatuses])

  const isActivePath = (path: string) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") return true
    if (path !== "/dashboard" && location.pathname.startsWith(path)) return true
    return false
  }

  const handleNavClick = () => setIsMobileOpen(false)

  const handleDeleteDocument = async (docId: string) => {
    if (!organizationId) return

    const ok = await confirm({
      title: "Delete this document?",
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    })

    if (!ok) return

    try {
      await storageService.deleteDocument(organizationId, docId)
      window.dispatchEvent(new Event("documentListUpdated"))
      toast({ variant: "success", title: "Deleted", description: "Document deleted successfully." })
    } catch {
      toast({ variant: "destructive", title: "Delete failed", description: "Failed to delete document." })
    }
  }

  const handleCreateProject = async () => {
    const name = newProjectName.trim()
    const templateIds = [...selectedLegislationIds]
    const filesToUpload = [...newProjectFiles]
    if (!organizationId || !name || templateIds.length === 0) return

    if (filesToUpload.length > MAX_PROJECT_BATCH_FILES) {
      toast({
        variant: "warning",
        title: "Too many files",
        description: `Upload up to ${MAX_PROJECT_BATCH_FILES} files in a single batch.`,
      })
      return
    }

    setIsCreatingProject(true)
    try {
      setCreateProjectStage("Creating project workspace...")
      const project = await storageService.createProject(organizationId, {
        name,
        description: newProjectDescription.trim() || undefined,
        legislation_template_ids: templateIds,
      })

      let uploadedCount = 0
      let failedUploads: BatchUploadFailure[] = []

      if (filesToUpload.length > 0) {
        setCreateProjectStage(`Uploading ${filesToUpload.length} document(s)...`)
        const batchUpload = await storageService.uploadBatchDocuments({
          organizationId,
          projectId: project.project_id,
          files: filesToUpload,
        })

        uploadedCount = batchUpload.documents.length
        failedUploads = batchUpload.failed || []
      }

      const shouldRunAnalysis = createAndRunAnalysis && (filesToUpload.length === 0 || uploadedCount > 0)

      if (createAndRunAnalysis && !shouldRunAnalysis) {
        setCreateProjectStage("No documents uploaded successfully, so analysis was skipped.")
      }

      if (shouldRunAnalysis) {
        setCreateProjectStage("Starting full project analysis...")
        await storageService.startProjectEvaluation(
          organizationId,
          project.project_id,
          templateIds
        )

        setSelectedProjectId(project.project_id)
        setExpandedProjects((prev) => ({ ...prev, [project.project_id]: true }))
        await refreshWorkspaceData()

        const finalStatus = await storageService.waitForProjectEvaluationCompletion(
          organizationId,
          project.project_id,
          {
            intervalMs: 3500,
            onProgress: (status) => {

              setCreateProjectStage(
                getShortProjectStatus(status)
                || `Running project analysis (${status.completed_count}/${status.total_tasks || 1})...`
                )
              setProjectEvaluationStatus(project.project_id, status)
            },
            onTransientError: (message, lastStatus) => {
              if (!lastStatus) return


              setCreateProjectStage(message)
              setProjectEvaluationStatus(project.project_id, {
                ...lastStatus,
                status: "running",
                status_message: message,
              })
            },
          }
        )

        if (finalStatus.status === "failed") {
          throw new Error(finalStatus.error || "Project analysis failed")
        }
      }

      setNewProjectName("")
      setNewProjectDescription("")
      setSelectedLegislationIds([])
      setCreateAndRunAnalysis(true)
      resetCreateProjectFiles()
      setIsCreateProjectOpen(false)
      setSelectedProjectId(project.project_id)
      setExpandedProjects((prev) => ({ ...prev, [project.project_id]: true }))
      window.dispatchEvent(new Event("documentListUpdated"))
      await refreshWorkspaceData()
      await refreshProjectEvaluationStatuses()
      navigate(`/dashboard/project/${project.project_id}`)
      toast({
        variant: failedUploads.length > 0 ? "warning" : "success",
        title: failedUploads.length > 0 ? "Project created with upload issues" : "Project created",
        description: shouldRunAnalysis
          ? failedUploads.length > 0
            ? `${project.name} is ready, ${uploadedCount} document(s) uploaded, and the full project analysis completed.${summarizeBatchUploadFailures(failedUploads)}`
            : `${project.name} is ready and the full project analysis has completed.`
          : filesToUpload.length > 0
            ? failedUploads.length > 0
              ? uploadedCount > 0
                ? `${project.name} is ready and ${uploadedCount} document(s) were uploaded.${summarizeBatchUploadFailures(failedUploads)}`
                : `${project.name} was created, but no documents uploaded successfully.${summarizeBatchUploadFailures(failedUploads)}`
              : `${project.name} is ready and ${uploadedCount} document(s) were uploaded.`
            : `${project.name} is ready.`,
      })
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Create failed",
        description: getApiErrorMessage(error, createAndRunAnalysis
          ? "Could not finish the full project setup and analysis."
          : "Could not create project."),
      })
    } finally {
      setIsCreatingProject(false)
      setCreateProjectStage(null)
    }
  }

  const handleDeleteProject = async (project: ProjectItem) => {
    if (!organizationId) return

    const ok = await confirm({
      title: `Delete ${project.name}?`,
      description: "Delete is blocked while the project still contains documents.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    })

    if (!ok) return

    try {
      await storageService.deleteProject(organizationId, project.project_id)
      await refreshWorkspaceData()
      toast({ variant: "success", title: "Project deleted", description: `${project.name} was removed.` })
    } catch {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Project could not be deleted. It may still contain documents.",
      })
    }
  }

  const handleProjectUploadClick = (projectId: string) => {
    setSelectedProjectId(projectId)
    setUploadingProjectId(projectId)
    uploadInputRef.current?.click()
  }

  const handleUploadForProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const projectId = uploadingProjectId

    if (!file || !projectId || !organizationId) return

    const project = projects.find((item) => item.project_id === projectId)
    if (!project) return

    setProjectUploadState({
      projectId,
      projectName: project.name || "Untitled project",
      fileName: file.name,
    })

    try {
      const upload = await storageService.uploadDocument({
        organizationId,
        projectId,
        file,
        title: file.name.replace(/\.[^/.]+$/, ""),
      })

      window.dispatchEvent(new Event("documentListUpdated"))
      navigate(`/dashboard/document/${upload.document_id}`)
      toast({ variant: "success", title: "Uploaded", description: "Document added to the project." })
    } catch {
      toast({ variant: "destructive", title: "Upload failed", description: "Could not upload the document." })
    } finally {
      event.target.value = ""
      setUploadingProjectId(null)
      setProjectUploadState(null)
    }
  }

  const filteredProjects = projects
    .map((project) => {
      const docsForProject = documents.filter((doc) => doc.project_id === project.project_id)
      const matchingDocs = searchQuery
        ? docsForProject.filter((doc) => (doc.title || "").toLowerCase().includes(searchQuery.toLowerCase()))
        : docsForProject
      const projectMatches = (project.name || "").toLowerCase().includes(searchQuery.toLowerCase())

      if (searchQuery && !projectMatches && matchingDocs.length === 0) {
        return null
      }

      return {
        project,
        documents: projectMatches && searchQuery ? docsForProject : matchingDocs,
      }
    })
    .filter((item): item is { project: ProjectItem; documents: StoredDocument[] } => Boolean(item))

  const totalDocumentCount = documents.length

  const toggleLegislationTemplate = (templateId: string) => {
    setSelectedLegislationIds((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    )
  }

  const handleNewProjectFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ""

    if (selectedFiles.length === 0) return

    const acceptedFiles = selectedFiles.filter(isAcceptedProjectBatchFile)
    const invalidFileCount = selectedFiles.length - acceptedFiles.length
    const seenFiles = new Set(newProjectFiles.map(getProjectFileKey))
    const uniqueNewFiles = acceptedFiles.filter((file) => {
      const key = getProjectFileKey(file)
      if (seenFiles.has(key)) return false
      seenFiles.add(key)
      return true
    })
    const mergedFiles = [...newProjectFiles, ...uniqueNewFiles]
    const overflowCount = Math.max(0, mergedFiles.length - MAX_PROJECT_BATCH_FILES)

    setNewProjectFiles(mergedFiles.slice(0, MAX_PROJECT_BATCH_FILES))

    if (invalidFileCount > 0) {
      toast({
        variant: "warning",
        title: "Some files were skipped",
        description: "Only PDF or Markdown files can be added to a project.",
      })
    }

    if (overflowCount > 0) {
      toast({
        variant: "warning",
        title: "File limit reached",
        description: `${overflowCount} file(s) were not added. A batch can contain up to ${MAX_PROJECT_BATCH_FILES} files.`,
      })
    }
  }



  return (
    <div className="relative flex h-screen w-full">
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {isCreateProjectOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {isCreatingProject ? (
              <div className="overflow-y-auto p-4 sm:p-6">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-10 shadow-lg backdrop-blur-md">
                  <h2 className="text-xl font-semibold text-center mb-2">Setting up project</h2>
                  <p className="text-center text-muted-foreground text-sm mb-8">
                    {createAndRunAnalysis
                      ? "Creating the project, uploading documents, and waiting for the full project analysis to finish."
                      : "Creating the project and uploading the selected documents."}
                  </p>
                  <UploadChessLoader
                    duration={8}
                    statusText={createProjectStage || "Preparing project workspace"}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">New Project</p>
                      <h2 className="mt-1 text-xl font-semibold text-foreground">Create a project</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Choose the legislation templates this project should be checked against.</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        if (!isCreatingProject) {
                          setIsCreateProjectOpen(false)
                          setCreateAndRunAnalysis(true)
                          resetCreateProjectFiles()
                        }
                      }}
                      title="Close"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Project name</label>
                      <Input
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="e.g. Nexus MiCA Review"
                        className="bg-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Description</label>
                      <textarea
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        placeholder="e.g. Programme of operations review"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Legislation templates</label>
                      <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        {legislationTemplates.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No legislation templates available.</p>
                        ) : (
                          legislationTemplates.map((template) => {
                            const checked = selectedLegislationIds.includes(template.id)
                            return (
                              <label
                                key={template.id}
                                className={cn(
                                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
                                  checked ? "border-slate-400 bg-white" : "border-slate-200 bg-white/80 hover:border-slate-300"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleLegislationTemplate(template.id)}
                                  className="mt-1 h-4 w-4 rounded border-slate-300"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">{template.name}</p>
                                  <p className="mt-1 break-all text-xs text-muted-foreground">{template.id}</p>
                                </div>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </div>

                    <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-medium text-foreground">Run full project analysis after creation</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Start the complete project-wide AI check immediately after the project and documents are created.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCreateAndRunAnalysis((prev) => !prev)}
                        className={cn(
                          "relative h-7 w-12 shrink-0 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
                          createAndRunAnalysis
                            ? "border-slate-900 bg-slate-950"
                            : "border-slate-300 bg-slate-200"
                        )}
                        aria-pressed={createAndRunAnalysis}
                        aria-label="Run full project analysis after creation"
                      >
                        <span
                          className={cn(
                            "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all duration-200",
                            createAndRunAnalysis
                              ? "left-6"
                              : "left-1"
                          )}
                        />
                      </button>
                    </label>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="block text-sm font-medium">Documents</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => createProjectUploadInputRef.current?.click()}
                          disabled={isCreatingProject}
                        >
                          <FilePlus2 className="h-4 w-4" />
                          Add files
                        </Button>
                      </div>
                      <input
                        ref={createProjectUploadInputRef}
                        type="file"
                        accept=".pdf,.md,.markdown,application/pdf,text/markdown"
                        multiple
                        className="hidden"
                        onChange={handleNewProjectFilesSelected}
                      />
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        {newProjectFiles.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No documents selected yet. You can upload up to 20 PDF or Markdown files at once.</p>
                        ) : (
                          <div className="space-y-2">
                            {newProjectFiles.map((file) => (
                              <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() =>
                                    setNewProjectFiles((prev) =>
                                      prev.filter((candidate) => candidate !== file)
                                    )
                                  }
                                  disabled={isCreatingProject}
                                  title="Remove file"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-4 sm:px-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateProjectOpen(false)
                        setCreateAndRunAnalysis(true)
                        resetCreateProjectFiles()
                      }}
                      disabled={isCreatingProject}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => void handleCreateProject()}
                      disabled={!newProjectName.trim() || selectedLegislationIds.length === 0 || isCreatingProject}
                    >
                      Create Project
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {projectUploadState && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="overflow-y-auto p-4 sm:p-6">
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-10 shadow-lg backdrop-blur-md">
                <h2 className="text-xl font-semibold text-center mb-2">Uploading document</h2>
                <p className="text-center text-muted-foreground text-sm mb-8">
                  Adding {projectUploadState.fileName} to {projectUploadState.projectName}.
                </p>
                <UploadChessLoader
                  duration={3}
                  statusText="Preparing document for this project"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 overflow-hidden border-r border-slate-300 transition-all duration-300 ease-in-out",
          "w-[320px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:translate-x-0",
          isCollapsed ? "md:w-[76px]" : "md:w-[320px]"
        )}
        style={{ backgroundColor: "hsl(var(--sidebar-bg))" }}
      >
        <div className={cn("flex h-full flex-col transition-all duration-300 ease-in-out", isCollapsed ? "w-[76px]" : "w-[320px]")}>
          <div className="p-6 pb-4">
            {!isCollapsed ? (
              <div className="flex items-center justify-between">
                <button
                  className="flex h-8 flex-1 items-center transition-opacity hover:opacity-70"
                  onClick={() => navigate("/")}
                  title="Go to home"
                >
                  <div className="w-full max-w-[160px]">
                    <img src={logoSvg} alt="Logo" className="h-auto w-full object-contain" />
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 h-8 w-8 flex-shrink-0"
                  onClick={() => (window.innerWidth < 768 ? setIsMobileOpen(false) : setIsCollapsed(true))}
                  title="Close sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex justify-center">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsCollapsed(false)} title="Open sidebar">
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="mx-3 h-px bg-border" />

          <nav className="flex flex-1 flex-col overflow-hidden px-3 py-3">
            {isSignedIn && !isCollapsed && (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200/80 bg-white/65 p-3 shadow-sm backdrop-blur-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
                      <h2 className="text-sm font-semibold text-foreground">Projects</h2>
                    </div>
                    <Badge variant="secondary" className="h-6 rounded-full px-2.5 text-xs">
                      {totalDocumentCount} docs
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg bg-white/70 px-3 py-2 text-sm text-muted-foreground">
                      Create a project, choose legislation, then upload documents into it.
                    </div>
                    <Button
                      className="h-9 rounded-lg px-3"
                      onClick={() => setIsCreateProjectOpen(true)}
                      title="Create project"
                    >
                      <FolderPlus className="h-4 w-4" />
                      New
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects or documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 rounded-xl border-0 bg-[hsl(var(--sidebar-hover))] pl-9 shadow-none"
                  />
                </div>
              </div>
            )}

            {isSignedIn && isCollapsed && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <Badge variant="secondary" className="rounded-full px-2 py-1 text-[10px]">
                  {projects.length}
                </Badge>
              </div>
            )}

            {isSignedIn && !isCollapsed && (
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-2">
                  {isWorkspaceLoading && (
                    <div className="rounded-xl border border-slate-200 bg-white/60 px-4 py-6 text-center text-sm text-muted-foreground">
                      Loading workspace...
                    </div>
                  )}

                  {!isWorkspaceLoading && filteredProjects.map(({ project, documents: projectDocuments }) => {
                    const isExpanded = expandedProjects[project.project_id] ?? true
                    const isSelected = selectedProjectId === project.project_id
                    const evaluationStatus = projectEvaluationStatuses[project.project_id]
                    const isRunning = evaluationStatus?.status === "running"
                    const isUploading = projectUploadState?.projectId === project.project_id
                    const shortStatus = getShortProjectStatus(evaluationStatus)
                    const etaLabel = formatProjectEta(
                      evaluationStatus?.estimated_seconds_remaining,
                      evaluationStatus?.estimated_completion_at
                    )

                    return (
                      <div
                        key={project.project_id}
                        className={cn(
                          "overflow-hidden rounded-xl border transition-colors",
                          isSelected
                            ? "border-slate-300 bg-white/75 shadow-sm"
                            : "border-transparent bg-transparent hover:border-slate-200/70 hover:bg-white/50"
                        )}
                      >
                        <div className="flex items-start gap-2 px-3 py-3">
                          <button
                            className="mt-0.5 text-muted-foreground"
                            disabled={isRunning}
                            onClick={() =>
                              setExpandedProjects((prev) => ({
                                ...prev,
                                [project.project_id]: !isExpanded,
                              }))
                            }
                            title={isExpanded ? "Collapse project" : "Expand project"}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>

                          <button
                            className="min-w-0 flex-1 text-left"
                            disabled={isRunning}
                            onClick={() => {
                              setSelectedProjectId(project.project_id)
                              setExpandedProjects((prev) => ({ ...prev, [project.project_id]: true }))
                              navigate(`/dashboard/project/${project.project_id}`)
                              handleNavClick()
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold">{project.name || "Untitled project"}</p>
                              <Badge variant="secondary" className="rounded-full px-2 text-[11px]">
                                {documents.filter((doc) => doc.project_id === project.project_id).length}
                              </Badge>
                            </div>
                            {project.description ? (
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
                            ) : (
                              <p className="mt-1 text-xs text-muted-foreground">Project folder for related submission documents.</p>
                            )}
                            {isUploading ? (
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span className="truncate">Uploading document...</span>
                                  <span>Processing</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-200">
                                  <div className="h-1.5 w-1/3 rounded-full bg-primary animate-pulse" />
                                </div>
                                <p className="truncate text-[10px] text-muted-foreground">
                                  {projectUploadState.fileName}
                                </p>
                              </div>
                            ) : isRunning && (
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span className="truncate">{shortStatus}</span>
                                  <span>{evaluationStatus.completed_count} / {evaluationStatus.total_tasks || 1}</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-200">
                                  <div
                                    className="h-1.5 rounded-full bg-primary transition-all duration-500"
                                    style={{ width: `${Math.max(6, evaluationStatus.progress_percent ?? ((evaluationStatus.completed_count / (evaluationStatus.total_tasks || 1)) * 100))}%` }}
                                  />
                                </div>
                                {(etaLabel || evaluationStatus.current_task?.length) && (
                                  <p className="truncate text-[10px] text-muted-foreground">
                                    {etaLabel || evaluationStatus.current_task?.join(" / ")}
                                  </p>
                                )}
                              </div>
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-lg"
                              onClick={() => handleProjectUploadClick(project.project_id)}
                              title="Upload document to project"
                              disabled={isRunning || isUploading || !!projectUploadState}
                            >
                              <FilePlus2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-lg"
                              onClick={() => void handleDeleteProject(project)}
                              title="Delete project"
                              disabled={isRunning || isUploading || !!projectUploadState}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-200/80 bg-white/40 px-3 py-2">
                            {projectDocuments.length > 0 ? (
                              <div className="space-y-1">
                                {projectDocuments.map((doc) => (
                                  <SidebarDocumentRow
                                    key={doc.document_id}
                                    doc={doc}
                                    isActive={isActivePath}
                                    onDeleteDocument={handleDeleteDocument}
                                    onNavClick={handleNavClick}
                                    disabled={isRunning || isUploading}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-muted-foreground">
                                No documents in this project yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {!isWorkspaceLoading && filteredProjects.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 px-4 py-6 text-center text-sm text-muted-foreground">
                      {projects.length === 0 ? "Create your first project to start grouping documents." : "No matching projects or documents."}
                    </div>
                  )}
                </div>
              </div>
            )}

          </nav>

          <div className="border-t border-slate-300 p-3">
            {isSignedIn ? (
              <div className={cn("flex items-center py-2.5", isCollapsed ? "justify-center" : "gap-3 pl-3 pr-3")}>
                <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
                {!isCollapsed && user && (
                  <div className="min-w-0 flex flex-col overflow-hidden">
                    {organization && (
                      <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground overflow-hidden text-ellipsis mb-0.5">
                        {organization.name}
                      </span>
                    )}
                    <span className="whitespace-nowrap text-sm font-medium overflow-hidden text-ellipsis">
                      {user.fullName || user.firstName || "User"}
                    </span>
                    {user.primaryEmailAddress && (
                      <span className="whitespace-nowrap text-xs text-muted-foreground overflow-hidden text-ellipsis">
                        {user.primaryEmailAddress.emailAddress}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={cn("flex items-center py-2.5", isCollapsed ? "pl-4" : "gap-3 pl-3 pr-3")}>
                <SignInButton mode="modal">
                  <button className="flex w-full items-center gap-3 transition-opacity hover:opacity-80">
                    <LogIn className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span className="whitespace-nowrap text-sm font-medium overflow-hidden text-ellipsis">Sign in</span>}
                  </button>
                </SignInButton>
              </div>
            )}
          </div>
        </div>

        <input
          ref={uploadInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => void handleUploadForProject(e)}
        />
      </aside>

      <main
        className="flex-1 overflow-auto bg-background"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(209, 213, 219, 0.1) 2px, transparent 1px)",
          backgroundSize: "15px 15px",
        }}
      >
        <div
          className="sticky top-0 z-30 border-b border-slate-300 md:hidden"
          style={{ backgroundColor: "hsl(var(--sidebar-bg))" }}
        >
          <div className="flex items-center justify-between p-6 pb-4">
            <button className="flex h-8 flex-1 items-center transition-opacity hover:opacity-70" onClick={() => navigate("/")}>
              <div className="w-full max-w-[140px]">
                <img src={logoSvg} alt="Logo" className="h-auto w-full object-contain" />
              </div>
            </button>
            <Button variant="ghost" size="icon" className="ml-2 h-8 w-8 flex-shrink-0" onClick={() => setIsMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Outlet
          context={{
            organizationId,
            projects,
            selectedProjectId,
            setSelectedProjectId,
            isWorkspaceLoading,
            openCreateProjectModal: () => setIsCreateProjectOpen(true),
            refreshWorkspaceData,
            projectEvaluationStatuses,
            refreshProjectEvaluationStatuses,
            setProjectEvaluationStatus,
          } satisfies DashboardOutletContext}
        />
      </main>
    </div>
  )
}
