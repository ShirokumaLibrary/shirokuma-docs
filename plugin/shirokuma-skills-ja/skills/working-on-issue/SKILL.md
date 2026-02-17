---
name: working-on-issue
description: Issue番号またはタスク説明を受け取り、適切なスキルを選択してワークフローを統括するワークディスパッチャー。「これやって」「work on」「取り組む」「着手して」「#42 やって」で使用。
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion, TodoWrite
---

# Issue に取り組む

Issue の種類やタスク説明に基づいて、適切なスキルに作業をディスパッチする。

**注意**: セッションセットアップには `starting-session` を使用。このスキルは特定タスクの作業開始用。

## コンセプト

このスキルは**全作業のエントリーポイント**。何をすべきか分析し、適切なスキルに委任した後、ワークフローを順次実行する。

```
/working-on-issue #42 → 分析 → スキル選択 → 実行 → Commit → PR → Review
```

ワークフローは**常に順次実行**される。ステップ間でユーザーに確認しない。

### TodoWrite 登録（必須）

**作業開始前**にチェーン全ステップを TodoWrite に登録する。

**実装 / デザイン / バグ修正:**

| # | content | activeForm | スキル |
|---|---------|------------|--------|
| 1 | 実装する | 実装中 | `nextjs-vibe-coding` / `frontend-designing` |
| 2 | 変更をコミット・プッシュする | コミット・プッシュ中 | `committing-on-issue` |
| 3 | プルリクエストを作成する | プルリクエストを作成中 | `creating-pr-on-issue` |
| 4 | セルフレビューを実行し結果を PR に投稿する | セルフレビュー・結果投稿中 | `creating-pr-on-issue` ステップ 6 で実行（個別呼び出し不要） |

**リファクタリング / Chore:**

| # | content | activeForm | スキル |
|---|---------|------------|--------|
| 1 | 変更を実施する | 変更を実施中 | 直接編集 |
| 2 | 変更をコミット・プッシュする | コミット・プッシュ中 | `committing-on-issue` |
| 3 | プルリクエストを作成する | プルリクエストを作成中 | `creating-pr-on-issue` |
| 4 | セルフレビューを実行し結果を PR に投稿する | セルフレビュー・結果投稿中 | `creating-pr-on-issue` ステップ 6 で実行（個別呼び出し不要） |

**調査:**

| # | content | activeForm | スキル |
|---|---------|------------|--------|
| 1 | 調査を実施する | 調査を実施中 | `best-practices-researching` |
| 2 | Discussion に調査結果を保存する | Discussion を作成中 | `shirokuma-docs discussions create` |

各ステップの実行開始時に `in_progress`、完了時に `completed` に更新する。
`creating-pr-on-issue` 完了時（セルフレビュー含む）にステップ 3 と 4 を同時に `completed` にする。

## ワークフロー

### ステップ 1: 作業の分析

**Issue 番号あり**: `shirokuma-docs issues show {number}` で取得し、title/body/labels/status/priority/size を抽出。

#### 計画済み判定（Issue 番号ありの場合）

Issue 本文に `## 計画` セクション（`^## 計画` で前方一致検出）があるか確認する。

| 計画状態 | アクション |
|---------|----------|
| 計画なし | → `planning-on-issue` に委任して計画を策定（全 Issue 共通） |
| 計画あり | → 計画を `## 計画` セクションからコンテキストとして実装スキルに渡す |

- 計画の深さは `planning-on-issue` が Issue 内容に応じて自動判定する（軽量/標準/詳細）

#### Planning ステータスからの遷移

Issue のステータスが Planning の場合:

| 計画状態 | アクション |
|---------|----------|
| Planning + 計画なし | → `planning-on-issue` に委任（計画を継続） |
| Planning + 計画あり | → Spec Review に遷移し、ユーザーに承認を求める（暗黙承認にしない） |

Planning + 計画ありのケース（セッション中断等）では、計画のサマリーを表示して承認を確認する。

**テキスト説明のみ**: キーワードから分類:

| キーワード | 作業タイプ |
|-----------|-----------|
| implement, create, add, 実装, 作成, 追加 | 実装 |
| design, UI, デザイン, 印象的 | デザイン |
| fix, bug, 修正, バグ | バグ修正 |
| refactor, リファクタ | リファクタリング |
| research, 調査 | 調査 |
| review, レビュー | レビュー |
| config, setup, 設定 | Chore |

### ステップ 1a: Issue 解決（テキスト説明のみの場合）

テキスト説明のみで呼ばれた場合、作業開始前に Issue を確保する。

1. AskUserQuestion: 「対応する Issue 番号があれば入力してください。なければ新規作成します。」
   - 選択肢: 「Issue 番号を入力」「Issue なし - 新規作成」
2. Issue 番号入力 → ステップ 1 の「Issue 番号あり」パスに合流
3. Issue なし → `managing-github-items` スキルで Issue 作成（ステップ 1 のキーワード分類を作業タイプ推定に活用）→ 作成された Issue 番号でステップ 1 に合流

```
テキスト説明のみ → ステップ 1a
├── AskUserQuestion: 「対応 Issue は？」
├── Issue 番号あり → ステップ 1（Issue 番号あり）に合流
└── Issue なし
    ├── managing-github-items で Issue 作成
    └── 作成された Issue でステップ 1 に合流
```

### ステップ 2: ステータス更新

Issue が In Progress でなければ: `shirokuma-docs issues update {number} --field-status "In Progress"`

**Spec Review からの遷移（暗黙承認モデル）**: Issue の Status が Spec Review の場合、ユーザーが `/working-on-issue` を呼び出した行為自体が計画の承認を意味する。追加の確認なしに In Progress に遷移する。

