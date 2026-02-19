# ルール提案テンプレート

shirokuma-docs の新しい lint ルールを提案する際に使用するテンプレート。

---

# Rule Proposal: {rule-name}

**Date**: YYYY-MM-DD
**Category**: {Structural | Quality | Framework | Documentation}
**Priority**: {P0 | P1 | P2}

## パターン説明

{発見されたパターンとその重要性}

## 検出状況

| App | 件数 | 例 |
|-----|------|-----|
| admin | X | `lib/actions/posts.ts:10` |
| public | X | `lib/actions/comments.ts:5` |
| web | X | `lib/actions/sessions.ts:15` |
| mcp | X | `src/tools/entity.ts:20` |
| shirokuma | X | `src/commands/lint.ts:30` |

**合計**: Y アプリ全体で X 件

## 不整合

{期待されるパターンからの逸脱を列挙}

- App `admin`: {逸脱の説明}
- App `web`: {逸脱の説明}

## 提案ルール

### 仕様

```yaml
rule:
  id: "{rule-name}"
  severity: "{error | warning | info}"
  description: "{チェック内容}"
  fixable: {true | false}

  options:
    option1: value
    option2: value
```

### 検出ロジック

```
1. {パターン} を検索
2. {条件} をチェック
3. {違反} があれば報告
```

### 自動修正（該当する場合）

```
1. {修正手順1}
2. {修正手順2}
```

## 実装スケッチ

```typescript
import type { LintRule, LintIssue } from "../types.js";

export const {ruleName}Rule: LintRule = {
  id: "{rule-name}",
  severity: "{severity}",
  description: "{description}",

  check(file: SourceFile, allFiles: SourceFile[]): LintIssue[] {
    const issues: LintIssue[] = [];

    // TODO: 実装
    // 1. ファイル内容をパース
    // 2. パターン出現箇所を検索
    // 3. 違反をチェック
    // 4. 問題を報告

    return issues;
  }
};
```

## 設定

```yaml
# shirokuma-docs.config.yaml
lintQuality:
  {ruleName}:
    enabled: true
    severity: "{severity}"
    # ルール固有オプション
    option1: value
```

## テストケース

### パスすべきケース

```typescript
// 有効なコード例
{valid code}
```

### 失敗すべきケース

```typescript
// 無効なコード例
{invalid code}
```

### エッジケース

- {エッジケース1}
- {エッジケース2}

## 優先度の根拠

**P0**: デプロイをブロックする、またはバグを引き起こす
**P1**: 品質・一貫性を向上させる
**P2**: あれば良い程度の改善

{この優先度を選択した理由}

## 関連

- 既存ルール: {関連する既存ルール}
- ADR: {関連するADR}
- Issue: {関連するIssue}

---

## チェックリスト

- [ ] 全アプリでパターンを検証済み
- [ ] 検出件数を記録済み
- [ ] 不整合を特定済み
- [ ] 実装スケッチを提供済み
- [ ] テストケースを定義済み
- [ ] 優先度の根拠を記載済み
- [ ] 既存ルールとの重複なし
