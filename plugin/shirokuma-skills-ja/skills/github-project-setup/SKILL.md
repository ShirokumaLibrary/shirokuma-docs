---
name: github-project-setup
description: GitHub ProjectのStatus、Priority、Type、Sizeフィールド初期設定を自動化します。「project setup」「プロジェクト作成」「GitHub Project初期設定」、カンバンワークフローで新規プロジェクト開始時に使用。
allowed-tools: Bash, Read, Glob
---

# GitHub プロジェクトセットアップ

GitHub Project の初期設定を自動化。Status ワークフロー、Priority、Type、Size カスタムフィールドを含む。

## いつ使うか

- 新しい GitHub Project を作成する場合
- カンバンワークフローをセットアップする場合
- 「project setup」「プロジェクト作成」「GitHub Project 初期設定」

## ワークフロー

### ステップ 1: 権限確認

```bash
gh auth status
```

権限が不足している場合、以下を実行するよう案内:

```bash
gh auth refresh -s project,read:project
```

### ステップ 2: リポジトリ情報取得

```bash
OWNER=$(gh repo view --json owner -q '.owner.login' 2>/dev/null)
REPO=$(gh repo view --json name -q '.name' 2>/dev/null)
```

### ステップ 3: プロジェクト作成

```bash
PROJECT_NAME="${1:-$REPO}"
gh project create --owner $OWNER --title "$PROJECT_NAME" --format json
```

### ステップ 4: リポジトリにリンク

```bash
gh project link $PROJECT_NUMBER --owner $OWNER --repo $OWNER/$REPO
```

リポジトリの Projects タブからアクセス可能になる。

### ステップ 5: フィールド ID 取得

```bash
PROJECT_NUMBER=$(gh project list --owner $OWNER --format json | jq -r '.projects[0].number')
FIELD_ID=$(gh project field-list $PROJECT_NUMBER --owner $OWNER --format json | jq -r '.fields[] | select(.name=="Status") | .id')
PROJECT_ID=$(gh project view $PROJECT_NUMBER --owner $OWNER --format json | jq -r '.id')
```

### ステップ 6: 全フィールド設定

会話から言語を自動検出してセットアップスクリプトを使用:

```bash
python scripts/setup-project.py \
  --lang={en|ja} \
  --field-id=$FIELD_ID \
  --project-id=$PROJECT_ID
```

**作成されるフィールド**:

| フィールド | オプション |
|-----------|-----------|
| Status | Icebox → Backlog → Spec Review → Ready → In Progress ⇄ Pending → Review → Testing → Done / Not Planned → Released |
| Priority | Critical / High / Medium / Low |
| Type | Feature / Bug / Chore / Docs / Research |
| Size | XS / S / M / L / XL |

[scripts/setup-project.py](scripts/setup-project.py) に言語辞書あり。

### ステップ 7: Issue Types セットアップ

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

### ステップ 8: ラベルセットアップ（任意）

デフォルトラベルを整理し、プロジェクト構造に合わせたエリアラベルを作成。

1. **重複ラベルを削除**: Type フィールドと重複するもの（bug, enhancement, documentation）
2. **該当しないラベルを削除**: good first issue, help wanted, question
3. **エリアラベルを作成**: プロジェクトのモジュール構造に合わせて

```bash
gh label create "area:{module}" --color "{color}" --description "{description}"
```

**運用ラベルは保持**: `duplicate`, `invalid`, `wontfix`（ライフサイクル/トリアージ用）。

詳細は [reference/labels.md](reference/labels.md) 参照。

### ステップ 9: ビルトイン自動化の有効化

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

### ステップ 10: 結果報告

完了後に表示:

- プロジェクト名と URL
- 設定された Status 一覧
- 追加されたカスタムフィールド
- ラベルサマリー（削除/作成件数）

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
- 10ステップのため `TodoWrite` で進捗管理
- 既存プロジェクトがある場合は `AskUserQuestion` で上書き確認
- 権限リフレッシュにはインタラクティブモードが必要（ユーザーが手動実行）
- 言語は会話から自動検出（日本語または英語）
- AI 開発では、時間見積もりより Size（工数）が有用
- XL タスクはより小さなタスクに分割すべき

## 関連リソース

- [scripts/setup-project.py](scripts/setup-project.py) - 言語辞書付きセットアップスクリプト
- [reference/status-options.md](reference/status-options.md) - ステータスワークフローと定義
- [reference/custom-fields.md](reference/custom-fields.md) - カスタムフィールド定義
- [reference/issue-types.md](reference/issue-types.md) - Issue Types セットアップとマイグレーションガイド
- [reference/labels.md](reference/labels.md) - ラベル分類体系とセットアップガイド
