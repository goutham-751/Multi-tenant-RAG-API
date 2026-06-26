import React, { useState, useRef } from 'react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { UploadCloud, FileText, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useTenantStore } from '../store/useTenantStore'

interface Document {
  doc_name: string;
  chunk_count: number;
}

export function Documents({ 
  documents, 
  onUploadComplete, 
  onDelete 
}: { 
  documents: Document[], 
  onUploadComplete: () => void,
  onDelete: (name: string) => void 
}) {
  const { sessionToken } = useTenantStore()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    const validTypes = ['text/plain', 'application/pdf', 'text/markdown']
    const validExtensions = ['.txt', '.pdf', '.md']
    
    const isValidType = validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    
    if (!isValidType) {
      setUploadError("Only .txt, .pdf, and .md files are supported.")
      return
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size must be less than 10MB.")
      return
    }

    setUploadError(null)
    setIsUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('http://localhost:8001/api/v1/documents', {
        method: 'POST',
        headers: {
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: formData
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      
      onUploadComplete()
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (docName: string) => {
    if (!confirm(`Are you sure you want to delete ${docName}? This will remove all its chunks and cannot be undone.`)) return
    
    try {
      const res = await fetch(`http://localhost:8001/api/v1/documents/${docName}`, {
        method: 'DELETE',
        headers: {
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        }
      })
      if (res.ok) {
        onDelete(docName)
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-base
          ${isDragging ? 'border-accent-primary bg-accent-primary/5 scale-[1.02]' : 'border-border-default hover:bg-subtle hover:border-gray-300'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".txt,.pdf,.md"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
        />
        
        {isUploading ? (
          <Loader2 size={40} className="text-accent-primary animate-spin mb-4" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-subtle flex items-center justify-center mb-4 shadow-sm border border-border-default">
            <UploadCloud size={28} className="text-text-secondary" />
          </div>
        )}
        
        <h3 className="text-lg font-semibold text-text-primary mb-1">
          {isUploading ? 'Processing document...' : 'Upload a document'}
        </h3>
        <p className="text-text-secondary text-sm max-w-sm">
          {isUploading 
            ? 'Chunking and embedding text. This may take a moment.' 
            : 'Drag and drop or click to browse. Supports PDF, TXT, MD up to 10MB.'}
        </p>

        {uploadError && (
          <div className="mt-4 p-3 bg-status-danger/10 text-status-danger text-sm rounded-md border border-status-danger/20 flex items-center">
            <AlertCircle size={16} className="mr-2" />
            {uploadError}
          </div>
        )}
      </div>

      {documents.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-subtle text-text-secondary font-medium border-b border-border-default">
              <tr>
                <th className="px-6 py-3">Document Name</th>
                <th className="px-6 py-3">Chunks</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default bg-base">
              {documents.map((doc, i) => (
                <tr key={i} className="hover:bg-subtle/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-text-primary flex items-center">
                    <FileText size={16} className="mr-3 text-text-secondary" />
                    {doc.doc_name}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">{doc.chunk_count}</td>
                  <td className="px-6 py-4">
                    <Badge variant="success">
                      <CheckCircle2 size={12} className="mr-1 inline-block" /> Ready
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-text-secondary hover:text-status-danger hover:bg-status-danger/10"
                      onClick={() => handleDelete(doc.doc_name)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