**Planning からの遷移**: 上記「Planning ステータスからの遷移」の判定結果に従う。計画なしの場合は `planning-on-issue` に委任（ステータス更新はスキルが処理）。計画ありの場合は Spec Review に遷移して承認を待つ。

### ステップ 3: フィーチャーブランチの確保

`develop` にいる場合、`branch-workflow` ルールに従いブランチを作成:

```bash
git checkout develop && git pull origin develop
git checkout -b {type}/{number}-{slug}
```

ブランチタイプ: ラベル / Issue コンテキストから判断（feature→`feat`, bug→`fix`, chore/research→`chore`, docs→`docs`）

### ステップ 3b: ADR 提案（Feature M+ のみ）

Feature タイプでサイズ M 以上の場合、ADR 作成を提案（AskUserQuestion）。

### ステップ 4: スキルの選択と実行

| 作業タイプ | スキル | 呼び出し |
|-----------|-------|---------|
| 実装 / バグ修正 | `nextjs-vibe-coding` | Skill |
| デザイン | `frontend-designing` | Skill |
| 調査 | `best-practices-researching` | Skill (`context: fork`) |
| レビュー | `reviewing-on-issue` | Skill (`context: fork`) |
| リファクタリング / Chore | 直接編集 | — |

### ステップ 5: ワークフロー順次実行

作業完了後、ワークフローチェーンを**自動的に順次実行**する。ステップ間でユーザーに確認しない。

**前提**: TodoWrite 登録（上記セクション参照）でチェーン全ステップが登録済み。
各ステップの実行開始時に `in_progress`、完了時に `completed` に更新する。

| 作業タイプ | チェーン |
|-----------|---------|
| 実装 / デザイン / バグ修正 | Work → Commit → PR → Review |
| リファクタリング / Chore | Work → Commit → PR → Review |
| 調査 | Research → Discussion |

- **マージはチェーンに含まない**。マージはユーザーの明示的な指示（「マージして」等）でのみ実行する。チェーン完了後に自動マージしてはならない
- ステップ間で確認しない、進捗を1行で報告
- **セルフレビューループ**: PR 作成後に `reviewing-on-issue` を実行。`creating-pr-on-issue` のセルフレビューチェーン（ステップ 6）として実行される
  - FAIL + Auto-fixable → 自動修正 → コミット・プッシュ（PR自動更新）→ 再レビュー
  - 最大3イテレーション（初回レビュー + 最大2回の修正・再レビュー）
  - イテレーション間で issue 数が増加した場合はループ停止
- レビューステップはデフォルトで `reviewing-on-issue` を使用。プロジェクト固有のレビューチェックリストやスキル（`.claude/skills/` 等）がある場合は併用する
- **ステップ 4 の完了条件**: `reviewing-on-issue` がレポートを保存し、PR コメントの投稿が確認された時点で `completed` にする。Self-Review Result の返却のみでは完了としない
- **フィードバック蓄積**: セルフレビューの検出パターンを Discussion (Reports) に記録。頻出パターン（3回以上）はルール化提案を生成
- 失敗時: チェーン停止、状況報告、ユーザーに制御を返す

## 引数

| 形式 | 例 | 動作 |
|------|---|------|
| Issue 番号 | `#42` | Issue 取得、タイプ分析 |
| 説明文 | `implement dashboard` | テキスト分類 |
| 引数なし | — | AskUserQuestion で確認 |

## 表示フォーマット

```markdown
## 作業対象: #{number} {title}

**ラベル:** {label} → **スキル:** {skill-name}
**ブランチ:** {branch-name}
**優先度:** {priority}
```

## エッジケース

| 状況 | アクション |
|------|----------|
| Issue が見つからない | AskUserQuestion で番号確認 |
| Issue が Done/Released | 警告、再オープン確認 |
| 既に In Progress | ステータス変更なしで続行 |
| 誤ったブランチ | AskUserQuestion: 切り替え or 続行 |
| チェーン失敗 | 完了/残りステップ報告、制御を返す |

## ルール参照

このスキルは以下のルールに依存する（`.claude/rules/` から自動読み込み）：

| ルール | 用途 |
|--------|------|
| `branch-workflow` | ブランチ命名、`develop` からの作成、PR ターゲット |
| `project-items` | ステータスワークフロー、フィールド要件、本文メンテナンス |
| `git-commit-style` | コミットメッセージ形式（`committing-on-issue` スキルに委任） |

## ツール使用

| ツール | タイミング |
|--------|-----------|
| AskUserQuestion | 要件確認、アプローチ選択、エッジケース判断（作業タイプ不明、Issue 未発見、ブランチ不一致等） |
| TodoWrite | チェーンステップ登録（全作業で必須）、複数 Issue セッションの進捗トラッキング |
| Bash | Git 操作、`shirokuma-docs issues` コマンド |

**AskUserQuestion**: ユーザー入力が必要な場面（要件確認、アプローチ選択、エッジケース判断）で使用する。ワークフローステップ遷移（Commit → PR → Review）の確認には使用しない。

**TodoWrite**: 全作業で使用。チェーン全ステップを事前登録し、各ステップの進捗を `in_progress` → `completed` で更新する。

## 注意事項

- このスキルは作業の**プライマリエントリーポイント**
- 作業開始前に Issue ステータスを更新
- 正しいフィーチャーブランチを確保
- ワークフローは常に順次実行（Commit → PR → Review）。**マージは含まない**
- チェーン完了後、マージはユーザーの明示的な指示を待つ（自動マージ禁止）
- チェーン実行はエラー発生時に停止し、ユーザーに制御を返す
- 直接作業（リファクタリング/Chore）ではスキル委任不要
