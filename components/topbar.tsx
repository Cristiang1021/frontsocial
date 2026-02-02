'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { CalendarIcon, Download, Bell, User, FileText, FileSpreadsheet } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { getProfiles } from '@/lib/api'
import { profileToSource } from '@/lib/adapters'
import { useState as useStateTopbar, useEffect } from 'react'
import { useFilters } from '@/contexts/filters-context'
import type { DateRange } from 'react-day-picker'
import { ExportButton } from '@/components/export-button'

const datePresets = [
  { label: 'Hoy', value: 'today' },
  { label: 'Últimos 7 días', value: '7d' },
  { label: 'Últimos 30 días', value: '30d' },
  { label: 'Últimos 90 días', value: '90d' },
  { label: 'Personalizado', value: 'custom' },
]

export function Topbar() {
  const { dateRange, setDateRange, selectedSource, setSelectedSource } = useFilters()
  const [datePreset, setDatePreset] = useState('30d')
  const [sources, setSources] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    async function loadSources() {
      try {
        const profiles = await getProfiles()
        const sourcesData = profiles.map(profileToSource)
        setSources(sourcesData.filter(s => s.status === 'completed'))
      } catch (error) {
        console.error('Error loading sources:', error)
      }
    }
    loadSources()
  }, [])

  const handlePresetChange = (value: string) => {
    setDatePreset(value)
    const now = new Date()
    let newRange: DateRange | undefined
    
    switch (value) {
      case 'today':
        newRange = { from: now, to: now }
        break
      case '7d':
        newRange = { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), to: now }
        break
      case '30d':
        newRange = { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: now }
        break
      case '90d':
        newRange = { from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), to: now }
        break
      case 'custom':
        // Keep current range when switching to custom
        newRange = dateRange
        break
    }
    
    if (newRange) {
      console.log('Updating date range:', newRange)
      setDateRange(newRange)
    }
  }

  // Update preset when dateRange changes externally
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return
    
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      setDatePreset('today')
    } else if (diffDays <= 7) {
      setDatePreset('7d')
    } else if (diffDays <= 30) {
      setDatePreset('30d')
    } else if (diffDays <= 90) {
      setDatePreset('90d')
    } else {
      setDatePreset('custom')
    }
  }, [dateRange])

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex items-center gap-4">
          <div className="w-[140px] h-10 bg-secondary animate-pulse rounded-md" />
          <div className="w-[200px] h-10 bg-secondary animate-pulse rounded-md" />
          <div className="w-[180px] h-10 bg-secondary animate-pulse rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-8 bg-secondary animate-pulse rounded-md" />
        </div>
      </header>
    )
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-4">
        {/* Date Range Selector */}
        <Select value={datePreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[140px] bg-secondary text-secondary-foreground">
            <SelectValue placeholder="Seleccionar rango" />
          </SelectTrigger>
          <SelectContent>
            {datePresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              className={cn(
                'justify-start text-left font-normal',
                !dateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </>
                ) : (
                  format(dateRange.from, 'MMM d, yyyy')
                )
              ) : (
                <span>Seleccionar fecha</span>
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

        {/* Source Selector */}
        <Select value={selectedSource} onValueChange={setSelectedSource}>
          <SelectTrigger className="w-[180px] bg-secondary text-secondary-foreground">
            <SelectValue placeholder="Seleccionar fuente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las Fuentes</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source.id} value={source.id}>
                {source.label || source.url.split('/').pop()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        {/* Export Button */}
        <ExportButton dateRange={dateRange} selectedSource={selectedSource} sources={sources} />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* User Avatar */}
        <Button variant="ghost" size="icon">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <User className="h-4 w-4 text-secondary-foreground" />
          </div>
        </Button>
      </div>
    </header>
  )
}
