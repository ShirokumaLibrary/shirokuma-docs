/**
 * ロガーユーティリティ
 */
export interface Logger {
    info: (message: string) => void;
    success: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    debug: (message: string) => void;
    step: (step: number, total: number, message: string) => void;
}
/**
 * ロガーを作成
 */
export declare function createLogger(verbose?: boolean): Logger;
/**
 * 実行時間を計測
 */
export declare function measureTime<T>(fn: () => T | Promise<T>, logger: Logger, message: string): T | Promise<T>;
//# sourceMappingURL=logger.d.ts.map