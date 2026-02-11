/**
 * Adapters to transform API data to frontend format
 * Maintains the existing frontend design and component structure
 */

import type { Post, Comment, Source, PlatformMetrics, KPIData, MetricPoint } from '@/types'
import type { Post as ApiPost, Comment as ApiComment, Profile, OverviewStats, SentimentStats } from './api'

// ==================== PROFILE TO SOURCE ADAPTER ====================

export function profileToSource(profile: Profile): Source {
  // Map profile status based on last_analyzed
  let status: Source['status'] = 'pending'
  if (profile.last_analyzed) {
    status = 'completed'
  }

  // Extract link type from URL or default to profile
  let linkType: Source['linkType'] = 'profile'
  const url = profile.username_or_url
  if (url.includes('/p/') || url.includes('/post/') || url.includes('/video/')) {
    linkType = 'post'
  } else if (url.includes('/hashtag/') || url.includes('/tag/') || url.includes('#')) {
    linkType = 'hashtag'
  }

  return {
    id: profile.id.toString(),
    platform: profile.platform as Source['platform'],
    linkType,
    url: url.startsWith('http') ? url : `https://${profile.platform}.com/${url}`,
    label: profile.display_name || profile.username_or_url,
    status,
    createdAt: profile.created_at || new Date().toISOString(),
    updatedAt: profile.last_analyzed || undefined,
    apify_token_key: profile.apify_token_key ?? undefined,
    metrics: undefined, // Will be calculated from posts if needed
    history: profile.last_analyzed ? [
      {
        date: profile.last_analyzed,
        status: 'completed',
        message: 'Analysis completed'
      }
    ] : [
      {
        date: profile.created_at || new Date().toISOString(),
        status: 'pending',
        message: 'Profile added'
      }
    ]
  }
}

// ==================== API POST TO FRONTEND POST ADAPTER ====================

export function apiPostToPost(apiPost: ApiPost): Post {
  // Calculate reach (approximation: interactions * 2.5, or use views if available)
  const reach = apiPost.views > 0 ? apiPost.views : Math.floor(apiPost.interactions_total * 2.5)
  
  // Calculate impressions (reach * 1.2)
  const impressions = Math.floor(reach * 1.2)
  
  // Calculate engagement rate (interactions / reach * 100)
  const engagementRate = reach > 0 ? parseFloat(((apiPost.interactions_total / reach) * 100).toFixed(2)) : 0
  
  // Calculate sentiment score from comments (default to 0.5 if no sentiment data)
  // This would ideally come from analyzing the post's comments
  const sentimentScore = 0.5 // Default neutral, should be calculated from comments

  return {
    id: apiPost.id.toString(),
    platform: apiPost.platform as Post['platform'],
    date: apiPost.posted_at || new Date().toISOString().split('T')[0],
    caption: apiPost.text || '',
    reach,
    impressions,
    interactions: apiPost.interactions_total,
    likes: apiPost.likes,
    comments: apiPost.comments_count,
    shares: apiPost.shares,
    saves: undefined, // Not available in API
    sentimentScore,
    engagementRate,
    thumbnail: undefined // Not available in API
  }
}

// ==================== API COMMENT TO FRONTEND COMMENT ADAPTER ====================

export function apiCommentToComment(apiComment: ApiComment, platform?: Comment['platform']): Comment {
  // Get platform from comment if available, otherwise use provided platform
  const commentPlatform = (apiComment as any).platform || platform || 'facebook'
  
  // Map sentiment label - handle both 'sentiment_label' and typo 'sentiment_labbel'
  const sentimentMap: Record<string, Comment['sentiment']> = {
    'POSITIVE': 'positive',
    'NEGATIVE': 'negative',
    'NEUTRAL': 'neutral'
  }
  
  // Handle both correct and typo field names
  const sentimentLabel = (apiComment as any).sentiment_label || (apiComment as any).sentiment_labbel
  const sentiment = sentimentLabel 
    ? (sentimentMap[sentimentLabel.toUpperCase()] || 'neutral')
    : 'neutral'

  // Determine tag based on sentiment and text
  let tag: Comment['tag'] = 'praise'
  if (sentiment === 'negative') {
    tag = 'complaint'
  } else if (sentiment === 'neutral') {
    // Simple heuristic: if contains question mark, it's a question
    tag = apiComment.text?.includes('?') ? 'question' : 'praise'
  }

  return {
    id: apiComment.id.toString(),
    platform: commentPlatform as Comment['platform'],
    postId: apiComment.post_id.toString(),
    date: apiComment.posted_at || new Date().toISOString(),
    text: apiComment.text || '',
    author: apiComment.author || 'Unknown',
    sentiment,
    tag
  }
}

