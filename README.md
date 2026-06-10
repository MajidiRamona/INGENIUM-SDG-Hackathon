# ImpactScout

**AI-assisted SDG deal flow intelligence — built around human judgment.**

ImpactScout autonomously scouts and scores investment opportunities aligned with the 17 UN Sustainable Development Goals, then surfaces the highest-signal ones for human review. AI handles the volume problem; analysts handle the decision.

---

## How It Works

The pipeline is designed so AI does the legwork and humans make the call:

```
Scrape → Score (Claude AI) → Flag → Human Review → Decision
```

1. **Agents** continuously scrape impact media and multilateral databases
2. **Claude AI** scores each deal against all 17 SDGs and a non-extractive finance rubric
3. **Flagged deals** surface to analysts with AI-generated investment memos
4. **Human analysts** review, annotate, and make final investment decisions

The AI never makes the final call. It eliminates noise so analysts can focus on the deals that matter.

---

## Architecture

```
ImpactScout
├── backend/          FastAPI + SQLAlchemy (Python 3.11+)
│   ├── agents/       Autonomous scraper agents
│   │   ├── rss_agent.py        ImpactAlpha, NextBillion, Devex, SSIR, Alliance Magazine
│   │   └── worldbank_agent.py  World Bank Projects API (free, no key)
│   ├── scorer/
│   │   └── sdg_scorer.py       Claude tool-use scoring (structured output)
│   └── api/          REST endpoints for opportunities, analytics, agents, memos
└── frontend/         Next.js 14 + Tailwind CSS
    ├── SDG Coverage Grid    (17 UN goals, official colors, filterable)
    ├── Deal Flow Pipeline   (sourced → scoring → scored → flagged → reviewed)
    ├── Agent Status Panel   (live run status, one-click trigger)
    └── Opportunity Modal    (AI analysis, NE scores, streaming investment memo)
```

## What "Non-Extractive" Means

Standard ESG funds often score high while extracting value from communities (resource extraction with "green" certification, microfinance with 30% interest, tech platforms surveilling users). ImpactScout scores each opportunity on four non-extractive dimensions:

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

API at `http://localhost:8000` · Swagger docs at `http://localhost:8000/docs`

> **Note:** Works without an Anthropic key — mock scoring and streaming kick in automatically.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard at `http://localhost:3000`.

---

## Key Features

- **Autonomous scraper agents** — RSS (6 impact media outlets) + World Bank Projects API, triggered on-demand
- **Claude AI scoring via tool use** — structured SDG scores (0–10 per goal) + non-extractive dimensions, not keyword matching
- **Streaming investment memos** — one-click AI memo generation streamed live into the UI; analyst reviews and decides
- **Human review pipeline** — deals move from `sourced` → `scored` → `flagged` → `reviewed`; the reviewed stage is always human
- **SDG Coverage Grid** — interactive 17-goal heatmap, click to filter
- **No external DB** — SQLite, runs fully locally for demos

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/opportunities` | List with filters: `sdg`, `status`, `opportunity_type`, `sector`, `min_ne_score`, `search` |
| GET | `/api/opportunities/{id}` | Single opportunity with full AI analysis |
| GET | `/api/opportunities/{id}/memo` | Stream a live investment memo (SSE) |
| POST | `/api/opportunities/{id}/rescore` | Re-run Claude scoring in background |
| PATCH | `/api/opportunities/{id}/status` | Human updates pipeline stage |
| GET | `/api/analytics/dashboard` | KPIs, pipeline counts, averages |
| GET | `/api/agents` | List agents + last run status |
| POST | `/api/agents/{name}/run` | Trigger agent run |

---

## Extending

**Add a new data source:** implement `BaseAgent` in `backend/agents/`, register it in `api/agents.py`.

**Customise scoring:** edit the system prompt and tool schema in `scorer/sdg_scorer.py`.

**Add authentication / multi-user:** swap SQLite for Postgres + add FastAPI Users.
