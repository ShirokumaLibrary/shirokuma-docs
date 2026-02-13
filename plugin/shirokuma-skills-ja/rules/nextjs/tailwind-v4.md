---
paths:
  - "**/*.css"
  - "components/ui/**/*.tsx"
  - "**/components/ui/**/*.tsx"
---

# Tailwind CSS v4 + shadcn/ui

## CSS 変数構文

```tsx
// NG: Tailwind v3 構文（v4 では壊れる）
className="bg-[--sidebar-background]"

// OK: Tailwind v4 構文
className="bg-[var(--sidebar-background)]"
```

shadcn/ui コンポーネント追加後：
```bash
npx shadcn@canary add <component> -y
# CSS 変数構文を修正: [--var] → [var(--var)]
```

## 本番環境のみの問題

CSS 変数は開発環境では動くが、本番ビルドで壊れる場合がある。

修正: `@property` や `:root` の代わりに `@theme inline` を使用：
```css
@theme inline {
  --sidebar-width: 16rem;
  --sidebar-background: 0 0% 100%;
}
```

## 検証

```bash
grep -r "\[--" components/ui/  # v3 構文を検索
pnpm build  # 本番ビルドをテスト
```
