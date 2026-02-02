'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, X, Loader2 } from 'lucide-react'

interface PdfPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pdfBlob: Blob | null
  fileName: string
  onDownload: () => void
}

export function PdfPreviewModal({
  open,
  onOpenChange,
  pdfBlob,
  fileName,
  onDownload
}: PdfPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (pdfBlob && open) {
      setLoading(true)
      const url = URL.createObjectURL(pdfBlob)
      setPdfUrl(url)
      setLoading(false)

      // Cleanup URL when modal closes
      return () => {
        if (url) {
          URL.revokeObjectURL(url)
        }
      }
    } else {
      setPdfUrl(null)
    }
  }, [pdfBlob, open])

  const handleDownload = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      onDownload()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Vista Previa del Reporte PDF</DialogTitle>
          <DialogDescription>
            Revisa el reporte antes de descargarlo. Puedes hacer zoom y navegar por las páginas.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden border border-border rounded-lg bg-muted/50">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[500px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full min-h-[500px] border-0"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full min-h-[500px]">
              <p className="text-muted-foreground">No hay vista previa disponible</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
          <Button onClick={handleDownload} disabled={!pdfBlob}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
