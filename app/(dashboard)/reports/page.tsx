'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Download, FileText, BarChart3, PieChart, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { DateRange } from 'react-day-picker'

const platforms = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
]

const metrics = [
  { id: 'reach', label: 'Reach' },
  { id: 'impressions', label: 'Impressions' },
  { id: 'interactions', label: 'Interactions' },
  { id: 'likes', label: 'Likes' },
  { id: 'comments', label: 'Comments' },
  { id: 'shares', label: 'Shares' },
  { id: 'engagement', label: 'Engagement Rate' },
  { id: 'sentiment', label: 'Sentiment Analysis' },
]

const reportTemplates = [
  {
    id: 'weekly',
    name: 'Weekly Performance',
    description: 'Overview of key metrics from the past 7 days',
    icon: TrendingUp,
  },
  {
    id: 'monthly',
    name: 'Monthly Summary',
    description: 'Comprehensive monthly report with trends',
    icon: BarChart3,
  },
  {
    id: 'sentiment',
    name: 'Sentiment Report',
    description: 'Deep dive into audience sentiment and feedback',
    icon: PieChart,
  },
]

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram', 'tiktok'])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['reach', 'interactions', 'engagement'])
  const [reportFormat, setReportFormat] = useState('pdf')
  const [isGenerating, setIsGenerating] = useState(false)

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    )
  }

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId)
        ? prev.filter((m) => m !== metricId)
        : [...prev, metricId]
    )
  }

  const handleGenerate = () => {
    setIsGenerating(true)
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate custom reports for your social media performance
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date Range */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">Date Range</CardTitle>
              <CardDescription>Select the time period for your report</CardDescription>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Platforms */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">Platforms</CardTitle>
              <CardDescription>Select which platforms to include</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {platforms.map((platform) => (
                  <div key={platform.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform.id}
                      checked={selectedPlatforms.includes(platform.id)}
                      onCheckedChange={() => handlePlatformToggle(platform.id)}
                    />
                    <Label
                      htmlFor={platform.id}
                      className="text-sm font-medium text-card-foreground cursor-pointer"
                    >
                      {platform.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metrics */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">Metrics</CardTitle>
              <CardDescription>Choose the metrics to include in your report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric) => (
                  <div key={metric.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={metric.id}
                      checked={selectedMetrics.includes(metric.id)}
                      onCheckedChange={() => handleMetricToggle(metric.id)}
                    />
                    <Label
                      htmlFor={metric.id}
                      className="text-sm font-medium text-card-foreground cursor-pointer"
                    >
                      {metric.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Format & Generate */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">Export Settings</CardTitle>
              <CardDescription>Choose your preferred format and generate the report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <Select value={reportFormat} onValueChange={setReportFormat}>
                  <SelectTrigger className="w-[180px] bg-secondary">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                    <SelectItem value="json">JSON Data</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedPlatforms.length === 0 || selectedMetrics.length === 0}
                >
                  {isGenerating ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Templates & Preview */}
        <div className="space-y-6">
          {/* Templates */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">Quick Templates</CardTitle>
              <CardDescription>Start with a pre-configured template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportTemplates.map((template) => {
                const Icon = template.icon
                return (
                  <button
                    key={template.id}
                    className="w-full flex items-start gap-3 rounded-lg border border-border bg-secondary p-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-card-foreground">Report Preview</CardTitle>
              <CardDescription>Preview of your generated report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 py-12">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm font-medium text-card-foreground">No report generated</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Configure your report and click Generate
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
