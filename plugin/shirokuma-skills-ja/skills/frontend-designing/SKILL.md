---
name: frontend-designing
description: 印象的でプロダクション品質のフロントエンドインターフェースを作成します。「印象的なUI」「個性的なデザイン」「memorable design」「landing page」「ランディングページ」「AIっぽくない」、ジェネリックな見た目を避けたい場合、独自のビジュアル美学を作成する場合に使用。
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch
---

# フロントエンドデザイン

ジェネリックな「AI スロップ」美学を避けた、印象的でプロダクション品質のインターフェースを作成。

## いつ使うか

- 「印象的なUI」「memorable UI」「個性的なデザイン」
- 「ランディングページ」「landing page」
- 「ジェネリックな見た目を避けたい」「AIっぽくない」
- カスタムスタイリング、独自の美学が必要な場合

## コアフィロソフィー

> "Bold maximalism and refined minimalism both work - the key is intentionality, not intensity."

すべてのインターフェースは**記憶に残る**ものであり、**目的を持つ**べき。

## アーキテクチャ

- `SKILL.md` - コアワークフロー
- `reference/` - 技術パターン、フォントセットアップ、アニメーション
- `patterns/` - レイアウトパターン、カラースキーム
- `templates/` - デザインレポートテンプレート

## ワークフロー

### 0. 技術スタック確認

**最初に**、プロジェクトの `CLAUDE.md` を読んで確認:
- フロントエンドフレームワーク（Next.js バージョン、React バージョン）
- スタイリング（Tailwind v3/v4、CSS Modules）
- コンポーネントライブラリ（shadcn/ui stable/canary）
- i18n セットアップ（next-intl、messages 構造）
- プロジェクト固有の制約

### 1. デザインディスカバリー

コードを書く前に、理解してドキュメント化:

```markdown
## Design Brief

**Purpose**: このインターフェースが解決する問題は? 誰が使う?
**Context**: 技術的制約、既存のデザインシステム、ブランドガイドライン
**Differentiation**: 何がこれを UNFORGETTABLE にする?

## Aesthetic Direction

**Tone**: [ONE を選んでコミット]
- Brutally minimal
- Maximalist chaos
- Retro-futuristic
- Organic/natural
- Luxury/refined
- Playful/toy-like
- Editorial/magazine
- Brutalist/raw
- Art deco/geometric
- Soft/pastel
- Industrial/utilitarian
- [Custom: describe]

**Typography**: [フォントペアリングと根拠]
**Color Palette**: [5-7色の HEX コード]
**Motion Strategy**: [キーアニメーションモーメント]
**Layout Approach**: [グリッド、非対称 等]
```

ブリーフ作成後、`AskUserQuestion` でデザイン方向性を確認してから実装に進む。

### 2. 実装

以下を満たすコードを作成:
- プロダクション品質で機能的
- 視覚的にインパクトがあり記憶に残る
- 明確な美的視点で統一的
- すべてのディテールを丁寧に仕上げ

### 3. ビルド検証（必須）

```bash
# 実装がコンパイルされることを確認
pnpm --filter {app-name} build
```

### 4. レビューチェックリスト

- [ ] タイポグラフィが特徴的（Inter, Roboto, Arial 以外）
- [ ] カラーパレットが統一的で意図的
- [ ] モーション/アニメーションが喜びを追加
- [ ] レイアウトに視覚的な面白さ
- [ ] ジェネリックパターンのコピーなし
- [ ] ビルドがエラーなしで通る

### 5. レポート生成

**Reports カテゴリに Discussion を作成:**

```bash
shirokuma-docs discussions create \
  --category Reports \
  --title "[Design] {component-name}" \
  --body report.md
```

Discussion URL をユーザーに報告。

> 出力先ポリシーは `rules/output-destinations.md` 参照。

## デザインガイドライン

### タイポグラフィ

**DO**:
- 特徴的なディスプレイフォントを選択（Google Fonts, Fontsource）
- ディスプレイフォントと洗練されたボディフォントをペアリング
- 意図的なサイジングスケールを使用

**DON'T**:
- Inter, Roboto, Arial, システムフォントを使用
- すべてに同じフォントを使用
- フォントロード戦略を無視

**例**:
```css
/* Good: 特徴的なペアリング */
--font-display: 'Space Grotesk', sans-serif;
--font-body: 'DM Sans', sans-serif;

/* Bad: ジェネリック */
--font-display: 'Inter', sans-serif;
```

