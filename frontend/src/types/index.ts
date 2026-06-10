export interface NonExtractiveScore {
  community_ownership: number
  revenue_circularity: number
  worker_equity: number
  ecological_integrity: number
  overall: number
}

export interface Opportunity {
  id: number
  title: string
  description: string | null
  source: string | null
  source_url: string | null
  published_at: string | null
  scraped_at: string | null
  scored_at: string | null
  sdg_scores: Record<string, number> | null
  primary_sdgs: number[] | null
  non_extractive_score: NonExtractiveScore | null
  sdg_alignment_score: number | null
  opportunity_type: string | null
  sector: string | null
  stage: string | null
  country: string | null
  organization: string | null
  amount_usd: number | null
  impact_thesis: string | null
  risk_flags: string[] | null
  ai_confidence: number | null
  status: 'sourced' | 'scoring' | 'scored' | 'flagged' | 'reviewed'
  is_featured: boolean
  tags: string[] | null
}

export interface AgentRun {
  id: number
  agent_name: string
  started_at: string | null
  completed_at: string | null
  status: 'running' | 'completed' | 'failed'
  opportunities_found: number
  opportunities_scored: number
  error_message: string | null
}

export interface AgentInfo {
  name: string
  display_name: string
  description: string
  sources: string[]
  last_run: AgentRun | null
}

export interface DashboardStats {
  total_opportunities: number
  scored_opportunities: number
  featured_opportunities: number
  avg_ne_score: number
  avg_sdg_alignment: number
  pipeline: Record<string, number>
  active_agents: number
}
