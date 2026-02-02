export type Platform = 'facebook' | 'instagram' | 'tiktok'

export type LinkType = 'profile' | 'post' | 'hashtag'
export type SourceStatus = 'pending' | 'processing' | 'completed' | 'error'

export interface Source {
  id: string
  platform: Platform
  linkType: LinkType
  url: string
  label?: string
  status: SourceStatus
  createdAt: string
  updatedAt?: string
  metrics?: {
    reach: number
    interactions: number
    comments: number
  }
  history?: {
    date: string
    status: SourceStatus
    message?: string
  }[]
}

export interface MetricPoint {
  date: string
  reach: number
  impressions: number
  interactions: number
  likes: number
  comments: number
  shares?: number
}

export interface Post {
  id: string
  platform: Platform
  date: string
  caption: string
  reach: number
  impressions: number
  interactions: number
  likes: number
  comments: number
  shares?: number
  saves?: number
  sentimentScore: number
  engagementRate: number
  thumbnail?: string
}

export interface Comment {
  id: string
  platform: Platform
  postId: string
  date: string
  text: string
  author: string
  sentiment: 'positive' | 'neutral' | 'negative'
  tag: 'praise' | 'complaint' | 'question' | 'spam'
}



export interface KPIData {
  label: string
  value: number
  previousValue: number
  change: number
  changeType: 'positive' | 'negative' | 'neutral'
  format: 'number' | 'percentage' | 'currency'
}

export interface PlatformMetrics {
  platform: Platform
  reach: number
  impressions: number
  interactions: number
  likes: number
  comments: number
  shares: number
  engagementRate: number
  trend: MetricPoint[]
}

export interface DateRange {
  label: string
  value: string
  from: Date
  to: Date
}

export type ViewState = 'loading' | 'empty' | 'error' | 'success'
