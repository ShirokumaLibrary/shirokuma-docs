# GitHub 連携コマンド

GitHub Projects V2、Issues、Discussions を CLI から管理するコマンド群です。

## 設計思想

shirokuma-docs の GitHub コマンドは **1 コマンド = 必要な情報をすべて返す** という設計思想で作られています。

たとえば `issues list` は Issues の一覧に加えて Projects フィールド（Status, Priority, Size）もまとめて返します。通常の `gh` CLI では Issue 一覧と Projects フィールドの取得に複数回のコマンド実行が必要ですが、shirokuma-docs では 1 回で完結します。

これは AI（Claude Code）がコンテキストウィンドウを効率的に使うための設計であると同時に、人間にとっても便利な仕組みです。

---

## issues - Issues 管理

GitHub Issues の作成・更新・一覧取得を行います。Projects V2 のフィールドも統合されています。

**アクション一覧**: `list`, `show`, `create`, `update`, `comment`, `comment-edit`, `close`, `cancel`, `reopen`, `import`, `fields`, `remove`, `pr-comments`, `merge`, `pr-reply`, `resolve`

### Issue の一覧取得

```bash
# オープンな Issue を一覧表示（デフォルト）
shirokuma-docs issues list

# クローズ済みも含めて全件表示
shirokuma-docs issues list --all

# クローズ済みのみ
shirokuma-docs issues list --state closed

# ステータスでフィルタ
shirokuma-docs issues list --status "In Progress" --status "Ready"

# ラベルでフィルタ
shirokuma-docs issues list --labels area:cli

# 取得件数を制限
shirokuma-docs issues list --limit 10

# テーブル形式で出力
shirokuma-docs issues list --format table-json
```

| オプション | 説明 |
|-----------|------|
| `--all` | クローズ済みも含めて全件表示 |
| `--state <state>` | `open`（デフォルト）/ `closed` でフィルタ |
| `--status <status...>` | Projects の Status でフィルタ（複数指定可） |
| `-l, --labels <labels...>` | ラベルでフィルタ（スペース区切りで複数指定可） |
| `--limit <number>` | 取得件数の上限 |
| `--format <format>` | `json`（デフォルト）/ `table-json` |

出力には Projects V2 のフィールド（Status, Priority, Size）が含まれます。

### Issue の詳細取得

```bash
shirokuma-docs issues show 42
```

Issue 本文、ラベル、Projects フィールド、コメントなどの詳細情報を取得します。

### Issue の作成

```bash
shirokuma-docs issues create \
  --title "機能追加: ダッシュボード" \
  --body-file "## 概要\nダッシュボード画面を追加する" \
  --priority High \
  --size M
```

| オプション | 説明 |
|-----------|------|
| `-t, --title <title>` | Issue タイトル |
| `-b, --body-file <body>` | Issue 本文 |
| `--priority <priority>` | Critical / High / Medium / Low |
| `--size <size>` | XS / S / M / L / XL |
| `-s, --field-status <status>` | 初期ステータス（デフォルト: Backlog） |
| `-l, --labels <labels...>` | ラベル（スペース区切りで複数指定可） |

作成された Issue は自動的に GitHub Projects に追加されます。

### Issue の更新

```bash
# ステータスを変更
shirokuma-docs issues update 42 --field-status "In Progress"

# 優先度を変更
shirokuma-docs issues update 42 --priority High

# 本文を更新
shirokuma-docs issues update 42 --body-file /tmp/shirokuma-docs/body.md

# タイトルを変更
shirokuma-docs issues update 42 --title "新しいタイトル"

# ラベルの追加・削除
shirokuma-docs issues update 42 --add-label area:cli area:plugin
shirokuma-docs issues update 42 --remove-label area:cli
```

| オプション | 説明 |
|-----------|------|
| `-s, --field-status <status>` | Projects の Status を変更 |
| `--priority <priority>` | Priority を変更 |
| `--size <size>` | Size を変更 |
| `-t, --title <title>` | タイトルを変更 |
| `-b, --body-file <body>` | 本文を更新 |
| `--add-label <labels...>` | ラベルを追加 |
| `--remove-label <labels...>` | ラベルを削除 |

### Issue にコメント

```bash
shirokuma-docs issues comment 42 --body-file /tmp/shirokuma-docs/comment.md
```

### コメントの編集

既存のコメントを編集します。

```bash
shirokuma-docs issues comment-edit 42 --comment-id IC_xxxxx --body-file /tmp/shirokuma-docs/comment.md
```

| オプション | 説明 |
|-----------|------|
| `--comment-id <id>` | 編集対象のコメント ID |
| `-b, --body-file <body>` | 新しいコメント本文 |

### Issue のクローズ / リオープン

```bash
# 完了としてクローズ（デフォルト）
shirokuma-docs issues close 42

# 対応しないとしてクローズ
shirokuma-docs issues close 42 --state-reason NOT_PLANNED

# クローズ時にコメントを追加
shirokuma-docs issues close 42 --body-file /tmp/shirokuma-docs/reason.md

# リオープン
shirokuma-docs issues reopen 42
```

