'use client'

import React from "react"

import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
}

export function EmptyState({
  title = 'No data available',
  description = 'There is no data to display at this time.',
  icon,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed bg-card">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        {icon || <Inbox className="h-12 w-12 text-muted-foreground" />}
        <h3 className="mt-4 text-lg font-semibold text-card-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Failed to load data. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="border-destructive/50 bg-card">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold text-card-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 border-b border-border pb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  // Use fixed heights to avoid hydration mismatch
  // These values are deterministic based on index
  const heights = [35, 71, 34, 48, 40, 40, 62, 32, 64, 44, 73, 69]
  
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="flex h-full items-end justify-between gap-2 px-4 pb-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-muted"
            style={{ height: `${heights[i % heights.length]}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <Card className="bg-card">
      <CardContent className="p-5">
        <Skeleton className="h-4 w-24" />
        <div className="mt-3 flex items-baseline justify-between">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-5 w-12" />
        </div>
      </CardContent>
    </Card>
  )
}
