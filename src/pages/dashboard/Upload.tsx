import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload as UploadIcon, File, X, CheckCircle2, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { ChessLoader } from "@/components/ChessLoader"
import { cn } from "@/lib/utils"
import documentService from "@/lib/documentService"
import { addDocument, generateDocumentId, storeAnalysisResult, updateDocumentWithResults, mockDocuments } from "@/lib/mockData"

export function Upload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const acceptedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]

  const handleFileSelect = (file: File) => {
    if (acceptedTypes.includes(file.type)) {
      setSelectedFile(file)
    } else {
      alert("Please select a PDF or Word document (.pdf, .doc, .docx)")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return

    setIsAnalyzing(true)

    // Store file reference before clearing
    const fileToAnalyze = selectedFile
    const fileName = selectedFile.name

    // Generate a unique ID for the new document
    const newDocId = generateDocumentId()

    // Remove file extension from filename for cleaner title
    const fileTitle = fileName.replace(/\.[^/.]+$/, "")

    // Add the new document to the sidebar
    addDocument({
      id: newDocId,
      title: fileTitle,
      uploadDate: new Date().toISOString().split('T')[0], // Use current date
      status: "analyzing",
      complianceScore: undefined, // This will show as "-%"
    })

    // Trigger sidebar update
    window.dispatchEvent(new Event('documentListUpdated'))

    // Clear the form immediately so user can upload another file
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    try {
      // Call the real parseReal API
      const result = await documentService.parseReal(fileToAnalyze)

      // Store the analysis result with the document ID
      storeAnalysisResult(newDocId, {
        parseResult: result,
        filename: fileName
      })

      // Update document with calculated correctness score
      updateDocumentWithResults(newDocId, result)

      // Navigate to the document view with the real data
      navigate(`/dashboard/document/${newDocId}`)
    } catch (error) {
      console.error("Error parsing document:", error)
      alert(`Failed to analyze document "${fileName}". Please try again.`)
      setIsAnalyzing(false)
      // Update document status on error
      const doc = mockDocuments.find(d => d.id === newDocId)
      if (doc) {
        doc.status = "analyzed" // Mark as analyzed even on error
        window.dispatchEvent(new Event('documentListUpdated'))
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="w-full">
      {isAnalyzing ? (
        <ChessLoader duration={180} />
      ) : (
        <div className="container mx-auto px-6 py-12">
          {/* Slogan */}
          <div className="text-center mb-3 max-w-3xl mx-auto">
            <p className="text-3xl font-bold italic text-muted-foreground tracking-wide font-['Courier_New',monospace]">
              "Consider it Checked"
            </p>
          </div>

          {/* Centered Header */}
          <div className="mb-8 text-center max-w-3xl mx-auto font-['Courier_New',monospace]">
            <h1 className="text-2xl mb-2">Upload Document for Analysis</h1>
          </div>

          {/* Drop Zone - No Card Wrapper */}
          <div className="space-y-6 max-w-3xl mx-auto">
            {!selectedFile ? (
              <div
                className={cn(
                  "p-12 text-center transition-all duration-300 border-2 border-dotted border-slate-300 dark:border-slate-700 rounded-sm cursor-pointer group hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md backdrop-blur-sm",
                  isDragging && "bg-primary/10 border-primary scale-105 shadow-lg backdrop-blur-md"
                )}
                style={{ backgroundColor: isDragging ? undefined : 'hsl(var(--sidebar-bg))' }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-4">
                  <div
                    className={cn(
                      "p-4 backdrop-blur-sm rounded-lg group-hover:bg-primary/10 transition-colors",
                      isDragging && "bg-primary/20"
                    )}
                    style={{ backgroundColor: isDragging ? undefined : 'hsl(var(--sidebar-hover))' }}
                  >
                    <UploadIcon className={cn(
                      "h-12 w-12 text-black dark:text-black group-hover:text-primary transition-colors",
                      isDragging && "text-primary"
                    )} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      Drop your document here
                    </h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      or click to browse files
                    </p>
                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2 justify-center">
                      <FileText className="h-3 w-3" />
                      PDF • Max 50MB
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileInputChange}
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
                          <h4 className="font-semibold truncate">{selectedFile.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(selectedFile.size)} • {selectedFile.type.split("/")[1].toUpperCase()}
                          </p>
                        </div>
                        {!isAnalyzing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveFile}
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

            {/* Learn More Collapsible Section */}
            {!selectedFile && (
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
        </div>
      )}
    </div>
  )
}

