import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { Home, Upload, FileText, Search, PanelLeftClose, PanelRightClose, User, Menu, BookOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { mockDocuments } from "@/lib/mockData"
import { cn } from "@/lib/utils"
import { useState } from "react"
import logoPng from "@/assets/logo.png"

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") {
      return true
    }
    if (path !== "/dashboard" && location.pathname.startsWith(path)) {
      return true
    }
    return false
  }

  const documentCount = mockDocuments.length

  // Close mobile sidebar when route changes
  const handleNavClick = () => {
    setIsMobileOpen(false)
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
            <div className={cn("flex items-center overflow-hidden", isCollapsed ? "justify-start" : "justify-between")}>
              {!isCollapsed && (
                <button
                  className="flex-shrink-0 hover:opacity-70 transition-opacity"
                  onClick={() => navigate('/')}
                  title="Go to home"
                  aria-label="Go to home"
                >
                  <img src={logoPng} alt="Logo" className="h-6 w-6 object-contain" />
                </button>
              )}
              {!isCollapsed && (
                <button
                  className="text-xl font-bold whitespace-nowrap overflow-hidden text-ellipsis ml-2 hover:opacity-70 transition-opacity flex-1 text-left"
                  onClick={() => navigate('/')}
                  title="Go to home"
                >
                  Checkmate
                </button>
              )}
              {!isCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
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
              )}
              {isCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 justify-start"
                  onClick={() => {
                    setIsCollapsed(!isCollapsed)
                  }}
                  title="Open sidebar"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="h-px bg-border mx-3" />

          {/* Navigation */}
          <nav className="flex-1 flex flex-col overflow-hidden px-3 py-3 space-y-1">
            <Link to="/dashboard" title="Home" onClick={handleNavClick}>
              <div
                className={cn(
                  "pl-3 pr-3 py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center gap-3 rounded-sm",
                  isActive("/dashboard")
                    ? "bg-[hsl(var(--sidebar-active))]"
                    : "hover:bg-[hsl(var(--sidebar-hover))]"
                )}
              >
                <Home className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Home</span>}
              </div>
            </Link>
            
            <Link to="/dashboard/upload" title="Upload Document" onClick={handleNavClick}>
              <div
                className={cn(
                  "pl-3 pr-3 py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center gap-3 rounded-sm",
                  isActive("/dashboard/upload")
                    ? "bg-[hsl(var(--sidebar-active))]"
                    : "hover:bg-[hsl(var(--sidebar-hover))]"
                )}
              >
                <Upload className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Upload Document</span>}
              </div>
            </Link>

            <Link to="/dashboard/example-1" title="Example Document" onClick={handleNavClick}>
              <div
                className={cn(
                  "pl-3 pr-3 py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center gap-3 rounded-sm",
                  isActive("/dashboard/example-1")
                    ? "bg-[hsl(var(--sidebar-active))]"
                    : "hover:bg-[hsl(var(--sidebar-hover))]"
                )}
              >
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Example Document</span>}
              </div>
            </Link>

            {/* Documents Section Header */}
            <div className="pt-2">
              <button
                onClick={() => {
                  if (isCollapsed) {
                    setIsCollapsed(false)
                  }
                }}
                title="Documents"
                className={cn(
                  "w-full pl-3 pr-3 py-2.5 text-sm font-medium flex items-center gap-3 rounded-sm",
                  isCollapsed && "hover:bg-[hsl(var(--sidebar-hover))] cursor-pointer transition-colors",
                  location.pathname.includes("/dashboard/document/") && "bg-[hsl(var(--sidebar-active))]"
                )}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left">Documents</span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs flex-shrink-0">
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
                      className="pl-8 h-9 bg-[hsl(var(--sidebar-hover))] border-0 text-sm placeholder:text-xs w-full"
                    />
                  </div>

                  {/* Document List */}
                  <div className="max-h-[400px] overflow-y-auto space-y-0.5 pl-3">
                    {mockDocuments.map((doc) => (
                      <Link key={doc.id} to={`/dashboard/document/${doc.id}`} onClick={handleNavClick}>
                        <div
                          className={cn(
                            "px-3 py-2.5 transition-all duration-200 cursor-pointer rounded-sm overflow-hidden",
                            isActive(`/dashboard/document/${doc.id}`)
                              ? "bg-[hsl(var(--sidebar-active))]"
                              : "hover:bg-[hsl(var(--sidebar-hover))]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1 overflow-hidden">
                            <h3 className="text-sm font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                              {doc.title}
                            </h3>
                            {doc.status === "analyzed" && doc.complianceScore && (
                              <span
                                className={cn(
                                  "text-xs font-bold flex-shrink-0",
                                  doc.complianceScore >= 90
                                    ? "text-green-600"
                                    : doc.complianceScore >= 75
                                    ? "text-blue-600"
                                    : "text-red-600"
                                )}
                              >
                                {doc.complianceScore}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between overflow-hidden">
                            <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                              {new Date(doc.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            {doc.status === "analyzing" && (
                              <span className="text-xs text-muted-foreground italic whitespace-nowrap flex-shrink-0">
                                Analyzing...
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* User Section at Bottom */}
          <div className="border-t border-slate-300 p-3">
            <div className="pl-3 pr-3 py-2.5 flex items-center gap-3">
              <User className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden min-w-0">
                  <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">Guest user</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-background">
            {/* Mobile Header */}
            <div 
              className="md:hidden sticky top-0 z-30 border-b border-slate-300"
              style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
            >
              <div className="p-6 pb-4 flex items-center justify-between">
                <button
                  className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                  onClick={() => navigate('/')}
                  title="Go to home"
                >
                  <div className="h-6 w-6 flex-shrink-0">
                    <img src={logoPng} alt="Logo" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-xl font-bold">Checkmate</span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => setIsMobileOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <Outlet />
          </main>
        </div>
      )
    }
