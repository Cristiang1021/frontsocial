import jsPDF from 'jspdf'

interface ChartOptions {
  x: number
  y: number
  width: number
  height: number
  title?: string
}

export function drawLineChart(
  doc: jsPDF,
  data: Array<{ date: string; value: number }>,
  options: ChartOptions,
  label: string
): void {
  const { x, y, width, height, title } = options
  
  // Title
  if (title) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(title, x, y - 5)
  }
  
  // Chart area
  const chartX = x
  const chartY = y + 5
  const chartWidth = width
  const chartHeight = height - 15
  
  // Draw axes
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  // X axis
  doc.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight)
  // Y axis
  doc.line(chartX, chartY, chartX, chartY + chartHeight)
  
  if (data.length === 0) return
  
  // Calculate scales
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const valueRange = maxValue - minValue || 1
  const stepX = chartWidth / (data.length - 1 || 1)
  
  // Draw grid lines
  doc.setDrawColor(240, 240, 240)
  for (let i = 0; i <= 4; i++) {
    const gridY = chartY + (chartHeight / 4) * i
    doc.line(chartX, gridY, chartX + chartWidth, gridY)
  }
  
  // Draw line
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(1.5)
  
  const points: Array<{ x: number; y: number }> = []
  data.forEach((point, index) => {
    const pointX = chartX + (index * stepX)
    const normalizedValue = (point.value - minValue) / valueRange
    const pointY = chartY + chartHeight - (normalizedValue * chartHeight)
    points.push({ x: pointX, y: pointY })
  })
  
  // Draw line connecting points
  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y)
  }
  
  // Draw points
  doc.setFillColor(59, 130, 246)
  points.forEach(point => {
    doc.circle(point.x, point.y, 1.5, 'F')
  })
  
  // Labels
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(label, chartX + chartWidth / 2, chartY + chartHeight + 8, { align: 'center' })
  
  // Y-axis labels
  doc.setTextColor(150, 150, 150)
  for (let i = 0; i <= 4; i++) {
    const value = minValue + (valueRange / 4) * (4 - i)
    const labelY = chartY + (chartHeight / 4) * i
    doc.text(
      new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(value),
      chartX - 2,
      labelY + 2,
      { align: 'right' }
    )
  }
}

export function drawBarChart(
  doc: jsPDF,
  data: Array<{ label: string; value: number }>,
  options: ChartOptions,
  color: [number, number, number] = [59, 130, 246]
): void {
  const { x, y, width, height, title } = options
  
  // Title
  if (title) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(title, x, y - 5)
  }
  
  // Chart area
  const chartX = x
  const chartY = y + 5
  const chartWidth = width
  const chartHeight = height - 20
  
  // Draw axes
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight)
  doc.line(chartX, chartY, chartX, chartY + chartHeight)
  
  if (data.length === 0) return
  
  // Calculate scales
  const maxValue = Math.max(...data.map(d => d.value))
  const barWidth = chartWidth / data.length - 2
  const barSpacing = 2
  
  // Draw bars
  data.forEach((item, index) => {
    const barX = chartX + (index * (barWidth + barSpacing)) + 1
    const barHeight = (item.value / maxValue) * chartHeight
    const barY = chartY + chartHeight - barHeight
    
    doc.setFillColor(...color)
    doc.setDrawColor(...color)
    doc.rect(barX, barY, barWidth, barHeight, 'F')
    
    // Value label on top of bar
    if (barHeight > 5) {
      doc.setFontSize(7)
      doc.setTextColor(0, 0, 0)
      doc.text(
        new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(item.value),
        barX + barWidth / 2,
        barY - 2,
        { align: 'center' }
      )
    }
    
    // X-axis label
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    const label = item.label.length > 10 ? item.label.substring(0, 10) + '...' : item.label
    doc.text(
      label,
      barX + barWidth / 2,
      chartY + chartHeight + 5,
      { align: 'center' }
    )
  })
  
  // Y-axis labels
  doc.setTextColor(150, 150, 150)
  for (let i = 0; i <= 4; i++) {
    const value = (maxValue / 4) * (4 - i)
    const labelY = chartY + (chartHeight / 4) * i
    doc.text(
      new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(value),
      chartX - 2,
      labelY + 2,
      { align: 'right' }
    )
  }
}

