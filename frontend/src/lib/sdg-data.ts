export interface SDGMeta {
  id: number
  name: string
  short: string
  color: string
}

export const SDG_DATA: SDGMeta[] = [
  { id: 1,  name: 'No Poverty',                short: 'No Poverty',      color: '#E5243B' },
  { id: 2,  name: 'Zero Hunger',               short: 'Zero Hunger',     color: '#DDA63A' },
  { id: 3,  name: 'Good Health & Well-Being',  short: 'Good Health',     color: '#4C9F38' },
  { id: 4,  name: 'Quality Education',         short: 'Education',       color: '#C5192D' },
  { id: 5,  name: 'Gender Equality',           short: 'Gender Eq.',      color: '#FF3A21' },
  { id: 6,  name: 'Clean Water & Sanitation',  short: 'Clean Water',     color: '#26BDE2' },
  { id: 7,  name: 'Affordable & Clean Energy', short: 'Clean Energy',    color: '#FCC30B' },
  { id: 8,  name: 'Decent Work & Growth',      short: 'Decent Work',     color: '#A21942' },
  { id: 9,  name: 'Industry & Innovation',     short: 'Innovation',      color: '#FD6925' },
  { id: 10, name: 'Reduced Inequalities',      short: 'Inequalities',    color: '#DD1367' },
  { id: 11, name: 'Sustainable Cities',        short: 'Sust. Cities',    color: '#FD9D24' },
  { id: 12, name: 'Responsible Consumption',   short: 'Consumption',     color: '#BF8B2E' },
  { id: 13, name: 'Climate Action',            short: 'Climate',         color: '#3F7E44' },
  { id: 14, name: 'Life Below Water',          short: 'Oceans',          color: '#0A97D9' },
  { id: 15, name: 'Life on Land',              short: 'Land',            color: '#56C02B' },
  { id: 16, name: 'Peace & Justice',           short: 'Peace',           color: '#00689D' },
  { id: 17, name: 'Partnerships for Goals',    short: 'Partnerships',    color: '#19486A' },
]

export function getSDG(id: number): SDGMeta {
  return SDG_DATA.find(s => s.id === id) ?? SDG_DATA[0]
}

export const SECTOR_COLORS: Record<string, string> = {
  climate:        '#3F7E44',
  health:         '#4C9F38',
  education:      '#C5192D',
  agriculture:    '#DDA63A',
  energy:         '#FCC30B',
  finance:        '#DD1367',
  technology:     '#FD6925',
  infrastructure: '#0A97D9',
  other:          '#6b7280',
}

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  sourced:  { label: 'Sourced',  color: '#6b7280' },
  scoring:  { label: 'Scoring',  color: '#d97706' },
  scored:   { label: 'Scored',   color: '#3b82f6' },
  flagged:  { label: 'Flagged',  color: '#10b981' },
  reviewed: { label: 'Reviewed', color: '#8b5cf6' },
}
