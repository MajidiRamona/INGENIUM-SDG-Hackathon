import feedparser
import httpx
from datetime import datetime
from db.models import Opportunity
from scorer.sdg_scorer import score_opportunity
from .base_agent import BaseAgent

FEEDS = [
    ("ImpactAlpha", "https://impactalpha.com/feed/"),
    ("NextBillion", "https://nextbillion.net/feed/"),
    ("Devex", "https://www.devex.com/news/rss.xml"),
    ("SSIR", "https://ssir.org/site/rss_2.0"),
    ("Alliance Magazine", "https://www.alliancemagazine.org/feed/"),
    ("Pioneers Post", "https://www.pioneerspost.com/rss.xml"),
]

MAX_PER_FEED = 8


class RSSAgent(BaseAgent):
    name = "rss_agent"
    display_name = "Impact News RSS"

    async def run_scrape(self) -> tuple[int, int]:
        found = 0
        scored = 0

        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            for source_name, url in FEEDS:
                try:
                    resp = await client.get(url)
                    feed = feedparser.parse(resp.text)
                    entries = feed.entries[:MAX_PER_FEED]

                    for entry in entries:
                        link = getattr(entry, "link", None)
                        if not link:
                            continue
                        if await self._exists(link):
                            continue

                        title = getattr(entry, "title", "")
                        summary = getattr(entry, "summary", "") or getattr(entry, "description", "")
                        published = None
                        if hasattr(entry, "published_parsed") and entry.published_parsed:
                            try:
                                published = datetime(*entry.published_parsed[:6])
                            except Exception:
                                pass

                        opp = Opportunity(
                            title=title[:500],
                            description=summary[:5000],
                            source=source_name,
                            source_url=link,
                            published_at=published,
                            status="sourced",
                        )
                        await self._save(opp)
                        found += 1

                        analysis = await score_opportunity(title, summary, source_name)
                        if analysis:
                            _apply_analysis(opp, analysis)
                            opp.status = "scored"
                            scored += 1

                    await self.db.commit()

                except Exception as e:
                    print(f"RSS agent error for {source_name}: {e}")

        return found, scored


def _apply_analysis(opp: Opportunity, a: dict):
    from datetime import datetime
    opp.sdg_scores = a.get("sdg_scores")
    opp.primary_sdgs = a.get("primary_sdgs")
    opp.non_extractive_score = a.get("non_extractive_score")
    opp.opportunity_type = a.get("opportunity_type")
    opp.sector = a.get("sector")
    opp.stage = a.get("stage")
    opp.country = a.get("country")
    opp.organization = a.get("organization")
    opp.amount_usd = a.get("amount_usd")
    opp.impact_thesis = a.get("impact_thesis")
    opp.risk_flags = a.get("risk_flags", [])
    opp.tags = a.get("tags", [])
    opp.ai_confidence = a.get("confidence")
    opp.scored_at = datetime.utcnow()
