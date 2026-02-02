'use client'

import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts'

interface SparklineProps {
  data: { value: number }[]
  color?: string
  height?: number
  width?: number | string
}

export function Sparkline({
  data,
  color = 'var(--primary)',
  height = 40,
  width = 100,
}: SparklineProps) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
