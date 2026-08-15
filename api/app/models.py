from typing import Literal

from pydantic import BaseModel, Field


RelationType = Literal["time", "region", "category", "successor", "predecessor", "other"]


class RelatedStat(BaseModel):
    statinfid: str
    survey_date_from: str | None = None
    survey_date_to: str | None = None
    formats: list[str] = Field(default_factory=list)


class RelationGroup(BaseModel):
    relation_type: RelationType
    reason: str
    related: list[RelatedStat]


class RelationResponse(BaseModel):
    statinfid: str
    relations: list[RelationGroup]


class RelationExistsRequest(BaseModel):
    statinfids: list[str]


class RelationExistsItem(BaseModel):
    statinfid: str
    has_relations: bool


class RelationExistsResponse(BaseModel):
    items: list[RelationExistsItem]
