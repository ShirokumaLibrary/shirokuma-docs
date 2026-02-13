---
paths:
  - "lib/**/*.ts"
  - "lib/**/*.tsx"
  - "**/lib/**/*.ts"
  - "**/lib/**/*.tsx"
---

# lib/ ディレクトリ構造ルール

## 必須構造

```
lib/
├── actions/           # Server Actions
│   ├── crud/          # 単一テーブル CRUD
│   └── domain/        # 複数テーブルのビジネスロジック
├── auth/              # 認証
├── context/           # React Context
├── hooks/             # カスタムフック
├── utils/             # ユーティリティ関数
└── validations/       # Zod スキーマ
```

## 重要ルール

1. **lib/ 直下にファイルを置かない**
   ```
   lib/auth/index.ts  ← OK
   lib/auth.ts        ← NG
   ```

2. **再エクスポートに index.ts を使用**
   ```typescript
   export { auth } from "./config"
   export { verifyAdmin } from "./utils"
   ```

3. **`export *` を避ける**
   - 名前衝突によるビルドエラーの原因
   - 明示的な再エクスポートを使用

## Server Actions 構造

| ディレクトリ | タイプ | 特徴 |
|-------------|--------|------|
| `lib/actions/crud/` | CRUD | 単一テーブル、標準操作 |
| `lib/actions/domain/` | ドメイン | 複数テーブル、ビジネスワークフロー |
