# エピックワークフロー

エピック（親 Issue + サブ Issue 構成）で大規模作業を進める際の統合リファレンス。

## エピックの識別

エピックは Issue Type ではなく**構造**で判定する。`subIssuesSummary.total > 0` の Issue がエピック。

```bash
shirokuma-docs issues show {number}
# → subIssuesSummary: { total: 3, completed: 1 }
```

Feature エピックも Chore エピックも同一のワークフローで扱える。

## Integration ブランチモデル

```
develop
  └── epic/{issue-number}-{slug}        ← integration ブランチ
        ├── feat/{sub-number}-{slug}     ← サブ Issue ブランチ
        ├── fix/{sub-number}-{slug}
        └── ...
```

| ブランチ | 分岐元 | マージ先 | 用途 |
|----------|--------|----------|------|
| `epic/{number}-{slug}` | `develop` | `develop`（最終 PR） | サブ Issue の統合先 |
| `{type}/{sub-number}-{slug}` | integration ブランチ | integration ブランチ（PR） | 個別サブ Issue の作業 |

### ブランチ命名

- **Integration**: `epic/{親Issue番号}-{slug}`
- **サブ Issue**: 通常の命名規則（`feat/`, `fix/`, `chore/`, `docs/`）

### ライフサイクル

1. エピック Issue の計画で integration ブランチ名を決定
2. `develop` から integration ブランチを作成
3. 各サブ Issue は integration ブランチから分岐
4. サブ Issue の PR は integration ブランチをベースにする
5. 全サブ Issue 完了後、integration ブランチから `develop` への最終 PR を作成
6. 最終 PR マージでエピック → Done

## ベースブランチ自動判定

子 Issue が親を持つ場合（`shirokuma-docs issues show` の `parentIssue` フィールドで検出）、以下の順序で integration ブランチを検出する:

1. **親 Issue の本文から抽出**: `### Integration ブランチ`（JA）/ `### Integration Branch`（EN）ヘッディングを探し、直後のバッククォート内のブランチ名を採用。プレフィックスは `epic/`, `chore/`, `feat/` 等任意
2. **フォールバック（リモートブランチ検索）**: `git branch -r --list "origin/*/{parent-number}-*"` で検索
   - 1件マッチ → 自動採用
   - 複数マッチ → AskUserQuestion でユーザーに選択させる
   - 0件 → `develop` にフォールバック
3. **最終フォールバック**: `develop` をベースにし、ユーザーに警告

```bash
# 親 Issue の計画からブランチ名を取得
shirokuma-docs issues show {parent-number}
# → 本文の「### Integration ブランチ」セクション直後の `chore/958-octokit-migration` を抽出

# フォールバック
git branch -r --list "origin/*/{parent-number}-*"
```

### ベースブランチ誤り時のリカバリー

PR 作成後にベースブランチの誤りが判明した場合、REST API で修正する:

```bash
gh api repos/{owner}/{repo}/pulls/{pr-number} --method PATCH -f base="correct-branch"
```

**注意**: `gh pr edit --base` は Projects classic deprecation エラーで失敗するため使用不可。

## ステータス管理

### エピック Issue のステータス遷移

| イベント | エピック側のアクション |
|---------|---------------------|
| 計画策定完了 | エピック → Spec Review（通常フロー） |
| 最初のサブ Issue が In Progress | エピック → In Progress |
| サブ Issue の PR マージ | エピックは In Progress を維持（`subIssuesSummary` を確認するが遷移しない） |
| integration → develop の最終 PR マージ | エピック → Done |
| 一部サブ Issue がブロック | エピック → Pending（手動、理由をコメント） |

### サブ Issue のステータス遷移

サブ Issue は通常の `project-items` ルールに従う。唯一の違いは PR のベースブランチが integration ブランチになること。

### `session end` 運用ガイダンス

`ending-session` のセーフティネットはエピック構造を認識しない。サブ Issue が未完了でもエピック Issue に対して `--done` を使うと Done に遷移してしまうリスクがある。

| 状況 | 推奨操作 |
|------|---------|
| サブ Issue 作業のセッション終了 | `session end --review {sub-issue-number}` でサブ Issue のみ更新 |
| 全サブ Issue 完了・最終 PR マージ後 | `session end --done {epic-number}` でエピックを Done に |
| サブ Issue が残っている状態 | エピック Issue に `--done` を使わない。手動で In Progress を維持 |

## `Closes #N` の動作とベースブランチ

GitHub のネイティブ動作では、`Closes #N` はデフォルトブランチ（`develop`）向け PR でのみ自動クローズとサイドバーリンクが機能する。integration ブランチをベースにした PR では:

| 機能 | 動作 |
|------|------|
| GitHub サイドバーの Issue リンク | **表示されない**（制限事項） |
| `Closes #N` による自動クローズ | **動作しない** |
| shirokuma-docs CLI `issues merge` | **正常動作**（`parseLinkedIssues()` が PR 本文を独自解析） |

サブ Issue の PR でも `Closes #N` を使用する。GitHub サイドバーにリンクが表示されない制限は受容し、CLI が代替する。

## PR-Issue リンクグラフ

エピック構成では PR と Issue が多対多の関係になりうる。`issues merge` は PR 本文から関連 Issue を解析し、リンクの複雑さに応じて振る舞いを分ける。

| パターン | 説明 | CLI の動作 |
|---------|------|----------|
| 1:1 | 1 PR → 1 Issue | 自動処理（`Closes #N` → Status Done） |
| 1:N | 1 PR → 複数 Issue | 自動処理（各 Issue を Done に） |
| N:1 | 複数 PR → 1 Issue | 自動処理（最後の PR マージで Done に） |
| N:N | 複数 PR ↔ 複数 Issue | エラーで停止、構造化出力で AI にフォールバック |

### N:N 検出の流れ

1. 対象 PR の本文から `Closes/Fixes/Resolves #N` を解析
2. 関連 Issue それぞれについて、他にリンクされている PR を検索
3. リンクグラフが単純（1:1, 1:N, N:1）なら自動処理
4. N:N を検出したらエラーで停止し、関連 PR/Issue のリストを構造化出力

## エピック計画テンプレート

`planning-on-issue` が `subIssuesSummary.total > 0` を検出した場合に使用する拡張テンプレート:

```markdown
## 計画

### アプローチ
{全体方針}

### Integration ブランチ
`epic/{number}-{slug}`

### サブ Issue 構成

| # | Issue | 内容 | 依存 | サイズ |
|---|-------|------|------|--------|
| 1 | #{sub1} | {概要} | — | S |
| 2 | #{sub2} | {概要} | #{sub1} | M |

### 実行順序
{依存関係に基づく推奨順序}

### タスク分解
- [ ] Integration ブランチ作成
- [ ] #{sub1}: {タスク概要}
- [ ] #{sub2}: {タスク概要}
- [ ] 最終 PR: integration → develop

### リスク・懸念
- {サブ Issue 間の依存リスク}
```

## スコープ外（フォローアップ）

以下は今回のスコープに含まず、別 Issue で対応する:

- `starting-session` / `showing-github` でのエピック進捗表示（サブ Issue サマリーの可視化）
- `ending-session` のエピック認識（サブ Issue 未完了時のエピックステータス保護の自動化）