// ==================== OVERVIEW STATS TO KPIS ADAPTER ====================

export function overviewStatsToKPIs(
  stats: OverviewStats,
  previousStats?: OverviewStats
): KPIData[] {
  const calculateChange = (current: number, previous: number): { change: number; changeType: KPIData['changeType'] } => {
    if (previous === 0) {
      return { change: current > 0 ? 100 : 0, changeType: current > 0 ? 'positive' : 'neutral' }
    }
    const change = ((current - previous) / previous) * 100
    return {
      change: parseFloat(Math.abs(change).toFixed(1)),
      changeType: change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
    }
  }

  const prev = previousStats || {
    total_posts: 0,
    total_interactions: 0,
    total_comments: 0,
    avg_interactions: 0,
    platforms: []
  }

  // Calculate total reach (approximation: interactions * 2.5)
  const totalReach = Math.floor(stats.total_interactions * 2.5)
  const prevReach = Math.floor(prev.total_interactions * 2.5)
  const reachChange = calculateChange(totalReach, prevReach)

  // Calculate total impressions (reach * 1.2)
  const totalImpressions = Math.floor(totalReach * 1.2)
  const prevImpressions = Math.floor(prevReach * 1.2)
  const impressionsChange = calculateChange(totalImpressions, prevImpressions)

  // Interactions change
  const interactionsChange = calculateChange(stats.total_interactions, prev.total_interactions)

  // Calculate total likes (approximation: interactions * 0.7)
  const totalLikes = Math.floor(stats.total_interactions * 0.7)
  const prevLikes = Math.floor(prev.total_interactions * 0.7)
  const likesChange = calculateChange(totalLikes, prevLikes)

  // Comments change
  const commentsChange = calculateChange(stats.total_comments, prev.total_comments)

  // Calculate shares (approximation: interactions * 0.1)
  const totalShares = Math.floor(stats.total_interactions * 0.1)
  const prevShares = Math.floor(prev.total_interactions * 0.1)
  const sharesChange = calculateChange(totalShares, prevShares)

  // Engagement rate (interactions / reach * 100)
  const engagementRate = totalReach > 0 ? parseFloat(((stats.total_interactions / totalReach) * 100).toFixed(2)) : 0
  const prevEngagementRate = prevReach > 0 ? parseFloat(((prev.total_interactions / prevReach) * 100).toFixed(2)) : 0
  const engagementChange = calculateChange(engagementRate, prevEngagementRate)

  return [
    {
      label: 'Alcance Total',
      value: totalReach,
      previousValue: prevReach,
      change: reachChange.change,
      changeType: reachChange.changeType,
      format: 'number'
    },
    {
      label: 'Impresiones',
      value: totalImpressions,
      previousValue: prevImpressions,
      change: impressionsChange.change,
      changeType: impressionsChange.changeType,
      format: 'number'
    },
    {
      label: 'Interacciones',
      value: stats.total_interactions,
      previousValue: prev.total_interactions,
      change: interactionsChange.change,
      changeType: interactionsChange.changeType,
      format: 'number'
    },
    {
      label: 'Me Gusta',
      value: totalLikes,
      previousValue: prevLikes,
      change: likesChange.change,
      changeType: likesChange.changeType,
      format: 'number'
    },
    {
      label: 'Comentarios',
      value: stats.total_comments,
      previousValue: prev.total_comments,
      change: commentsChange.change,
      changeType: commentsChange.changeType,
      format: 'number'
    },
    {
      label: 'Compartidos',
      value: totalShares,
      previousValue: prevShares,
      change: sharesChange.change,
      changeType: sharesChange.changeType,
      format: 'number'
    },
    {
      label: 'Tasa de Participación',
      value: engagementRate,
      previousValue: prevEngagementRate,
      change: engagementChange.change,
      changeType: engagementChange.changeType,
      format: 'percentage'
    }
  ]
}

// ==================== OVERVIEW STATS TO PLATFORM METRICS ADAPTER ====================

