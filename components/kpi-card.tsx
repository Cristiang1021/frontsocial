'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { translations } from '@/lib/translations'
import type { KPIData } from '@/types'

interface KPICardProps {
  data: KPIData
  className?: string
}

function formatValue(value: number, format: KPIData['format']): string {
  switch (format) {
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'currency':
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
    default:
      return new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  }
}

export function KPICard({ data, className }: KPICardProps) {
  const { label, value, change, changeType, format } = data

  // Get tooltip text based on label
  const getTooltipText = (labelText: string): string => {
    const tooltipMap: Record<string, string> = {
      'Total Reach': translations.tooltips.reach,
      'Alcance Total': translations.tooltips.reach,
      'Impressions': translations.tooltips.impressions,
      'Impresiones': translations.tooltips.impressions,
      'Interactions': translations.tooltips.interactions,
      'Interacciones': translations.tooltips.interactions,
      'Likes': translations.tooltips.likes,
      'Me Gusta': translations.tooltips.likes,
      'Comments': translations.tooltips.comments,
      'Comentarios': translations.tooltips.comments,
      'Shares': translations.tooltips.shares,
      'Compartidos': translations.tooltips.shares,
      'Engagement Rate': translations.tooltips.engagementRate,
      'Tasa de Participación': translations.tooltips.engagementRate,
    }
    return tooltipMap[labelText] || ''
  }

  const tooltipText = getTooltipText(label)

  return (
    <Card className={cn('bg-card border-border', className)}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {tooltipText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="text-2xl font-semibold text-card-foreground">
            {formatValue(value, format)}
          </p>
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              changeType === 'positive' && 'text-success',
              changeType === 'negative' && 'text-destructive',
              changeType === 'neutral' && 'text-muted-foreground'
            )}
          >
            {changeType === 'positive' && <TrendingUp className="h-4 w-4" />}
            {changeType === 'negative' && <TrendingDown className="h-4 w-4" />}
            {changeType === 'neutral' && <Minus className="h-4 w-4" />}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function KPICardSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-3 flex items-baseline justify-between">
          <div className="h-7 w-20 animate-pulse rounded bg-muted" />
          <div className="h-5 w-12 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}
