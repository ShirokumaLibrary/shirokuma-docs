# セットアップチェックリスト

## 必須項目

| # | 項目 | 検証方法 | 自動化 |
|---|------|---------|--------|
| 1 | Git リポジトリ初期化 | `git remote -v` | 自動 |
| 2 | GitHub リモートリポジトリ | `gh repo view` | 自動 |
| 3 | `shirokuma-docs.config.yaml` | ファイル存在確認 | 自動 |
| 4 | プラグインインストール | `claude plugin list` | 自動 |
| 5 | `.claude/rules/shirokuma/` デプロイ | ディレクトリ存在確認 | 自動 |
| 6 | GitHub Projects V2 | `shirokuma-docs projects list` | 自動 |
| 7 | Status/Priority/Size フィールド | `session check --setup` | 自動 |
| 8 | Discussion カテゴリ | `session check --setup` | 手動 |
| 9 | Issue Types | GitHub UI で確認 | 手動 |
| 10 | ビルトイン自動化 | `projects workflows` | 手動 |

## 検証コマンド

```bash
# 一括検証
shirokuma-docs session check --setup
```

## よくある問題

| 問題 | 解決策 |
|------|--------|
| `missing scopes [project]` | `gh auth refresh -s project,read:project` |
| config ファイルが見つからない | `shirokuma-docs init --project .` |
| プラグインが古い | `shirokuma-docs update` |
| Discussion カテゴリがない | GitHub UI で手動作成 |
