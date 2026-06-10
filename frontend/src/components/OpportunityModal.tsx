'use client'
import { useEffect } from 'react'
import type { Opportunity } from '@/types'
import { SDG_DATA, getSDG, STATUS_CONFIG } from '@/lib/sdg-data'

interface Props {
  opportunity: Opportunity | null
  onClose: () => void
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 7 ? '#10b981' : value >= 4 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] text-[#6b7280]">{label}</span>
        <span className="text-[11px] font-mono" style={{ color }}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1 bg-[#21262d] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(value / 10) * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export function OpportunityModal({ opportunity: opp, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!opp) return null

  const statusCfg = STATUS_CONFIG[opp.status] ?? STATUS_CONFIG.sourced
  const topSDGs = opp.primary_sdgs?.slice(0, 5) ?? []
  const ne = opp.non_extractive_score

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-6 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg w-full max-w-xl my-8 overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#21262d]">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded border" style={{ color: statusCfg.color, borderColor: statusCfg.color + '40' }}>
                {statusCfg.label}
              </span>
              {opp.opportunity_type && (
                <span className="text-[10px] text-[#6b7280] px-2 py-0.5 rounded border border-[#30363d] capitalize">
                  {opp.opportunity_type}
                </span>
              )}
              {opp.sector && (
                <span className="text-[10px] text-[#6b7280] px-2 py-0.5 rounded border border-[#30363d] capitalize">
                  {opp.sector}
                </span>
              )}
              {opp.stage && (
                <span className="text-[10px] text-[#6b7280] px-2 py-0.5 rounded border border-[#30363d] capitalize">
                  {opp.stage}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-[#484f58] hover:text-[#c9d1d9] transition-colors flex-shrink-0 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <h2 className="text-[15px] font-semibold text-[#e6edf3] leading-snug">{opp.title}</h2>
          <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-[#6b7280]">
            {opp.organization && <span>{opp.organization}</span>}
            {opp.country && <span>{opp.country}</span>}
            {opp.amount_usd && (
              <span>${(opp.amount_usd / 1_000_000).toFixed(1)}M</span>
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* SDG alignment */}
          {topSDGs.length > 0 && (
            <div>
              <div className="text-[10px] text-[#6b7280] uppercase tracking-widest mb-2">
                Primary SDG Alignment
              </div>
              <div className="flex flex-wrap gap-1.5">
                {topSDGs.map(id => {
                  const sdg = getSDG(id)
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-white text-[11px] font-medium"
                      style={{ backgroundColor: sdg.color + 'cc' }}
                    >
                      <span className="font-bold">{id}</span>
                      <span className="text-white/80">—</span>
                      <span>{sdg.short}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Impact thesis */}
          {opp.impact_thesis && (
            <div>
              <div className="text-[10px] text-[#6b7280] uppercase tracking-widest mb-2">
                AI Impact Analysis
              </div>
              <p className="text-[13px] text-[#8b949e] leading-relaxed bg-[#161b22] rounded p-3 border border-[#21262d]">
                {opp.impact_thesis}
              </p>
            </div>
          )}

          {/* Non-extractive */}
          {ne && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-[10px] text-[#6b7280] uppercase tracking-widest">
                  Non-Extractive Score
                </div>
                <span
                  className="text-lg font-semibold stat-value"
                  style={{ color: ne.overall >= 7 ? '#10b981' : ne.overall >= 4 ? '#f59e0b' : '#ef4444' }}
                >
                  {ne.overall.toFixed(1)}
                  <span className="text-[#484f58] text-sm font-normal"> / 10</span>
                </span>
              </div>
              <div className="space-y-2.5 bg-[#161b22] rounded p-3 border border-[#21262d]">
                <ScoreBar label="Community Ownership"   value={ne.community_ownership} />
                <ScoreBar label="Revenue Circularity"   value={ne.revenue_circularity} />
                <ScoreBar label="Worker Equity"         value={ne.worker_equity} />
                <ScoreBar label="Ecological Integrity"  value={ne.ecological_integrity} />
              </div>
            </div>
          )}

          {/* Full SDG grid */}
          {opp.sdg_scores && (
            <div>
              <div className="text-[10px] text-[#6b7280] uppercase tracking-widest mb-2">
                All 17 SDG Scores
              </div>
              <div className="grid grid-cols-9 gap-1">
                {SDG_DATA.map(sdg => {
                  const score = opp.sdg_scores?.[String(sdg.id)] ?? 0
                  const opacity = score > 0 ? Math.round((score / 10) * 200 + 30).toString(16).padStart(2, '0') : '20'
                  return (
                    <div
                      key={sdg.id}
                      className="rounded p-1.5 text-center"
                      style={{ backgroundColor: `${sdg.color}${opacity}` }}
                      title={`SDG ${sdg.id}: ${sdg.name} — ${score}/10`}
                    >
                      <div className="text-[9px] text-white font-bold">{sdg.id}</div>
                      <div className="text-[9px] text-white/60 font-mono">{score}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Risk flags */}
          {opp.risk_flags && opp.risk_flags.length > 0 && (
            <div>
              <div className="text-[10px] text-[#6b7280] uppercase tracking-widest mb-2">
                Risk Flags
              </div>
              <div className="space-y-1.5">
                {opp.risk_flags.map((flag, i) => (
                  <div
                    key={i}
                    className="text-[12px] text-[#d97706] bg-[#d97706]/10 border border-[#d97706]/20 rounded px-3 py-2"
                  >
                    {flag}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-wrap gap-1">
              {opp.tags?.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-[#161b22] border border-[#21262d] text-[#6b7280]">
                  {tag}
                </span>
              ))}
            </div>
            {opp.source_url && (
              <a
                href={opp.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors flex-shrink-0 ml-3"
              >
                View source
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
