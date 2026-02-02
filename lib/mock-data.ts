import type { Platform, Post, Comment, MetricPoint, PlatformMetrics, KPIData, Source, LinkType, SourceStatus } from '@/types'

// Helper to generate dates
const getDateRange = (days: number): string[] => {
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])
  }
  return dates
}

// Generate metric points for charts
export const generateMetricPoints = (days: number = 30): MetricPoint[] => {
  const dates = getDateRange(days)
  return dates.map((date) => ({
    date,
    reach: Math.floor(Math.random() * 50000) + 10000,
    impressions: Math.floor(Math.random() * 80000) + 20000,
    interactions: Math.floor(Math.random() * 5000) + 1000,
    likes: Math.floor(Math.random() * 3000) + 500,
    comments: Math.floor(Math.random() * 500) + 50,
    shares: Math.floor(Math.random() * 300) + 30,
  }))
}

// Mock sources (links for scraping)
const linkTypes: LinkType[] = ['profile', 'post', 'hashtag']
const statuses: SourceStatus[] = ['pending', 'processing', 'completed', 'error']

export const mockSources: Source[] = [
  {
    id: 'src-1',
    platform: 'facebook',
    linkType: 'profile',
    url: 'https://facebook.com/brandofficial',
    label: 'Brand Official Page',
    status: 'completed',
    createdAt: '2026-01-15T10:30:00Z',
    updatedAt: '2026-01-28T08:00:00Z',
    metrics: { reach: 523400, interactions: 45230, comments: 8920 },
    history: [
      { date: '2026-01-15T10:30:00Z', status: 'pending', message: 'Link added' },
      { date: '2026-01-15T10:35:00Z', status: 'processing', message: 'Scraping started' },
      { date: '2026-01-15T11:00:00Z', status: 'completed', message: 'Data collected successfully' },
    ],
  },
  {
    id: 'src-2',
    platform: 'instagram',
    linkType: 'profile',
    url: 'https://instagram.com/brand_ig',
    label: 'Brand Instagram',
    status: 'completed',
    createdAt: '2026-01-16T14:20:00Z',
    updatedAt: '2026-01-28T08:00:00Z',
    metrics: { reach: 892100, interactions: 67890, comments: 12340 },
    history: [
      { date: '2026-01-16T14:20:00Z', status: 'pending', message: 'Link added' },
      { date: '2026-01-16T14:25:00Z', status: 'processing', message: 'Scraping started' },
      { date: '2026-01-16T15:00:00Z', status: 'completed', message: 'Data collected successfully' },
    ],
  },
  {
    id: 'src-3',
    platform: 'tiktok',
    linkType: 'profile',
    url: 'https://tiktok.com/@brandtiktok',
    label: 'Brand TikTok',
    status: 'completed',
    createdAt: '2026-01-17T09:15:00Z',
    updatedAt: '2026-01-28T08:00:00Z',
    metrics: { reach: 1234500, interactions: 98760, comments: 23450 },
    history: [
      { date: '2026-01-17T09:15:00Z', status: 'pending', message: 'Link added' },
      { date: '2026-01-17T09:20:00Z', status: 'processing', message: 'Scraping started' },
      { date: '2026-01-17T10:00:00Z', status: 'completed', message: 'Data collected successfully' },
    ],
  },
  {
    id: 'src-4',
    platform: 'instagram',
    linkType: 'hashtag',
    url: 'https://instagram.com/explore/tags/brandname',
    label: '#brandname',
    status: 'completed',
    createdAt: '2026-01-18T11:00:00Z',
    updatedAt: '2026-01-27T16:00:00Z',
    metrics: { reach: 456780, interactions: 34560, comments: 5670 },
    history: [
      { date: '2026-01-18T11:00:00Z', status: 'pending', message: 'Link added' },
      { date: '2026-01-18T11:10:00Z', status: 'processing', message: 'Scraping started' },
      { date: '2026-01-18T12:30:00Z', status: 'completed', message: 'Data collected successfully' },
    ],
  },
  {
    id: 'src-5',
    platform: 'tiktok',
    linkType: 'hashtag',
    url: 'https://tiktok.com/tag/brandchallenge',
    label: '#brandchallenge',
    status: 'processing',
    createdAt: '2026-01-27T08:00:00Z',
    history: [
      { date: '2026-01-27T08:00:00Z', status: 'pending', message: 'Link added' },
      { date: '2026-01-27T08:05:00Z', status: 'processing', message: 'Scraping in progress...' },
    ],
  },
  {
    id: 'src-6',
    platform: 'facebook',
    linkType: 'post',
    url: 'https://facebook.com/brandofficial/posts/123456789',
    label: 'Product Launch Post',
    status: 'completed',
    createdAt: '2026-01-20T15:30:00Z',
    updatedAt: '2026-01-20T16:00:00Z',
    metrics: { reach: 89230, interactions: 7650, comments: 1234 },
    history: [
      { date: '2026-01-20T15:30:00Z', status: 'pending', message: 'Link added' },
      { date: '2026-01-20T15:35:00Z', status: 'processing', message: 'Scraping started' },
      { date: '2026-01-20T16:00:00Z', status: 'completed', message: 'Data collected successfully' },
    ],
  },
  {
    id: 'src-7',
    platform: 'instagram',
    linkType: 'post',
    url: 'https://instagram.com/p/ABC123xyz',
    label: 'Viral Reel',
    status: 'error',
    createdAt: '2026-01-25T10:00:00Z',
    updatedAt: '2026-01-25T10:30:00Z',
    history: [
      { date: '2026-01-25T10:00:00Z', status: 'pending', message: 'Link added' },
      { date: '2026-01-25T10:05:00Z', status: 'processing', message: 'Scraping started' },
      { date: '2026-01-25T10:30:00Z', status: 'error', message: 'Failed to access content. Post may be private or deleted.' },
    ],
  },
  {
    id: 'src-8',
    platform: 'tiktok',
    linkType: 'post',
    url: 'https://tiktok.com/@brandtiktok/video/987654321',
    label: 'Behind the Scenes',
    status: 'pending',
    createdAt: '2026-01-28T09:00:00Z',
    history: [
      { date: '2026-01-28T09:00:00Z', status: 'pending', message: 'Link added, waiting to process' },
    ],
  },
]

