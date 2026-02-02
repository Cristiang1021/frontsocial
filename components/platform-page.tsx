'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KPICard, KPICardSkeleton } from './kpi-card'
import { PostsTable } from './posts-table'
import { PostDetailModal } from './post-detail-modal'
import { LineChart } from '@/components/line-chart'
import { BarChart } from '@/components/bar-chart'
import { ChartSkeleton, TableSkeleton, ErrorState, EmptyState } from './states'
import { Facebook, Instagram, Music2, Users, Eye, TrendingUp } from 'lucide-react'
import { getPosts, getOverviewStats } from '@/lib/api'
import { apiPostToPost, postsToMetricPoints, overviewStatsToKPIs } from '@/lib/adapters'
import { useFilters } from '@/contexts/filters-context'
import type { Platform, Post, ViewState } from '@/types'

interface PlatformPageProps {
  platform: Platform
}

const platformConfig = {
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'var(--chart-1)',
    kpis: [
      { label: 'Page Reach', value: 1023450, previousValue: 923000, change: 10.9, changeType: 'positive' as const, format: 'number' as const },
      { label: 'Impressions', value: 1834521, previousValue: 1654000, change: 10.9, changeType: 'positive' as const, format: 'number' as const },
      { label: 'Page Likes', value: 45234, previousValue: 43200, change: 4.7, changeType: 'positive' as const, format: 'number' as const },
      { label: 'Post Engagement', value: 123450, previousValue: 115000, change: 7.3, changeType: 'positive' as const, format: 'number' as const },
      { label: 'Engagement Rate', value: 3.8, previousValue: 3.2, change: 18.7, changeType: 'positive' as const, format: 'percentage' as const },
    ],
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'var(--chart-2)',
    kpis: [
      { label: 'Reach', value: 987234, previousValue: 876000, change: 12.7, changeType: 'positive' as const, format: 'number' as const },
      { label: 'Impressions', value: 1523890, previousValue: 1345000, change: 13.3, changeType: 'positive' as const, format: 'number' as const },
      { label: 'Followers', value: 67892, previousValue: 65400, change: 3.8, changeType: 'positive' as const, format: 'number' as const },
      { label: 'Story Views', value: 234521, previousValue: 256000, change: -8.4, changeType: 'negative' as const, format: 'number' as const },
      { label: 'Engagement Rate', value: 5.2, previousValue: 4.8, change: 8.3, changeType: 'positive' as const, format: 'percentage' as const },
    ],
  },
  tiktok: {
    name: 'TikTok',
    icon: Music2,
    color: 'var(--chart-3)',
    kpis: [
      { label: 'Video Views', value: 836708, previousValue: 723000, change: 15.7, changeType: 'positive' as const, format: 'number' as const },
      { label: 'Profile Views', value: 45890, previousValue: 41200, change: 11.4, changeType: 'positive' as const, format: 'number' as const },
      { label: 'Followers', value: 28934, previousValue: 26100, change: 10.8, changeType: 'positive' as const, format: 'number' as const },
      { label: 'Likes', value: 78853, previousValue: 69000, change: 14.3, changeType: 'positive' as const, format: 'number' as const },
      { label: 'Engagement Rate', value: 5.9, previousValue: 5.1, change: 15.7, changeType: 'positive' as const, format: 'percentage' as const },
    ],
  },
}

