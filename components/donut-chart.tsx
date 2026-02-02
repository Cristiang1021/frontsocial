'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DonutChartProps {
  data: { name: string; value: number; color: string }[]
  title?: string
  height?: number
  innerRadius?: number
  outerRadius?: number
  showLegend?: boolean
  centerLabel?: string
  centerValue?: string | number
}

export function DonutChart({
  data,
  title,
  height = 300,
  innerRadius = 60,
  outerRadius = 90,
  showLegend = true,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  return (
    <Card className="bg-card border-border">
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-card-foreground">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? 'pt-0' : 'p-6'}>
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={height - (showLegend ? 80 : 0)}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
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
                formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
              />
              {/* Center text */}
              {(centerLabel || centerValue) && (
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fill: 'var(--foreground)' }}
                >
                  {centerValue && (
                    <tspan
                      x="50%"
                      dy="-0.5em"
                      style={{ fontSize: '24px', fontWeight: 600 }}
                    >
                      {typeof centerValue === 'number' 
                        ? `${centerValue.toFixed(1)}%` 
                        : typeof centerValue === 'string' && !isNaN(parseFloat(centerValue))
                        ? `${parseFloat(centerValue).toFixed(1)}%`
                        : centerValue}
                    </tspan>
                  )}
                  {centerLabel && (
                    <tspan
                      x="50%"
                      dy="1.5em"
                      style={{ fontSize: '12px', fill: 'var(--muted-foreground)' }}
                    >
                      {centerLabel}
                    </tspan>
                  )}
                </text>
              )}
            </PieChart>
          </ResponsiveContainer>
          {showLegend && (
            <div className="w-full mt-4 pt-4 border-t border-border">
              <div className="flex flex-wrap justify-center gap-4">
                {data.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {item.name}: {item.value.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
