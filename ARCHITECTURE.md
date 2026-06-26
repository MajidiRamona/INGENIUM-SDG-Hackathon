# ImpactScout — Technical Architecture

## Overview

ImpactScout is a full-stack AI pipeline that autonomously discovers, classifies, and surfaces SDG-aligned investment opportunities for human analyst review. The system is built around three principles:

1. **AI does the volume work** — scraping, classification, scoring, memo drafting
2. **Humans make the decisions** — the pipeline always terminates at a human review stage
3. **Structure over text** — Claude is invoked via tool use, not free-form prompting, so every AI output is validated JSON

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Data Sources                             │
│  ImpactAlpha · NextBillion · Devex · SSIR · World Bank API      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / RSS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Scraper Agents (Python)                       │
│  BaseAgent → RSSAgent, WorldBankAgent                           │
│  Deduplication by source_url before saving                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ SQLAlchemy async write
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SQLite Database                              │
│  opportunities · agent_runs                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────┐    ┌────────────────────────────────────┐
│   Claude Scorer     │    │          FastAPI REST API           │
│  tool use → JSON    │    │  /opportunities  /analytics        │
│  SDG scores 1–17   │    │  /agents  /memo (SSE stream)       │
│  NE dimensions      │    └────────────────┬───────────────────┘
└─────────────────────┘                     │ HTTP + SSE
                                            ▼
                           ┌────────────────────────────────────┐
                           │       Next.js 14 Dashboard          │
                           │  KPI Cards · SDG Grid · Table      │
                           │  Agent Panel · Streaming Memo      │
                           └────────────────────────────────────┘
```

---

## Backend

### Stack

| Component | Choice | Reason |
|---|---|---|
| Framework | FastAPI | Native async, automatic OpenAPI docs |
| ORM | SQLAlchemy 2.0 async | Non-blocking DB operations for agent concurrency |
| Database | SQLite + aiosqlite | Zero-config, self-contained for demos |
| AI SDK | Anthropic Python (async) | Tool use + streaming in one client |
| HTTP client | httpx (async) | Consistent async across scraping and API calls |
| RSS parsing | feedparser | Battle-tested, handles malformed feeds |

### Data Models

**`Opportunity`** — core entity

```
id, title, description, source, source_url, published_at
scraped_at, scored_at

# AI output (JSON columns)
sdg_scores          {"1": 0, ..., "17": 8}   — score per goal
primary_sdgs        [13, 7, 1]               — top 3 goals
non_extractive_score {community_ownership, revenue_circularity,
                      worker_equity, ecological_integrity, overall}

# Categorization
opportunity_type    grant | investment | partnership | procurement
sector, stage, country, organization, amount_usd

# AI reasoning
impact_thesis       2-3 sentence explanation
risk_flags          ["concern 1", ...]
ai_confidence       0.0 – 1.0

# Pipeline
status              sourced → scoring → scored → flagged → reviewed
is_featured         boolean (human curation)
tags                ["solar", "cooperative", ...]
```

**`AgentRun`** — audit trail for every scrape

```
id, agent_name, started_at, completed_at
status              running | completed | failed
opportunities_found, opportunities_scored
error_message
```

### Agent Design

All agents extend `BaseAgent`, which handles the run lifecycle (create AgentRun record, execute, mark complete/failed) and exposes two helpers: `_exists(url)` for deduplication and `_save(opp)` for buffered writes.

```
BaseAgent
├── execute()        lifecycle wrapper — writes AgentRun, catches errors
├── run_scrape()     abstract — returns (found, scored)
├── _exists(url)     checks source_url uniqueness before inserting
└── _save(opp)       adds to session without committing

RSSAgent(BaseAgent)
└── Iterates 6 feeds via feedparser, scores each new entry with Claude

