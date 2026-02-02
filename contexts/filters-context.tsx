'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { DateRange } from 'react-day-picker'

interface FiltersContextType {
  dateRange: DateRange | undefined
  setDateRange: (range: DateRange | undefined) => void
  selectedSource: string
  setSelectedSource: (source: string) => void
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined)

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  const [selectedSource, setSelectedSource] = useState('all')

  return (
    <FiltersContext.Provider value={{ dateRange, setDateRange, selectedSource, setSelectedSource }}>
      {children}
    </FiltersContext.Provider>
  )
}

export function useFilters() {
  const context = useContext(FiltersContext)
  if (!context) {
    throw new Error('useFilters must be used within FiltersProvider')
  }
  return context
}
