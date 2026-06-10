'use client'
import { useEffect, useState, useRef } from 'react'
import type { Opportunity } from '@/types'
import { SDG_DATA, getSDG, STATUS_CONFIG } from '@/lib/sdg-data'

interface Props {
  opportunity: Opportunity | null
  onClose: () => void
}

type MemoState = 'idle' | 'streaming' | 'done' | 'error'

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

function MemoLine({ line }: { line: string }) {
  if (line === '') return <div className="h-3" />

  // Section headers: UPPERCASE lines or separator lines
  if (/^[A-Z\s]{4,}$/.test(line.trim()) && line.trim().length > 3) {
    return <div className="text-[11px] font-bold text-[#e6edf3] tracking-wider mt-4 first:mt-0">{line}</div>
  }
  if (/^[-━=]{3,}$/.test(line.trim())) {
    return <div className="border-t border-[#30363d] my-1" />
  }
  // Recommendation line
  if (line.startsWith('STRONG INVEST') || line.startsWith('INVEST') || line.startsWith('MONITOR') || line.startsWith('PASS')) {
    const color = line.startsWith('STRONG INVEST') || line.startsWith('INVEST')
      ? '#10b981' : line.startsWith('MONITOR') ? '#f59e0b' : '#ef4444'
    return <div className="text-[13px] font-bold mt-1" style={{ color }}>{line}</div>
  }
  // Bullet points
  if (line.startsWith('- ') || line.startsWith('• ')) {
    return <div className="text-[12px] text-[#8b949e] pl-3">{line}</div>
  }
  // Score lines (contain X/10)
  if (/\d+(\.\d+)?\/10/.test(line)) {
    return <div className="text-[12px] text-[#8b949e] font-mono">{line}</div>
  }
  return <div className="text-[12px] text-[#8b949e] leading-relaxed">{line}</div>
}

