import os
from enum import Enum
from io import StringIO
from functools import lru_cache
import csv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .models import RelationResponse
from .repository import RelationRepository


class RelationType(str, Enum):
    time = "time"
    region = "region"

def create_app() -> FastAPI:
    app = FastAPI(
        title="TUNAGU API",
        summary="統計データ同士をつなぐ関連情報 API",
        version="0.1.0",
    )

    cors_origins = os.getenv("TUNAGU_CORS_ORIGINS", "*")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in cors_origins.split(",")],
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/v1/stats/{statinfid}/relations", response_model=RelationResponse)
    def get_all_relations(statinfid: str) -> RelationResponse:
        return RelationResponse(
            statinfid=statinfid,
            relations=get_repository().find_related(statinfid),
        )

    @app.get("/v1/stats/{statinfid}/relations/{relation_type}", response_model=RelationResponse)
    def get_relations(
        statinfid: str,
        relation_type: RelationType,
    ):
        return RelationResponse(
            statinfid=statinfid,
            relations=get_repository().find_related(statinfid, relation_type.value),
        )

    return app


@lru_cache
def get_repository() -> RelationRepository:
    return RelationRepository()


app = create_app()
