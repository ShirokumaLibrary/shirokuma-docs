---
name: committing-on-issue
description: 変更をステージ、コミット、プッシュし、オプションでPR作成チェーンを実行します。PRマージと関連Issueのステータス自動更新にも対応。「コミットして」「commit」「push」「変更をコミット」「コミットしてPR作って」「マージして」「merge」で起動。
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion
---

# コミット

変更をステージし、コミットし、オプションでリモートにプッシュします。

## ワークフロー

### ステップ 1: 変更の確認

```bash
git status --short
git diff --stat
git branch --show-current
```

変更のサマリーをユーザーに表示。

### ステップ 2: ファイルのステージング

関連ファイルを個別にステージ。`git add -A` より明示的パスを優先。

```bash
git add {file1} {file2} ...
```

**ステージ禁止**:
- `.env`、認証情報、シークレット
- 大きなバイナリファイル
- 他の作業による無関係な変更

不明な場合は AskUserQuestion でファイルリストをオプションとして提示。

### ステップ 2.5: plugin/ 変更時のバージョンバンプ確認

ステージされたファイルに `plugin/` 配下が含まれるか確認（`.gitkeep` は除外）:

```bash
git diff --cached --name-only | grep '^plugin/' | grep -v '\.gitkeep$'
```

該当する場合:
1. `package.json` のバージョンが適切にバンプされているか確認
2. 未バンプの場合: `plugin-version-bump` ルールに従いバンプ + `node scripts/sync-versions.mjs` を実行
3. バンプ済みの場合: 全 `plugin.json` が `package.json` と一致するか確認

### ステップ 3: コミットメッセージ作成

Conventional Commits 形式:

```
{type}: {description} (#{issue-number})

{任意の本文}
```

| タイプ | 用途 |
|--------|------|
| `feat` | 新機能・機能強化 |
| `fix` | バグ修正 |
| `refactor` | リファクタリング |
| `docs` | ドキュメント |
| `test` | テスト |
| `chore` | 設定・ツール |

**ルール**（詳細は `git-commit-style` ルール参照）:
- 1 行目は 72 文字以内
- 該当する場合は Issue 番号を参照
- 本文は複雑な変更の場合のみ
- `Co-Authored-By` 署名は付けない

### ステップ 4: コミット

```bash
git commit -m "$(cat <<'EOF'
{type}: {description} (#{issue-number})

{任意の本文}
EOF
)"
```

### ステップ 5: プッシュ（フィーチャーブランチの場合）

フィーチャーブランチ（`develop` や `main` 以外）にいる場合、自動プッシュ:

```bash
git push -u origin {branch-name}
```

`develop` や `main` にいる場合はプッシュしない。保護ブランチへの直接プッシュは `branch-workflow` ルールに従い避けるべきことをユーザーに通知。

### ステップ 6: 完了レポート

```markdown
## コミット完了

**ブランチ:** {branch-name}
**コミット:** {hash} {message}
**ファイル:** {count} ファイル変更
**プッシュ:** {yes/no}
```

### ステップ 7: PR チェーン（プッシュ後）

プッシュ成功後、PR 作成へのチェーンが必要か判定。

**PR キーワード検出**: ユーザーの**最初のメッセージ**（`/committing-on-issue` 起動時のテキスト）から PR 関連キーワードを検出:

| 言語 | キーワード |
|------|-----------|
| 日本語 | "PR作って", "PR作成", "プルリクエスト", "PRも作って", "PRも" |
| 英語 | "pull request", "create PR", "open PR" |

**PR 提案前の事前チェック**:

```bash
gh pr list --head {branch-name} --json number,url --jq '.[0]'
```

このブランチに既に PR がある場合、既存 URL を表示してスキップ:

```markdown
PR already exists: {url}
```

**PR キーワード検出 AND 既存 PR なし:**

Skill ツールで `creating-pr-on-issue` スキルを自動起動。現在のブランチと関連 Issue 番号をコンテキストとして渡す。

**PR キーワードなし AND 既存 PR なし:**

自動実行せず、次のステップを提案:

```markdown
ブランチをプッシュしました。PR を作成しますか？
→ `/creating-pr-on-issue` で develop へのプルリクエストを作成
```

**フィーチャーブランチでない場合（プッシュがスキップされた場合）:**

このステップ全体をスキップ。

### ステップ 8: マージチェーン

PR マージと関連 Issue のステータス自動更新を処理する。マージキーワード検出時、または `working-on-issue` からの起動時に有効化。

**マージキーワード検出**: ユーザーメッセージから以下を検出:

