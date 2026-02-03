/**
 * API client for Social Media Analytics Dashboard
 * Replaces mock data with real API calls
 */

// Get base URL - use ngrok URL for testing (even in localhost)
const getBaseUrl = (): string => {
  // ngrok URL (backend local con ngrok)
  const NGROK_URL = 'https://www.backsocual.ngrok.app/api'
  
  // Production backend URL (Render)
  const PRODUCTION_URL = 'https://backsocial-83zt.onrender.com/api'
  
  // Local development URL
  const LOCAL_URL = 'http://localhost:8000/api'
  
  // Usar ngrok siempre que esté configurado (incluso en localhost para probar)
  if (NGROK_URL) {
    return NGROK_URL
  }
  
  // Si no hay ngrok, usar localhost en desarrollo
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname === '0.0.0.0'
    return isLocalhost ? LOCAL_URL : PRODUCTION_URL
  }
  
  // Server-side: use production by default
  return PRODUCTION_URL
}

const API_BASE_URL = getBaseUrl()

interface ApiResponse<T> {
  data?: T
  total?: number
  limit?: number
  offset?: number
  success?: boolean
  message?: string
  results?: T
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${API_BASE_URL}${normalizedEndpoint}`
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const error = await response.json()
        // Manejar diferentes formatos de error del backend
        if (error.detail) {
          // FastAPI devuelve errores de validación en error.detail
          if (Array.isArray(error.detail)) {
            // Si es un array, extraer los mensajes de validación
            errorMessage = error.detail.map((e: any) => 
              `${e.loc?.join('.') || ''}: ${e.msg || e.message || JSON.stringify(e)}`
            ).join(', ')
          } else if (typeof error.detail === 'string') {
            errorMessage = error.detail
          } else {
            errorMessage = JSON.stringify(error.detail)
          }
        } else if (error.message) {
          errorMessage = error.message
        } else if (error.error) {
          errorMessage = error.error
        }
        // Prevent recursion by limiting error message length
        if (typeof errorMessage === 'string' && errorMessage.length > 500) {
          errorMessage = errorMessage.substring(0, 500) + '...'
        }
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    const data: ApiResponse<T> | T = await response.json()
    
    // Handle different response formats
    if (typeof data === 'object' && data !== null) {
      if ('data' in data) {
        const responseData = (data as ApiResponse<T>).data
        // Ensure data is always an array for array responses
        if (Array.isArray(responseData)) {
          return responseData as T
        }
        return responseData as T
      }
      if ('results' in data) {
        return (data as ApiResponse<T>).results as T
      }
    }
    
    return data as T
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    throw error
  }
}

// ==================== PROFILES ====================

export interface Profile {
  id: number
  platform: 'facebook' | 'instagram' | 'tiktok'
  username_or_url: string
  display_name?: string
  last_analyzed?: string
  created_at?: string
}

export async function getProfiles(): Promise<Profile[]> {
  return apiCall<Profile[]>('/profiles')
}

export async function createProfile(platform: string, usernameOrUrl: string): Promise<Profile> {
  return apiCall<Profile>('/profiles', {
    method: 'POST',
    body: JSON.stringify({ platform, username_or_url: usernameOrUrl }),
  })
}

export async function deleteProfile(profileId: number): Promise<void> {
  await apiCall(`/profiles/${profileId}`, {
    method: 'DELETE',
  })
}

// ==================== POSTS ====================

export interface Post {
  id: number
  platform: 'facebook' | 'instagram' | 'tiktok'
  post_id: string
  url?: string
  text?: string
  likes: number
  comments_count: number
  shares: number
  views: number
  interactions_total: number
  posted_at?: string
  username_or_url?: string
  display_name?: string
}

export interface PostsResponse {
  data: Post[]
  total: number
  limit: number
  offset: number
}

export interface PostsFilters {
  platform?: string
  profile_id?: number
  min_interactions?: number
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export async function getPosts(filters: PostsFilters = {}): Promise<PostsResponse> {
  const params = new URLSearchParams()
  
  if (filters.platform) params.append('platform', filters.platform)
  if (filters.profile_id) params.append('profile_id', filters.profile_id.toString())
  if (filters.min_interactions) params.append('min_interactions', filters.min_interactions.toString())
  if (filters.date_from) params.append('date_from', filters.date_from)
  if (filters.date_to) params.append('date_to', filters.date_to)
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.offset) params.append('offset', filters.offset.toString())
  
  const queryString = params.toString()
  
  try {
    const response = await apiCall<PostsResponse>(`/posts${queryString ? `?${queryString}` : ''}`)
    
    // Ensure response always has data as array
    if (!response || typeof response !== 'object') {
      return {
        data: [],
        total: 0,
        limit: filters.limit || 100,
        offset: filters.offset || 0
      }
    }
    
    // If response is already PostsResponse, return it
    if ('data' in response && 'total' in response) {
      const postsResponse = response as PostsResponse
      return {
        ...postsResponse,
        data: Array.isArray(postsResponse.data) ? postsResponse.data : []
      }
    }
    
    // Fallback: wrap in PostsResponse format
    const responseArray = Array.isArray(response) ? response : []
    return {
      data: responseArray,
      total: responseArray.length,
      limit: filters.limit || 100,
      offset: filters.offset || 0
    }
  } catch (error) {
    console.error('Error fetching posts:', error)
    // Return empty response on error
    return {
      data: [],
      total: 0,
      limit: filters.limit || 100,
      offset: filters.offset || 0
    }
  }
}

// ==================== COMMENTS ====================

export interface Comment {
  id: number
  post_id: number
  comment_id: string
  text?: string
  author?: string
  likes: number
  sentiment_label?: 'positive' | 'negative' | 'neutral'
  sentiment_score?: number
  sentiment_method?: string
  posted_at?: string
}

export interface CommentsResponse {
  data: Comment[]
  total: number
  limit: number
  offset: number
}

export interface CommentsFilters {
  platform?: string
  profile_id?: number
  post_id?: number
  sentiment?: string
  limit?: number
  offset?: number
}

export async function getComments(filters: CommentsFilters = {}): Promise<CommentsResponse> {
  const params = new URLSearchParams()
  
  if (filters.platform) params.append('platform', filters.platform)
  if (filters.profile_id) params.append('profile_id', filters.profile_id.toString())
  if (filters.post_id) params.append('post_id', filters.post_id.toString())
  if (filters.sentiment) params.append('sentiment', filters.sentiment)
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.offset) params.append('offset', filters.offset.toString())
  
  const queryString = params.toString()
  
  try {
    const response = await apiCall<CommentsResponse>(`/comments${queryString ? `?${queryString}` : ''}`)
    
    // Ensure response always has data as array
    if (!response || typeof response !== 'object') {
      return {
        data: [],
        total: 0,
        limit: filters.limit || 100,
        offset: filters.offset || 0
      }
    }
    
    // If response is already CommentsResponse, return it
    if ('data' in response && 'total' in response) {
      const commentsResponse = response as CommentsResponse
      return {
        ...commentsResponse,
        data: Array.isArray(commentsResponse.data) ? commentsResponse.data : []
      }
    }
    
    // Fallback: wrap in CommentsResponse format
    const responseArray = Array.isArray(response) ? response : []
    return {
      data: responseArray,
      total: responseArray.length,
      limit: filters.limit || 100,
      offset: filters.offset || 0
    }
  } catch (error) {
    console.error('Error fetching comments:', error)
    // Return empty response on error
    return {
      data: [],
      total: 0,
      limit: filters.limit || 100,
      offset: filters.offset || 0
    }
  }
}

// ==================== ANALYSIS ====================

export interface AnalysisRequest {
  profile_ids?: number[]
  force?: boolean
}

export interface AnalysisResult {
  [profileId: number]: {
    posts_scraped?: number
    comments_scraped?: number
    errors?: string[]
    skipped?: boolean
    reason?: string
  }
}

export async function runAnalysis(request: AnalysisRequest): Promise<AnalysisResult> {
  const response = await apiCall<{ success: boolean; results: AnalysisResult }>('/analysis/run', {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return (response as any).results || response
}

// ==================== STATS ====================

export interface SentimentStats {
  total: number
  positive: number
  negative: number
  neutral: number
  percentages: {
    POSITIVE: number
    NEGATIVE: number
    NEUTRAL: number
  }
}

export async function getSentimentStats(platform?: string, profileId?: number): Promise<SentimentStats> {
  const params = new URLSearchParams()
  if (platform) params.append('platform', platform)
  if (profileId) params.append('profile_id', profileId.toString())
  
  const queryString = params.toString()
  return apiCall<SentimentStats>(`/stats/sentiment${queryString ? `?${queryString}` : ''}`)
}

export interface OverviewStats {
  total_posts: number
  total_interactions: number
  total_comments: number
  avg_interactions: number
  platforms: Array<{
    platform: string
    posts: number
    interactions: number
    comments: number
  }>
}

export async function getOverviewStats(
  platform?: string,
  profileId?: number,
  dateFrom?: string,
  dateTo?: string
): Promise<OverviewStats> {
  const params = new URLSearchParams()
  if (platform) params.append('platform', platform)
  if (profileId) params.append('profile_id', profileId.toString())
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)
  
  const queryString = params.toString()
  return apiCall<OverviewStats>(`/stats/overview${queryString ? `?${queryString}` : ''}`)
}

// ==================== CONFIG ====================

export interface Config {
  apify_token: string
  huggingface_model: string
  keywords_positive: string[]
  keywords_negative: string[]
  actor_instagram_posts: string
  actor_instagram_comments: string
  actor_tiktok_posts: string
  actor_tiktok_comments: string
  actor_facebook_posts: string
  actor_facebook_comments: string
  default_limit_posts: number
  default_limit_comments: number
  auto_skip_recent: boolean
  // New global date filters (for all platforms)
  date_from?: string
  date_to?: string
  last_days: number
  // Legacy TikTok-specific filters (for backward compatibility)
  tiktok_date_from?: string
  tiktok_date_to?: string
  tiktok_last_days?: number
}

export async function getConfig(): Promise<Config> {
  return apiCall<Config>('/config')
}

export async function updateApifyToken(token: string): Promise<void> {
  // El backend espera el token en el body con el formato { apify_token: token }
  await apiCall('/config/apify-token', {
    method: 'POST',
    body: JSON.stringify({ apify_token: token }),
  })
}

export async function updateDateFrom(dateFrom: string | null): Promise<void> {
  await apiCall('/config/date-from', {
    method: 'POST',
    body: JSON.stringify({ date_from: dateFrom }),
  })
}

export async function updateDateTo(dateTo: string | null): Promise<void> {
  await apiCall('/config/date-to', {
    method: 'POST',
    body: JSON.stringify({ date_to: dateTo }),
  })
}

export async function updateLastDays(lastDays: number): Promise<void> {
  await apiCall('/config/last-days', {
    method: 'POST',
    body: JSON.stringify({ last_days: lastDays }),
  })
}

// ==================== APIFY USAGE ====================

export interface ApifyUsage {
  username: string
  plan: string
  usage_url: string
}

export async function getApifyUsage(): Promise<ApifyUsage> {
  return apiCall<ApifyUsage>('/apify/usage')
}

// ==================== HEALTH CHECK ====================

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return apiCall('/health')
}
