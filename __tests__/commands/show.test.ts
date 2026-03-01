/**
 * show Command Tests
 *
 * Tests for the unified show command that auto-detects item type (Issue/PR/Discussion).
 * Focuses on input validation and type detection logic.
 *
 * @testdoc 番号指定による自動判別取得コマンドのテスト
 */

import { detectItemType, type DetectResult } from "../../src/commands/show.js";

describe("show command", () => {
  // ===========================================================================
  // detectItemType - pure logic tests
  // ===========================================================================

  describe("detectItemType", () => {
    /**
     * @testdoc [show] Issue のみ存在する場合に Issue として判別する
     * @purpose GraphQL レスポンスに issue のみがある場合の判別を確認
     */
    it("should detect Issue when only issue is present", () => {
      const result = detectItemType({
        issue: { number: 42, title: "Test Issue" },
        pullRequest: null,
        discussion: null,
      });
      expect(result).toEqual({ type: "issue", data: { number: 42, title: "Test Issue" } });
    });

    /**
     * @testdoc [show] PR のみ存在する場合に PR として判別する
     * @purpose GraphQL レスポンスに pullRequest のみがある場合の判別を確認
     */
    it("should detect PR when only pullRequest is present", () => {
      const result = detectItemType({
        issue: null,
        pullRequest: { number: 42, title: "Test PR" },
        discussion: null,
      });
      expect(result).toEqual({ type: "pr", data: { number: 42, title: "Test PR" } });
    });

    /**
     * @testdoc [show] Discussion のみ存在する場合に Discussion として判別する
     * @purpose GraphQL レスポンスに discussion のみがある場合の判別を確認
     */
    it("should detect Discussion when only discussion is present", () => {
      const result = detectItemType({
        issue: null,
        pullRequest: null,
        discussion: { number: 100, title: "Test Discussion" },
      });
      expect(result).toEqual({ type: "discussion", data: { number: 100, title: "Test Discussion" } });
    });

    /**
     * @testdoc [show] Issue と PR が両方存在する場合（PR を優先）
     * @purpose GitHub では Issue 番号と PR 番号は同じ空間なので通常は排他的だが、
     *          GraphQL レスポンスで両方返る場合に PR を優先することを確認
     */
    it("should prefer PR over Issue when both exist", () => {
      const result = detectItemType({
        issue: { number: 42, title: "Issue" },
        pullRequest: { number: 42, title: "PR" },
        discussion: null,
      });
      expect(result).toEqual({ type: "pr", data: { number: 42, title: "PR" } });
    });

    /**
     * @testdoc [show] Issue/PR と Discussion が両方存在する場合（Issue/PR を優先）
     * @purpose 異なる番号空間で同一番号がヒットした場合の優先順位を確認
     */
    it("should prefer Issue over Discussion when both exist", () => {
      const result = detectItemType({
        issue: { number: 42, title: "Issue" },
        pullRequest: null,
        discussion: { number: 42, title: "Discussion" },
      });
      expect(result).toEqual({
        type: "issue",
        data: { number: 42, title: "Issue" },
        ambiguous: { type: "discussion", data: { number: 42, title: "Discussion" } },
      });
    });

    /**
     * @testdoc [show] 全種別で見つからない場合に null を返す
     * @purpose GraphQL レスポンスが全て null の場合のハンドリングを確認
     */
    it("should return null when nothing found", () => {
      const result = detectItemType({
        issue: null,
        pullRequest: null,
        discussion: null,
      });
      expect(result).toBeNull();
    });

    /**
     * @testdoc [show] PR と Discussion が両方存在する場合（PR を優先）
     * @purpose PR と Discussion の優先順位を確認
     */
    it("should prefer PR over Discussion when both exist", () => {
      const result = detectItemType({
        issue: null,
        pullRequest: { number: 42, title: "PR" },
        discussion: { number: 42, title: "Discussion" },
      });
      expect(result).toEqual({
        type: "pr",
        data: { number: 42, title: "PR" },
        ambiguous: { type: "discussion", data: { number: 42, title: "Discussion" } },
      });
    });

    /**
     * @testdoc [show] undefined フィールドを null と同様に扱う
     * @purpose GraphQL 部分エラーで undefined が返る場合のハンドリングを確認
     */
    it("should treat undefined as null", () => {
      const result = detectItemType({
        issue: undefined as unknown as null,
        pullRequest: undefined as unknown as null,
        discussion: { number: 5, title: "Found" },
      });
      expect(result).toEqual({ type: "discussion", data: { number: 5, title: "Found" } });
    });
  });
});
