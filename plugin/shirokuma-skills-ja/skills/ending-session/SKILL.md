---
name: ending-session
description: 作業セッションを終了し、引き継ぎ情報を保存してプロジェクトアイテムを更新します。「セッション終了」「作業終了」「end session」「引き継ぎ保存」で起動。
allowed-tools: Bash, Read, Write, Grep, Glob, AskUserQuestion
---

# セッション終了

セッションを終了し、引き継ぎを自動保存する。

## 引き継ぎは必須

すべてのセッションは引き継ぎ Discussion で終了する**必要がある**（オプションではない）。短いセッションでも将来のセッションに有用なコンテキストを提供する。

- 重要な作業がなくても、議論や調査の簡潔なサマリーを記載
- ユーザーが引き継ぎをスキップしようとした場合、重要性を説明して作成を続行
- Summary や Next Steps セクションを空にしない — 各セクション最低 1 行は記載

## ワークフロー

### ステップ 1: セッションサマリー収集

会話を分析して以下を抽出:
1. **サマリー**: 達成したこと（1-2文）
2. **関連アイテム**: 作業したプロジェクトアイテム
3. **主な決定事項**: 重要な決定とその根拠
4. **ブロッカー**: 遭遇した障害
5. **次のステップ**: 次回セッションの実行可能なタスク
6. **変更ファイル**: `git status --short` から取得
7. **コミット**: `git log --oneline` から取得（今回セッション分）

### ステップ 2: 変更情報取得

```bash
git status --short | head -20
git log --oneline -10
git branch --show-current
```

### ステップ 3: プッシュ・PR 作成（フィーチャーブランチの場合）

フィーチャーブランチ（ベースブランチ以外）にいる場合:

#### 3a. 未コミット変更の確認

```bash
git status --short
```

未コミット変更がある場合、AskUserQuestion でコミットするか確認。
`committing-on-issue` スキルのワークフローに従い、特定ファイルをステージ、Conventional Commits メッセージを作成（Co-Authored-By なし）、コミット。

#### 3b. ブランチプッシュ

```bash
git push -u origin {branch-name}
```

#### 3c. PR 作成

`creating-pr-on-issue` スキルのワークフローに従い、`develop` ターゲットで PR を作成（`branch-workflow` ルール参照）:

```bash
gh pr create --base develop --title "{タイトル}" --body "$(cat <<'EOF'
## Summary
{達成内容の箇条書き 1-3 点}

## Related Issues
{完了: Closes #N / 継続中: Refs #N}

## Test plan
- [ ] {テストチェックリスト}
EOF
)"
```

**PR タイトル**: 70 文字以内の簡潔なサマリー。
**PR 本文**: 完了アイテムは `Closes #{number}`、継続中は `Refs #{number}`。
**PR ベース**: 日常作業は常に `develop`。ホットフィックスのみ `main`。

#### 3d. PR URL の記録

引き継ぎ本文に含めるため PR URL を記録。

ベースブランチにいる場合（フィーチャーブランチなし）、このステップ全体をスキップ。

### ステップ 3.5: 引き継ぎ本文作成

Write ツールで `/tmp/handover.md` に引き継ぎ本文を作成する（「引き継ぎ本文テンプレート」セクションのテンプレートを使用）。

ステップ 4 の `--body /tmp/handover.md` でこのファイルを参照する。

### ステップ 4: 引き継ぎ保存 + ステータス更新（単一コマンド）

ステップ 3.5 で作成したファイルを使い、実行:

```bash
shirokuma-docs session end \
  --title "$(date +%Y-%m-%d) - {サマリー}" \
  --body /tmp/handover.md \
  --done {完了issue番号} \
  --review {レビュー中issue番号}
```

この単一コマンドで:
- 引き継ぎ Discussion を作成（Handovers カテゴリ）
- 指定した Issue を "Done" または "Review" ステータスに更新

**オプション**:
- `--title`（必須）- 引き継ぎタイトル、通常は日付 + サマリー
- `--body`（必須）- 引き継ぎ本文の Markdown ファイルパス（Write ツールで作成）
- `--done <numbers...>` - Done にする Issue 番号
- `--review <numbers...>` - Review にする Issue 番号

