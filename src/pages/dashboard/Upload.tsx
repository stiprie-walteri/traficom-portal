import { useState, useRef, useMemo, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload as UploadIcon, File, X, CheckCircle2, FileText, ChevronDown, ChevronUp, Trash2, Plus, Bot, ChevronRight } from "lucide-react"
import { InlineChessLoader } from "@/components/ChessLoader"
import { cn } from "@/lib/utils"
// Removed documentService import as analysis is removed
import { useUser } from "@clerk/clerk-react"
import { useApiClient } from "@/hooks/useApiClient"
import { DocumentStorageService, StoredDocument, EvaluateTaskResult } from "@/lib/documentStorageService"
import { useAppAlert } from "@/hooks/useAppAlert"

export function Upload() {
  // New state for document storage upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [docTitle, setDocTitle] = useState("")
  const [docMessage, setDocMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // New state for querying chunks
  const [queryDocId, setQueryDocId] = useState("")
  const [queryVersionNo, setQueryVersionNo] = useState("1")
  const [isQueryingChunks, setIsQueryingChunks] = useState(false)
  const [queryChunksResult, setQueryChunksResult] = useState<any>(null)
  const [availableDocuments, setAvailableDocuments] = useState<StoredDocument[]>([])

  // Delete state
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  // Evaluate state
  const [evalDocId, setEvalDocId] = useState("")
  const [evalVersionNo, setEvalVersionNo] = useState("1")
  const [evalTaskGroups, setEvalTaskGroups] = useState<string[][]>([[""]])
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalResults, setEvalResults] = useState<EvaluateTaskResult[] | null>(null)
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set())

  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false)
  const navigate = useNavigate()

  const { user } = useUser()
  const { toast, confirm } = useAppAlert()
  const apiClient = useApiClient()
  const storageService = useMemo(() => new DocumentStorageService(apiClient), [apiClient])

  const refreshDocuments = useCallback(() => {
    if (user?.id) {
      storageService.listDocuments(user.id)
        .then(res => setAvailableDocuments(res?.items || []))
        .catch(console.error)
    }
  }, [user?.id, storageService])

  // Fetch available documents for the dropdown
  useEffect(() => {
    refreshDocuments()
  }, [refreshDocuments])

  // Accepted types - restricted to PDF only
  const storageAcceptedTypes = ["application/pdf"]

  const handleFileSelect = (file: File) => {
    if (storageAcceptedTypes.includes(file.type)) {
      setSelectedFile(file)
      // Auto-set title from filename (strip extension)
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ""))
      }
    } else {
      toast({
        variant: "warning",
        title: "Invalid file type",
        description: "Please select a PDF document (.pdf).",
      })
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
    setDocTitle("")
    setDocMessage("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !user) return

    setIsUploading(true)

    try {
      const result = await storageService.uploadDocument({
        organizationId: user.id, // Using user ID as organization ID
        actorUserId: user.id,
        file: selectedFile,
        title: docTitle || undefined,
        message: docMessage || undefined,
      })

      // Update document list (sidebar)
      window.dispatchEvent(new Event('documentListUpdated'))
      refreshDocuments()

      // Clear form
      handleRemoveFile()
      toast({
        variant: "success",
        title: "Uploaded",
        description: "Document uploaded successfully.",
      })

      // Navigate to it
      navigate(`/dashboard/document/${result.document_id}`)

    } catch (error) {
      console.error("Error uploading document:", error)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // --- Delete Handler ---
  const handleDeleteDocument = async (doc: StoredDocument) => {
    const ok = await confirm({
      title: "Delete this document?",
      description: "This action cannot be undone. The document will be removed from your list.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    })
    if (!ok) return

    setDeletingDocId(doc.document_id)
    try {
      await storageService.deleteDocument(doc.organization_id, doc.document_id)
      window.dispatchEvent(new Event('documentListUpdated'))
      refreshDocuments()
    } catch (err) {
      console.error("Delete failed:", err)
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete document. Please try again.",
      })
    } finally {
      setDeletingDocId(null)
    }
  }

  // --- Evaluate Handlers ---
  const addTaskGroup = () => setEvalTaskGroups(prev => [...prev, [""]])
  const removeTaskGroup = (gi: number) => setEvalTaskGroups(prev => prev.filter((_, i) => i !== gi))
  const addItemToGroup = (gi: number) =>
    setEvalTaskGroups(prev => prev.map((g, i) => i === gi ? [...g, ""] : g))
  const removeItemFromGroup = (gi: number, ii: number) =>
    setEvalTaskGroups(prev => prev.map((g, i) => i === gi ? g.filter((_, j) => j !== ii) : g))
  const updateGroupItem = (gi: number, ii: number, val: string) =>
    setEvalTaskGroups(prev => prev.map((g, i) => i === gi ? g.map((v, j) => j === ii ? val : v) : g))

  const handleEvaluate = async () => {
    const selectedDoc = availableDocuments.find(d => d.document_id === evalDocId)
    const orgId = selectedDoc?.organization_id || user?.id
    if (!orgId || !evalDocId || !evalVersionNo) {
      toast({
        variant: "warning",
        title: "Missing info",
        description: "Please select a document and version.",
      })
      return
    }
    const tasks = evalTaskGroups
      .map(g => g.filter(s => s.trim()))
      .filter(g => g.length > 0)
    if (tasks.length === 0) {
      toast({
        variant: "warning",
        title: "No tasks",
        description: "Please add at least one task item.",
      })
      return
    }
    setIsEvaluating(true)
    setEvalResults(null)
    try {
      const res = await storageService.evaluateDocument(orgId, evalDocId, parseInt(evalVersionNo), tasks)
      setEvalResults(res.results)
    } catch (err) {
      console.error("Evaluation failed:", err)
      toast({
        variant: "destructive",
        title: "Evaluation failed",
        description: "Evaluation failed. See console for details.",
      })
    } finally {
      setIsEvaluating(false)
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
      <div className="container mx-auto px-6 py-12">
        {/* Slogan */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <p className="text-3xl font-bold italic text-muted-foreground tracking-wide font-['Courier_New',monospace]">
            "Consider it Checked"
          </p>
        </div>

        {/* Centered Header for Document Management */}
        <div className="mb-8 text-center max-w-3xl mx-auto font-['Courier_New',monospace]">
          <h1 className="text-2xl mb-2">Document Management</h1>
          <p className="text-sm text-muted-foreground italic">Upload and manage your PDF files</p>
        </div>

        <div className="space-y-6 max-w-3xl mx-auto mb-16">
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
                    PDF only • Max 50MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
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
                          {formatFileSize(selectedFile.size)} • PDF DOCUMENT
                        </p>
                      </div>
                      {!isUploading && (
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

                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Document Title</label>
                        <input
                          type="text"
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          disabled={isUploading}
                          className="w-full text-sm p-3 rounded border focus:outline-none focus:ring-1 focus:ring-primary bg-transparent"
                          placeholder="e.g. Annual Report 2024"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Description / Note (Optional)</label>
                        <textarea
                          value={docMessage}
                          onChange={(e) => setDocMessage(e.target.value)}
                          disabled={isUploading}
                          rows={3}
                          className="w-full text-sm p-3 rounded border focus:outline-none focus:ring-1 focus:ring-primary bg-transparent resize-none"
                          placeholder="Add a brief description of this document..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!isUploading ? (
                  <Button
                    onClick={handleUpload}
                    className="flex-1 bg-primary text-primary-foreground"
                    size="lg"
                  >
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Upload to Management Service
                  </Button>
                ) : (
                  <div className="flex-1 py-6 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50/50 dark:bg-slate-900/20 backdrop-blur-sm">
                    <InlineChessLoader duration={5} />
                    <p className="text-xs font-medium animate-pulse mt-2">Uploading and preparing document...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Query Chunks Section */}
        <div className="mb-4 mt-8 text-center max-w-3xl mx-auto font-['Courier_New',monospace]">
          <h2 className="text-xl mb-2 text-muted-foreground">Query Document Chunks</h2>
        </div>

        <div className="space-y-6 max-w-3xl mx-auto mb-12">
          <div
            className="p-6 border-2 border-slate-300 dark:border-slate-700 rounded-sm backdrop-blur-sm"
            style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
          >
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Select Document</label>
                <select
                  className="w-full text-sm p-2 rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  onChange={(e) => setQueryDocId(e.target.value)}
                  value={queryDocId}
                  disabled={isQueryingChunks || availableDocuments.length === 0}
                >
                  <option value="">{availableDocuments.length === 0 ? "Loading documents..." : "Select existing..."}</option>
                  {availableDocuments.map(doc => (
                    <option key={doc.document_id} value={doc.document_id}>
                      {doc.title || doc.document_id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Version Number</label>
                <input
                  type="number"
                  min="1"
                  value={queryVersionNo}
                  onChange={(e) => setQueryVersionNo(e.target.value)}
                  disabled={isQueryingChunks}
                  className="w-full text-sm p-2 rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. 1"
                />
              </div>

              <Button
                onClick={async () => {
                  const selectedDoc = availableDocuments.find(d => d.document_id === queryDocId);
                  const orgIdToUse = selectedDoc?.organization_id || user?.id;

                  if (!orgIdToUse || !queryDocId || !queryVersionNo) {
                    toast({
                      variant: "warning",
                      title: "Missing info",
                      description: "Please select a document and enter a version number.",
                    });
                    return;
                  }

                  setIsQueryingChunks(true);
                  setQueryChunksResult(null);

                  try {
                    const result = await storageService.getChunks(orgIdToUse, queryDocId, parseInt(queryVersionNo));
                    // Check if it returned a struct with chunks or is a flat array
                    setQueryChunksResult(result.chunks ? result.chunks : result);
                  } catch (error) {
                    console.error("Error querying chunks:", error);
                    toast({
                      variant: "destructive",
                      title: "Query failed",
                      description: "Failed to query chunks. See console for details.",
                    });
                  } finally {
                    setIsQueryingChunks(false);
                  }
                }}
                className="w-full mt-4"
                size="lg"
                disabled={isQueryingChunks}
              >
                {isQueryingChunks ? (
                  <>
                    <UploadIcon className="mr-2 h-4 w-4 animate-bounce" />
                    Querying...
                  </>
                ) : (
                  "Fetch Sections"
                )}
              </Button>

              {queryChunksResult && (
                <div className="mt-6">
                  <h3 className="text-md font-semibold mb-2 flex items-center justify-between">
                    <span>Results ({Array.isArray(queryChunksResult) ? queryChunksResult.length : Object.keys(queryChunksResult).length} chunks)</span>
                    <Button variant="outline" size="sm" onClick={() => setQueryChunksResult(null)}>Clear</Button>
                  </h3>
                  <div className="max-h-80 overflow-y-auto rounded border border-border bg-black/50 p-4 text-xs font-mono text-green-400">
                    <pre className="whitespace-pre-wrap word-break">{JSON.stringify(queryChunksResult, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manage Documents Section */}
        {availableDocuments.length > 0 && (
          <>
            <div className="mb-4 mt-8 text-center max-w-3xl mx-auto font-['Courier_New',monospace]">
              <h2 className="text-xl mb-2 text-muted-foreground">Manage Documents</h2>
            </div>
            <div className="space-y-2 max-w-3xl mx-auto mb-12">
              {availableDocuments.map(doc => (
                <div
                  key={doc.document_id}
                  className="flex items-center justify-between p-4 border border-slate-300 dark:border-slate-700 rounded-sm"
                  style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium truncate">{doc.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    className="p-1.5 rounded text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-40"
                    onClick={() => void handleDeleteDocument(doc)}
                    disabled={!!deletingDocId}
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Evaluate Document Section */}
        <div className="mb-4 mt-8 text-center max-w-3xl mx-auto font-['Courier_New',monospace]">
          <h2 className="text-xl mb-2 text-muted-foreground">Evaluate Document Tasks</h2>
        </div>
        <div className="space-y-4 max-w-3xl mx-auto mb-12">
          <div
            className="p-6 border-2 border-slate-300 dark:border-slate-700 rounded-sm"
            style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
          >
            <div className="space-y-4">
              {/* Doc & version selectors */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">Document</label>
                  <select
                    className="w-full text-sm p-2 rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    value={evalDocId}
                    onChange={e => { setEvalDocId(e.target.value); setEvalResults(null) }}
                    disabled={isEvaluating || availableDocuments.length === 0}
                  >
                    <option value="">{availableDocuments.length === 0 ? "No documents" : "Select document..."}</option>
                    {availableDocuments.map(doc => (
                      <option key={doc.document_id} value={doc.document_id}>
                        {doc.title || doc.document_id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Version</label>
                  <input
                    type="number" min="1"
                    value={evalVersionNo}
                    onChange={e => setEvalVersionNo(e.target.value)}
                    disabled={isEvaluating}
                    className="w-full text-sm p-2 rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Task groups */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Task Groups</label>
                  <Button
                    size="sm" variant="outline"
                    onClick={addTaskGroup}
                    disabled={isEvaluating}
                    className="text-xs h-7"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Group
                  </Button>
                </div>
                {evalTaskGroups.map((group, gi) => (
                  <div key={gi} className="border border-dashed border-slate-300 dark:border-slate-600 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Group {gi + 1}</span>
                      {evalTaskGroups.length > 1 && (
                        <button
                          onClick={() => removeTaskGroup(gi)}
                          disabled={isEvaluating}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {group.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={e => updateGroupItem(gi, ii, e.target.value)}
                          disabled={isEvaluating}
                          placeholder={`Task item ${ii + 1}...`}
                          className="flex-1 text-sm p-1.5 rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {group.length > 1 && (
                          <button
                            onClick={() => removeItemFromGroup(gi, ii)}
                            disabled={isEvaluating}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addItemToGroup(gi)}
                      disabled={isEvaluating}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add item
                    </button>
                  </div>
                ))}
              </div>

              {!isEvaluating ? (
                <Button
                  onClick={handleEvaluate}
                  disabled={!evalDocId}
                  className="w-full"
                  size="lg"
                >
                  <Bot className="mr-2 h-4 w-4" />Run AI Evaluation
                </Button>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 rounded-sm bg-slate-50/50 dark:bg-slate-900/20 backdrop-blur-sm">
                  <InlineChessLoader duration={8} />
                  <p className="text-xs font-medium animate-pulse mt-2">AI is evaluating your document tasks...</p>
                </div>
              )}

              {/* Results */}
              {evalResults && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-semibold mb-2">Results ({evalResults.length})</h3>
                  {evalResults.map((r, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded border transition-colors",
                        r.exists
                          ? "border-green-500/40 bg-green-500/5"
                          : "border-red-500/40 bg-red-500/5"
                      )}
                    >
                      <button
                        className="w-full flex items-center gap-3 p-3 text-left"
                        onClick={() =>
                          setExpandedResults(prev => {
                            const next = new Set(prev)
                            if (next.has(i)) {
                              next.delete(i)
                            } else {
                              next.add(i)
                            }
                            return next
                          })
                        }
                      >
                        {r.exists
                          ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          : <X className="h-4 w-4 text-red-500 shrink-0" />
                        }
                        <span className="text-sm flex-1 font-medium truncate">
                          {r.task.join(" · ")}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                            expandedResults.has(i) && "rotate-90"
                          )}
                        />
                      </button>
                      {expandedResults.has(i) && (
                        <div className="px-3 pb-3">
                          <p className="text-xs text-muted-foreground leading-relaxed">{r.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => { setEvalResults(null); setExpandedResults(new Set()) }}
                  >
                    Clear Results
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

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
  )
}

