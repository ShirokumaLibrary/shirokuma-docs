# Radix UI ハイドレーションパターン（重要）

Radix UI ハイドレーションパターンのクイックリファレンス。

---

## 問題

Radix UI コンポーネントは SSR とクライアントで異なる動的 ID を生成する：

```
Error: Hydration failed because the server rendered HTML didn't match the client.
- Server: id="radix-:R1:"
- Client: id="radix-:R2:"
```

## 解決策

`mounted` ステートパターンを使用する：

```typescript
"use client"

import { useState, useEffect } from "react"

export function MyComponent() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // SSR: Radix UI なしのプレースホルダーをレンダリング
  if (!mounted) {
    return <Button disabled><Icon /></Button>
  }

  // クライアント: Radix UI 付きの完全なコンポーネントをレンダリング
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button><Icon /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Option 1</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## 影響を受けるコンポーネント

- `DropdownMenu` / `Select` / `Collapsible`
- `Dialog` / `AlertDialog`
- `ModeToggle`（テーマ切替）
- `LanguageSwitcher`
- ID を生成する全ての Radix UI プリミティブ

## プレースホルダーの要件

1. **見た目を一致させる**: トリガーボタンと同じ外観
2. **操作を無効化**: `disabled` プロップを使用
3. **アクセシビリティを維持**: `sr-only` テキストを保持

## 既知の問題: React 19.2 / Next.js 15.5+ の useId 変更

React 19.2 で `useId` のデフォルトプレフィックスが変更され、Next.js 15.5.0 以降で Radix UI コンポーネント（Dialog, Popover, DropdownMenu 等）のハイドレーション不一致が報告されている。

```
Error: Hydration failed
- Server: aria-controls="radix-:R15mkl:"
- Client: aria-controls="radix-:R9dl5:"
```

**暫定対策**:
- Next.js 15.4.7 へのダウングレードで解消する報告あり
- `mounted` ステートパターンは引き続き有効な回避策
- Radix UI 側の修正状況: [Issue #3700](https://github.com/radix-ui/primitives/issues/3700)
