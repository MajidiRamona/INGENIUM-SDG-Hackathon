'use client'
import type { DashboardStats } from '@/types'

interface Props {
  stats: DashboardStats | undefined
}

const PIPELINE_STAGES = [
  { key: 'sourced',  label: 'Sourced',  color: '#6b7280' },
  { key: 'scoring',  label: 'Scoring',  color: '#d97706' },
  { key: 'scored',   label: 'Scored',   color: '#3b82f6' },
  { key: 'flagged',  label: 'Flagged',  color: '#10b981' },
  { key: 'reviewed', label: 'Reviewed', color: '#8b5cf6' },
]

function Skeleton() {
  return <div className="h-full w-full bg-[#161b22] rounded animate-pulse" />
}

export function KPICards({ stats }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Opportunities',
            value: stats?.total_opportunities,
            sub: stats ? `${stats.scored_opportunities} scored` : null,
            accent: '#10b981',
          },
          {
            label: 'Avg SDG Alignment',
            value: stats ? `${stats.avg_sdg_alignment.toFixed(1)} / 10` : null,
            sub: 'Claude AI scored',
            accent: '#3b82f6',
          },
          {
            label: 'Non-Extractive Score',
            value: stats ? `${stats.avg_ne_score.toFixed(1)} / 10` : null,
            sub: 'portfolio average',
            accent: '#f59e0b',
          },
          {
            label: 'High-Impact Deals',
            value: stats
              ? (stats.pipeline?.flagged ?? 0) + (stats.pipeline?.reviewed ?? 0)
              : null,
            sub: stats ? `${stats.featured_opportunities} featured` : null,
            accent: '#a78bfa',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4"
          >
            {card.value == null ? (
              <Skeleton />
            ) : (
              <>
                <div className="text-[11px] text-[#6b7280] uppercase tracking-widest mb-2">
                  {card.label}
                </div>
                <div
                  className="text-2xl font-semibold stat-value"
                  style={{ color: card.accent }}
                >
                  {card.value}
                </div>
                {card.sub && (
                  <div className="text-[11px] text-[#484f58] mt-1">{card.sub}</div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg px-5 py-4">
        <div className="text-[11px] text-[#6b7280] uppercase tracking-widest mb-3">
          Deal Pipeline
        </div>
        <div className="flex items-center gap-1">
          {PIPELINE_STAGES.map((stage, i) => {
            const count = stats?.pipeline?.[stage.key] ?? 0
            const total = stats?.total_opportunities || 1
            const pct = Math.round((count / total) * 100)
            return (
              <div key={stage.key} className="flex items-center gap-1 flex-1 min-w-0">
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[10px] text-[#6b7280]">{stage.label}</span>
                    <span
                      className="text-sm font-semibold stat-value"
                      style={{ color: stage.color }}
                    >
                      {stats ? count : '—'}
                    </span>
                  </div>
                  <div className="h-1 bg-[#21262d] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: stage.color }}
                    />
                  </div>
                </div>
                {i < PIPELINE_STAGES.length - 1 && (
                  <div className="text-[#30363d] text-xs mx-1 flex-shrink-0">›</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
