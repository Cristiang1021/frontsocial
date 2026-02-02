'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Facebook, Instagram, Music2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sparkline } from '@/components/sparkline'
import type { PlatformMetrics } from '@/types'

interface PlatformCardProps {
  data: PlatformMetrics
  className?: string
}

const platformConfig = {
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'var(--chart-1)',
    href: '/facebook',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'var(--chart-2)',
    href: '/instagram',
  },
  tiktok: {
    name: 'TikTok',
    icon: Music2,
    color: 'var(--chart-3)',
    href: '/tiktok',
  },
}

export function PlatformCard({ data, className }: PlatformCardProps) {
  const config = platformConfig[data.platform]
  const Icon = config.icon
  const sparklineData = data.trend.map((point) => ({ value: point.interactions }))

  return (
    <Card className={cn('group bg-card border-border hover:border-primary/50 transition-colors', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <Icon className="h-5 w-5" style={{ color: config.color }} />
            </div>
            <div>
              <p className="font-medium text-card-foreground">{config.name}</p>
              <p className="text-sm text-muted-foreground">
                {new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(data.reach)} alcance
              </p>
            </div>
          </div>
          <Sparkline data={sparklineData} color={config.color} height={36} width={80} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Interactions</p>
            <p className="text-sm font-medium text-card-foreground">
              {new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(data.interactions)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Engagement</p>
            <p className="text-sm font-medium text-card-foreground">{data.engagementRate}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Comments</p>
            <p className="text-sm font-medium text-card-foreground">
              {new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(data.comments)}
            </p>
          </div>
        </div>

        <Link
          href={config.href}
          className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
        >
          View details
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
