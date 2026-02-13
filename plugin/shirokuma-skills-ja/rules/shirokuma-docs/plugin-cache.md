# プラグインキャッシュ管理

## アーキテクチャ

Claude Code はスキルを**グローバルキャッシュ**から読み込む。プラグインは `shirokuma-plugins` marketplace リポジトリから配信される。

```
ShirokumaLibrary/shirokuma-plugins (marketplace リポジトリ)
    ↓ claude plugin install/update
~/.claude/plugins/cache/shirokuma-library/...  (グローバルキャッシュ — Claude Code はここから読み込む)
    ↓ shirokuma-docs init / update
.claude/rules/shirokuma/  (デプロイ済みルール — プロジェクトローカル、gitignored)
```

**重要な変更（#486）:** プロジェクトローカルの `.claude/plugins/` ディレクトリは廃止。プラグインは marketplace からグローバルキャッシュに直接配信される。

## 推奨: `shirokuma-docs update`

`shirokuma-docs update` は `update-skills --sync` の短縮コマンド。グローバルキャッシュ更新+ルール再展開を一発で実行する。

```bash
# 推奨（短縮コマンド）
shirokuma-docs update

# 同等（フルコマンド）
shirokuma-docs update-skills --sync
```

## 初期セットアップ

`shirokuma-docs init --with-skills` が自動的に:
1. marketplace を登録（`claude plugin marketplace add`）
2. プラグインをグローバルキャッシュにインストール（`claude plugin install`）
3. ルールを `.claude/rules/shirokuma/` に展開

## 手動キャッシュ操作

```bash
# 最新バージョンに更新
claude plugin update shirokuma-skills-ja@shirokuma-library --scope project

# 強制再インストール（バージョン同じだが内容更新）
claude plugin uninstall shirokuma-skills-ja@shirokuma-library --scope project
claude plugin install shirokuma-skills-ja@shirokuma-library --scope project
```

キャッシュ更新後、スキルが表示されるには新しいセッションが必要。

## ユーザーへのガイダンスが必要な場合

| 症状 | 原因 | アクション |
|------|------|----------|
| 新しいスキルがスキルリストにない | キャッシュ未更新 | `shirokuma-docs update` または `claude plugin uninstall` + `install` |
| `plugin update` が「already at latest」と表示 | バージョン番号が同じ | uninstall + install を使用 |
| あるプロジェクトでスキルが動くが別では動かない | プラグインスコープの不一致 | `--scope`（user vs project）を確認 |
| `.claude/plugins/` ディレクトリがまだ存在する | レガシーインストール | `shirokuma-docs update` で自動クリーンアップ |
| `disable` / `uninstall` でスコープ不一致エラー | プラグインが `--scope project` でインストール済み | `--scope project` を指定、または `--scope` を省略して auto-detect |

## ルール

1. **グローバルキャッシュに直接書き込まない** — `claude plugin` コマンドを使用
2. **`shirokuma-docs update` を推奨** — キャッシュ更新+ルール再展開を一発で実行
3. **バージョンが同じ場合の更新は uninstall + install** — `plugin update` はバージョン未変更時にスキップする
4. **`.claude/plugins/` はレガシー** — 存在する場合、`shirokuma-docs update` が自動的にクリーンアップ
