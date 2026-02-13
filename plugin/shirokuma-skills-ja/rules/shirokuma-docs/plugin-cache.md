# プラグインキャッシュ管理

## アーキテクチャ

Claude Code はスキルを**グローバルキャッシュ**から読み込む。プロジェクトローカルの `.claude/plugins/` ディレクトリからではない。

```
plugin/ (バンドルソース)
    ↓ shirokuma-docs update（= update-skills --sync）
.claude/plugins/shirokuma-skills-ja/   (プロジェクトローカルコピー)
    ↓ claude plugin install/update
~/.claude/plugins/cache/...         (グローバルキャッシュ — Claude Code はここから読み込む)
```

## 推奨: `shirokuma-docs update`

`shirokuma-docs update` は `update-skills --sync` の短縮コマンド。スキル・ルール更新+キャッシュ同期を一発で実行する。

```bash
# 推奨（短縮コマンド）
shirokuma-docs update

# 同等（フルコマンド）
shirokuma-docs update-skills --sync
```

## `update` で新しいスキルが追加された後

`shirokuma-docs update` が新しいスキルの追加を報告した場合、グローバルキャッシュも更新が必要：

```bash
# プラグインバージョンが変更された場合
claude plugin update shirokuma-skills-ja@shirokuma-library --scope project

# プラグインバージョンが同じ場合（update が「already at latest」と報告）
claude plugin uninstall shirokuma-skills-ja@shirokuma-library --scope project
claude plugin install shirokuma-skills-ja@shirokuma-library --scope project
```

キャッシュ更新後、スキルが表示されるには新しいセッションが必要。

## ユーザーへのガイダンスが必要な場合

| 症状 | 原因 | アクション |
|------|------|----------|
| 新しいスキルがスキルリストにない | キャッシュ未更新 | `claude plugin uninstall` + `install` |
| `plugin update` が「already at latest」と表示 | バージョン番号が同じ | uninstall + install を使用 |
| あるプロジェクトでスキルが動くが別では動かない | プラグインスコープの不一致 | `--scope`（user vs project）を確認 |

## ルール

1. **グローバルキャッシュに直接書き込まない** — `claude plugin` コマンドを使用
2. **`shirokuma-docs update` を推奨** — `update-skills --sync` の短縮形。新スキル追加時はキャッシュ同期について必ずリマインド
3. **バージョンが同じ場合の更新は uninstall + install** — `plugin update` はバージョン未変更時にスキップする
