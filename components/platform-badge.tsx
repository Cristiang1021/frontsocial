import { Badge } from '@/components/ui/badge'
import { Facebook, Instagram, Music2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Platform } from '@/types'

interface PlatformBadgeProps {
  platform: Platform
  showLabel?: boolean
  className?: string
}

const platformConfig = {
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    className: 'bg-facebook/20 text-facebook border-facebook/30',
  },
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    className: 'bg-instagram/20 text-instagram border-instagram/30',
  },
  tiktok: {
    label: 'TikTok',
    icon: Music2,
    className: 'bg-tiktok/20 text-tiktok border-tiktok/30',
  },
}

export function PlatformBadge({ platform, showLabel = true, className }: PlatformBadgeProps) {
  const config = platformConfig[platform]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 font-medium',
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  )
}
