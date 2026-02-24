interface ExtractOptions {
    type: string;
    input: string;
    output?: string;
    config?: string;
    dryRun?: boolean;
    verbose?: boolean;
    validate?: boolean;
    overwrite?: boolean;
}
interface BatchExtractOptions {
    type: string;
    inputDir: string;
    outputDir?: string;
    config?: string;
    pattern?: string;
    report?: string;
    continueOnError?: boolean;
    verbose?: boolean;
    overwrite?: boolean;
}
export declare function extractCommand(options: ExtractOptions): Promise<void>;
export declare function batchExtractCommand(options: BatchExtractOptions): Promise<void>;
export {};
//# sourceMappingURL=extract.d.ts.map