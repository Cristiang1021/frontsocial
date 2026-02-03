'use client'

import React from "react"
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { FiltersProvider } from '@/contexts/filters-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FiltersProvider>
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
    </FiltersProvider>
  )
}
