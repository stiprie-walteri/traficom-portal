import { useState, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload as UploadIcon, File, X, FileText, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from "lucide-react"
import { InlineChessLoader } from "@/components/ChessLoader"
import { cn } from "@/lib/utils"
import documentService from "@/lib/documentService"
import { useUser } from "@clerk/clerk-react"
import { useApiClient } from "@/hooks/useApiClient"
import { DocumentStorageService } from "@/lib/documentStorageService"
import { useAppAlert } from "@/hooks/useAppAlert"

type UploadStep = "idle" | "uploading" | "analysing" | "saving" | "done" | "error"

const STEP_LABELS: Record<UploadStep, string> = {
  idle: "",
  uploading: "Uploading document...",
  analysing: "Running compliance analysis...",
  saving: "Saving results...",
  done: "Complete",
  error: "Failed",
}

export function Upload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [docTitle, setDocTitle] = useState("")
  const [docMessage, setDocMessage] = useState("")
  const [step, setStep] = useState<UploadStep>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const navigate = useNavigate()
  const { user } = useUser()
  const { toast } = useAppAlert()
  const apiClient = useApiClient()
  const storageService = useMemo(() => new DocumentStorageService(apiClient), [apiClient])

  const isProcessing = step === "uploading" || step === "analysing" || step === "saving"

  const handleFileSelect = (file: File) => {
    if (file.type === "application/pdf") {
      setSelectedFile(file)
      if (!docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ""))
    } else {
      toast({ variant: "warning", title: "Invalid file type", description: "Please select a PDF document." })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setDocTitle("")
    setDocMessage("")
    setStep("idle")
    setErrorMsg(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleUpload = async () => {
    if (!selectedFile || !user) return
    setErrorMsg(null)

    // Step 1: Upload to document storage
    setStep("uploading")
    let uploadResult: { document_id: string; version_no: number; organization_id?: string }
    try {
      uploadResult = await storageService.uploadDocument({
        organizationId: user.id,
        actorUserId: user.id,
        file: selectedFile,
        title: docTitle || undefined,
        message: docMessage || undefined,
      })
    } catch (err) {
      console.error("Upload failed:", err)
      setStep("error")
      setErrorMsg("Upload failed. Please try again.")
      return
    }

    // Step 2: Run compliance analysis
    setStep("analysing")
    let rawResult: object | null = null
    try {
      const parseResult = await documentService.parseReal(selectedFile)
      if (!parseResult.ok) {
        // Analysis failed — still navigate but without compliance data
        console.warn("Compliance analysis failed:", parseResult.error)
      } else {
        rawResult = parseResult.raw as object
      }
    } catch (err) {
      console.warn("Compliance analysis error (non-fatal):", err)
    }

    // Step 3: Save compliance result (if we got one)
    if (rawResult) {
      setStep("saving")
      try {
        await storageService.saveComplianceResult(
          user.id,
          uploadResult.document_id,
          uploadResult.version_no,
          rawResult
        )
      } catch (err) {
        console.warn("Failed to save compliance result (non-fatal):", err)
      }
    }

    // Done — dispatch event so sidebar refreshes
    window.dispatchEvent(new Event("documentListUpdated"))
    setStep("done")
    navigate(`/dashboard/document/${uploadResult.document_id}`)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const steps: UploadStep[] = ["uploading", "analysing", "saving"]

  return (
    <div className="w-full">
      <div className="container mx-auto px-6 py-12">
        {/* Slogan */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <p className="text-3xl font-bold italic text-muted-foreground tracking-wide font-['Courier_New',monospace]">
            "Consider it Checked"
          </p>
        </div>

        <div className="mb-8 text-center max-w-3xl mx-auto font-['Courier_New',monospace]">
          <h1 className="text-2xl mb-2">Document Management</h1>
          <p className="text-sm text-muted-foreground italic">Upload your PDF to store it and run compliance analysis</p>
        </div>

        <div className="space-y-6 max-w-3xl mx-auto mb-16">
          {!selectedFile ? (
            <div
              className={cn(
                "p-12 text-center transition-all duration-300 border-2 border-dotted border-slate-300 dark:border-slate-700 rounded-sm cursor-pointer group hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md backdrop-blur-sm",
                isDragging && "bg-primary/10 border-primary scale-105 shadow-lg backdrop-blur-md"
              )}
              style={{ backgroundColor: isDragging ? undefined : "hsl(var(--sidebar-bg))" }}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-4">
                <div
                  className={cn(
                    "p-4 backdrop-blur-sm rounded-lg group-hover:bg-primary/10 transition-colors",
                    isDragging && "bg-primary/20"
                  )}
                  style={{ backgroundColor: isDragging ? undefined : "hsl(var(--sidebar-hover))" }}
                >
                  <UploadIcon className={cn("h-12 w-12 text-black dark:text-black group-hover:text-primary transition-colors", isDragging && "text-primary")} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Drop your document here</h3>
                  <p className="text-sm text-muted-foreground mb-1">or click to browse files</p>
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2 justify-center">
                    <FileText className="h-3 w-3" />
                    PDF only • Max 50MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div
                className="p-6 transition-all duration-300 border-2 border-slate-300 dark:border-slate-500 rounded-sm backdrop-blur-sm"
                style={{ backgroundColor: "hsl(var(--sidebar-bg))" }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <File className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{selectedFile.name}</h4>
                        <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)} • PDF DOCUMENT</p>
                      </div>
                      {!isProcessing && (
                        <Button variant="ghost" size="sm" onClick={handleRemoveFile} className="shrink-0">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {!isProcessing && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Document Title</label>
                          <input
                            type="text"
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            className="w-full text-sm p-3 rounded border focus:outline-none focus:ring-1 focus:ring-primary bg-transparent"
                            placeholder="e.g. Maintenance Organisation Exposition"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Description / Note (Optional)</label>
                          <textarea
                            value={docMessage}
                            onChange={(e) => setDocMessage(e.target.value)}
                            rows={2}
                            className="w-full text-sm p-3 rounded border focus:outline-none focus:ring-1 focus:ring-primary bg-transparent resize-none"
                            placeholder="Add a brief description..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action / Progress */}
              <div className="flex gap-3">
                {!isProcessing && step !== "error" ? (
                  <Button onClick={handleUpload} className="flex-1 bg-primary text-primary-foreground" size="lg">
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Upload & Analyse
                  </Button>
                ) : step === "error" ? (
                  <div className="flex-1 py-5 px-6 flex items-center gap-3 border border-red-500/40 rounded-sm bg-red-500/5">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-600">{errorMsg}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRemoveFile}>Try again</Button>
                  </div>
                ) : (
                  <div className="flex-1 py-6 flex flex-col items-center gap-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50/50 dark:bg-slate-900/20 backdrop-blur-sm">
                    <InlineChessLoader duration={8} />
                    {/* Step indicators */}
                    <div className="flex items-center gap-3">
                      {steps.map((s, i) => {
                        const stepIndex = steps.indexOf(step)
                        const isDone = i < stepIndex
                        const isCurrent = s === step
                        return (
                          <div key={s} className="flex items-center gap-1.5">
                            {i > 0 && <div className="w-6 h-px bg-slate-300 dark:bg-slate-600" />}
                            <div className={cn(
                              "flex items-center gap-1.5 text-xs font-medium",
                              isCurrent ? "text-primary" : isDone ? "text-green-600" : "text-muted-foreground"
                            )}>
                              {isDone ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <div className={cn("h-3.5 w-3.5 rounded-full border-2", isCurrent ? "border-primary bg-primary/20" : "border-slate-300")} />
                              )}
                              <span>{i + 1}. {STEP_LABELS[s].split("...")[0].replace("Running compliance ", "Analysing").replace(" document", "")}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground animate-pulse">{STEP_LABELS[step]}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Learn More */}
        {!selectedFile && (
          <div className="text-center max-w-3xl mx-auto">
            <button
              onClick={() => setIsLearnMoreOpen(!isLearnMoreOpen)}
              className="inline-flex items-center gap-1.5 text-xs font-light text-gray-500 hover:text-gray-600 transition-colors"
            >
              Learn more
              {isLearnMoreOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {isLearnMoreOpen && (
              <Card className="my-6 max-h-[65vh] overflow-hidden text-sm text-gray-500 backdrop-blur-sm">
                <CardContent className="pt-6 space-y-3 text-left overflow-y-auto max-h-[55vh] pr-4">
                  <p>
                    Checkmate is the latest in RegTech solutions, combining the best of AI and traditional IT to revolutionize regulatory compliance.
                    We save companies tens of thousands of hours and hundreds of thousands of euros.
                  </p>
                  <p>
                    Upload your document and our hybrid AI engine analyses it against EASA Part-145 legislation,
                    generating actionable compliance reports in minutes — stored permanently so you can revisit them any time.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
