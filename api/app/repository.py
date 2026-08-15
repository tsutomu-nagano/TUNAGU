import os

import psycopg
from psycopg.rows import dict_row

from .models import RelatedStat, RelationGroup
from collections import defaultdict

DEFAULT_REASONS = {
    "time": "同じ統計表の時間軸が異なるデータです。",
    "region": "地域区分が異なる関連データです。",
    "category": "分類軸が異なる関連データです。",
    "successor": "このデータの後継にあたる統計データです。",
    "predecessor": "このデータの前身にあたる統計データです。",
    "other": "関連する統計データです。",
}


class RelationRepository:

    def find_related(
        self,
        statinfid: str,
        relation_type: str | None = None
    ) -> list[RelationGroup]:   
        with psycopg.connect(row_factory=dict_row) as connection:
            with connection.cursor() as cursor:

                if relation_type is None:
                    cursor.execute(
                        """
                        SELECT target.*
                        FROM file_relations AS source
                        JOIN file_relations AS target
                          ON target.key_hash = source.key_hash
                        WHERE source.statinfid = %s
                        ORDER BY target.relation_type, target.seq_no
                        """,
                        (statinfid,),
                    )
                else:
                    cursor.execute(
                        """
                        SELECT target.*
                        FROM file_relations AS source
                        JOIN file_relations AS target
                          ON target.key_hash = source.key_hash
                        WHERE source.statinfid = %s
                          AND source.relation_type = %s
                        ORDER BY target.seq_no
                        """,
                        (statinfid, relation_type),
                    )

                grouped = defaultdict(list)

                for row in cursor.fetchall():
                    relation_type = row["relation_type"]

                    grouped[relation_type].append(
                        RelatedStat(
                            statinfid=row["statinfid"],
                            survey_date_from=row["survey_date_from"],
                            survey_date_to=row["survey_date_to"],
                            formats=[
                                value.strip()
                                for value in (row["format"] or "").split(",")
                                if value.strip()
                            ],
                        )
                    )

                return [
                    RelationGroup(
                        relation_type=relation_type,
                        reason=DEFAULT_REASONS.get(
                                relation_type,
                                DEFAULT_REASONS["other"],
                        ),
                        related=related,
                    )
                    for relation_type, related in grouped.items()
                ]



