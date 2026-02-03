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
import { Checkbox } from '@/components/ui/checkbox'
import { CalendarIcon, Download, Bell, User, FileText, FileSpreadsheet, CheckSquare } from 'lucide-react'
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
  const { dateRange, setDateRange, selectedSources, setSelectedSources } = useFilters()
  const [datePreset, setDatePreset] = useState('30d')
  const [sources, setSources] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)
  const [sourcesPopoverOpen, setSourcesPopoverOpen] = useState(false)

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
      <header className="flex flex-col sm:flex-row h-auto sm:h-16 items-stretch sm:items-center justify-between border-b border-border bg-background px-3 sm:px-6 py-2 sm:py-0 gap-2 sm:gap-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="w-full sm:w-[140px] h-10 bg-secondary animate-pulse rounded-md" />
          <div className="w-full sm:w-[200px] h-10 bg-secondary animate-pulse rounded-md" />
          <div className="w-full sm:w-[180px] h-10 bg-secondary animate-pulse rounded-md" />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <div className="w-24 h-8 bg-secondary animate-pulse rounded-md" />
        </div>
      </header>
    )
  }

  return (
    <header className="flex flex-col sm:flex-row h-auto sm:h-16 items-stretch sm:items-center justify-between border-b border-border bg-background px-3 sm:px-6 py-2 sm:py-0 gap-2 sm:gap-0">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {/* Date Range Selector */}
        <Select value={datePreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full sm:w-[140px] bg-secondary text-secondary-foreground text-xs sm:text-sm">
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
                'justify-start text-left font-normal w-full sm:w-auto text-xs sm:text-sm',
                !dateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'MMM d, yyyy')
                  )
                ) : (
                  <span className="hidden sm:inline">Seleccionar fecha</span>
                )}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2}
            />
          </PopoverContent>
        </Popover>

        {/* Source Selector - Multiple Selection */}
        <Popover open={sourcesPopoverOpen} onOpenChange={setSourcesPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              className={cn(
                'w-full sm:w-[200px] justify-between bg-secondary text-secondary-foreground text-xs sm:text-sm',
                selectedSources.length === 0 && 'text-muted-foreground'
              )}
            >
              <span className="truncate">
                {selectedSources.length === 0
                  ? 'Todas las Fuentes'
                  : selectedSources.length === 1
                  ? sources.find(s => s.id === selectedSources[0])?.label || sources.find(s => s.id === selectedSources[0])?.url.split('/').pop() || '1 fuente'
                  : `${selectedSources.length} fuentes`}
              </span>
              <CheckSquare className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] sm:w-[250px] p-0" align="start">
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm font-medium">Seleccionar Fuentes</span>
                {selectedSources.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setSelectedSources([])
                    }}
                  >
                    Limpiar
                  </Button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <div className="p-1">
                  <div
                    className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                    onClick={() => {
                      if (selectedSources.length === sources.length) {
                        setSelectedSources([])
                      } else {
                        setSelectedSources(sources.map(s => s.id))
                      }
                    }}
                  >
                    <Checkbox
                      checked={selectedSources.length === sources.length && sources.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSources(sources.map(s => s.id))
                        } else {
                          setSelectedSources([])
                        }
                      }}
                    />
                    <label className="text-sm font-medium leading-none cursor-pointer flex-1">
                      Todas las Fuentes
                    </label>
                  </div>
                  {sources.map((source) => {
                    const isSelected = selectedSources.includes(source.id)
                    return (
                      <div
                        key={source.id}
                        className="flex items-center space-x-2 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSources(selectedSources.filter(id => id !== source.id))
                          } else {
                            setSelectedSources([...selectedSources, source.id])
                          }
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSources([...selectedSources, source.id])
                            } else {
                              setSelectedSources(selectedSources.filter(id => id !== source.id))
                            }
                          }}
                        />
                        <label className="text-sm leading-none cursor-pointer flex-1 truncate">
                          {source.label || source.url.split('/').pop()}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2 justify-end">
        {/* Export Button */}
        <ExportButton dateRange={dateRange} selectedSources={selectedSources} sources={sources} />

        {/* Notifications - Hidden on mobile */}
        <Button variant="ghost" size="icon" className="relative hidden sm:flex">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* User Avatar - Hidden on mobile */}
        <Button variant="ghost" size="icon" className="hidden sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <User className="h-4 w-4 text-secondary-foreground" />
          </div>
        </Button>
      </div>
    </header>
  )
}
