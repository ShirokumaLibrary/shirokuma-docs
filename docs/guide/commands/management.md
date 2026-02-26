# 管理・ユーティリティコマンド

プロジェクトの初期化、スキル・ルールの更新、リポジトリペア管理など、shirokuma-docs 自体の管理を行うコマンドです。

> **関連コマンド**: ドキュメントの一括生成（`generate`）と LLM 最適化 Markdown 管理（`md`）については [ドキュメント生成コマンド](generation.md) を参照してください。

---

## init - プロジェクトの初期化

設定ファイルの生成と、オプションでスキル・ルール・安全フックのインストールを行います。

```bash
# 設定ファイルのみ生成
shirokuma-docs init

# スキル・ルール・フック付きの初期化（推奨）
shirokuma-docs init --with-skills --with-rules --lang ja

# Next.js モノレポのスキャフォールドも同時に実行
shirokuma-docs init --nextjs --with-skills --with-rules --lang ja
```

### オプション

| オプション | 省略形 | 説明 |
|-----------|--------|------|
| `--with-skills [skills]` | | スキルをインストール（カンマ区切りで指定、または全スキル） |
| `--with-rules` | | ルールファイルを `.claude/rules/shirokuma/` にデプロイ |
| `--lang <lang>` | | 言語設定（`en` / `ja`）。`.claude/settings.json` に書き込み |
| `--nextjs` | | Next.js モノレポ構造をスキャフォールド（`apps/`, `packages/` 等） |
| `--project <path>` | `-p` | プロジェクトパス（デフォルト: カレントディレクトリ） |
| `--force` | `-f` | スキル・ルールを強制再デプロイ |
| `--no-gitignore` | | `.gitignore` の自動更新をスキップ |
| `--verbose` | `-v` | 詳細ログを出力 |

### 生成されるファイル

```
your-project/
├── shirokuma-docs.config.yaml    # 設定ファイル
└── .claude/                       # --with-skills / --with-rules 指定時
    ├── settings.json             # 言語設定（--lang 指定時）
    └── rules/
        └── shirokuma/            # ルール（--with-rules 指定時）
```

`--with-skills` 指定時はマーケットプレース経由でグローバルキャッシュ（`~/.claude/plugins/cache/`）にスキルプラグインと安全フックがインストールされます。

> `--with-skills` と `--with-rules` の両方を指定するのが推奨です。ルールはスキルプラグインに同梱されていますが、`.claude/rules/` に展開しないと Claude Code に認識されません。

### `--nextjs` オプション（Next.js モノレポスキャフォールド）

`--nextjs` を指定すると、設定ファイルの生成に加えて Next.js モノレポのディレクトリ構造をスキャフォールドします。

```
your-project/
├── apps/
│   └── web/          # Next.js アプリ（create-next-app 相当）
├── packages/
│   └── database/     # 共有 Drizzle ORM パッケージ
├── pnpm-workspace.yaml
└── shirokuma-docs.config.yaml
```

`git init` も自動実行されます。スタックの詳細なセットアップ（認証、DB、インフラ等）は、Claude Code の `/setting-up-project` スキルがガイドします。

---

## update - スキル・ルール・フックの一括更新

`update-skills --sync` の短縮形です。マーケットプレース経由でグローバルキャッシュの更新とルールの同期を一括で実行します。

```bash
shirokuma-docs update
```

### 実行される処理

1. マーケットプレース（`shirokuma-library`）の確認・登録
2. `claude plugin update` でグローバルキャッシュを最新化
3. `.claude/rules/shirokuma/` のルールファイルを更新

### オプション

| オプション | 省略形 | 説明 |
|-----------|--------|------|
| `--project <path>` | `-p` | プロジェクトパス（デフォルト: カレントディレクトリ） |
| `--dry-run` | | プレビュー（実際には更新しない） |
| `--force` | `-f` | ローカル変更を無視して強制更新 |
| `--yes` | | 削除操作を確認なしで実行 |
| `--install-cache` | | グローバルキャッシュを強制更新 |
| `--verbose` | `-v` | 詳細ログを出力 |

### 使い方の例

```bash
# 通常の更新
shirokuma-docs update

# 変更内容をプレビュー
shirokuma-docs update --dry-run

# ローカルの変更を無視して強制更新
shirokuma-docs update --force
```

---

## update-skills - スキル・ルールの詳細更新

`update` よりも細かい制御が必要な場合に使用します。

```bash
shirokuma-docs update-skills --sync
```

### オプション

| オプション | 省略形 | 説明 |
|-----------|--------|------|
| `--sync` | | 新規スキルの追加・旧スキルの削除を検出（ルール同期も含む） |
| `--skills <skills>` | | 更新するスキルをカンマ区切りで指定 |
| `--with-rules` | | ルールファイルも更新 |
| `--dry-run` | | プレビュー（実際には更新しない） |
| `--force` | `-f` | ローカル変更を無視して強制更新 |
| `--yes` | | 削除操作を確認なしで実行 |
| `--install-cache` | | グローバルキャッシュを強制更新（`claude plugin uninstall` + `install` を自動実行） |
| `--project <path>` | `-p` | プロジェクトパス（デフォルト: カレントディレクトリ） |
| `--verbose` | `-v` | 詳細ログを出力 |

### `update` との違い

| 機能 | `update` | `update-skills` |
|------|----------|-----------------|
| マーケットプレース確認・登録 | 常に実行 | `--sync` 指定時 |
| グローバルキャッシュ更新 | 常に実行 | `--install-cache` 指定時のみ |
| ルール同期 | 常に実行 | `--sync` または `--with-rules` 指定時 |
| 特定スキルのみ更新 | 不可 | `--skills` で指定可能 |

### 使い方の例

```bash
# 特定のスキルのみ更新
shirokuma-docs update-skills --skills working-on-issue,ending-session

# ルールのみ更新
shirokuma-docs update-skills --with-rules

# 全スキル同期 + グローバルキャッシュ強制更新
shirokuma-docs update-skills --sync --install-cache
```

---

## repo-pairs - リポジトリペア管理

Private / Public のリポジトリペアを管理し、公開リリースを行います。Private リポジトリで開発し、Public リポジトリに公開リリースするワークフローに使用します。

**アクション一覧**: `list`, `init`, `status`, `release`

### ペア一覧

```bash
shirokuma-docs repo-pairs list
```

### ペアの初期化

```bash
shirokuma-docs repo-pairs init my-project \
  --private org/my-project \
  --public org-public/my-project \
  --exclude ".env*" "internal/"
```

| オプション | 説明 |
|-----------|------|
| `--private <repo>` | Private リポジトリ（`owner/name` 形式） |
| `--public <repo>` | Public リポジトリ（`owner/name` 形式） |
| `--exclude <patterns...>` | リリース時の除外パターン |

### リリースステータス確認

```bash
shirokuma-docs repo-pairs status my-project
```

Private と Public のリポジトリ間の差分を確認します。

### リリース実行

```bash
# ドライラン（プレビューのみ）
shirokuma-docs repo-pairs release my-project --tag v1.0.0 --dry-run

# 本番リリース
shirokuma-docs repo-pairs release my-project --tag v1.0.0
```

| オプション | 説明 |
|-----------|------|
| `--tag <version>` | リリースタグ（`v1.0.0` 等） |
| `--dry-run` | 変更せずにプレビュー |
| `--verbose` | 詳細ログ出力 |

> リリース時は `.shirokumaignore` ファイルと設定の `exclude` パターンで除外ファイルを制御できます。Claude Code の `publishing` スキル（`/publishing`）を使うとリリースフロー全体を自動化できます。
