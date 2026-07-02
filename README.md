
![](logo.png)

## 概要
- データとデータをつなぐAPIとブラウザ拡張機能の提供

## 機能

- 統計データ ID を起点に、関連する統計データ ID の一覧を返す API
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

初期状態では `data/relations.sample.json` を読み込みます。将来的に DB や e-Stat API から生成した関連データへ差し替える場合も、API のレスポンス形式は維持できます。
