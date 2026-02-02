'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  Facebook,
  Instagram,
  Music2,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Search,
  Link2,
  User,
  Hash,
  FileText,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  TrendingUp,
  MessageSquare,
  Users,
  ChevronRight,
} from 'lucide-react'
import { getProfiles, createProfile, deleteProfile as deleteProfileAPI } from '@/lib/api'
import { profileToSource } from '@/lib/adapters'
import type { Source, Platform, LinkType, SourceStatus } from '@/types'

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Music2,
}

const platformColors = {
  facebook: 'bg-[oklch(0.55_0.18_255)] text-white',
  instagram: 'bg-[oklch(0.65_0.25_330)] text-white',
  tiktok: 'bg-foreground text-background',
}

const linkTypeIcons = {
  profile: User,
  post: FileText,
  hashtag: Hash,
}

const statusConfig: Record<SourceStatus, { icon: typeof Clock; label: string; className: string }> = {
  pending: { icon: Clock, label: 'Pending', className: 'bg-muted text-muted-foreground border-border' },
  processing: { icon: Loader2, label: 'Processing', className: 'bg-info/20 text-info border-info/30' },
  completed: { icon: CheckCircle2, label: 'Completed', className: 'bg-success/20 text-success border-success/30' },
  error: { icon: AlertCircle, label: 'Error', className: 'bg-destructive/20 text-destructive border-destructive/30' },
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('es-ES', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Add Link Modal State
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newLink, setNewLink] = useState({
    platform: '' as Platform | '',
    linkType: '' as LinkType | '',
    url: '',
    label: '',
  })
  const [formErrors, setFormErrors] = useState<{
    platform?: string
    linkType?: string
    url?: string
  }>({})
  
  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  
  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  
  // Delete Confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingSource, setDeletingSource] = useState<Source | null>(null)

  // Load profiles from API
  useEffect(() => {
    async function loadProfiles() {
      try {
        setLoading(true)
        const profiles = await getProfiles()
        const sourcesData = profiles.map(profileToSource)
        setSources(sourcesData)
      } catch (error) {
        console.error('Error loading profiles:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProfiles()
  }, [])

  // Filter sources
  const filteredSources = useMemo(() => {
    return sources.filter((source) => {
      const matchesSearch =
        source.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.label?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPlatform = platformFilter === 'all' || source.platform === platformFilter
      const matchesType = typeFilter === 'all' || source.linkType === typeFilter
      const matchesStatus = statusFilter === 'all' || source.status === statusFilter
      return matchesSearch && matchesPlatform && matchesType && matchesStatus
    })
  }, [sources, searchQuery, platformFilter, typeFilter, statusFilter])

  // Validate URL
  const validateUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // Handle Add Link
  const handleAddLink = async () => {
    const errors: typeof formErrors = {}
    
    if (!newLink.platform) {
      errors.platform = 'Por favor selecciona una plataforma'
    }
    if (!newLink.url) {
      errors.url = 'La URL es requerida'
    } else if (!validateUrl(newLink.url)) {
      errors.url = 'Por favor ingresa una URL válida'
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    
    try {
      // Extract username from URL or use as-is
      let usernameOrUrl = newLink.url
      try {
        const urlObj = new URL(newLink.url)
        const pathParts = urlObj.pathname.split('/').filter(p => p)
        if (pathParts.length > 0) {
          usernameOrUrl = pathParts[pathParts.length - 1].replace('@', '')
        }
      } catch {
        // If URL parsing fails, use the input as-is
        usernameOrUrl = newLink.url.replace('@', '').replace(/^https?:\/\//, '').split('/')[0]
      }

      const newProfile = await createProfile(newLink.platform as Platform, usernameOrUrl)
      const newSource = profileToSource(newProfile)
      
      setSources([newSource, ...sources])
      setNewLink({ platform: '', linkType: '', url: '', label: '' })
      setFormErrors({})
      setAddModalOpen(false)
    } catch (error) {
      console.error('Error creating profile:', error)
      setFormErrors({ url: 'Failed to create profile. Please try again.' })
    }
  }

  // Handle Edit
  const handleEditSource = () => {
    if (!editingSource) return
    
    setSources(sources.map((s) => (s.id === editingSource.id ? editingSource : s)))
    setEditModalOpen(false)
    setEditingSource(null)
  }

  // Handle Delete
  const handleDeleteSource = async () => {
    if (!deletingSource) return
    
    try {
      await deleteProfileAPI(parseInt(deletingSource.id))
      setSources(sources.filter((s) => s.id !== deletingSource.id))
      setDeleteModalOpen(false)
      setDeletingSource(null)
    } catch (error) {
      console.error('Error deleting profile:', error)
      // Still remove from UI on error (optimistic update)
      setSources(sources.filter((s) => s.id !== deletingSource.id))
      setDeleteModalOpen(false)
      setDeletingSource(null)
    }
  }

  // Open Detail Modal
  const openDetailModal = (source: Source) => {
    setSelectedSource(source)
    setDetailModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (source: Source) => {
    setEditingSource({ ...source })
    setEditModalOpen(true)
  }

  // Open Delete Modal
  const openDeleteModal = (source: Source) => {
    setDeletingSource(source)
    setDeleteModalOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Fuentes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestiona los enlaces y URLs que serán analizados por el sistema
            </p>
          </div>
          
          {/* Add Link Button */}
          <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Enlace
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Link</DialogTitle>
                <DialogDescription>
                  Agrega una URL para rastrear y analizar desde plataformas de redes sociales
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Platform Select */}
                <div className="space-y-2">
                  <Label htmlFor="platform">Plataforma</Label>
                  <Select
                    value={newLink.platform}
                    onValueChange={(value) => {
                      setNewLink({ ...newLink, platform: value as Platform })
                      setFormErrors({ ...formErrors, platform: undefined })
                    }}
                  >
                    <SelectTrigger className={formErrors.platform ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Seleccionar plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">
                        <span className="flex items-center gap-2">
                          <Facebook className="h-4 w-4" />
                          Facebook
                        </span>
                      </SelectItem>
                      <SelectItem value="instagram">
                        <span className="flex items-center gap-2">
                          <Instagram className="h-4 w-4" />
                          Instagram
                        </span>
                      </SelectItem>
                      <SelectItem value="tiktok">
                        <span className="flex items-center gap-2">
                          <Music2 className="h-4 w-4" />
                          TikTok
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.platform && (
                    <p className="text-sm text-destructive">{formErrors.platform}</p>
                  )}
                </div>
                
                {/* Link Type Select */}
                <div className="space-y-2">
                  <Label htmlFor="linkType">Tipo de Enlace</Label>
                  <Select
                    value={newLink.linkType}
                    onValueChange={(value) => {
                      setNewLink({ ...newLink, linkType: value as LinkType })
                      setFormErrors({ ...formErrors, linkType: undefined })
                    }}
                  >
                    <SelectTrigger className={formErrors.linkType ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profile">
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Perfil
                        </span>
                      </SelectItem>
                      <SelectItem value="post">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Publicación
                        </span>
                      </SelectItem>
                      <SelectItem value="hashtag">
                        <span className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Hashtag
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.linkType && (
                    <p className="text-sm text-destructive">{formErrors.linkType}</p>
                  )}
                </div>
                
                {/* URL Input */}
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://..."
                    value={newLink.url}
                    onChange={(e) => {
                      setNewLink({ ...newLink, url: e.target.value })
                      setFormErrors({ ...formErrors, url: undefined })
                    }}
                    className={formErrors.url ? 'border-destructive' : ''}
                  />
                  {formErrors.url && (
                    <p className="text-sm text-destructive">{formErrors.url}</p>
                  )}
                </div>
                
                {/* Label Input (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="label">
                    Etiqueta <span className="text-muted-foreground">(Opcional)</span>
                  </Label>
                  <Input
                    id="label"
                    placeholder="ej., Página Principal de la Marca"
                    value={newLink.label}
                    onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddLink}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por URL o etiqueta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Platform Filter */}
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Plataformas</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Tipos</SelectItem>
                  <SelectItem value="profile">Perfil</SelectItem>
                  <SelectItem value="post">Publicación</SelectItem>
                  <SelectItem value="hashtag">Hashtag</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="processing">Procesando</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sources Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-card-foreground">
              Enlaces Registrados
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredSources.length} {filteredSources.length === 1 ? 'enlace' : 'enlaces'})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-32">Plataforma</TableHead>
                  <TableHead className="w-24">Tipo</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-32">Fecha de Agregado</TableHead>
                  <TableHead className="w-28">Estado</TableHead>
                  <TableHead className="w-20 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Link2 className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No se encontraron enlaces</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAddModalOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Agrega tu primer enlace
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSources.map((source) => {
                    const PlatformIcon = platformIcons[source.platform]
                    const TypeIcon = linkTypeIcons[source.linkType]
                    const statusInfo = statusConfig[source.status]
                    const StatusIcon = statusInfo.icon
                    
                    return (
                      <TableRow key={source.id} className="group">
                        <TableCell>
                          <Badge className={`${platformColors[source.platform]} gap-1`}>
                            <PlatformIcon className="h-3 w-3" />
                            <span className="capitalize">{source.platform}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <TypeIcon className="h-4 w-4" />
                            <span className="capitalize text-sm">{source.linkType}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col gap-0.5">
                                {source.label && (
                                  <span className="font-medium text-card-foreground">
                                    {source.label}
                                  </span>
                                )}
                                <span className="text-sm text-muted-foreground truncate max-w-xs">
                                  {source.url}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm">
                              <p className="break-all">{source.url}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(source.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${statusInfo.className} gap-1`}
                          >
                            <StatusIcon
                              className={`h-3 w-3 ${
                                source.status === 'processing' ? 'animate-spin' : ''
                              }`}
                            />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetailModal(source)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditModal(source)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDeleteModal(source)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="sm:max-w-lg">
            {selectedSource && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <Badge className={platformColors[selectedSource.platform]}>
                      {(() => {
                        const Icon = platformIcons[selectedSource.platform]
                        return <Icon className="h-3 w-3" />
                      })()}
                    </Badge>
                    <DialogTitle>
                      {selectedSource.label || 'Detalles del Enlace'}
                    </DialogTitle>
                  </div>
                  <DialogDescription className="text-left">
                    {/* Breadcrumb - moved outside DialogDescription to avoid HTML nesting error */}
                  </DialogDescription>
                  <div className="flex items-center gap-1 text-xs mt-2 text-muted-foreground">
                    <span className="capitalize">{selectedSource.platform}</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="capitalize">{selectedSource.linkType}</span>
                    <ChevronRight className="h-3 w-3" />
                    <span>Detalles</span>
                  </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Link Info */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">URL</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-muted p-2 rounded-md break-all">
                        {selectedSource.url}
                      </code>
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={selectedSource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Estado Actual</Label>
                    <div>
                      <Badge
                        variant="outline"
                        className={`${statusConfig[selectedSource.status].className} gap-1`}
                      >
                        {(() => {
                          const StatusIcon = statusConfig[selectedSource.status].icon
                          return (
                            <StatusIcon
                              className={`h-3 w-3 ${
                                selectedSource.status === 'processing' ? 'animate-spin' : ''
                              }`}
                            />
                          )
                        })()}
                        {statusConfig[selectedSource.status].label}
                      </Badge>
                    </div>
                  </div>

                  {/* Metrics (if completed) */}
                  {selectedSource.metrics && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Métricas</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs">Reach</span>
                          </div>
                          <p className="text-lg font-semibold text-foreground">
                            {formatNumber(selectedSource.metrics.reach)}
                          </p>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Users className="h-4 w-4" />
                            <span className="text-xs">Interactions</span>
                          </div>
                          <p className="text-lg font-semibold text-foreground">
                            {formatNumber(selectedSource.metrics.interactions)}
                          </p>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-xs">Comments</span>
                          </div>
                          <p className="text-lg font-semibold text-foreground">
                            {formatNumber(selectedSource.metrics.comments)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* History Timeline */}
                  {selectedSource.history && selectedSource.history.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Historial</Label>
                      <div className="space-y-3">
                        {selectedSource.history.map((entry, index) => {
                          const EntryIcon = statusConfig[entry.status].icon
                          return (
                            <div key={index} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                    index === selectedSource.history!.length - 1
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  }`}
                                >
                                  <EntryIcon
                                    className={`h-4 w-4 ${
                                      entry.status === 'processing' ? 'animate-spin' : ''
                                    }`}
                                  />
                                </div>
                                {index < selectedSource.history!.length - 1 && (
                                  <div className="h-full w-px bg-border mt-1" />
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <p className="text-sm font-medium text-foreground capitalize">
                                  {entry.status}
                                </p>
                                {entry.message && (
                                  <p className="text-sm text-muted-foreground">
                                    {entry.message}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDateTime(entry.date)}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                    Cerrar
                  </Button>
                  <Button onClick={() => {
                    setDetailModalOpen(false)
                    openEditModal(selectedSource)
                  }}>
                    Editar Enlace
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Enlace</DialogTitle>
              <DialogDescription>
                Actualiza la información del enlace
              </DialogDescription>
            </DialogHeader>
            {editingSource && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Plataforma</Label>
                  <Select
                    value={editingSource.platform}
                    onValueChange={(value) =>
                      setEditingSource({ ...editingSource, platform: value as Platform })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Tipo de Enlace</Label>
                  <Select
                    value={editingSource.linkType}
                    onValueChange={(value) =>
                      setEditingSource({ ...editingSource, linkType: value as LinkType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profile">Perfil</SelectItem>
                      <SelectItem value="post">Publicación</SelectItem>
                      <SelectItem value="hashtag">Hashtag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    value={editingSource.url}
                    onChange={(e) =>
                      setEditingSource({ ...editingSource, url: e.target.value })
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Etiqueta (Opcional)</Label>
                  <Input
                    value={editingSource.label || ''}
                    onChange={(e) =>
                      setEditingSource({ ...editingSource, label: e.target.value || undefined })
                    }
                    placeholder="ej., Página Principal de la Marca"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditSource}>Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Eliminar Enlace</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que quieres eliminar este enlace? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            {deletingSource && (
              <div className="py-4">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-medium text-foreground">
                    {deletingSource.label || 'Untitled Link'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {deletingSource.url}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteSource}>
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
