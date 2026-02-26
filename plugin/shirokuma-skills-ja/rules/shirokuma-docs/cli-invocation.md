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