WorldBankAgent(BaseAgent)
└── Queries World Bank search API across 5 SDG theme categories
```

Agents run in FastAPI background tasks (`BackgroundTasks`) so the HTTP response returns immediately while scraping continues. Agent status is polled by the frontend every 8 seconds.

### Claude Integration — Tool Use

The scorer uses Claude's tool use feature rather than asking for JSON in the prompt. This is the critical design decision: tool use forces the model to call a named function with a validated schema, making the output structure guaranteed rather than hoped-for.

```python
SCORING_TOOL = {
    "name": "record_sdg_analysis",
    "input_schema": {
        "type": "object",
        "properties": {
            "sdg_scores":           {"type": "object", ...},
            "primary_sdgs":         {"type": "array", "items": {"type": "integer"}},
            "non_extractive_score": {"type": "object", "properties": {...}},
            "opportunity_type":     {"type": "string", "enum": [...]},
            "impact_thesis":        {"type": "string"},
            "risk_flags":           {"type": "array"},
            "confidence":           {"type": "number", "minimum": 0, "maximum": 1}
        },
        "required": [...]
    }
}

response = await client.messages.create(
    model="claude-sonnet-4-6",
    tool_choice={"type": "tool", "name": "record_sdg_analysis"},
    tools=[SCORING_TOOL],
    messages=[{"role": "user", "content": prompt}]
)

# Response is guaranteed to be a tool_use block with validated JSON
result = response.content[0].input
```

The system prompt encodes the non-extractive finance rubric so the model understands what 9/10 community ownership means versus 3/10.

When no API key is set, a deterministic mock scorer (`_mock_score`) uses the opportunity title's MD5 hash to generate stable, realistic-looking scores — the demo is fully functional without credentials.

### Streaming Investment Memos

The `/api/opportunities/{id}/memo` endpoint uses FastAPI's `StreamingResponse` with `text/event-stream` media type (Server-Sent Events).

```python
async def _stream_real(opp):
    async with client.messages.stream(
        model="claude-sonnet-4-6",
        system=MEMO_SYSTEM,          # encodes analyst persona + rubric
        messages=[{"role": "user", "content": _build_prompt(opp)}]
    ) as stream:
        async for text in stream.text_stream:
            yield f"data: {json.dumps({'text': text})}\n\n"
    yield "data: [DONE]\n\n"

return StreamingResponse(
    _stream_real(opp),
    media_type="text/event-stream",
    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
)
```

The memo prompt injects the deal's SDG scores, non-extractive scores, risk flags, and description, asking the model to produce a structured memo with sections: Executive Summary, SDG Alignment, Non-Extractive Assessment, Risk Analysis, Capital Recommendation, and a final INVEST / MONITOR / PASS verdict.

The mock streamer (`_stream_mock`) generates a pre-formatted memo using the stored scores and yields it word-by-word with a 15ms delay, matching the real streaming UX exactly.

### Human-in-the-Loop Pipeline

The pipeline is a five-stage state machine enforced at the API layer:

```
sourced → scoring → scored → flagged → reviewed
```

- `sourced` — scraped but not yet scored
- `scoring` — Claude scoring in progress (background task)
- `scored` — AI analysis complete; visible in dashboard
- `flagged` — AI or analyst has marked as high signal; surfaced for review
- `reviewed` — human analyst has read and annotated; terminal state

The `reviewed` state is only reachable via a human PATCH request to `/api/opportunities/{id}/status`. No automated process sets it. The investment memo is a tool to assist that review, not replace it.

---

## Frontend

### Stack

| Component | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (utility-first, no component library) |
| Data fetching | SWR (stale-while-revalidate, auto-refresh) |
| Streaming | Native `fetch` + `ReadableStream` |

### Component Tree

```
page.tsx
├── KPICards          — total opps, avg SDG score, avg NE score, flagged count
│                       pipeline bar (5 stages with proportional fill)
├── SDGGrid           — 17 tiles, UN official colors, intensity by count
│                       click-to-filter passes sdg param to opportunities query
├── AgentPanel        — per-agent status dot, last run stats, Run button
│                       polls /api/agents every 8s via SWR refreshInterval
├── OpportunityTable  — filterable by search, type, status, min NE score
│                       SDG number pills (colored by goal), NE mini progress bar
└── OpportunityModal  — opens on row click
    ├── Deal metadata, SDG pills, impact thesis
    ├── NE score bars (community / circularity / worker / ecological)
    ├── Full 17-SDG grid (colored intensity)
    ├── Risk flags
    └── Investment Memo panel
        ├── "Generate investment memo" button
        ├── Streaming text display with live cursor
        └── Copy button on completion
