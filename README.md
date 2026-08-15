
![](logo.png)

## 概要
- データとデータをつなぐAPIとブラウザ拡張機能の提供

## 機能

- PostgreSQL に保存した関連情報から、統計データ ID を起点に関連する統計データ ID の一覧を返す API
- 関連種別は `time`、`region`、`category`、`successor`、`predecessor`、`other` を想定
- e-Stat ページに「関連データ」ボタンを追加するブラウザ拡張
- API から取得した関連データをドロワー表示し、まとめてダウンロード導線を表示

## 開発環境

このプロジェクトはコンテナで動作する前提です。

```bash
docker compose up --build
```

API:

- ヘルスチェック: `http://localhost:8000/health`
- 関連データ API: `http://localhost:8000/v1/stats/0003448231/relations`
- OpenAPI: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432` / database `tunagu` / user `tunagu`

テスト:

```bash
docker compose run --rm api pytest
```

## ブラウザ拡張の読み込み

1. Chrome の `chrome://extensions/` を開く
2. デベロッパーモードを有効にする
3. `extensions/estat` を「パッケージ化されていない拡張機能」として読み込む
4. e-Stat の統計データページを開く

## データ

初期状態では `services/api/db/init.sql` が PostgreSQL にサンプルデータを投入します。本番では Render Postgres の `DATABASE_URL` を API に設定してください。e-Stat API から生成した関連データへ差し替える場合も、API のレスポンス形式は維持できます。

投入元データは、統計データの属性マスタと関連定義を分けて管理します。

`data/stats_data.sample.csv`:

```csv
stats_data_id,title,survey_year_from,survey_year_to,period,region_level,category_axis,formats
0003448231,人口推計 年次 2021年,2021,2021,年次,全国,総数,DB
0003448221,人口推計 年次 2020年,2020,2020,年次,全国,総数,EXCEL;CSV
```

`data/relations.sample.csv`:

```csv
source_stats_data_id,target_stats_data_id,relation_type
0003448231,0003448221,time
0003448231,0003448242,region
```

- `stats_data.csv` は `stats_data_id`、`title`、調査年範囲、周期、地域粒度、分類軸、提供形式を持つ統計データマスタです。
- `relations.csv` は `source_stats_data_id` から `target_stats_data_id` への関連だけを持ちます。
- `relation_type` は `time`、`region`、`category`、`successor`、`predecessor`、`other` のいずれかです。
- `reason` と表示順はアプリ/API側で `relation_type` から導出します。
- `formats` は `EXCEL;CSV;DB` のようなセミコロン区切りで準備し、DB投入時は `text[]` として保存します。
