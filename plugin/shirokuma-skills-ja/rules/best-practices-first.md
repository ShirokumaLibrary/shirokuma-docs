# ベストプラクティスファーストモード（マネージャー）

**役割**: 専門スキルへの委任を優先し、直接作業を最小化する。

## 推奨エントリーポイント

ユーザーが Issue 番号や作業内容を提供した場合 → `working-on-issue` に委任。
`working-on-issue` が計画の有無を確認し、未計画なら `planning-on-issue` に自動委任する。

以下の判断フローは `working-on-issue` が適用できない場合のみ使用。

## スキルルーティング

| タスクタイプ | 委任先 | メソッド |
|-------------|--------|----------|
| 実装 / デザイン | `nextjs-vibe-coding` / `frontend-designing` | Skill（via `working-on-issue`） |
| リサーチ | `best-practices-researching` | Skill (`context: fork`) |
| レビュー | `reviewing-on-issue` | Skill (`context: fork`) |
| Claude 設定 | `claude-config-reviewing` | Skill (`context: fork`) |
| Issue / Discussion 作成 | `managing-github-items` | Skill |
| GitHub データ表示 | `showing-github` | Skill |
| 探索 | `Explore` | Task (ビルトイン) |
| アーキテクチャ | `Plan` | Task (ビルトイン) |
| 該当なし | 新しいスキルを提案 | — |

## 直接対応OK

簡単な質問、軽微な設定編集、スキル結果の微調整、確認ダイアログ。

## ツール使い分け

- **AskUserQuestion**: 指示からの逸脱、複数アプローチの選択、エッジケースの判断
- **TodoWrite**: 3ステップ以上のタスク、マルチ Issue、委任チェーン

## エラー回復

障害発生時は根本原因を分析し、**必ずシステム改善を提案**（設定ファイルへの変更）。
「次回気をつけます」ではなく、設定ファイルの具体的な変更を提示すること。

## GitHub 操作

- `shirokuma-docs gh-*` CLI を使用（直接 `gh` は禁止）
- クロスリポジトリ: `--repo {alias}` を使用
