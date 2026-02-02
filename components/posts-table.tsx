'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlatformBadge } from './platform-badge'
import { cn } from '@/lib/utils'
import type { Post } from '@/types'

interface PostsTableProps {
  posts: Post[]
  className?: string
  compact?: boolean
  onRowClick?: (post: Post) => void
}

export function PostsTable({ posts, className, compact = false, onRowClick }: PostsTableProps) {
  return (
    <div className={cn('rounded-lg border border-border', className)}>
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Post</TableHead>
            <TableHead className="text-muted-foreground">Platform</TableHead>
            <TableHead className="text-muted-foreground">Date</TableHead>
            {!compact && (
              <>
                <TableHead className="text-right text-muted-foreground">Reach</TableHead>
                <TableHead className="text-right text-muted-foreground">Interactions</TableHead>
              </>
            )}
            <TableHead className="text-right text-muted-foreground">ER</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow
              key={post.id}
              className={cn(
                'border-border',
                onRowClick && 'cursor-pointer hover:bg-muted/50'
              )}
              onClick={() => onRowClick?.(post)}
            >
              <TableCell className="max-w-[200px]">
                <p className="truncate text-sm text-card-foreground">{post.caption}</p>
              </TableCell>
              <TableCell>
                <PlatformBadge platform={post.platform} showLabel={!compact} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(post.date).toLocaleDateString('es-ES', {
                  month: 'short',
                  day: 'numeric',
                })}
              </TableCell>
              {!compact && (
                <>
                  <TableCell className="text-right text-sm text-card-foreground">
                    {new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(post.reach)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-card-foreground">
                    {new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(post.interactions)}
                  </TableCell>
                </>
              )}
              <TableCell className="text-right text-sm text-card-foreground">
                {post.engagementRate}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
