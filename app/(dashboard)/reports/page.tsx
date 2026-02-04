'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
import { CalendarIcon, Download, FileText, BarChart3, PieChart, TrendingUp } from 'lucide-react'
import { downloadPDFReport, getProfiles, type Profile } from '@/lib/api'
import { toast } from 'sonner'
import { useFilters } from '@/contexts/filters-context'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { DateRange } from 'react-day-picker'

const reportTemplates = [
  {
    id: 'weekly',
    name: 'Rendimiento Semanal',
    description: 'Resumen de métricas clave de los últimos 7 días',
    icon: TrendingUp,
  },
  {
    id: 'monthly',
    name: 'Resumen Mensual',
    description: 'Reporte mensual completo con tendencias',
    icon: BarChart3,
  },
  {
    id: 'sentiment',
    name: 'Reporte de Sentimiento',
    description: 'Análisis profundo del sentimiento y feedback de la audiencia',
    icon: PieChart,
  },
]

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfileIds, setSelectedProfileIds] = useState<number[]>([])
  const [reportFormat, setReportFormat] = useState('pdf')
  const [isGenerating, setIsGenerating] = useState(false)
  const { selectedSources } = useFilters()

  useEffect(() => {
    async function loadProfiles() {
      try {
        const allProfiles = await getProfiles()
        setProfiles(allProfiles)
        // Si hay perfiles seleccionados en el filtro, usarlos
        if (selectedSources.length > 0) {
          setSelectedProfileIds(selectedSources.map(id => parseInt(id)))
        } else {
          // Por defecto, seleccionar todos
          setSelectedProfileIds(allProfiles.map(p => p.id))
        }
      } catch (error) {
        console.error('Error cargando perfiles:', error)
      }
    }
    loadProfiles()
  }, [selectedSources])

  const handleProfileToggle = (profileId: number) => {
    setSelectedProfileIds((prev) =>
      prev.includes(profileId)
        ? prev.filter((p) => p !== profileId)
        : [...prev, profileId]
    )
  }

  const handleSelectAll = () => {
    if (selectedProfileIds.length === profiles.length) {
      setSelectedProfileIds([])
    } else {
      setSelectedProfileIds(profiles.map(p => p.id))
    }
  }

  const getPlatformLabel = (platform: string) => {
    const labels: Record<string, string> = {
      'facebook': 'Facebook',
      'instagram': 'Instagram',
      'tiktok': 'TikTok'
    }
    return labels[platform.toLowerCase()] || platform
  }

  const handleGenerate = async () => {
    if (reportFormat !== 'pdf') {
      toast.error('Por ahora solo se soporta el formato PDF')
      return
    }
    
    if (selectedProfileIds.length === 0) {
      toast.error('Por favor selecciona al menos un perfil')
      return
    }
    
    setIsGenerating(true)
    try {
      // Si solo hay un perfil seleccionado, usar profile_id
      // Si hay múltiples, el backend los procesará todos
      const profileId = selectedProfileIds.length === 1 ? selectedProfileIds[0] : undefined
      const days = dateRange?.from && dateRange?.to
        ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
        : 7
      
      // Para múltiples perfiles, necesitamos pasar los IDs de alguna forma
      // Por ahora, generamos un reporte por cada perfil o combinado
      const blob = await downloadPDFReport(
        selectedProfileIds.length === 1 ? selectedProfileIds[0] : undefined,
        selectedProfileIds.length > 1 ? selectedProfileIds : undefined,
        undefined,
        days
      )
      
      // Crear link de descarga
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const selectedNames = profiles
        .filter(p => selectedProfileIds.includes(p.id))
        .map(p => p.display_name || p.username_or_url)
        .join('_')
        .replace(/[^a-zA-Z0-9_]/g, '_')
      a.download = `reporte_${selectedNames}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Reporte PDF descargado exitosamente')
    } catch (error) {
      console.error('Error generando reporte:', error)
      toast.error('Error al generar el reporte PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reportes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Genera reportes personalizados del rendimiento de tus redes sociales
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Perfiles Seleccionados */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium text-card-foreground">Perfiles a Incluir</CardTitle>
                  <CardDescription>Selecciona qué perfiles incluir en el reporte</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {selectedProfileIds.length === profiles.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {profiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay perfiles disponibles. Agrega perfiles en la sección Fuentes.
                  </p>
                ) : (
                  profiles.map((profile) => (
                    <div key={profile.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary/50">
                      <Checkbox
                        id={`profile-${profile.id}`}
                        checked={selectedProfileIds.includes(profile.id)}
                        onCheckedChange={() => handleProfileToggle(profile.id)}
                      />
                      <Label
                        htmlFor={`profile-${profile.id}`}
                        className="text-sm font-medium text-card-foreground cursor-pointer flex-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="capitalize">{getPlatformLabel(profile.platform)}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{profile.display_name || profile.username_or_url}</span>
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">Rango de Fechas</CardTitle>
              <CardDescription>Selecciona el período de tiempo para tu reporte</CardDescription>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd 'de' MMMM, yyyy", { locale: es })} - {format(dateRange.to, "dd 'de' MMMM, yyyy", { locale: es })}
                        </>
                      ) : (
                        format(dateRange.from, "dd 'de' MMMM, yyyy", { locale: es })
                      )
                    ) : (
                      <span>Selecciona un rango de fechas</span>
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
            </CardContent>
          </Card>

          {/* Format & Generate */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">Configuración de Exportación</CardTitle>
              <CardDescription>Elige el formato y genera el reporte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Select value={reportFormat} onValueChange={setReportFormat}>
                  <SelectTrigger className="w-[180px] bg-secondary">
                    <SelectValue placeholder="Formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">Documento PDF</SelectItem>
                    <SelectItem value="csv" disabled>Hoja de Cálculo CSV</SelectItem>
                    <SelectItem value="xlsx" disabled>Excel (XLSX)</SelectItem>
                    <SelectItem value="json" disabled>Datos JSON</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedProfileIds.length === 0}
                >
                  {isGenerating ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Generar Reporte
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Templates & Preview */}
        <div className="space-y-6">
          {/* Templates */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">Plantillas Rápidas</CardTitle>
              <CardDescription>Comienza con una plantilla preconfigurada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportTemplates.map((template) => {
                const Icon = template.icon
                return (
                  <button
                    key={template.id}
                    className="w-full flex items-start gap-3 rounded-lg border border-border bg-secondary p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">Vista Previa del Reporte</CardTitle>
              <CardDescription>Vista previa de tu reporte generado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 py-12">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm font-medium text-card-foreground">No se ha generado ningún reporte</p>
                <p className="mt-1 text-xs text-muted-foreground text-center">
                  Configura tu reporte y haz clic en Generar
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
