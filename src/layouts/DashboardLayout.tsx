import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { Upload, FileText, Search, PanelLeftClose, Menu, LogIn, Trash2, FolderPlus } from "lucide-react"
import { PanelRightClose } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback, useMemo } from "react"
import logoSvg from "@/assets/logo.svg"
import { useAuth, useUser, UserButton, SignInButton } from "@clerk/clerk-react"
import { useApiClient } from "@/hooks/useApiClient"
import { DocumentStorageService, StoredDocument, FolderItem } from "@/lib/documentStorageService"
import { useAppAlert } from "@/hooks/useAppAlert"
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core"
import { useDraggable } from "@dnd-kit/core"
import { SidebarFolder } from "@/components/SidebarFolder"

// Draggable document row component
function DraggableDocRow({
  doc,
  isActive,
  onDeleteDocument,
  onNavClick,
}: {
  doc: StoredDocument
  isActive: (path: string) => boolean
  onDeleteDocument: (docId: string) => void
  onNavClick: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: doc.document_id })
  const docPath = `/dashboard/document/${doc.document_id}`

  return (
    <div
      ref={setNodeRef}
      className={cn("group relative", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <Link to={docPath} onClick={onNavClick}>
        <div
          className={cn(
            "px-3 py-2.5 transition-all duration-200 cursor-pointer rounded-sm overflow-hidden",
            isActive(docPath)
              ? "bg-[hsl(var(--sidebar-active))]"
              : "hover:bg-[hsl(var(--sidebar-hover))]"
          )}
        >
          <div className="flex items-start justify-between gap-2 mb-0.5 overflow-hidden">
            <h3 className="text-sm font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1">
              {doc.title || "Untitled"}
            </h3>
          </div>
          <div className="flex items-center justify-between overflow-hidden">
            <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteDocument(doc.document_id) }}
              title="Delete document"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </Link>
    </div>
  )
}

