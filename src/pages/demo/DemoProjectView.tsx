import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function DemoProjectView() {
  return (
    <div className="container mx-auto max-w-5xl px-6 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Demo Project</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Jet Support</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Static demo workspace for the Jet Support example. This area is isolated from authenticated user projects and documents.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Documents</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">1</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Scope</p>
            <p className="mt-2 text-base font-semibold text-foreground">Jet Support demo</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Portal</p>
            <p className="mt-2 text-base font-semibold text-foreground">Read-only demo</p>
          </div>
        </div>

        <div className="mt-8">
          <Link to="/demo/document/jet-support">
            <Button>Open Demo Document</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
