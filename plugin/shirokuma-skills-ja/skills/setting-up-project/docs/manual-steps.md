# 手動セットアップ手順

GitHub API で自動化できない設定の手動手順ガイド。

## Issue Types 設定

Organization の Issue Types にカスタムタイプを追加する。

**手順:**
1. `https://github.com/organizations/{org}/settings/issue-types` に移動
2. 「Create new type」で以下を追加:

| タイプ | 用途 | 色 | アイコン |
|--------|------|-----|---------|
| Chore | 設定・ツール・リファクタリング | Gray | gear |
| Docs | ドキュメント | Green | page facing up |
| Research | 調査・検証 | Purple | magnifying glass |
| Evolution | ルール・スキル進化シグナル・改善追跡 | Pink | seedling |

## Discussion カテゴリ作成

**手順:**
1. `https://github.com/{owner}/{repo}/discussions/categories` に移動
2. 以下の 4 カテゴリを作成:

| カテゴリ | Emoji 検索 | 色 | Format |
|---------|-----------|-----|--------|
| Handovers | handshake | Purple | Open-ended discussion |
| ADR | triangular ruler | Blue | Open-ended discussion |
| Knowledge | light bulb | Yellow | Open-ended discussion |
| Research | microscope | Green | Open-ended discussion |

**重要**: Format は必ず **Open-ended discussion** を選択。

## ビルトイン自動化の有効化

**手順:**
1. `https://github.com/orgs/{owner}/projects/{number}/workflows` に移動
2. 有効化:

| ワークフロー | ターゲット |
|-------------|-----------|
| Item closed | Done |
| Pull request merged | Done |

3. 無効のまま:

| ワークフロー | 理由 |
|-------------|------|
| Item added to project | ステータスは CLI が管理 |
| Item reopened | ケースバイケースで手動判断 |
| Auto-archive items | Done アイテムの履歴参照が困難 |

## View 名のリネーム

**手順:**
1. Project ページを開く
2. View タブをダブルクリック → リネーム:

| レイアウト | 推奨名 |
|-----------|--------|
| TABLE | Board |
| BOARD | Kanban |
| ROADMAP | Roadmap |
