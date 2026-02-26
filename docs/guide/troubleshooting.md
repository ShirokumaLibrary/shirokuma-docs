# トラブルシューティング

よくある問題と対処法をまとめています。

## インストール関連

### `shirokuma-docs: command not found`

**原因**: パスが通っていないか、インストールが完了していない。

**対処法**:

```bash
# npm グローバルインストールの場合
npm list -g @shirokuma-library/shirokuma-docs

# ワンライナーインストールの場合、~/.local/bin がパスに含まれているか確認
echo $PATH | tr ':' '\n' | grep local

# パスに含まれていない場合
export PATH="$HOME/.local/bin:$PATH"
# 永続化するには ~/.bashrc または ~/.zshrc に追加
```

### GitHub 認証エラー

**原因**: `GITHUB_TOKEN` が未設定、または `gh auth login` が完了していない。

**対処法（推奨）**:

```bash
# GITHUB_TOKEN 環境変数を設定（gh CLI 不要）
export GITHUB_TOKEN="ghp_xxxxx"
```

必要なスコープ: `repo`, `read:project`, `project`

**対処法（フォールバック）**:

```bash
# gh CLI がインストール済みの場合
gh auth login
gh auth refresh -s read:project,project
```

---

## プラグイン関連

### 新しいスキルがスキルリストに表示されない

**原因**: グローバルキャッシュが更新されていない。

**対処法**:

```bash
shirokuma-docs update
```

`update` がグローバルキャッシュの自動同期も行います。更新後は Claude Code を再起動またはセッションを再開してください。

