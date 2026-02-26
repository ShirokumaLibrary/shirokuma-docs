# セッション管理コマンド

AI（Claude Code）との作業セッションを管理するコマンドです。セッションの開始時にコンテキストを一括取得し、終了時に引き継ぎ情報を保存します。

## 概要

セッション管理の流れ:

```
session start  →  作業  →  session end
  (コンテキスト取得)        (引き継ぎ保存 + ステータス更新)
```

- **start**: 前回の引き継ぎ、アクティブな Issue、Git 状態をまとめて取得
- **end**: 作業内容を Discussion に保存し、Issue ステータスを更新
- **check**: Issue の状態と Project Status の整合性をチェック

### 日常ワークフローとの連携

スキルを使った典型的な1日の流れ:

```
/starting-session           # セッション開始（前回引き継ぎ + Issue 一覧を表示）
  └→ /working-on-issue #42  # Issue を選択して作業開始（自動ルーティング）
       ├→ /planning-on-issue # 計画策定（未計画 Issue の場合）
       ├→ 実装（coding-nextjs / designing-shadcn-ui）
       ├→ /committing-on-issue  # コミット・プッシュ
       └→ /creating-pr-on-issue # PR 作成 + セルフレビュー

/ending-session             # セッション終了（引き継ぎ保存 + ステータス更新）
```

新規 Issue を作成してそのまま作業を開始する場合:

```
/creating-item 機能の説明  # Issue 作成 → /working-on-issue に自動チェーン
```

---

## session start - セッション開始

作業を始める前に実行し、プロジェクトの現在の状態を把握します。

```bash
shirokuma-docs session start
```

### 返される情報

| フィールド | 内容 |
|-----------|------|
| `repository` | 現在のリポジトリ名 |
| `git` | 現在のブランチ、未コミットの変更 |
| `lastHandover` | 前回のセッション引き継ぎ（Discussions の Handovers カテゴリ） |
| `backups` | PreCompact セッションバックアップ（中断セッションの復元用） |
| `issues` | アクティブな Issue 一覧（Done/Released を除く）と Projects フィールド |
| `openPRs` | オープンな PR 一覧 |

### オプション

| オプション | 説明 |
|-----------|------|
| `--format <format>` | 出力形式: `json`（デフォルト）/ `table-json`（人間が読む場合はこちらが見やすい） |
| `--user <name>` | 特定ユーザーの引き継ぎのみ表示 |
| `--all` | すべてのユーザーの引き継ぎを表示 |
| `--team` | チームダッシュボード: 全メンバーの引き継ぎと Issue をアサイニー別に表示 |

### 使い方の例

```bash
# 基本的なセッション開始
shirokuma-docs session start

# チームの状況を確認
shirokuma-docs session start --team

# 特定メンバーの引き継ぎを確認
shirokuma-docs session start --user alice
```

### Claude Code との連携

Claude Code の `starting-session` スキルが内部でこのコマンドを実行し、結果をわかりやすくフォーマットして表示します。

```
/starting-session
```

---

## session end - セッション終了

作業セッションを終了し、引き継ぎ情報を保存します。

```bash
# Issue #42 を Review（PR レビュー待ち）に更新
shirokuma-docs session end --review 42

# Issue #42 を Done に更新
shirokuma-docs session end --done 42

# 複数 Issue を同時に更新
shirokuma-docs session end --review 42 --done 43 44
```

### 引き継ぎ情報の保存

`session end` は GitHub Discussions の Handovers カテゴリに引き継ぎを作成します。

| オプション | 説明 |
|-----------|------|
| `-t, --title <title>` | 引き継ぎのタイトル |
| `-b, --body-file <file>` | 引き継ぎ本文ファイルパス（`-` で stdin も可） |
| `--done <numbers...>` | Done に更新する Issue 番号 |
| `--review <numbers...>` | Review に更新する Issue 番号 |

> **自動 Done 昇格**: `--review` で指定した Issue に関連する PR が既にマージ済みの場合、Review ではなく Done に自動昇格します。セッション中に PR がマージされた場合でも、手動で `--done` に切り替える必要はありません。

### Claude Code との連携

Claude Code の `ending-session` スキルが内部でこのコマンドを実行します。スキルが自動的に作業サマリーを生成し、引き継ぎを作成します。

```
/ending-session
```

---

## session check - 整合性チェック

Issue の状態（Open/Closed）と Project Status の整合性をチェックします。

```bash
# チェックのみ
shirokuma-docs session check

# 不整合を自動修正
shirokuma-docs session check --fix

# Discussion カテゴリのセットアップ確認
shirokuma-docs session check --setup
```

| オプション | 説明 |
|-----------|------|
| `--fix` | 検出した不整合を自動修正 |
| `--setup` | Discussion カテゴリ（Handovers 等）のセットアップ状況を確認 |

### チェック内容

| チェック項目 | 例 |
|-------------|---|
| Open な Issue なのに Status が Done | Status を Backlog にリセット |
| Closed な Issue なのに Status が In Progress | Status を Done に更新 |
| Projects フィールドが未設定 | 警告を表示 |

### `--fix` の動作

`--fix` を付けると、検出した不整合を自動的に修正します。修正内容は事前に表示され、確認後に実行されます。

---

## セッション管理のベストプラクティス

### 1. セッションの始め方

#### 推奨: スキル連携

Claude Code の `/starting-session` スキルがコンテキスト取得、Issue 選択、ステータス更新、ブランチ作成をまとめて処理します。

```
/starting-session
```

Issue を選択すると、`/working-on-issue` に自動委任され、ステータスの In Progress 更新とフィーチャーブランチの作成が行われます。

#### 代替: CLI 直接操作

```bash
# 1. セッション開始でコンテキストを取得
shirokuma-docs session start

# 2. 作業する Issue を選んでステータスを更新
shirokuma-docs issues update 42 --field-status "In Progress"

# 3. フィーチャーブランチを作成
git checkout -b feat/42-dashboard
```

### 2. セッションの終わり方

#### 推奨: スキル連携

`/ending-session` スキルが未コミット変更の検出、コミット、プッシュ、PR 作成、引き継ぎ保存、ステータス更新を一括で処理します。

```
/ending-session
```

> 個別にコミットやPR作成を行いたい場合は、`/committing-on-issue`（コミット・プッシュ）や `/creating-pr-on-issue`（PR作成）を個別に使うこともできます。

#### 代替: CLI 直接操作

```bash
# 1. 変更をコミット & プッシュ（個別ファイルをステージ）
git add src/components/dashboard.tsx src/lib/actions/dashboard.ts
git commit -m "feat: ダッシュボード画面を追加 (#42)"
git push -u origin feat/42-dashboard

# 2. PR を作成
# Claude Code と協働している場合は /creating-pr-on-issue スキルが便利です

# 3. セッション終了（引き継ぎ保存 + ステータス更新）
shirokuma-docs session end --review 42
```

### 3. 定期的な整合性チェック

Issue が増えてくると、状態の不整合が起きることがあります。定期的にチェックしましょう。

```bash
shirokuma-docs session check --fix
```
