# プラグイン管理

shirokuma-docs は Claude Code 用の**スキル**（作業パターン）、**ルール**（規約）、**フック**（安全装置）をプラグインとして提供します。このページでは、プラグインの仕組みとインストール・更新方法を説明します。

## プラグインのアーキテクチャ

shirokuma-docs のプラグインは **マーケットプレース経由**で配信されます:

```
shirokuma-docs init / update
  → マーケットプレース登録 (shirokuma-library)
    → GitHub からリモートフェッチ (ShirokumaLibrary/shirokuma-plugins)
      → グローバルキャッシュ (~/.claude/plugins/cache/) に保存
        → Claude Code がここからスキルを読み込む
```

**重要なポイント:**
- Claude Code はグローバルキャッシュからスキルを読み込みます
- プロジェクトローカルへのコピー（`.claude/plugins/`）は不要です
- `update` コマンドで `claude plugin update` を自動実行し、キャッシュを最新化します
- `claude` CLI が利用できない環境では手動同期が必要です（[フォールバック手順](#グローバルキャッシュの手動更新フォールバック)を参照）

## 提供されるプラグイン

| プラグイン名 | 内容 |
|-------------|------|
| `shirokuma-skills-ja` | スキル + ルール（日本語版） |
| `shirokuma-skills-en` | スキル + ルール（英語版） |
| `shirokuma-hooks` | 安全フック（言語非依存） |

`--lang` オプションで選んだ言語に応じて、`-ja` または `-en` 版がインストールされます。`shirokuma-hooks` は言語に関係なく常にインストールされます。

## 初回インストール

### 方法 1: init コマンドで一括インストール（推奨）

```bash
shirokuma-docs init --with-skills --with-rules --lang ja
```

これにより以下が行われます:
1. `shirokuma-docs.config.yaml` の生成
2. マーケットプレース（`shirokuma-library`）の登録
3. GitHub からプラグインをフェッチし、グローバルキャッシュに登録
4. `.claude/rules/shirokuma/` にルールファイルをデプロイ
5. `shirokuma-hooks` プラグインを自動インストール

> **`--with-skills` と `--with-rules` の違い:**
> - `--with-skills` はマーケットプレース経由でスキルプラグインをインストールします
> - `--with-rules` はルールファイル（`.claude/rules/shirokuma/`）をデプロイします
> - ルールはスキルプラグインに同梱されていますが、`.claude/rules/` に展開しないと Claude Code に認識されません。**両方を指定する**のが推奨です
> - `shirokuma-hooks` は `--with-skills` を指定すると自動的にインストールされます

### 方法 2: 手動インストール

```bash
# 1. マーケットプレースを登録
claude plugin marketplace add ShirokumaLibrary/shirokuma-plugins

# 2. プラグインをインストール
claude plugin install shirokuma-skills-ja@shirokuma-library --scope project
claude plugin install shirokuma-hooks@shirokuma-library --scope project

# 3. ルールをデプロイ
shirokuma-docs update-skills --with-rules
```

## プラグインの更新

shirokuma-docs のバージョンアップ後など、プラグインを最新版に更新する手順です。

### 推奨: `update` コマンド

```bash
shirokuma-docs update
```

`update` は `update-skills --sync` の短縮形で、以下を一括で実行します:

1. マーケットプレースの確認・登録
2. `claude plugin update` でグローバルキャッシュを最新化
3. `.claude/rules/shirokuma/` のルールファイルを更新

`claude` CLI が PATH に存在する場合、自動で完了します。ほとんどの場合はこれだけで十分です。

### 詳細オプション: `update-skills`

個別のオプションが必要な場合は `update-skills` を直接使用します:

```bash
shirokuma-docs update-skills --sync
```

| オプション | 説明 |
|-----------|------|
| `--sync` | 新規スキルの追加・旧スキルの削除を検出 |
| `--with-rules` | ルールファイルも更新 |
| `--dry-run` | プレビュー（実際には更新しない） |
| `-f, --force` | ローカルの変更を無視して強制更新 |
| `--install-cache` | グローバルキャッシュを強制更新（`claude plugin uninstall` + `install` を自動実行） |

> `--install-cache` は `update`（`--sync`）使用時に自動実行されるため、通常は明示的に指定する必要はありません。`claude` CLI が利用できず自動同期が失敗した場合に、手動で `claude` CLI を PATH に追加してから `--install-cache` を指定して再実行する用途です。

> 各オプションの詳細は [管理コマンドリファレンス](commands/management.md) を参照してください。

### グローバルキャッシュの手動更新（フォールバック）

`update` の自動同期が失敗した場合（`claude` CLI が見つからない等）のみ、手動でグローバルキャッシュを更新します。

**プラグインのバージョンが変わった場合:**

```bash
claude plugin update shirokuma-skills-ja@shirokuma-library --scope project
claude plugin update shirokuma-hooks@shirokuma-library --scope project
```

**バージョンが同じで内容が変わった場合（`plugin update` が「already at latest」と表示）:**

```bash
# スキルプラグイン
claude plugin uninstall shirokuma-skills-ja@shirokuma-library --scope project
claude plugin install shirokuma-skills-ja@shirokuma-library --scope project

# hooks プラグイン
claude plugin uninstall shirokuma-hooks@shirokuma-library --scope project
claude plugin install shirokuma-hooks@shirokuma-library --scope project
```

### セッション再起動

グローバルキャッシュの更新後、Claude Code を再起動するか**新しいセッションを開始**してください。現在のセッションでは古いキャッシュが使われたままです。

## スキルとは

スキルは、Claude Code に特定の作業パターンを教えるファイルです。`/スキル名` で呼び出せます。

### 主なスキル

**オーケストレーション（エントリーポイント）:**

| スキル | 呼び出し方 | 機能 |
|-------|-----------|------|
| `working-on-issue` | `/working-on-issue #42` | Issue 分析 → スキル選択 → 実行（全作業のエントリーポイント） |
| `planning-on-issue` | `/planning-on-issue #42` | Issue の実装計画を策定 |

**セッション管理:**

| スキル | 呼び出し方 | 機能 |
|-------|-----------|------|
| `starting-session` | `/starting-session` | セッション開始（前回引き継ぎ + Issue 一覧） |
| `ending-session` | `/ending-session` | セッション終了（引き継ぎ保存 + ステータス更新） |

**開発:**

| スキル | 呼び出し方 | 機能 |
|-------|-----------|------|
| `coding-nextjs` | `/coding-nextjs` | Next.js TDD 実装 |
| `designing-shadcn-ui` | `/designing-shadcn-ui` | 印象的な UI / 独自デザイン |
| `reviewing-on-issue` | `/reviewing-on-issue` | コードレビュー・セキュリティ監査 |

**Git / GitHub:**

| スキル | 呼び出し方 | 機能 |
|-------|-----------|------|
| `creating-item` | `/creating-item` | Issue 作成 → working-on-issue に自動チェーン |
| `committing-on-issue` | `/committing-on-issue` | ステージ → コミット → プッシュ |
| `creating-pr-on-issue` | `/creating-pr-on-issue` | PR 作成 + セルフレビュー |
| `showing-github` | `/showing-github` | プロジェクトデータ・ダッシュボード表示 |
| `setting-up-project` | `/setting-up-project` | 新規プロジェクト初期設定（対話式） |

**設定管理（開発者向け）:**

| スキル | 呼び出し方 | 機能 |
|-------|-----------|------|
| `managing-skills` | `/managing-skills` | スキルの作成・更新 |
| `managing-agents` | `/managing-agents` | エージェントの作成・更新 |
| `managing-rules` | `/managing-rules` | ルールの作成・更新 |
| `managing-plugins` | `/managing-plugins` | プラグインの作成・更新 |
| `publishing` | `/publishing` | パブリックリリース（repo-pairs） |

全スキル一覧は `CLAUDE.md` の「Bundled Skills」セクションを参照してください。

## ルールとは

ルールは、Claude Code に従うべき規約を伝えるファイルです。`.claude/rules/` に配置されると自動的に読み込まれます。

### ルールの配置

```
.claude/rules/
├── shirokuma/                  # プラグインからデプロイされたルール
│   ├── best-practices-first.md
│   ├── git-commit-style.md
│   ├── github/
│   │   ├── branch-workflow.md
│   │   └── project-items.md
│   └── nextjs/
│       ├── tech-stack.md
│       └── known-issues.md
└── shirokuma-docs/             # プロジェクト固有のルール（直接編集）
    ├── github-commands.md
    └── config-reference.md
```

| ディレクトリ | 説明 | 編集 | Git 管理 |
|-------------|------|------|----------|
| `shirokuma/` | プラグインからデプロイ（言語設定に基づく） | **編集禁止**（`update-skills` で上書きされる） | `.gitignore` に含まれる |
| `shirokuma-docs/` | プロジェクト固有 | 自由に編集可能 | Git 管理対象 |

> `settings.json` の `language` 設定に基づき、適切な言語のルールが `shirokuma/` にデプロイされます。

## フックとは

フックは、Claude Code の操作前に自動実行されるスクリプトです。`shirokuma-hooks` プラグインに含まれています。

### デフォルトでブロックされるコマンド

| コマンド | 理由 |
|---------|------|
| `gh pr merge` | PR マージは人間の承認が必要 |
| `git push --force` | リモート履歴の上書きを防止 |
| `git reset --hard` | 未コミット変更の消失を防止 |
| `git checkout .` / `git restore .` | 作業内容の消失を防止 |
| `git clean -f` | 未追跡ファイルの削除を防止 |
| `git branch -D` | ブランチの強制削除を防止 |

ブロックされた場合、Claude Code はユーザーに確認を求めます。

### プロジェクトごとのオーバーライド

許可するコマンドを `shirokuma-docs.config.yaml` の `hooks.allow` で指定します:

```yaml
# shirokuma-docs.config.yaml
hooks:
  allow:
    - pr-merge              # gh pr merge / issues merge を許可
    # - force-push          # git push --force
    # - hard-reset          # git reset --hard
    # - discard-worktree    # git checkout/restore .
    # - clean-untracked     # git clean -f
    # - force-delete-branch # git branch -D
```

`hooks.allow` が未設定の場合、全ルールが有効です（全ブロック）。コメントを外すとそのコマンドが許可されます。

## トラブルシューティング

プラグイン関連のよくある問題は [トラブルシューティング](troubleshooting.md#プラグイン関連) を参照してください。
