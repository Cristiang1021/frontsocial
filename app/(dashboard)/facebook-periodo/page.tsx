'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { CalendarRange, Facebook, Loader2, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, BarChart3, Download } from 'lucide-react'
import { getProfiles, runFacebookPeriodAnalysis, getPosts, type Profile, type Post } from '@/lib/api'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const API_OPTIONS = [
  { value: 'default', label: 'Principal (por perfil)' },
  { value: 'facebook_1', label: 'Token Facebook 1' },
  { value: 'facebook_2', label: 'Token Facebook 2' },
] as const

function getLastDayOfMonth(y: number, m: number): string {
  const last = new Date(y, m, 0)
  return last.getFullYear() + '-' + String(last.getMonth() + 1).padStart(2, '0') + '-' + String(last.getDate()).padStart(2, '0')
}

type DailyStat = {
  date: string
  visualizaciones: number
  interacciones: number
  publicaciones: number
  likes: number
  comentarios: number
  compartidos: number
}

function aggregatePostsByDay(posts: Post[]): DailyStat[] {
  const byDay: Record<string, DailyStat> = {}
  for (const p of posts) {
    const raw = p.posted_at
    if (!raw) continue
    const d = typeof raw === 'string' ? raw.slice(0, 10) : new Date(raw).toISOString().slice(0, 10)
    if (!byDay[d]) {
      byDay[d] = { date: d, visualizaciones: 0, interacciones: 0, publicaciones: 0, likes: 0, comentarios: 0, compartidos: 0 }
    }
    const row = byDay[d]
    row.visualizaciones += p.views ?? 0
    row.likes += p.likes ?? 0
    row.comentarios += p.comments_count ?? 0
    row.compartidos += p.shares ?? 0
    row.interacciones += (p.likes ?? 0) + (p.comments_count ?? 0) + (p.shares ?? 0)
    row.publicaciones += 1
  }
  return Object.keys(byDay).sort().map((date) => byDay[date])
}

function formatMetricValue(value: number): string {
  if (value >= 1000000) return (value / 1000000).toFixed(1).replace('.', ',') + ' mill.'
  if (value >= 1000) return (value / 1000).toFixed(1).replace('.', ',') + ' mil'
  return new Intl.NumberFormat('es-ES').format(value)
}

const CHART_LINE_COLOR = 'oklch(0.75 0.15 195)' // primary/cyan

