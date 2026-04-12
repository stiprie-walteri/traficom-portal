import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { ChevronDown, FileText, FolderOpen, Menu, PanelLeftClose, PanelRightClose, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"
import logoSvg from "@/assets/logo.svg"
import { useUser } from "@clerk/clerk-react"

const DEMO_PROJECT_PATH = "/demo/project/jet-support"
const DEMO_DOCUMENT_PATH = "/demo/document/jet-support"

export function DemoLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { isSignedIn } = useUser()

  const isActivePath = (path: string) => {
    if (path === "/demo" && location.pathname === "/demo") return true
    if (path !== "/demo" && location.pathname.startsWith(path)) return true
    return false
  }

  const handleNavClick = () => setIsMobileOpen(false)

  return (
    <div className="relative flex h-screen w-full">
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
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

          <nav className="flex flex-1 flex-col overflow-hidden px-3 py-4">
            {!isCollapsed ? (
              <div className="rounded-xl border border-slate-200/80 bg-white/65 p-3 shadow-sm backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Demo Portal</p>
                <h2 className="mt-1 text-sm font-semibold text-foreground">Jet Support Project</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Static demo workspace. Changes in the main user portal do not affect this area.
                </p>
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {!isCollapsed ? (
                <div className="overflow-hidden rounded-xl border border-slate-300 bg-white/75 shadow-sm">
                  <Link to={DEMO_PROJECT_PATH} onClick={handleNavClick}>
                    <div
                      className={cn(
                        "flex items-start gap-2 px-3 py-3 transition-colors",
                        isActivePath(DEMO_PROJECT_PATH) ? "bg-[hsl(var(--sidebar-active))]" : "hover:bg-[hsl(var(--sidebar-hover))]"
                      )}
                    >
                      <ChevronDown className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <p className="truncate text-sm font-semibold">Jet Support</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">1 document</p>
                      </div>
                    </div>
                  </Link>

                  <div className="border-t border-slate-200/80 bg-white/40 px-3 py-2">
                    <Link to={DEMO_DOCUMENT_PATH} onClick={handleNavClick}>
                      <div
                        className={cn(
                          "flex items-start gap-2 rounded-md px-2 py-2 transition-colors",
                          isActivePath(DEMO_DOCUMENT_PATH) ? "bg-[hsl(var(--sidebar-active))]" : "hover:bg-[hsl(var(--sidebar-hover))]"
                        )}
                      >
                        <FileText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">Jet Support Maintinence</p>
                          <p className="text-xs text-muted-foreground">Demo document</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              ) : (
                <Link to={DEMO_PROJECT_PATH} onClick={handleNavClick}>
                  <div className="flex justify-center rounded-lg py-3 hover:bg-[hsl(var(--sidebar-hover))]">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              )}
            </div>
          </nav>

          {isSignedIn && (
            <>
              <div className="mx-3 h-px bg-border" />
              <div className="p-4">
                <Button
                  className={cn("w-full transition-all", isCollapsed ? "px-0 justify-center" : "gap-2")}
                  onClick={() => navigate("/dashboard")}
                  title="Go to Your Projects"
                >
                  <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">Your Projects</span>}
                </Button>
              </div>
            </>
          )}
        </div>

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

        <Outlet />
      </main>
    </div>
  )
}
