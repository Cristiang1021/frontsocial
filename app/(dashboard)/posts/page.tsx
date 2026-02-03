'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { PlatformBadge } from '@/components/platform-badge'
import { SentimentBadge } from '@/components/sentiment-badge'
import { PostDetailModal } from '@/components/post-detail-modal'
import { TableSkeleton, ErrorState, EmptyState } from '@/components/states'
import { Search, ArrowUpDown, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardDescription } from '@/components/ui/card'
import { getPosts } from '@/lib/api'
import { apiPostToPost } from '@/lib/adapters'
import { useFilters } from '@/contexts/filters-context'
import type { Post, Platform, ViewState } from '@/types'

type SortKey = 'date' | 'reach' | 'interactions' | 'engagementRate'
type SortOrder = 'asc' | 'desc'

export default function PostsPage() {
  const [state, setState] = useState<ViewState>('loading')
  const [posts, setPosts] = useState<Post[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const postsPerPage = 20
  const { dateRange, selectedSources } = useFilters()

  useEffect(() => {
    async function loadPosts() {
      try {
        setState('loading')
        const platform = platformFilter !== 'all' ? platformFilter : undefined
        const dateFrom = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : undefined
        const dateTo = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : undefined
        const profileIds = selectedSources.length > 0 ? selectedSources.map(id => parseInt(id)) : undefined
        
        // If multiple profiles selected, make multiple API calls and combine results
        if (profileIds && profileIds.length > 0) {
          const allResponses = await Promise.all(
            profileIds.map(profileId => 
              getPosts({ 
                platform, 
                limit: 200,
                date_from: dateFrom,
                date_to: dateTo,
                profile_id: profileId
              })
            )
          )
          
          // Combine all posts and remove duplicates by post_id
          const allPostsData = allResponses.flatMap(response => response.data || [])
          const uniquePosts = Array.from(
            new Map(allPostsData.map(post => [post.post_id, post])).values()
          )
          
          console.log('Posts response (combined):', { 
            total: uniquePosts.length, 
            dataLength: uniquePosts.length,
            profiles: profileIds.length 
          })
          const transformedPosts = uniquePosts.map(apiPostToPost)
          console.log('Transformed posts:', transformedPosts.length)
          setPosts(transformedPosts)
        } else {
          // No profiles selected or all profiles
          const response = await getPosts({ 
            platform, 
            limit: 200,
            date_from: dateFrom,
            date_to: dateTo,
            profile_id: undefined
          })
          console.log('Posts response:', { total: response.total, dataLength: response.data?.length })
          const transformedPosts = response.data.map(apiPostToPost)
          console.log('Transformed posts:', transformedPosts.length)
          setPosts(transformedPosts)
        }
        setState('success')
      } catch (error) {
        console.error('Error loading posts:', error)
        setState('error')
      }
    }
    loadPosts()
    setCurrentPage(1) // Reset to first page when filters change
  }, [platformFilter, dateRange, selectedSources]) // Recargar cuando cambien los filtros

  const filteredAndSortedPosts = useMemo(() => {
    let result = [...posts]

    // Search filter
    if (searchQuery) {
      result = result.filter((post) =>
        post.caption.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Platform filter
    if (platformFilter !== 'all') {
      result = result.filter((post) => post.platform === platformFilter)
    }

    // Sort
    result.sort((a, b) => {
      const aValue = a[sortKey]
      const bValue = b[sortKey]
      const modifier = sortOrder === 'asc' ? 1 : -1

      if (sortKey === 'date') {
        return modifier * (new Date(aValue as string).getTime() - new Date(bValue as string).getTime())
      }
      return modifier * ((aValue as number) - (bValue as number))
    })

    return result
  }, [searchQuery, platformFilter, sortKey, sortOrder])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  const handlePostClick = (post: Post) => {
    setSelectedPost(post)
    setModalOpen(true)
  }

  const getSentimentLevel = (score: number): 'positive' | 'neutral' | 'negative' => {
    if (score >= 0.7) return 'positive'
    if (score >= 0.4) return 'neutral'
    return 'negative'
  }

  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <TableSkeleton rows={10} columns={7} />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and analyze all your posts across platforms
          </p>
        </div>
        <ErrorState onRetry={() => setState('loading')} />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Publicaciones</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Ver y analizar todas tus publicaciones en todas las plataformas
        </p>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1 w-full sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar publicaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-input text-sm"
              />
            </div>

            {/* Platform Filter */}
            <Select
              value={platformFilter}
              onValueChange={(value) => setPlatformFilter(value as Platform | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[150px] bg-secondary text-sm">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Plataformas</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={sortKey}
              onValueChange={(value) => setSortKey(value as SortKey)}
            >
              <SelectTrigger className="w-full sm:w-[150px] bg-secondary text-sm">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Fecha</SelectItem>
                <SelectItem value="reach">Alcance</SelectItem>
                <SelectItem value="interactions">Interacciones</SelectItem>
                <SelectItem value="engagementRate">Tasa de Participación</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-base font-medium text-card-foreground">
            Todas las Publicaciones ({filteredAndSortedPosts.length})
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Mostrando {((currentPage - 1) * postsPerPage) + 1}-{Math.min(currentPage * postsPerPage, filteredAndSortedPosts.length)} de {filteredAndSortedPosts.length} publicaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 px-0 sm:px-6">
          {filteredAndSortedPosts.length > 0 ? (
            <>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs sm:text-sm min-w-[150px] sm:min-w-[200px]">Post</TableHead>
                      <TableHead className="text-muted-foreground text-xs sm:text-sm min-w-[80px]">Platform</TableHead>
                      <TableHead className="text-muted-foreground text-xs sm:text-sm min-w-[100px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('date')}
                          className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground text-xs sm:text-sm"
                        >
                          Fecha
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground text-xs sm:text-sm min-w-[80px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('reach')}
                          className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground text-xs sm:text-sm"
                        >
                          Alcance
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground text-xs sm:text-sm min-w-[100px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('interactions')}
                          className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground text-xs sm:text-sm"
                        >
                          Interacciones
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground text-xs sm:text-sm min-w-[80px]">Me Gusta</TableHead>
                      <TableHead className="text-right text-muted-foreground text-xs sm:text-sm min-w-[100px]">Comentarios</TableHead>
                      <TableHead className="text-muted-foreground text-xs sm:text-sm min-w-[100px]">Sentimiento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage).map((post) => (
                      <TableRow
                        key={post.id}
                        className="border-border cursor-pointer hover:bg-muted/50"
                        onClick={() => handlePostClick(post)}
                      >
                        <TableCell className="max-w-[150px] sm:max-w-[200px] min-w-[150px] sm:min-w-[200px]">
                          <p className="truncate text-xs sm:text-sm text-card-foreground">{post.caption}</p>
                        </TableCell>
                        <TableCell className="min-w-[80px]">
                          <PlatformBadge platform={post.platform} />
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-muted-foreground min-w-[100px]">
                          {new Date(post.date).toLocaleDateString('es-ES', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-card-foreground min-w-[80px]">
                          {new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(post.reach)}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-card-foreground min-w-[100px]">
                          {new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(post.interactions)}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-card-foreground min-w-[80px]">
                          {new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(post.likes)}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-card-foreground min-w-[100px]">
                          {new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(post.comments)}
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          <SentimentBadge sentiment={getSentimentLevel(post.sentimentScore)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredAndSortedPosts.length > postsPerPage && (
                <div className="mt-4 px-3 sm:px-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Página {currentPage} de {Math.ceil(filteredAndSortedPosts.length / postsPerPage)}
                  </p>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex-1 sm:flex-initial text-xs sm:text-sm"
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredAndSortedPosts.length / postsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(filteredAndSortedPosts.length / postsPerPage)}
                      className="flex-1 sm:flex-initial text-xs sm:text-sm"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No se encontraron publicaciones"
              description={searchQuery ? 'Intenta ajustar tu búsqueda o filtros.' : 'Las publicaciones aparecerán aquí una vez que se publiquen.'}
              icon={<FileText className="h-12 w-12 text-muted-foreground" />}
            />
          )}
        </CardContent>
      </Card>

      {/* Post Detail Modal */}
      <PostDetailModal
        post={selectedPost}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
