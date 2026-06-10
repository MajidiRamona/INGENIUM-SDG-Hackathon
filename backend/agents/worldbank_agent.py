import httpx
from datetime import datetime
from db.models import Opportunity
from scorer.sdg_scorer import score_opportunity
from .base_agent import BaseAgent
from .rss_agent import _apply_analysis

WB_API = "https://search.worldbank.org/api/v2/projects"
THEMES = ["Environment", "Social Development", "Health", "Education", "Energy"]
MAX_PER_THEME = 6


class WorldBankAgent(BaseAgent):
    name = "worldbank_agent"
    display_name = "World Bank Projects"

    async def run_scrape(self) -> tuple[int, int]:
        found = 0
        scored = 0

        async with httpx.AsyncClient(timeout=20.0) as client:
            for theme in THEMES:
                try:
                    resp = await client.get(WB_API, params={
                        "format": "json",
                        "rows": MAX_PER_THEME,
                        "fl": "id,project_name,boardapprovaldate,totalamt,project_development_objective,countryname,url,status",
                        "theme_exact": theme,
                        "status": "Active",
                    })
                    data = resp.json()
                    projects = data.get("projects", {})

                    # World Bank API returns projects as dict keyed by project id
                    if isinstance(projects, dict):
                        items = list(projects.values())
                    else:
                        items = projects or []

                    for proj in items[:MAX_PER_THEME]:
                        if not isinstance(proj, dict):
                            continue
                        proj_id = proj.get("id", "")
                        url = proj.get("url") or f"https://projects.worldbank.org/en/projects-operations/project-detail/{proj_id}"

                        if await self._exists(url):
                            continue

                        title = proj.get("project_name", "Unnamed Project")
                        pdo = proj.get("project_development_objective", "")
                        country = proj.get("countryname", "")
                        amount = proj.get("totalamt")
                        try:
                            amount_usd = float(amount) if amount else None
                        except Exception:
                            amount_usd = None

                        board_date = None
                        if proj.get("boardapprovaldate"):
                            try:
                                board_date = datetime.fromisoformat(proj["boardapprovaldate"][:10])
                            except Exception:
                                pass

                        description = f"World Bank project in {country}. {pdo}"

                        opp = Opportunity(
                            title=str(title)[:500],
                            description=description[:5000],
                            source="World Bank",
                            source_url=url,
                            published_at=board_date,
                            organization="World Bank",
                            country=country[:200] if country else None,
                            amount_usd=amount_usd,
                            status="sourced",
                        )
                        await self._save(opp)
                        found += 1

                        analysis = await score_opportunity(title, description, "World Bank")
                        if analysis:
                            _apply_analysis(opp, analysis)
                            opp.country = opp.country or country
                            opp.organization = "World Bank"
                            opp.amount_usd = opp.amount_usd or amount_usd
                            opp.status = "scored"
                            scored += 1

                    await self.db.commit()

                except Exception as e:
                    print(f"World Bank agent error for theme '{theme}': {e}")

        return found, scored