| オプション | 説明 |
|-----------|------|
| `--state-reason <reason>` | `COMPLETED`（デフォルト）/ `NOT_PLANNED` |
| `-b, --body-file <body>` | クローズ時のコメント |

### Issue のキャンセル

Issue を「対応しない」としてクローズし、Projects の Status を Not Planned に設定します。

```bash
# 理由なしでキャンセル
shirokuma-docs issues cancel 42

# 理由を添えてキャンセル
shirokuma-docs issues cancel 42 --body-file /tmp/shirokuma-docs/reason.md
```

| オプション | 説明 |
|-----------|------|
| `-b, --body-file <body>` | キャンセル理由のコメント |

> `close --state-reason NOT_PLANNED` との違い: `cancel` は Projects の Status も Not Planned に自動更新します。

### Issue のインポート

公開リポジトリから Issue をインポートします。

```bash
# 公開リポジトリの Issue #10 をインポート
shirokuma-docs issues import --from-public 10

# クローズ時に公開リポジトリにもステータスを同期
shirokuma-docs issues import --from-public 10 --sync-public
```

### PR のマージ

> **注意**: このコマンドはデフォルトで `shirokuma-hooks` によりブロックされます。ユーザーの明示的な承認が必要です。

```bash
# スカッシュマージ（デフォルト）
shirokuma-docs issues merge 15

# マージコミット
shirokuma-docs issues merge 15 --merge

# リベースマージ
shirokuma-docs issues merge 15 --rebase

# ブランチを残す
shirokuma-docs issues merge 15 --no-delete-branch
```

### PR コメントの取得

```bash
shirokuma-docs issues pr-comments 15
```

PR のレビューコメント（スレッド）を取得します。未解決・解決済みの両方が含まれます。

### PR コメントへの返信

```bash
shirokuma-docs issues pr-reply 15 --reply-to <database_id> --body-file /tmp/shirokuma-docs/reply.md
```

### レビュースレッドの解決

```bash
shirokuma-docs issues resolve 15 --thread-id <PRRT_id>
```

### Projects からの削除

```bash
shirokuma-docs issues remove 42
```

### フィールド一覧の確認

```bash
shirokuma-docs issues fields
```

Projects V2 で利用可能なフィールドとその選択肢を一覧表示します。

### クロスリポジトリ操作

```bash
# 公開リポジトリの Issue を操作
shirokuma-docs issues list --public

# エイリアスで指定したリポジトリの Issue を操作
shirokuma-docs issues list --repo frontend
```

---

## projects - Projects V2 管理

GitHub Projects V2 の管理コマンドです。

**アクション一覧**: `list`, `get`, `fields`, `create`, `update`, `delete`, `add-issue`, `workflows`, `setup-metrics`

### プロジェクト一覧

```bash
shirokuma-docs projects list
```

### プロジェクトアイテムの取得

```bash
# 特定のアイテムを取得
shirokuma-docs projects get <item-id>

# ステータスでフィルタ
shirokuma-docs projects list --status "In Progress" --status "Ready"

# Done/Released も含めて全件
shirokuma-docs projects list --all
```

### プロジェクトのフィールド一覧

```bash
shirokuma-docs projects fields
```

### プロジェクトアイテムの作成

```bash
shirokuma-docs projects create --title "新しいタスク" --field-status "Backlog"
```

### プロジェクトアイテムの更新

```bash
shirokuma-docs projects update <item-id> --field-status "In Progress" --priority High
```

### プロジェクトアイテムの削除

```bash
shirokuma-docs projects delete <item-id>

# 確認をスキップ
shirokuma-docs projects delete <item-id> -F
```

### Issue をプロジェクトに追加

```bash
shirokuma-docs projects add-issue 42
```

### ワークフロー自動化の確認

GitHub Projects のビルトインワークフロー（Item closed → Done 等）の設定状況を確認します。

```bash
shirokuma-docs projects workflows
```

### メトリクスフィールドのセットアップ

Projects V2 に開発メトリクス用の Text フィールドを追加します。

```bash
shirokuma-docs projects setup-metrics
```

---

## discussions - Discussions 管理

GitHub Discussions の作成・取得・更新・検索を行います。

**アクション一覧**: `categories`, `list`, `get`, `create`, `update`, `search`, `comment`

### カテゴリ一覧

```bash
shirokuma-docs discussions categories
```

### Discussions の一覧

```bash
# 全カテゴリ
shirokuma-docs discussions list

# カテゴリで絞り込み
shirokuma-docs discussions list --category Knowledge

# 件数を制限
shirokuma-docs discussions list --category Handovers --limit 5

# テーブル形式で出力
shirokuma-docs discussions list --format table-json
```

### Discussion の取得

```bash
shirokuma-docs discussions show 30
```

### Discussion の作成

```bash
shirokuma-docs discussions create \
  --category Knowledge \
  --title "Drizzle ORM のベストプラクティス" \
  --body-file "## 概要\n..."
```

