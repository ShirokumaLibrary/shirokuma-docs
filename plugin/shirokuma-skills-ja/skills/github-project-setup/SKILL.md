---
name: github-project-setup
description: GitHub ProjectのStatus、Priority、Type、Sizeフィールド初期設定を自動化します。「project setup」「プロジェクト作成」「GitHub Project初期設定」、カンバンワークフローで新規プロジェクト開始時に使用。
allowed-tools: Bash, Read, Glob
---

# GitHub プロジェクトセットアップ

GitHub Project の初期設定を実施。`create-project` コマンドで自動化可能な範囲を一括実行し、API 未対応の手動設定をガイドする。

## いつ使うか

- 新しい GitHub Project を作成する場合
- カンバンワークフローをセットアップする場合
- 「project setup」「プロジェクト作成」「GitHub Project 初期設定」

## 責務分担

| レイヤー | 責務 | 内容 |
|---------|------|------|
| `create-project` コマンド | API で自動化できる操作を一括実行 | Project 作成、リポジトリリンク、Discussions 有効化、フィールド設定、ラベル作成 |
| このスキル | コマンド実行 + 手動設定のガイド + 検証 | `create-project` の実行、Discussion カテゴリ作成案内、ワークフロー有効化案内、検証 |

## ワークフロー

### ステップ 1: 権限確認

```bash
gh auth status
```

権限が不足している場合、以下を実行するよう案内:

```bash
gh auth refresh -s project,read:project
```

### ステップ 2: プロジェクト作成（自動化）

`create-project` コマンドで以下を一括実行:

```bash
shirokuma-docs projects create-project --title "{プロジェクト名}" --lang={en|ja}
```

**自動実行される内容:**

| 操作 | 詳細 |
|------|------|
| Project 作成 | GitHub Projects V2 を作成 |
| リポジトリリンク | Projects タブからアクセス可能に |
| Discussions 有効化 | リポジトリで Discussions を有効化 |
| フィールド設定 | Status, Priority, Type, Size の全オプションを設定 |
| ラベル作成 | 必須ラベル 5 種（feature, bug, chore, docs, research）を作成 |

**作成されるフィールド:**

| フィールド | オプション |
|-----------|-----------|
| Status | Icebox → Backlog → Spec Review → Ready → In Progress ⇄ Pending → Review → Testing → Done / Not Planned → Released |
| Priority | Critical / High / Medium / Low |
| Type | Feature / Bug / Chore / Docs / Research |
| Size | XS / S / M / L / XL |

> **Note:** `--lang` はフィールドの説明文（description）のみ翻訳する。オプション名（Backlog, Critical 等）は CLI コマンド互換性のため常に英語。

**ラベル確認（任意）:**

コマンド完了後、必要に応じてラベルを整理:

1. **必須ラベルの存在確認**: `shirokuma-docs repo labels list` で 5 種が存在することを確認
2. **不要ラベルの整理**（任意）: Type フィールドと重複するもの（enhancement, documentation）や該当しないもの（good first issue, help wanted, question）を削除
3. **エリアラベルの作成**（任意）: プロジェクトのモジュール構造に合わせて `area:` プレフィックス付きラベルを追加

**運用ラベルは保持**: `duplicate`, `invalid`, `wontfix`（ライフサイクル/トリアージ用）。

詳細は [reference/labels.md](reference/labels.md) 参照。

### ステップ 3: Discussion カテゴリ作成（手動）

Discussion カテゴリの作成は GitHub API 未対応のため、GitHub UI で手動作成をガイドする。

**ユーザーをガイド:**

1. `https://github.com/{owner}/{repo}/settings` に移動（Discussions セクション）
2. 以下の 4 カテゴリを作成:

| カテゴリ | Emoji | Format | 用途 |
|---------|-------|--------|------|
| Handovers | 🔄 | Open-ended discussion | セッション間の引き継ぎ記録 |
| ADR | 📋 | Open-ended discussion | Architecture Decision Records |
| Knowledge | 📚 | Open-ended discussion | 確認されたパターン・解決策 |
| Research | 🔍 | Open-ended discussion | 調査が必要な事項 |

**重要**: Format は必ず **Open-ended discussion** を選択する。Announcement や Poll ではない。

### ステップ 4: Issue Types セットアップ

GitHub Issue Types は組織レベルの設定（プロジェクトレベルではない）。GitHub UI で組織オーナーが設定。

**注意**: Issue Types は組織リポジトリでのみ利用可能。個人リポジトリでは不可。

**既に設定済みか確認:**

ユーザーに確認: 「組織で Issue Types は設定済みですか?（Settings → Issue Types）」

