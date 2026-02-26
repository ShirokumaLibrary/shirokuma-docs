---
name: working-on-issue
description: Issue番号またはタスク説明を受け取り、適切なスキルを選択してワークフローを統括するワークディスパッチャー。「これやって」「work on」「取り組む」「着手して」「#42 やって」で使用。
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion, TodoWrite
---

# Issue に取り組む（オーケストレーター）

Issue の種類やタスク説明に基づいて、計画→実装→コミット→PR→セルフレビューの一連のフローを統括する。

**注意**: セッションセットアップには `starting-session` を使用。このスキルはセッション内でもスタンドアロン（`starting-session` なし）でも動作する。いずれのモードでも特定タスクの作業開始の主要エントリーポイントとなる。

## TodoWrite 登録（必須）

**作業開始前**にチェーン全ステップを TodoWrite に登録する。

**実装 / デザイン / バグ修正:**

| # | content | activeForm | スキル |
|---|---------|------------|--------|
| 1 | 実装する | 実装中 | `coding-nextjs` / `designing-shadcn-ui` / 直接編集 |
| 2 | 変更をコミット・プッシュする | コミット・プッシュ中 | `committing-on-issue` |
| 3 | プルリクエストを作成する | プルリクエストを作成中 | `creating-pr-on-issue` |
| 4 | セルフレビューを実行し結果を PR に投稿する | セルフレビュー・結果投稿中 | `creating-pr-on-issue` ステップ 6 で実行 |
| 5 | Status を Review に更新する | Status を Review に更新中 | `creating-pr-on-issue` ステップ 7 で実行 |

**リファクタリング / Chore:**

| # | content | activeForm | スキル |
|---|---------|------------|--------|
| 1 | 変更を実施する | 変更を実施中 | 直接編集 |
| 2 | 変更をコミット・プッシュする | コミット・プッシュ中 | `committing-on-issue` |
| 3 | プルリクエストを作成する | プルリクエストを作成中 | `creating-pr-on-issue` |
| 4 | セルフレビューを実行し結果を PR に投稿する | セルフレビュー・結果投稿中 | `creating-pr-on-issue` ステップ 6 で実行 |
| 5 | Status を Review に更新する | Status を Review に更新中 | `creating-pr-on-issue` ステップ 7 で実行 |

**調査:**

| # | content | activeForm | スキル |
|---|---------|------------|--------|
| 1 | 調査を実施する | 調査を実施中 | `researching-best-practices` |
| 2 | Discussion に調査結果を保存する | Discussion を作成中 | `shirokuma-docs discussions create` |

各ステップの実行開始時に `in_progress`、完了時に `completed` に更新する。

## ワークフロー

### ステップ 1: 作業の分析

**Issue 番号あり**: `shirokuma-docs issues show {number}` で取得し、title/body/labels/status/priority/size を抽出。

#### サブ Issue 検出

`shirokuma-docs issues show {number}` の出力に `parentIssue` フィールドがある場合、サブ Issue モードで動作する:

1. 親 Issue の `## 計画` セクションを参照し、全体コンテキストを把握
2. ベースブランチを `develop` ではなく親の integration ブランチに設定（ステップ 3 参照）
3. PR 作成時も integration ブランチをベースにする（`creating-pr-on-issue` が `parentIssue` フィールドで自力検出するため、明示的なコンテキスト渡しは不要。渡せばそれを利用する補助的位置づけ）

```bash
# 親 Issue の確認
shirokuma-docs issues show {parent-number}
```

#### 計画済み判定（Issue 番号ありの場合）

Issue 本文に `## 計画` セクション（`^## 計画` で前方一致検出）があるか確認する。

| 計画状態 | アクション |
|---------|----------|
| 計画なし | → `planning-on-issue` に委任して計画を策定 |
| 計画あり | → 計画を `## 計画` セクションからコンテキストとして実装スキルに渡す |

#### Planning ステータスからの遷移

| 計画状態 | アクション |
|---------|----------|
| Planning + 計画なし | → `planning-on-issue` に委任 |
| Planning + 計画あり | → Spec Review に遷移し、ユーザーに承認を求める |

**テキスト説明のみ**: ディスパッチ条件テーブル（ステップ 4）のキーワードから分類。

### ステップ 1a: Issue 解決（テキスト説明のみの場合）

テキスト説明のみで呼ばれた場合、`creating-item` スキルに委任して Issue を確保する。

```
テキスト説明のみ → creating-item → Issue 番号取得 → ステップ 1 に合流
```

### ステップ 2: ステータス更新

Issue が In Progress でなければ: `shirokuma-docs issues update {number} --field-status "In Progress"`

**Spec Review からの遷移（暗黙承認モデル）**: `/working-on-issue` を呼び出した行為自体が計画の承認を意味する。追加確認なしに In Progress に遷移。

### ステップ 3: フィーチャーブランチの確保

