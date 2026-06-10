from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import Opportunity, AgentRun


class BaseAgent(ABC):
    name: str = "base"
    display_name: str = "Base Agent"

    def __init__(self, db: AsyncSession):
        self.db = db
        self.run: Optional[AgentRun] = None

    async def execute(self) -> AgentRun:
        self.run = AgentRun(agent_name=self.name, started_at=datetime.utcnow(), status="running")
        self.db.add(self.run)
        await self.db.commit()
        await self.db.refresh(self.run)

        try:
            found, scored = await self.run_scrape()
            self.run.status = "completed"
            self.run.opportunities_found = found
            self.run.opportunities_scored = scored
        except Exception as e:
            self.run.status = "failed"
            self.run.error_message = str(e)
        finally:
            self.run.completed_at = datetime.utcnow()
            await self.db.commit()

        return self.run

    @abstractmethod
    async def run_scrape(self) -> tuple[int, int]:
        """Returns (opportunities_found, opportunities_scored)."""
        ...

    async def _exists(self, url: str) -> bool:
        result = await self.db.execute(
            select(Opportunity).where(Opportunity.source_url == url)
        )
        return result.scalar_one_or_none() is not None

    async def _save(self, opp: Opportunity):
        self.db.add(opp)
        await self.db.flush()
