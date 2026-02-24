import { type TiktokenModel } from 'tiktoken';
/**
 * Estimate token count for text using tiktoken
 */
export declare function estimateTokens(text: string, model?: TiktokenModel): number;
/**
 * Format token count for display
 */
export declare function formatTokenCount(count: number): string;
//# sourceMappingURL=tokens.d.ts.map