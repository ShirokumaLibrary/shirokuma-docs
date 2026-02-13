# セキュリティレビュー基準

OWASP Top 10 2025 準拠（2025年11月6日リリース）

## A01:2025 - アクセス制御の不備

**順位:** #1（アプリの3.73%に影響）

### チェックリスト

- [ ] すべての保護操作に認可チェックあり
- [ ] サーバーサイドバリデーション（クライアント側だけでなく）
- [ ] ロールベースアクセス制御の実施
- [ ] 所有権検証なしの直接オブジェクト参照なし
- [ ] IDOR（安全でない直接オブジェクト参照）防止

### 例

```typescript
// Vulnerable: 所有権チェックなし
export async function deletePost(id: string) {
  await db.delete(posts).where(eq(posts.id, id))  // Anyone can delete!
}

// Secure: 所有権検証あり
export async function deletePost(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await db.delete(posts).where(
    and(eq(posts.id, id), eq(posts.authorId, session.user.id))
  )
}
```

## A02:2025 - セキュリティの設定ミス

**順位:** #2（テスト対象の全アプリに問題あり）

### チェックリスト

- [ ] .env が .gitignore に含まれている
- [ ] ソースコードにシークレットなし
- [ ] 適切な CORS 設定
- [ ] セキュリティヘッダー設定済み
- [ ] デフォルト資格情報を変更済み
- [ ] 本番でデバッグモード無効化

### 必須セキュリティヘッダー

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
```

## A03:2025 - ソフトウェアサプライチェーンの障害（新規）

**順位:** #3

### チェックリスト

- [ ] 依存関係が最新
- [ ] パッケージに既知の CVE なし
- [ ] 定期的に `pnpm audit` 実行
- [ ] ロックファイルがコミット済み
- [ ] 信頼できるパッケージソースのみ使用

### コマンド

```bash
pnpm audit --audit-level=moderate
pnpm outdated
```

## A04:2025 - 暗号化の失敗

**順位:** #4

### チェックリスト

- [ ] パスワードは bcrypt でハッシュ（ラウンド数 >= 12）
- [ ] シークレットは環境変数に格納
- [ ] AUTH_SECRET >= 32文字
- [ ] JWT ペイロードに機密データなし
- [ ] 本番で HTTPS 使用

## A05:2025 - インジェクション

**順位:** #5

### チェックリスト

- [ ] パラメータ化クエリ（文字列結合なし）
- [ ] ILIKE ワイルドカードのエスケープ（`%`, `_`, `\`）
- [ ] ユーザー入力を含む生 SQL なし
- [ ] eval() や Function() コンストラクタなし
- [ ] すべてのユーザー入力を Zod でバリデーション

### SQL インジェクション防止

```typescript
// Vulnerable: エスケープなしの ILIKE
const searchTerm = `%${query}%`  // "100%" matches everything!
db.select().from(posts).where(ilike(posts.title, searchTerm))

// Secure: ワイルドカードのエスケープ
function escapeLikePattern(query: string): string {
  return query.replace(/[%_\\]/g, '\\$&')
}
const searchTerm = `%${escapeLikePattern(query)}%`
```

## A06:2025 - 安全でない設計

**順位:** #6

### チェックリスト

- [ ] 機密操作にレート制限
- [ ] 処理前の入力バリデーション
- [ ] 情報漏洩のない適切なエラーハンドリング
- [ ] 多層防御

## A07:2025 - 認証の失敗

**順位:** #7

### チェックリスト

- [ ] セッションタイムアウト設定済み
- [ ] パスワード複雑性の強制
- [ ] 試行失敗後のアカウントロックアウト
- [ ] セキュアなセッション Cookie
- [ ] 新規アカウントのメール認証

### Better Auth 固有

- [ ] `BETTER_AUTH_SECRET` >= 32文字
- [ ] bcrypt ラウンド数 >= 12
- [ ] Cookie `httpOnly: true`
- [ ] Cookie `sameSite: "lax"`
- [ ] 本番で Cookie `secure: true`
- [ ] レート制限有効化
- [ ] ロールチェックは DB 経由（セッションではなく）

## A08:2025 - データ整合性の障害

**順位:** #8

### チェックリスト

- [ ] Zod スキーマによる入力バリデーション
- [ ] マスアサインメント防止
- [ ] 更新操作は明示的なフィールドを使用

```typescript
// Bad: マスアサインメント
await db.update(posts).set({ ...formData })

// Good: 明示的なバリデーション済みフィールド
const validated = Schema.parse(formData)
await db.update(posts).set({
  title: validated.title,
  content: validated.content,
})
```

## A09:2025 - ロギングとアラートの障害

**順位:** #9

### チェックリスト

- [ ] 認証失敗をログ記録
- [ ] 機密操作を監査
- [ ] ログに機密データなし（パスワード、トークン）
- [ ] コンテキスト付きの構造化ロギング

## A10:2025 - 例外条件の不適切な処理（新規）

**順位:** #10

### チェックリスト

- [ ] 適切なエラーハンドリング（fail-open しない）
- [ ] グレースフルデグラデーション
- [ ] エラーメッセージが情報を漏洩しない
- [ ] すべてのコードパスにエラーハンドリングあり

```typescript
// Vulnerable: Fail-open
try {
  return await getPost(id)
} catch {
  return null  // 暗黙的な失敗、データ露出の可能性
}

// Secure: 明示的なエラーハンドリング
try {
  const post = await getPost(id)
  if (!post) return { error: "Not found", status: 404 }
  return { data: post }
} catch (error) {
  console.error("Database error:", error)
  return { error: "Internal error", status: 500 }
}
```

## 重大な CVE（2025年末）

最新の Next.js を使用していれば対応済み。古いバージョンを使用している場合は即座にアップグレードすること。

### CVE-2025-66478 / CVE-2025-55182 (React Server Components RCE)

**深刻度**: Critical (CVSS 10.0)
**問題**: RSC プロトコルの安全でないデシリアライゼーションにより未認証 RCE が可能
**影響**: Next.js 16.0.6 以前、15.x 全般（App Router）
**対応**: 最新パッチバージョンへアップグレード。詳細は [Next.js Advisory](https://nextjs.org/blog/CVE-2025-66478) 参照

### CVE-2025-55184 / CVE-2025-67779 (DoS)

**深刻度**: High (CVSS 7.5)
**問題**: 細工された HTTP リクエストでサーバープロセスがハングする

### CVE-2025-55183 (ソースコード露出)

**深刻度**: Medium (CVSS 5.3)
**問題**: Server Functions のコンパイル済みソースコードが漏洩する可能性

### CVE-2026-23864 (React DoS)

**深刻度**: High (CVSS 7.5)
**問題**: React Server Components に対する Denial-of-Service 脆弱性

## Server Actions セキュリティ

### チェックリスト

- [ ] `"use server"` ディレクティブあり
- [ ] 先頭に認証チェック
- [ ] Zod による入力バリデーション
- [ ] 認可/所有権の検証
- [ ] エラーレスポンスに機密データなし
- [ ] 機密アクションにレート制限

## 環境変数

### .gitignore に必須

```
.env
.env.local
.env.*.local
```

### シークレット要件

- `BETTER_AUTH_SECRET`: 32文字以上 (`openssl rand -base64 32` で生成)
- `DATABASE_URL`: コード内にハードコードされた資格情報なし
