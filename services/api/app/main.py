import os
from io import StringIO
from functools import lru_cache
import csv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .models import RelationResponse
from .repository import RelationRepository, get_database_url


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

    @app.get("/v1/stats/{stats_data_id}/relations", response_model=RelationResponse)
    def get_relations(stats_data_id: str) -> RelationResponse:
        return RelationResponse(
            stats_data_id=stats_data_id,
            related=get_repository().find_related(stats_data_id),
        )

    @app.get("/v1/downloads/bulk")
    def bulk_download(statsDataIds: str) -> Response:
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["stats_data_id"])
        for stats_data_id in [item.strip() for item in statsDataIds.split(",") if item.strip()]:
            writer.writerow([stats_data_id])

        return Response(
            content=output.getvalue(),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="tunagu-stats-data-ids.csv"'},
        )

    return app


@lru_cache
def get_repository() -> RelationRepository:
    return RelationRepository(get_database_url())


app = create_app()
