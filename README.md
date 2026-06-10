# ImpactScout 🌍

**AI-powered SDG deal flow intelligence for non-extractive impact finance.**

ImpactScout autonomously scouts, scores, and surfaces investment opportunities aligned with the 17 UN Sustainable Development Goals — with a unique **non-extractive finance lens** that prioritises community ownership, worker equity, and revenue circularity over traditional ESG proxies.

---

## Architecture

```
ImpactScout
├── backend/          FastAPI + SQLAlchemy (Python 3.11+)
│   ├── agents/       Autonomous scraper agents
│   │   ├── rss_agent.py        ImpactAlpha, NextBillion, Devex, SSIR, Alliance Magazine
│   │   └── worldbank_agent.py  World Bank Projects API (free, no key)
│   ├── scorer/
│   │   └── sdg_scorer.py       Claude claude-sonnet-4-6 tool-use scoring
│   └── api/          REST endpoints for opportunities, analytics, agents
└── frontend/         Next.js 14 + Tailwind CSS
    ├── SDG Coverage Grid    (17 UN goals, official colors, filterable)
    ├── Deal Flow Pipeline   (sourced → scoring → scored → flagged → reviewed)
    ├── Agent Status Panel   (live run status, one-click trigger)
    └── Opportunity Modal    (full AI analysis, NE score breakdown, SDG grid)
```

## What "Non-Extractive" Means

Standard ESG funds often score high while extracting value from communities (resource extraction with "green" certification, microfinance with 30% interest, tech platforms surveilling users). ImpactScout scores each opportunity on five non-extractive dimensions:

| Dimension | What it measures |
|---|---|
| Community Ownership | Does the community hold equity or governance rights? |
| Revenue Circularity | Does value stay in the local economy? |
| Worker Equity | Profit sharing, worker ownership, living wages? |
| Ecological Integrity | Net-positive / regenerative ecological impact? |
| **Overall** | Weighted composite (0–10) |

---

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Copy and fill in your Anthropic API key
cp .env.example .env

# Start the API (seeds demo data automatically on first run)
uvicorn main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`.  
Swagger docs: `http://localhost:8000/docs`

> **Note:** The API works without an Anthropic key — mock scoring kicks in automatically for demo purposes.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard at `http://localhost:3000`.

---

## Key Features

- **Multi-source autonomous agents** — RSS (6 impact media outlets) + World Bank Projects API, triggered on-demand or by schedule
- **Claude AI scoring via tool use** — structured SDG scores (0-10 per goal) + non-extractive dimensions, not just keyword matching
- **Pipeline metaphor** — deals flow from `sourced` → `scoring` → `scored` → `flagged` → `reviewed`
- **SDG Coverage Grid** — interactive 17-goal heatmap using official UN colors, click to filter
- **Non-Extractive Score bars** — per-dimension breakdown visible in opportunity modal
- **No external DB** — SQLite, runs fully locally for demos

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/opportunities` | List with filters: `sdg`, `status`, `opportunity_type`, `sector`, `min_ne_score`, `search` |
| GET | `/api/opportunities/{id}` | Single opportunity with full AI analysis |
| POST | `/api/opportunities/{id}/rescore` | Re-run Claude scoring in background |
| GET | `/api/analytics/dashboard` | KPIs, pipeline counts, averages |
| GET | `/api/analytics/sdg-distribution` | Opportunity count per SDG |
| GET | `/api/agents` | List agents + last run status |
| POST | `/api/agents/{name}/run` | Trigger agent in background |

---

## Extending

**Add a new data source:** implement `BaseAgent` in `backend/agents/`, register it in `api/agents.py`.

**Customise scoring:** edit the system prompt and tool schema in `scorer/sdg_scorer.py`.

**Add authentication / multi-user:** swap SQLite for Postgres + add FastAPI Users.

---

*Built for AI-first, non-extractive impact finance infrastructure.*
