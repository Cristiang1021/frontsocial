'use client'

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

interface LineChartProps {
  data: Record<string, unknown>[]
  title?: string
  xKey: string
  lines: {
    key: string
    name: string
    color: string
  }[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  infoTooltip?: string
}

export function LineChart({
  data,
  title,
  xKey,
  lines,
  height = 300,
  showGrid = true,
  showLegend = true,
  infoTooltip,
}: LineChartProps) {
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
          <RechartsLineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />}
            <XAxis
              dataKey={xKey}
              stroke="var(--muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
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
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
                color: 'hsl(var(--popover-foreground))',
                padding: '8px 12px',
              }}
              labelStyle={{ 
                color: 'hsl(var(--popover-foreground))',
                marginBottom: '4px',
                fontWeight: 500
              }}
              itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              formatter={(value: number, name: string) => {
                // Format with proper units
                if (value >= 1000000) {
                  return [`${(value / 1000000).toFixed(1)}M`, name]
                } else if (value >= 1000) {
                  return [`${(value / 1000).toFixed(1)}K`, name]
                }
                return [new Intl.NumberFormat('es-ES').format(value), name]
              }}
              labelFormatter={(label) => {
                // Format date labels better
                try {
                  const date = new Date(label)
                  return date.toLocaleDateString('es-ES', { 
                    day: '2-digit', 
                    month: 'short',
                    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                  })
                } catch {
                  return label
                }
              }}
            />
            {showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span style={{ color: 'var(--foreground)' }}>{value}</span>}
              />
            )}
            {lines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
