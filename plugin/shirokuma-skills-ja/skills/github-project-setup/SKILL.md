---
name: github-project-setup
description: GitHub ProjectのStatus、Priority、Sizeフィールド初期設定を自動化します。「project setup」「プロジェクト作成」「GitHub Project初期設定」「初期セットアップ」「プロジェクトのセットアップ」、カンバンワークフローで新規プロジェクト開始時に使用。
allowed-tools: Bash, Read, Glob
---

# GitHub プロジェクトセットアップ

GitHub Project の初期設定を実施。`create-project` コマンドで自動化可能な範囲を一括実行し、API 未対応の手動設定をガイドする。

## いつ使うか

- 新しい GitHub Project を作成する場合
- カンバンワークフローをセットアップする場合
- 「project setup」「プロジェクト作成」「GitHub Project 初期設定」「初期セットアップ」「プロジェクトのセットアップ」

## 責務分担

| レイヤー | 責務 | 内容 |
|---------|------|------|
| `create-project` コマンド | API で自動化できる操作を一括実行 | Project 作成、リポジトリリンク、Discussions 有効化、フィールド設定 |
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
| フィールド設定 | Status, Priority, Size の全オプションを設定 |

**作成されるフィールド:**

| フィールド | オプション |
|-----------|-----------|
| Status | Icebox → Backlog → Planning → Spec Review → Ready → In Progress ⇄ Pending → Review → Testing → Done / Not Planned → Released |
| Priority | Critical / High / Medium / Low |
| Size | XS / S / M / L / XL |

> **Note:** `--lang` はフィールドの説明文（description）のみ翻訳する。オプション名（Backlog, Critical 等）は CLI コマンド互換性のため常に英語。

### ステップ 3: Issue Types 設定（手動）

Organization の Issue Types にカスタムタイプを追加する。デフォルトの Feature / Bug / Task に加えて:

| タイプ | 用途 | 色 | アイコン |
|--------|------|-----|---------|
| Chore | 設定・ツール・リファクタリング | Gray | ⚙️ (gear) |
| Docs | ドキュメント | Blue | 📄 (page facing up) |
| Research | 調査・検証 | Purple | 🔍 (magnifying glass) |

**ユーザーをガイド:**

1. `https://github.com/organizations/{org}/settings/issue-types` に移動
2. 「Create new type」で上記 3 タイプを追加

追加後、Projects V2 の Type フィールドで自動的に選択可能になる。

### ステップ 4: Discussion カテゴリ作成（手動）

Discussion カテゴリの作成は GitHub API 未対応のため、GitHub UI で手動作成をガイドする。

**ユーザーをガイド:**

1. `https://github.com/{owner}/{repo}/discussions/categories` に移動
2. 以下の 4 カテゴリを作成:

| カテゴリ | Emoji | 検索テキスト | 色 | Format | 用途 |
|---------|-------|-------------|-----|--------|------|
| Handovers | 🤝 | handshake | Purple | Open-ended discussion | セッション間の引き継ぎ記録 |
| ADR | 📐 | triangular ruler | Blue | Open-ended discussion | Architecture Decision Records |
| Knowledge | 💡 | light bulb | Yellow | Open-ended discussion | 確認されたパターン・解決策 |
| Research | 🔬 | microscope | Green | Open-ended discussion | 調査が必要な事項 |

**重要**: Format は必ず **Open-ended discussion** を選択する。Announcement や Poll ではない。

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

**`projects workflows` の結果に応じたガイド:**

| 結果パターン | アクション |
|-------------|----------|
| 推奨 2 件とも ON | 確認済み — 追加操作不要 |
| 一部のみ ON | OFF のワークフローを有効化するよう案内 |
| 全て OFF | 以下の手順で 2 件を有効化 |

**手順:**

1. `https://github.com/orgs/{owner}/projects/{number}/workflows` に移動
2. "Item closed" を有効化 → ターゲットを **Done** に設定
3. "Pull request merged" を有効化 → ターゲットを **Done** に設定

**その他のビルトインワークフロー:**

| ワークフロー | 推奨 | 理由 |
|-------------|------|------|
| Item added to project | OFF | ステータスは CLI が管理するため自動設定不要 |
| Item reopened | OFF | 再開時のステータスはケースバイケースで手動判断 |
| Auto-close issue | OFF | CLI の Not Planned ステータス設定と競合する可能性 |
| Auto-archive items | OFF | Done アイテムの履歴参照が困難になる |
| Auto-add to project | 任意 | リポジトリの全 Issue を自動追加したい場合は ON |

**注意**: `session end --review` CLI コマンドとこれらの自動化は冪等に協調動作。両方有効でも競合しない。

### ステップ 6: View 名のリネーム（手動）

GitHub Projects V2 の GraphQL API には View を操作する mutation が存在しない。GitHub UI で手動リネームをガイドする。

**推奨 View 名:**

| レイアウト | 推奨名 | 用途 |
|-----------|--------|------|
| TABLE | Board | 全アイテム一覧（デフォルト） |
| BOARD | Kanban | Status でグルーピングしたカンバン |
| ROADMAP | Roadmap | タイムライン表示 |

**ユーザーをガイド:**

1. Project ページを開く
2. View タブの「View 1」をダブルクリック（またはドロップダウン → Rename）
3. 上記の推奨名にリネーム

### ステップ 7: セットアップ検証

全ステップの完了を検証:

```bash
shirokuma-docs session check --setup
```

**検証項目:**

| 項目 | 内容 |
|------|------|
| Discussion カテゴリ | Handovers, ADR, Knowledge, Research の存在 |
| Project | Project の存在 |
| 必須フィールド | Status, Priority, Size の存在 |
| ワークフロー自動化 | Item closed → Done, PR merged → Done の有効状態 |

未設定の項目がある場合、推奨設定（Description, Emoji, Format）が表示される。

### ステップ 8: 次のステップ — 開発環境構築

GitHub Project のセットアップが完了したら、開発環境の構築に進む。プロジェクト構成を決定し、Next.js アプリを作成する。

**構成の選択:**

| 構成 | 適用場面 | ディレクトリ |
|------|---------|-------------|
| シンプル | 単一アプリ、小〜中規模 | リポジトリルートに直接配置 |
| モノレポ | 複数アプリ・共有パッケージ | `apps/web`, `packages/shared` 等 |

**既知の注意点:**

| 問題 | 対策 |
|------|------|
| `create-next-app` が `.claude/` や `README.md` と競合 | サブディレクトリ（例: `tmp-app`）に作成し、必要なファイルをルートに移動する |
| pnpm 未インストール | `corepack enable` を実行（sudo 不要、Node.js 組み込み） |
| `.env` の設定漏れ | 下記テンプレートを参考に `.env.local` を作成 |

**`.env.local` テンプレート（主要変数）:**

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
BETTER_AUTH_SECRET="<32文字以上のランダム文字列>"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> このステップはガイダンスのみ。自動化は行わない。プロジェクトの技術スタックに合わせて適宜調整すること。

## ステータスワークフロー

**通常フロー**:

Icebox → Backlog → Planning → Spec Review → Ready → In Progress → Review → Testing → Done / Not Planned → Released

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
- 8ステップのため `TodoWrite` で進捗管理
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
- [reference/labels.md](reference/labels.md) - ラベル分類体系とセットアップガイド
