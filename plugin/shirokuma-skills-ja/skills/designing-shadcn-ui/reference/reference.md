# フロントエンドデザイナーリファレンス

## Next.js + Tailwind v4 + shadcn/ui セットアップ

### フォント設定

```tsx
// app/layout.tsx
import { Space_Grotesk, DM_Sans } from 'next/font/google'

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

const bodyFont = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  )
}
```

### Tailwind v4 テーマ設定

```css
/* app/app.css or globals.css */
@import "tailwindcss";

@theme inline {
  /* Typography */
  --font-display: var(--font-display), ui-sans-serif, system-ui, sans-serif;
  --font-body: var(--font-body), ui-sans-serif, system-ui, sans-serif;

  /* Custom Colors - oklch で色の混合が向上 */
  --color-brand: oklch(0.65 0.2 30);
  --color-brand-hover: oklch(0.55 0.22 30);

  /* shadcn デフォルトのオーバーライド */
  --color-primary: var(--color-brand);
  --color-primary-foreground: oklch(0.98 0 0);

  /* カスタムシャドウ */
  --shadow-glow: 0 0 40px oklch(0.65 0.2 30 / 0.3);

  /* カスタムアニメーション */
  --animate-fade-in: fadeIn 0.5s ease-out forwards;
  --animate-slide-up: slideUp 0.4s ease-out forwards;
}

/* Keyframes */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Utility classes */
@layer utilities {
  .text-gradient {
    background: linear-gradient(135deg, var(--color-brand), var(--color-accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .glass {
    background: oklch(1 0 0 / 0.05);
    backdrop-filter: blur(12px);
    border: 1px solid oklch(1 0 0 / 0.1);
  }
}
```

### shadcn/ui canary（Tailwind v4 対応）

```bash
npx shadcn@canary add button -y
./scripts/fix-tailwind-v4-css-vars.sh --yes apps/web/components/ui
```

**v4 で必要な修正**:
```css
/* Before (v3) */
bg-[--sidebar-background]

/* After (v4) */
bg-[var(--sidebar-background)]
```

### スタッガードアニメーションパターン

```tsx
// components/animated-list.tsx
interface AnimatedListProps {
  children: React.ReactNode[]
  delayStep?: number
}

export function AnimatedList({ children, delayStep = 100 }: AnimatedListProps) {
  return (
    <div className="space-y-4">
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-slide-up opacity-0"
          style={{ animationDelay: `${index * delayStep}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
```

### ダークモード（ThemeProvider）

```tsx
// 多くのプロジェクトで設定済み
// 確認: components/theme-provider.tsx

// Tailwind で dark: プレフィックスを使用
<div className="bg-white dark:bg-slate-900">
  <p className="text-slate-900 dark:text-slate-100">Content</p>
</div>
```

---

## フォント推奨

### ディスプレイフォント（見出し、ヒーロー）

| フォント | スタイル | ユースケース |
|---------|---------|------------|
| Space Grotesk | ジオメトリック、テック感 | テックプロダクト、SaaS |
| Playfair Display | エレガントなセリフ | ラグジュアリー、エディトリアル |
| Clash Display | ボールド、モダン | ステートメント、強いブランド |
| Satoshi | クリーン、ジオメトリック | モダンアプリ |
| Cabinet Grotesk | インダストリアル | 強いブランド |
| Gambetta | エディトリアル | マガジン、出版 |
| General Sans | 汎用性高い | 幅広い用途 |
| Syne | ユニーク、アーティスティック | クリエイティブ |

### 本文フォント（長文向け）

| フォント | スタイル | ユースケース |
|---------|---------|------------|
| DM Sans | クリーン、モダン | アプリ、ダッシュボード |
| Source Serif 4 | 読みやすいセリフ | 記事、ドキュメント |
| Outfit | ジオメトリック | モダンなインターフェース |
| Plus Jakarta Sans | フレンドリー | コンシューマーアプリ |
| Literata | 書籍風 | 読書アプリ |

### ソース
- [Google Fonts](https://fonts.google.com)
- [Fontsource](https://fontsource.org)
- [Font Share](https://www.fontshare.com) (free)

## カラーパレット例

### ダークモード

**Midnight Tech**
```css
--bg-primary: #0a0a0f;
--bg-secondary: #12121a;
--text-primary: #f0f0f5;
--text-secondary: #8888a0;
--accent: #6366f1;
--accent-hover: #818cf8;
```

**Warm Dark**
```css
--bg-primary: #1a1814;
--bg-secondary: #242018;
--text-primary: #f5f0e8;
--text-secondary: #a09080;
--accent: #d4a574;
--accent-hover: #e8c090;
```

**Cyber Noir**
```css
--bg-primary: #000000;
--bg-secondary: #0d0d0d;
--text-primary: #ffffff;
--text-secondary: #666666;
--accent: #00ff88;
--accent-hover: #33ffa0;
```

### ライトモード

**Warm Cream**
```css
--bg-primary: #faf8f5;
--bg-secondary: #f0ebe3;
--text-primary: #2d2a26;
--text-secondary: #6b6560;
--accent: #b8860b;
--accent-hover: #d4a030;
```

**Cool Minimal**
```css
--bg-primary: #f8fafc;
--bg-secondary: #e2e8f0;
--text-primary: #0f172a;
--text-secondary: #64748b;
--accent: #0ea5e9;
--accent-hover: #38bdf8;
```

**Editorial White**
```css
--bg-primary: #ffffff;
--bg-secondary: #f5f5f5;
--text-primary: #111111;
--text-secondary: #555555;
--accent: #e63946;
--accent-hover: #f25c69;
```

## アニメーションパターン

### ページロードシーケンス

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-item {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
}

.animate-item:nth-child(1) { animation-delay: 0.1s; }
.animate-item:nth-child(2) { animation-delay: 0.2s; }
.animate-item:nth-child(3) { animation-delay: 0.3s; }
```

