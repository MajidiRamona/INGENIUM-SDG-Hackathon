import type { Opportunity, AgentInfo, DashboardStats } from '@/types'

const BASE = '/api'

async function get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
    })
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const api = {
  opportunities: {
    list: (params?: Record<string, string | number | boolean>) =>
      get<Opportunity[]>('/opportunities', params),
    get: (id: number) => get<Opportunity>(`/opportunities/${id}`),
    updateStatus: (id: number, status: string) =>
      patch(`/opportunities/${id}/status`, { status }),
    toggleFeature: (id: number) => patch(`/opportunities/${id}/feature`),
    rescore: (id: number) => post(`/opportunities/${id}/rescore`),
  },
  analytics: {
    dashboard: () => get<DashboardStats>('/analytics/dashboard'),
    sdgDistribution: () => get<Record<string, number>>('/analytics/sdg-distribution'),
    sectors: () => get<Array<{ sector: string; count: number }>>('/analytics/sectors'),
    types: () => get<Array<{ type: string; count: number }>>('/analytics/types'),
  },
  agents: {
    list: () => get<AgentInfo[]>('/agents'),
    run: (name: string) => post(`/agents/${name}/run`),
    runs: (name: string) => get<AgentInfo[]>(`/agents/${name}/runs`),
  },
}
