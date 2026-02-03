'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'
import { exportToPDF, exportToExcel, type ExportData } from '@/lib/export'
import html2canvas from 'html2canvas'
import { getOverviewStats, getPosts, getSentimentStats } from '@/lib/api'
import {
  overviewStatsToKPIs,
  overviewStatsToPlatformMetrics,
  apiPostToPost,
  sentimentStatsToDistribution
} from '@/lib/adapters'
import { useFilters } from '@/contexts/filters-context'
import { toast } from 'sonner'
import { PdfPreviewModal } from '@/components/pdf-preview-modal'

interface ExportButtonProps {
  dateRange?: { from?: Date; to?: Date } | null
  selectedSources: string[]
  sources: Array<{ id: string; label?: string; url: string }>
}

export function ExportButton({ dateRange, selectedSources, sources }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfFileName, setPdfFileName] = useState('')

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setExporting(true)
      
      // Prepare filters
      const dateFrom = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : undefined
      const dateTo = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : undefined
      const profileIds = selectedSources.length > 0 ? selectedSources.map(id => parseInt(id)) : undefined
      
      const sourceName = selectedSources.length === 0
        ? 'Todas las fuentes'
        : selectedSources.length === 1
        ? sources.find(s => s.id === selectedSources[0])?.label || sources.find(s => s.id === selectedSources[0])?.url.split('/').pop() || 'Fuente seleccionada'
        : `${selectedSources.length} fuentes seleccionadas`

      toast.info('Generando reporte...', { duration: 2000 })

      // Fetch all data - handle multiple profiles
      let statsResponse, postsResponse, sentimentResponse
      
      if (profileIds && profileIds.length > 0) {
        // Multiple profiles - combine results
        const allStatsPromises = profileIds.map(id => getOverviewStats(undefined, id, dateFrom, dateTo))
        const allPostsPromises = profileIds.map(id => getPosts({ limit: 500, date_from: dateFrom, date_to: dateTo, profile_id: id }))
        const allSentimentPromises = profileIds.map(id => getSentimentStats(undefined, id).catch(() => null))
        
        const [allStats, allPosts, allSentiments] = await Promise.all([
          Promise.all(allStatsPromises),
          Promise.all(allPostsPromises),
          Promise.all(allSentimentPromises)
        ])
        
        // Combine stats
        statsResponse = allStats.reduce((acc, stats) => {
          acc.total_posts += stats.total_posts
          acc.total_interactions += stats.total_interactions
          acc.total_comments += stats.total_comments
          acc.avg_interactions = (acc.avg_interactions * (acc.total_posts - stats.total_posts) + stats.avg_interactions * stats.total_posts) / acc.total_posts || 0
          stats.platforms.forEach(p => {
            const existing = acc.platforms.find(pl => pl.platform === p.platform)
            if (existing) {
              existing.posts += p.posts
              existing.interactions += p.interactions
              existing.comments += p.comments
            } else {
              acc.platforms.push({ ...p })
            }
          })
          return acc
        }, {
          total_posts: 0,
          total_interactions: 0,
          total_comments: 0,
          avg_interactions: 0,
          platforms: [] as Array<{ platform: string; posts: number; interactions: number; comments: number }>
        })
        
        // Combine posts
        const allPostsData = allPosts.flatMap(response => response.data || [])
        const uniquePosts = Array.from(
          new Map(allPostsData.map(post => [post.post_id, post])).values()
        )
        postsResponse = {
          data: uniquePosts,
          total: uniquePosts.length,
          limit: 500,
          offset: 0
        }
        
        // Combine sentiment
        const validSentiments = allSentiments.filter(s => s !== null)
        if (validSentiments.length > 0) {
          sentimentResponse = validSentiments.reduce((acc, s) => {
            if (s) {
              acc.total += s.total
              acc.positive += s.positive
              acc.negative += s.negative
              acc.neutral += s.neutral
            }
            return acc
          }, { total: 0, positive: 0, negative: 0, neutral: 0, percentages: { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0 } })
          
          if (sentimentResponse.total > 0) {
            sentimentResponse.percentages.POSITIVE = (sentimentResponse.positive / sentimentResponse.total) * 100
            sentimentResponse.percentages.NEGATIVE = (sentimentResponse.negative / sentimentResponse.total) * 100
            sentimentResponse.percentages.NEUTRAL = (sentimentResponse.neutral / sentimentResponse.total) * 100
          }
        } else {
          sentimentResponse = null
        }
      } else {
        // All profiles or no selection
        [statsResponse, postsResponse, sentimentResponse] = await Promise.all([
          getOverviewStats(undefined, undefined, dateFrom, dateTo),
          getPosts({ limit: 500, date_from: dateFrom, date_to: dateTo, profile_id: undefined }),
          getSentimentStats(undefined, undefined).catch(() => null)
        ])
      }

      // Transform data
      const kpis = overviewStatsToKPIs(statsResponse)
      const postsData = Array.isArray(postsResponse.data) ? postsResponse.data : []
      const platformMetrics = overviewStatsToPlatformMetrics(statsResponse, postsData)
      const posts = postsData.map(apiPostToPost).sort((a, b) => b.engagementRate - a.engagementRate)

      // Prepare chart data from posts
      const interactionsOverTime = posts.slice(0, 30).map(p => ({
        date: new Date(p.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        reach: p.reach,
        interactions: p.interactions
      }))
      
      const topDays = posts
        .map(p => ({
          date: new Date(p.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          reach: p.reach
        }))
        .sort((a, b) => b.reach - a.reach)
        .slice(0, 7)
      
      const platformDistribution = platformMetrics.map(p => ({
        platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
        value: p.interactions
      }))
      
      const sentimentDistribution = sentimentResponse ? [
        { name: 'Positivo', value: sentimentStatsToDistribution(sentimentResponse).positive, color: 'rgb(34, 197, 94)' },
        { name: 'Neutral', value: sentimentStatsToDistribution(sentimentResponse).neutral, color: 'rgb(148, 163, 184)' },
        { name: 'Negativo', value: sentimentStatsToDistribution(sentimentResponse).negative, color: 'rgb(239, 68, 68)' }
      ] : undefined

      // Prepare export data
      const exportData: ExportData = {
        kpis: kpis.map(kpi => ({
          label: kpi.label,
          value: typeof kpi.value === 'number' 
            ? new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(kpi.value)
            : String(kpi.value),
          change: `${kpi.change >= 0 ? '+' : ''}${kpi.change}%`
        })),
        platformMetrics: platformMetrics.map(p => ({
          platform: p.platform,
          reach: p.reach,
          interactions: p.interactions,
          engagementRate: p.engagementRate,
          comments: p.comments
        })),
        posts: posts.map(p => ({
          platform: p.platform,
          caption: p.caption,
          date: p.date,
          reach: p.reach,
          interactions: p.interactions,
          likes: p.likes,
          comments: p.comments,
          engagementRate: p.engagementRate
        })),
        sentimentStats: sentimentResponse ? {
          total: sentimentResponse.total,
          positive: sentimentStatsToDistribution(sentimentResponse).positive,
          neutral: sentimentStatsToDistribution(sentimentResponse).neutral,
          negative: sentimentStatsToDistribution(sentimentResponse).negative
        } : undefined,
        dateRange: dateFrom && dateTo ? {
          from: new Date(dateFrom).toLocaleDateString('es-ES'),
          to: new Date(dateTo).toLocaleDateString('es-ES')
        } : undefined,
        selectedSource: sourceName,
        chartData: {
          interactionsOverTime: interactionsOverTime.map(d => ({
            date: d.date,
            reach: d.reach,
            interactions: d.interactions
          })),
          topDays: topDays,
          platformDistribution: platformDistribution,
          sentimentDistribution: sentimentDistribution
        }
      }

      // Export based on format
      if (format === 'pdf') {
        try {
          // Capture chart elements from the page
          const chartImages: string[] = []
          
          toast.info('Capturando gráficas...', { duration: 3000 })
          
          // Wait longer for charts to fully render
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Scroll to top to ensure all charts are visible
          window.scrollTo({ top: 0, behavior: 'instant' })
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Try multiple strategies to find charts
          console.log('=== Starting chart capture ===')
          
          // Strategy 1: Find all Card elements that contain charts
          const allCards = document.querySelectorAll('[class*="Card"], .bg-card, [data-slot="card"]')
          console.log(`Found ${allCards.length} card elements`)
          
          for (let i = 0; i < allCards.length; i++) {
            const card = allCards[i] as HTMLElement
            
            // Check if this card contains any chart elements
            const hasRecharts = card.querySelector('.recharts-responsive-container, .recharts-wrapper, .recharts-surface, svg.recharts-surface')
            
            if (hasRecharts) {
              try {
                console.log(`Attempting to capture card ${i + 1}...`)
                
                // Scroll element into view
                card.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' })
                await new Promise(resolve => setTimeout(resolve, 300))
                
                // Get the actual chart container (ResponsiveContainer or wrapper)
                const chartElement = card.querySelector('.recharts-responsive-container') || 
                                    card.querySelector('.recharts-wrapper') ||
                                    card
                
                const canvas = await html2canvas(chartElement as HTMLElement, {
                  backgroundColor: '#ffffff',
                  scale: 2,
                  logging: false,
                  useCORS: true,
                  allowTaint: false,
                  removeContainer: false,
                  ignoreElements: (element) => {
                    // Ignore tooltips and popovers
                    return element.classList.contains('recharts-tooltip-wrapper') ||
                           element.classList.contains('recharts-active-shape') ||
                           element.classList.contains('recharts-tooltip-cursor')
                  },
                  onclone: (clonedDoc) => {
                    // Fix color issues in cloned document
                    const style = clonedDoc.createElement('style')
                    style.textContent = `
                      * { color: rgb(0, 0, 0) !important; }
                      .recharts-wrapper { background: white !important; }
                    `
                    clonedDoc.head.appendChild(style)
                  }
                })
                
                const imageData = canvas.toDataURL('image/png', 0.9)
                chartImages.push(imageData)
                console.log(`✓ Successfully captured chart ${chartImages.length}`)
                
                // Limit to 8 charts
                if (chartImages.length >= 8) break
              } catch (err) {
                console.error(`✗ Error capturing card ${i + 1}:`, err)
              }
            }
          }
          
          // Strategy 2: Direct SVG capture if no charts found
          if (chartImages.length === 0) {
            console.log('Trying direct SVG capture...')
            const svgElements = document.querySelectorAll('svg.recharts-surface')
            console.log(`Found ${svgElements.length} SVG elements`)
            
            for (let i = 0; i < Math.min(svgElements.length, 8); i++) {
              const svg = svgElements[i] as HTMLElement
              const parent = svg.closest('[class*="Card"], .bg-card') || svg.parentElement?.parentElement
              
              if (parent) {
                try {
                  parent.scrollIntoView({ behavior: 'instant', block: 'center' })
                  await new Promise(resolve => setTimeout(resolve, 300))
                  
                  const canvas = await html2canvas(parent as HTMLElement, {
                    backgroundColor: '#ffffff',
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    allowTaint: false
                  })
                  
                  chartImages.push(canvas.toDataURL('image/png', 0.9))
                  console.log(`✓ Captured SVG chart ${chartImages.length}`)
                } catch (err) {
                  console.error(`✗ Error capturing SVG ${i}:`, err)
                }
              }
            }
          }
          
          console.log(`=== Total charts captured: ${chartImages.length} ===`)
          
          if (chartImages.length === 0) {
            console.error('No charts captured! Debug info:', {
              cards: document.querySelectorAll('[class*="Card"]').length,
              responsiveContainers: document.querySelectorAll('.recharts-responsive-container').length,
              rechartsWrappers: document.querySelectorAll('.recharts-wrapper').length,
              svgElements: document.querySelectorAll('svg.recharts-surface').length,
              allSVGs: document.querySelectorAll('svg').length
            })
            
            // Show error to user
            toast.warning('No se pudieron capturar las gráficas. El PDF se generará solo con tablas de datos.')
          } else {
            toast.success(`${chartImages.length} gráfica(s) capturada(s)`, { duration: 2000 })
          }
          
          // Generate PDF and get blob for preview
          const blob = await exportToPDF(exportData, chartImages, true) as Blob
          setPdfBlob(blob)
          setPdfFileName(`dashboard-reporte-${new Date().toISOString().split('T')[0]}.pdf`)
          setPreviewOpen(true)
          toast.success('Reporte PDF generado. Revisa la vista previa.')
        } catch (pdfError: any) {
          console.error('Error exporting PDF:', pdfError)
          toast.error(pdfError.message || 'Error al generar el reporte PDF. Por favor, intenta de nuevo.')
          throw pdfError
        }
      } else {
        try {
          exportToExcel(exportData)
          toast.success('Reporte Excel generado exitosamente')
        } catch (excelError: any) {
          console.error('Error exporting Excel:', excelError)
          toast.error(excelError.message || 'Error al generar el reporte Excel. Por favor, intenta de nuevo.')
          throw excelError
        }
      }
    } catch (error: any) {
      console.error('Error exporting:', error)
      if (!error.message || error.message.includes('Error al')) {
        // Already handled above
        return
      }
      toast.error('Error al generar el reporte. Por favor, intenta de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => handleExport('pdf')}
            disabled={exporting}
          >
            <FileText className="mr-2 h-4 w-4" />
            Exportar como PDF
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleExport('excel')}
            disabled={exporting}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar como Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        pdfBlob={pdfBlob}
        fileName={pdfFileName}
        onDownload={() => {
          setPreviewOpen(false)
          toast.success('PDF descargado exitosamente')
        }}
      />
    </>
  )
}