```

### SSE Reading in the Browser

The frontend reads the SSE stream using the `fetch` API directly — no EventSource (which doesn't support POST and has limited error handling).

```typescript
const res = await fetch(`/api/opportunities/${id}/memo`)
const reader = res.body.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''          // hold incomplete line

    for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        const { text } = JSON.parse(data)
        setMemoText(prev => prev + text)
    }
}
```

Buffering the partial line (`buffer = lines.pop()`) handles the case where a TCP packet boundary falls mid-SSE-frame.

### SDG Color System

Each of the 17 SDGs has an official UN color used consistently across the grid, pills, and modal score cells. Opacity encodes signal strength — a tile at 20% opacity means few matches; full opacity means the most-matched goal. Active (selected) tiles show at 100% with a white ring.

### API Proxy

Next.js rewrites (`next.config.mjs`) proxy `/api/*` to `http://localhost:8000/api/*`, so the frontend makes same-origin requests and avoids CORS issues in development. In production this would be replaced by an environment variable pointing at the deployed backend.

---

## Key Design Decisions

**Tool use over JSON prompting** — Asking a model to "return JSON" produces schema drift over time. Tool use with `tool_choice: {type: "tool", name: "..."}` forces a specific call and validates the schema at the API layer. Zero post-processing regex.

**Mock parity** — Both the scorer and the memo streamer have mock paths that produce output structurally identical to the real AI output. This means the demo, tests, and CI work without an API key, and the mock streamer animates at the same pace as the real one.

**SQLite over Postgres** — A single-file database that travels with the repo is the right choice for a demo. The async SQLAlchemy setup (`aiosqlite`) means swapping to Postgres in production is a one-line change to `DATABASE_URL`.

**SWR polling over WebSockets** — Agent status updates every 8 seconds via SWR `refreshInterval`. WebSockets would add infrastructure complexity (connection management, reconnection logic) for a marginal UX improvement. The polling interval is fast enough to feel live during a demo.

**No component library** — Tailwind utilities directly on components keeps the bundle small and makes every design decision explicit. A component library would constrain the dark-theme density required for a data dashboard.

---

## File Reference

```
backend/
  main.py                   FastAPI app, lifespan (init DB + auto-seed)
  seed.py                   20 realistic seed opportunities for demo
  db/
    models.py               SQLAlchemy ORM: Opportunity, AgentRun
    database.py             Async engine, session factory, init_db()
  agents/
    base_agent.py           Abstract base: lifecycle, dedup, save helpers
    rss_agent.py            Scrapes 6 RSS feeds, scores each new entry
    worldbank_agent.py      Queries World Bank Projects API (5 themes)
  scorer/
    sdg_scorer.py           Claude tool-use scorer + mock fallback
  api/
    opportunities.py        CRUD + rescore endpoint
    analytics.py            Dashboard stats, SDG distribution, sectors
    agents.py               Agent registry, trigger, run history
    memo.py                 SSE streaming investment memo endpoint

frontend/src/
  app/
    page.tsx                Main dashboard, filter state, SWR queries
    layout.tsx              HTML shell, global font
    globals.css             Base reset, scrollbar styles
  components/
    KPICards.tsx            4 stat cards + pipeline progress bars
    SDGGrid.tsx             17-tile interactive heatmap
    AgentPanel.tsx          Agent status + run trigger
    OpportunityTable.tsx    Filterable data table
    OpportunityModal.tsx    Detail view + streaming memo
  lib/
    api.ts                  Typed fetch wrappers for all endpoints
    sdg-data.ts             SDG metadata (names, UN colors), status config
  types/
    index.ts                Shared TypeScript interfaces
```
