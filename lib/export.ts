import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'
import { drawLineChart, drawBarChart, drawDonutChart } from './chart-generator'

export interface ExportData {
  kpis: Array<{ label: string; value: string; change: string }>
  platformMetrics: Array<{
    platform: string
    reach: number
    interactions: number
    engagementRate: number
    comments: number
  }>
  posts: Array<{
    platform: string
    caption: string
    date: string
    reach: number
    interactions: number
    likes: number
    comments: number
    engagementRate: number
  }>
  sentimentStats?: {
    total: number
    positive: number
    neutral: number
    negative: number
  }
  dateRange?: {
    from: string
    to: string
  }
  selectedSource?: string
  // Chart data for direct PDF generation
  chartData?: {
    interactionsOverTime?: Array<{ date: string; reach: number; interactions: number }>
    topDays?: Array<{ date: string; reach: number }>
    platformDistribution?: Array<{ platform: string; value: number }>
    sentimentDistribution?: Array<{ name: string; value: number; color: string }>
  }
}

export async function exportToPDF(data: ExportData, chartImages?: string[], returnBlob?: boolean): Promise<Blob | void> {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPosition = 20

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Reporte de Dashboard - Analytics', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 10

  // Date range
  if (data.dateRange) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Período: ${data.dateRange.from} - ${data.dateRange.to}`,
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    )
    yPosition += 5
  }

  if (data.selectedSource && data.selectedSource !== 'all') {
    doc.setFontSize(10)
    doc.text(`Fuente: ${data.selectedSource}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 5
  }

  yPosition += 10

  // Generate charts directly in PDF using data
  if (data.chartData) {
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Gráficas y Visualizaciones', 14, yPosition)
    yPosition += 12
    
    const margin = 14
    const chartsPerRow = 2
    const spacing = 4
    const chartWidth = (pageWidth - (margin * 2) - spacing) / chartsPerRow
    const chartHeight = 60
    
    // Chart 1: Interactions Over Time (Line Chart)
    if (data.chartData.interactionsOverTime && data.chartData.interactionsOverTime.length > 0) {
      if (yPosition + chartHeight > pageHeight - 30) {
        doc.addPage()
        yPosition = 20
      }
      
      const chartData = data.chartData.interactionsOverTime.slice(-15).map(d => ({
        date: d.date,
        value: d.interactions
      }))
      
      drawLineChart(
        doc,
        chartData,
        {
          x: margin,
          y: yPosition,
          width: chartWidth,
          height: chartHeight,
          title: 'Evolución de Interacciones'
        },
        'Interacciones'
      )
      
      // Move to next row if we've placed 2 charts
      if (data.chartData.topDays && data.chartData.topDays.length > 0) {
        // Chart 2: Top Days (Bar Chart) - same row
        drawBarChart(
          doc,
          data.chartData.topDays.map(d => ({
            label: d.date,
            value: d.reach
          })),
          {
            x: margin + chartWidth + spacing,
            y: yPosition,
            width: chartWidth,
            height: chartHeight,
            title: 'Mejores Días por Alcance'
          },
          [59, 130, 246]
        )
        yPosition += chartHeight + 10
      } else {
        yPosition += chartHeight + 10
      }
    }
    
    // Chart 3: Platform Distribution (Donut Chart)
    if (data.chartData.platformDistribution && data.chartData.platformDistribution.length > 0) {
      if (yPosition + chartHeight > pageHeight - 30) {
        doc.addPage()
        yPosition = 20
      }
      
      const totalInteractions = data.chartData.platformDistribution.reduce((sum, p) => sum + p.value, 0)
      const donutData = data.chartData.platformDistribution.map(p => {
        const platformLower = p.platform.toLowerCase()
        let color = 'rgb(59, 130, 246)' // Default blue
        if (platformLower.includes('facebook')) {
          color = 'rgb(24, 119, 242)' // Facebook blue
        } else if (platformLower.includes('instagram')) {
          color = 'rgb(225, 48, 108)' // Instagram pink
        } else if (platformLower.includes('tiktok')) {
          color = 'rgb(0, 0, 0)' // TikTok black
        }
        return {
          name: p.platform,
          value: totalInteractions > 0 ? (p.value / totalInteractions) * 100 : 0,
          color: color
        }
      })
      
      drawDonutChart(
        doc,
        donutData,
        {
          x: margin,
          y: yPosition,
          width: chartWidth,
          height: chartHeight,
          title: 'Distribución por Plataforma'
        }
      )
      
      // Chart 4: Sentiment Distribution (Donut Chart)
      if (data.chartData.sentimentDistribution && data.chartData.sentimentDistribution.length > 0) {
        drawDonutChart(
          doc,
          data.chartData.sentimentDistribution.map(s => ({
            name: s.name,
            value: s.value,
            color: s.color || 'rgb(148, 163, 184)'
          })),
          {
            x: margin + chartWidth + spacing,
            y: yPosition,
            width: chartWidth,
            height: chartHeight,
            title: 'Distribución de Sentimiento'
          }
        )
        yPosition += chartHeight + 10
      } else {
        yPosition += chartHeight + 10
      }
    }
    
    // Add separator line
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 10
    
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage()
      yPosition = 20
    }
  } else if (chartImages && chartImages.length > 0) {
    // Fallback: Use captured images if available
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Gráficas y Visualizaciones', 14, yPosition)
    yPosition += 12
    
    const margin = 14
    const chartsPerRow = 2
    const spacing = 4
    const chartWidth = (pageWidth - (margin * 2) - spacing) / chartsPerRow
    const chartHeight = 70 // Increased height for better visibility
    
    for (let i = 0; i < chartImages.length; i++) {
      // Check if we need a new page
      if (yPosition + chartHeight > pageHeight - 30) {
        doc.addPage()
        yPosition = 20
      }
      
      const isLeftColumn = i % chartsPerRow === 0
      const xPos = isLeftColumn ? margin : margin + chartWidth + spacing
      
      try {
        // Get image dimensions to maintain aspect ratio
        const img = new Image()
        const imageLoadPromise = new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = reject
          img.src = chartImages[i]
        })
        
        await imageLoadPromise
        
        // Calculate height maintaining aspect ratio
        const aspectRatio = img.height / img.width
        const calculatedHeight = chartWidth * aspectRatio
        const finalHeight = Math.min(calculatedHeight, chartHeight)
        
        doc.addImage(
          chartImages[i],
          'PNG',
          xPos,
          yPosition,
          chartWidth,
          finalHeight
        )
      } catch (error) {
        console.warn(`Error adding chart image ${i}:`, error)
        // Try without aspect ratio calculation
        try {
          doc.addImage(
            chartImages[i],
            'PNG',
            xPos,
            yPosition,
            chartWidth,
            chartHeight
          )
        } catch (err2) {
          console.error(`Failed to add chart ${i} even with fallback:`, err2)
        }
      }
      
      // Move to next row if we've placed 2 charts
      if ((i + 1) % chartsPerRow === 0) {
        yPosition += chartHeight + 8
      }
    }
    
    // If odd number of charts, move to next row
    if (chartImages.length % chartsPerRow !== 0) {
      yPosition += chartHeight + 12
    } else {
      yPosition += 8
    }
    
    // Add separator line
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 10
    
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage()
      yPosition = 20
    }
  } else {
    // If no charts, add a note
    doc.setFontSize(12)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(150, 150, 150)
    doc.text('Nota: Las gráficas no pudieron ser capturadas en este reporte.', 14, yPosition)
    doc.setTextColor(0, 0, 0)
    yPosition += 10
  }

  // KPIs Section
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Métricas Principales', 14, yPosition)
  yPosition += 8

  const kpiData = data.kpis.map(kpi => [
    kpi.label,
    kpi.value
  ])

  autoTable(doc, {
    startY: yPosition,
    head: [['Métrica', 'Valor']],
    body: kpiData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  })

  yPosition = (doc as any).lastAutoTable.finalY + 10

  // Check if we need a new page
  if (yPosition > pageHeight - 40) {
    doc.addPage()
    yPosition = 20
  }

  // Platform Metrics Section
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Rendimiento por Plataforma', 14, yPosition)
  yPosition += 8

  const platformData = data.platformMetrics.map(p => [
    p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(p.reach),
    new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(p.interactions),
    `${p.engagementRate.toFixed(2)}%`,
    new Intl.NumberFormat('es-ES').format(p.comments)
  ])

  autoTable(doc, {
    startY: yPosition,
    head: [['Plataforma', 'Alcance', 'Interacciones', 'Tasa de Participación', 'Comentarios']],
    body: platformData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  })

  yPosition = (doc as any).lastAutoTable.finalY + 10

  // Sentiment Stats Section
  if (data.sentimentStats && data.sentimentStats.total > 0) {
    if (yPosition > pageHeight - 40) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Análisis de Sentimiento', 14, yPosition)
    yPosition += 8

    const sentimentData = [
      ['Positivo', `${data.sentimentStats.positive.toFixed(1)}%`, Math.round(data.sentimentStats.total * (data.sentimentStats.positive / 100))],
      ['Neutral', `${data.sentimentStats.neutral.toFixed(1)}%`, Math.round(data.sentimentStats.total * (data.sentimentStats.neutral / 100))],
      ['Negativo', `${data.sentimentStats.negative.toFixed(1)}%`, Math.round(data.sentimentStats.total * (data.sentimentStats.negative / 100))],
      ['Total', '100%', data.sentimentStats.total]
    ]

    autoTable(doc, {
      startY: yPosition,
      head: [['Sentimiento', 'Porcentaje', 'Total Comentarios']],
      body: sentimentData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 }
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Top Posts Section
  if (yPosition > pageHeight - 40) {
    doc.addPage()
    yPosition = 20
  }

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Top Publicaciones', 14, yPosition)
  yPosition += 8

  const postsData = data.posts.slice(0, 20).map(post => [
    post.platform.charAt(0).toUpperCase() + post.platform.slice(1),
    post.caption.substring(0, 40) + (post.caption.length > 40 ? '...' : ''),
    new Date(post.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
    new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(post.reach),
    new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(post.interactions),
    `${post.engagementRate.toFixed(2)}%`
  ])

  autoTable(doc, {
    startY: yPosition,
    head: [['Plataforma', 'Publicación', 'Fecha', 'Alcance', 'Interacciones', 'Tasa de Participación']],
    body: postsData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
    columnStyles: {
      1: { cellWidth: 60 } // Caption column wider
    }
  })

  // Footer
  const totalPages = (doc as any).internal.pages.length - 1
  const now = new Date()
  const dateStr = now.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric'
  })
  const timeStr = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Página ${i} de ${totalPages} - Generado el ${dateStr} a las ${timeStr}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  // Return blob or save PDF
  try {
    if (returnBlob) {
      // Return as blob for preview
      const pdfBlob = doc.output('blob')
      return pdfBlob
    } else {
      // Save directly
      const fileName = `dashboard-reporte-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    }
  } catch (error) {
    console.error('Error saving PDF:', error)
    throw new Error('Error al guardar el archivo PDF')
  }
}

export function exportToExcel(data: ExportData): void {
  const workbook = XLSX.utils.book_new()

  // KPIs Sheet
  const kpiData = [
    ['Métrica', 'Valor'],
    ...data.kpis.map(kpi => [kpi.label, kpi.value])
  ]
  const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData)
  XLSX.utils.book_append_sheet(workbook, kpiSheet, 'Métricas Principales')

  // Platform Metrics Sheet
  const platformData = [
    ['Plataforma', 'Alcance', 'Interacciones', 'Tasa de Participación (%)', 'Comentarios'],
    ...data.platformMetrics.map(p => [
      p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
      p.reach,
      p.interactions,
      p.engagementRate,
      p.comments
    ])
  ]
  const platformSheet = XLSX.utils.aoa_to_sheet(platformData)
  XLSX.utils.book_append_sheet(workbook, platformSheet, 'Rendimiento por Plataforma')

  // Posts Sheet
  const postsData = [
    ['Plataforma', 'Publicación', 'Fecha', 'Alcance', 'Interacciones', 'Me Gusta', 'Comentarios', 'Tasa de Participación (%)'],
    ...data.posts.map(post => [
      post.platform.charAt(0).toUpperCase() + post.platform.slice(1),
      post.caption,
      new Date(post.date).toLocaleDateString('es-ES'),
      post.reach,
      post.interactions,
      post.likes,
      post.comments,
      post.engagementRate
    ])
  ]
  const postsSheet = XLSX.utils.aoa_to_sheet(postsData)
  XLSX.utils.book_append_sheet(workbook, postsSheet, 'Publicaciones')

  // Sentiment Stats Sheet
  if (data.sentimentStats && data.sentimentStats.total > 0) {
    const sentimentData = [
      ['Sentimiento', 'Porcentaje (%)', 'Total Comentarios'],
      ['Positivo', data.sentimentStats.positive, Math.round(data.sentimentStats.total * (data.sentimentStats.positive / 100))],
      ['Neutral', data.sentimentStats.neutral, Math.round(data.sentimentStats.total * (data.sentimentStats.neutral / 100))],
      ['Negativo', data.sentimentStats.negative, Math.round(data.sentimentStats.total * (data.sentimentStats.negative / 100))],
      ['Total', 100, data.sentimentStats.total]
    ]
    const sentimentSheet = XLSX.utils.aoa_to_sheet(sentimentData)
    XLSX.utils.book_append_sheet(workbook, sentimentSheet, 'Análisis de Sentimiento')
  }

  // Summary Sheet
  const summaryData = [
    ['Resumen del Reporte'],
    [''],
    ['Período', data.dateRange ? `${data.dateRange.from} - ${data.dateRange.to}` : 'Todos los datos'],
    ['Fuente', data.selectedSource && data.selectedSource !== 'all' ? data.selectedSource : 'Todas las fuentes'],
    ['Fecha de Generación', new Date().toLocaleString('es-ES')],
    [''],
    ['Total de Publicaciones', data.posts.length],
    ['Total de Plataformas', data.platformMetrics.length],
    ...(data.sentimentStats ? [['Total de Comentarios Analizados', data.sentimentStats.total]] : [])
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')

  // Save Excel
  try {
    const fileName = `dashboard-reporte-${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
  } catch (error) {
    console.error('Error saving Excel:', error)
    throw new Error('Error al guardar el archivo Excel')
  }
}
