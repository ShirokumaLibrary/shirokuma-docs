/**
 * generate コマンド - 全ドキュメント生成
 */
interface GenerateOptions {
    project: string;
    config: string;
    output?: string;
    withGithub?: boolean;
    verbose?: boolean;
}
/**
 * generate コマンドハンドラ
 */
export declare function generateCommand(options: GenerateOptions): Promise<void>;
export {};
//# sourceMappingURL=generate.d.ts.map