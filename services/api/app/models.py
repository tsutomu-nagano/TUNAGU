from typing import Literal

from pydantic import BaseModel, Field


RelationType = Literal["time", "region", "category", "successor", "predecessor", "other"]


class RelatedStat(BaseModel):
    stats_data_id: str = Field(..., examples=["0003448221"])
    title: str
    relation_type: RelationType
    reason: str
    formats: list[str] = Field(default_factory=list, examples=[["EXCEL", "CSV", "DB"]])
    updated_at: str | None = None


class RelationResponse(BaseModel):
    stats_data_id: str
    related: list[RelatedStat]


class RelationRecord(RelatedStat):
    source_stats_data_id: str
