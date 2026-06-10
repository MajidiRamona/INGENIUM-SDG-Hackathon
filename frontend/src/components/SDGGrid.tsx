'use client'
import { SDG_DATA } from '@/lib/sdg-data'

interface Props {
  distribution: Record<string, number> | undefined
  selectedSDG: number | null
  onSelect: (sdg: number | null) => void
}

export function SDGGrid({ distribution, selectedSDG, onSelect }: Props) {
  const maxCount = distribution
    ? Math.max(...Object.values(distribution), 1)
    : 1

  return (
    <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-[#6b7280] uppercase tracking-widest">
          SDG Coverage
        </span>
        {selectedSDG && (
          <button
            onClick={() => onSelect(null)}
            className="text-[11px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-9 gap-1.5">
        {SDG_DATA.map((sdg) => {
          const count = distribution?.[String(sdg.id)] ?? 0
          const intensity = maxCount > 0 ? count / maxCount : 0
          const isActive = selectedSDG === sdg.id

          return (
            <button
              key={sdg.id}
              onClick={() => onSelect(isActive ? null : sdg.id)}
              title={`SDG ${sdg.id}: ${sdg.name} — ${count} opportunities`}
              className={`relative rounded flex flex-col items-center justify-center py-2 px-1 transition-all duration-100 ${
                isActive ? 'ring-1 ring-white/40' : 'hover:brightness-110'
              }`}
              style={{
                backgroundColor: isActive
                  ? sdg.color
                  : intensity > 0
                  ? `${sdg.color}${Math.round(intensity * 160 + 40).toString(16).padStart(2, '0')}`
                  : '#161b22',
                borderColor: isActive ? sdg.color : 'transparent',
              }}
            >
              <span
                className="text-[11px] font-bold leading-none"
                style={{ color: isActive || intensity > 0.4 ? '#fff' : '#6b7280' }}
              >
                {sdg.id}
              </span>
              <span
                className="text-[9px] mt-0.5 leading-none font-mono"
                style={{ color: isActive || intensity > 0.4 ? 'rgba(255,255,255,0.7)' : '#484f58' }}
              >
                {count}
              </span>
            </button>
          )
        })}

        {/* 18th cell — legend */}
        <div className="rounded flex flex-col items-center justify-center py-2 bg-[#161b22]">
          <span className="text-[9px] text-[#484f58] text-center leading-tight">all<br/>17</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[10px] text-[#484f58]">
        <span>Darker = more opportunities</span>
        <span>Click to filter table</span>
      </div>
    </div>
  )
}
