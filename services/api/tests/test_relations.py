from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_relations() -> None:
    client = TestClient(app)

    response = client.get("/v1/stats/0003448231/relations")

    assert response.status_code == 200
    assert response.json()["stats_data_id"] == "0003448231"
    assert {item["relation_type"] for item in response.json()["related"]} >= {"time", "region"}


def test_get_relations_for_statinfid_from_estat_download_link() -> None:
    client = TestClient(app)

    response = client.get("/v1/stats/000040325905/relations")

    assert response.status_code == 200
    assert response.json()["stats_data_id"] == "000040325905"
    assert {item["relation_type"] for item in response.json()["related"]} >= {"time", "category"}


def test_bulk_download() -> None:
    client = TestClient(app)

    response = client.get("/v1/downloads/bulk?statsDataIds=0003448231,0003448221")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "0003448231" in response.text
    assert "0003448221" in response.text
