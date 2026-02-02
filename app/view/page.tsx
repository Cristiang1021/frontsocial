'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KPICard } from '@/components/kpi-card'
import { PlatformCard } from '@/components/platform-card'
import { LineChart } from '@/components/line-chart'
import { BarChart } from '@/components/bar-chart'
import { DonutChart } from '@/components/donut-chart'
import { getOverviewStats, getPosts, getSentimentStats } from '@/lib/api'
import {
  overviewStatsToKPIs,
  overviewStatsToPlatformMetrics,
  apiPostToPost,
  postsToMetricPoints,
  sentimentStatsToDistribution
} from '@/lib/adapters'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, Share2, Check } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { isAuthenticated } from '@/lib/auth'

export default function ViewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isAuth, setIsAuth] = useState<boolean | null>(null)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [kpis, setKpis] = useState<any[]>([])
  const [platformMetrics, setPlatformMetrics] = useState<any[]>([])
  const [topPosts, setTopPosts] = useState<any[]>([])
  const [interactionsData, setInteractionsData] = useState<any[]>([])
  const [topDays, setTopDays] = useState<any[]>([])
  const [sentimentStats, setSentimentStats] = useState<{
    total: number
    positive: number
    neutral: number
    negative: number
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login?redirect=/view')
    } else {
      setIsAuth(true)
    }
  }, [router])

  // Get filters from URL params (optional)
  const dateFrom = searchParams.get('from') || undefined
  const dateTo = searchParams.get('to') || undefined
  const profileId = searchParams.get('profile') ? parseInt(searchParams.get('profile')!) : undefined

  // Don't render content until authenticated
  if (isAuth === null || !isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  const handleShare = () => {
    const currentUrl = window.location.href
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopied(true)
      toast.success('Link copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error('Error al copiar el link')
    })
  }

  useEffect(() => {
    async function loadData() {
      try {
        setState('loading')

        // Fetch all data
        const [statsResponse, postsResponse, sentimentResponse] = await Promise.all([
          getOverviewStats(undefined, profileId, dateFrom, dateTo),
          getPosts({ limit: 500, date_from: dateFrom, date_to: dateTo, profile_id: profileId }),
          getSentimentStats(undefined, profileId).catch(() => null)
        ])

        // Transform data
        const kpisData = overviewStatsToKPIs(statsResponse)
        const postsData = Array.isArray(postsResponse.data) ? postsResponse.data : []
        const platformMetricsData = overviewStatsToPlatformMetrics(statsResponse, postsData)
        const posts = postsData.map(apiPostToPost).sort((a, b) => b.engagementRate - a.engagementRate)

        setKpis(kpisData)
        setPlatformMetrics(platformMetricsData)
        setTopPosts(posts.slice(0, 10))

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

        // Set sentiment stats
        if (sentimentResponse) {
          const distribution = sentimentStatsToDistribution(sentimentResponse)
          setSentimentStats({
            total: sentimentResponse.total,
            positive: distribution.positive,
            neutral: distribution.neutral,
            negative: distribution.negative
          })
        }

        setState('success')
      } catch (error) {
        console.error('Error loading data:', error)
        setState('error')
      }
    }

    loadData()
  }, [dateFrom, dateTo, profileId])

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Dashboard - Vista Pública</h1>
            <p className="text-muted-foreground mt-2">Cargando datos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Dashboard - Vista Pública</h1>
            <p className="text-muted-foreground mt-2 text-red-500">Error al cargar los datos</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard de Análisis</h1>
            <p className="text-muted-foreground mt-2">
              Vista de solo lectura - Analytics
            </p>
          </div>
          <Button
            onClick={handleShare}
            variant="outline"
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                ¡Copiado!
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Compartir Vista
              </>
            )}
          </Button>
        </div>

        {/* KPIs */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, index) => (
            <KPICard key={index} data={kpi} />
          ))}
        </div>

        {/* Platform Metrics */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {platformMetrics.filter(p => p && p.platform).map((platform, index) => (
            <PlatformCard key={index} data={platform} />
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {/* Interactions Over Time */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Evolución de Interacciones</CardTitle>
                  <CardDescription>Últimos 30 días</CardDescription>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Muestra la evolución de las interacciones totales a lo largo del tiempo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent>
              {interactionsData.length > 0 ? (
                <LineChart
                  data={interactionsData.map(d => ({
                    date: d.date,
                    value: d.interactions
                  })) as unknown as Record<string, unknown>[]}
                  xKey="date"
                  lines={[{
                    key: 'value',
                    name: 'Interacciones',
                    color: 'hsl(221, 83%, 53%)'
                  }]}
                />
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay datos disponibles</p>
              )}
            </CardContent>
          </Card>

          {/* Top Days */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mejores Días por Alcance</CardTitle>
                  <CardDescription>Top 7 días con mayor alcance</CardDescription>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Muestra los días con mayor alcance en el período seleccionado</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent>
              {topDays.length > 0 ? (
                <BarChart
                  data={topDays.map(d => ({
                    label: d.date,
                    value: d.reach,
                    fullLabel: `${d.date}: ${new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(d.reach)} alcance`
                  }))}
                  xKey="label"
                  yKey="value"
                  color="hsl(221, 83%, 53%)"
                />
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay datos disponibles</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {/* Platform Distribution */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Distribución por Plataforma</CardTitle>
                  <CardDescription>Porcentaje de interacciones por plataforma</CardDescription>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Muestra la distribución porcentual de interacciones entre las diferentes plataformas</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent>
              {platformMetrics.length > 0 ? (
                <DonutChart
                  data={platformMetrics.map(p => {
                    const total = platformMetrics.reduce((sum, pm) => sum + pm.interactions, 0)
                    const platformName = p.platform.charAt(0).toUpperCase() + p.platform.slice(1)
                    // Colores más diferenciados y contrastantes
                    let color = 'rgb(59, 130, 246)' // Azul por defecto
                    if (p.platform === 'facebook') {
                      color = 'rgb(24, 119, 242)' // Azul Facebook brillante
                    } else if (p.platform === 'instagram') {
                      color = 'rgb(225, 48, 108)' // Rosa/Magenta Instagram vibrante
                    } else if (p.platform === 'tiktok') {
                      color = 'rgb(0, 0, 0)' // Cyan/Turquesa TikTok (más visible que negro)
                    }
                    return {
                      name: platformName,
                      value: total > 0 ? (p.interactions / total) * 100 : 0,
                      color: color
                    }
                  }).sort((a, b) => b.value - a.value)} // Ordenar por valor descendente
                />
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay datos disponibles</p>
              )}
            </CardContent>
          </Card>

          {/* Sentiment Distribution */}
          {sentimentStats && sentimentStats.total > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Distribución de Sentimiento</CardTitle>
                    <CardDescription>Análisis de sentimiento de comentarios</CardDescription>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Muestra la distribución porcentual de comentarios por sentimiento (positivo, neutral, negativo)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={[
                    { name: 'Positivo', value: sentimentStats.positive, color: 'rgb(34, 197, 94)' },
                    { name: 'Neutral', value: sentimentStats.neutral, color: 'rgb(148, 163, 184)' },
                    { name: 'Negativo', value: sentimentStats.negative, color: 'rgb(239, 68, 68)' }
                  ]}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Top Posts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top 10 Publicaciones</CardTitle>
                <CardDescription>
                  Publicaciones con mayor tasa de participación ({topPosts.length} publicaciones analizadas)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topPosts.length > 0 ? (
              <div className="space-y-4">
                {topPosts.map((post, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium uppercase text-muted-foreground">
                          {post.platform}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.date).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2">{post.caption || 'Sin descripción'}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm font-semibold">
                        {post.engagementRate.toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(post.interactions)} interacciones
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No hay publicaciones disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Vista de solo lectura - Generado el {new Date().toLocaleDateString('es-ES')}</p>
        </div>
      </div>
    </div>
  )
}
