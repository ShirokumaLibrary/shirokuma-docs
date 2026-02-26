---
name: starting-session
description: 作業セッションを開始し、プロジェクトの状態と前回の引き継ぎを表示します。「セッション開始」「作業開始」「start session」「begin work」で起動。
allowed-tools: Bash, Read, Grep, AskUserQuestion
---

# セッション開始

新しい作業セッションを開始し、プロジェクトのコンテキストを表示する。

## ワークフロー

### ステップ 1: セッションコンテキスト取得

```bash
shirokuma-docs session start
```

返される JSON: `repository`, `git`（ブランチ、未コミット変更）, `lastHandover`, `backups`（PreCompact バックアップ）, `issues`（アクティブ Issue + フィールド）, `total_issues`, `openPRs`（オープン PR + レビューステータス）

### ステップ 1b: バックアップ検出

`backups` フィールドが存在する場合、前回のセッションが中断された可能性がある。
バックアップ内容（ブランチ、未コミット変更、直近のコミット）をユーザーに通知し、コンテキスト復元の参考にする。

### ステップ 2: コンテキスト表示

```markdown
## セッション開始

**リポジトリ:** {repository}
**時刻:** {current time}
**ブランチ:** {currentBranch} {hasUncommittedChanges ? "(未コミットあり)" : "(クリーン)"}

### 前回の引き継ぎ
{lastHandover.title or "なし"}
- サマリー: {サマリー セクション}
- 次のステップ: {次のステップ セクション}

### オープン PR
| # | タイトル | レビュー | スレッド |
|---|---------|---------|---------|
| #42 | feat: 新機能追加 | APPROVED | 0 |

{PR がない場合は「オープン PR はありません。」と表示}

### アクティブな Issue
{ステータスでグループ化: 作業中 → 準備完了 → バックログ → アイスボックス}
```

未コミット変更がある場合、ユーザーに通知。

### ステップ 3: 方向性の確認

AskUserQuestion で上位アイテムを選択肢として提示（作業中 > 準備完了 > バックログ、最大4オプション）。「Other」オプションも含める（自由入力用）。

## アイテム選択時

Issue のステータスに基づいて適切なスキルにルーティングする。

### ステータスベースルーティング

| Issue ステータス | 委任先 | 理由 |
|-----------------|--------|------|
| Backlog | `planning-on-issue` | 計画が必要 |
| Planning | `planning-on-issue` | 計画策定中 |
| Spec Review | `working-on-issue` | 暗黙承認で実装開始 |
| In Progress | `working-on-issue` | 作業再開 |
| Review / Pending | `working-on-issue` | 作業続行 |
| (その他 / ステータスなし) | `working-on-issue` | デフォルト |

### スキル起動

```
Skill: {ルーティングテーブルに基づくスキル名}
Args: #{number}
```

`working-on-issue` がステータス更新、ブランチ作成、計画確認、スキル選択・実行、作業後フローを一貫して処理する。
`planning-on-issue` が計画策定とステータス遷移を処理する。
`starting-session` ではステータス更新やブランチ作成を行わない。

## Other 選択時

引き継ぎ残タスクや新しいタスクなど、Issue リスト外の選択肢が選ばれた場合のルーティング。

### フロー

1. AskUserQuestion: 「対応する Issue 番号があれば入力してください。なければ新規作成します。」
   - 選択肢: 「Issue 番号を入力」「Issue なし - 新規作成」
2. Issue 番号入力 → ステータスベースルーティングに合流（上記「アイテム選択時」と同じ）
3. Issue なし → `managing-github-items` スキルで Issue 作成 → 作成された Issue で `planning-on-issue` にルーティング

```
Other 選択
├── AskUserQuestion: 「対応 Issue は？」
├── Issue 番号あり → ステータスベースルーティング
└── Issue なし
    ├── managing-github-items で Issue 作成
    └── 作成された Issue で planning-on-issue にルーティング
```

