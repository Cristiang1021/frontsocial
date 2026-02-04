'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { KPICard, KPICardSkeleton } from '@/components/kpi-card'
import { PlatformCard } from '@/components/platform-card'
import { PostsTable } from '@/components/posts-table'
import { LineChart } from '@/components/line-chart'
import { BarChart } from '@/components/bar-chart'
import { DonutChart } from '@/components/donut-chart'
import { ChartSkeleton, TableSkeleton, ErrorState, EmptyState } from '@/components/states'
import { getOverviewStats, getPosts, getSentimentStats, getMostRepeatedComments, getTopComplaints, processAllComments, type MostRepeatedComment, type TopComplaint } from '@/lib/api'
import {
  overviewStatsToKPIs,
  overviewStatsToPlatformMetrics,
  postsToMetricPoints,
  apiPostToPost,
  sentimentStatsToDistribution
} from '@/lib/adapters'
import { useFilters } from '@/contexts/filters-context'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, BarChart3, Users, Clock, Target, Share2, Check, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ViewState, Post, PlatformMetrics, KPIData, MetricPoint } from '@/types'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function OverviewPage() {
  const [state, setState] = useState<ViewState>('loading')
  const [kpis, setKpis] = useState<KPIData[]>([])
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics[]>([])
  const [topPosts, setTopPosts] = useState<Post[]>([])
  const [allPosts, setAllPosts] = useState<Post[]>([])
  const [interactionsData, setInteractionsData] = useState<MetricPoint[]>([])
  const [topDays, setTopDays] = useState<Array<{ date: string; reach: number }>>([])
  const [sentimentStats, setSentimentStats] = useState<any>(null)
  const [sentimentByPlatform, setSentimentByPlatform] = useState<Record<string, any>>({})
  const [mostRepeatedComments, setMostRepeatedComments] = useState<MostRepeatedComment[]>([])
  const [topComplaints, setTopComplaints] = useState<TopComplaint[]>([])
  const [loadingComplaints, setLoadingComplaints] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const postsPerPage = 10
  const [copied, setCopied] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const { dateRange, selectedSources } = useFilters()

  const handleShareView = () => {
    // Build share URL with current filters
    const params = new URLSearchParams()
    if (dateRange?.from) {
      params.set('from', dateRange.from.toISOString().split('T')[0])
    }
    if (dateRange?.to) {
      params.set('to', dateRange.to.toISOString().split('T')[0])
    }
    if (selectedSources.length > 0) {
      params.set('profiles', selectedSources.join(','))
    }
    
    const shareUrl = `${window.location.origin}/view${params.toString() ? `?${params.toString()}` : ''}`
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      toast.success('Link de vista pública copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error('Error al copiar el link')
    })
  }

  const handleExportDashboard = async () => {
    if (!dashboardRef.current) {
      toast.error('No se pudo capturar el dashboard')
      return
    }

    setIsExporting(true)
    toast.loading('Generando PDF del dashboard...', { id: 'export-pdf' })

    try {
      // Esperar un momento para asegurar que todo esté renderizado
      await new Promise(resolve => setTimeout(resolve, 500))

      if (!dashboardRef.current) {
        throw new Error('No se pudo acceder al dashboard')
      }

      // Inyectar un estilo CSS global que fuerce todos los colores a RGB antes de capturar
      // Esto es necesario porque html2canvas parsea los colores antes de que podamos convertirlos
      const styleId = 'html2canvas-force-rgb'
      let forceStyle = document.getElementById(styleId) as HTMLStyleElement
      if (!forceStyle) {
        forceStyle = document.createElement('style')
        forceStyle.id = styleId
        document.head.appendChild(forceStyle)
      }
      
      // Forzar TODOS los colores a RGB válidos usando !important
      // Esto sobrescribe cualquier color oklch()/lab() que pueda estar en variables CSS
      forceStyle.textContent = `
        :root {
          --background: rgb(255, 255, 255) !important;
          --foreground: rgb(0, 0, 0) !important;
          --card: rgb(255, 255, 255) !important;
          --card-foreground: rgb(0, 0, 0) !important;
          --popover: rgb(255, 255, 255) !important;
          --popover-foreground: rgb(0, 0, 0) !important;
          --primary: rgb(59, 130, 246) !important;
          --primary-foreground: rgb(255, 255, 255) !important;
          --secondary: rgb(245, 245, 245) !important;
          --secondary-foreground: rgb(0, 0, 0) !important;
          --muted: rgb(245, 245, 245) !important;
          --muted-foreground: rgb(107, 114, 128) !important;
          --accent: rgb(245, 245, 245) !important;
          --accent-foreground: rgb(0, 0, 0) !important;
          --destructive: rgb(239, 68, 68) !important;
          --destructive-foreground: rgb(255, 255, 255) !important;
          --border: rgb(229, 231, 235) !important;
          --input: rgb(229, 231, 235) !important;
          --ring: rgb(59, 130, 246) !important;
        }
        * {
          color: rgb(0, 0, 0) !important;
          background-color: rgb(255, 255, 255) !important;
          border-color: rgb(229, 231, 235) !important;
          fill: rgb(0, 0, 0) !important;
          stroke: rgb(229, 231, 235) !important;
        }
        [class*="bg-"] {
          background-color: rgb(255, 255, 255) !important;
        }
        [class*="text-"] {
          color: rgb(0, 0, 0) !important;
        }
        [class*="border-"] {
          border-color: rgb(229, 231, 235) !important;
        }
        svg, svg * {
          fill: rgb(0, 0, 0) !important;
          stroke: rgb(229, 231, 235) !important;
        }
      `
      
      // Esperar más tiempo para que los estilos se apliquen completamente
      await new Promise(resolve => setTimeout(resolve, 500))

      // Capturar el dashboard como imagen con opciones que eviten parsear colores lab()
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 1.5, // Calidad balanceada
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: dashboardRef.current.scrollWidth,
        windowHeight: dashboardRef.current.scrollHeight,
        allowTaint: true,
        removeContainer: false,
        imageTimeout: 15000,
        foreignObjectRendering: false,
        // Ignorar errores de parseo de colores
        onclone: (clonedDoc) => {
          // Intentar convertir cualquier color lab() restante en el documento clonado
          try {
            const allElements = clonedDoc.querySelectorAll('*')
            allElements.forEach((el: Element) => {
              const htmlEl = el as HTMLElement
              // Forzar estilos inline para evitar parseo de colores lab()
              if (!htmlEl.style.color || htmlEl.style.color.includes('lab')) {
                htmlEl.style.color = 'rgb(0, 0, 0)'
              }
              if (!htmlEl.style.backgroundColor || htmlEl.style.backgroundColor.includes('lab')) {
                htmlEl.style.backgroundColor = 'rgb(255, 255, 255)'
              }
              if (!htmlEl.style.borderColor || htmlEl.style.borderColor.includes('lab')) {
                htmlEl.style.borderColor = 'rgb(229, 231, 235)'
              }
            })
          } catch (e) {
            // Ignorar errores
          }
        }
      })

      const imgData = canvas.toDataURL('image/png', 0.95)
      
      // Calcular dimensiones del PDF (A4 landscape)
      const pdfWidth = 297 // mm (A4 landscape width)
      const pdfHeight = 210 // mm (A4 landscape height)
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / (imgWidth * 0.264583), pdfHeight / (imgHeight * 0.264583)) // Convert px to mm
      const finalWidth = imgWidth * 0.264583 * ratio
      const finalHeight = imgHeight * 0.264583 * ratio

      // Crear PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      // Agregar imagen al PDF
      pdf.addImage(imgData, 'PNG', 0, 0, finalWidth, finalHeight)

      // Generar nombre del archivo
      const dateStr = new Date().toISOString().split('T')[0]
      const filename = `dashboard-overview-${dateStr}.pdf`

      // Descargar PDF
      pdf.save(filename)
      
      // Remover el estilo forzado después de la captura
      const forceStyleToRemove = document.getElementById('html2canvas-force-rgb')
      if (forceStyleToRemove) {
        forceStyleToRemove.remove()
      }
      
      toast.success('Dashboard exportado como PDF', { id: 'export-pdf' })
    } catch (error) {
      console.error('Error exportando dashboard:', error)
      
      // Asegurar que se remueva el estilo forzado incluso si hay error
      const forceStyleToRemove = document.getElementById('html2canvas-force-rgb')
      if (forceStyleToRemove) {
        forceStyleToRemove.remove()
      }
      
      // Si el error es por colores lab(), sugerir una solución alternativa
      if (error instanceof Error && error.message.includes('lab')) {
        toast.error(
          'Error con colores modernos. Usa el botón "Generar Reporte" en la página de Reportes para obtener un PDF profesional.',
          { id: 'export-pdf', duration: 6000 }
        )
      } else {
        toast.error('Error al exportar el dashboard. Intenta de nuevo o usa el reporte PDF desde la página de Reportes.', { id: 'export-pdf', duration: 5000 })
      }
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        setState('loading')
        
        // Prepare date filters
        const dateFrom = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : undefined
        const dateTo = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : undefined
        const profileIds = selectedSources.length > 0 ? selectedSources.map(id => parseInt(id)) : undefined
        
        console.log('Loading overview with filters:', { dateFrom, dateTo, profileIds })
        
        // If multiple profiles selected, make multiple API calls and combine results
        if (profileIds && profileIds.length > 0) {
          // Load data for each profile in parallel
          const allPromises = profileIds.map(profileId => 
            Promise.all([
              getOverviewStats(undefined, profileId, dateFrom, dateTo),
              getPosts({ limit: 500, date_from: dateFrom, date_to: dateTo, profile_id: profileId }),
              getSentimentStats(undefined, profileId).catch(() => ({ total: 0, positive: 0, negative: 0, neutral: 0, percentages: { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0 } }))
            ])
          )
          
          const allResults = await Promise.all(allPromises)
          
          // Combine stats
          const combinedStats = allResults.reduce((acc, [stats]) => {
            acc.total_posts += stats.total_posts
            acc.total_interactions += stats.total_interactions
            acc.total_comments += stats.total_comments
            acc.avg_interactions = (acc.avg_interactions * (acc.total_posts - stats.total_posts) + stats.avg_interactions * stats.total_posts) / acc.total_posts || 0
            
            // Combine platforms
            stats.platforms.forEach(platform => {
              const existing = acc.platforms.find(p => p.platform === platform.platform)
              if (existing) {
                existing.posts += platform.posts
                existing.interactions += platform.interactions
                existing.comments += platform.comments
              } else {
                acc.platforms.push({ ...platform })
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
          const allPostsData = allResults.flatMap(([, posts]) => posts.data || [])
          const combinedPostsResponse = {
            data: allPostsData,
            total: allPostsData.length,
            limit: 500,
            offset: 0
          }
          
          // Combine sentiment stats
          const combinedSentiment = allResults.reduce((acc, [, , sentiment]) => {
            acc.total += sentiment.total
            acc.positive += sentiment.positive
            acc.negative += sentiment.negative
            acc.neutral += sentiment.neutral
            return acc
          }, { total: 0, positive: 0, negative: 0, neutral: 0, percentages: { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0 } })
          
          // Calculate percentages
          if (combinedSentiment.total > 0) {
            combinedSentiment.percentages.POSITIVE = (combinedSentiment.positive / combinedSentiment.total) * 100
            combinedSentiment.percentages.NEGATIVE = (combinedSentiment.negative / combinedSentiment.total) * 100
            combinedSentiment.percentages.NEUTRAL = (combinedSentiment.neutral / combinedSentiment.total) * 100
          }
          
          const statsResponse = combinedStats
          const postsResponse = combinedPostsResponse
          const sentimentResponse = combinedSentiment
          
          // Continue with existing logic...
          console.log('Overview data loaded:', {
            statsTotal: statsResponse.total_interactions,
            postsCount: postsResponse.data?.length || 0,
            platforms: statsResponse.platforms?.length || 0
          })

          // Transform data using adapters
          const kpisData = overviewStatsToKPIs(statsResponse)
          setKpis(kpisData)

          // Ensure postsResponse.data is an array
          const postsData = Array.isArray(postsResponse.data) ? postsResponse.data : []
          
          const platformMetricsData = overviewStatsToPlatformMetrics(statsResponse, postsData)
          setPlatformMetrics(platformMetricsData)

          // Convert API posts to frontend format
          const posts = postsData.map(apiPostToPost)
            .sort((a, b) => b.engagementRate - a.engagementRate)
          setAllPosts(posts)
          setTopPosts(posts.slice(0, 10))

          // Get sentiment stats by platform - combine for all profiles
          const sentimentByPlatformData: Record<string, any> = {}
          for (const platform of ['facebook', 'instagram', 'tiktok']) {
            try {
              const platformSentiments = await Promise.all(
                profileIds.map(profileId => 
                  getSentimentStats(platform, profileId).catch(() => null)
                )
              )
              const validSentiments = platformSentiments.filter(s => s && s.total > 0)
              if (validSentiments.length > 0) {
                const combined = validSentiments.reduce((acc, s) => {
                  acc.total += s!.total
                  acc.positive += s!.positive
                  acc.negative += s!.negative
                  acc.neutral += s!.neutral
                  return acc
                }, { total: 0, positive: 0, negative: 0, neutral: 0 })
                const dist = sentimentStatsToDistribution({
                  total: combined.total,
                  positive: combined.positive,
                  negative: combined.negative,
                  neutral: combined.neutral,
                  percentages: {
                    POSITIVE: combined.total > 0 ? (combined.positive / combined.total) * 100 : 0,
                    NEGATIVE: combined.total > 0 ? (combined.negative / combined.total) * 100 : 0,
                    NEUTRAL: combined.total > 0 ? (combined.neutral / combined.total) * 100 : 0
                  }
                })
                sentimentByPlatformData[platform] = {
                  total: combined.total,
                  positive: dist.positive,
                  neutral: dist.neutral,
                  negative: dist.negative
                }
              }
            } catch (error) {
              console.error(`Error loading sentiment for ${platform}:`, error)
            }
          }
          setSentimentByPlatform(sentimentByPlatformData)

          // Generate metric points for charts
          const metricPoints = postsToMetricPoints(postsData)
          setInteractionsData(metricPoints.slice(-30)) // Last 30 days

          // Top days by reach
          const daysData = metricPoints
            .map(point => ({
              date: point.date,
              reach: point.reach
            }))
            .sort((a, b) => b.reach - a.reach)
            .slice(0, 7)
          setTopDays(daysData)

          // Set sentiment stats - convert percentages to the format we need
          const distribution = sentimentStatsToDistribution(sentimentResponse)
          setSentimentStats({
            total: sentimentResponse.total,
            positive: distribution.positive,
            neutral: distribution.neutral,
            negative: distribution.negative
          })

          // Load most repeated comments (for multiple profiles - combine all)
          try {
            const repeatedComments = await getMostRepeatedComments(undefined, undefined, 5)
            setMostRepeatedComments(repeatedComments.data || [])
          } catch (error) {
            console.error('Error loading most repeated comments:', error)
            setMostRepeatedComments([])
          }

          // Load top complaints by topic - combine for all selected profiles
          setLoadingComplaints(true)
          try {
            // Get complaints for each profile and combine
            const allComplaintsPromises = profileIds.map(profileId => 
              getTopComplaints(profileId, undefined, 10).catch(() => ({ data: [], total: 0 }))
            )
            const allComplaintsResults = await Promise.all(allComplaintsPromises)
            
            // Combine complaints by topic
            const topicMap = new Map<string, { topic: string; count: number; keywords: string[] }>()
            
            for (const result of allComplaintsResults) {
              for (const complaint of result.data || []) {
                const existing = topicMap.get(complaint.topic)
                if (existing) {
                  existing.count += complaint.count
                  // Merge keywords, keeping unique ones
                  const allKeywords = [...existing.keywords, ...complaint.keywords]
                  const uniqueKeywords = Array.from(new Set(allKeywords))
                  existing.keywords = uniqueKeywords.slice(0, 5) // Top 5 keywords
                } else {
                  topicMap.set(complaint.topic, {
                    topic: complaint.topic,
                    count: complaint.count,
                    keywords: complaint.keywords || []
                  })
                }
              }
            }
            
            // Convert to array and sort by count
            const combinedComplaints = Array.from(topicMap.values())
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
            
            console.log('Top complaints loaded (combined for multiple profiles):', {
              total: combinedComplaints.length,
              topics: combinedComplaints.map(c => c.topic),
              profileIds: profileIds
            })
            setTopComplaints(combinedComplaints)
          } catch (error) {
            console.error('Error loading top complaints:', error)
            setTopComplaints([])
          } finally {
            setLoadingComplaints(false)
          }

          setState('success')
          return
        }
        
        // Single profile or all profiles - original logic
        const profileId = undefined
        
        // Load overview stats, posts, and sentiment stats in parallel
        const [statsResponse, postsResponse, sentimentResponse] = await Promise.all([
          getOverviewStats(undefined, profileId, dateFrom, dateTo),
          getPosts({ limit: 500, date_from: dateFrom, date_to: dateTo, profile_id: profileId }),
          getSentimentStats(undefined, profileId).catch(() => ({ total: 0, positive: 0, negative: 0, neutral: 0, percentages: { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0 } }))
        ])

        console.log('Overview data loaded:', {
          statsTotal: statsResponse.total_interactions,
          postsCount: postsResponse.data?.length || 0,
          platforms: statsResponse.platforms?.length || 0,
          sentimentTotal: sentimentResponse.total,
          sentimentPositive: sentimentResponse.positive,
          sentimentNegative: sentimentResponse.negative
        })

        // Transform data using adapters
        const kpisData = overviewStatsToKPIs(statsResponse)
        setKpis(kpisData)

        // Ensure postsResponse.data is an array
        const postsData = Array.isArray(postsResponse.data) ? postsResponse.data : []
        
        const platformMetricsData = overviewStatsToPlatformMetrics(statsResponse, postsData)
        setPlatformMetrics(platformMetricsData)

        // Convert API posts to frontend format
        const posts = postsData.map(apiPostToPost)
          .sort((a, b) => b.engagementRate - a.engagementRate)
        setAllPosts(posts)
        setTopPosts(posts.slice(0, 10))

        // Get sentiment stats by platform
        const sentimentByPlatformData: Record<string, any> = {}
        for (const platform of ['facebook', 'instagram', 'tiktok']) {
          try {
            const platformSentiment = await getSentimentStats(platform, profileId).catch(() => null)
            if (platformSentiment && platformSentiment.total > 0) {
              const dist = sentimentStatsToDistribution(platformSentiment)
              sentimentByPlatformData[platform] = {
                total: platformSentiment.total,
                positive: dist.positive,
                neutral: dist.neutral,
                negative: dist.negative
              }
            }
          } catch (error) {
            console.error(`Error loading sentiment for ${platform}:`, error)
          }
        }
        setSentimentByPlatform(sentimentByPlatformData)

        // Generate metric points for charts
        const metricPoints = postsToMetricPoints(postsData)
        setInteractionsData(metricPoints.slice(-30)) // Last 30 days

        // Top days by reach
        const daysData = metricPoints
          .map(point => ({
            date: point.date,
            reach: point.reach
          }))
          .sort((a, b) => b.reach - a.reach)
          .slice(0, 7)
        setTopDays(daysData)

        // Set sentiment stats - convert percentages to the format we need
        const distribution = sentimentStatsToDistribution(sentimentResponse)
        setSentimentStats({
          total: sentimentResponse.total,
          positive: distribution.positive,
          neutral: distribution.neutral,
          negative: distribution.negative
        })

        // Load most repeated comments
        try {
          const profileId = selectedSources.length === 1 ? parseInt(selectedSources[0]) : undefined
          const repeatedComments = await getMostRepeatedComments(profileId, undefined, 5)
          setMostRepeatedComments(repeatedComments.data || [])
        } catch (error) {
          console.error('Error loading most repeated comments:', error)
          setMostRepeatedComments([])
        }

        // Load top complaints by topic - for single profile or all profiles
        setLoadingComplaints(true)
        try {
          const profileId = selectedSources.length === 1 ? parseInt(selectedSources[0]) : undefined
          console.log('Loading top complaints for profileId:', profileId)
          const complaints = await getTopComplaints(profileId, undefined, 5)
          console.log('Top complaints loaded:', {
            total: complaints.total,
            count: complaints.data?.length || 0,
            topics: complaints.data?.map(c => c.topic) || []
          })
          setTopComplaints(complaints.data || [])
        } catch (error) {
          console.error('Error loading top complaints:', error)
          setTopComplaints([])
        } finally {
          setLoadingComplaints(false)
        }

        setState('success')
      } catch (error) {
        console.error('Error loading overview data:', error)
        setState('error')
      }
    }

    loadData()
  }, [dateRange, selectedSources]) // Recargar cuando cambien los filtros

  // Calculate advanced analytics
  const analytics = useMemo(() => {
    if (platformMetrics.length === 0 || topPosts.length === 0) {
      return null
    }

    // Platform comparison
    const platformComparison = platformMetrics.map(p => ({
      platform: p.platform,
      engagementRate: p.engagementRate,
      reach: p.reach,
      interactions: p.interactions,
      posts: topPosts.filter(post => post.platform === p.platform).length
    }))

    // Best performing platform
    const bestPlatform = platformComparison.reduce((best, current) => 
      current.engagementRate > best.engagementRate ? current : best
    , platformComparison[0])

    // Growth analysis
    const recentData = interactionsData.slice(-7)
    const previousData = interactionsData.slice(-14, -7)
    const recentAvg = recentData.reduce((sum, d) => sum + d.interactions, 0) / recentData.length || 0
    const previousAvg = previousData.reduce((sum, d) => sum + d.interactions, 0) / previousData.length || 0
    const growthRate = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0

    // Content performance distribution
    const highPerforming = topPosts.filter(p => p.engagementRate > 5).length
    const mediumPerforming = topPosts.filter(p => p.engagementRate > 2 && p.engagementRate <= 5).length
    const lowPerforming = topPosts.filter(p => p.engagementRate <= 2).length

    // Average metrics
    const avgEngagementRate = topPosts.reduce((sum, p) => sum + p.engagementRate, 0) / topPosts.length || 0
    const avgReach = topPosts.reduce((sum, p) => sum + p.reach, 0) / topPosts.length || 0

    return {
      platformComparison,
      bestPlatform,
      growthRate,
      highPerforming,
      mediumPerforming,
      lowPerforming,
      avgEngagementRate,
      avgReach
    }
  }, [platformMetrics, topPosts, interactionsData])

  if (state === 'loading') {
    return <OverviewSkeleton />
  }

  if (state === 'error') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Resumen</h1>
        <ErrorState onRetry={() => {
          setState('loading')
          window.location.reload()
        }} />
      </div>
    )
  }

  const topDaysFormatted = topDays.map((day) => ({
    ...day,
    date: new Date(day.date).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' }),
    customLabel: new Date(day.date).toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }),
    fullLabel: `Fecha: ${new Date(day.date).toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    })}\nAlcance: ${new Intl.NumberFormat('es-ES').format(day.reach)}`
  }))

  // Platform distribution for donut chart
  const platformDistribution = platformMetrics.map(p => {
    const platformName = p.platform.charAt(0).toUpperCase() + p.platform.slice(1)
    // Colores más diferenciados y contrastantes
    let color = 'rgb(59, 130, 246)' // Azul por defecto
    if (p.platform === 'facebook') {
      color = 'rgb(24, 119, 242)' // Azul Facebook brillante
    } else if (p.platform === 'instagram') {
      color = 'rgb(225, 48, 108)' // Rosa/Magenta Instagram vibrante
    } else if (p.platform === 'tiktok') {
      color = 'rgb(132, 207, 237)' // Cyan/Turquesa TikTok (más visible que negro)
    }
    return {
      name: platformName,
      value: p.interactions,
      color: color
    }
  }).sort((a, b) => b.value - a.value) // Ordenar por valor descendente

  return (
    <div className="space-y-4 sm:space-y-6" ref={dashboardRef}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Resumen Ejecutivo</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Análisis completo del rendimiento de tus redes sociales
            {dateRange?.from && dateRange?.to && (
              <span className="ml-2 hidden sm:inline">
                ({new Date(dateRange.from).toLocaleDateString('es-ES')} - {new Date(dateRange.to).toLocaleDateString('es-ES')})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={handleExportDashboard}
            style={{ display: 'none' }}
            variant="outline"
            className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
            size="sm"
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isExporting ? 'Exportando...' : 'Exportar PDF'}
            </span>
            <span className="sm:hidden">
              {isExporting ? '...' : 'PDF'}
            </span>
          </Button>
          <Button
            onClick={handleShareView}
            variant="outline"
            className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
            size="sm"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">¡Copiado!</span>
                <span className="sm:hidden">Copiado</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Compartir Vista Pública</span>
                <span className="sm:hidden">Compartir</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Key Insights */}
      {analytics && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Tendencia de Crecimiento</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-foreground">
                      {analytics.growthRate >= 0 ? '+' : ''}{analytics.growthRate.toFixed(1)}%
                    </p>
                    {analytics.growthRate >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Últimos 7 días vs anteriores</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Target className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Plataforma Líder</p>
                  <p className="text-lg font-semibold text-foreground capitalize">
                    {analytics.bestPlatform.platform}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {analytics.bestPlatform.engagementRate.toFixed(2)}% tasa de participación
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <BarChart3 className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Tasa Promedio</p>
                  <p className="text-lg font-semibold text-foreground">
                    {analytics.avgEngagementRate.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {topPosts.length} publicaciones analizadas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPI Cards */}
      <div>
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-medium text-foreground">Métricas Principales</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {kpis.map((kpi) => (
            <KPICard key={kpi.label} data={kpi} />
          ))}
        </div>
      </div>

      {/* Platform Performance */}
      <div>
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-medium text-foreground">Rendimiento por Plataforma</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {platformMetrics.map((platform) => (
            <PlatformCard key={platform.platform} data={platform} />
          ))}
        </div>
      </div>

      {/* TOP 5 RECLAMOS Section */}
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-medium text-foreground">TOP 5 RECLAMOS</h2>
          <Button
            onClick={async () => {
              try {
                const profileId = selectedSources.length === 1 ? parseInt(selectedSources[0]) : undefined
                await processAllComments(profileId, undefined)
                toast.success('Comentarios procesados. Recargando datos...')
                // Recargar datos
                setTimeout(() => window.location.reload(), 1000)
              } catch (error) {
                console.error('Error procesando comentarios:', error)
                toast.error('Error al procesar comentarios')
              }
            }}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Procesar Comentarios Existentes
          </Button>
        </div>
        {(topComplaints.length > 0 || mostRepeatedComments.length > 0) && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">
                Comentarios Más Repetidos
              </CardTitle>
              <CardDescription>
                Los temas más recurrentes en los comentarios de los ciudadanos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Top Complaints by Topic */}
                {topComplaints.length > 0 && topComplaints.map((complaint, index) => (
                  <div
                    key={`topic-${index}`}
                    className="rounded-lg border border-border bg-secondary/50 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                          <h3 className="text-base font-semibold text-foreground">
                            {complaint.topic}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">Palabras clave:</span>
                          {complaint.keywords.map((keyword, wordIdx) => (
                            <Badge
                              key={wordIdx}
                              variant="outline"
                              className="text-xs"
                            >
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {complaint.count} comentario{complaint.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Most Repeated Comments (fallback if no topics) */}
                {topComplaints.length === 0 && mostRepeatedComments.map((comment, index) => {
                  // Extraer palabras clave del comentario (primeras palabras significativas)
                  const words = comment.text
                    .toLowerCase()
                    .replace(/[^\w\s]/g, '')
                    .split(/\s+/)
                    .filter(w => w.length > 3)
                    .slice(0, 5)
                  
                  const sentimentColor = comment.most_common_sentiment === 'POSITIVE' 
                    ? 'text-success' 
                    : comment.most_common_sentiment === 'NEGATIVE'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                  
                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {index + 1}
                            </span>
                            <p className="text-sm font-medium text-foreground line-clamp-2">
                              {comment.text}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {words.map((word, wordIdx) => (
                              <Badge
                                key={wordIdx}
                                variant="outline"
                                className="text-xs"
                              >
                                {word}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-right">
                          <Badge variant="outline" className={sentimentColor}>
                            {comment.count}x
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {comment.total_likes} likes
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {topComplaints.length === 0 && mostRepeatedComments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay comentarios analizados aún. Haz clic en "Procesar Comentarios Existentes" para analizar los comentarios que ya están en la base de datos.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {loadingComplaints && (
          <Card className="bg-card border-border">
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                <p className="text-sm text-muted-foreground text-center">
                  Analizando comentarios y agrupando por temas...
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {!loadingComplaints && topComplaints.length === 0 && mostRepeatedComments.length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="py-8">
              <p className="text-sm text-muted-foreground text-center">
                No hay comentarios analizados aún. Haz clic en "Procesar Comentarios Existentes" para analizar los comentarios que ya están en la base de datos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sentiment Analysis Section */}
      {sentimentStats && sentimentStats.total > 0 && (
        <div>
          <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-medium text-foreground">Análisis de Sentimiento de Comentarios</h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Sentiment Distribution Donut */}
            <DonutChart
              title="Distribución de Sentimiento"
              data={[
                { 
                  name: 'Positivo', 
                  value: sentimentStats.positive, 
                  color: 'hsl(142, 76%, 36%)' // Verde brillante
                },
                { 
                  name: 'Neutral', 
                  value: sentimentStats.neutral, 
                  color: 'hsl(210, 20%, 50%)' // Gris azulado más visible
                },
                { 
                  name: 'Negativo', 
                  value: sentimentStats.negative, 
                  color: 'hsl(0, 84%, 60%)' // Rojo más brillante
                }
              ]}
              height={280}
              innerRadius={60}
              outerRadius={90}
              centerValue={sentimentStats.positive}
              centerLabel="Positivo"
            />

            {/* Sentiment Summary Stats */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium text-card-foreground">
                  Métricas de Sentimiento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center rounded-lg border border-success/20 bg-success/5 p-3">
                    <p className="text-2xl font-bold text-success">{sentimentStats.positive.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Positivo</p>
                  </div>
                  <div className="text-center rounded-lg border border-border bg-secondary/50 p-3">
                    <p className="text-2xl font-bold text-foreground">{sentimentStats.neutral.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Neutral</p>
                  </div>
                  <div className="text-center rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-2xl font-bold text-destructive">{sentimentStats.negative.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Negativo</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total comentarios</span>
                    <span className="font-semibold text-foreground">{sentimentStats.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Comentarios positivos</span>
                    <span className="font-semibold text-success">
                      {Math.round(sentimentStats.total * (sentimentStats.positive / 100))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Comentarios negativos</span>
                    <span className="font-semibold text-destructive">
                      {Math.round(sentimentStats.total * (sentimentStats.negative / 100))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {/* Advanced Analytics Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Platform Distribution */}
        {platformDistribution.length > 0 && (
          <DonutChart
            title="Distribución de Interacciones por Plataforma"
            data={platformDistribution}
            height={280}
            innerRadius={60}
            outerRadius={90}
          />
        )}

        {/* Content Performance Distribution */}
        {analytics && (
          <BarChart
            title="Distribución de Rendimiento de Contenido"
            data={[
              { 
                category: 'Alto (>5%)', 
                count: analytics.highPerforming,
                customLabel: 'Alto rendimiento (>5%)',
                fullLabel: `Categoría: Alto rendimiento\nTasa de participación: Mayor al 5%\nTotal: ${analytics.highPerforming} publicaciones\n\nEstas publicaciones tienen una tasa de participación superior al 5%, lo que indica que generan mucho engagement. Analiza qué tienen en común para replicar su éxito.`
              },
              { 
                category: 'Medio (2-5%)', 
                count: analytics.mediumPerforming,
                customLabel: 'Rendimiento medio (2-5%)',
                fullLabel: `Categoría: Rendimiento medio\nTasa de participación: Entre 2% y 5%\nTotal: ${analytics.mediumPerforming} publicaciones\n\nEstas publicaciones tienen un rendimiento promedio. Considera optimizarlas para alcanzar el nivel de alto rendimiento.`
              },
              { 
                category: 'Bajo (<2%)', 
                count: analytics.lowPerforming,
                customLabel: 'Rendimiento bajo (<2%)',
                fullLabel: `Categoría: Rendimiento bajo\nTasa de participación: Menor al 2%\nTotal: ${analytics.lowPerforming} publicaciones\n\nEstas publicaciones tienen bajo engagement. Revisa el contenido, horario de publicación o formato para mejorar su rendimiento.`
              }
            ] as unknown as Record<string, unknown>[]}
            xKey="category"
            yKey="count"
            color="var(--primary)"
            height={280}
            infoTooltip="Categoriza tus publicaciones según su tasa de participación (engagement rate). La tasa se calcula como: (Interacciones / Alcance) × 100. Útil para identificar qué tipo de contenido funciona mejor y qué necesita mejorar."
          />
        )}

        {/* Platform Comparison with Colors */}
        {analytics && analytics.platformComparison.length > 1 && (
          <BarChart
            title="Comparativa de Engagement por Plataforma"
            data={analytics.platformComparison
              .sort((a, b) => b.engagementRate - a.engagementRate)
              .map((p, idx) => {
                const colors = [
                  'hsl(221, 83%, 53%)', // Facebook blue
                  'hsl(329, 70%, 58%)', // Instagram pink
                  'hsl(0, 0%, 0%)'      // TikTok black
                ]
                return {
                  platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
                  engagement: p.engagementRate,
                  customLabel: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
                  fullLabel: `Plataforma: ${p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}\nTasa de participación: ${p.engagementRate.toFixed(2)}%\nAlcance: ${new Intl.NumberFormat('es-ES').format(p.reach)}\nInteracciones: ${new Intl.NumberFormat('es-ES').format(p.interactions)}\nPublicaciones: ${p.posts}`,
                  color: colors[idx % colors.length]
                }
              }) as unknown as Record<string, unknown>[]}
            xKey="platform"
            yKey="engagement"
            colors={analytics.platformComparison.map((p, idx) => {
              const colors = [
                'hsl(221, 83%, 53%)', // Facebook blue
                'hsl(329, 70%, 58%)', // Instagram pink
                'hsl(0, 0%, 0%)'      // TikTok black
              ]
              return colors[idx % colors.length]
            })}
            showLegend={true}
            height={280}
            infoTooltip="Compara la tasa de participación entre diferentes plataformas. Cada color representa una plataforma diferente (azul=Facebook, rosa=Instagram, negro=TikTok). Útil para identificar dónde tu contenido tiene mejor rendimiento."
          />
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Interactions Over Time */}
        <LineChart
          title="Evolución de Alcance e Interacciones"
          data={interactionsData.map(point => {
            const date = new Date(point.date)
            return {
              date: point.date,
              dateLabel: date.toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: 'short',
                year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              }),
              reach: point.reach,
              interactions: point.interactions,
              reachFormatted: point.reach >= 1000000 
                ? `${(point.reach / 1000000).toFixed(1)}M`
                : point.reach >= 1000
                ? `${(point.reach / 1000).toFixed(1)}K`
                : point.reach.toString(),
              interactionsFormatted: point.interactions >= 1000000 
                ? `${(point.interactions / 1000000).toFixed(1)}M`
                : point.interactions >= 1000
                ? `${(point.interactions / 1000).toFixed(1)}K`
                : point.interactions.toString()
            }
          }) as unknown as Record<string, unknown>[]}
          xKey="date"
          lines={[
            { key: 'interactions', name: 'Interacciones', color: 'var(--primary)' },
            { key: 'reach', name: 'Alcance', color: 'var(--chart-2)' },
          ]}
          height={320}
          infoTooltip="Muestra la evolución diaria del alcance e interacciones. Los datos se agrupan por fecha de publicación. Pasa el mouse sobre los puntos para ver valores exactos."
        />

        {/* Top Days by Reach */}
        <BarChart
          title="Mejores Días por Alcance"
          data={topDaysFormatted as unknown as Record<string, unknown>[]}
          xKey="date"
          yKey="reach"
          color="var(--primary)"
          height={320}
          infoTooltip="Muestra los días con mayor alcance basado en los datos reales de tus publicaciones. Ordenados de mayor a menor alcance."
        />
      </div>

      {/* Recommendations */}
      {analytics && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium text-card-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Insights y Recomendaciones
            </CardTitle>
            <CardDescription>
              Análisis automático basado en tus datos de rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.bestPlatform && (
              <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/50 p-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {analytics.bestPlatform.platform.charAt(0).toUpperCase() + analytics.bestPlatform.platform.slice(1)} es tu plataforma más exitosa
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Con una tasa de participación del {analytics.bestPlatform.engagementRate.toFixed(2)}%, considera aumentar la frecuencia de publicación en esta plataforma.
                  </p>
                </div>
              </div>
            )}
            
            {analytics.growthRate < -10 && (
              <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Disminución en interacciones detectada
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Las interacciones han disminuido un {Math.abs(analytics.growthRate).toFixed(1)}% en los últimos 7 días. Revisa el tipo de contenido publicado recientemente.
                  </p>
                </div>
              </div>
            )}

            {analytics.highPerforming > analytics.lowPerforming && (
              <div className="flex items-start gap-3 rounded-lg border border-success/50 bg-success/10 p-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Buen balance de contenido
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tienes más publicaciones de alto rendimiento ({analytics.highPerforming}) que de bajo rendimiento ({analytics.lowPerforming}). Mantén este nivel de calidad.
                  </p>
                </div>
              </div>
            )}

            {analytics.lowPerforming > analytics.highPerforming * 2 && (
              <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Oportunidad de mejora
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tienes {analytics.lowPerforming} publicaciones de bajo rendimiento. Analiza las publicaciones de alto rendimiento para identificar patrones exitosos.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Posts Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-card-foreground">
            Top 10 Publicaciones por Tasa de Participación
          </CardTitle>
          <CardDescription>
            Las publicaciones con mejor rendimiento en el período seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {topPosts.length > 0 ? (
            <PostsTable posts={topPosts} />
          ) : (
            <EmptyState
              title="Aún no hay publicaciones"
              description="Las publicaciones aparecerán aquí una vez que hayas analizado perfiles."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      {/* Insights Skeletons */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Skeletons */}
      <div>
        <div className="mb-4 h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Platform Cards Skeleton */}
      <div>
        <div className="mb-4 h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                  <div className="space-y-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-6">
              <ChartSkeleton height={280} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-6">
              <ChartSkeleton height={320} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Skeleton */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <TableSkeleton rows={10} columns={6} />
        </CardContent>
      </Card>
    </div>
  )
}
