import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload as UploadIcon, File, X, CheckCircle2, Loader2, FileText, Shield, Zap, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export function Upload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
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
    <div className="container mx-auto px-6 py-10 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Upload Document for Analysis</h1>
        <p className="text-sm text-muted-foreground">
          Upload your PDF or Word document to check compliance with Traficom standards
        </p>
      </div>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Document Upload</CardTitle>
          <CardDescription className="text-sm">
            Analyze regulatory documents against Traficom compliance standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedFile ? (
            <div
              className={cn(
                "p-12 text-center transition-all duration-300 bg-muted/30 border-2 border-dashed cursor-pointer group hover:bg-muted/50",
                isDragging && "bg-primary/10 border-primary scale-105"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-4">
                <div className={cn(
                  "p-4 bg-muted group-hover:bg-primary/10 transition-colors",
                  isDragging && "bg-primary/20"
                )}>
                  <UploadIcon className={cn(
                    "h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors",
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
                    PDF, DOC, DOCX • Max 50MB
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
              <div className="p-4 bg-muted/30">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10">
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
                <div className="space-y-4 p-4 bg-primary/5 rounded">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded">
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
        </CardContent>
      </Card>

      {/* Helpful Tips */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold mb-4">What You'll Get</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-green-100 rounded">
                  <Zap className="h-4 w-4 text-green-600" />
                </div>
                <CardTitle className="text-sm font-medium">Instant Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Get comprehensive compliance analysis in 2-5 minutes. Checkmate evaluates your document against all relevant Traficom regulations.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-blue-100 rounded">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <CardTitle className="text-sm font-medium">Detailed Reports</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Receive highlighted issues with severity levels, missing sections, and specific suggestions for each compliance gap identified.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-purple-100 rounded">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <CardTitle className="text-sm font-medium">Save Time</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automated checking saves hours of manual review. Focus on fixing issues rather than finding them—checkmate on inefficiency.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

