/**
 * Spanish translations for the Social Media Analytics Dashboard
 */

export const translations = {
  // Navigation
  nav: {
    overview: 'Resumen',
    sources: 'Fuentes',
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    posts: 'Publicaciones',
    comments: 'Comentarios y Sentimiento',
    reports: 'Reportes',
    settings: 'Configuración'
  },
  
  // Common
  common: {
    loading: 'Cargando...',
    error: 'Error',
    retry: 'Reintentar',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Agregar',
    search: 'Buscar',
    filter: 'Filtro',
    all: 'Todos',
    export: 'Exportar',
    close: 'Cerrar'
  },
  
  // Overview
  overview: {
    title: 'Resumen',
    subtitle: 'Rastrea el rendimiento de tus redes sociales en todas las plataformas',
    performanceByPlatform: 'Rendimiento por Plataforma',
    interactionsOverTime: 'Interacciones a lo Largo del Tiempo',
    topDaysByReach: 'Mejores Días por Alcance',
    topPerformingPosts: 'Publicaciones con Mejor Rendimiento'
  },
  
  // KPIs
  kpi: {
    totalReach: 'Alcance Total',
    impressions: 'Impresiones',
    interactions: 'Interacciones',
    likes: 'Me Gusta',
    comments: 'Comentarios',
    shares: 'Compartidos',
    engagementRate: 'Tasa de Participación'
  },
  
  // Tooltips
  tooltips: {
    reach: 'Alcance estimado: Número aproximado de personas únicas que vieron tu contenido. Se calcula como: Interacciones × 2.5',
    impressions: 'Impresiones estimadas: Número aproximado de veces que se mostró tu contenido. Se calcula como: Alcance × 1.2',
    engagementRate: 'Tasa de participación: Porcentaje de personas que interactuaron con tu contenido respecto al alcance. Se calcula como: (Interacciones / Alcance) × 100',
    interactions: 'Interacciones totales: Suma de todas las acciones (me gusta, comentarios, compartidos) en tus publicaciones',
    likes: 'Me gusta: Número real de me gusta recibidos en tus publicaciones',
    comments: 'Comentarios: Número real de comentarios recibidos en tus publicaciones',
    shares: 'Compartidos: Número real de veces que se compartió tu contenido'
  },
  
  // Posts
  posts: {
    title: 'Publicaciones',
    subtitle: 'Ver y analizar todas tus publicaciones en todas las plataformas',
    searchPlaceholder: 'Buscar publicaciones...',
    allPosts: 'Todas las Publicaciones',
    noPosts: 'No se encontraron publicaciones',
    noPostsDescription: 'Las publicaciones aparecerán aquí una vez que se publiquen.'
  },
  
  // Comments
  comments: {
    title: 'Comentarios y Sentimiento',
    subtitle: 'Analiza el sentimiento de los comentarios y rastrea el feedback de la audiencia',
    totalComments: 'Total de Comentarios',
    positive: 'Positivo',
    neutral: 'Neutral',
    negative: 'Negativo',
    sentimentDistribution: 'Distribución de Sentimiento',
    frequentTopics: 'Temas Frecuentes',
    keywords: 'Palabras Clave'
  },
  
  // Sources
  sources: {
    title: 'Fuentes',
    subtitle: 'Administra los enlaces y URLs que serán analizados por el sistema',
    addLink: 'Agregar Enlace',
    registeredLinks: 'Enlaces Registrados',
    noLinks: 'No se encontraron enlaces',
    addFirstLink: 'Agrega tu primer enlace'
  },
  
  // Settings
  settings: {
    title: 'Configuración',
    subtitle: 'Administra las preferencias del dashboard y la configuración de notificaciones',
    apiTokens: 'Tokens de API',
    analysis: 'Análisis',
    limits: 'Límites',
    filters: 'Filtros'
  }
}
