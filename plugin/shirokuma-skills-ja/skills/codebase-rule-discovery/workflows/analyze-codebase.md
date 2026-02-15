# コードベース分析ワークフロー

アプリケーション全体でパターンを発見するためのステップバイステップワークフロー。

## 前提条件

- 対象アプリケーションへのアクセス
- shirokuma-docs インストール済み
- [discovery-categories.md](../patterns/discovery-categories.md) の理解

## ワークフロー

### Phase 1: 準備

#### 1.1 スコープ定義

```bash
# 全体分析
APPS="admin public"
PATHS="nextjs-tdd-blog-cms/apps/admin nextjs-tdd-blog-cms/apps/public"

# 特定カテゴリ
CATEGORY="error-handling"  # or: naming, types, async, jsdoc, etc.
```

#### 1.2 既存ルールの確認

```bash
ls shirokuma-docs/src/lint/rules/
```

以下との重複を避ける:
- server-action-structure.ts
- annotation-required.ts
- testdoc-*.ts

### Phase 2: データ収集

#### 2.1 パターンカウント実行

discovery-categories.md の各パターンについて:

```bash
echo "=== Pattern: {name} ==="
for app in $PATHS; do
  count=$(grep -rn "PATTERN" "$app" --include="*.ts" 2>/dev/null | wc -l)
  echo "$app: $count"
done
```

#### 2.2 サンプル収集

```bash
# アプリごとに最初の3例を取得
for app in $PATHS; do
  echo "--- $app ---"
  grep -rn "PATTERN" "$app" --include="*.ts" 2>/dev/null | head -3
done
```

#### 2.3 マトリクスに記録

| パターン | Admin | Public |
|---------|-------|--------|
| try-catch | X | X |
| console.error | X | X |
| ... | ... | ... |

### Phase 3: 分析

#### 3.1 一貫性の特定

ルール候補として有力なパターン:
- 3つ以上のアプリで同じアプローチ
- 高い出現回数（アプリあたり10件以上）

#### 3.2 不整合の特定

```
App A: パターン X (100%)
App B: パターン X (80%) + パターン Y (20%) ← 不整合!
```

#### 3.3 欠落パターンの特定

```
App A: パターンあり
App B: パターンあり
App C: パターン欠落 ← 必須ルールの候補
```

### Phase 4: 優先度付け

#### 優先度マトリクス

| 基準 | P0 | P1 | P2 |
|------|----|----|-----|
| バグ発生可能性 | 高 | 中 | 低 |
| 出現回数 | >100 | 50-100 | <50 |
| 不整合度 | 重大 | 中程度 | 軽微 |
| 修正の複雑さ | 自動修正可 | 半自動 | 手動 |

#### 判断ツリー

```
セキュリティ/認証の問題か?
├─ はい → P0
└─ いいえ
   ランタイムバグを引き起こすか?
   ├─ はい → P0
   └─ いいえ
      アプリ間の一貫性の問題か?
      ├─ はい、50件以上 → P1
      └─ いいえ → P2
```

### Phase 5: 提案生成

#### 5.1 テンプレート使用

[templates/rule-proposal.md](../templates/rule-proposal.md) をコピー

#### 5.2 セクション記入

1. **パターン説明**: 発見内容
2. **検出状況**: Phase 2 のカウント
3. **不整合**: Phase 3 の結果
4. **提案ルール**: 検出ロジック
5. **実装**: コードスケッチ
6. **優先度**: Phase 4 の結果

#### 5.3 検証

- [ ] 既存ルールとの重複なし
- [ ] 合計出現回数 >10
- [ ] 検出ロジックが明確
- [ ] 自動修正の可能性を評価済み

### Phase 6: 出力

#### 6.1 レポート保存

```bash
# GitHub Discussions（Research カテゴリ）に保存
shirokuma-docs discussions create \
  --category Research \
  --title "[Research] Rule Discovery: ${CATEGORY}" \
  --body /tmp/report.md
```

#### 6.2 将来計画へのリンク（該当する場合）

計画済み機能に関連するルールの場合:
- GitHub Discussions（Ideas カテゴリ）で関連する提案を確認
- GitHub Projects でロードマップ追跡にリンク

#### 6.3 フォローアップ Issue 作成

提案ルールが shirokuma-docs の実装を必要とする場合、GitHub Issue を作成。

## クイックコマンドリファレンス

```bash
# エラーハンドリングパターン
grep -rn "try {" apps/ --include="*.ts" | wc -l
grep -rn "catch.*{" apps/ --include="*.ts" | wc -l
grep -rn "console.error\|logger.error" apps/ --include="*.ts" | wc -l

# 型安全性
grep -rn ": any\|as any" apps/ --include="*.ts" | wc -l

# 非同期パターン
grep -rn "async function\|async (" apps/ --include="*.ts" | wc -l
grep -rn "\.then(" apps/ --include="*.ts" | wc -l

# JSDoc カバレッジ
grep -rn "^/\*\*" apps/ --include="*.ts" | wc -l
grep -rn "@param" apps/ --include="*.ts" | wc -l

# 命名パターン
find apps/ -name "*.ts" | xargs basename -a | sort | uniq -c | sort -rn | head -20

# エクスポートパターン
grep -r "^export default" apps/ --include="*.ts" | wc -l
grep -r "^export function" apps/ --include="*.ts" | wc -l
```

## 出力フォーマット

```markdown
# Rule Discovery Report: {Category}

**Date**: YYYY-MM-DD
**Apps Analyzed**: admin, public
**Patterns Found**: X
**Proposed Rules**: Y

## Summary

| パターン | 出現回数 | 一貫性 | 優先度 |
|---------|---------|--------|--------|
| {name} | X | High/Med/Low | P0/P1/P2 |

## Proposals

### 1. {Rule Name}
[提案全文へのリンク]

...
```
