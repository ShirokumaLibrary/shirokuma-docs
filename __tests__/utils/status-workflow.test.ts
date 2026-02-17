/**
 * Status Workflow Tests
 *
 * Tests for status constants, transitions, and validation.
 *
 * @testdoc Status ワークフロー定数と遷移バリデーションのテスト
 */

import {
  STATUS_VALUES,
  TERMINAL_STATUSES,
  WORK_STARTED_STATUSES,
  STATUS_TRANSITIONS,
  validateStatusTransition,
} from "../../src/utils/status-workflow.js";

describe("STATUS_VALUES", () => {
  /**
   * @testdoc 全11ステータスが定義されている（Not Planned 含む）
   * @purpose ワークフローに必要な全ステータスの存在確認
   */
  it("should define all 11 statuses", () => {
    expect(Object.keys(STATUS_VALUES)).toHaveLength(11);
    expect(STATUS_VALUES.ICEBOX).toBe("Icebox");
    expect(STATUS_VALUES.BACKLOG).toBe("Backlog");
    expect(STATUS_VALUES.PLANNING).toBe("Planning");
    expect(STATUS_VALUES.SPEC_REVIEW).toBe("Spec Review");
    expect(STATUS_VALUES.IN_PROGRESS).toBe("In Progress");
    expect(STATUS_VALUES.REVIEW).toBe("Review");
    expect(STATUS_VALUES.TESTING).toBe("Testing");
    expect(STATUS_VALUES.PENDING).toBe("Pending");
    expect(STATUS_VALUES.DONE).toBe("Done");
    expect(STATUS_VALUES.RELEASED).toBe("Released");
    expect(STATUS_VALUES.NOT_PLANNED).toBe("Not Planned");
  });
});

describe("TERMINAL_STATUSES", () => {
  /**
   * @testdoc Done と Released が終端ステータス
   * @purpose 終端ステータスの定義確認
   */
  it("should include Done, Released, and Not Planned", () => {
    expect(TERMINAL_STATUSES).toContain("Done");
    expect(TERMINAL_STATUSES).toContain("Released");
    expect(TERMINAL_STATUSES).toContain("Not Planned");
    expect(TERMINAL_STATUSES).toHaveLength(3);
  });
});

describe("WORK_STARTED_STATUSES", () => {
  /**
   * @testdoc 作業開始済みステータスが正しく定義されている
   * @purpose 作業開始判定に使うステータスの確認
   */
  it("should include In Progress, Review, Pending, Testing", () => {
    expect(WORK_STARTED_STATUSES).toContain("In Progress");
    expect(WORK_STARTED_STATUSES).toContain("Review");
    expect(WORK_STARTED_STATUSES).toContain("Pending");
    expect(WORK_STARTED_STATUSES).toContain("Testing");
    expect(WORK_STARTED_STATUSES).toHaveLength(4);
  });

  /**
   * @testdoc Planning は作業開始済みステータスに含まれない
   * @purpose Planning は pre-work ステータスであることの確認
   */
  it("should not include Planning (pre-work status)", () => {
    expect(WORK_STARTED_STATUSES).not.toContain("Planning");
  });
});

