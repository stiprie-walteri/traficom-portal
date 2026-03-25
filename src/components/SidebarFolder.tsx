import { useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, ChevronRight, Folder, FolderOpen, Trash2, Pencil } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StoredDocument } from "@/lib/documentStorageService"

interface SidebarFolderProps {
  folderId: string
  folderName: string
  documents: StoredDocument[]
  onRename: (folderId: string, newName: string) => void
  onDelete: (folderId: string) => void
  onDeleteDocument: (docId: string) => void
  isActive: (path: string) => boolean
  onNavClick: () => void
}

export function SidebarFolder({
  folderId,
  folderName,
  documents,
  onRename,
  onDelete,
  onDeleteDocument,
  isActive,
  onNavClick,
}: SidebarFolderProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(folderName)
  const inputRef = useRef<HTMLInputElement>(null)

  const { isOver, setNodeRef } = useDroppable({ id: folderId })

  useEffect(() => {
    if (isEditing) inputRef.current?.select()
  }, [isEditing])

  const commitRename = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== folderName) onRename(folderId, trimmed)
    else setEditValue(folderName)
    setIsEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-sm transition-colors",
        isOver && "bg-primary/10 ring-1 ring-primary/30"
      )}
    >
      {/* Folder header */}
      <div className="group flex items-center gap-1.5 px-3 py-1.5 rounded-sm hover:bg-[hsl(var(--sidebar-hover))] cursor-pointer select-none">
        <button
          className="flex items-center gap-1.5 flex-1 min-w-0"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen
            ? <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
            : <Folder className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
          }
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename()
                if (e.key === "Escape") { setEditValue(folderName); setIsEditing(false) }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 text-xs bg-transparent border-b border-primary outline-none"
            />
          ) : (
            <span
              className="text-xs font-medium text-muted-foreground truncate flex-1 text-left"
              onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
            >
              {folderName}
            </span>
          )}
          {!isEditing && (
            <span className="text-xs text-muted-foreground flex-shrink-0 ml-1">
              {documents.length}
            </span>
          )}
          {isOpen
            ? <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          }
        </button>

        {/* Hover actions */}
        {!isEditing && (
          <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Rename folder"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(folderId) }}
              className="p-0.5 rounded text-muted-foreground hover:text-red-500 transition-colors"
              title="Delete folder"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Documents in folder */}
      {isOpen && documents.length > 0 && (
        <div className="pl-5 space-y-0.5">
          {documents.map((doc) => {
            const docPath = `/dashboard/document/${doc.document_id}`
            return (
              <div key={doc.document_id} className="group relative">
                <Link to={docPath} onClick={onNavClick}>
                  <div
                    className={cn(
                      "px-3 py-2 transition-all duration-200 cursor-pointer rounded-sm overflow-hidden",
                      isActive(docPath)
                        ? "bg-[hsl(var(--sidebar-active))]"
                        : "hover:bg-[hsl(var(--sidebar-hover))]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                      <h3 className="text-xs leading-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                        {doc.title || "Untitled"}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteDocument(doc.document_id) }}
                        title="Delete document"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {isOpen && documents.length === 0 && (
        <p className="pl-8 py-1 text-xs text-muted-foreground/50 italic">Empty</p>
      )}
    </div>
  )
}
