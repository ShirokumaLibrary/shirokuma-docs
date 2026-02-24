import { encoding_for_model } from 'tiktoken';
/**
 * Estimate token count for text using tiktoken
 */
export function estimateTokens(text, model = 'gpt-4') {
    try {
        // Get encoding for model
        const encoding = encoding_for_model(model);
        const tokens = encoding.encode(text);
        encoding.free();
        return tokens.length;
    }
    catch (error) {
        // Fallback to approximate calculation if tiktoken fails
        // Rough estimate: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
}
/**
 * Format token count for display
 */
export function formatTokenCount(count) {
    if (count < 1000) {
        return `${count}`;
    }
    if (count < 1000000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return `${(count / 1000000).toFixed(2)}M`;
}
//# sourceMappingURL=tokens.js.map