`develop` または integration ブランチにいる場合、`branch-workflow` ルールに従いブランチを作成:

```bash
# 通常の Issue
git checkout develop && git pull origin develop
git checkout -b {type}/{number}-{slug}

# サブ Issue（親の integration ブランチから分岐）
git checkout epic/{parent-number}-{slug} && git pull origin epic/{parent-number}-{slug}
git checkout -b {type}/{number}-{slug}
```

**Integration ブランチの検出順序**（サブ Issue の場合）:

1. 親 Issue の本文から `### Integration ブランチ`（JA）/ `### Integration Branch`（EN）ヘッディングを探し、直後のバッククォート内のブランチ名を抽出（プレフィックスは `epic/`, `chore/`, `feat/` 等任意）
2. フォールバック: `git branch -r --list "origin/*/{parent-number}-*"` で検索（1件→自動採用、複数→AskUserQuestion、0件→`develop` にフォールバック）
3. 見つからない場合: `develop` をベースにし、ユーザーに警告

### ステップ 3b: ADR 提案（Feature M+ のみ）

Feature タイプでサイズ M 以上の場合、ADR 作成を提案（AskUserQuestion）。

### ステップ 4: スキルの選択と実行

#### ディスパッチ条件テーブル

| 作業タイプ | 判定条件 | 委任先スキル | TDD 適用 |
|-----------|---------|------------|---------|
| Next.js 実装 | ラベル: `area:frontend`, `area:cli` + Next.js 関連 | `coding-nextjs` | はい |
| UI デザイン | キーワード: `デザイン`, `UI`, `印象的`, `design` | `designing-shadcn-ui` | いいえ |
| バグ修正 | キーワード: `fix`, `bug`, `修正`, `バグ` | `coding-nextjs` or 直接編集 | はい |
| リファクタリング | キーワード: `refactor`, `リファクタ` | 直接編集 | はい |
| 調査 | キーワード: `research`, `調査` | `researching-best-practices` (fork) | いいえ |
| レビュー | キーワード: `review`, `レビュー` | `reviewing-on-issue` (fork) | いいえ |
| 設定/Chore | キーワード: `config`, `setup`, `chore`, `設定` | 直接編集 | いいえ |
| セットアップ | キーワード: `初期設定`, `セットアップ`, `setup project` | `setting-up-project` | いいえ |

#### TDD ワークフロー（TDD 適用の場合）

TDD 適用の作業タイプでは、実装スキル委任の**前後**に TDD 共通ステップを挟む:

```
テスト設計 → テスト作成 → テスト確認（ゲート）→ [実装スキル] → テスト実行 → 検証
```

TDD 共通ワークフローの詳細は [docs/tdd-workflow.md](docs/tdd-workflow.md) を参照。

#### 作業タイプ別リファレンス

| 作業タイプ | リファレンス |
|-----------|-----------|
| 実装 | [docs/coding-reference.md](docs/coding-reference.md) |
| デザイン | [docs/designing-reference.md](docs/designing-reference.md) |
| レビュー | [docs/reviewing-reference.md](docs/reviewing-reference.md) |
| リサーチ | [docs/researching-reference.md](docs/researching-reference.md) |

### ステップ 5: ワークフロー順次実行

作業完了後、ワークフローチェーンを**自動的に順次実行**する。ステップ間でユーザーに確認しない。

| 作業タイプ | チェーン |
|-----------|---------|
| 実装 / デザイン / バグ修正 | Work → Commit → PR → Review |
| リファクタリング / Chore | Work → Commit → PR → Review |
| 調査 | Research → Discussion |

> **「Review」の定義**: チェーン末尾の「Review」はセルフレビュー実行（`creating-pr-on-issue` ステップ 6）**と** Status → Review 更新（同ステップ 7）の両方を含む。

- **マージはチェーンに含まない**
- ステップ間で確認しない、進捗を1行で報告
- **セルフレビューループ**: PR 作成後に `reviewing-on-issue` を実行（`creating-pr-on-issue` ステップ 6）
  - FAIL + Auto-fixable → 自動修正 → コミット・プッシュ → 再レビュー
  - 最大3イテレーション
  - イテレーション間で issue 数が増加した場合はループ停止
- セルフレビュー完了後、レビュー結果に基づく Issue 本文の統合はコメントファースト原則に従う（`creating-pr-on-issue` ステップ 6c で処理）
- 失敗時: チェーン停止、状況報告、ユーザーに制御を返す

### ステップ 6: Evolution シグナル自動記録

チェーン正常完了後（チェーン失敗時はスキップ）、`rule-evolution` ルールの「スキル完了時の自動記録手順」に従い、セッション中に発生した Evolution シグナルを自動記録する。

1. 検出チェックリスト（`rule-evolution` ルール参照）でセッション中の作業を振り返る
2. シグナルあり → Evolution Issue にコメント投稿 → 記録完了を 1 行表示
3. シグナルなし → 既存シグナルの蓄積確認 → リマインド表示（フォールバック）