**未設定の場合、ガイド:**

1. `https://github.com/organizations/{org}/settings/issue-types` に移動
2. デフォルトタイプ（既存）: Task, Bug, Feature
3. カスタムタイプを追加:

| タイプ | 説明 | 色 |
|--------|------|----|
| Chore | メンテナンス、設定、ツール、リファクタリング | Gray |
| Docs | ドキュメント改善・追加 | Blue |
| Research | 調査、スパイク、探索 | Purple |

**重要**: Issue Types は組織全体の設定。組織内の全リポジトリで共有される。このステップは組織ごとに1回のみ必要。

詳細は [reference/issue-types.md](reference/issue-types.md) 参照。

### ステップ 5: ビルトイン自動化の有効化

プロジェクトの推奨自動化を有効化。API では設定不可 — GitHub UI をガイド。

**推奨ワークフロー:**

| ワークフロー | ターゲットステータス | 用途 |
|-------------|-------------------|------|
| Item closed | Done | Issue クローズ時に自動 Done |
| Pull request merged | Done | PR マージ時に自動 Done |

**現在の状態を確認:**

```bash
shirokuma-docs projects workflows
```

**ユーザーをガイド:**

1. `https://github.com/orgs/{owner}/projects/{number}/settings/workflows` に移動
2. "Item closed" を有効化 → ターゲットを **Done** に設定
3. "Pull request merged" を有効化 → ターゲットを **Done** に設定

**注意**: `session end --review` CLI コマンドとこれらの自動化は冪等に協調動作。両方有効でも競合しない。

### ステップ 6: セットアップ検証

全ステップの完了を検証:

```bash
shirokuma-docs session check --setup
```

**検証項目:**

| 項目 | 内容 |
|------|------|
| Discussion カテゴリ | Handovers, ADR, Knowledge, Research の存在 |
| Project | Project の存在 |
| 必須フィールド | Status, Priority, Type, Size の存在 |
| ワークフロー自動化 | Item closed → Done, PR merged → Done の有効状態 |

未設定の項目がある場合、推奨設定（Description, Emoji, Format）が表示される。

## ステータスワークフロー

**通常フロー**:

Icebox → Backlog → Spec Review → Ready → In Progress → Review → Testing → Done / Not Planned → Released

**例外フロー**:

| パターン | フロー | 説明 |
|---------|--------|------|
| 要件不明確 | Spec Review → Backlog | 再検討が必要 |
| ブロック | Any → Pending → 元のステータス | 一時保留（理由必須） |
| レビューフィードバック | Review → In Progress | 修正が要求された |
| テスト失敗 | Testing → In Progress | バグ修正が必要 |
| シンプルなタスク | Backlog → Ready | 要件が明確なら Spec Review をスキップ |

**運用ルール**:

1. 1人あたり In Progress は1つ（WIP 制限）
2. Pending に移動する際は理由を必ず記録
3. 1週間以上同じステータスのタスクをレビュー
4. Ready キューにアクション可能なタスクを補充

## エラーハンドリング

| エラー | 対処 |
|--------|------|
| `missing scopes [project]` | `gh auth refresh -s project,read:project` を実行 |
| `Project already exists` | 既存プロジェクトの URL を表示 |
| `Owner not found` | `--owner` オプションを明示的に使用 |

## 注意事項

- **プロジェクト名規約**: プロジェクト名 = リポジトリ名（例: repo `shirokuma-docs` → project `shirokuma-docs`）。CLI の `getProjectId()` がリポジトリ名で検索するため
- 6ステップのため `TodoWrite` で進捗管理
- 既存プロジェクトがある場合は `AskUserQuestion` で上書き確認
- 権限リフレッシュにはインタラクティブモードが必要（ユーザーが手動実行）
- 言語は会話から自動検出（日本語または英語）
- AI 開発では、時間見積もりより Size（工数）が有用
- XL タスクはより小さなタスクに分割すべき

## 関連リソース

- `shirokuma-docs projects create-project` - プロジェクト一括作成コマンド
- `shirokuma-docs projects setup` - フィールド設定コマンド（`create-project` が内部で使用）
- `shirokuma-docs session check --setup` - セットアップ検証コマンド
- [reference/status-options.md](reference/status-options.md) - ステータスワークフローと定義
- [reference/custom-fields.md](reference/custom-fields.md) - カスタムフィールド定義
- [reference/issue-types.md](reference/issue-types.md) - Issue Types セットアップとマイグレーションガイド
- [reference/labels.md](reference/labels.md) - ラベル分類体系とセットアップガイド
