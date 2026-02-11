'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Link2, ExternalLink, Key, Brain, Hash, Settings as SettingsIcon, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { getConfig, updateApifyToken, updateApifyTokensByPlatform, getApifyUsage, updateDateFrom, updateDateTo, updateLastDays, updateLimitPosts, updateLimitComments } from '@/lib/api'

export default function SettingsPage() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [apifyTokenFacebook1, setApifyTokenFacebook1] = useState('')
  const [apifyTokenFacebook2, setApifyTokenFacebook2] = useState('')
  const [apifyTokenInstagram, setApifyTokenInstagram] = useState('')
  const [apifyTokenTiktok, setApifyTokenTiktok] = useState('')
  const [apifyUsage, setApifyUsage] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [lastDays, setLastDays] = useState<number>(7)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [useLastDays, setUseLastDays] = useState<boolean>(true) // true = usar últimos N días, false = usar fechas específicas
  const [limitPosts, setLimitPosts] = useState<number>(50)
  const [limitComments, setLimitComments] = useState<number>(200)

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true)
        const [configData, usageData] = await Promise.all([
          getConfig(),
          getApifyUsage().catch(() => null)
        ])
        setConfig(configData)
        // Los 4 tokens; si no hay facebook_1 pero sí token central (migración), usarlo como Facebook 1
        setApifyTokenFacebook1(configData.apify_token_facebook_1 || configData.apify_token || '')
        setApifyTokenFacebook2(configData.apify_token_facebook_2 || '')
        setApifyTokenInstagram(configData.apify_token_instagram || '')
        setApifyTokenTiktok(configData.apify_token_tiktok || '')
        setApifyUsage(usageData)
        // Set date filter values (use new names, fallback to old names for compatibility)
        const lastDaysValue = configData.last_days ?? configData.tiktok_last_days ?? 7
        const dateFromValue = configData.date_from ?? configData.tiktok_date_from ?? ''
        const dateToValue = configData.date_to ?? configData.tiktok_date_to ?? ''
        
        setLastDays(lastDaysValue)
        setDateFrom(dateFromValue)
        setDateTo(dateToValue)
        setLimitPosts(configData.default_limit_posts ?? 50)
        setLimitComments(configData.default_limit_comments ?? 200)
        
        // Determine which mode is active: if last_days > 0, use "last days" mode, otherwise use "specific dates" mode
        setUseLastDays(lastDaysValue > 0 && !dateFromValue && !dateToValue)
      } catch (error) {
        console.error('Error loading config:', error)
        setMessage({ type: 'error', text: 'Error al cargar la configuración' })
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  const handleSaveApifyTokens = async () => {
    try {
      const fb1 = apifyTokenFacebook1.trim()
      if (!fb1) {
        setMessage({ type: 'error', text: 'El token de Facebook (perfil 1) es obligatorio' })
        setTimeout(() => setMessage(null), 3000)
        return
      }
      await updateApifyTokensByPlatform({
        apify_token_facebook_1: fb1 || '',
        apify_token_facebook_2: apifyTokenFacebook2.trim() || '',
        apify_token_instagram: apifyTokenInstagram.trim() || '',
        apify_token_tiktok: apifyTokenTiktok.trim() || '',
      })
      // Mantener el token "central" del backend = Facebook perfil 1 (fallback)
      await updateApifyToken(fb1)
      setMessage({ type: 'success', text: 'Tokens de Apify guardados correctamente' })
      const [configData, usageData] = await Promise.all([
        getConfig(),
        getApifyUsage().catch(() => null)
      ])
      setConfig(configData)
      setApifyTokenFacebook1(configData.apify_token_facebook_1 || '')
      setApifyTokenFacebook2(configData.apify_token_facebook_2 || '')
      setApifyTokenInstagram(configData.apify_token_instagram || '')
      setApifyTokenTiktok(configData.apify_token_tiktok || '')
      setApifyUsage(usageData)
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      console.error('Error updating tokens:', error)
      setMessage({ type: 'error', text: error?.message || 'Error al guardar los tokens' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleSaveLastDays = async () => {
    try {
      // Al guardar "últimos N días", limpiar las fechas específicas
      await Promise.all([
        updateLastDays(lastDays),
        updateDateFrom(null),
        updateDateTo(null)
      ])
      setMessage({ type: 'success', text: 'Filtro de últimos N días guardado correctamente' })
      // Reload config
      const configData = await getConfig()
      setConfig(configData)
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error updating last days:', error)
      setMessage({ type: 'error', text: 'Error al actualizar filtro' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleSaveDateFrom = async () => {
    try {
      await updateDateFrom(dateFrom || null)
      setMessage({ type: 'success', text: 'Fecha desde actualizada correctamente' })
      // Reload config
      const configData = await getConfig()
      setConfig(configData)
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error updating date from:', error)
      setMessage({ type: 'error', text: 'Error al actualizar fecha desde' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleSaveDateTo = async () => {
    try {
      await updateDateTo(dateTo || null)
      setMessage({ type: 'success', text: 'Fecha hasta actualizada correctamente' })
      // Reload config
      const configData = await getConfig()
      setConfig(configData)
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error updating date to:', error)
      setMessage({ type: 'error', text: 'Error al actualizar fecha hasta' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleSaveLimitPosts = async () => {
    try {
      const value = Math.max(1, Math.min(500, Number(limitPosts)))
      await updateLimitPosts(value)
      setLimitPosts(value)
      setMessage({ type: 'success', text: 'Límite de publicaciones guardado' })
      const configData = await getConfig()
      setConfig(configData)
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error updating limit posts:', error)
      setMessage({ type: 'error', text: 'Error al guardar límite de publicaciones' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleSaveLimitComments = async () => {
    try {
      const value = Math.max(1, Math.min(1000, Number(limitComments)))
      await updateLimitComments(value)
      setLimitComments(value)
      setMessage({ type: 'success', text: 'Límite de comentarios guardado' })
      const configData = await getConfig()
      setConfig(configData)
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error updating limit comments:', error)
      setMessage({ type: 'error', text: 'Error al guardar límite de comentarios' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="h-4 w-24 animate-pulse rounded bg-muted mb-4" />
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra las preferencias del dashboard y la configuración del sistema
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === 'success'
              ? 'bg-success/20 border-success/30 text-success'
              : 'bg-destructive/20 border-destructive/30 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="api">🔑 API & Tokens</TabsTrigger>
          <TabsTrigger value="analysis">🤖 Análisis</TabsTrigger>
          <TabsTrigger value="limits">📊 Límites</TabsTrigger>
          <TabsTrigger value="filters">📅 Filtros</TabsTrigger>
        </TabsList>

        {/* API & Tokens Tab */}
        <TabsContent value="api" className="space-y-6">
          {/* 4 tokens de Apify (sin token central; Facebook perfil 1 es el principal) */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground flex items-center gap-2">
                <Key className="h-5 w-5" />
                Tokens de Apify
              </CardTitle>
              <CardDescription>
                Una API key por tipo de perfil para repartir la cuota. Facebook (perfil 1) es obligatorio; el resto opcionales. En Fuentes puedes asignar a cada perfil qué token usa (columna «API key»): Facebook 1, Facebook 2, Instagram o TikTok. Si no asignas, se usa Auto: el primer perfil Facebook usa token 1, el segundo token 2; Instagram y TikTok usan su token.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="apify-fb1">Token Apify — Facebook (perfil 1) *</Label>
                  <Input
                    id="apify-fb1"
                    type="password"
                    value={apifyTokenFacebook1}
                    onChange={(e) => setApifyTokenFacebook1(e.target.value)}
                    placeholder="Obligatorio"
                    className="bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apify-fb2">Token Apify — Facebook (perfil 2)</Label>
                  <Input
                    id="apify-fb2"
                    type="password"
                    value={apifyTokenFacebook2}
                    onChange={(e) => setApifyTokenFacebook2(e.target.value)}
                    placeholder="Opcional"
                    className="bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apify-ig">Token Apify — Instagram</Label>
                  <Input
                    id="apify-ig"
                    type="password"
                    value={apifyTokenInstagram}
                    onChange={(e) => setApifyTokenInstagram(e.target.value)}
                    placeholder="Opcional"
                    className="bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apify-tt">Token Apify — TikTok</Label>
                  <Input
                    id="apify-tt"
                    type="password"
                    value={apifyTokenTiktok}
                    onChange={(e) => setApifyTokenTiktok(e.target.value)}
                    placeholder="Opcional"
                    className="bg-input"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Obtén tus tokens en{' '}
                <a
                  href="https://console.apify.com/account/integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Apify Console
                </a>
              </p>
              <Button onClick={handleSaveApifyTokens}>Guardar tokens</Button>
            </CardContent>
          </Card>

          {/* Apify Usage Info */}
          {apifyUsage && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium text-card-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Información de Uso de Apify
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Usuario:</span>
                  <span className="text-sm font-medium">{apifyUsage.username || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Plan:</span>
                  <span className="text-sm font-medium">{apifyUsage.plan || 'N/A'}</span>
                </div>
                <div className="pt-2">
                  <a
                    href="https://console.apify.com/account/usage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Ver uso detallado en Apify Console
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actor IDs */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">
                IDs de Actores de Apify
              </CardTitle>
              <CardDescription>
                Configura los IDs de los actores de Apify para cada plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && (
                <>
                  <div className="space-y-2">
                    <Label>Instagram Posts</Label>
                    <Input
                      value={config.actor_instagram_posts || ''}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TikTok Posts</Label>
                    <Input
                      value={config.actor_tiktok_posts || ''}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook Posts</Label>
                    <Input
                      value={config.actor_facebook_posts || ''}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Los IDs de actores se configuran desde el backend. Contacta al administrador para cambiarlos.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Modelo de Análisis de Sentimiento
              </CardTitle>
              <CardDescription>
                Configura el modelo de HuggingFace para análisis de sentimiento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && (
                <div className="space-y-2">
                  <Label>Modelo de HuggingFace</Label>
                  <Input
                    value={config.huggingface_model || ''}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Palabras Clave
              </CardTitle>
              <CardDescription>
                Palabras clave para análisis de sentimiento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && (
                <>
                  <div className="space-y-2">
                    <Label>Palabras Positivas</Label>
                    <Input
                      value={Array.isArray(config.keywords_positive) ? config.keywords_positive.join(', ') : config.keywords_positive || ''}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Palabras Negativas</Label>
                    <Input
                      value={Array.isArray(config.keywords_negative) ? config.keywords_negative.join(', ') : config.keywords_negative || ''}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Limits Tab */}
        <TabsContent value="limits" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">
                Límites por Defecto
              </CardTitle>
              <CardDescription>
                Máximo de publicaciones por perfil y de comentarios por publicación al analizar. Ajusta según tu cuota de Apify.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="limit-posts">Máximo de publicaciones por perfil</Label>
                <div className="flex gap-2">
                  <Input
                    id="limit-posts"
                    type="number"
                    min={1}
                    max={500}
                    value={limitPosts}
                    onChange={(e) => setLimitPosts(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                    className="bg-input max-w-[140px]"
                  />
                  <Button onClick={handleSaveLimitPosts}>Guardar</Button>
                </div>
                <p className="text-xs text-muted-foreground">Entre 1 y 500. Se aplica al analizar cada perfil.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit-comments">Máximo de comentarios por publicación</Label>
                <div className="flex gap-2">
                  <Input
                    id="limit-comments"
                    type="number"
                    min={1}
                    max={1000}
                    value={limitComments}
                    onChange={(e) => setLimitComments(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                    className="bg-input max-w-[140px]"
                  />
                  <Button onClick={handleSaveLimitComments}>Guardar</Button>
                </div>
                <p className="text-xs text-muted-foreground">Entre 1 y 1000. Más comentarios consumen más cuota de Apify.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filters Tab */}
        <TabsContent value="filters" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">
                Filtros de Fecha
              </CardTitle>
              <CardDescription>
                Define desde qué fecha hasta qué fecha se obtienen y analizan las publicaciones al ejecutar el análisis (todas las plataformas).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {config && (
                <>
                  {/* Mode Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Modo de Filtrado</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Elige cómo quieres filtrar las publicaciones
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm ${!useLastDays ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          Fechas Específicas
                        </span>
                        <Switch
                          checked={useLastDays}
                          onCheckedChange={(checked) => {
                            setUseLastDays(checked)
                            // Al cambiar de modo, limpiar el otro
                            if (checked) {
                              setDateFrom('')
                              setDateTo('')
                            } else {
                              setLastDays(0)
                            }
                          }}
                        />
                        <span className={`text-sm ${useLastDays ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          Últimos N Días
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Last N Days Mode */}
                  {useLastDays ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="last-days">Últimos N Días</Label>
                        <Input
                          id="last-days"
                          type="number"
                          min="0"
                          value={lastDays}
                          onChange={(e) => setLastDays(parseInt(e.target.value) || 0)}
                          placeholder="Ej: 7"
                        />
                        <p className="text-xs text-muted-foreground">
                          Analizar contenido de los últimos N días para <strong>TODAS las plataformas</strong> (Facebook, Instagram, TikTok).
                          <br />
                          <strong>0 = sin filtro</strong> (analizar todo el historial disponible)
                        </p>
                      </div>
                      <Button onClick={handleSaveLastDays} className="w-full">
                        Guardar Configuración
                      </Button>
                    </div>
                  ) : (
                    /* Specific Dates Mode */
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="date-from">Fecha Desde</Label>
                        <Input
                          id="date-from"
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Filtrar publicaciones desde esta fecha (dejar vacío = sin límite inferior). Si usas fechas, &quot;Últimos N días&quot; no se aplica.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date-to">Fecha Hasta</Label>
                        <Input
                          id="date-to"
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Filtrar publicaciones hasta esta fecha (dejar vacío = sin límite superior).
                        </p>
                      </div>
                      <Button 
                        onClick={async () => {
                          await handleSaveDateFrom()
                          await handleSaveDateTo()
                        }} 
                        className="w-full"
                      >
                        Guardar Configuración
                      </Button>
                    </div>
                  )}

                  <Separator />

                  {/* Info Box */}
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">ℹ️ Información:</strong>
                      <br />
                      Estos filtros se aplican a <strong>TODAS las plataformas</strong> (Facebook, Instagram, TikTok).
                      Al ejecutar el análisis, solo se obtienen y analizan publicaciones en este rango de fechas.
                      <br />
                      <strong className="text-foreground">Si se acaba la cuota de Apify:</strong> verás un aviso al analizar. Puedes pausar, configurar otro token en <strong>API & Tokens</strong> (arriba), y volver a ejecutar el análisis.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Data Sources Link */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-card-foreground flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Fuentes de Datos
          </CardTitle>
          <CardDescription>
            Administra los enlaces y URLs que se están rastreando para análisis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Link2 className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Agrega, edita y administra los enlaces de redes sociales que quieres rastrear y analizar.
              </p>
            </div>
            <Button asChild>
              <Link href="/sources">
                Administrar Fuentes
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
