# 発見カテゴリ

TypeScript アプリケーション全体で発見すべきパターンのカテゴリ。

## 1. 構造パターン

### ファイル命名

| パターン | Grep コマンド | ルール候補 |
|---------|--------------|-----------|
| kebab-case ファイル | `find . -name "*.ts" \| grep -E "[a-z]+-[a-z]+"` | naming-convention |
| PascalCase コンポーネント | `find . -name "*.tsx" \| grep -E "^[A-Z]"` | component-naming |
| index.ts 再エクスポート | `find . -name "index.ts"` | barrel-exports |

### エクスポートパターン

```bash
# default vs named exports
grep -r "^export default" --include="*.ts" | wc -l
grep -r "^export function" --include="*.ts" | wc -l
grep -r "^export const" --include="*.ts" | wc -l
```

### インポート順序

```bash
# インポートグループ確認 (react, next, lib, local)
grep -A10 "^import" --include="*.tsx" | head -50
```

## 2. コード品質パターン

### エラーハンドリング

```bash
# try-catch 使用状況
grep -rn "try {" --include="*.ts"

# エラーログ
grep -rn "console.error" --include="*.ts"
grep -rn "logger.error" --include="*.ts"

# エラー型
grep -rn "throw new Error" --include="*.ts"
grep -rn "throw new [A-Z].*Error" --include="*.ts"
```

### 非同期パターン

```bash
grep -rn "async function" --include="*.ts"
grep -rn "\.then(" --include="*.ts"
grep -rn "await " --include="*.ts"
grep -rn "Promise.all" --include="*.ts"
```

### 型安全性

```bash
# any の使用
grep -rn ": any" --include="*.ts"
grep -rn "as any" --include="*.ts"

# unknown の使用
grep -rn ": unknown" --include="*.ts"

# 型アサーション
grep -rn "as [A-Z]" --include="*.ts"
```

## 3. フレームワークパターン

### Server Actions

```bash
grep -rn '"use server"' --include="*.ts"
grep -rn "verifyAuth\|verifyAuthMutation" --include="*.ts"
grep -rn "validateCSRF\|csrfProtect" --include="*.ts"
grep -rn "\.parse(\|\.safeParse(" --include="*.ts"
```

### React コンポーネント

```bash
grep -rn "^export function [A-Z]" --include="*.tsx"
grep -rn "interface.*Props" --include="*.tsx"
grep -rn "use[A-Z][a-zA-Z]*(" --include="*.tsx"
```

### i18n パターン

```bash
grep -rn "useTranslations" --include="*.tsx"
grep -rn "t\(['\"]" --include="*.tsx"
grep -rn 't("' --include="*.tsx" | sed 's/.*t("//' | sed 's/".*//' | sort | uniq
```

## 4. ドキュメントパターン

### JSDoc カバレッジ

```bash
grep -rn "/\*\*" --include="*.ts"
grep -rn "@description" --include="*.ts"
grep -rn "@param" --include="*.ts"
grep -rn "@returns\|@return" --include="*.ts"
```

### カスタムアノテーション

```bash
grep -rn "@screen\|@component\|@serverAction" --include="*.ts"
grep -rn "@usedComponents\|@usedActions" --include="*.ts"
grep -rn "@dbTables\|@feature" --include="*.ts"
```

### TODO/FIXME 追跡

```bash
grep -rn "// TODO\|// FIXME" --include="*.ts"
grep -rn "// TODO(@" --include="*.ts"
```

## 5. テストパターン

### テスト構造

```bash
grep -rn "describe(" --include="*.test.ts"
grep -rn "it(\|test(" --include="*.test.ts"
grep -rn "@testdoc" --include="*.test.ts"
```

### モックパターン

```bash
grep -rn "jest.mock" --include="*.test.ts"
grep -rn "vi.mock" --include="*.test.ts"
```

## 分析マトリクス

| カテゴリ | Admin | Public | Web | MCP | shirokuma |
|---------|-------|--------|-----|-----|-----------|
| エラーハンドリング | ? | ? | ? | ? | ? |
| 型安全性 | ? | ? | ? | ? | ? |
| JSDoc カバレッジ | ? | ? | ? | ? | ? |
| Server Actions | ? | ? | ? | N/A | N/A |

分析中にカウントを記入し、パターンと不整合を特定する。
