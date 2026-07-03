CREATE TABLE IF NOT EXISTS relations (
  id bigserial PRIMARY KEY,
  source_stats_data_id text NOT NULL,
  stats_data_id text NOT NULL,
  title text NOT NULL,
  relation_type text NOT NULL CHECK (
    relation_type IN ('time', 'region', 'category', 'successor', 'predecessor', 'other')
  ),
  reason text NOT NULL,
  formats text[] NOT NULL DEFAULT '{}',
  updated_at date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_stats_data_id, stats_data_id, relation_type)
);

CREATE INDEX IF NOT EXISTS relations_source_stats_data_id_idx
  ON relations (source_stats_data_id);

INSERT INTO relations (
  source_stats_data_id,
  stats_data_id,
  title,
  relation_type,
  reason,
  formats,
  updated_at,
  sort_order
) VALUES
  (
    '0003448231',
    '0003448221',
    '人口推計 年次 2020年',
    'time',
    '同じ統計表の時間軸が異なるデータです。',
    ARRAY['EXCEL', 'CSV'],
    '2026-07-01',
    10
  ),
  (
    '0003448231',
    '0003448242',
    '人口推計 都道府県別 2021年',
    'region',
    '地域区分が異なる関連データです。',
    ARRAY['CSV', 'DB'],
    '2026-07-01',
    20
  ),
  (
    '0003448231',
    '0003448250',
    '人口推計 年齢階級別 2021年',
    'category',
    '分類軸が異なる関連データです。',
    ARRAY['EXCEL', 'CSV', 'DB'],
    '2026-07-01',
    30
  ),
  (
    '000040325905',
    '000040325906',
    '学校基本調査 関連統計データ サンプル1',
    'time',
    '指定された e-Stat ページの statInfId から取得できる確認用データです。',
    ARRAY['EXCEL'],
    '2026-07-01',
    10
  ),
  (
    '000040325905',
    '000040325907',
    '学校基本調査 関連統計データ サンプル2',
    'category',
    '同じ統計ページで分類軸が近い関連データの確認用サンプルです。',
    ARRAY['CSV'],
    '2026-07-01',
    20
  )
ON CONFLICT (source_stats_data_id, stats_data_id, relation_type) DO UPDATE SET
  title = EXCLUDED.title,
  reason = EXCLUDED.reason,
  formats = EXCLUDED.formats,
  updated_at = EXCLUDED.updated_at,
  sort_order = EXCLUDED.sort_order;