// Global KPIs
export const mockGlobalKPIs: KPIData[] = [
  { label: 'Total Reach', value: 2847392, previousValue: 2543210, change: 11.9, changeType: 'positive', format: 'number' },
  { label: 'Impressions', value: 4523891, previousValue: 4102334, change: 10.3, changeType: 'positive', format: 'number' },
  { label: 'Interactions', value: 342891, previousValue: 312450, change: 9.7, changeType: 'positive', format: 'number' },
  { label: 'Likes', value: 289432, previousValue: 265210, change: 9.1, changeType: 'positive', format: 'number' },
  { label: 'Comments', value: 34521, previousValue: 38102, change: -9.4, changeType: 'negative', format: 'number' },
  { label: 'Shares', value: 18938, previousValue: 17234, change: 9.9, changeType: 'positive', format: 'number' },
  { label: 'Engagement Rate', value: 4.8, previousValue: 4.2, change: 14.3, changeType: 'positive', format: 'percentage' },
]

// Platform-specific metrics
export const mockPlatformMetrics: PlatformMetrics[] = [
  {
    platform: 'facebook',
    reach: 1023450,
    impressions: 1834521,
    interactions: 123450,
    likes: 98234,
    comments: 15234,
    shares: 9982,
    engagementRate: 3.8,
    trend: generateMetricPoints(7),
  },
  {
    platform: 'instagram',
    reach: 987234,
    impressions: 1523890,
    interactions: 134521,
    likes: 112345,
    comments: 12456,
    shares: 5720,
    engagementRate: 5.2,
    trend: generateMetricPoints(7),
  },
  {
    platform: 'tiktok',
    reach: 836708,
    impressions: 1165480,
    interactions: 84920,
    likes: 78853,
    comments: 6831,
    shares: 3236,
    engagementRate: 5.9,
    trend: generateMetricPoints(7),
  },
]

// Mock posts
const platforms: Platform[] = ['facebook', 'instagram', 'tiktok']
const captions = [
  'Check out our latest product launch! 🚀',
  'Behind the scenes of our team meeting',
  'Customer spotlight: See how they use our product',
  'Tips and tricks for getting started',
  'Celebrating 10K followers! Thank you all',
  'New feature announcement coming soon...',
  'Weekend vibes with the team',
  'Q&A session - Ask us anything!',
  'Product update: What\'s new this month',
  'Community feedback - We heard you!',
]

