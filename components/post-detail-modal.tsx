'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlatformBadge } from './platform-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, Heart, MessageCircle, Share2, Bookmark } from 'lucide-react'
import type { Post } from '@/types'
import { Sparkline } from '@/components/sparkline'

interface PostDetailModalProps {
  post: Post | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PostDetailModal({ post, open, onOpenChange }: PostDetailModalProps) {
  if (!post) return null

  // Mock trend data for the post
  const trendData = Array.from({ length: 14 }, () => ({
    value: Math.floor(Math.random() * 1000) + 100,
  }))

  const metrics = [
    { label: 'Reach', value: post.reach, icon: Eye },
    { label: 'Likes', value: post.likes, icon: Heart },
    { label: 'Comments', value: post.comments, icon: MessageCircle },
    { label: 'Shares', value: post.shares || 0, icon: Share2 },
    ...(post.saves ? [{ label: 'Saves', value: post.saves, icon: Bookmark }] : []),
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-card-foreground">
            Post Details
            <PlatformBadge platform={post.platform} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Post Caption */}
          <div>
            <p className="text-sm text-muted-foreground">Caption</p>
            <p className="mt-1 text-sm text-card-foreground">{post.caption}</p>
          </div>

          {/* Post Date */}
          <div>
            <p className="text-sm text-muted-foreground">Published</p>
            <p className="mt-1 text-sm text-card-foreground">
              {new Date(post.date).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <Card key={metric.label} className="bg-secondary border-border">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{metric.label}</span>
                    </div>
                    <p className="mt-1 text-lg font-semibold text-card-foreground">
                      {new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(metric.value)}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Engagement Rate */}
          <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
            <div>
              <p className="text-sm text-muted-foreground">Engagement Rate</p>
              <p className="text-2xl font-semibold text-primary">{post.engagementRate}%</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">14-day trend</p>
              <Sparkline data={trendData} color="var(--primary)" height={40} width={120} />
            </div>
          </div>

          {/* Sentiment Score */}
          <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
            <div>
              <p className="text-sm text-muted-foreground">Sentiment Score</p>
              <p className="text-lg font-medium text-card-foreground">
                {(post.sentimentScore * 100).toFixed(0)}% Positive
              </p>
            </div>
            <div
              className="h-2 w-24 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full bg-success"
                style={{ width: `${post.sentimentScore * 100}%` }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