**引き継ぎ残タスクの場合**: 引き継ぎの 次のステップ セクションの内容を Issue 本文のコンテキストとして `managing-github-items` に渡す。

## マルチ開発者モード

チーム開発では `session start` に以下のオプションを追加できる：

```bash
# 特定ユーザーの引き継ぎを表示
shirokuma-docs session start --user {username}

# 全メンバーの引き継ぎを表示（フィルタなし）
shirokuma-docs session start --all

# チームダッシュボード（メンバー別にグループ化）
shirokuma-docs session start --team
```

| オプション | 動作 |
|-----------|------|
| （デフォルト）| 現在の GitHub ユーザーの引き継ぎのみ取得 |
| `--user {username}` | 特定ユーザーの引き継ぎを取得 |
| `--all` | 全メンバーの引き継ぎを取得（フィルタなし） |
| `--team` | メンバー別にハンドオーバー + Issue をグループ化して表示 |

**デフォルト動作の詳細**: `gh api user` で現在ログイン中の GitHub ユーザー名を取得し、そのユーザーが作成したハンドオーバーのみをフィルタする。

## エッジケース

| 状況 | 対応 |
|------|------|
| `shirokuma-docs` 未インストール | `pnpm install` を案内 |
| `gh` 未インストール | `brew install gh` または `sudo apt install gh` を案内 |
| GitHub 未ログイン | `gh auth login` を案内 |
| Issue がゼロ | 「アクティブな Issue なし」と表示 |
| 引き継ぎがない | 「前回の引き継ぎ: なし」と表示 |
| git pull 失敗 | 警告して続行（ローカルのベースブランチを使用） |

## バッチ候補提案

アクティブな Issue 表示（ステップ 2）後、Backlog アイテムからバッチ候補を確認する。

### 検出

1. `session start` 出力から Issue をフィルタ: Status = Backlog, Size = XS or S
2. `area:*` ラベル（第1優先）またはタイトルキーワード類似度（フォールバック: 共通名詞2語以上）でグルーピング
3. 3 Issue 以上のグループを表示、最大3グループ

### 表示

候補が見つかった場合、アクティブな Issue セクションの後に追加:

```markdown
### バッチ候補
| グループ | Issue | エリア |
|---------|-------|-------|
| プラグイン修正 | #101, #102, #105 | area:plugin |
| CLI 改善 | #110, #112, #115 | area:cli |
```

### AskUserQuestion への統合

ステップ 3 の選択肢に、個別 Issue と並べてバッチオプションを含める:

```
選択肢:
- #42 現在のタスク (In Progress)
- #50 次の機能 (Backlog)
- バッチ: #101 #102 #105 (プラグイン修正)    ← バッチオプション
- Other
```

バッチオプションが選択された場合、全 Issue 番号付きで `working-on-issue` を起動（例: `#101 #102 #105`）。

## 進化シグナルリマインド

コンテキスト表示（ステップ 2）後、Evolution Issue にシグナルが蓄積されているか確認する。

```bash
shirokuma-docs search "[Evolution]" --type issues --limit 1
```

シグナルが蓄積されている場合、アクティブな Issue セクションの後に 1 行で表示:

```markdown
> 🧬 Evolution シグナルが蓄積されています。`/evolving-rules` で分析できます。
```

- **自動実行しない** — リマインドのみ（ユーザーが起動を判断）
- **蓄積がない場合は非表示** — ノイズを避ける
- **ブロッキングにしない** — ステップ 3 の方向性確認に影響しない

## 注意事項

- セッションヘッダーに現在時刻を表示
- 引き継ぎから サマリー / 次のステップ をパース
- 優先度順に表示
- アイテム選択後はステータスベースルーティングに従い `working-on-issue` または `planning-on-issue` に委任（ステータス更新・ブランチ作成を重複しない）
- 直接 `gh` コマンドを使わない（`shirokuma-docs session start` を使用）
