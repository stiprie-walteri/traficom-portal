import { useState, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload as UploadIcon, File, X, CheckCircle2, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { ChessLoaderLong } from "@/components/ChessLoaderLong"
import { cn } from "@/lib/utils"
import documentService from "@/lib/documentService"
import { generateDocumentId, storeAnalysisResult } from "@/lib/mockData"
import { useUser } from "@clerk/clerk-react"
import { useApiClient } from "@/hooks/useApiClient"
import { DocumentStorageService } from "@/lib/documentStorageService"

export function Upload() {
  // Existing state for analysis upload
  const [selectedAnalysisFile, setSelectedAnalysisFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAnalysisDragging, setIsAnalysisDragging] = useState(false)
  const analysisFileInputRef = useRef<HTMLInputElement>(null)

  // New state for markdown upload
  const [selectedMdFile, setSelectedMdFile] = useState<File | null>(null)
  const [isUploadingMd, setIsUploadingMd] = useState(false)
  const [isMdDragging, setIsMdDragging] = useState(false)
  const [mdFileTitle, setMdFileTitle] = useState("")
  const [mdFileMessage, setMdFileMessage] = useState("")
  const mdFileInputRef = useRef<HTMLInputElement>(null)

  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false)
  const navigate = useNavigate()

  const { user } = useUser()
  const apiClient = useApiClient()
  const storageService = useMemo(() => new DocumentStorageService(apiClient), [apiClient])

  // Accepted types
  const analysisAcceptedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  const mdAcceptedTypes = ["text/markdown", "text/plain", ""] // empty string for files with no mime type but md extension

  const handleAnalysisFileSelect = (file: File) => {
    if (analysisAcceptedTypes.includes(file.type)) {
      setSelectedAnalysisFile(file)
    } else {
      alert("Please select a PDF or Word document (.pdf, .doc, .docx)")
    }
  }

  const handleAnalysisDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsAnalysisDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleAnalysisFileSelect(file)
    }
  }

  const handleAnalysisDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsAnalysisDragging(true)
  }

  const handleAnalysisDragLeave = () => {
    setIsAnalysisDragging(false)
  }

  const handleAnalysisFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleAnalysisFileSelect(file)
    }
  }

  const handleRemoveAnalysisFile = () => {
    setSelectedAnalysisFile(null)
    if (analysisFileInputRef.current) {
      analysisFileInputRef.current.value = ""
    }
  }

  const handleAnalyze = async () => {
    if (!selectedAnalysisFile) return

    setIsAnalyzing(true)

    // Store file reference before clearing
    const fileToAnalyze = selectedAnalysisFile
    const fileName = selectedAnalysisFile.name

    // Generate a unique ID for the new document
    const newDocId = generateDocumentId()


    // Clear the form immediately so user can upload another file
    setSelectedAnalysisFile(null)
    if (analysisFileInputRef.current) {
      analysisFileInputRef.current.value = ""
    }

    try {
      // Call the real parseReal API
      const result = await documentService.parseReal(fileToAnalyze)

      // Store the analysis result with the document ID
      storeAnalysisResult(newDocId, {
        parseResult: result,
        filename: fileName
      })

      // Update document list (sidebar)
      window.dispatchEvent(new Event('documentListUpdated'))

      // Navigate to the document view with the real data
      navigate(`/dashboard/document/${newDocId}`)
    } catch (error) {
      console.error("Error parsing document:", error)
      alert(`Failed to analyze document "${fileName}". Please try again.`)
      setIsAnalyzing(false)
      window.dispatchEvent(new Event('documentListUpdated'))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  // --- Markdown Upload Handlers ---

  const handleMdFileSelect = (file: File) => {
    // Basic check for markdown or text files, or file ending in .md
    if (mdAcceptedTypes.includes(file.type) || file.name.endsWith(".md") || file.name.endsWith(".markdown")) {
      setSelectedMdFile(file)
      // Auto-set title from filename (strip extension)
      if (!mdFileTitle) {
        setMdFileTitle(file.name.replace(/\.[^/.]+$/, ""))
      }
    } else {
      alert("Please select a Markdown document (.md, .markdown)")
    }
  }

  const handleMdDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsMdDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleMdFileSelect(file)
    }
  }

  const handleMdDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsMdDragging(true)
  }

  const handleMdDragLeave = () => {
    setIsMdDragging(false)
  }

  const handleMdFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleMdFileSelect(file)
    }
  }

  const handleRemoveMdFile = () => {
    setSelectedMdFile(null)
    setMdFileTitle("")
    setMdFileMessage("")
    if (mdFileInputRef.current) {
      mdFileInputRef.current.value = ""
    }
  }

  const handleUploadMd = async () => {
    if (!selectedMdFile || !user) return

    setIsUploadingMd(true)

    try {
      const result = await storageService.uploadDocument({
        organizationId: user.id, // Using user ID as organization ID as agreed
        actorUserId: user.id,
        file: selectedMdFile,
        title: mdFileTitle || undefined,
        message: mdFileMessage || undefined,
      })

      // We should ideally fetch documents here after a successful upload
      // For now we will trigger our existing event pattern
      window.dispatchEvent(new Event('documentListUpdated'))

      // Clear form
      handleRemoveMdFile()
      alert("Markdown document uploaded successfully!")

      // We could navigate to it right away
      navigate(`/dashboard/document/${result.document_id}`)

    } catch (error) {
      console.error("Error uploading markdown document:", error)
      alert("Failed to upload Markdown document. Please try again.")
    } finally {
      setIsUploadingMd(false)
    }
  }

  return (
    <div className="w-full">
      {isAnalyzing ? (
        <ChessLoaderLong />
      ) : (
        <div className="container mx-auto px-6 py-12">
          {/* Slogan */}
          <div className="text-center mb-3 max-w-3xl mx-auto">
            <p className="text-3xl font-bold italic text-muted-foreground tracking-wide font-['Courier_New',monospace]">
              "Consider it Checked"
            </p>
          </div>

          {/* Centered Header for Analysis */}
          <div className="mb-8 text-center max-w-3xl mx-auto font-['Courier_New',monospace]">
            <h1 className="text-2xl mb-2">Upload Document for Analysis</h1>
          </div>

          {/* Drop Zone for Analysis - No Card Wrapper */}
          <div className="space-y-6 max-w-3xl mx-auto mb-16">
            {!selectedAnalysisFile ? (
              <div
                className={cn(
                  "p-12 text-center transition-all duration-300 border-2 border-dotted border-slate-300 dark:border-slate-700 rounded-sm cursor-pointer group hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md backdrop-blur-sm",
                  isAnalysisDragging && "bg-primary/10 border-primary scale-105 shadow-lg backdrop-blur-md"
                )}
                style={{ backgroundColor: isAnalysisDragging ? undefined : 'hsl(var(--sidebar-bg))' }}
                onDrop={handleAnalysisDrop}
                onDragOver={handleAnalysisDragOver}
                onDragLeave={handleAnalysisDragLeave}
                onClick={() => analysisFileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-4">
                  <div
                    className={cn(
                      "p-4 backdrop-blur-sm rounded-lg group-hover:bg-primary/10 transition-colors",
                      isAnalysisDragging && "bg-primary/20"
                    )}
                    style={{ backgroundColor: isAnalysisDragging ? undefined : 'hsl(var(--sidebar-hover))' }}
                  >
                    <UploadIcon className={cn(
                      "h-12 w-12 text-black dark:text-black group-hover:text-primary transition-colors",
                      isAnalysisDragging && "text-primary"
                    )} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      Drop your document here for analysis
                    </h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      or click to browse files
                    </p>
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2 justify-center">
                      <FileText className="h-3 w-3" />
                      PDF, DOC, DOCX • Max 50MB
                    </p>
                  </div>
                  <input
                    ref={analysisFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleAnalysisFileInputChange}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected File Display */}
                <div
                  className="p-6 transition-all duration-300 border-2 border-slate-300 dark:border-slate-500 rounded-sm backdrop-blur-sm"
                  style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <File className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{selectedAnalysisFile.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(selectedAnalysisFile.size)} • {selectedAnalysisFile.type.split("/")[1]?.toUpperCase() || 'FILE'}
                          </p>
                        </div>
                        {!isAnalyzing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveAnalysisFile}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {!isAnalyzing && (
                        <div className="flex items-center gap-2 mt-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">Ready to analyze</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {!isAnalyzing && (
                  <div className="flex gap-3">
                    <Button
                      onClick={handleAnalyze}
                      className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black"
                      size="lg"
                    >
                      <UploadIcon className="mr-2 h-4 w-4" />
                      Analyze Document
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Centered Header for Markdown upload */}
          <div className="mb-4 text-center max-w-3xl mx-auto font-['Courier_New',monospace]">
            <h2 className="text-xl mb-2 text-muted-foreground">Or Upload Markdown Document</h2>
          </div>

          <div className="space-y-6 max-w-3xl mx-auto mb-12">
            {!selectedMdFile ? (
              <div
                className={cn(
                  "p-8 text-center transition-all duration-300 border-2 border-dotted border-slate-300 dark:border-slate-700 rounded-sm cursor-pointer group hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md backdrop-blur-sm",
                  isMdDragging && "bg-primary/10 border-primary scale-105 shadow-lg backdrop-blur-md"
                )}
                style={{ backgroundColor: isMdDragging ? undefined : 'hsl(var(--sidebar-bg))' }}
                onDrop={handleMdDrop}
                onDragOver={handleMdDragOver}
                onDragLeave={handleMdDragLeave}
                onClick={() => mdFileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-3">
                  <div
                    className={cn(
                      "p-3 backdrop-blur-sm rounded-lg group-hover:bg-primary/10 transition-colors",
                      isMdDragging && "bg-primary/20"
                    )}
                    style={{ backgroundColor: isMdDragging ? undefined : 'hsl(var(--sidebar-hover))' }}
                  >
                    <FileText className={cn(
                      "h-8 w-8 text-black dark:text-black group-hover:text-primary transition-colors",
                      isMdDragging && "text-primary"
                    )} />
                  </div>
                  <div>
                    <h3 className="text-md font-semibold mb-1">
                      Store Raw Markdown
                    </h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      Directly upload a .md file
                    </p>
                  </div>
                  <input
                    ref={mdFileInputRef}
                    type="file"
                    accept=".md,.markdown"
                    onChange={handleMdFileInputChange}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className="p-5 transition-all duration-300 border-2 border-slate-300 dark:border-slate-500 rounded-sm backdrop-blur-sm"
                  style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{selectedMdFile.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(selectedMdFile.size)} • Markdown
                          </p>
                        </div>
                        {!isUploadingMd && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveMdFile}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Document Title</label>
                          <input
                            type="text"
                            value={mdFileTitle}
                            onChange={(e) => setMdFileTitle(e.target.value)}
                            disabled={isUploadingMd}
                            className="w-full text-sm p-2 rounded border focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Document title"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Commit Message (Optional)</label>
                          <input
                            type="text"
                            value={mdFileMessage}
                            onChange={(e) => setMdFileMessage(e.target.value)}
                            disabled={isUploadingMd}
                            className="w-full text-sm p-2 rounded border focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="What changed?"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {!isUploadingMd ? (
                  <div className="flex gap-3">
                    <Button
                      onClick={handleUploadMd}
                      className="flex-1"
                      size="lg"
                    >
                      <UploadIcon className="mr-2 h-4 w-4" />
                      Upload Markdown Document
                    </Button>
                  </div>
                ) : (
                  <Button disabled className="w-full" size="lg">
                    <UploadIcon className="mr-2 h-4 w-4 animate-bounce" />
                    Uploading...
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Learn More Collapsible Section */}
          {(!selectedAnalysisFile && !selectedMdFile) && (
            <div className="text-center">
              <button
                onClick={() => setIsLearnMoreOpen(!isLearnMoreOpen)}
                className="inline-flex items-center gap-1.5 text-xs font-light text-gray-500 hover:text-gray-600 transition-colors"
              >
                Learn more
                {isLearnMoreOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {isLearnMoreOpen && (
                <Card className="my-6 max-h-[65vh] overflow-hidden text-sm text-gray-500 backdrop-blur-sm">
                  <CardContent className="pt-6 space-y-3 text-left overflow-y-auto max-h-[55vh] pr-4">
                    <p>
                      Checkmate is the latest in RegTech solutions, combining the best of AI and traditional IT to revolutionize regulatory compliance. We save companies tens of thousands of hours and hundreds of thousands of euros.
                    </p>
                    <p>
                      Upload your document and our hybrid AI engine analyzes it, generating actionable compliance reports in minutes.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