// Droppable "unfiled" zone at the bottom
function UnfiledDropZone({
  documents,
  isActive,
  onDeleteDocument,
  onNavClick,
}: {
  documents: StoredDocument[]
  isActive: (path: string) => boolean
  onDeleteDocument: (docId: string) => void
  onNavClick: () => void
}) {
  return (
    <div id="unfiled" className="space-y-0.5">
      {documents.map((doc) => (
        <DraggableDocRow
          key={doc.document_id}
          doc={doc}
          isActive={isActive}
          onDeleteDocument={onDeleteDocument}
          onNavClick={onNavClick}
        />
      ))}
    </div>
  )
}

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const { toast, confirm } = useAppAlert()
  const apiClient = useApiClient()
  const storageService = useMemo(() => new DocumentStorageService(apiClient), [apiClient])

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const refreshDocuments = useCallback(() => {
    if (user?.id) {
      storageService.listDocuments(user.id)
        .then(res => setDocuments(res?.items || []))
        .catch(console.error)
    }
  }, [user?.id, storageService])

  const refreshFolders = useCallback(() => {
    if (user?.id) {
      storageService.listFolders(user.id)
        .then(setFolders)
        .catch(console.error)
    }
  }, [user?.id, storageService])

  useEffect(() => {
    refreshDocuments()
    refreshFolders()
  }, [location.pathname, refreshDocuments, refreshFolders])

  useEffect(() => {
    const handleDocumentUpdate = () => {
      refreshDocuments()
      refreshFolders()
    }
    window.addEventListener("documentListUpdated", handleDocumentUpdate)
    return () => window.removeEventListener("documentListUpdated", handleDocumentUpdate)
  }, [refreshDocuments, refreshFolders])

  const isActivePath = (path: string) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") return true
    if (path !== "/dashboard" && location.pathname.startsWith(path)) return true
    return false
  }

  const handleNavClick = () => setIsMobileOpen(false)

  const handleDeleteDocument = async (docId: string) => {
    if (!user?.id) return
    const ok = await confirm({
      title: "Delete this document?",
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    })
    if (!ok) return
    try {
      await storageService.deleteDocument(user.id, docId)
      window.dispatchEvent(new Event("documentListUpdated"))
      toast({ variant: "success", title: "Deleted", description: "Document deleted successfully." })
    } catch {
      toast({ variant: "destructive", title: "Delete failed", description: "Failed to delete document." })
    }
  }

  const handleCreateFolder = async () => {
    if (!user?.id) return
    const name = window.prompt("Folder name:")?.trim()
    if (!name) return
    try {
      await storageService.createFolder(user.id, name)
      refreshFolders()
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not create folder." })
    }
  }

  const handleRenameFolder = async (folderId: string, newName: string) => {
    if (!user?.id) return
    try {
      await storageService.renameFolder(user.id, folderId, newName)
      refreshFolders()
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not rename folder." })
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!user?.id) return
    const ok = await confirm({
      title: "Delete this folder?",
      description: "Documents in the folder will become unfiled.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    })
    if (!ok) return
    try {
      await storageService.deleteFolder(user.id, folderId)
      refreshFolders()
      refreshDocuments()
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not delete folder." })
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over || !user?.id) return
    const docId = active.id as string
    const targetId = over.id as string
    const newFolderId = targetId === "unfiled" ? null : targetId
    try {
      await storageService.moveDocumentToFolder(user.id, docId, newFolderId)
      refreshDocuments()
    } catch {
      toast({ variant: "destructive", title: "Failed", description: "Could not move document." })
    }
  }

  const filteredDocuments = searchQuery
    ? documents.filter(d => (d.title || "").toLowerCase().includes(searchQuery.toLowerCase()))
    : documents

  const unfiledDocuments = filteredDocuments.filter(d => !d.folder_id)
  const activeDragDoc = activeDragId ? documents.find(d => d.document_id === activeDragId) : null

  const documentCount = documents.length

  return (
    <div className="flex h-screen w-full relative">
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "border-r border-slate-300 transition-all duration-300 ease-in-out overflow-hidden",
          "fixed inset-y-0 left-0 z-50 w-[280px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:translate-x-0",
          isCollapsed ? "md:w-[72px]" : "md:w-[280px]"
        )}
        style={{ backgroundColor: "hsl(var(--sidebar-bg))" }}
      >
        <div className={cn(
          "flex flex-col h-full transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-[280px]"
        )}>
          {/* Logo */}
          <div className="p-6 pb-4">
            {!isCollapsed && (
              <div className="flex items-center justify-between">
                <button
                  className="flex-1 hover:opacity-70 transition-opacity h-8 flex items-center"
                  onClick={() => navigate("/")}
                  title="Go to home"
                >
                  <div className="w-full max-w-[160px]">
                    <img src={logoSvg} alt="Logo" className="w-full h-auto object-contain" />
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 ml-2"
                  onClick={() => window.innerWidth < 768 ? setIsMobileOpen(false) : setIsCollapsed(true)}
                  title="Close sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            )}
            {isCollapsed && (
              <div className="flex justify-center">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsCollapsed(false)} title="Open sidebar">
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="h-px bg-border mx-3" />

          <nav className="flex-1 flex flex-col overflow-hidden px-3 py-3 space-y-1">
            {isSignedIn && (
              <Link to="/dashboard" title="Upload Document" onClick={handleNavClick}>
                <div className={cn(
                  "py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center rounded-sm",
                  isCollapsed ? "pl-4" : "pl-3 pr-3 gap-3",
                  isActivePath("/dashboard") ? "bg-[hsl(var(--sidebar-active))]" : "hover:bg-[hsl(var(--sidebar-hover))]"
                )}>
                  <Upload className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Document Management</span>}
                </div>
              </Link>
            )}

            {isSignedIn && (
              <div className="pt-2">
                {/* Documents header row */}
                <div className={cn(
                  "w-full py-2.5 text-sm font-medium flex items-center rounded-sm transition-colors",
                  isCollapsed ? "pl-4" : "pl-3 pr-3 gap-3"
                )}>
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left text-gray-500">Documents</span>
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs flex-shrink-0 text-gray-500">
                        {documentCount}
                      </Badge>
                      <button
                        onClick={handleCreateFolder}
                        className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--sidebar-hover))] transition-colors flex-shrink-0"
                        title="New folder"
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="mt-1 space-y-1">
                    {/* Search */}
                    <div className="relative mb-2 pl-3 pr-3">
                      <Search className="absolute left-6 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-9 bg-[hsl(var(--sidebar-hover))] border-0 focus:border focus:border-slate-300/50 dark:focus:border-slate-600/50 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-xs w-full"
                      />
                    </div>

                    {/* Folders + unfiled documents with drag-drop */}
                    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                      <div className="max-h-[400px] overflow-y-auto space-y-1">
                        {folders.map((folder) => (
                          <SidebarFolder
                            key={folder.id}
                            folderId={folder.id}
                            folderName={folder.name}
                            documents={filteredDocuments.filter(d => d.folder_id === folder.id)}
                            onRename={handleRenameFolder}
                            onDelete={handleDeleteFolder}
                            onDeleteDocument={handleDeleteDocument}
                            isActive={isActivePath}
                            onNavClick={handleNavClick}
                          />
                        ))}

                        {/* Unfiled documents */}
                        <div className="pl-3 space-y-0.5">
                          <UnfiledDropZone
                            documents={unfiledDocuments}
                            isActive={isActivePath}
                            onDeleteDocument={handleDeleteDocument}
                            onNavClick={handleNavClick}
                          />
                        </div>
                      </div>

                      {/* Drag overlay — shows the dragged doc name */}
                      <DragOverlay>
                        {activeDragDoc && (
                          <div className="px-3 py-2 rounded-sm bg-[hsl(var(--sidebar-bg))] border border-slate-300 shadow-lg text-sm font-medium opacity-90">
                            {activeDragDoc.title || "Untitled"}
                          </div>
                        )}
                      </DragOverlay>
                    </DndContext>
                  </div>
                )}
              </div>
            )}

            {!isSignedIn && isLoaded && (
              <Link to="/dashboard/example-1" title="Example Document" onClick={handleNavClick}>
                <div className={cn(
                  "py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center rounded-sm",
                  isCollapsed ? "pl-4" : "pl-3 pr-3 gap-3",
                  isActivePath("/dashboard/example-1") ? "bg-[hsl(var(--sidebar-active))]" : "hover:bg-[hsl(var(--sidebar-hover))]"
                )}>
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Example Document</span>}
                </div>
              </Link>
            )}
          </nav>

          {/* User section */}
          <div className="border-t border-slate-300 p-3">
            {isSignedIn ? (
              <div className={cn("py-2.5 flex items-center", isCollapsed ? "justify-center" : "pl-3 pr-3 gap-3")}>
                <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
                {!isCollapsed && user && (
                  <div className="flex flex-col overflow-hidden min-w-0">
                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {user.fullName || user.firstName || "User"}
                    </span>
                    {user.primaryEmailAddress && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                        {user.primaryEmailAddress.emailAddress}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={cn("py-2.5 flex items-center", isCollapsed ? "pl-4" : "pl-3 pr-3 gap-3")}>
                <SignInButton mode="modal">
                  <button className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity">
                    <LogIn className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">Sign in</span>}
                  </button>
                </SignInButton>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="flex-1 overflow-auto bg-background"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(209, 213, 219, 0.1) 2px, transparent 1px)",
          backgroundSize: "15px 15px",
        }}
      >
        {/* Mobile Header */}
        <div
          className="md:hidden sticky top-0 z-30 border-b border-slate-300"
          style={{ backgroundColor: "hsl(var(--sidebar-bg))" }}
        >
          <div className="p-6 pb-4 flex items-center justify-between">
            <button className="flex-1 hover:opacity-70 transition-opacity h-8 flex items-center" onClick={() => navigate("/")}>
              <div className="w-full max-w-[140px]">
                <img src={logoSvg} alt="Logo" className="w-full h-auto object-contain" />
              </div>
            </button>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 ml-2" onClick={() => setIsMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  )
}
