'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Download, FileText, MessageSquare, BarChart3 } from 'lucide-react'
import { 
  getProfiles, 
  downloadCommentsCSV, 
  downloadPostsCSV, 
  downloadInteractionsCSV,
  type Profile,
  type ExportFilters 
} from '@/lib/api'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { DateRange } from 'react-day-picker'

const exportTypes = [
  {
    id: 'comments',
    name: 'Comentarios',
    description: 'Todos los comentarios con análisis de sentimiento',
    icon: MessageSquare,
  },
  {
    id: 'posts',
    name: 'Posts',
    description: 'Todos los posts con métricas de interacción',
    icon: FileText,
  },
  {
    id: 'interactions',
    name: 'Interacciones',
    description: 'Estadísticas de interacciones agregadas por día',
    icon: BarChart3,
  },
]

const platforms = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
]

const sentiments = [
  { value: 'POSITIVE', label: 'Positivo' },
  { value: 'NEGATIVE', label: 'Negativo' },
  { value: 'NEUTRAL', label: 'Neutral' },
]

export default function ExportPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedExportType, setSelectedExportType] = useState<string>('comments')
  const [selectedProfileIds, setSelectedProfileIds] = useState<number[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<string | undefined>()
  const [selectedSentiment, setSelectedSentiment] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      const data = await getProfiles()
      setProfiles(data)
    } catch (error) {
      console.error('Error cargando perfiles:', error)
      toast.error('Error al cargar los perfiles')
    }
  }

  const handleExport = async () => {
    if (!selectedExportType) {
      toast.error('Selecciona un tipo de exportación')
      return
    }

    setIsLoading(true)
    try {
      const filters: ExportFilters = {
        profileIds: selectedProfileIds.length > 0 ? selectedProfileIds : undefined,
        platform: selectedPlatform,
        sentiment: selectedSentiment,
        dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      }

      switch (selectedExportType) {
        case 'comments':
          await downloadCommentsCSV(filters)
          toast.success('Descargando comentarios...')
          break
        case 'posts':
          await downloadPostsCSV(filters)
          toast.success('Descargando posts...')
          break
        case 'interactions':
          await downloadInteractionsCSV(filters)
          toast.success('Descargando interacciones...')
          break
        default:
          toast.error('Tipo de exportación no válido')
      }
    } catch (error) {
      console.error('Error exportando:', error)
      toast.error('Error al exportar los datos')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedExportTypeData = exportTypes.find(t => t.id === selectedExportType)
  const ExportIcon = selectedExportTypeData?.icon || Download

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Exportar Datos</h1>
        <p className="text-muted-foreground mt-2">
          Descarga tus datos en formato CSV para análisis externo
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tipo de Exportación */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Datos</CardTitle>
            <CardDescription>Selecciona qué tipo de datos quieres exportar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {exportTypes.map((type) => {
              const Icon = type.icon
              return (
                <div
                  key={type.id}
                  onClick={() => setSelectedExportType(type.id)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                    selectedExportType === type.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{type.name}</div>
                    <div className="text-sm text-muted-foreground">{type.description}</div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Opcional: filtra los datos antes de exportar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Perfiles (selección múltiple) */}
            <div className="space-y-2">
              <Label>Perfiles</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-profiles"
                    checked={selectedProfileIds.length === profiles.length && profiles.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedProfileIds(profiles.map(p => p.id))
                      } else {
                        setSelectedProfileIds([])
                      }
                    }}
                  />
                  <label
                    htmlFor="select-all-profiles"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Seleccionar todos
                  </label>
                </div>
                <div className="border-t my-2" />
                {profiles.map((profile) => (
                  <div key={profile.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`profile-${profile.id}`}
                      checked={selectedProfileIds.includes(profile.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedProfileIds([...selectedProfileIds, profile.id])
                        } else {
                          setSelectedProfileIds(selectedProfileIds.filter(id => id !== profile.id))
                        }
                      }}
                    />
                    <label
                      htmlFor={`profile-${profile.id}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {profile.display_name || profile.username_or_url} ({profile.platform})
                    </label>
                  </div>
                ))}
              </div>
              {selectedProfileIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedProfileIds.length} perfil{selectedProfileIds.length > 1 ? 'es' : ''} seleccionado{selectedProfileIds.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Plataforma */}
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select
                value={selectedPlatform || 'all'}
                onValueChange={(value) => setSelectedPlatform(value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las plataformas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las plataformas</SelectItem>
                  {platforms.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sentimiento (solo para comentarios) */}
            {selectedExportType === 'comments' && (
              <div className="space-y-2">
                <Label>Sentimiento</Label>
                <Select
                  value={selectedSentiment || 'all'}
                  onValueChange={(value) => setSelectedSentiment(value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los sentimientos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los sentimientos</SelectItem>
                    {sentiments.map((sentiment) => (
                      <SelectItem key={sentiment.value} value={sentiment.value}>
                        {sentiment.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Rango de Fechas */}
            <div className="space-y-2">
              <Label>Rango de Fechas</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'PPP', { locale: es })} -{' '}
                          {format(dateRange.to, 'PPP', { locale: es })}
                        </>
                      ) : (
                        format(dateRange.from, 'PPP', { locale: es })
                      )
                    ) : (
                      <span>Seleccionar fechas</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botón de Exportar */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleExport}
            disabled={isLoading || !selectedExportType}
            className="w-full"
            size="lg"
          >
            <ExportIcon className="mr-2 h-5 w-5" />
            {isLoading ? 'Exportando...' : `Exportar ${selectedExportTypeData?.name || 'Datos'}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
