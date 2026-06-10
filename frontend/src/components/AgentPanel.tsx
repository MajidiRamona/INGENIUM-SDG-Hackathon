'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { api } from '@/lib/api'
import type { AgentInfo } from '@/types'

function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

export function AgentPanel() {
  const { data: agents, isLoading } = useSWR<AgentInfo[]>(
    '/agents',
    () => api.agents.list(),
    { refreshInterval: 8000 }
  )
  const [running, setRunning] = useState<Record<string, boolean>>({})

  async function triggerAgent(name: string) {
    setRunning(r => ({ ...r, [name]: true }))
    try {
      await api.agents.run(name)
      setTimeout(() => {
        mutate('/agents')
        setRunning(r => ({ ...r, [name]: false }))
      }, 3000)
    } catch {
      setRunning(r => ({ ...r, [name]: false }))
    }
  }

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4">
      <div className="text-[11px] text-[#6b7280] uppercase tracking-widest mb-3">
        Scout Agents
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-[72px] bg-[#161b22] rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {agents?.map((agent) => {
            const run = agent.last_run
            const isActive = running[agent.name] || run?.status === 'running'
            const dotColor = isActive
              ? '#d97706'
              : run?.status === 'failed'
              ? '#ef4444'
              : run?.status === 'completed'
              ? '#10b981'
              : '#484f58'

            return (
              <div
                key={agent.name}
                className="flex items-start justify-between gap-3 p-3 rounded bg-[#161b22] border border-[#21262d]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="text-[13px] text-[#c9d1d9] font-medium">
                      {agent.display_name}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#6b7280]">
                    {run
                      ? `${timeAgo(run.completed_at || run.started_at)} · ${run.opportunities_found} found · ${run.opportunities_scored} scored`
                      : 'Not yet run'}
                  </div>
                  <div className="text-[10px] text-[#484f58] mt-0.5 truncate">
                    {agent.sources.slice(0, 3).join(' · ')}
                    {agent.sources.length > 3 ? ` +${agent.sources.length - 3}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => triggerAgent(agent.name)}
                  disabled={isActive}
                  className={`text-[11px] px-2.5 py-1 rounded border transition-colors flex-shrink-0 ${
                    isActive
                      ? 'border-[#d97706]/30 text-[#d97706]/60 cursor-not-allowed'
                      : 'border-[#30363d] text-[#6b7280] hover:border-[#10b981]/40 hover:text-[#10b981]'
                  }`}
                >
                  {isActive ? 'Running' : 'Run'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-[#21262d] text-[10px] text-[#484f58] leading-relaxed">
        Each run scrapes live sources and scores new opportunities via Claude AI.
      </div>
    </div>
  )
}