**--done vs --review の選択**:
- `--done`: 作業完了、PR 不要（またはマージ済み）
- `--review`: PR 作成済み、ユーザーレビュー待ち（PR がマージ済みなら自動で Done に昇格）

**判定アルゴリズム**（各 Issue について）:

| 優先度 | 条件 | アクション |
|--------|------|----------|
| 0 | ステータスが Planning または Spec Review | ステータス更新しない（pre-work ステータス、計画途中） |
| 1 | Issue に関連するマージ済み PR がある | `--done` |
| 2 | Issue に関連するオープン PR がある | `--review` |
| 3 | PR 不要で作業完了 | `--done` |
| 4 | 作業継続中（未完了） | ステータス更新しない |

判定に必要な情報は `shirokuma-docs issues show {number}` で PR 状態を確認する。

**冪等性**: `creating-pr-on-issue` がセルフレビュー完了時に既に Review に更新済みの場合、`--review` は no-op。`committing-on-issue` のマージチェーンが Done に更新済みの場合、`--done` は no-op。`ending-session` はセーフティネットとして機能し、スキルが更新し損ねた Status を補完する。

**出力**:
```json
{
  "handover": {
    "number": 31,
    "title": "2026-02-02 - Feature implementation",
    "url": "https://github.com/..."
  },
  "updatedIssues": [
    { "number": 27, "status": "Done" },
    { "number": 26, "status": "Review" }
  ]
}
```

**ローカルフォールバック**（`session end` 失敗時）:

Write ツールで `.claude/sessions/{YYYY-MM-DD-HHMMSS}-handover.md` に引き継ぎ本文を保存する（テンプレートは「引き継ぎ本文テンプレート」セクション参照）。事前にディレクトリが存在しない場合は `mkdir -p .claude/sessions` を実行する。

成功時、`session end` は `.claude/sessions/` 内の PreCompact バックアップを自動クリーンアップする。

### ステップ 5: サマリー表示

```markdown
## セッション終了

**保存先:** {handover.url or ローカルパス}
**ブランチ:** {ブランチ名}
**PR:** {PR URL or "N/A"}

### 成果
{サマリー}

### 完了アイテム
- #{number} → Done

### レビュー中アイテム
- #{number} → Review (PR #{pr_number})

### 次のステップ
- [ ] {タスク 1}
- [ ] {タスク 2}
```

## 引き継ぎ本文テンプレート

```markdown
## サマリー
{達成内容}

## 関連アイテム
- #{number} - {title} - {status}

## 主な決定事項
- {決定と根拠}

## ブロッカー
- {ブロッカー or なし}

## 次のステップ
- [ ] {次のタスク}

## コミット（今回のセッション）
| ハッシュ | 説明 |
|---------|------|
| {hash} | {message} |

## プルリクエスト
- {PR URL or "PR 未作成（ベースブランチで作業）"}

## 変更ファイル
- `path/file.ts` - {変更内容}

## メモ
{追加情報}
```

## エラーハンドリング

| エラー | 対処 |
|--------|------|
| `session end` 失敗 | ローカルファイルに保存 |
| "Handovers" カテゴリなし | ローカルファイルに保存 |
| gh 未認証 | ローカルファイルに保存 |
| セッション中に変更なし | 簡潔でも引き継ぎを保存 |
| Issue がプロジェクトにない | 警告して続行 |
| `git push` 失敗 | ユーザーに警告、PR なしで引き継ぎ保存 |
| `gh pr create` 失敗 | ユーザーに警告、ブランチ名を引き継ぎに含める |
| ベースブランチにいる（フィーチャーブランチなし） | プッシュ/PR ステップをスキップ、引き継ぎのみ保存 |

## 注意事項

- 確認なしで自動保存（高速ワークフローのため）
- 短くても必ずサマリーを生成
- ローカルフォールバックにより引き継ぎの喪失を防止
- `session end` で引き継ぎ作成 + ステータス更新を 1 回で処理
- PR 作成済みアイテムには `--review`、レビュー不要の完了アイテムには `--done`
- トレーサビリティのため引き継ぎ本文に PR URL を含める
- Summary / Next Steps を空にしない（最低 1 行ずつ記載）
- PR 作成済みアイテムには `--review` を使用（`--done` ではない）
- 複数アイテム更新時は TodoWrite で進捗管理
