import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { Upload, FileText, Search, PanelLeftClose, Menu, LogIn, Trash2 } from "lucide-react"
import { PanelRightClose } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { mockDocuments, type Document } from "@/lib/mockData"
import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback } from "react"
import logoSvg from "@/assets/logo.svg"
import { useAuth, useUser, UserButton, SignInButton } from "@clerk/clerk-react"

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [documents, setDocuments] = useState<Document[]>(() => [...mockDocuments])
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // Function to refresh documents from the source
  const refreshDocuments = useCallback(() => {
    // Always read the latest state from mockDocuments to ensure we have all documents
    const currentDocuments = [...mockDocuments]
    setDocuments(currentDocuments)
  }, [])

  // Refresh documents list when location changes
  useEffect(() => {
    refreshDocuments()
  }, [location.pathname, refreshDocuments])

  // Listen for document updates
  useEffect(() => {
    const handleDocumentUpdate = () => {
      refreshDocuments()
    }

    window.addEventListener('documentListUpdated', handleDocumentUpdate)
    return () => {
      window.removeEventListener('documentListUpdated', handleDocumentUpdate)
    }
  }, [refreshDocuments])

  const isActive = (path: string) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") {
      return true
    }
    if (path !== "/dashboard" && location.pathname.startsWith(path)) {
      return true
    }
    return false
  }

  const documentCount = documents.length

  // Close mobile sidebar when route changes
  const handleNavClick = () => {
    setIsMobileOpen(false)
  }

  const handleDeleteDocument = (docId: string) => {
    setPendingDeleteId(docId)
  }

  const confirmDeleteDocument = () => {
    if (!pendingDeleteId) return
    // Placeholder: backend delete not wired yet
    setPendingDeleteId(null)
  }

  const cancelDeleteDocument = () => {
    setPendingDeleteId(null)
  }

  return (
    <div className="flex h-screen w-full relative">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container - Fixed width, clipped reveal effect */}
      <aside
        className={cn(
          "border-r border-slate-300 transition-all duration-300 ease-in-out overflow-hidden",
          // Mobile behavior - fixed overlay with slide animation
          "fixed inset-y-0 left-0 z-50 w-[280px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop behavior - transition width to show/hide content
          "md:relative md:translate-x-0",
          isCollapsed ? "md:w-[72px]" : "md:w-[280px]"
        )}
        style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
      >
        {/* Inner content - Width matches parent for proper icon centering */}
        <div className={cn(
          "flex flex-col h-full transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[72px]" : "w-[280px]"
        )}>
          {/* Logo/Brand Header */}
          <div className="p-6 pb-4">
            {!isCollapsed && (
              <div className="flex items-center justify-between">
                <button
                  className="flex-1 hover:opacity-70 transition-opacity h-8 flex items-center"
                  onClick={() => navigate('/')}
                  title="Go to home"
                  aria-label="Go to home"
                >
                  <div className="w-full max-w-[160px]">
                    <img src={logoSvg} alt="Logo" className="w-full h-auto object-contain" />
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 ml-2"
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setIsMobileOpen(false)
                    } else {
                      setIsCollapsed(!isCollapsed)
                    }
                  }}
                  title="Close sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            )}
            {isCollapsed && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => {
                    setIsCollapsed(!isCollapsed)
                  }}
                  title="Open sidebar"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="h-px bg-border mx-3" />

          {/* Navigation */}
          <nav className="flex-1 flex flex-col overflow-hidden px-3 py-3 space-y-1">
            {/* Upload Document - only for authenticated users */}
            {isSignedIn && (
              <Link to="/dashboard" title="Upload Document" onClick={handleNavClick}>
                <div
                  className={cn(
                    "py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center rounded-sm",
                    isCollapsed ? "pl-4" : "pl-3 pr-3 gap-3",
                    isActive("/dashboard")
                      ? "bg-[hsl(var(--sidebar-active))]"
                      : "hover:bg-[hsl(var(--sidebar-hover))]"
                  )}
                >
                  <Upload className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Document Management</span>}
                </div>
              </Link>
            )}

            {/* Documents Section Header - only for authenticated users */}
            {isSignedIn && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (isCollapsed) {
                      setIsCollapsed(false)
                    }
                  }}
                  title="Documents"
                  className={cn(
                    "w-full py-2.5 text-sm font-medium flex items-center rounded-sm transition-colors",
                    isCollapsed ? "pl-4 hover:bg-[hsl(var(--sidebar-hover))] cursor-pointer" : "pl-3 pr-3 gap-3",
                    location.pathname.includes("/dashboard/document/") && "bg-[hsl(var(--sidebar-active))]"
                  )}
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left text-gray-500">Documents</span>
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs flex-shrink-0 text-gray-500">
                        {documentCount}
                      </Badge>
                    </>
                  )}
                </button>

                {/* Documents List - Always visible when expanded */}
                {!isCollapsed && (
                  <div className="mt-1 space-y-0.5">
                    {/* Search */}
                    <div className="relative mb-2 pl-3 pr-3 overflow-hidden">
                      <Search className="absolute left-6 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search documents..."
                        className="pl-8 h-9 bg-[hsl(var(--sidebar-hover))] border-0 focus:border focus:border-slate-300/50 dark:focus:border-slate-600/50 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-xs w-full"
                      />
                    </div>

                    {/* Document List */}
                    <div className="max-h-[400px] overflow-y-auto space-y-0.5 pl-3">
                      {documents.map((doc) => {
                        // Special handling for document 5 to link to example-1
                        const docPath = doc.id === "5" ? "/dashboard/example-1" : `/dashboard/document/${doc.id}`
                        return (
                          <div key={doc.id} className="group relative">
                            <Link to={docPath} onClick={handleNavClick}>
                              <div
                                className={cn(
                                  "px-3 py-2.5 transition-all duration-200 cursor-pointer rounded-sm overflow-hidden",
                                  isActive(docPath)
                                    ? "bg-[hsl(var(--sidebar-active))]"
                                    : "hover:bg-[hsl(var(--sidebar-hover))]"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2 mb-1 overflow-hidden">
                                  <h3 className="text-sm font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                                    {doc.title}
                                  </h3>
                                  {doc.complianceScore !== undefined ? (
                                    <span
                                      className={cn(
                                        "text-xs font-bold flex-shrink-0",
                                        doc.complianceScore >= 90
                                          ? "text-green-600"
                                          : doc.complianceScore >= 75
                                            ? "text-yellow-600"
                                            : "text-red-600"
                                      )}
                                    >
                                      {doc.complianceScore}%
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold flex-shrink-0 text-muted-foreground">
                                      -%
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between overflow-hidden">
                                  <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                                    {new Date(doc.uploadDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {doc.status === "analyzing" && (
                                      <span className="text-xs text-muted-foreground italic whitespace-nowrap flex-shrink-0">
                                        Analyzing...
                                      </span>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleDeleteDocument(doc.id)
                                      }}
                                      title="Delete document"
                                      aria-label="Delete document"
                                    >
                                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Guest sidebar: only show Example Document link */}
            {!isSignedIn && isLoaded && (
              <Link to="/dashboard/example-1" title="Example Document" onClick={handleNavClick}>
                <div
                  className={cn(
                    "py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center rounded-sm",
                    isCollapsed ? "pl-4" : "pl-3 pr-3 gap-3",
                    isActive("/dashboard/example-1")
                      ? "bg-[hsl(var(--sidebar-active))]"
                      : "hover:bg-[hsl(var(--sidebar-hover))]"
                  )}
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Example Document</span>}
                </div>
              </Link>
            )}
          </nav>

          {/* User Section at Bottom */}
          <div className="border-t border-slate-300 p-3">
            {isSignedIn ? (
              <div className={cn(
                "py-2.5 flex items-center",
                isCollapsed ? "justify-center" : "pl-3 pr-3 gap-3"
              )}>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "h-7 w-7",
                    },
                  }}
                />
                {!isCollapsed && user && (
                  <div className="flex flex-col overflow-hidden min-w-0">
                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {user.fullName || user.firstName || 'User'}
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
              <div className={cn(
                "py-2.5 flex items-center",
                isCollapsed ? "pl-4" : "pl-3 pr-3 gap-3"
              )}>
                <SignInButton mode="modal">
                  <button className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity">
                    <LogIn className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">Sign in</span>
                    )}
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
          backgroundImage: 'radial-gradient(circle, rgba(209, 213, 219, 0.1) 2px, transparent 1px)',
          backgroundSize: '15px 15px'
        }}
      >
        {/* Mobile Header */}
        <div
          className="md:hidden sticky top-0 z-30 border-b border-slate-300"
          style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
        >
          <div className="p-6 pb-4 flex items-center justify-between">
            <button
              className="flex-1 hover:opacity-70 transition-opacity h-8 flex items-center"
              onClick={() => navigate('/')}
              title="Go to home"
            >
              <div className="w-full max-w-[140px]">
                <img src={logoSvg} alt="Logo" className="w-full h-auto object-contain" />
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 ml-2"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Outlet />
      </main>

      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-sm border border-slate-300 bg-white px-5 py-4 shadow-lg">
            <p className="text-sm font-semibold text-slate-900 mb-1">
              Delete this document (coming soon)
            </p>
            <p className="text-xs text-slate-700 mb-4">
              The delete action is not yet connected to the backend. For now, this dialog is only a visual preview.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                onClick={cancelDeleteDocument}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDeleteDocument}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
