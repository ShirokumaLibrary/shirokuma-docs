/**
 * ロガーユーティリティ
 */
import chalk from "chalk";
/**
 * ロガーを作成
 */
export function createLogger(verbose = false) {
    return {
        info: (message) => {
            console.log(chalk.blue("info"), message);
        },
        success: (message) => {
            console.log(chalk.green("done"), message);
        },
        warn: (message) => {
            console.log(chalk.yellow("warn"), message);
        },
        error: (message) => {
            console.error(chalk.red("error"), message);
        },
        debug: (message) => {
            if (verbose) {
                console.log(chalk.gray("debug"), message);
            }
        },
        step: (step, total, message) => {
            console.log(chalk.cyan(`[${step}/${total}]`), message);
        },
    };
}
/**
 * 実行時間を計測
 */
export function measureTime(fn, logger, message) {
    const start = Date.now();
    const result = fn();
    if (result instanceof Promise) {
        return result.then((value) => {
            const elapsed = Date.now() - start;
            logger.debug(`${message} (${elapsed}ms)`);
            return value;
        });
    }
    const elapsed = Date.now() - start;
    logger.debug(`${message} (${elapsed}ms)`);
    return result;
}
//# sourceMappingURL=logger.js.map