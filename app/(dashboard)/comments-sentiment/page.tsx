'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/kpi-card'
import { PlatformBadge } from '@/components/platform-badge'
import { SentimentBadge } from '@/components/sentiment-badge'
import { DonutChart } from '@/components/donut-chart'
import { ChartSkeleton, TableSkeleton, ErrorState, EmptyState } from '@/components/states'
import { Search, MessageSquare, AlertTriangle, TrendingUp, Hash, Tag } from 'lucide-react'
import { getComments, getSentimentStats } from '@/lib/api'
import { apiCommentToComment, sentimentStatsToDistribution } from '@/lib/adapters'
import { useFilters } from '@/contexts/filters-context'
import type { Comment, Platform, ViewState } from '@/types'

type TagFilter = Comment['tag'] | 'all'
type SentimentFilter = Comment['sentiment'] | 'all'

export default function CommentsSentimentPage() {
  const [state, setState] = useState<ViewState>('loading')
  const [comments, setComments] = useState<Comment[]>([])
  const [sentimentStats, setSentimentStats] = useState<{ total: number; positive: number; neutral: number; negative: number }>({
    total: 0,
    positive: 0,
    neutral: 0,
    negative: 0
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all')
  const [tagFilter, setTagFilter] = useState<TagFilter>('all')
  const { dateRange, selectedSource } = useFilters()

  useEffect(() => {
    async function loadComments() {
      try {
        setState('loading')
        const platform = platformFilter !== 'all' ? platformFilter : undefined
        const profileId = selectedSource !== 'all' ? parseInt(selectedSource) : undefined
        const sentiment = sentimentFilter !== 'all' ? sentimentFilter : undefined
        
        const [commentsResponse, statsResponse] = await Promise.all([
          getComments({ platform, profile_id: profileId, sentiment, limit: 500 }),
          getSentimentStats(platform, profileId)
        ])

        console.log('Comments response:', {
          total: commentsResponse.total,
          dataLength: commentsResponse.data?.length,
          firstComment: commentsResponse.data?.[0]
        })

        // Transform comments - ensure data is an array
        const commentsData = Array.isArray(commentsResponse.data) ? commentsResponse.data : []
        console.log('Comments data array length:', commentsData.length)
        
        const transformedComments = commentsData.map((apiComment, index) => {
          try {
            // Pass platform filter to adapter, it will use comment's platform if available
            return apiCommentToComment(apiComment, platform as Platform)
          } catch (error) {
            console.error(`Error transforming comment ${index}:`, error, apiComment)
            // Return a default comment to prevent crashes
            return {
              id: String(apiComment.id || index),
              platform: ((apiComment as any).platform || platform || 'facebook') as Platform,
              postId: String(apiComment.post_id || ''),
              date: (apiComment as any).posted_at || new Date().toISOString(),
              text: apiComment.text || '',
              author: apiComment.author || 'Unknown',
              sentiment: 'neutral' as const,
              tag: 'praise' as const
            }
          }
        })
        console.log('Transformed comments length:', transformedComments.length)
        console.log('Sample transformed comment:', transformedComments[0])
        setComments(transformedComments)

        // Transform sentiment stats
        const distribution = sentimentStatsToDistribution(statsResponse)
        setSentimentStats({
          total: statsResponse.total,
          positive: distribution.positive,
          neutral: distribution.neutral,
          negative: distribution.negative
        })

        setState('success')
      } catch (error) {
        console.error('Error loading comments:', error)
        console.error('Error details:', error)
        setState('error')
        // Set empty arrays on error to prevent crashes
        setComments([])
        setSentimentStats({ total: 0, positive: 0, neutral: 0, negative: 0 })
      }
    }
    loadComments()
  }, [platformFilter, selectedSource, sentimentFilter]) // Recargar cuando cambien los filtros

  const filteredComments = useMemo(() => {
    console.log('Filtering comments:', {
      totalComments: comments.length,
      searchQuery,
      platformFilter,
      sentimentFilter,
      tagFilter
    })
    
    let result = [...comments]

    if (searchQuery) {
      const beforeSearch = result.length
      result = result.filter((comment) =>
        comment.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
      console.log(`Search filter: ${beforeSearch} -> ${result.length}`)
    }

    if (platformFilter !== 'all') {
      const beforePlatform = result.length
      result = result.filter((comment) => comment.platform === platformFilter)
      console.log(`Platform filter (${platformFilter}): ${beforePlatform} -> ${result.length}`)
    }

    if (sentimentFilter !== 'all') {
      const beforeSentiment = result.length
      result = result.filter((comment) => comment.sentiment === sentimentFilter)
      console.log(`Sentiment filter (${sentimentFilter}): ${beforeSentiment} -> ${result.length}`)
    }

    if (tagFilter !== 'all') {
      const beforeTag = result.length
      result = result.filter((comment) => comment.tag === tagFilter)
      console.log(`Tag filter (${tagFilter}): ${beforeTag} -> ${result.length}`)
    }

    const sorted = result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    console.log('Final filtered comments:', sorted.length)
    return sorted
  }, [comments, searchQuery, platformFilter, sentimentFilter, tagFilter])

  const donutData = [
    { name: 'Positive', value: sentimentStats.positive, color: 'var(--success)' },
    { name: 'Neutral', value: sentimentStats.neutral, color: 'var(--muted-foreground)' },
    { name: 'Negative', value: sentimentStats.negative, color: 'var(--destructive)' },
  ]

  // Calculate frequent topics from comments (simple keyword extraction)
  const frequentTopics = useMemo(() => {
    const topicCounts: Record<string, number> = {}
    const topicKeywords: Record<string, string[]> = {
      'Product Quality': ['quality', 'excelente', 'bueno', 'malo', 'defecto'],
      'Customer Service': ['service', 'servicio', 'atencion', 'soporte', 'help'],
      'Shipping': ['shipping', 'envio', 'delivery', 'entrega', 'envío'],
      'Pricing': ['price', 'precio', 'cost', 'costo', 'caro', 'barato'],
      'New Features': ['feature', 'funcion', 'nuevo', 'actualizacion', 'update']
    }

    comments.forEach(comment => {
      const text = comment.text.toLowerCase()
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1
        }
      })
    })

    return Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [comments])

  // Extract keywords from comments
  const keywords = useMemo(() => {
    const wordCounts: Record<string, number> = {}
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'el', 'la', 'los', 'las', 'un', 'una', 'de', 'que', 'y', 'en', 'a', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'una', 'está', 'ser', 'como', 'más', 'muy', 'pero', 'sus', 'también', 'me', 'hasta', 'donde', 'quien', 'desde', 'todo', 'durante', 'sobre', 'entre', 'sin', 'bajo', 'hacia', 'tras', 'contra', 'según', 'mediante', 'excepto', 'salvo', 'menos', 'además', 'incluso', 'aunque', 'mientras', 'cuando', 'donde', 'como', 'porque', 'si', 'aunque', 'pero', 'sin', 'embargo', 'no', 'obstante', 'así', 'pues', 'entonces', 'luego', 'después', 'antes', 'ahora', 'aquí', 'allí', 'allá', 'cerca', 'lejos', 'dentro', 'fuera', 'arriba', 'abajo', 'adelante', 'atrás', 'encima', 'debajo', 'delante', 'detrás', 'alrededor', 'cerca', 'lejos', 'junto', 'separado', 'unido', 'dividido', 'completo', 'incompleto', 'terminado', 'empezado', 'continuado', 'interrumpido', 'seguido', 'parado', 'movido', 'quieto', 'rápido', 'lento', 'veloz', 'tardío', 'temprano', 'nuevo', 'viejo', 'joven', 'antiguo', 'moderno', 'actual', 'pasado', 'futuro', 'presente', 'anterior', 'siguiente', 'próximo', 'último', 'primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo', 'mucho', 'poco', 'bastante', 'demasiado', 'suficiente', 'insuficiente', 'más', 'menos', 'igual', 'diferente', 'similar', 'distinto', 'mismo', 'otro', 'mismo', 'diverso', 'vario', 'varios', 'algunos', 'todos', 'ninguno', 'cada', 'cualquier', 'cualquiera', 'alguno', 'ninguno', 'todo', 'nada', 'algo', 'nada', 'mucho', 'poco', 'bastante', 'demasiado', 'suficiente', 'insuficiente', 'más', 'menos', 'igual', 'diferente', 'similar', 'distinto', 'mismo', 'otro', 'mismo', 'diverso', 'vario', 'varios', 'algunos', 'todos', 'ninguno', 'cada', 'cualquier', 'cualquiera', 'alguno', 'ninguno', 'todo', 'nada', 'algo', 'nada'])

    comments.forEach(comment => {
      const words = comment.text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.has(word))
      
      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1
      })
    })

    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
  }, [comments])

  const getTagBadge = (tag: Comment['tag']) => {
    const config = {
      praise: { label: 'Praise', className: 'bg-success/20 text-success border-success/30' },
      complaint: { label: 'Complaint', className: 'bg-destructive/20 text-destructive border-destructive/30' },
      question: { label: 'Question', className: 'bg-info/20 text-info border-info/30' },
      spam: { label: 'Spam', className: 'bg-warning/20 text-warning border-warning/30' },
    }
    return config[tag]
  }

  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <ChartSkeleton height={280} />
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <TableSkeleton rows={5} columns={3} />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Comments & Sentiment</h1>
        </div>
        <ErrorState onRetry={() => setState('loading')} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Comentarios y Sentimiento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analiza el sentimiento de los comentarios y rastrea el feedback de la audiencia
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          data={{
            label: 'Total de Comentarios',
            value: sentimentStats.total,
            previousValue: 0,
            change: sentimentStats.total > 0 ? 100 : 0,
            changeType: sentimentStats.total > 0 ? 'positive' : 'neutral',
            format: 'number',
          }}
        />
        <KPICard
          data={{
            label: 'Positivo',
            value: sentimentStats.positive,
            previousValue: 0,
            change: sentimentStats.positive > 0 ? 100 : 0,
            changeType: sentimentStats.positive > 0 ? 'positive' : 'neutral',
            format: 'percentage',
          }}
        />
        <KPICard
          data={{
            label: 'Neutral',
            value: sentimentStats.neutral,
            previousValue: 0,
            change: sentimentStats.neutral > 0 ? 100 : 0,
            changeType: 'neutral',
            format: 'percentage',
          }}
        />
        <KPICard
          data={{
            label: 'Negativo',
            value: sentimentStats.negative,
            previousValue: 0,
            change: sentimentStats.negative > 0 ? 100 : 0,
            changeType: sentimentStats.negative > 0 ? 'negative' : 'neutral',
            format: 'percentage',
          }}
        />
      </div>

      {/* Charts and Insights Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sentiment Distribution */}
        <DonutChart
          title="Distribución de Sentimiento"
          data={donutData}
          height={300}
          innerRadius={70}
          outerRadius={100}
          centerValue={sentimentStats.positive}
          centerLabel="Positivo"
        />

        {/* Insights Panel */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium text-card-foreground">Insights</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Análisis automático basado en los comentarios reales de tus publicaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {comments.length > 0 ? (
              <>
                {/* Frequent Topics */}
                {frequentTopics.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Hash className="h-4 w-4" />
                      Temas Frecuentes
                    </div>
                    <div className="space-y-2">
                      {frequentTopics.slice(0, 4).map((topic) => (
                        <div key={topic.topic} className="flex items-center justify-between">
                          <span className="text-sm text-card-foreground">{topic.topic}</span>
                          <span className="text-sm text-muted-foreground">{topic.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {keywords.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      Palabras Clave
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="bg-secondary text-secondary-foreground">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No hay suficientes comentarios para generar insights. Analiza algunas publicaciones primero.
                </p>
              </div>
            )}

            {/* Alerts */}
            {sentimentStats.negative > 50 && (
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Alertas
                </div>
                <div className="rounded-lg bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">
                    Sentimiento negativo alto detectado ({sentimentStats.negative.toFixed(1)}%). Considera revisar los comentarios negativos.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar comentarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-input"
              />
            </div>

            <Select
              value={platformFilter}
              onValueChange={(value) => setPlatformFilter(value as Platform | 'all')}
            >
              <SelectTrigger className="w-[150px] bg-secondary">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Plataformas</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sentimentFilter}
              onValueChange={(value) => {
                setSentimentFilter(value as SentimentFilter)
                // Recargar comentarios cuando cambie el filtro
              }}
            >
              <SelectTrigger className="w-[150px] bg-secondary">
                <SelectValue placeholder="Sentimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Sentimientos</SelectItem>
                <SelectItem value="positive">Positivo</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negativo</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={tagFilter}
              onValueChange={(value) => setTagFilter(value as TagFilter)}
            >
              <SelectTrigger className="w-[150px] bg-secondary">
                <SelectValue placeholder="Etiqueta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Etiquetas</SelectItem>
                <SelectItem value="praise">Elogio</SelectItem>
                <SelectItem value="complaint">Queja</SelectItem>
                <SelectItem value="question">Pregunta</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Comments Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-card-foreground">
            Comentarios Recientes ({filteredComments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredComments.length > 0 ? (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Platform</TableHead>
                    <TableHead className="text-muted-foreground">Comment</TableHead>
                    <TableHead className="text-muted-foreground">Author</TableHead>
                    <TableHead className="text-muted-foreground">Sentiment</TableHead>
                    <TableHead className="text-muted-foreground">Tag</TableHead>
                    <TableHead className="text-muted-foreground">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComments.slice(0, 20).map((comment) => {
                    const tagConfig = getTagBadge(comment.tag)
                    return (
                      <TableRow key={comment.id} className="border-border">
                        <TableCell>
                          <PlatformBadge platform={comment.platform} showLabel={false} />
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="truncate text-sm text-card-foreground">{comment.text}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {comment.author}
                        </TableCell>
                        <TableCell>
                          <SentimentBadge sentiment={comment.sentiment} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tagConfig.className}>
                            {tagConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(comment.date).toLocaleDateString('es-ES', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              title="No se encontraron comentarios"
              description="Comments will appear here once your posts receive feedback."
              icon={<MessageSquare className="h-12 w-12 text-muted-foreground" />}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
