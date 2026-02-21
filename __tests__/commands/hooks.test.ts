/**
 * hooks evaluate Command Tests
 *
 * stdin から PreToolUse JSON を受け取り、破壊的コマンドを評価するコマンドのテスト。
 *
 * @testdoc hooks evaluate コマンドのテスト（ブロックルール評価・hooks.enabled フィルタ）
 */

import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import {
  loadBlockedCommands,
  filterActiveRules,
  stripQuotedStrings,
  evaluateCommand,
} from "../../src/commands/hooks.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Types
// =============================================================================

interface HookDenyOutput {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "deny";
    permissionDecisionReason: string;
  };
}

// =============================================================================
// Test Constants
// =============================================================================

const CLI_PATH = join(__dirname, "..", "..", "dist", "index.js");
const FIXTURE_CONFIG = join(__dirname, "..", "fixtures", "hooks", "all-rules-enabled.yaml");

// =============================================================================
// Test Helpers
// =============================================================================

function runHooksEvaluate(stdinInput: string): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("node", [CLI_PATH, "hooks", "evaluate", "--config", FIXTURE_CONFIG], {
    input: stdinInput,
    encoding: "utf-8",
    cwd: join(__dirname, "..", ".."),
    timeout: 15000,
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

function makePreToolUseInput(command: string): string {
  return JSON.stringify({
    tool_name: "Bash",
    tool_input: { command },
  });
}

// =============================================================================
// Unit Tests: Core Functions
// =============================================================================

describe("hooks evaluate - unit tests", () => {
  describe("loadBlockedCommands", () => {
    it("ルール一覧を返す", () => {
      const rules = loadBlockedCommands();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty("id");
      expect(rules[0]).toHaveProperty("pattern");
      expect(rules[0]).toHaveProperty("reason");
    });

    it("既知のルール ID が含まれている", () => {
      const rules = loadBlockedCommands();
      const ids = rules.map(r => r.id);
      expect(ids).toContain("pr-merge");
      expect(ids).toContain("force-push");
      expect(ids).toContain("hard-reset");
    });
  });

  describe("filterActiveRules", () => {
    const sampleRules = [
      { id: "rule-a", pattern: "cmd-a", reason: "A", enabled: true },
      { id: "rule-b", pattern: "cmd-b", reason: "B", enabled: true },
      { id: "rule-c", pattern: "cmd-c", reason: "C", enabled: false },
    ];

    it("enabledIds が undefined なら enabled: true のルールを全て返す", () => {
      const result = filterActiveRules(sampleRules, undefined);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(["rule-a", "rule-b"]);
    });

    it("enabledIds が空配列なら全ルール無効", () => {
      const result = filterActiveRules(sampleRules, []);
      expect(result).toHaveLength(0);
    });

    it("enabledIds で指定されたルールのみ返す", () => {
      const result = filterActiveRules(sampleRules, ["rule-b"]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("rule-b");
    });

    it("enabled: false のルールは enabledIds に含めても返さない", () => {
      const result = filterActiveRules(sampleRules, ["rule-c"]);
      expect(result).toHaveLength(0);
    });

    it("不明なルール ID は無視する", () => {
      const result = filterActiveRules(sampleRules, ["rule-a", "unknown-rule"]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("rule-a");
    });
  });

  describe("stripQuotedStrings", () => {
    it("ダブルクォート内のテキストを除去する", () => {
      const result = stripQuotedStrings('git push --body "git push --force"');
      expect(result).not.toContain("--force");
      expect(result).toContain("git push --body");
    });

    it("シングルクォート内のテキストを除去する", () => {
      const result = stripQuotedStrings("echo 'git reset --hard'");
      expect(result).not.toContain("--hard");
    });

    it("改行をスペースに変換する", () => {
      const result = stripQuotedStrings("git\npush\n--force");
      expect(result).toContain("git push --force");
    });
  });

  describe("evaluateCommand", () => {
    const rules = [
      { id: "force-push", pattern: "git push.*(--force|-f($|\\s))", reason: "Force push blocked", enabled: true },
      { id: "hard-reset", pattern: "git reset --hard", reason: "Hard reset blocked", enabled: true },
    ];

    it("マッチするルールを返す", () => {
      const result = evaluateCommand("git push --force origin main", rules);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("force-push");
    });

    it("マッチしなければ null を返す", () => {
      const result = evaluateCommand("git push origin main", rules);
      expect(result).toBeNull();
    });

    it("クォート内のテキストはマッチしない", () => {
      const result = evaluateCommand('gh issue edit 1 --body "git push --force"', rules);
      expect(result).toBeNull();
    });
  });
});

// =============================================================================
// Integration Tests: CLI
// =============================================================================

describe("hooks evaluate - CLI integration", () => {
  it("破壊的コマンドを拒否する", () => {
    const input = makePreToolUseInput("git push --force origin main");
    const result = runHooksEvaluate(input);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toBe("");

    const output = JSON.parse(result.stdout) as HookDenyOutput;
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(output.hookSpecificOutput.hookEventName).toBe("PreToolUse");
  });

  it("安全なコマンドを許可する（出力なし）", () => {
    const input = makePreToolUseInput("git push origin main");
    const result = runHooksEvaluate(input);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("空 stdin は許可する（fail-open）", () => {
    const result = runHooksEvaluate("");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("不正 JSON は許可する（fail-open）", () => {
    const result = runHooksEvaluate("not-json");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("コマンドなしの JSON は許可する", () => {
    const input = JSON.stringify({ tool_name: "Bash", tool_input: {} });
    const result = runHooksEvaluate(input);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("gh pr merge を拒否する", () => {
    const input = makePreToolUseInput("gh pr merge 42 --squash");
    const result = runHooksEvaluate(input);

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as HookDenyOutput;
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
  });

  it("git reset --hard を拒否する", () => {
    const input = makePreToolUseInput("git reset --hard HEAD~1");
    const result = runHooksEvaluate(input);

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as HookDenyOutput;
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
  });

  it("クォート内の破壊的テキストは false positive にならない", () => {
    const input = makePreToolUseInput('gh issue edit 1 --body "do not git push --force"');
    const result = runHooksEvaluate(input);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });
});
