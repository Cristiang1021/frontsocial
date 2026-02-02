import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Sentiment = 'positive' | 'neutral' | 'negative'

interface SentimentBadgeProps {
  sentiment: Sentiment
  className?: string
}

const sentimentConfig = {
  positive: {
    label: 'Positive',
    className: 'bg-success/20 text-success border-success/30',
  },
  neutral: {
    label: 'Neutral',
    className: 'bg-muted text-muted-foreground border-muted-foreground/30',
  },
  negative: {
    label: 'Negative',
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
}

export function SentimentBadge({ sentiment, className }: SentimentBadgeProps) {
  const config = sentimentConfig[sentiment]

  return (
    <Badge
      variant="outline"
      className={cn('font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
