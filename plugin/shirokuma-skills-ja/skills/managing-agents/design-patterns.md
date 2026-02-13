# エージェント設計パターン

[Anthropic の "Building Effective Agents"](https://www.anthropic.com/engineering/building-effective-agents) に基づくパターン。

## 目次

**ワークフローパターン**（予測可能、決定的）:
- [プロンプトチェーン](#ワークフロー-1-プロンプトチェーン)
- [ルーティング](#ワークフロー-2-ルーティング)
- [並列化](#ワークフロー-3-並列化)
- [オーケストレータ-ワーカー](#ワークフロー-4-オーケストレータ-ワーカー)
- [評価者-最適化](#ワークフロー-5-評価者-最適化)

**エージェントロール**（専門的な能力）:
- [アナライザ](#ロール-1-アナライザ)
- [ジェネレータ](#ロール-2-ジェネレータ)
- [トランスフォーマ](#ロール-3-トランスフォーマ)
- [インベスティゲータ](#ロール-4-インベスティゲータ)
- [オーケストレータ](#ロール-5-オーケストレータ)

**コンポジットパターン**:
- [Creator-Checker パターン](#creator-checker-パターン)

---

# Part 1: ワークフローパターン

> "ワークフローから始めよ。より制御が得られる。エージェントは複雑さが正当化される場合のみ。" -- Anthropic

## ワークフロー 1: プロンプトチェーン

**目的**: 複雑なタスクを順序的ステップに分解し、各ステップが前の出力を処理。

**フロー**: Input → LLM₁ → Gate/Check → LLM₂ → Gate/Check → LLM₃ → Output

**使用場面**:
- 固定された予測可能なサブタスク
- 精度のためのレイテンシートレードオフが許容できる
- 中間検証で信頼性が向上

**例**: コードレビューパイプライン
```markdown
1. **Syntax Check** (LLM₁): Parse and validate
   → Gate: If syntax errors, return early
2. **Security Scan** (LLM₂): Check vulnerabilities
   → Gate: If critical issues, flag for review
3. **Quality Analysis** (LLM₃): Style and best practices
   → Output: Combined report
```

---

## ワークフロー 2: ルーティング

**目的**: 入力を分類し、専門ハンドラに振り分け。

**フロー**: Input → Router → (Handler A: TypeScript | Handler B: Python | Handler C: General)

**使用場面**:
- 明確な入力カテゴリが存在
- 専門的な処理で精度が向上
- タイプごとに異なるプロンプトが必要

**例**: マルチ言語レビューア
```markdown
1. **Classify**: Detect file type/language
2. **Route**:
   - TypeScript → ts-reviewer (strict mode, types)
   - Python → py-reviewer (PEP8, type hints)
   - Other → general-reviewer
```

---

## ワークフロー 3: 並列化

**目的**: 独立したタスクを同時実行し、結果を集約。

**フロー**: Input → (Task A | Task B | Task C) → Aggregator → Output

**バリエーション**:

| タイプ | 説明 | 例 |
|--------|------|-----|
| **セクショニング** | 独立したサブタスクに分割 | レビュー: セキュリティ + スタイル + パフォーマンス |
| **投票** | 同じタスクを複数回実行 | 3つの LLM が最良解に投票 |

**例**: 包括的コードレビュー
```typescript
// Parallel execution
Promise.all([
  Task({ subagent_type: "security-auditor", prompt: "..." }),
  Task({ subagent_type: "style-checker", prompt: "..." }),
  Task({ subagent_type: "perf-analyzer", prompt: "..." }),
])
// Aggregate results
```

---

## ワークフロー 4: オーケストレータ-ワーカー

**目的**: 中央の LLM がタスクを動的に分解し、ワーカーに委任、統合。

**フロー**: Orchestrator → (Worker | Worker | Worker) → Synthesizer

**使用場面**:
- 実行時までサブタスクが予測不能
- タスク分解の柔軟性が必要
- 委任が必要な複雑な問題

**並列化との違い**: サブタスクが動的に決定される。

**例**: 機能実装
```markdown
Orchestrator analyzes request:
→ "Need new API endpoint + tests + docs"
→ Spawns: api-builder, test-generator, doc-writer
→ Synthesizes results into completion report
```

---

## ワークフロー 5: 評価者-最適化

**目的**: 一方の LLM が生成し、もう一方が評価して改善するイテレーティブループ。

**フロー**: Generator → Output → Evaluator → Feedback → Generator (pass するまでループ)

**使用場面**:
- 明確な評価基準が存在
- イテレーティブな改善が出力を改善する
- 速度より品質

**例**: コード品質ループ
```markdown
1. **Generator**: Write implementation
2. **Evaluator**: Run tests, check criteria
   - If PASS: Done
   - If FAIL: Provide specific feedback
3. **Generator**: Refine based on feedback
4. Repeat (max 3 iterations)
```

**関連**: Creator-Checker パターン（ワンショット版）

---

# Part 2: エージェントロール

ワークフローパターン内で使用できる専門的なエージェントタイプ。

## ロール 1: アナライザ

**目的**: コード/ドキュメントを変更せずに読み取り・分析

**ツール**: `Read, Grep, Glob, Bash`
**モデル**: `sonnet` or `opus`

### テンプレート

```markdown
---
name: analyzer-agent
description: Analyzes [target] for [criteria]. Use when user asks to "review", "check", or "analyze".
tools: Read, Grep, Glob, Bash
model: sonnet
---

# [Domain] Analyzer

Expert in analyzing [domain] for [criteria].

## Core Responsibilities
- Scan for [patterns]
- Check against [standards]
- Generate findings report

## Workflow

1. **Scan**: Use Glob to find relevant files
2. **Read**: Load file contents
3. **Analyze**: Check against criteria
4. **Report**: Generate findings with severity levels

## Report Format

\```
# Analysis: [Component]

## Summary
[High-level findings]

## Issues Found
- [Severity] [Issue] at [location]

## Recommendations
- [Suggestion]
\```
```

### 例

- Code Reviewer / Security Auditor / Style Checker / Architecture Analyzer

---

## ロール 2: ジェネレータ

**目的**: 仕様から新しいファイルを作成

**ツール**: `Read, Write, Bash`
**モデル**: `sonnet`

### テンプレート

```markdown
---
name: generator-agent
description: Generates [output type] from [input]. Use when user asks to "create", "generate", or "write".
tools: Read, Write, Bash
model: sonnet
---

# [Output Type] Generator

Expert in creating [output type] following [standards].

## Workflow

1. **Gather Context**: Read existing files, understand patterns
2. **Design**: Plan structure and content
3. **Generate**: Write new files
4. **Verify**: Check generated content against requirements
```

### 例

- Test Generator / Documentation Builder / Config Creator / API Endpoint Generator

---

## ロール 3: トランスフォーマ

**目的**: 既存ファイルを体系的に変更

**ツール**: `Read, Edit, Bash`
**モデル**: `sonnet`

### テンプレート

```markdown
---
name: transformer-agent
description: Transforms [target] by [transformation]. Use when user asks to "refactor", "update", or "migrate".
tools: Read, Edit, Bash
model: sonnet
---

# [Transformation] Transformer

## Workflow

1. **Read**: Load current content
2. **Analyze**: Identify changes needed
3. **Transform**: Apply modifications
4. **Validate**: Verify correctness

## Safety Checks

- [ ] Tests pass before and after
- [ ] Behavior preserved
- [ ] No data loss
```

### 例

- Refactoring Specialist / Code Formatter / Migration Agent / Syntax Updater

---

## ロール 4: インベスティゲータ

**目的**: 問題のデバッグと診断

**ツール**: `Read, Bash, Grep, Glob`
**モデル**: `sonnet` or `opus`

### テンプレート

```markdown
---
name: investigator-agent
description: Investigates [problem type] to find root cause. Use when user reports "error", "bug", or "issue".
tools: Read, Bash, Grep, Glob
model: opus
---

# [Problem Domain] Investigator

## Workflow

1. **Reproduce**: Run failing test or command
2. **Isolate**: Narrow down to specific code
3. **Trace**: Follow execution path
4. **Analyze**: Examine relevant code
5. **Diagnose**: Identify root cause
6. **Suggest**: Propose fix with explanation

## Report Format

\```
# Investigation: [Issue]

## Root Cause
[Why it happens]

## Affected Code
[File:line with snippet]

## Proposed Fix
[Code change with explanation]

## Verification
[How to test the fix]
\```
```

### 例

- Debugger / Performance Analyzer / Error Investigator / Memory Leak Detector

---

## ロール 5: オーケストレータ

**目的**: 複雑なマルチステップワークフローの調整

**ツール**: `Task, Read, Write, Bash`
**モデル**: `sonnet` or `opus`

### テンプレート

```markdown
---
name: orchestrator-agent
description: Coordinates [workflow] across multiple steps. Use when user needs complex [task type].
tools: Task, Read, Write, Bash
model: sonnet
---

# [Workflow] Orchestrator

## Workflow

1. **Plan**: Break into subtasks
2. **Delegate**: Launch subagents via Task tool
3. **Coordinate**: Manage execution sequence
4. **Integrate**: Combine results
5. **Verify**: Check completeness

## Coordination Rules

- Run independent tasks in parallel
- Sequential for dependencies
- Aggregate results before reporting
```

### 例

- CI/CD Runner / Release Manager / Deployment Coordinator / Full-Stack Feature Builder

---

## Creator-Checker パターン

包括的なカバレッジのためにエージェントをペアで設計。

### コンセプト

| タイプ | 役割 | ルールスタイル | 目的 |
|--------|------|-------------|------|
| **Creator** | 実装 | "Do" ルールのみ | 安定した予測可能な AI 動作 |
| **Checker** | レビュー/監査 | "Do" + "Don't" ルール | 包括的な検出 |

### なぜ機能するか

**Creator エージェント**（コーダー、ジェネレータ）:
- "Do" ルールに従うことで一貫した出力
- ポジティブな要件は実装しやすい

**Checker エージェント**（レビューア、オーディター）:
- 欠けているもの（"Don't" 違反）を検出する必要
- アンチパターンには明示的なチェックが必要
- 両方のルールタイプで包括的なカバレッジ

### ペア例

**Creator: feature-builder**
```markdown
## Completion Requirements (Do rules)
- [ ] Test files exist for all implementation
- [ ] Tests pass before completion
- [ ] i18n keys added for new strings
- [ ] TypeScript types defined
```

**Checker: code-reviewer**
```markdown
## Verification Checklist (Do rules)
- [ ] TypeScript strict mode enabled
- [ ] Error handling implemented
- [ ] Tests have assertions

## Anti-patterns to Detect (Don't rules)
- [ ] No `any` types used
- [ ] No empty catch blocks
- [ ] No hardcoded strings
- [ ] No console.log in production code
```

### よくあるペア

| Creator | Checker |
|---------|---------|
| feature-builder | code-reviewer |
| test-generator | test-reviewer |
| doc-builder | doc-reviewer |
| api-developer | security-auditor |

---

# Part 3: パターン選択ガイド

## ワークフロー vs エージェントの選択

| 質問 | YES の場合 | NO の場合 |
|------|-----------|---------|
| すべてのステップを予測できるか？ | ワークフロー | エージェント |
| 決定的な結果が必要か？ | ワークフロー | エージェント |
| レイテンシ/コストに敏感か？ | ワークフロー | エージェント |
| オープンエンドの問題か？ | エージェント | ワークフロー |

## ワークフローパターンの選択

| シナリオ | パターン |
|---------|---------|
| 固定された順序的ステップ | プロンプトチェーン |
| 入力に応じた異なるハンドラ | ルーティング |
| 独立したサブタスク、速度重視 | 並列化 |
| 実行時の動的なタスク分解 | オーケストレータ-ワーカー |
| フィードバックによるイテレーティブな改善 | 評価者-最適化 |

## エージェントロールの選択

| シナリオ | ロール |
|---------|--------|
| コード品質チェック | アナライザ |
| 新規ファイル作成 | ジェネレータ |
| 既存コード変更 | トランスフォーマ |
| バグの根本原因調査 | インベスティゲータ |
| サブエージェントの調整 | オーケストレータ |
| 実装 + レビュー | Creator-Checker ペア |

## よくある組み合わせ

| ユースケース | ワークフロー + ロール |
|------------|-----------------|
| コードレビューパイプライン | プロンプトチェーン + アナライザ |
| マルチ言語対応 | ルーティング + 複数アナライザ |
| 包括的な監査 | 並列化 + アナライザ × 3 |
| 機能実装 | オーケストレータ-ワーカー + ジェネレータ、アナライザ |
| 品質保証 | 評価者-最適化 + ジェネレータ、アナライザ |