describe("STATUS_TRANSITIONS", () => {
  /**
   * @testdoc 全ステータスに遷移定義がある
   * @purpose 遷移マップの完全性確認
   */
  it("should have transitions for all statuses", () => {
    const allStatuses = Object.values(STATUS_VALUES);
    for (const status of allStatuses) {
      expect(STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });

  /**
   * @testdoc Released は遷移先がない（終端）
   * @purpose 終端ステータスの遷移制約確認
   */
  it("should have no transitions from Released", () => {
    expect(STATUS_TRANSITIONS["Released"]).toEqual([]);
  });

  /**
   * @testdoc Icebox → Backlog のみ
   * @purpose 初期ステータスの遷移制約確認
   */
  it("should allow Icebox → Backlog or Not Planned", () => {
    expect(STATUS_TRANSITIONS["Icebox"]).toContain("Backlog");
    expect(STATUS_TRANSITIONS["Icebox"]).toContain("Not Planned");
  });

  /**
   * @testdoc Backlog → Planning を含む遷移先がある
   * @purpose Backlog から Planning への遷移確認
   */
  it("should allow Backlog → Planning among others", () => {
    const transitions = STATUS_TRANSITIONS["Backlog"];
    expect(transitions).toContain("Planning");
    expect(transitions).toContain("Spec Review");
    expect(transitions).toContain("In Progress");
    expect(transitions).toContain("Icebox");
  });

  /**
   * @testdoc Planning → Spec Review, Backlog のみ
   * @purpose Planning ステータスの遷移制約確認
   */
  it("should allow Planning → Spec Review, Backlog, Not Planned", () => {
    expect(STATUS_TRANSITIONS["Planning"]).toContain("Spec Review");
    expect(STATUS_TRANSITIONS["Planning"]).toContain("Backlog");
    expect(STATUS_TRANSITIONS["Planning"]).toContain("Not Planned");
  });

  /**
   * @testdoc In Progress は複数の遷移先を持つ
   * @purpose アクティブステータスの遷移先確認
   */
  it("should allow In Progress → Review, Testing, Done, Pending, Not Planned", () => {
    const transitions = STATUS_TRANSITIONS["In Progress"];
    expect(transitions).toContain("Review");
    expect(transitions).toContain("Testing");
    expect(transitions).toContain("Done");
    expect(transitions).toContain("Pending");
    expect(transitions).toContain("Not Planned");
  });

  /**
   * @testdoc Not Planned → Backlog のみ
   * @purpose キャンセル後の復活パス
   */
  it("should allow Not Planned → Backlog only", () => {
    expect(STATUS_TRANSITIONS["Not Planned"]).toEqual(["Backlog"]);
  });

  /**
   * @testdoc 全アクティブステータスから Not Planned に遷移可能
   * @purpose キャンセルはどの状態からでも可能
   */
  it("should allow Not Planned from all active statuses", () => {
    const activeStatuses = [
      "Icebox", "Backlog", "Planning", "Spec Review",
      "In Progress", "Review", "Testing", "Pending",
    ];
    for (const status of activeStatuses) {
      expect(STATUS_TRANSITIONS[status]).toContain("Not Planned");
    }
  });
});

describe("validateStatusTransition", () => {
  /**
   * @testdoc 有効な遷移は valid: true を返す
   * @purpose 正常な遷移パスのバリデーション
   */
  it("should return valid for allowed transition", () => {
    const result = validateStatusTransition("Backlog", "In Progress");
    expect(result.valid).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  /**
   * @testdoc 無効な遷移は valid: false と warning を返す
   * @purpose 非標準遷移の検出
   */
  it("should return invalid for non-standard transition", () => {
    const result = validateStatusTransition("Icebox", "Done");
    expect(result.valid).toBe(false);
    expect(result.warning).toContain("Icebox");
    expect(result.warning).toContain("Done");
    expect(result.warning).toContain("not standard");
  });

  /**
   * @testdoc from が null の場合はスキップ（valid: true）
   * @purpose 初回設定時のバリデーション省略
   */
  it("should skip validation when from is null", () => {
    const result = validateStatusTransition(null, "Done");
    expect(result.valid).toBe(true);
  });

  /**
   * @testdoc from が undefined の場合はスキップ
   * @purpose undefined ハンドリング
   */
  it("should skip validation when from is undefined", () => {
    const result = validateStatusTransition(undefined, "Done");
    expect(result.valid).toBe(true);
  });

  /**
   * @testdoc from が未知のステータスの場合はスキップ
   * @purpose カスタムステータスとの互換性
   */
  it("should skip validation for unknown from status", () => {
    const result = validateStatusTransition("CustomStatus", "Done");
    expect(result.valid).toBe(true);
  });

  /**
   * @testdoc 終端ステータスからの遷移は invalid
   * @purpose Released からの遷移ブロック
   */
  it("should return invalid for transition from Released", () => {
    const result = validateStatusTransition("Released", "Backlog");
    expect(result.valid).toBe(false);
    expect(result.warning).toContain("terminal status");
  });

  /**
   * @testdoc 後方遷移（修正用）は有効
   * @purpose Review → In Progress などの戻り遷移
   */
  it("should allow backward transitions for corrections", () => {
    expect(validateStatusTransition("Review", "In Progress").valid).toBe(true);
    expect(validateStatusTransition("Testing", "In Progress").valid).toBe(true);
    expect(validateStatusTransition("Pending", "In Progress").valid).toBe(true);
  });

  /**
   * @testdoc Pending の双方向遷移が有効
   * @purpose Pending ↔ In Progress/Review/Backlog
   */
  it("should allow bidirectional Pending transitions", () => {
    expect(validateStatusTransition("In Progress", "Pending").valid).toBe(true);
    expect(validateStatusTransition("Pending", "In Progress").valid).toBe(true);
    expect(validateStatusTransition("Pending", "Review").valid).toBe(true);
    expect(validateStatusTransition("Pending", "Backlog").valid).toBe(true);
  });

  /**
   * @testdoc Not Planned への遷移が有効
   * @purpose キャンセルフロー（issues cancel）のバリデーション
   */
  it("should allow transitions to Not Planned from active statuses", () => {
    expect(validateStatusTransition("Backlog", "Not Planned").valid).toBe(true);
    expect(validateStatusTransition("In Progress", "Not Planned").valid).toBe(true);
  });

  /**
   * @testdoc Not Planned → Backlog が有効
   * @purpose キャンセル後の復活バリデーション
   */
  it("should allow Not Planned → Backlog", () => {
    expect(validateStatusTransition("Not Planned", "Backlog").valid).toBe(true);
  });

  /**
   * @testdoc Not Planned → Done は無効
   * @purpose キャンセルからの不正遷移検出
   */
  it("should return invalid for Not Planned → Done", () => {
    const result = validateStatusTransition("Not Planned", "Done");
    expect(result.valid).toBe(false);
  });
});
