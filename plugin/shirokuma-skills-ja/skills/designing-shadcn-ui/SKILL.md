---
name: designing-shadcn-ui
description: 印象的でプロダクション品質のフロントエンドインターフェースを作成します。「印象的なUI」「個性的なデザイン」「memorable design」「landing page」「ランディングページ」「AIっぽくない」、ジェネリックな見た目を避けたい場合に使用。
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch
---

# shadcn/ui デザイン

ジェネリックな「AI スロップ」美学を避けた、印象的でプロダクション品質のインターフェースを作成。

## ワークフロー

### 0. 技術スタック確認

**最初に**、プロジェクトの `CLAUDE.md` を読んで確認:
- フロントエンドフレームワーク（Next.js バージョン、React バージョン）
- スタイリング（Tailwind v3/v4、CSS Modules）
- コンポーネントライブラリ（shadcn/ui stable/canary）
- i18n セットアップ（next-intl、messages 構造）

### 1. デザインディスカバリー

コードを書く前に理解してドキュメント化:

```markdown
## Design Brief

**Purpose**: このインターフェースが解決する問題は?
**Context**: 技術的制約、既存のデザインシステム
**Differentiation**: 何がこれを UNFORGETTABLE にする?

## Aesthetic Direction

**Tone**: [ONE を選択]
- Brutally minimal / Maximalist chaos / Retro-futuristic
- Organic/natural / Luxury/refined / Playful/toy-like
- Editorial/magazine / Brutalist/raw / Art deco/geometric

**Typography**: [フォントペアリングと根拠]
**Color Palette**: [5-7色の HEX コード]
**Motion Strategy**: [キーアニメーションモーメント]
```

ブリーフ作成後、`AskUserQuestion` でデザイン方向性を確認。

### 2. 実装

- プロダクション品質で機能的
- 視覚的にインパクトがあり記憶に残る
- 明確な美的視点で統一的

### 3. ビルド検証（必須）

```bash
pnpm --filter {app-name} build
```

### 4. レビューチェックリスト

- [ ] タイポグラフィが特徴的（Inter, Roboto, Arial 以外）
- [ ] カラーパレットが統一的で意図的
- [ ] モーション/アニメーションが喜びを追加
- [ ] レイアウトに視覚的な面白さ
- [ ] ビルドがエラーなしで通る

### 5. レポート生成

```bash
shirokuma-docs discussions create \
  --category Reports \
  --title "[Design] {component-name}" \
  --body-file report.md
```

## デザインガイドライン

### タイポグラフィ

**DO**: 特徴的なディスプレイフォント、意図的なサイジングスケール
**DON'T**: Inter, Roboto, Arial, システムフォント

### カラー & テーマ

**DO**: 統一的な美学、CSS 変数、ドミナントカラー + シャープなアクセント
**DON'T**: 白地に紫グラデーション、控えめで均等なパレット

### モーション & アニメーション

**DO**: ハイインパクトなモーメント、スタガードリビール、驚きのあるホバーステート
**DON'T**: 目的のないモーション

### 空間構成

**DO**: 非対称、オーバーラップ、グリッドを壊す要素
**DON'T**: 予測可能な12カラムグリッドのみ

## アンチパターン

| パターン | 代替案 |
|---------|--------|
| 白地に紫グラデーション | 大胆な色選択 |
| Inter/Roboto をどこでも | 特徴的なフォントペアリング |
| 中央揃えカードグリッド | 非対称レイアウト |
| ジェネリックアイコン | カスタムアイコンセット |

## 次のステップ

`working-on-issue` チェーンではなくスタンドアロンで起動された場合:

```
Design complete. Next step:
→ `/committing-on-issue` to stage and commit your changes
```

## 注意事項

- **記憶に残ることが最優先**
- **ビルドが通ること必須**
- **レポート Discussion は必須**
- ユーザーの美学方向性の確認なしに実装開始しない