### カラー & テーマ

**DO**:
- 統一的な美学にコミット
- 一貫性のために CSS 変数を使用
- ドミナントカラーとシャープなアクセント

**DON'T**:
- 白地に紫グラデーション（使い古された）
- 控えめで均等に分散したパレット
- ランダムな色選択

**例**:
```css
/* Bold: ハイコントラスト */
--color-bg: #0a0a0a;
--color-text: #fafafa;
--color-accent: #ff3e00;

/* Refined: さりげない暖かさ */
--color-bg: #faf8f5;
--color-text: #2d2a26;
--color-accent: #b8860b;
```

### モーション & アニメーション

**DO**:
- ハイインパクトなモーメントに集中
- スタガードリビールによるオーケストレーションされたページロード
- 驚きのあるスクロールトリガーとホバーステート
- CSS ファースト、複雑なシーケンスにはライブラリ

**DON'T**:
- ランダムなマイクロインタラクションを散りばめる
- 目的のないモーションを追加
- ユーザー体験を遅くする

### 空間構成

**DO**:
- 予想外のレイアウト
- 非対称、オーバーラップ、斜めのフロー
- グリッドを壊す要素
- 寛大なネガティブスペース OR 制御された密度

**DON'T**:
- 予測可能な12カラムグリッドのみ
- すべて中央揃え
- どこでも同じスペーシング

### 背景 & 雰囲気

**DO**:
- 深みと雰囲気を作成
- グラデーションメッシュ、ノイズテクスチャ
- 幾何学パターン、レイヤードトランスペアレンシー
- ドラマチックなシャドウ、装飾的ボーダー

**DON'T**:
- ソリッドな白/グレー背景のみ
- フラットで生気のないサーフェス
- ビジュアルコンテキストを無視

## 技術スタック制約

| 項目 | 確認 | 影響 |
|------|------|------|
| Tailwind バージョン | v3 vs v4 | CSS 構文が異なる |
| shadcn/ui | stable vs canary | コンポーネント API |
| CSS 変数 | `@theme inline` | v4 で必須 |
| i18n | next-intl | テキストは messages ファイルに |
| ダークモード | ThemeProvider | カラースキームサポート |

## アンチパターン

| パターン | 理由 | 代替案 |
|---------|------|--------|
| 白地に紫グラデーション | 使い古された AI 美学 | 大胆な色選択 |
| Inter/Roboto をどこでも | ジェネリック、記憶に残らない | 特徴的なフォントペアリング |
| 中央揃えカードグリッド | 予測可能 | 非対称レイアウト |
| 控えめなグレーボーダー | 退屈 | ドラマチックなシャドウまたはボーダーなし |
| ジェネリックアイコン | 記憶に残らない | カスタムまたは特徴的なアイコンセット |

## 出力フォーマット

```markdown
## Design Implementation

### Tech Stack Used
- Framework: [Next.js X, React X]
- Styling: [Tailwind vX + shadcn/ui]
- Fonts: [next/font setup]

### Design Direction
[選択した美学の簡潔な説明]

### Files Created/Modified
- `path/to/file.tsx` - [説明]
- `app.css` - [テーマカスタマイズ]
- `messages/{locale}/` - [i18n キー（該当する場合）]

### Key Design Decisions
1. **Typography**: [フォントと理由]
2. **Colors**: [パレット、使用した CSS 変数]
3. **Motion**: [アニメーション、Tailwind or Framer Motion]
4. **Layout**: [アプローチと理由]

### Build Verification
[ビルド通過を確認するコマンド]
```

## 次のステップ

`working-on-issue` チェーンではなく直接起動された場合、デザイン後の次のワークフローステップを提案:

```
Design complete. Next step:
→ `/committing-on-issue` to stage and commit your changes
```

## 注意事項

- **記憶に残ることが最優先**: すべてのデザインは特徴的であるべき
- **ビルドが通ること必須**: 完了前に必ず検証
- **レポート Discussion は必須**: Reports カテゴリに作成（`rules/output-destinations.md` 参照）
- **CLAUDE.md を確認**: プロジェクト制約を最初に理解
- 複数コンポーネント実装時は `TodoWrite` で進捗管理
- ユーザーの美学方向性の確認なしに実装開始しない

> "Claude is capable of extraordinary creative work. Don't hold back."
