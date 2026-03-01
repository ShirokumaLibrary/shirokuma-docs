/**
 * hooks evaluate Command Tests
 *
 * stdin から PreToolUse JSON を受け取り、破壊的コマンドを評価するコマンドのテスト。
 *
 * @testdoc hooks evaluate コマンドのテスト（ブロックルール評価・hooks.allow フィルタ）
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
    /**
     * @testdoc blocked-commands.jsonからブロックルール一覧をロードし各ルールにid/pattern/reasonが含まれる
     */
    it("ルール一覧を返す", () => {
      const rules = loadBlockedCommands();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty("id");
      expect(rules[0]).toHaveProperty("pattern");
      expect(rules[0]).toHaveProperty("reason");
    });

    /**
     * @testdoc デフォルトのブロックルールにpr-merge、force-push、hard-resetが含まれている
     */
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

    /**
     * @testdoc allowIdsがundefinedの場合はenabled:trueのルールを全て返す（全ブロック）
     */
    it("allowIds が undefined なら enabled: true のルールを全て返す（全ブロック）", () => {
      const result = filterActiveRules(sampleRules, undefined);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(["rule-a", "rule-b"]);
    });

    /**
     * @testdoc allowIdsが空配列の場合もenabled:trueのルールを全て返す（全ブロック）
     */
    it("allowIds が空配列なら enabled: true のルールを全て返す（全ブロック）", () => {
      const result = filterActiveRules(sampleRules, []);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(["rule-a", "rule-b"]);
    });

    /**
     * @testdoc allowIdsで指定されたルールIDをアクティブルールから除外する（コマンドを許可）
     */
    it("allowIds で指定されたルールを除外する（コマンドを許可）", () => {
      const result = filterActiveRules(sampleRules, ["rule-b"]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("rule-a");
    });

    /**
     * @testdoc enabled:falseのルールはallowIdsに関係なくアクティブルールに含まれない
     */
    it("enabled: false のルールは allowIds に関係なく返さない", () => {
      const result = filterActiveRules(sampleRules, []);
      expect(result.map(r => r.id)).not.toContain("rule-c");
    });

    /**
     * @testdoc allowIdsに不明なルールIDが含まれていても無視しエラーにならない
     */
    it("不明なルール ID は無視する", () => {
      const result = filterActiveRules(sampleRules, ["unknown-rule"]);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(["rule-a", "rule-b"]);
    });
  });

  describe("stripQuotedStrings", () => {
    /**
     * @testdoc ダブルクォート内のテキストを除去しクォート外のコマンド部分のみ残す
     */
    it("ダブルクォート内のテキストを除去する", () => {
      const result = stripQuotedStrings('git push --body "git push --force"');
      expect(result).not.toContain("--force");
      expect(result).toContain("git push --body");
    });

    /**
     * @testdoc シングルクォート内のテキストを除去しクォート外のコマンド部分のみ残す
     */
    it("シングルクォート内のテキストを除去する", () => {
      const result = stripQuotedStrings("echo 'git reset --hard'");
      expect(result).not.toContain("--hard");
    });

    /**
     * @testdoc コマンド文字列内の改行をスペースに変換して1行に正規化する
     */
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

    /**
     * @testdoc コマンドがブロックルールのパターンにマッチした場合にそのルールを返す
     */
    it("マッチするルールを返す", () => {
      const result = evaluateCommand("git push --force origin main", rules);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("force-push");
    });

    /**
     * @testdoc コマンドがどのブロックルールにもマッチしない場合にnullを返す
     */
    it("マッチしなければ null を返す", () => {
      const result = evaluateCommand("git push origin main", rules);
      expect(result).toBeNull();
    });

    /**
     * @testdoc クォート内に含まれる破壊的コマンドテキストは誤検知しない
     */
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
  /**
   * @testdoc CLI経由でgit push --forceをstdinに渡すとdeny判定を返す
   */
  it("破壊的コマンドを拒否する", () => {
    const input = makePreToolUseInput("git push --force origin main");
    const result = runHooksEvaluate(input);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toBe("");

    const output = JSON.parse(result.stdout) as HookDenyOutput;
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(output.hookSpecificOutput.hookEventName).toBe("PreToolUse");
  });

  /**
   * @testdoc 安全なコマンド（通常のgit push）は出力なしで許可される
   */
  it("安全なコマンドを許可する（出力なし）", () => {
    const input = makePreToolUseInput("git push origin main");
    const result = runHooksEvaluate(input);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  /**
   * @testdoc 空のstdin入力はfail-openポリシーにより許可される
   */
  it("空 stdin は許可する（fail-open）", () => {
    const result = runHooksEvaluate("");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  /**
   * @testdoc 不正なJSON入力はfail-openポリシーにより許可される
   */
  it("不正 JSON は許可する（fail-open）", () => {
    const result = runHooksEvaluate("not-json");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  /**
   * @testdoc tool_inputにcommandフィールドがないJSONは許可される
   */
  it("コマンドなしの JSON は許可する", () => {
    const input = JSON.stringify({ tool_name: "Bash", tool_input: {} });
    const result = runHooksEvaluate(input);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });

  /**
   * @testdoc gh pr mergeコマンドをpr-mergeルールにより拒否する
   */
  it("gh pr merge を拒否する", () => {
    const input = makePreToolUseInput("gh pr merge 42 --squash");
    const result = runHooksEvaluate(input);

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as HookDenyOutput;
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
  });

  /**
   * @testdoc git reset --hardコマンドをhard-resetルールにより拒否する
   */
  it("git reset --hard を拒否する", () => {
    const input = makePreToolUseInput("git reset --hard HEAD~1");
    const result = runHooksEvaluate(input);

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as HookDenyOutput;
    expect(output.hookSpecificOutput.permissionDecision).toBe("deny");
  });

  /**
   * @testdoc --body引数のクォート内にある破壊的コマンドテキストは誤検知せず許可される
   */
  it("クォート内の破壊的テキストは false positive にならない", () => {
    const input = makePreToolUseInput('gh issue edit 1 --body "do not git push --force"');
    const result = runHooksEvaluate(input);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
  });
});