export function drawDonutChart(
  doc: jsPDF,
  data: Array<{ name: string; value: number; color: string }>,
  options: ChartOptions
): void {
  const { x, y, width, height, title } = options
  
  // Title
  if (title) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(title, x, y - 5)
  }
  
  if (data.length === 0) return
  
  // Calculate center and radius
  const centerX = x + width / 2
  const centerY = y + height / 2
  const radius = Math.min(width, height) / 2 - 10
  
  // Calculate total
  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) return
  
  // Draw donut segments - simplified approach using colored circles
  // First draw all segments as full circles, then overlay white center
  let currentAngle = -90 // Start at top (12 o'clock)
  
  // Draw background circle (white)
  doc.setFillColor(255, 255, 255)
  doc.circle(centerX, centerY, radius, 'F')
  
  // Draw segments as arcs (simplified - using multiple small circles/rectangles)
  data.forEach((item, index) => {
    const percentage = item.value / total
    const angle = percentage * 360
    
    // Parse color (handle rgb, hex - avoid hsl to prevent parsing errors)
    let color: [number, number, number] = [100, 100, 100]
    if (item.color.startsWith('rgb')) {
      const matches = item.color.match(/\d+/g)
      if (matches && matches.length >= 3) {
        color = [parseInt(matches[0]), parseInt(matches[1]), parseInt(matches[2])]
      }
    } else if (item.color.startsWith('#')) {
      // Hex color
      const hex = item.color.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      color = [r, g, b]
    } else {
      // Default colors for common names
      const colorLower = item.color.toLowerCase()
      if (colorLower.includes('green') || colorLower.includes('positivo')) color = [34, 197, 94]
      else if (colorLower.includes('red') || colorLower.includes('negativo')) color = [239, 68, 68]
      else if (colorLower.includes('gray') || colorLower.includes('neutral')) color = [148, 163, 184]
      else color = [59, 130, 246] // Default blue
    }
    
    // Draw segment using multiple small rectangles to approximate arc
    doc.setFillColor(...color)
    doc.setDrawColor(...color)
    
    // Calculate segment bounds
    const startAngleRad = (currentAngle * Math.PI) / 180
    const endAngleRad = ((currentAngle + angle) * Math.PI) / 180
    
    // Draw segment as a filled arc approximation
    // Use multiple small rectangles to create arc effect
    const steps = Math.max(5, Math.floor(angle / 10))
    for (let i = 0; i <= steps; i++) {
      const stepAngle = currentAngle + (angle * i) / steps
      const stepAngleRad = (stepAngle * Math.PI) / 180
      
      // Calculate point on outer circle
      const outerX = centerX + radius * Math.cos(stepAngleRad)
      const outerY = centerY + radius * Math.sin(stepAngleRad)
      
      // Draw small rectangle from center to outer point
      const innerRadius = radius * 0.6
      const innerX = centerX + innerRadius * Math.cos(stepAngleRad)
      const innerY = centerY + innerRadius * Math.sin(stepAngleRad)
      
      // Draw line segment
      doc.setLineWidth(radius * 0.4)
      doc.line(innerX, innerY, outerX, outerY)
    }
    
    currentAngle += angle
  })
  
  // Draw inner white circle for donut effect
  doc.setFillColor(255, 255, 255)
  doc.circle(centerX, centerY, radius * 0.6, 'F')
  
  // Draw legend
  const legendX = x + width - 60
  const legendY = y + 10
  let legendOffset = 0
  
  data.forEach((item, index) => {
    // Color box
    let color: [number, number, number] = [100, 100, 100]
    if (item.color.startsWith('rgb')) {
      const matches = item.color.match(/\d+/g)
      if (matches && matches.length >= 3) {
        color = [parseInt(matches[0]), parseInt(matches[1]), parseInt(matches[2])]
      }
    } else if (item.color.startsWith('#')) {
      const hex = item.color.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      color = [r, g, b]
    } else {
      const colorLower = item.color.toLowerCase()
      if (colorLower.includes('green') || colorLower.includes('positivo')) color = [34, 197, 94]
      else if (colorLower.includes('red') || colorLower.includes('negativo')) color = [239, 68, 68]
      else if (colorLower.includes('gray') || colorLower.includes('neutral')) color = [148, 163, 184]
      else color = [59, 130, 246]
    }
    
    doc.setFillColor(...color)
    doc.rect(legendX, legendY + legendOffset, 3, 3, 'F')
    
    // Label
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.text(
      `${item.name}: ${item.value.toFixed(1)}%`,
      legendX + 5,
      legendY + legendOffset + 2
    )
    
    legendOffset += 5
  })
}
