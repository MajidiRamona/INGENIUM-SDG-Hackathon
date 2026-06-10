'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { api } from '@/lib/api'
import type { Opportunity, DashboardStats } from '@/types'
import { KPICards } from '@/components/KPICards'
import { SDGGrid } from '@/components/SDGGrid'
import { AgentPanel } from '@/components/AgentPanel'
import { OpportunityTable } from '@/components/OpportunityTable'
import { OpportunityModal } from '@/components/OpportunityModal'

export default function Dashboard() {
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [minNE, setMinNE] = useState('')
  const [selected, setSelected] = useState<Opportunity | null>(null)

  const { data: stats } = useSWR<DashboardStats>(
    '/analytics/dashboard',
    () => api.analytics.dashboard(),
    { refreshInterval: 15000 }
  )

  const { data: distribution } = useSWR<Record<string, number>>(
    '/analytics/sdg-distribution',
    () => api.analytics.sdgDistribution(),
    { refreshInterval: 15000 }
  )

  const queryParams: Record<string, string | number | boolean> = {}
  if (search) queryParams.search = search
  if (type) queryParams.opportunity_type = type
  if (status) queryParams.status = status
  if (selectedSDG) queryParams.sdg = selectedSDG
  if (minNE) queryParams.min_ne_score = minNE

  const { data: opportunities, isLoading } = useSWR<Opportunity[]>(
    `/opportunities?${JSON.stringify(queryParams)}`,
    () => api.opportunities.list(queryParams),
    { refreshInterval: 20000 }
  )

  return (
    <div className="min-h-screen bg-[#0a0c10]">

      {/* Header */}
      <header className="border-b border-[#21262d] bg-[#0d1117] sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded bg-[#10b981] flex-shrink-0" />
            <span className="text-[14px] font-semibold text-[#e6edf3] tracking-tight">
              ImpactScout
            </span>
            <span className="hidden sm:block text-[#30363d] text-xs">|</span>
            <span className="hidden sm:block text-[11px] text-[#6b7280]">
              SDG Deal Flow Intelligence
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#6b7280]">
            <span>
              <span className="text-[#10b981] font-medium stat-value">{stats?.total_opportunities ?? '—'}</span>
              {' '}opportunities
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              <span>Live</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-4">

        <KPICards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SDGGrid
              distribution={distribution}
              selectedSDG={selectedSDG}
              onSelect={setSelectedSDG}
            />
          </div>
          <AgentPanel />
        </div>

        {/* Non-extractive callout */}
        <div className="border border-[#21262d] rounded-lg px-5 py-4 bg-[#0d1117]">
          <div className="flex gap-4">
            <div className="w-1 rounded-full bg-[#10b981] flex-shrink-0" />
            <div>
              <div className="text-[12px] font-semibold text-[#10b981] mb-1">
                Non-Extractive Finance Lens
              </div>
              <div className="text-[12px] text-[#6b7280] leading-relaxed">
                ImpactScout scores every opportunity across four dimensions —
                {' '}<span className="text-[#8b949e]">community ownership</span>,
                {' '}<span className="text-[#8b949e]">revenue circularity</span>,
                {' '}<span className="text-[#8b949e]">worker equity</span>, and
                {' '}<span className="text-[#8b949e]">ecological integrity</span> —
                surfacing cooperatives, land trusts, and regenerative enterprises above standard ESG-labelled deals.
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-[11px] text-[#6b7280] uppercase tracking-widest">
              Deal Pipeline
            </h2>
            {selectedSDG && (
              <button
                onClick={() => setSelectedSDG(null)}
                className="text-[11px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
              >
                SDG {selectedSDG} filter active — clear
              </button>
            )}
          </div>
          <OpportunityTable
            opportunities={opportunities}
            isLoading={isLoading}
            onOpen={setSelected}
            filters={{ search, setSearch, type, setType, status, setStatus, minNE, setMinNE }}
          />
        </div>
      </main>

      <footer className="border-t border-[#21262d] mt-10 py-4 px-6">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between text-[11px] text-[#484f58]">
          <span>ImpactScout</span>
          <span>Claude AI · FastAPI · Next.js</span>
        </div>
      </footer>

      <OpportunityModal opportunity={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
