<!-- managed-by: shirokuma-docs@0.1.0 -->

# ブランチワークフロー

## ブランチモデル

| ブランチ | 役割 | 分岐元 | マージ先 |
|----------|------|--------|----------|
| `main` | 本番リリース（タグ付け） | — | — |
| `develop` | 統合（PR デフォルト） | `main`（初期） | `main`（リリース PR） |
| `feat/*`, `fix/*`, `chore/*`, `docs/*` | 日常作業 | `develop` | `develop`（PR） |
| `hotfix/*` | 緊急本番修正 | `main` | `main`（PR）→ `develop` にチェリーピック |

- `develop` = デフォルトブランチ（PR ターゲット）
- `develop` や `main` への直接コミット禁止

## ブランチ命名

```
{type}/{issue-number}-{slug}
```

- **type**: ラベル / Issue コンテキストから判断（feature→`feat`, bug→`fix`, chore/research→`chore`, docs→`docs`）
- **slug**: Issue タイトルから生成、小文字ケバブケース、最大40文字、英語のみ

## 日常ワークフロー

1. `develop` から分岐: `git checkout develop && git pull && git checkout -b {type}/{n}-{slug}`
2. コミット（`git-commit-style` ルール参照）
3. プッシュ + PR 作成: `git push -u origin {branch}` → `gh pr create --base develop`
4. レビュー → スカッシュマージ → ブランチ削除

### バッチブランチ

```
{type}/{issue-numbers}-batch-{slug}
```

複数の XS/S Issue をまとめて処理する場合に使用。適格性・品質基準・詳細は `batch-workflow` ルール参照。

**type の決定:** 単一 type → その type を使用。混在 → `chore`。

**例:**
```
chore/794-795-798-807-batch-docs-fixes
feat/101-102-batch-button-components
```

## ホットフィックス

`main` から分岐、`main` への PR、マージ後に `develop` へチェリーピック。

## リリース

`develop` → `main` への PR → マージ後にタグ: `v{major}.{minor}.{patch}`

## ルール

1. 常に `develop` から分岐（最新化してから）
2. 1 Issue 1ブランチ（例外: バッチモードは `batch-workflow` ルール参照）
3. セッション終了前にプッシュ
4. マージには PR が必要（直接プッシュ禁止）
5. **ユーザー承認なしにマージしない**（PreToolUse フックで強制）
6. マージ後にブランチ削除

## 破壊的コマンド保護

PreToolUse フックが以下をブロック: `gh pr merge`, `git push --force`, `git reset --hard`, `git checkout .`, `git restore .`, `git clean -f`, `git branch -D`

- ブロック時はユーザーに承認を求めること
- プロジェクトオーバーライド: `.claude/shirokuma-hooks.json` で `{"disabled": ["rule-id"]}`

## エッジケース

| 状況 | アクション |
|------|----------|
| すでにフィーチャーブランチ | 続行 |
| Issue のブランチが既存 | 切り替え |
| develop に未コミット変更 | スタッシュ後にブランチ作成 |
| develop とコンフリクト | PR 前にリベース |