### Discussion の更新

```bash
# タイトルを更新
shirokuma-docs discussions update 30 --title "新しいタイトル"

# 本文を更新
shirokuma-docs discussions update 30 --body-file /tmp/shirokuma-docs/body.md
```

### Discussion の検索

```bash
shirokuma-docs discussions search "認証"

# カテゴリ内で検索
shirokuma-docs discussions search "認証" --category Knowledge
```

### Discussion にコメント

```bash
shirokuma-docs discussions comment 30 --body-file /tmp/shirokuma-docs/comment.md
```

---

## search - Issues + Discussions 横断検索

Issues と Discussions を **1 リクエスト**で横断検索します。GraphQL エイリアスを活用して複数の検索を同時実行するため、`issues list` + `discussions search` を別々に呼ぶよりも効率的です。

```bash
# キーワードで横断検索
shirokuma-docs search "認証"

# Issues のみ検索
shirokuma-docs search "バグ" --type issues

# Discussions のみ検索
shirokuma-docs search "パターン" --type discussions

# カテゴリを指定して検索
shirokuma-docs search "セッション" --category Knowledge

# クローズ済み Issues も含める
shirokuma-docs search "認証" --state all

# テーブル形式で出力
shirokuma-docs search "認証" --format table-json
```

| オプション | 説明 |
|-----------|------|
| `--type <types>` | 検索対象: `issues,discussions`（デフォルト）/ `issues` / `discussions` |
| `--category <category>` | Discussions のカテゴリでフィルタ |
| `--state <state>` | Issues の状態フィルタ: `open` / `closed` / `all` |
| `--limit <number>` | 最大取得件数（デフォルト: 10） |
| `--format <format>` | `json`（デフォルト）/ `table-json` |
| `--public` | 公開リポジトリを対象 |
| `--repo <alias>` | クロスリポジトリのエイリアス |

> **`discussions search` との違い**: `discussions search` は Discussions 内のみを検索します。`search` コマンドは Issues と Discussions を 1 リクエストで横断検索し、結果を統合して返します。

---

## github-data - GitHub データ生成

GitHub Issues / Discussions のデータを JSON 形式でファイルに出力します。ポータル生成の入力データとして使用します。

```bash
shirokuma-docs github-data

# 出力先を指定
shirokuma-docs github-data -o docs/data
```

---

## repo - リポジトリ情報

リポジトリの基本情報やラベルを管理します。

### リポジトリ情報

```bash
shirokuma-docs repo info
```

### ラベル一覧

```bash
shirokuma-docs repo labels
```

### ラベル作成

```bash
shirokuma-docs repo labels --create "area:cli" --color "0052cc" --description "CLI 関連"
```

---

## adr - ADR 管理

Architecture Decision Records を GitHub Discussions の ADR カテゴリとして管理します。

### ADR の作成

```bash
shirokuma-docs adr create "認証方式の選定"
```

ADR カテゴリに `ADR-{NNN}: 認証方式の選定` という Discussion を作成します。

### ADR の一覧

```bash
shirokuma-docs adr list

# 件数を制限
shirokuma-docs adr list --limit 10
```

### ADR の取得

```bash
shirokuma-docs adr get 172
```

### クロスリポジトリ対応

```bash
# 公開リポジトリの ADR を操作
shirokuma-docs adr list --public

# エイリアスで指定
shirokuma-docs adr list --repo my-alias
```

---

## discussion-templates - テンプレート生成

GitHub Discussion のテンプレートファイルを生成します。

```bash
# 英語テンプレートを生成
shirokuma-docs discussion-templates generate

# 日本語テンプレートを生成
shirokuma-docs discussion-templates generate -l ja

# 利用可能な言語一覧
shirokuma-docs discussion-templates list-languages

# 新しい言語を追加
shirokuma-docs discussion-templates add-language ko
```

出力先: `.github/DISCUSSION_TEMPLATE/`

---

## repo-pairs - リポジトリペア管理

Private / Public のリポジトリペアを管理し、公開リリースを行います。

詳細は [管理・ユーティリティコマンド > repo-pairs](management.md#repo-pairs---リポジトリペア管理) を参照してください。

---

## クロスリポジトリ操作

他のリポジトリの Issue や Discussion を操作する場合は `--repo` オプションを使います。`--public` を使うと `repoPairs` で設定した公開リポジトリをターゲットにします。

エイリアスは `shirokuma-docs.config.yaml` の `crossRepos` で定義します:

```yaml
crossRepos:
  frontend:
    owner: "my-org"
    repo: "frontend-app"
  backend:
    owner: "my-org"
    repo: "backend-api"
```

```bash
# フロントエンドリポジトリの Issue 一覧
shirokuma-docs issues list --repo frontend

# 公開リポジトリの Discussion を検索
shirokuma-docs discussions search "auth" --public
```

`--repo` と `--public` は `issues`, `discussions`, `adr` の各コマンドで使用できます。