TodoWrite には登録しない（ノンブロッキング処理であり作業ステップではないため）。

## バッチモード

複数の Issue 番号が指定された場合（例: `#101 #102 #103`）、バッチモードを起動する。

### バッチ検出

引数内の複数 `#N` パターンを検出。2つ以上 → バッチモード。

### バッチ適格性チェック

開始前にすべての Issue が `batch-workflow` ルールの基準を満たすか確認:
- 全 Issue が Size XS または S
- 共通の `area:*` ラベルまたは関連ファイルを共有
- 合計 5 Issue 以下

不適格な Issue がある場合、ユーザーに通知し個別処理を提案する。

### バッチ TodoWrite テンプレート

```
[1] #N1 を実装する / #N1 を実装中
[2] #N2 を実装する / #N2 を実装中
...
[K] 全変更をコミット・プッシュする / コミット・プッシュ中
[K+1] プルリクエストを作成する / プルリクエストを作成中
[K+2] セルフレビューを実行する / セルフレビュー実行中
```

### バッチワークフロー

1. **一括ステータス更新**: 全 Issue → In Progress に同時遷移
   ```bash
   shirokuma-docs issues update {n} --field-status "In Progress"
   # (各 Issue に対して繰り返し)
   ```

2. **ブランチ作成**（初回のみ）:
   ```bash
   git checkout develop && git pull origin develop
   git checkout -b {type}/{issue-numbers}-batch-{slug}
   ```
   type の決定: 単一 type → その type。混在 → `chore`。

3. **Issue ループ**: 各 Issue に対して:
   - Issue 詳細取得: `shirokuma-docs issues show {number}`
   - 実装実行（ディスパッチテーブルに基づきスキル選択）
   - 品質チェックポイント: 変更ファイル確認 + 関連テスト実行
   - `filesByIssue` マッピングを記録（スコープ付きコミット用）
   - **ループ中は Commit → PR チェーンを発火しない**

4. **ループ後チェーン**: 全 Issue 実装完了後:
   - バッチコンテキスト付きで `committing-on-issue` にチェーン
   - `committing-on-issue` が Issue ごとのスコープ付きコミットを処理
   - 続いて `creating-pr-on-issue` にチェーンしバッチ PR を作成

### バッチコンテキスト

Issue ループ間で以下を保持:

```
{
  currentIssue: number,
  remainingIssues: number[],
  completedIssues: number[],
  filesByIssue: Map<number, string[]>
}
```

各実装の前後に `git diff --name-only` で Issue ごとの変更ファイルを追跡する。

## 引数

| 形式 | 例 | 動作 |
|------|---|------|
| Issue 番号 | `#42` | Issue 取得、タイプ分析 |
| 複数 Issue | `#101 #102 #103` | バッチモード |
| 説明文 | `implement dashboard` | テキスト分類 → `creating-item` 経由 |
| 引数なし | — | AskUserQuestion で確認 |

## エッジケース

| 状況 | アクション |
|------|----------|
| Issue が見つからない | AskUserQuestion で番号確認 |
| Issue が Done/Released | 警告、再オープン確認 |
| 既に In Progress | ステータス変更なしで続行 |
| 誤ったブランチ | AskUserQuestion: 切り替え or 続行 |
| チェーン失敗 | 完了/残りステップ報告、制御を返す |
| サブ Issue で integration ブランチ未検出 | `develop` をベースにし警告表示 |
| エピック Issue を直接指定 | サブ Issue 一覧を表示し、作業対象を AskUserQuestion で確認 |

## ルール参照

| ルール | 用途 |
|--------|------|
| `branch-workflow` | ブランチ命名、`develop` からの作成、integration ブランチ |
| `batch-workflow` | バッチ適格性、品質基準、ブランチ命名 |
| `epic-workflow` リファレンス | エピック・サブ Issue ワークフロー全体像 |
| `project-items` | ステータスワークフロー、フィールド要件 |
| `git-commit-style` | コミットメッセージ形式 |
| `output-language` | GitHub 出力の言語規約 |
| `github-writing-style` | 箇条書き vs 散文のガイドライン |

## ツール使用

| ツール | タイミング |
|--------|-----------|
| AskUserQuestion | 要件確認、アプローチ選択、エッジケース判断 |
| TodoWrite | チェーンステップ登録（全作業で必須） |
| Bash | Git 操作、`shirokuma-docs issues` コマンド |

## 注意事項

- このスキルは作業の**オーケストレーター**
- 作業開始前に Issue ステータスを更新
- 正しいフィーチャーブランチを確保
- TDD 適用の作業では実装前にテストを作成（[docs/tdd-workflow.md](docs/tdd-workflow.md) 参照）
- ワークフローは常に順次実行（Commit → PR → Review）。**マージは含まない**
- チェーン実行はエラー発生時に停止し、ユーザーに制御を返す