export const mockPosts: Post[] = Array.from({ length: 50 }, (_, i) => {
  const platform = platforms[i % 3]
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * 30))
  
  const reach = Math.floor(Math.random() * 100000) + 5000
  const interactions = Math.floor(reach * (Math.random() * 0.1 + 0.02))
  
  return {
    id: `post-${i + 1}`,
    platform,
    date: date.toISOString().split('T')[0],
    caption: captions[i % captions.length],
    reach,
    impressions: Math.floor(reach * 1.5),
    interactions,
    likes: Math.floor(interactions * 0.7),
    comments: Math.floor(interactions * 0.2),
    shares: Math.floor(interactions * 0.1),
    saves: platform === 'instagram' ? Math.floor(interactions * 0.05) : undefined,
    sentimentScore: Math.random() * 0.6 + 0.4, // 0.4 to 1.0
    engagementRate: parseFloat((Math.random() * 8 + 2).toFixed(2)),
  }
})

// Mock comments
const commentTexts = [
  'Love this! Keep up the great work 🔥',
  'When will this be available in my country?',
  'Had issues with my order #12345',
  'Amazing product, highly recommend!',
  'Why is shipping so expensive?',
  'Can you make a tutorial on this?',
  'Not happy with the service',
  'Best purchase I\'ve ever made!',
  'Please respond to my DM',
  'Is this compatible with...?',
]

const authors = ['user_123', 'happy_customer', 'jane_doe', 'tech_lover', 'skeptical_buyer', 'fanboy_2000']

export const mockComments: Comment[] = Array.from({ length: 100 }, (_, i) => {
  const platform = platforms[i % 3]
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * 14))
  
  const sentiments: Comment['sentiment'][] = ['positive', 'neutral', 'negative']
  const tags: Comment['tag'][] = ['praise', 'complaint', 'question', 'spam']
  
  const sentiment = sentiments[Math.floor(Math.random() * 3)]
  let tag: Comment['tag'] = 'praise'
  if (sentiment === 'negative') tag = 'complaint'
  else if (sentiment === 'neutral') tag = Math.random() > 0.5 ? 'question' : 'praise'
  
  return {
    id: `comment-${i + 1}`,
    platform,
    postId: `post-${(i % 20) + 1}`,
    date: date.toISOString(),
    text: commentTexts[i % commentTexts.length],
    author: authors[i % authors.length],
    sentiment,
    tag,
  }
})

// Sentiment distribution
export const mockSentimentDistribution = {
  positive: 58,
  neutral: 28,
  negative: 14,
}

// Top performing days
export const mockTopDays = getDateRange(30)
  .map((date) => ({
    date,
    reach: Math.floor(Math.random() * 150000) + 50000,
  }))
  .sort((a, b) => b.reach - a.reach)
  .slice(0, 7)

// Best hours for posting (mock)
export const mockBestHours = [
  { hour: '9 AM', engagement: 4.2 },
  { hour: '12 PM', engagement: 5.8 },
  { hour: '3 PM', engagement: 4.9 },
  { hour: '6 PM', engagement: 7.2 },
  { hour: '9 PM', engagement: 6.1 },
]

// Best days for posting (mock)
export const mockBestDays = [
  { day: 'Monday', engagement: 3.8 },
  { day: 'Tuesday', engagement: 4.2 },
  { day: 'Wednesday', engagement: 4.5 },
  { day: 'Thursday', engagement: 5.1 },
  { day: 'Friday', engagement: 5.8 },
  { day: 'Saturday', engagement: 4.9 },
  { day: 'Sunday', engagement: 4.1 },
]

// Frequent topics
export const mockFrequentTopics = [
  { topic: 'Product Quality', count: 234 },
  { topic: 'Customer Service', count: 189 },
  { topic: 'Shipping', count: 156 },
  { topic: 'Pricing', count: 123 },
  { topic: 'New Features', count: 98 },
]

// Keywords
export const mockKeywords = [
  'amazing', 'love', 'great', 'help', 'issue', 'shipping', 'quality', 'recommend', 'fast', 'easy'
]
