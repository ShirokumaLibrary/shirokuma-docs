/**
 * hooks command - Evaluate destructive command rules
 *
 * @description Evaluates a command against blocked-commands.json rules,
 * filtered by hooks.enabled in shirokuma-docs.config.yaml.
 * Used by hooks scripts to replace jq/yq dependency with CLI invocation.
 *
 * @example
 * ```bash
 * # Evaluate a command from stdin (PreToolUse JSON)
 * echo '{"tool_name":"Bash","tool_input":{"command":"git push --force"}}' | shirokuma-docs hooks evaluate
 * ```
 */

import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  getBundledPluginPathFor,
  getGlobalCachePath,
  PLUGIN_NAME_HOOKS,
} from "../utils/skills-repo.js";
import { loadConfig } from "../utils/config.js";
import { safeRegExp } from "../utils/sanitize.js";

// ========================================
// Types
// ========================================

interface BlockedCommandRule {
  id: string;
  pattern: string;
  reason: string;
  enabled: boolean;
}

interface BlockedCommandsConfig {
  description: string;
  rules: BlockedCommandRule[];
}

interface HookInput {
  tool_name?: string;
  tool_input?: {
    command?: string;
  };
}

interface HookDenyOutput {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "deny";
    permissionDecisionReason: string;
  };
}

// ========================================
// Core Functions
// ========================================

/**
 * blocked-commands.json からルールを読み込む
 *
 * バンドルプラグイン → グローバルキャッシュの2段階フォールバック。
 * 見つからない場合は空配列を返す（fail-open）。
 */
export function loadBlockedCommands(): BlockedCommandRule[] {
  const paths = [
    join(getBundledPluginPathFor(PLUGIN_NAME_HOOKS), "hooks", "blocked-commands.json"),
  ];

  const cachePath = getGlobalCachePath(PLUGIN_NAME_HOOKS);
  if (cachePath) {
    paths.push(join(cachePath, "hooks", "blocked-commands.json"));
  }

  for (const p of paths) {
    if (!existsSync(p)) continue;
    try {
      const content = readFileSync(p, "utf-8");
      const config = JSON.parse(content) as BlockedCommandsConfig;
      return config.rules;
    } catch {
      continue;
    }
  }

  return [];
}

/**
 * hooks.enabled に基づきアクティブルールをフィルタする
 *
 * | 状態 | 動作 |
 * |------|------|
 * | enabledIds が undefined | 全ルール有効 |
 * | enabledIds が空配列 | 全ルール無効 |
 * | enabledIds に ID リスト | 指定されたルールのみ有効 |
 */
export function filterActiveRules(
  rules: BlockedCommandRule[],
  enabledIds: string[] | undefined,
): BlockedCommandRule[] {
  // enabled 未定義 → 全ルール有効
  if (enabledIds === undefined) {
    return rules.filter(r => r.enabled);
  }

  // enabled が空配列 → 全ルール無効
  if (enabledIds.length === 0) {
    return [];
  }

  // 指定されたルールのみ有効
  const enabledSet = new Set(enabledIds);
  return rules.filter(r => r.enabled && enabledSet.has(r.id));
}

/**
 * コマンドからクォート文字列を除去する
 *
 * false-positive 防止のため、シングルクォート・ダブルクォート内のテキストを除去。
 * 改行はスペースに変換してから処理する。
 */
export function stripQuotedStrings(command: string): string {
  return command
    .replace(/\n/g, " ")
    .replace(/'[^']*'/g, "")
    .replace(/"[^"]*"/g, "");
}

/**
 * コマンドをアクティブルールのパターンでマッチングする
 *
 * @returns マッチしたルール、またはマッチなしの場合 null
 */
export function evaluateCommand(
  command: string,
  activeRules: BlockedCommandRule[],
): BlockedCommandRule | null {
  const stripped = stripQuotedStrings(command);

  for (const rule of activeRules) {
    const regex = safeRegExp(rule.pattern);
    if (!regex) continue;
    if (regex.test(stripped)) {
      return rule;
    }
  }

  return null;
}

// ========================================
// Command Handler
// ========================================

/**
 * `hooks evaluate` コマンドのメインハンドラ
 *
 * stdin から PreToolUse JSON を読み取り、破壊的コマンドを評価する。
 * - 拒否時: Claude Code hook 出力形式の JSON を stdout に出力し exit 0
 * - 許可時: 何も出力せず exit 0
 * - エラー時: fail-open（全許可）
 */
export async function hooksEvaluateCommand(configPath?: string): Promise<void> {
  try {
    // stdin を読み取る
    const input = await readStdin();

    if (!input || input.trim() === "") {
      // 空 stdin → 許可（fail-open）
      return;
    }

    let parsed: HookInput;
    try {
      parsed = JSON.parse(input) as HookInput;
    } catch {
      // 不正 JSON → 許可（fail-open）
      return;
    }

    const command = parsed.tool_input?.command;
    if (!command) {
      // コマンドなし → 許可
      return;
    }

    // ルールを読み込む
    const allRules = loadBlockedCommands();
    if (allRules.length === 0) {
      // ルールなし → 許可（fail-open）
      return;
    }

    // hooks.enabled を config から取得
    let enabledIds: string[] | undefined;
    try {
      const config = loadConfig(process.cwd(), configPath ?? "shirokuma-docs.config.yaml");
      enabledIds = config.hooks?.enabled;
    } catch {
      // config が存在しない/読み取り不可 → 全ルール有効
      enabledIds = undefined;
    }

    // アクティブルールをフィルタ
    const activeRules = filterActiveRules(allRules, enabledIds);
    if (activeRules.length === 0) {
      // 有効なルールなし → 許可
      return;
    }

    // コマンドを評価
    const matchedRule = evaluateCommand(command, activeRules);
    if (matchedRule) {
      // 拒否: Claude Code hook 出力形式
      const output: HookDenyOutput = {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: matchedRule.reason,
        },
      };
      process.stdout.write(JSON.stringify(output));
    }
    // マッチなし → 許可（何も出力しない）
  } catch {
    // 予期しないエラー → fail-open（何も出力せず exit 0）
  }
}

/**
 * stdin から全入力を読み取る
 */
function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    // TTY の場合は空文字列を返す（パイプ入力なし）
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }

    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", () => resolve(""));
    process.stdin.resume();
  });
}