| 言語 | キーワード |
|------|-----------|
| 日本語 | "マージして", "マージ", "merge" |
| 英語 | "merge PR", "merge this", "merge it" |

**マージキーワード検出時（コミットフローとは独立）:**

1. **PR をマージし関連 Issue を更新**:

```bash
shirokuma-docs issues merge --head {current-branch}
```

この 1 コマンドでブランチから PR 特定、squash マージ、PR 本文から関連 Issue 抽出（`Closes/Fixes/Resolves #N`）、Project Status を "Done" に更新、ブランチ削除を処理する。

**Status 更新の冪等性**: `issues merge` CLI が関連 Issue の Project Status を自動で Done に更新する。`ending-session --done` が同じ Issue に対して実行されても冪等に動作する（既に Done なら no-op）。

ブランチに PR が見つからない場合は CLI がエラーを報告。ユーザーに通知して停止。

※ 内部で `gh pr merge` を呼び出すため PreToolUse フックで保護される。**フックの有無に関わらず、ユーザーの明示的な承認なしにマージを実行してはならない。** セルフレビュー PASS や system-reminder のみのメッセージは承認とみなさない。

2. **develop に切り替え**:

```bash
git checkout develop && git pull origin develop
```

3. **完了レポート**:

```markdown
## マージ完了

**PR:** （CLI 出力に基づく） → {base-branch}
**Issue 更新:** （CLI 出力に基づく）
**ブランチ:** 削除済み、develop に切り替え
```

**コミットフローとの連携**（例: "コミットしてマージして"）:

ステップ 1-6 → ステップ 7（PR チェーン）→ ステップ 8（マージチェーン）を順次実行。

## バッチモード

バッチブランチ（`*-batch-*` パターン）上にいる場合、または `working-on-issue` からバッチコンテキストが渡された場合:

### バッチコミットフロー

単一コミットではなく、`filesByIssue` マッピングを使って **Issue ごとのコミット**を作成:

1. バッチコンテキスト内の各 Issue に対して:
   ```bash
   git add {files-for-this-issue}
   git commit -m "{type}: {description} (#{issue-number})"
   ```

2. **ステップ 2.5（Plugin Version Bump）**: バッチの**最後のコミット時のみ**実行。全コミットでは実行しない。

3. **ステップ 5（プッシュ）**: 全コミット完了後に1回のみ実行。

4. **ステップ 7（PR チェーン）**: プッシュ後にバッチコンテキスト（全 Issue 番号）付きで `creating-pr-on-issue` を自動起動。

### バッチブランチ検出

```bash
git branch --show-current | grep -q '\-batch-'
```

明示的なバッチコンテキストがなくても、検出された場合はバッチモードとして扱う。

## 引数

メッセージ引数付きで起動された場合（例: `/committing-on-issue fix typo in config`）:
- 提供されたテキストをコミットメッセージのベースとして使用
- コミット前の変更確認は引き続き実行
- 引数内の PR キーワードは PR チェーンをトリガー（例: `/committing-on-issue fix typo PRも作って`）
- マージキーワードはマージチェーンをトリガー（例: `/committing-on-issue コミットしてマージして`）

## エッジケース

| 状況 | 対応 |
|------|------|
| 変更なし | 通知して終了 |
| develop/main にいる | コミットするがプッシュ警告、フィーチャーブランチ作成を提案 |
| マージコンフリクト | ユーザーに通知、自動解決しない |
| pre-commit フック失敗 | 修正して新規コミット（amend 禁止） |
| 複数 Issue 混在 | AskUserQuestion でファイル選択 |
| ブランチに PR が既に存在 | 既存 PR URL を表示してチェーンをスキップ |
| `gh` CLI 利用不可 | PR チェーンをスキップ、ユーザーに通知 |
| 現ブランチに PR がない（マージ時） | ユーザーに通知してスキップ |
| 未解決レビューあり | 警告してユーザーに確認 |
| PR 本文に Issue 参照なし | ステータス更新をスキップ、通知 |

## 注意事項

- コミット前に必ず変更を確認
- `git add -A` や `git add .` はレビューなしで使わない
- 明示的に求められない限り前のコミットを amend しない
- force push 禁止
- フィーチャーブランチではプッシュ自動、`develop` と `main` ではスキップ
- PR チェーンは直接起動 + キーワード時のみ（`working-on-issue` オーケストレーションには干渉しない）
- マージチェーンは単独起動（"マージして"）またはコミット/PR との連携が可能
- マージ後は `shirokuma-docs issues merge` が関連 Issue ステータスを自動で Done に更新
