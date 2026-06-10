'use client'
import type { Opportunity } from '@/types'
import { getSDG, STATUS_CONFIG } from '@/lib/sdg-data'

interface Props {
  opportunities: Opportunity[] | undefined
  isLoading: boolean
  onOpen: (opp: Opportunity) => void
  filters: {
    search: string
    setSearch: (v: string) => void
    type: string
    setType: (v: string) => void
    status: string
    setStatus: (v: string) => void
    minNE: string
    setMinNE: (v: string) => void
  }
}

function SDGPill({ id }: { id: number }) {
  const sdg = getSDG(id)
  return (
    <span
      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded text-white leading-none"
      style={{ backgroundColor: sdg.color + 'cc' }}
      title={sdg.name}
    >
      {id}
    </span>
  )
}

function NEScore({ score }: { score: number }) {
  const color = score >= 7 ? '#10b981' : score >= 4 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-[#21262d] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${(score / 10) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-mono" style={{ color }}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

const TYPES = ['grant', 'investment', 'partnership', 'procurement', 'other']
const STATUSES = ['sourced', 'scoring', 'scored', 'flagged', 'reviewed']

export function OpportunityTable({ opportunities, isLoading, onOpen, filters }: Props) {
  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-[#21262d] flex flex-wrap gap-2 items-center bg-[#0d1117]">
        <input
          type="text"
          placeholder="Search..."
          value={filters.search}
          onChange={e => filters.setSearch(e.target.value)}
          className="bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-[13px] text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-[#3b82f6]/50 w-52"
        />
        <select
          value={filters.type}
          onChange={e => filters.setType(e.target.value)}
          className="bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-[13px] text-[#c9d1d9] focus:outline-none focus:border-[#3b82f6]/50"
        >
          <option value="">All types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={e => filters.setStatus(e.target.value)}
          className="bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-[13px] text-[#c9d1d9] focus:outline-none focus:border-[#3b82f6]/50"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filters.minNE}
          onChange={e => filters.setMinNE(e.target.value)}
          className="bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-[13px] text-[#c9d1d9] focus:outline-none focus:border-[#3b82f6]/50"
        >
          <option value="">NE score: all</option>
          <option value="5">NE score ≥ 5</option>
          <option value="7">NE score ≥ 7</option>
          <option value="8">NE score ≥ 8</option>
          <option value="9">NE score ≥ 9</option>
        </select>
        <span className="ml-auto text-[11px] text-[#484f58]">
          {opportunities?.length ?? '—'} results
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#21262d]">
              {['Opportunity', 'SDGs', 'Type', 'SDG Score', 'Non-Extractive', 'Status'].map(h => (
                <th
                  key={h}
                  className="text-left text-[10px] text-[#6b7280] font-medium px-4 py-2.5 uppercase tracking-widest whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]/60">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-[#161b22] rounded animate-pulse" style={{ width: j === 0 ? '80%' : '60%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : !opportunities?.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#484f58] text-sm">
                  No opportunities match your filters.
                </td>
              </tr>
            ) : (
              opportunities.map(opp => {
                const statusCfg = STATUS_CONFIG[opp.status] ?? STATUS_CONFIG.sourced
                const ne = opp.non_extractive_score?.overall
                return (
                  <tr
                    key={opp.id}
                    onClick={() => onOpen(opp)}
                    className="hover:bg-[#161b22] cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 max-w-[320px]">
                      <div className="flex items-start gap-2">
                        {opp.is_featured && (
                          <div className="mt-0.5 w-1 h-1 rounded-full bg-[#f59e0b] flex-shrink-0" title="Featured" />
                        )}
                        <div className="min-w-0">
                          <div className="text-[13px] text-[#c9d1d9] truncate group-hover:text-white transition-colors">
                            {opp.title}
                          </div>
                          <div className="text-[11px] text-[#6b7280] truncate mt-0.5">
                            {[opp.organization, opp.country].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {opp.primary_sdgs?.slice(0, 3).map(id => (
                          <SDGPill key={id} id={id} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[#6b7280] capitalize">
                        {opp.opportunity_type ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {opp.sdg_alignment_score != null ? (
                        <span className="text-[13px] font-mono text-[#3b82f6]">
                          {opp.sdg_alignment_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-[#484f58]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ne != null ? <NEScore score={ne} /> : <span className="text-[#484f58]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: statusCfg.color }}
                      >
                        {statusCfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