### ホバーエフェクト

```css
/* リフト + グロー */
.card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  transform: translateY(-8px);
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.1);
}

/* マグネティックエフェクト（JS 必要） */
.magnetic {
  transition: transform 0.3s ease-out;
}

/* スケール + 回転 */
.playful:hover {
  transform: scale(1.05) rotate(2deg);
}
```

### スクロールトリガー

```css
/* CSS のみ（モダンブラウザ対応） */
@keyframes reveal {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}

.scroll-reveal {
  animation: reveal linear;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}
```

### Framer Motion（React）

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => (
    <motion.li key={i} variants={item} />
  ))}
</motion.ul>
```

## レイアウトパターン

### 非対称グリッド

```css
.asymmetric-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  grid-template-rows: auto auto;
  gap: 2rem;
}

.featured {
  grid-row: span 2;
}
```

### オーバーラップレイアウト

```css
.overlap-container {
  position: relative;
}

.overlap-back {
  position: relative;
  z-index: 1;
}

.overlap-front {
  position: absolute;
  top: 50%;
  left: 60%;
  z-index: 2;
  transform: translateY(-50%);
}
```

### 斜めセクション

```css
.diagonal-section {
  position: relative;
  padding: 6rem 0;
}

.diagonal-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--color-accent);
  transform: skewY(-3deg);
  z-index: -1;
}
```

### Bento グリッド

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 200px;
  gap: 1rem;
}

.bento-large {
  grid-column: span 2;
  grid-row: span 2;
}

.bento-wide {
  grid-column: span 2;
}

.bento-tall {
  grid-row: span 2;
}
```

## 背景・テクスチャパターン

### グラデーションメッシュ

```css
.gradient-mesh {
  background-color: #0a0a0a;
  background-image:
    radial-gradient(at 40% 20%, #4f46e5 0px, transparent 50%),
    radial-gradient(at 80% 0%, #7c3aed 0px, transparent 50%),
    radial-gradient(at 0% 50%, #06b6d4 0px, transparent 50%);
}
```

### ノイズテクスチャ

```css
.noise {
  position: relative;
}

.noise::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.05;
  pointer-events: none;
}
```

### ドットパターン

```css
.dots {
  background-image: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.1) 1px,
    transparent 1px
  );
  background-size: 24px 24px;
}
```

### グリッドライン

```css
.grid-lines {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}
```

## shadcn/ui カスタマイズ

### カスタムテーマ

```css
@layer base {
  :root {
    --primary: 262.1 83.3% 57.8%; /* カスタムパープル */
    --primary-foreground: 0 0% 100%;
    --radius: 0.75rem;
    --font-sans: 'Space Grotesk', sans-serif;
  }
}
```

### コンポーネントオーバーライド例

```tsx
// カスタム Button バリアント
const Button = React.forwardRef<...>(
  ({ className, variant, ...props }, ref) => {
    return (
      <button
        className={cn(
          buttonVariants({ variant }),
          // カスタムスタイル追加
          "relative overflow-hidden",
          "after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent",
          "after:translate-x-[-100%] hover:after:translate-x-[100%] after:transition-transform after:duration-500",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
```

## デザインムードボード例

### ブルータリスト
- モノスペースフォント（JetBrains Mono, IBM Plex Mono）
- 白黒のみ
- 生のボーダー、シャドウなし
- 大文字テキスト
- 密なレイアウト

### エディトリアル
- セリフ見出し（Playfair, Lora）
- 大きなタイポグラフィスケール
- 余白を贅沢に
- カラムベースレイアウト
- 最小限の色使い

### プレイフル
- 大きな角丸（16px+）
- パステルカラー
- バウンスアニメーション
- イラストレーション要素
- フレンドリーなフォント（Nunito, Quicksand）

### ラグジュアリー
- 細いセリフフォント
- ゴールド/クリームのアクセント
- 控えめなアニメーション
- 豊富な余白
- ハイコントラストの写真
