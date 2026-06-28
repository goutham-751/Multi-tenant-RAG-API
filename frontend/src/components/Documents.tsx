import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { GlassCard } from './ui/GlassCard'
import { UploadCloud, FileText, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useTenantStore } from '../store/useTenantStore'
import { motion, AnimatePresence } from 'framer-motion'

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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'
      const res = await fetch(`${API_URL}/api/v1/documents`, {
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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'
      const res = await fetch(`${API_URL}/api/v1/documents/${docName}`, {
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
      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer
            ${isDragging
              ? 'border-accent-primary bg-accent-primary/[0.04] scale-[1.01]'
              : 'border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]'
            }
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
            <Loader2 size={36} className="text-accent-primary animate-spin mb-4" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <UploadCloud size={24} className="text-text-secondary" />
            </div>
          )}

          <h3 className="text-base font-semibold text-text-primary mb-1">
            {isUploading ? 'Processing document...' : 'Upload a document'}
          </h3>
          <p className="text-text-secondary text-sm max-w-sm">
            {isUploading
              ? 'Chunking and embedding text. This may take a moment.'
              : 'Drag and drop or click to browse. Supports PDF, TXT, MD up to 10MB.'}
          </p>

          <AnimatePresence>
            {uploadError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-3 bg-status-danger/10 text-status-danger text-sm rounded-lg border border-status-danger/20 flex items-center"
              >
                <AlertCircle size={15} className="mr-2 shrink-0" />
                {uploadError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Documents Table */}
      {documents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <GlassCard className="overflow-hidden" disableTilt>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-tertiary uppercase tracking-wider bg-white/[0.02] border-b border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3.5 font-medium">Document Name</th>
                  <th className="px-6 py-3.5 font-medium">Chunks</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                  <th className="px-6 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {documents.map((doc, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-text-primary flex items-center">
                      <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center mr-3">
                        <FileText size={14} className="text-accent-primary" />
                      </div>
                      {doc.doc_name}
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-mono text-xs">{doc.chunk_count}</td>
                    <td className="px-6 py-4">
                      <Badge variant="success">
                        <CheckCircle2 size={11} className="mr-1 inline-block" /> Ready
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-text-tertiary hover:text-status-danger hover:bg-status-danger/10"
                        onClick={() => handleDelete(doc.doc_name)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </motion.div>
      )}
    </div>
  )
}