export function OpportunityModal({ opportunity: opp, onClose }: Props) {
  const [memoState, setMemoState] = useState<MemoState>('idle')
  const [memoText, setMemoText] = useState('')
  const memoRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Reset memo when opportunity changes
  useEffect(() => {
    setMemoState('idle')
    setMemoText('')
    abortRef.current?.abort()
  }, [opp?.id])

  // Auto-scroll memo as it streams
  useEffect(() => {
    if (memoRef.current) {
      memoRef.current.scrollTop = memoRef.current.scrollHeight
    }
  }, [memoText])

  async function generateMemo() {
    if (!opp) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setMemoState('streaming')
    setMemoText('')

    try {
      const res = await fetch(`/api/opportunities/${opp.id}/memo`, {
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            setMemoState('done')
            return
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) setMemoText(prev => prev + parsed.text)
          } catch {}
        }
      }
      setMemoState('done')
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMemoState('error')
      }
    }
  }

  if (!opp) return null

  const statusCfg = STATUS_CONFIG[opp.status] ?? STATUS_CONFIG.sourced
  const topSDGs = opp.primary_sdgs?.slice(0, 5) ?? []
  const ne = opp.non_extractive_score
  const memoLines = memoText.split('\n')

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-6 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#0d1117] border border-[#21262d] rounded-lg w-full max-w-2xl my-8 overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#21262d]">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded border"
                style={{ color: statusCfg.color, borderColor: statusCfg.color + '40' }}>
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
            <button onClick={onClose}
              className="text-[#484f58] hover:text-[#c9d1d9] transition-colors flex-shrink-0 text-xl leading-none">
              ×
            </button>
          </div>
          <h2 className="text-[15px] font-semibold text-[#e6edf3] leading-snug">{opp.title}</h2>
          <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-[#6b7280]">
            {opp.organization && <span>{opp.organization}</span>}
            {opp.country && <span>{opp.country}</span>}
            {opp.amount_usd && <span>${(opp.amount_usd / 1_000_000).toFixed(1)}M</span>}
          </div>
        </div>

        {/* Tabs — deal data vs investment memo */}
        <div className="flex border-b border-[#21262d]">
          <div className="px-6 py-2.5 text-[11px] font-medium text-[#e6edf3] border-b-2 border-[#10b981]">
            Deal Analysis
          </div>
          <button
            onClick={generateMemo}
            disabled={memoState === 'streaming'}
            className={`ml-auto flex items-center gap-2 px-4 py-2.5 text-[11px] transition-colors ${
              memoState === 'streaming'
                ? 'text-[#d97706] cursor-not-allowed'
                : memoState === 'done'
                ? 'text-[#10b981] hover:text-[#34d399]'
                : 'text-[#6b7280] hover:text-[#c9d1d9]'
            }`}
          >
            {memoState === 'streaming' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#d97706] animate-pulse" />
            )}
            {memoState === 'streaming'
              ? 'Generating memo...'
              : memoState === 'done'
              ? 'Regenerate memo'
              : 'Generate investment memo'}
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* SDG pills */}
          {topSDGs.length > 0 && (
            <div>
              <div className="text-[10px] text-[#6b7280] uppercase tracking-widest mb-2">
                Primary SDG Alignment
              </div>
              <div className="flex flex-wrap gap-1.5">
                {topSDGs.map(id => {
                  const sdg = getSDG(id)
                  return (
                    <div key={id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-white text-[11px] font-medium"
                      style={{ backgroundColor: sdg.color + 'cc' }}>
                      <span className="font-bold">{id}</span>
                      <span className="text-white/60">—</span>
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

          {/* Non-extractive scores */}
          {ne && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-[10px] text-[#6b7280] uppercase tracking-widest">
                  Non-Extractive Score
                </div>
                <span className="text-lg font-semibold stat-value"
                  style={{ color: ne.overall >= 7 ? '#10b981' : ne.overall >= 4 ? '#f59e0b' : '#ef4444' }}>
                  {ne.overall.toFixed(1)}
                  <span className="text-[#484f58] text-sm font-normal"> / 10</span>
                </span>
              </div>
              <div className="space-y-2.5 bg-[#161b22] rounded p-3 border border-[#21262d]">
                <ScoreBar label="Community Ownership"  value={ne.community_ownership} />
                <ScoreBar label="Revenue Circularity"  value={ne.revenue_circularity} />
                <ScoreBar label="Worker Equity"        value={ne.worker_equity} />
                <ScoreBar label="Ecological Integrity" value={ne.ecological_integrity} />
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
                  const opacity = score > 0
                    ? Math.round((score / 10) * 200 + 30).toString(16).padStart(2, '0')
                    : '20'
                  return (
                    <div key={sdg.id} className="rounded p-1.5 text-center"
                      style={{ backgroundColor: `${sdg.color}${opacity}` }}
                      title={`SDG ${sdg.id}: ${sdg.name} — ${score}/10`}>
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
              {opp.risk_flags.map((flag, i) => (
                <div key={i}
                  className="text-[12px] text-[#d97706] bg-[#d97706]/10 border border-[#d97706]/20 rounded px-3 py-2 mb-1.5">
                  {flag}
                </div>
              ))}
            </div>
          )}

          {/* Streaming investment memo */}
          {(memoState !== 'idle') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[#6b7280] uppercase tracking-widest">
                  Investment Memo
                </div>
                {memoState === 'streaming' && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#d97706]">
                    <span className="w-1 h-1 rounded-full bg-[#d97706] animate-ping" />
                    Writing
                  </div>
                )}
                {memoState === 'done' && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(memoText)
                    }}
                    className="text-[10px] text-[#484f58] hover:text-[#6b7280] transition-colors"
                  >
                    Copy
                  </button>
                )}
              </div>
              <div
                ref={memoRef}
                className="bg-[#161b22] border border-[#21262d] rounded p-4 max-h-72 overflow-y-auto"
              >
                {memoState === 'error' ? (
                  <div className="text-[12px] text-[#ef4444]">
                    Failed to generate memo. Check your API key.
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {memoLines.map((line, i) => (
                      <MemoLine key={i} line={line} />
                    ))}
                    {memoState === 'streaming' && (
                      <span className="inline-block w-1.5 h-3 bg-[#10b981] animate-pulse ml-0.5 align-middle" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-wrap gap-1">
              {opp.tags?.map(tag => (
                <span key={tag}
                  className="text-[10px] px-2 py-0.5 rounded bg-[#161b22] border border-[#21262d] text-[#6b7280]">
                  {tag}
                </span>
              ))}
            </div>
            {opp.source_url && (
              <a href={opp.source_url} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors flex-shrink-0 ml-3">
                View source
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
