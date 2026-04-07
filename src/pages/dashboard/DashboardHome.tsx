import { useEffect } from "react"
import { Link, useNavigate, useOutletContext } from "react-router-dom"
import { ArrowRight, FolderPlus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChessLoaderLong } from "@/components/ChessLoaderLong"
import type { DashboardOutletContext } from "@/layouts/DashboardLayout"

export function DashboardHome() {
  const navigate = useNavigate()
  const {
    projects,
    isWorkspaceLoading,
    openCreateProjectModal,
  } = useOutletContext<DashboardOutletContext>()

  useEffect(() => {
    if (isWorkspaceLoading) return
    if (projects.length > 0) {
      navigate(`/dashboard/project/${projects[0].project_id}`, { replace: true })
    }
  }, [isWorkspaceLoading, navigate, projects])

  if (isWorkspaceLoading) {
    return <div className="flex h-screen items-center justify-center"><ChessLoaderLong /></div>
  }

  if (projects.length > 0) {
    return null
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center px-6 py-12">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Project Workspace</p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight text-slate-950">
            Build your first compliance project.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">
            Group related documents, choose the legislation templates, and run one project-wide review across the full document set.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="h-12 rounded-xl px-5" onClick={openCreateProjectModal}>
              <FolderPlus className="h-4 w-4" />
              Create Project
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 rounded-xl px-5">
              <Link to="/demo">
                View Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-slate-950 p-8 text-white shadow-sm">
          <div className="inline-flex rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">
            Getting Started
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded-2xl bg-white/8 p-4">
              <p className="text-sm font-semibold">1. Create a project</p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Name the working set and choose the legislation templates the project will be checked against.
              </p>
            </div>
            <div className="rounded-2xl bg-white/8 p-4">
              <p className="text-sm font-semibold">2. Upload the full document set</p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Add one or more PDFs that together describe the submission, policy set, or operating model.
              </p>
            </div>
            <div className="rounded-2xl bg-white/8 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm font-semibold">3. Run project-wide analysis</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/70">
                The AI can use evidence across multiple documents to satisfy a single legislation requirement.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