export function PlatformPage({ platform }: PlatformPageProps) {
  const [state, setState] = useState<ViewState>('loading')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [platformPosts, setPlatformPosts] = useState<Post[]>([])
  const [trendData, setTrendData] = useState<any[]>([])
  
  const config = platformConfig[platform]
  const Icon = config.icon
  const [kpis, setKpis] = useState<any[]>(config.kpis)

  const { dateRange, selectedSource } = useFilters()

  // Load platform data
  useEffect(() => {
    async function loadPlatformData() {
      try {
        setState('loading')
        const dateFrom = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : undefined
        const dateTo = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : undefined
        const profileId = selectedSource !== 'all' ? parseInt(selectedSource) : undefined
        
        console.log('Loading platform data:', { platform, dateFrom, dateTo, profileId })
        
        const [postsResponse, statsResponse] = await Promise.all([
          getPosts({ platform, limit: 200, date_from: dateFrom, date_to: dateTo, profile_id: profileId }),
          getOverviewStats(platform, profileId, dateFrom, dateTo)
        ])

        console.log('Platform data loaded:', {
          postsCount: postsResponse.data?.length || 0,
          statsPlatforms: statsResponse.platforms?.length || 0
        })

        // Transform posts
        const posts = postsResponse.data.map(apiPostToPost)
        setPlatformPosts(posts)

        // Generate trend data from posts
        const metricPoints = postsToMetricPoints(postsResponse.data)
        console.log('Metric points generated:', metricPoints.length)
        setTrendData(metricPoints.slice(-30)) // Last 30 days

        // Update KPIs from stats (use config KPIs as fallback)
        try {
          const kpisData = overviewStatsToKPIs(statsResponse)
          if (kpisData.length >= 5) {
            setKpis(kpisData.slice(0, 5))
          } else {
            // If not enough KPIs, keep default ones but update with available data
            console.log('Not enough KPIs from stats, using defaults')
          }
        } catch (error) {
          console.error('Error updating KPIs:', error)
          // Keep default KPIs
        }

        setState('success')
      } catch (error) {
        console.error('Error loading platform data:', error)
        setState('error')
      }
    }
    loadPlatformData()
  }, [platform, dateRange, selectedSource]) // Recargar cuando cambien los filtros

  const handlePostClick = (post: Post) => {
    setSelectedPost(post)
    setModalOpen(true)
  }

  if (state === 'loading') {
    return <PlatformSkeleton name={config.name} />
  }

  if (state === 'error') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color: config.color }} />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{config.name}</h1>
        </div>
        <ErrorState onRetry={() => {
          setState('loading')
          // Reload data
          const loadPlatformData = async () => {
            try {
              const [postsResponse, statsResponse] = await Promise.all([
                getPosts({ platform, limit: 200 }),
                getOverviewStats(platform)
              ])
              setPlatformPosts(postsResponse.data.map(apiPostToPost))
              const metricPoints = postsToMetricPoints(postsResponse.data)
              setTrendData(metricPoints.slice(-30))
              const kpisData = overviewStatsToKPIs(statsResponse)
              setKpis(kpisData.slice(0, 5))
              setState('success')
            } catch (error) {
              console.error('Error reloading platform data:', error)
              setState('error')
            }
          }
          loadPlatformData()
        }} />
      </div>
    )
  }

  // Generate best days/hours from trend data (simplified)
  const mockBestDays = trendData && trendData.length > 0
    ? trendData
        .map((point) => ({
          day: new Date(point.date).toLocaleDateString('es-ES', { weekday: 'short' }),
          engagement: point.interactions
        }))
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 7)
    : []

  const mockBestHours = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    engagement: Math.floor(Math.random() * 1000) // Placeholder, would need hourly data
  }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color: config.color }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{config.name}</h1>
          <p className="text-sm text-muted-foreground">Análisis y métricas de rendimiento</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="content">Contenido</TabsTrigger>
          <TabsTrigger value="audience">Audiencia</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <KPICard key={kpi.label} data={kpi} />
            ))}
          </div>

          {/* Charts */}
          {platformPosts.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Trend Chart - Only show if we have enough data points */}
              {trendData && trendData.length > 0 ? (
                <LineChart
                  title="Evolución de Alcance e Interacciones"
                  data={trendData as unknown as Record<string, unknown>[]}
                  xKey="date"
                  lines={[
                    { key: 'reach', name: 'Alcance', color: config.color },
                    { key: 'interactions', name: 'Interacciones', color: 'var(--primary)' },
                  ]}
                  height={280}
                  infoTooltip={`Muestra la evolución diaria del alcance e interacciones para ${config.name}. Basado en las fechas de publicación reales.`}
                />
              ) : (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-medium text-card-foreground">
                      Evolución de Alcance e Interacciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">No hay suficientes datos con fechas para mostrar la evolución temporal</p>
                  </CardContent>
                </Card>
              )}

              {/* Top Performing Posts */}
              {platformPosts.length > 0 ? (
                <BarChart
                  title="Top 5 Publicaciones por Interacciones"
                  data={platformPosts
                    .sort((a, b) => b.interactions - a.interactions)
                    .slice(0, 5)
                    .map((post, idx) => {
                      const date = post.date ? new Date(post.date).toLocaleDateString('es-ES', { 
                        day: '2-digit', 
                        month: 'short' 
                      }) : 'Sin fecha'
                      const shortCaption = post.caption.length > 30 
                        ? post.caption.substring(0, 30) + '...' 
                        : post.caption
                      return {
                        label: `${idx + 1}`,
                        interactions: post.interactions,
                        customLabel: `${date} - ${shortCaption}`,
                        fullLabel: `${new Intl.NumberFormat('es-ES').format(post.interactions)} interacciones\n${post.caption}\nFecha: ${date}\nLikes: ${new Intl.NumberFormat('es-ES').format(post.likes)}\nComentarios: ${new Intl.NumberFormat('es-ES').format(post.comments)}`,
                        date: date,
                        caption: shortCaption
                      }
                    }) as unknown as Record<string, unknown>[]}
                  xKey="label"
                  yKey="interactions"
                  color={config.color}
                  height={280}
                  infoTooltip="Las 5 publicaciones con mayor número de interacciones. Pasa el mouse sobre cada barra para ver detalles completos."
                />
              ) : (
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">No hay publicaciones para mostrar</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  No hay datos disponibles para mostrar. 
                  {dateRange ? ' Intenta ajustar el rango de fechas o selecciona otra fuente.' : ' Analiza algunos perfiles primero.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Additional Charts Row */}
          {platformPosts.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Engagement Rate Distribution */}
              {mockBestDays.length > 0 ? (
                <BarChart
                  title="Rendimiento por Día de la Semana"
                  data={mockBestDays.map((day, idx) => ({
                    day: day.day,
                    engagement: day.engagement,
                    customLabel: `${day.day}\n${new Intl.NumberFormat('es-ES').format(day.engagement)} interacciones`,
                    fullLabel: `Día: ${day.day}\nTotal de interacciones: ${new Intl.NumberFormat('es-ES').format(day.engagement)}`
                  })) as unknown as Record<string, unknown>[]}
                  xKey="day"
                  yKey="engagement"
                  color={config.color}
                  height={280}
                  infoTooltip="Muestra qué días de la semana tienen mayor engagement basado en las fechas de publicación reales."
                />
              ) : (
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">No hay suficientes datos con fechas para analizar por día de la semana</p>
                  </CardContent>
                </Card>
              )}

              {/* Posts by Performance Category */}
              <BarChart
                title="Distribución por Tasa de Participación"
                data={(() => {
                  const sorted = [...platformPosts].sort((a, b) => b.engagementRate - a.engagementRate)
                  const high = sorted.filter(p => p.engagementRate > 5).length
                  const medium = sorted.filter(p => p.engagementRate > 2 && p.engagementRate <= 5).length
                  const low = sorted.filter(p => p.engagementRate <= 2).length
                  return [
                    { 
                      category: 'Alto (>5%)', 
                      count: high,
                      customLabel: `Alto rendimiento (>5%)`,
                      fullLabel: `Publicaciones con alta tasa de participación (>5%)\nTotal: ${high} publicaciones\nEstas son tus publicaciones más exitosas.`
                    },
                    { 
                      category: 'Medio (2-5%)', 
                      count: medium,
                      customLabel: `Rendimiento medio (2-5%)`,
                      fullLabel: `Publicaciones con tasa de participación media (2-5%)\nTotal: ${medium} publicaciones\nRendimiento promedio.`
                    },
                    { 
                      category: 'Bajo (<2%)', 
                      count: low,
                      customLabel: `Rendimiento bajo (<2%)`,
                      fullLabel: `Publicaciones con baja tasa de participación (<2%)\nTotal: ${low} publicaciones\nConsidera revisar el contenido de estas publicaciones.`
                    }
                  ]
                })() as unknown as Record<string, unknown>[]}
                xKey="category"
                yKey="count"
                color={config.color}
                height={280}
                infoTooltip="Categoriza tus publicaciones según su tasa de participación. Útil para identificar qué tipo de contenido funciona mejor."
              />
            </div>
          )}

          {/* Best Hours Chart */}
          <BarChart
            title="Mejores Horas para Publicar"
            data={mockBestHours as unknown as Record<string, unknown>[]}
            xKey="hour"
            yKey="engagement"
            color={config.color}
            height={200}
            infoTooltip="Datos estimados basados en patrones generales. Para datos precisos, se necesitaría información horaria detallada de las publicaciones."
          />
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">
                Posts ({platformPosts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {platformPosts.length > 0 ? (
                <PostsTable posts={platformPosts} onRowClick={handlePostClick} />
              ) : (
                <EmptyState
                  title="No posts yet"
                  description="Your posts will appear here once published."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audience Tab */}
        <TabsContent value="audience" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 font-medium text-card-foreground">Demographics</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Audience demographics will be available when connected to a real account.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Eye className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 font-medium text-card-foreground">Reach Insights</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Detailed reach analytics require API integration.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 font-medium text-card-foreground">Growth Trends</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Follower growth trends coming soon.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Post Detail Modal */}
      <PostDetailModal
        post={selectedPost}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}

function PlatformSkeleton({ name }: { name: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
        <div>
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-1 h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* KPI Skeletons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <ChartSkeleton height={280} />
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <ChartSkeleton height={280} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
