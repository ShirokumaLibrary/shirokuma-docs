# エージェントの高度なパターン

テスト、最適化、セキュリティの高度なパターン。基本原則と設計は [best-practices.md](best-practices.md) を参照。

## 目次

- [よくあるアンチパターン](#よくあるアンチパターン)
- [エージェントのテスト](#エージェントのテスト)
- [パフォーマンス最適化](#パフォーマンス最適化)
- [セキュリティに関する考慮事項](#セキュリティに関する考慮事項)

---

## よくあるアンチパターン

### 1. 何でもエージェント

**問題**: エージェントの責務が多すぎる

```yaml
# ❌ 悪い例
name: super-agent
description: Reviews code, writes tests, generates docs, debugs issues, and deploys.
tools: All
```

**修正**: 責務ごとにエージェントを分割

```yaml
# ✅ 良い例
name: code-reviewer
description: Reviews code quality. Use for code reviews only.
tools: Read, Grep, Glob

name: test-generator
description: Generates test suites. Use for test creation only.
tools: Read, Write, Bash
```

### 2. 曖昧なワークフロー

**問題**: 指示が汎用的すぎる

```markdown
## Workflow
1. Analyze the code
2. Find issues
3. Report findings
```

**修正**: 具体的でアクション可能なステップに

```markdown
## Workflow
1. **Locate Files**: Use Glob("src/**/*.ts") to find source files
2. **Check Each File**:
   - Load with Read tool
   - Search for `console.log` patterns
   - Flag files with production console statements
3. **Generate Report**: List each finding as `file:line: description`
```

### 3. 過剰な権限

**問題**: 必要以上のツールアクセス

```yaml
# ❌ コード変更できるレビューア
name: code-reviewer
tools: Read, Write, Edit, Bash, WebFetch
```

**修正**: 必要最小限のツール

```yaml
# ✅ 読み取り専用レビューア
name: code-reviewer
tools: Read, Grep, Glob, Bash
```

### 4. 見えないエージェント

**問題**: 説明が不十分で呼び出されない

```yaml
# ❌ トリガーなし
description: Handles TypeScript stuff
```

**修正**: 明確なトリガーと目的

```yaml
# ✅ 明確な呼び出し条件
description: Migrates JavaScript files to TypeScript. Use when user asks to "convert to TypeScript" or "add types to JS files".
```

### 5. 出力形式の未定義

**問題**: 不安定で予測不能な出力

```markdown
## Workflow
...
4. Report the findings
```

**修正**: 明示的な出力構造

```markdown
## Output Format

\```
# Review Report: [Component]

## Summary
- Files analyzed: X
- Issues found: Y

## Critical Issues
1. [file:line] - [issue description]

## Recommendations
- [actionable suggestion]
\```
```

### 6. フレームワークへの過度な依存

**問題**: 内部コードを理解せずフレームワークを使用

> "フレームワークを使用する場合、内部のコードを理解すること。フレームワーク内部への誤った前提はエラーの一般的な原因。" -- Anthropic

**修正**: LLM API を直接使用することから始める

```markdown
# ✅ 直接実装
# 多くのパターンは数行のコードで十分
response = await llm.call(prompt)
# 明確、デバッグ可能、理解しやすい
```

---

## エージェントのテスト

### 手動テストチェックリスト

1. **トリガーテスト**
   - [ ] 直接呼び出し: "Use the [agent] agent"
   - [ ] 説明文のキーワードトリガー
   - [ ] エッジケースのフレーズ

2. **ワークフローテスト**
   - [ ] 各ステップが正しく実行される
   - [ ] ツールが適切に使用される
   - [ ] エラー処理が機能する

3. **出力テスト**
   - [ ] 形式が仕様に一致
   - [ ] 内容が正確
   - [ ] 実行可能な推奨事項

### テストシナリオ

```markdown
## Test Cases for code-reviewer

### Case 1: Clean Code
Input: Well-written TypeScript file
Expected: No issues, positive feedback

### Case 2: Security Vulnerability
Input: File with SQL injection
Expected: Critical issue flagged with CWE reference

### Case 3: Style Issues
Input: Inconsistent formatting
Expected: Medium priority suggestions
```

### イテレーションプロセス

1. エージェント作成
2. サンプル入力でテスト
3. ワークフロー/出力のギャップを特定
4. システムプロンプトを更新
5. 安定するまで繰り返し

---

## パフォーマンス最適化

### Research-Plan-Execute ワークフロー

[Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices) より:

> "リサーチと計画を先に行うことで、深い思考が必要な問題のパフォーマンスが大幅に向上する。"

```markdown
## Workflow
1. **Research**: Explore codebase, understand context
2. **Plan**: Design approach before coding
3. **Execute**: Implement with plan as guide
```

### 軽量 vs 重量エージェント

| タイプ | トークン使用量 | 影響 |
|--------|-------------|------|
| **軽量** (<3k tokens) | 低 | スムーズなオーケストレーション、高速な連携 |
| **重量** (25k+ tokens) | 高 | マルチエージェントワークフローのボトルネック |

**推奨**: 軽量エージェント（最小限のツール）から始め、必要に応じて複雑さを追加。

### サブエージェント戦略

> "サブエージェントの積極的な使用が推奨される。特に複雑な問題で。" -- Anthropic

- サブエージェントで会話の早い段階で詳細を確認
- コンテキストの可用性を維持
- 効率面のデメリットは最小限

### トークン使用量の削減

**ディレクトリ形式を使用**（複雑なエージェント向け）:
- コアプロンプトは AGENT.md (< 500行)
- 詳細は必要時のみ読み込み

**インラインではなくリンクで参照**:
```markdown
# ❌ すべてインライン
## Security Checks
[2000行の OWASP 詳細]

# ✅ 参照にリンク
## Security Checks
Apply OWASP Top 10 checks. See [reference.md](reference.md#owasp) for complete list.
```

### モデル選択

| タスク | モデル | 理由 |
|--------|--------|------|
| 単純なファイル操作 | haiku | 高速、低コスト |
| 標準的な分析 | sonnet | バランス型 |
| 複雑な推論 | opus | 高品質 |

### 並列実行

オーケストレータエージェント向け:
```markdown
## Workflow
1. **Parallel Analysis**: Launch these agents simultaneously:
   - security-auditor
   - performance-analyzer
   - code-reviewer
2. **Aggregate**: Combine results after all complete
```

### マルチコンテキストウィンドウワークフロー

単一のコンテキストウィンドウで完了できないプロジェクト向け:

1. **初期化エージェント**: 初回実行時に環境をセットアップ
2. **コーディングエージェント**: 段階的に進捗
3. **アーティファクト**: 次のセッションのために明確な成果物を残す（TODO、状態ファイル）

---

## セキュリティに関する考慮事項

### ツールアクセスの原則

1. **デフォルトは読み取り専用**: Read, Grep, Glob から始める
2. **Write は必要時のみ追加**: 生成タスク向け
3. **Bash は慎重に**: テスト/リンターの実行のみ
4. **bypassPermissions は使わない**: 絶対に必要な場合を除く

### パーミッションモード

| モード | ユースケース | リスクレベル |
|--------|------------|------------|
| `default` | ほとんどのエージェント | 低 |
| `acceptEdits` | 信頼できるトランスフォーマ | 中 |
| `bypassPermissions` | 自動化パイプラインのみ | 高 |

### 機密操作

システムプロンプトでガード:
```markdown
## Safety Rules

1. **Never modify**:
   - .env files
   - Credential files
   - Production configs

2. **Always confirm** before:
   - Deleting files
   - Running destructive commands
   - Modifying authentication code

3. **Log all changes**:
   - Report every file modified
   - Include before/after for edits
```

### 入力バリデーション

ユーザー入力を受け取るエージェント向け:
```markdown
## Input Validation

Before processing user-provided paths:
1. Verify path is within project directory
2. Reject paths containing `..`
3. Reject absolute paths outside workspace
```
