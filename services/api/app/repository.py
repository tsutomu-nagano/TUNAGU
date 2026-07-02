import os

import psycopg
from psycopg.rows import dict_row

from .models import RelatedStat


class RelationRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def find_related(self, stats_data_id: str) -> list[RelatedStat]:
        with psycopg.connect(self.database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      stats_data_id,
                      title,
                      relation_type,
                      reason,
                      formats,
                      updated_at::text AS updated_at
                    FROM relations
                    WHERE source_stats_data_id = %s
                    ORDER BY sort_order, stats_data_id
                    """,
                    (stats_data_id,),
                )
                return [RelatedStat.model_validate(row) for row in cursor.fetchall()]


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required to read relations from Postgres")
    return database_url