自動同期が失敗する場合は [プラグイン管理 > グローバルキャッシュの手動更新](plugins.md#グローバルキャッシュの手動更新フォールバック) を参照してください。

### `plugin update` が「already at latest」と表示される

**原因**: プラグインのバージョン番号が同じ。`plugin update` はバージョン番号で判断するため、同一バージョンでは更新されない。

**対処法**:

uninstall → install で強制更新:

```bash
claude plugin uninstall shirokuma-skills-ja@shirokuma-library --scope project
claude plugin install shirokuma-skills-ja@shirokuma-library --scope project
```

### あるプロジェクトでスキルが動くが別のプロジェクトでは動かない

**原因**: プラグインのスコープが異なる可能性。

**対処法**:

```bash
# プロジェクトスコープで確認
claude plugin list --scope project

# ユーザースコープで確認
claude plugin list --scope user
```

必要に応じてスコープを変更してインストール:

```bash
claude plugin install shirokuma-skills-ja@shirokuma-library --scope project
```

### フックがブロックして操作できない

**原因**: `shirokuma-hooks` プラグインの安全フックが破壊的コマンドをブロックしている。

**対処法（正常な動作の場合）**:

ブロックされたということは、実行しようとしたコマンドが危険な操作です。本当に実行する必要がある場合は、ユーザーが手動で実行してください。

**対処法（特定ルールを無効化したい場合）**:

`shirokuma-docs.config.yaml` の `hooks.allow` で許可するコマンドを指定します:

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

未設定時は全ルールが有効です（全ブロック）。コメントを外すとそのコマンドが許可されます。

---

## コマンド実行関連

### 設定ファイルが見つからない

**原因**: `shirokuma-docs.config.yaml` がカレントディレクトリに存在しない。

**対処法**:

```bash
# 設定ファイルを生成
shirokuma-docs init

# または、パスを明示的に指定
shirokuma-docs generate -c path/to/config.yaml
```

### `generate` で特定のコマンドが失敗する

**原因**: そのコマンドに必要な設定が `shirokuma-docs.config.yaml` に記述されていない。

**対処法**:

`generate` は設定ファイルで有効になっているコマンドのみ実行します。特定のコマンドで問題が起きる場合は、個別に実行して詳細を確認:

```bash
shirokuma-docs typedoc -p . -v   # -v で詳細ログ
```

### lint コマンドでエラーが出るが CI を通したい

**対処法**:

lint コマンドはデフォルトでは終了コード 0 で終了します。CI で失敗させたい場合は `--strict` を使います。逆に CI を一時的に通したい場合は `--strict` を外してください。

---

## GitHub 連携関連

### Projects フィールドが取得できない

**原因**: GitHub Projects V2 がリポジトリにセットアップされていない、またはプロジェクトが Issue にリンクされていない。

**対処法**:

```bash
# プロジェクトの存在確認
shirokuma-docs projects list

# フィールド確認
shirokuma-docs projects fields
```

プロジェクトが存在しない場合は、`setting-up-project` スキルで初期セットアップできます。

### セッション引き継ぎが見つからない

**原因**: Discussions の Handovers カテゴリが存在しない、またはまだ引き継ぎが作成されていない。

**対処法**:

```bash
# Discussions カテゴリの確認
shirokuma-docs discussions categories

# Handovers カテゴリの確認
shirokuma-docs discussions list --category Handovers
```

カテゴリが存在しない場合は、GitHub リポジトリの Settings > Discussions で Handovers カテゴリを作成してください。

### クロスリポジトリ操作ができない

**原因**: `shirokuma-docs.config.yaml` に `crossRepos` が定義されていない。

**対処法**:

設定ファイルにクロスリポジトリの定義を追加:

```yaml
crossRepos:
  frontend:
    owner: "my-org"
    repo: "frontend-app"
```

```bash
shirokuma-docs issues list --repo frontend
```

---

## セッション管理関連

### `session start` でリポジトリ情報が取得できない

**原因**: git リポジトリ外で実行している、またはリモートが設定されていない。

**対処法**:

```bash
# リモート設定を確認
git remote -v

# プロジェクトルートで実行
cd /path/to/your-project
shirokuma-docs session start
```

### `session end` でエラーが発生する

**バリデーションエラーの場合**:

- `--title` は必須です（空文字不可、256文字以内）
- タイトルが `YYYY-MM-DD -` 形式の場合、ユーザー名が自動挿入されます（エラーではなく仕様）

**Discussions カテゴリが見つからない場合**:

Handovers カテゴリが作成されていない可能性があります。[GitHub 連携関連 > セッション引き継ぎが見つからない](#セッション引き継ぎが見つからない) を参照してください。

### `session check` で不整合が検出される

`session check` は Issue の状態（Open/Closed）と Project Status の整合性を検証します。

| レベル | 条件 | 例 |
|--------|------|---|
| error | OPEN + Done/Released | 完了扱いなのにクローズされていない |
| error | CLOSED + In Progress/Review/Pending/Testing | 作業中なのにクローズされている |
| info | CLOSED + Backlog/Icebox/Planning/Spec Review | 意図的な close の可能性 |

**対処法**:

```bash
# error レベルの不整合を自動修正
shirokuma-docs session check --fix
```

> GitHub Projects のワークフロー自動化（Item closed → Done, Pull request merged → Done）を有効化しておくと、不整合の発生を減らせます。設定は `shirokuma-docs projects workflows` で確認できます。

---

## Git 関連

### 保護ブランチの警告が出る

```
warn Warning: On protected branch "develop". Create a feature branch before committing.
```

**原因**: `develop` や `main` などの保護ブランチで直接作業しようとしている。

**対処法**:

フィーチャーブランチを作成して作業:

```bash
git checkout -b feat/42-my-feature
```

### ブランチ名の規約エラー

**原因**: `lint-workflow --branches` でブランチ名が規約に違反している。

**正しいブランチ命名**:

```
{type}/{issue-number}-{slug}
```

例: `feat/42-dashboard`, `fix/15-auth-bug`, `chore/30-update-deps`

### `update` コマンドで更新したのにスキルが反映されない

**原因**: グローバルキャッシュの自動同期が失敗した、またはセッションを再起動していない。

**対処法**:

1. `shirokuma-docs update` を再実行し、出力メッセージを確認
2. Claude Code を再起動または新しいセッションを開始

それでも反映されない場合は [プラグイン管理 > グローバルキャッシュの手動更新](plugins.md#グローバルキャッシュの手動更新フォールバック) を参照してください。

---

## アンインストール

### CLI の削除

```bash
# インストーラスクリプト経由の場合
rm -f ~/.local/bin/shirokuma-docs
rm -rf ~/.local/share/shirokuma-docs

# npm 経由の場合
npm uninstall -g @shirokuma-library/shirokuma-docs
```

### プロジェクトごとのファイルを削除

```bash
# ルールと設定ファイルを削除
rm -rf .claude/rules/shirokuma/
rm -f shirokuma-docs.config.yaml

# グローバルキャッシュからプラグインを削除
claude plugin uninstall shirokuma-skills-ja@shirokuma-library --scope project
claude plugin uninstall shirokuma-hooks@shirokuma-library --scope project
```

---

## それでも解決しない場合

1. `-v` / `--verbose` オプションを付けて詳細ログを確認
2. GitHub Issues で既知の問題を検索: https://github.com/ShirokumaLibrary/shirokuma-docs/issues
3. 新しい Issue を作成して報告
