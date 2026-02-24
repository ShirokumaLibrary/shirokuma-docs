interface ValidateOptions {
    config?: string;
    severity?: 'error' | 'warning' | 'info';
    verbose?: boolean;
}
export declare function validateCommand(options: ValidateOptions): Promise<void>;
export {};
//# sourceMappingURL=validate.d.ts.map