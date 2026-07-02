# AGENTS.md instructions

このファイルの指示は、このリポジトリ配下で作業するエージェントにのみ適用します。

## 基本方針

- 作成するシステムは必ずコンテナで動作するように作成してください。
- 何かしらライブラリのインストールが必要な場合は Docker を使用してください。
- GitHub への操作は必ず `@github` を使用してください。

## プロジェクト概要

- TUNAGU は、統計データ ID を起点に関連する統計データ ID を返す API と、e-Stat ページ上で関連データを表示するブラウザ拡張で構成されています。
- API は `services/api` の FastAPI アプリです。
- ブラウザ拡張は `extensions/estat` にあります。
- 関連データの初期データは `data/relations.sample.json` です。
- 生成物や検証用スクリーンショットは `artifacts` に置きます。

## 実行と検証

- 開発サーバーはリポジトリルートで `docker compose up --build` を使って起動してください。
- API の確認先は `http://localhost:8000/health`、`http://localhost:8000/v1/stats/0003448231/relations`、`http://localhost:8000/docs` です。
- API テストは `docker compose run --rm api pytest` で実行してください。
- 依存関係を追加・更新する場合は、ホスト環境に直接インストールせず、Dockerfile、`requirements.txt`、`pyproject.toml` などコンテナ側の定義を更新してください。

## 実装時の注意

- API レスポンス形式は `services/api/app/models.py` の Pydantic モデルを基準に維持してください。
- 関連種別は `time`、`region`、`category`、`successor`、`predecessor`、`other` を基本セットとして扱ってください。
- `data/relations.sample.json` を変更した場合は、既存テストで使う `0003448231` のサンプル動作を壊さないでください。
- ブラウザ拡張は `extensions/estat/content.js` から `http://localhost:8000` の API を参照しています。API のポートやパスを変える場合は拡張側も合わせて更新してください。
- Chrome 拡張の表示を変更した場合は、可能な範囲で `scripts/capture-extension-screenshot.mjs` やブラウザ確認を使い、`artifacts` に確認結果を残してください。
- 拡張機能 UI のスクリーンショットは、API を `docker compose up -d --build api` などで起動したうえで、次の Docker コマンドで撮影してください。

```bash
docker run --rm --ipc=host --network host -v /home/e-stat/TUNAGU:/work -w /tmp mcr.microsoft.com/playwright:v1.49.1-noble bash -lc 'npm init -y >/dev/null && npm install playwright@1.49.1 >/dev/null && TUNAGU_WORK_DIR=/work NODE_REQUIRE_BASE=/tmp/package.json node /work/scripts/capture-extension-screenshot.mjs'
```

- スクリーンショット出力先は `artifacts/estat-extension-demo.png` です。
- `scripts/capture-extension-screenshot.mjs` は e-Stat 風の検証ページを使い、headless Chromium で拡張 UI を確認します。headless Chromium では拡張の content script 自動注入が安定しない場合があるため、必要に応じて同じ `content.js` / `content.css` を検証ページへ直接注入して撮影します。
- 既存の未コミット変更がある場合は、作業に必要なファイルだけを変更し、無関係な変更を戻さないでください。
