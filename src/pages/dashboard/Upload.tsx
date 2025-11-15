import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Upload as UploadIcon, File, X, CheckCircle2, Loader2, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

export function Upload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
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
    setProgress(0)

    // Simulate upload and analysis progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return 95
        }
        return prev + 5
      })
    }, 200)

    // Simulate analysis taking 3-4 seconds
    setTimeout(() => {
      clearInterval(progressInterval)
      setProgress(100)
      
      // Navigate to document view after a brief moment
      setTimeout(() => {
        // Use the first document ID from mock data
        navigate("/dashboard/document/1")
      }, 500)
    }, 3500)
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
            <div className="p-4 bg-muted/30 rounded-lg">
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
                        className="flex-shrink-0"
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

            {/* Analysis Progress */}
            {isAnalyzing && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Analyzing document...
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {progress}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2.5" />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  {progress < 30 && "Uploading and parsing document structure..."}
                  {progress >= 30 && progress < 60 && "Analyzing content against Traficom regulations..."}
                  {progress >= 60 && progress < 90 && "Identifying compliance issues and gaps..."}
                  {progress >= 90 && "Generating detailed analysis report..."}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!isAnalyzing && (
              <div className="flex gap-3">
                <Button
                  onClick={handleAnalyze}
                  className="flex-1"
                  size="lg"
                >
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Analyze Document
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRemoveFile}
                  size="lg"
                >
                  Cancel
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
              className="inline-flex items-center gap-1.5 text-xs font-light text-gray-500 hover:text-slate-60transition-colors"
            >
              Learn more
              {isLearnMoreOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            
            {isLearnMoreOpen && (
              <Card className="my-6 backdrop-blur-sm text-gray-500">
                <CardContent className="pt-6 space-y-3 text-left">
                  <p className="text-sm">
                    Checkmate is the latest solution in RegTech space, saving time and resources for any type of autitors and their clients. Where traditional options would take weeks, CheckMake manages to deliver the same result in days, saving tens of thousands of human hours and hundreads of thousands of euros in costs.
                    Our solution provides compliance with the latest regulations and standards as well as security, combining AI and traditional IT solutions
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

