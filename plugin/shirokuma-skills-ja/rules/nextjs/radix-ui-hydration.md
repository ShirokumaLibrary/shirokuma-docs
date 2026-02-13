---
paths:
  - "components/**/*.tsx"
  - "**/components/**/*.tsx"
---

# Radix UI ハイドレーションパターン

## 問題

Radix UI は SSR と CSR で異なるユニーク ID を生成し、ハイドレーション不一致を引き起こす。

影響: DropdownMenu, Select, Dialog, Popover, Collapsible, Accordion, Tooltip。

## 解決策: mounted ステートパターン

```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])

if (!mounted) return <PlaceholderWithoutRadixUI />
return <ComponentWithRadixUI />
```

## ルール

- Client Component 内のすべての Radix UI コンポーネントに `mounted` パターンを使用
- SSR プレースホルダーはフルコンポーネントのビジュアルレイアウトと一致させる
- 利用可能なら `useMounted()` フックを優先（`hooks/use-mounted.ts`）
- 回避策として `suppressHydrationWarning` を絶対に使わない
