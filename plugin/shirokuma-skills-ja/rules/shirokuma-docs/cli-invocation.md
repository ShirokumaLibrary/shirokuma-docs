# shirokuma-docs CLI の呼び出し

## 直接呼び出し（npx 不要）

`shirokuma-docs` はグローバルにインストール済み。常に直接呼び出す：

```bash
# 正しい
shirokuma-docs session start
shirokuma-docs issues list
shirokuma-docs lint-tests -p .

# 間違い - 不要なオーバーヘッド
npx shirokuma-docs session start
```

## 例外: gh 直接使用が許容される操作

PR 作成は `shirokuma-docs` CLI に未実装。単一操作で完結するため `gh pr create` の直接使用を許容する。

```bash
gh pr create --base develop --title "feat: タイトル (#42)" --body "$(cat /tmp/shirokuma-docs/body.md)"
```
