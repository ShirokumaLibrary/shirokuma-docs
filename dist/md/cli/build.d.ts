interface BuildOptions {
    config?: string;
    output?: string;
    include?: string;
    exclude?: string;
    verbose?: boolean;
    watch?: boolean;
}
export declare function buildCommand(options: BuildOptions): Promise<void>;
export {};
//# sourceMappingURL=build.d.ts.map