export default function FacebookPeriodoPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [result, setResult] = useState<{
    posts_scraped?: number
    posts_processed?: number
    comments_scraped?: number
    errors?: string[]
  } | null>(null)
  const [chartData, setChartData] = useState<DailyStat[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [showCharts, setShowCharts] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2019 + 2 }, (_, i) => 2020 + i)

  const [month, setMonth] = useState(1)
  const [year, setYear] = useState(currentYear)
  const [profileId, setProfileId] = useState<number | null>(null)
  const [apifyTokenKey, setApifyTokenKey] = useState<string | null>('default')
  const [includeComments, setIncludeComments] = useState(false)

  const fbProfiles = profiles.filter((p) => (p.platform || '').toLowerCase() === 'facebook')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await getProfiles()
        setProfiles(data)
        if (data.length && !profileId) {
          const firstFb = data.find((p) => (p.platform || '').toLowerCase() === 'facebook')
          if (firstFb) setProfileId(firstFb.id)
        }
      } catch (e) {
        console.error(e)
        setMessage({ type: 'error', text: 'Error al cargar perfiles' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
  const dateTo = getLastDayOfMonth(year, month)

  const fetchChartData = async () => {
    if (profileId == null) return
    setChartLoading(true)
    setShowCharts(true)
    try {
      const res = await getPosts({
        profile_id: profileId,
        date_from: dateFrom,
        date_to: dateTo,
        limit: 500,
      })
      const aggregated = aggregatePostsByDay(res.data || [])
      setChartData(aggregated)
    } catch (e) {
      console.error(e)
      setChartData([])
    } finally {
      setChartLoading(false)
    }
  }

  const handleRun = async () => {
    if (profileId == null) {
      setMessage({ type: 'error', text: 'Elige un perfil de Facebook' })
      return
    }
    setMessage(null)
    setResult(null)
    setRunning(true)
    try {
      const res = await runFacebookPeriodAnalysis({
        profile_id: profileId,
        year,
        month,
        apify_token_key: (apifyTokenKey === 'default' || apifyTokenKey == null) ? undefined : apifyTokenKey,
        include_comments: includeComments,
      })
      setResult({
        posts_scraped: res.posts_scraped,
        posts_processed: res.posts_processed,
        comments_scraped: res.comments_scraped,
        errors: res.errors,
      })
      setMessage({ type: 'success', text: 'Análisis completado. Los datos se guardaron en la base.' })
      await fetchChartData()
    } catch (e: unknown) {
      const text = e instanceof Error ? e.message : 'Error al ejecutar el análisis'
      setMessage({ type: 'error', text })
      setResult(null)
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <CalendarRange className="h-7 w-7" />
          Facebook por período
        </h1>
        <p className="text-muted-foreground mt-1">
          Analiza solo un mes y año concretos de un perfil de Facebook. No modifica la configuración global.
        </p>
      </div>

      {fbProfiles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No hay perfiles de Facebook. Ve a <strong>Fuentes</strong> y agrega al menos uno.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Facebook className="h-5 w-5" />
              Parámetros del análisis
            </CardTitle>
            <CardDescription>
              Elige mes, año, perfil y qué API de Apify usar. Los datos se guardan en la misma base y puedes verlos en el Dashboard filtrando por fechas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((name, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Año</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Perfil de Facebook</Label>
                <Select
                  value={profileId != null ? String(profileId) : ''}
                  onValueChange={(v) => setProfileId(v ? Number(v) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {fbProfiles.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.display_name || p.username_or_url} (ID {p.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>API de Apify</Label>
                <Select
                  value={apifyTokenKey ?? 'default'}
                  onValueChange={(v) => setApifyTokenKey(v === 'default' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {API_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-comments"
                checked={includeComments}
                onCheckedChange={(checked) => setIncludeComments(!!checked)}
              />
              <Label htmlFor="include-comments" className="text-sm font-normal cursor-pointer">
                Incluir comentarios (más lento y consume más cuota)
              </Label>
            </div>

            {message && (
              <div
                className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                  message.type === 'success'
                    ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'border-destructive/30 bg-destructive/10 text-destructive'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {result && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">Resultado</p>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>Posts obtenidos: <strong className="text-foreground">{result.posts_scraped ?? 0}</strong></span>
                  <span>Posts guardados: <strong className="text-foreground">{result.posts_processed ?? 0}</strong></span>
                  {includeComments && (
                    <span>Comentarios: <strong className="text-foreground">{result.comments_scraped ?? 0}</strong></span>
                  )}
                </div>
                {result.errors && result.errors.length > 0 && (
                  <ul className="text-sm text-destructive list-disc list-inside">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Button
              onClick={handleRun}
              disabled={running || profileId == null}
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analizando…
                </>
              ) : (
                'Analizar este período'
              )}
            </Button>

            {profileId != null && (
              <Button variant="outline" onClick={fetchChartData} disabled={chartLoading}>
                {chartLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                Ver gráficas del período
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {showCharts && (chartLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : chartData.length > 0 ? (
        <ChartsSection
          chartData={chartData}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onExport={() => {
            const headers = ['Fecha', 'Visualizaciones', 'Interacciones', 'Publicaciones', 'Likes', 'Comentarios', 'Compartidos']
            const rows = chartData.map((r) => [r.date, r.visualizaciones, r.interacciones, r.publicaciones, r.likes, r.comentarios, r.compartidos].join(','))
            const csv = [headers.join(','), ...rows].join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `facebook-periodo-${dateFrom}-${dateTo}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
        />
      ) : (
        showCharts && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">
                No hay datos para graficar en este período. Ejecuta el análisis primero o elige otro mes/año y perfil.
              </p>
            </CardContent>
          </Card>
        )
      ))}
    </div>
  )
}

type MetricKey = 'visualizaciones' | 'interacciones' | 'publicaciones' | 'likes' | 'comentarios' | 'compartidos'

function ChartsSection({
  chartData,
  dateFrom,
  dateTo,
  onExport,
}: {
  chartData: DailyStat[]
  dateFrom: string
  dateTo: string
  onExport: () => void
}) {
  const totals = useMemo(() => {
    const t = { visualizaciones: 0, interacciones: 0, publicaciones: 0, likes: 0, comentarios: 0, compartidos: 0 }
    for (const row of chartData) {
      t.visualizaciones += row.visualizaciones
      t.interacciones += row.interacciones
      t.publicaciones += row.publicaciones
      t.likes += row.likes
      t.comentarios += row.comentarios
      t.compartidos += row.compartidos
    }
    return t
  }, [chartData])

  const changes = useMemo(() => {
    if (chartData.length < 2) return { visualizaciones: 0, interacciones: 0, publicaciones: 0, likes: 0, comentarios: 0, compartidos: 0 }
    const first = chartData[0]
    const last = chartData[chartData.length - 1]
    const pct = (key: MetricKey) => {
      const a = first[key]
      const b = last[key]
      if (a === 0) return b > 0 ? 100 : 0
      return ((b - a) / a) * 100
    }
    return {
      visualizaciones: pct('visualizaciones'),
      interacciones: pct('interacciones'),
      publicaciones: pct('publicaciones'),
      likes: pct('likes'),
      comentarios: pct('comentarios'),
      compartidos: pct('compartidos'),
    }
  }, [chartData])

  const metrics: { key: MetricKey; label: string }[] = [
    { key: 'visualizaciones', label: 'Visualizaciones' },
    { key: 'interacciones', label: 'Interacciones con el contenido' },
    { key: 'publicaciones', label: 'Publicaciones' },
    { key: 'likes', label: 'Likes' },
    { key: 'comentarios', label: 'Comentarios' },
    { key: 'compartidos', label: 'Compartidos' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Gráficas del período ({dateFrom} – {dateTo})
        </h2>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(({ key, label }) => {
          const total = totals[key]
          const change = changes[key]
          const isPositive = change >= 0
          return (
            <Card key={key} className="bg-card border-border overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-semibold text-foreground">{formatMetricValue(total)}</span>
                  {chartData.length >= 2 && (
                    <span className={`flex items-center gap-0.5 text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height={220}>
                    <RechartsLineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="date"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => new Date(v).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'var(--radius)',
                          color: 'hsl(var(--popover-foreground))',
                          padding: '6px 10px',
                        }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        formatter={(value: number) => [value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value), label]}
                      />
                      <Line
                        type="monotone"
                        dataKey={key}
                        name={label}
                        stroke={CHART_LINE_COLOR}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
