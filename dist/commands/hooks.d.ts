/**
 * hooks command - Evaluate destructive command rules
 *
 * @description Evaluates a command against blocked-commands.json rules,
 * filtered by hooks.allow in shirokuma-docs.config.yaml.
 * Used by hooks scripts to replace jq/yq dependency with CLI invocation.
 *
 * @example
 * ```bash
 * # Evaluate a command from stdin (PreToolUse JSON)
 * echo '{"tool_name":"Bash","tool_input":{"command":"git push --force"}}' | shirokuma-docs hooks evaluate
 * ```
 */
interface BlockedCommandRule {
    id: string;
    pattern: string;
    reason: string;
    enabled: boolean;
}
/**
 * blocked-commands.json からルールを読み込む
 *
 * バンドルプラグイン → グローバルキャッシュの2段階フォールバック。
 * 見つからない場合は空配列を返す（fail-open）。
 */
export declare function loadBlockedCommands(): BlockedCommandRule[];
/**
 * hooks.allow に基づきアクティブルールをフィルタする
 *
 * | 状態 | 動作 |
 * |------|------|
 * | allowIds が undefined | 全ルール有効（全ブロック） |
 * | allowIds が空配列 | 全ルール有効（全ブロック） |
 * | allowIds に ID リスト | 指定されたコマンドを許可（ルールを除外） |
 */
export declare function filterActiveRules(rules: BlockedCommandRule[], allowIds: string[] | undefined): BlockedCommandRule[];
/**
 * コマンドからクォート文字列を除去する
 *
 * false-positive 防止のため、シングルクォート・ダブルクォート内のテキストを除去。
 * 改行はスペースに変換してから処理する。
 */
export declare function stripQuotedStrings(command: string): string;
/**
 * コマンドをアクティブルールのパターンでマッチングする
 *
 * @returns マッチしたルール、またはマッチなしの場合 null
 */
export declare function evaluateCommand(command: string, activeRules: BlockedCommandRule[]): BlockedCommandRule | null;
/**
 * `hooks evaluate` コマンドのメインハンドラ
 *
 * stdin から PreToolUse JSON を読み取り、破壊的コマンドを評価する。
 * - 拒否時: Claude Code hook 出力形式の JSON を stdout に出力し exit 0
 * - 許可時: 何も出力せず exit 0
 * - エラー時: fail-open（全許可）
 */
export declare function hooksEvaluateCommand(configPath?: string): Promise<void>;
export {};
//# sourceMappingURL=hooks.d.ts.map