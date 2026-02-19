# Tailwind CSS v4 パターン

Quick reference for Tailwind CSS v4 patterns.

---

## Quick Reference

### shadcn/ui 追加後の必須作業

```bash
npx shadcn@latest add {component} -y
./scripts/fix-tailwind-v4-css-vars.sh --yes apps/{app}/components/ui
```

### CSS 変数構文 (CRITICAL)

```tsx
// NG: v3 構文（CLI が生成する古い形式）
className="bg-[--sidebar-background]"

// OK: v4 構文
className="bg-[var(--sidebar-background)]"
```

### 本番でのみ問題が発生する場合

```css
/* @property ではなく @theme inline を使用 */
@theme inline {
  --sidebar-width: 16rem;
  --sidebar-width-icon: 3rem;
}
```

---

## Key Points

- shadcn/ui は `npx shadcn@latest` を使用
- CLI が生成する `[--var]` → `[var(--var)]` に変換必須
- 本番で CSS 変数が効かない場合は `@theme inline` を使用
- コンポーネント追加後は必ず fix スクリプトを実行
