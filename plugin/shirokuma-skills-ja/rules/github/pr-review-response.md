# PR レビューレスポンス

## レビューコメント受領時

1. すべてのレビュースレッドを取得: `shirokuma-docs issues pr-comments <PR#>`
2. 各**未解決**スレッドについて、レスポンスタイプを判断：

### コード修正が必要

1. コードを修正
2. コミットしてプッシュ
3. コミットを参照して返信:
   ```bash
   shirokuma-docs issues pr-reply <PR#> --reply-to <database_id> --body-file - <<'EOF'
   返信内容
   EOF
   ```
4. 解決: `shirokuma-docs issues resolve <PR#> --thread-id <PRRT_id>`

### コメント内容の修正が必要

以前投稿したコメントの内容に誤りがある場合:

1. `shirokuma-docs issues comment-edit <comment-id> --body-file /tmp/shirokuma-docs/{number}-updated.md`
2. 修正した旨をスレッドに返信
3. スレッドを解決

### 質問またはディスカッション

1. 説明を返信
2. スレッドを解決

### 意見の相違

1. 懸念事項とトレードオフを説明して返信
2. 解決**しない** — レビュアーに判断を委ねる

## ルール

1. **返信と解決はセット** - すべての返信には解決が続くべき（レビュアーの入力待ちの場合を除く）
2. **全スレッドを処理してからユーザーに報告** - スレッド間でユーザーに質問しない
3. **正しい ID を使用** - `--reply-to` は数値の `database_id`、`--thread-id` は GraphQL の `PRRT_` ID（どちらも `pr-comments` の出力から取得）

## エッジケース

| 状況 | アクション |
|------|----------|
| スレッドがすでに解決済み | スキップ |
| 古いコメント（コードが変更済み） | フィードバックがまだ有効なら返信、関連コミットを参照 |
| レビュアーが再レビューを要求 | 返信するがスレッドは開いたまま |
