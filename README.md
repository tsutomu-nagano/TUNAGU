![](logo.png)

# TUNAGU

TUNAGU は、e-Stat の統計データ ID (`statinfid`) を起点に、関連する統計データを見つけやすくするための API と Chrome 拡張です。

## 構成

- `api/`: FastAPI で実装した関連データ API
- `extensions/`: e-Stat ページに関連データ UI を追加する Chrome 拡張
- `docker-compose.yml`: API 開発用の Docker Compose 設定

## 主な機能

- 指定した `statinfid` に関連する統計データを relation type ごとに返す
- 複数の `statinfid` について、関連データの有無をまとめて確認する
- e-Stat ページ上に「関連データ」ボタン、ドロワー、relation type 別タブを追加する
- 関連データの詳細表示、形式別ダウンロード、選択データの一括ダウンロード導線を提供する
- e-Stat 問い合わせページへ、参照ページ URL を引き継ぐ

## 開発環境

このプロジェクトはコンテナで動作する前提です。ホスト環境に Python ライブラリを直接インストールせず、依存関係は `api/requirements.txt` と Docker イメージ側で管理します。

API は PostgreSQL 接続を必要とします。リポジトリルートに `.env.local` を作成し、少なくとも `DATABASE_URL` を設定してください。

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
```

起動:

```bash
docker compose up --build
```

確認先:

- ヘルスチェック: `http://localhost:8000/health`
- 関連データ API: `http://localhost:8000/v1/stats/0003448231/relations`
- 関連有無 API: `http://localhost:8000/v1/stats/relations/exists`
- OpenAPI: `http://localhost:8000/docs`

テスト:

```bash
docker compose run --rm api pytest
```

## API

### `GET /v1/stats/{statinfid}/relations`

指定した統計データ ID に関連するデータを返します。

```json
{
  "statinfid": "0003448231",
  "relations": [
    {
      "relation_type": "time",
      "reason": "同じ統計表の時間軸が異なるデータです。",
      "related": [
        {
          "statinfid": "0003448221",
          "survey_date_from": "202001",
          "survey_date_to": "202012",
          "formats": ["EXCEL", "CSV"]
        }
      ]
    }
  ]
}
```

### `GET /v1/stats/{statinfid}/relations/{relation_type}`

relation type を指定して関連データを絞り込みます。

利用できる relation type:

- `time`
- `region`

### `POST /v1/stats/relations/exists`

複数の統計データ ID について、関連データが存在するかをまとめて返します。

リクエスト:

```json
{
  "statinfids": ["0003448231", "0003448221"]
}
```

レスポンス:

```json
{
  "items": [
    {
      "statinfid": "0003448231",
      "has_relations": true
    },
    {
      "statinfid": "0003448221",
      "has_relations": false
    }
  ]
}
```

## データベース

API は PostgreSQL の `file_relations` テーブルを参照します。現在の実装では、同じ `key_hash` を持つ行を関連データとして扱います。

参照している主なカラム:

- `statinfid`
- `key_hash`
- `relation_type`
- `seq_no`
- `survey_date_from`
- `survey_date_to`
- `format`

`format` はカンマ区切りの文字列として読み取り、API レスポンスでは `formats` 配列に変換します。

## Chrome 拡張の読み込み

1. Chrome の `chrome://extensions/` を開く
2. デベロッパーモードを有効にする
3. `extensions` を「パッケージ化されていない拡張機能」として読み込む
4. e-Stat の統計データページを開く

拡張は `https://www.e-stat.go.jp/*` 上で動作します。現在の `extensions/src/content.js` は API 接続先として `https://tunagu.onrender.com` を参照しています。ローカル API で確認する場合は、必要に応じて `API_BASE_URL` を `http://localhost:8000` に変更してください。

## UI 確認

拡張 UI を確認する場合は、API を Docker Compose で起動したうえで、Chrome に `extensions` を読み込んで e-Stat の統計データページを開いてください。スクリーンショットや検証結果を残す場合は、`artifacts/` 配下に保存します。
