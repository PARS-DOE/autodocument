/**
 * Configuration for the autodocument MCP server.
 *
 * Note: Prompt configurations are stored in src/prompt-config.ts.
 * For customizing the prompts used by the auto-* tools, modify that file.
 */
export interface AutodocumentConfig {
    openRouter: {
        apiKey: string;
        model: string;
        baseUrl: string;
        temperature: number;
        maxTokens: number;
    };
    fileProcessing: {
        codeExtensions: string[];
        maxFileSizeKb: number;
        maxFilesPerDirectory: number;
    };
    documentation: {
        outputFilename: string;
        fallbackFilename: string;
        updateExisting: boolean;
    };
}
/**
 * Default configuration values for the autodocument MCP server.
 */
export declare const defaultConfig: AutodocumentConfig;
/**
 * Gets the current configuration by merging defaults with environment variables.
 */
export declare function getConfig(overrides?: Partial<AutodocumentConfig>): AutodocumentConfig;
