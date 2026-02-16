# カスタムフィールドリファレンス

## 概要

| フィールド | 目的 | AI 開発での用途 |
|-----------|------|---------------|
| Priority | 緊急度・重要度 | タスク優先順位付け |
| Size | 工数見積 | 時間見積の代替 |

## Priority

| 値 | 色 | 用途 |
|---|-----|------|
| Critical | Red | 緊急、即時対応が必要 |
| High | Orange | 重要だが緊急ではない |
| Medium | Yellow | 通常の優先度 |
| Low | Gray | 時間がある時に対応 |

## Size（AI 開発向け）

AI 支援開発では従来の時間見積が適さないため、Size で工数・複雑さを示す。

| 値 | 色 | 目安 |
|---|-----|------|
| XS | Gray | 数分で完了 |
| S | Green | 1セッション |
| M | Yellow | 複数セッション |
| L | Orange | 丸1日以上 |
| XL | Red | 分割が必要 |

**ルール**: XL タスクは必ず小さなタスクに分割すること。

## Type（Issue Types）

Projects V2 のビルトインフィールド。Organization の Issue Types と連動し、カスタム SingleSelect ではない。

| 値 | デフォルト | 備考 |
|---|-----------|------|
| Feature | はい | 新機能・機能強化 |
| Bug | はい | バグ修正 |
| Task | はい | 汎用タスク |
| Chore | カスタム追加 | 設定・ツール・リファクタリング |
| Docs | カスタム追加 | ドキュメント |
| Research | カスタム追加 | 調査・検証 |

Organization Settings → Planning → Issue types で手動管理。
