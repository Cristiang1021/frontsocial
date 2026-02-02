'use client'

import React from 'react'
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

interface BarChartProps {
  data: Record<string, unknown>[]
  title?: string
  xKey: string
  yKey: string
  color?: string
  colors?: string[]
  height?: number
  showGrid?: boolean
  horizontal?: boolean
  infoTooltip?: string
  showLegend?: boolean
}

export function BarChart({
  data,
  title,
  xKey,
  yKey,
  color = 'var(--primary)',
  colors,
  height = 300,
  showGrid = true,
  horizontal = false,
  infoTooltip,
  showLegend = false,
}: BarChartProps) {
  return (
    <Card className="bg-card border-border">
      {title && (
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
            {infoTooltip && (
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground hover:text-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{infoTooltip}</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={title ? 'pt-0' : 'p-6'}>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={data}
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 5, right: 10, left: horizontal ? 60 : 0, bottom: 5 }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />}
            {horizontal ? (
              <>
                <XAxis
                  type="number"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(value)
                  }
                />
                <YAxis
                  type="category"
                  dataKey={xKey}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={xKey}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickFormatter={(value, index) => {
                    // Try to get custom label from data
                    const dataPoint = data[index]
                    if (dataPoint && (dataPoint as any).customLabel) {
                      return (dataPoint as any).customLabel.split('\n')[0] // First line only for axis
                    }
                    // If it's a date, format it
                    if (typeof value === 'string' && value.includes('-')) {
                      try {
                        const date = new Date(value)
                        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
                      } catch {
                        return value
                      }
                    }
                    return value
                  }}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(value)
                  }
                />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
                color: 'hsl(var(--popover-foreground))',
                padding: '12px 16px',
                maxWidth: '300px',
              }}
              labelStyle={{ 
                color: 'hsl(var(--popover-foreground))',
                marginBottom: '8px',
                fontWeight: 600,
                fontSize: '14px'
              }}
              itemStyle={{ color: 'hsl(var(--popover-foreground))', fontSize: '13px' }}
              formatter={(value: number, name: string, props: any) => {
                // If the data has additional info, show it in a formatted way
                const payload = props.payload
                if (payload && payload.fullLabel) {
                  // Split multi-line labels
                  const lines = payload.fullLabel.split('\n')
                  return [
                    <div key="tooltip-content" style={{ lineHeight: '1.6' }}>
                      {lines.map((line: string, idx: number) => (
                        <div key={idx} style={{ 
                          fontWeight: idx === 0 ? 600 : 400,
                          fontSize: idx === 0 ? '14px' : '12px',
                          marginBottom: idx < lines.length - 1 ? '4px' : 0
                        }}>
                          {line}
                        </div>
                      ))}
                    </div>,
                    ''
                  ]
                }
                // Format numbers nicely
                const formatted = value >= 1000000 
                  ? `${(value / 1000000).toFixed(1)}M`
                  : value >= 1000
                  ? `${(value / 1000).toFixed(1)}K`
                  : new Intl.NumberFormat('es-ES').format(value)
                return [formatted, name]
              }}
              labelFormatter={(label, payload) => {
                // Show custom label if available
                if (payload && payload[0] && payload[0].payload) {
                  const customLabel = payload[0].payload.customLabel
                  if (customLabel) {
                    // Return first line of multi-line label
                    return customLabel.split('\n')[0]
                  }
                }
                return label
              }}
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
            />
            <Bar dataKey={yKey} radius={[4, 4, 0, 0]} maxBarSize={60}>
              {data.map((item, index) => {
                // Use color from data if available, otherwise use colors array or default
                const barColor = (item as any).color || (colors ? colors[index % colors.length] : color)
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={barColor}
                  />
                )
              })}
            </Bar>
            {showLegend && colors && colors.length > 0 && (
              <Legend
                formatter={(value, entry) => {
                  const platformNames: Record<string, string> = {
                    'Facebook': 'Facebook',
                    'Instagram': 'Instagram',
                    'Tiktok': 'TikTok'
                  }
                  return <span style={{ color: 'var(--foreground)', fontSize: '12px' }}>{platformNames[value] || value}</span>
                }}
              />
            )}
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
