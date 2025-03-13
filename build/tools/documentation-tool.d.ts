import { AnalysisResult } from '../analyzer/index.js';
import { BaseTool, AutoToolResult, BaseToolConfig } from './base-tool.js';
/**
 * Configuration for the documentation tool
 */
export interface DocumentationToolConfig extends BaseToolConfig {
    systemPrompt: string;
    topLevelPrompt: string;
    withChildrenPrompt: string;
}
/**
 * Tool for generating documentation
 */
export declare class DocumentationTool extends BaseTool<DocumentationToolConfig> {
    readonly name = "generate_documentation";
    readonly description = "Generates documentation for a code repository by recursively analyzing directories and files";
    private openRouterClient;
    /**
     * Creates a new documentation tool
     * @param apiKey OpenRouter API key (optional)
     * @param model LLM model to use (optional)
     * @param updateExisting Whether to update existing files
     */
    constructor(apiKey?: string, model?: string, updateExisting?: boolean);
    /**
     * Generates documentation for a directory
     * @param directoryPath Path to the directory
     * @param analysisResult Results of file analysis
     * @param isTopLevel Whether this is the top level directory
     * @param childrenContent Documentation from child directories
     * @returns Documentation generation result
     */
    generate(directoryPath: string, analysisResult: AnalysisResult, isTopLevel?: boolean, childrenContent?: Array<{
        path: string;
        content: string;
    }>): Promise<AutoToolResult>;
    /**
     * Creates fallback content for directories that exceed limits
     * @param directoryPath Path to the directory
     * @param analysisResult Analysis result with limitation information
     * @returns Content for the fallback file
     */
    createFallbackContent(directoryPath: string, analysisResult: AnalysisResult): Promise<string>;
    /**
     * Reads an existing file if it exists
     * @param filePath Path to the file
     * @returns Content of the file or null if it doesn't exist
     */
    private readExistingFile;
}
