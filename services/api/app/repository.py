import json
from pathlib import Path

from .models import RelatedStat, RelationRecord


class RelationRepository:
    def __init__(self, data_path: Path) -> None:
        self.data_path = data_path
        self._records = self._load_records(data_path)

    def find_related(self, stats_data_id: str) -> list[RelatedStat]:
        return [
            RelatedStat.model_validate(record.model_dump(exclude={"source_stats_data_id"}))
            for record in self._records
            if record.source_stats_data_id == stats_data_id
        ]

    @staticmethod
    def _load_records(data_path: Path) -> list[RelationRecord]:
        if not data_path.exists():
            return []

        with data_path.open(encoding="utf-8") as file:
            payload = json.load(file)

        return [RelationRecord.model_validate(item) for item in payload.get("relations", [])]

