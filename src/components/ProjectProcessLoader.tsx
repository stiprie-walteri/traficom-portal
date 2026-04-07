type LoaderStep = {
  label: string
  status: "pending" | "active" | "done"
}

type ProjectProcessLoaderProps = {
  title: string
  description: string
  completedCount?: number
  totalTasks?: number
  currentTask?: string | null
  statusMessage?: string | null
  etaLabel?: string | null
  progressPercent?: number | null
  steps?: LoaderStep[]
  fullScreen?: boolean
}

function CheckerboardVisual() {
  return (
    <>
      <div className="checkerboard-loader-grid" aria-hidden="true">
        {Array.from({ length: 64 }, (_, index) => {
          const row = Math.floor(index / 8)
          const col = index % 8
          const isDark = (row + col) % 2 === 0

          return (
            <div
              key={index}
              className={`checkerboard-loader-cell ${isDark ? "checkerboard-loader-cell-dark" : "checkerboard-loader-cell-light"}`}
              style={{ animationDelay: `${index * 0.04}s` }}
            />
          )
        })}
      </div>

      <style>{`
        .checkerboard-loader-grid {
          display: grid;
          grid-template-columns: repeat(8, 28px);
          grid-template-rows: repeat(8, 28px);
          gap: 3px;
          margin: 0 auto;
        }

        .checkerboard-loader-cell {
          width: 28px;
          height: 28px;
          opacity: 0.88;
          animation: checkerboard-loader-wave 2.2s ease-in-out infinite;
          transform-origin: center;
        }

        .checkerboard-loader-cell-dark {
          background: #0f172a;
        }

        .checkerboard-loader-cell-light {
          background: white;
          border: 2px solid #0f172a;
        }

        @keyframes checkerboard-loader-wave {
          0%, 100% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 0.92;
          }
          20% {
            transform: translateY(-16px) rotate(-22deg) scale(1.04);
            opacity: 1;
          }
          45% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 0.92;
          }
        }
      `}</style>
    </>
  )
}

export function ProjectProcessLoader({
  title,
  description,
  completedCount,
  totalTasks,
  currentTask,
  statusMessage,
  etaLabel,
  progressPercent,
  steps,
  fullScreen = false,
}: ProjectProcessLoaderProps) {
  const hasTaskProgress = typeof completedCount === "number" && typeof totalTasks === "number" && totalTasks > 0
  const stepProgress = steps && steps.length > 0
    ? steps.reduce((acc, step) => {
      if (step.status === "done") return acc + 1
      if (step.status === "active") return acc + 0.45
      return acc
    }, 0) / steps.length
    : 0.12
  const progress = typeof progressPercent === "number"
    ? Math.max(6, Math.min(100, progressPercent))
    : hasTaskProgress
      ? Math.max(6, (completedCount / totalTasks) * 100)
    : Math.max(10, stepProgress * 100)

  return (
    <div className={fullScreen ? "flex min-h-[calc(100vh-4rem)] items-center justify-center px-6" : "w-full"}>
      <div className="w-full rounded-[28px] border border-slate-200 bg-white/92 p-8 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col items-center text-center">
          <CheckerboardVisual />

          <h3 className="mt-8 text-[2rem] font-semibold leading-tight text-slate-900">{title}</h3>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">{description}</p>

          <div className="mt-7 w-full max-w-xl text-left">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm text-slate-700">
              <span className="truncate">{statusMessage || currentTask || "Preparing workflow..."}</span>
              <div className="flex items-center gap-3 whitespace-nowrap text-slate-500">
                {etaLabel ? <span>{etaLabel}</span> : null}
                {hasTaskProgress ? <span>{completedCount} / {totalTasks}</span> : null}
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-black transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {steps && steps.length > 0 ? (
            <div className="mt-7 w-full max-w-xl space-y-3 text-left">
              {steps.map((step) => (
                <div key={step.label} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <span
                    className={[
                      "inline-block h-3.5 w-3.5 rounded-full border-2",
                      step.status === "done"
                        ? "border-black bg-black"
                        : step.status === "active"
                          ? "border-black bg-white"
                          : "border-slate-300 bg-white",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "text-sm",
                      step.status === "active"
                        ? "font-semibold text-slate-900"
                        : step.status === "done"
                          ? "text-slate-800"
                          : "text-slate-500",
                    ].join(" ")}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