export function overviewStatsToPlatformMetrics(
  stats: OverviewStats,
  posts: ApiPost[] | undefined
): PlatformMetrics[] {
  // Ensure posts is always an array
  const postsArray = posts || []
  
  const platformData: Record<string, {
    posts: ApiPost[]
    interactions: number
    likes: number
    comments: number
    shares: number
  }> = {}

  // Group posts by platform
  postsArray.forEach(post => {
    const platform = post.platform
    if (!platformData[platform]) {
      platformData[platform] = {
        posts: [],
        interactions: 0,
        likes: 0,
        comments: 0,
        shares: 0
      }
    }
    platformData[platform].posts.push(post)
    platformData[platform].interactions += post.interactions_total
    platformData[platform].likes += post.likes
    platformData[platform].comments += post.comments_count
    platformData[platform].shares += post.shares
  })

  // Convert to PlatformMetrics format
  // If no platforms in stats, create from posts data
  const platformsToProcess = stats.platforms.length > 0 
    ? stats.platforms 
    : Object.keys(platformData).map(p => ({ platform: p, posts: 0, interactions: 0, comments: 0 }))
  
  return platformsToProcess.map(platformStat => {
    const platform = platformStat.platform as PlatformMetrics['platform']
    const data = platformData[platform] || { posts: [], interactions: 0, likes: 0, comments: 0, shares: 0 }
    
    // Use stats data if available, otherwise calculate from posts
    const interactions = platformStat.interactions || data.interactions
    const comments = platformStat.comments || data.comments
    
    // Calculate reach and impressions
    const reach = Math.floor(interactions * 2.5)
    const impressions = Math.floor(reach * 1.2)
    const engagementRate = reach > 0 ? parseFloat(((interactions / reach) * 100).toFixed(2)) : 0

    // Generate trend data (last 7 days) from actual posts
    const trend: MetricPoint[] = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Filter posts for this date
      const dayPosts = data.posts.filter(p => {
        if (!p.posted_at) return false
        try {
          const postDate = new Date(p.posted_at).toISOString().split('T')[0]
          return postDate === dateStr
        } catch {
          return false
        }
      })

      const dayInteractions = dayPosts.reduce((sum, p) => sum + (p.interactions_total || 0), 0)
      const dayLikes = dayPosts.reduce((sum, p) => sum + (p.likes || 0), 0)
      const dayComments = dayPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0)
      const dayShares = dayPosts.reduce((sum, p) => sum + (p.shares || 0), 0)
      const dayReach = Math.floor(dayInteractions * 2.5)

      trend.push({
        date: dateStr,
        reach: dayReach,
        impressions: Math.floor(dayReach * 1.2),
        interactions: dayInteractions,
        likes: dayLikes,
        comments: dayComments,
        shares: dayShares
      })
    }

    return {
      platform,
      reach,
      impressions,
      interactions,
      likes: data.likes || Math.floor(interactions * 0.7),
      comments,
      shares: data.shares || Math.floor(interactions * 0.1),
      engagementRate,
      trend
    }
  })
}

// ==================== POSTS TO METRIC POINTS ADAPTER ====================

export function postsToMetricPoints(posts: ApiPost[] | undefined): MetricPoint[] {
  // Ensure posts is always an array
  const postsArray = posts || []
  
  // Group posts by date
  const dateMap: Record<string, {
    interactions: number
    likes: number
    comments: number
    shares: number
  }> = {}

  postsArray.forEach(post => {
    if (!post.posted_at) return
    const date = new Date(post.posted_at).toISOString().split('T')[0]
    if (!dateMap[date]) {
      dateMap[date] = { interactions: 0, likes: 0, comments: 0, shares: 0 }
    }
    dateMap[date].interactions += post.interactions_total
    dateMap[date].likes += post.likes
    dateMap[date].comments += post.comments_count
    dateMap[date].shares += post.shares
  })

  // Convert to MetricPoint array
  return Object.entries(dateMap)
    .map(([date, data]) => {
      const reach = Math.floor(data.interactions * 2.5)
      return {
        date,
        reach,
        impressions: Math.floor(reach * 1.2),
        interactions: data.interactions,
        likes: data.likes,
        comments: data.comments,
        shares: data.shares
      }
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// ==================== SENTIMENT STATS ADAPTER ====================

export function sentimentStatsToDistribution(stats: SentimentStats) {
  return {
    positive: stats.percentages.POSITIVE || 0,
    neutral: stats.percentages.NEUTRAL || 0,
    negative: stats.percentages.NEGATIVE || 0
  }
}
