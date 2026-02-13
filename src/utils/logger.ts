/**
 * ロガーユーティリティ
 */

import chalk from "chalk";

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
export function createLogger(verbose: boolean = false): Logger {
  return {
    info: (message: string) => {
      console.log(chalk.blue("info"), message);
    },
    success: (message: string) => {
      console.log(chalk.green("done"), message);
    },
    warn: (message: string) => {
      console.log(chalk.yellow("warn"), message);
    },
    error: (message: string) => {
      console.error(chalk.red("error"), message);
    },
    debug: (message: string) => {
      if (verbose) {
        console.log(chalk.gray("debug"), message);
      }
    },
    step: (step: number, total: number, message: string) => {
      console.log(
        chalk.cyan(`[${step}/${total}]`),
        message
      );
    },
  };
}

/**
 * 実行時間を計測
 */
export function measureTime<T>(
  fn: () => T | Promise<T>,
  logger: Logger,
  message: string
): T | Promise<T> {
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
