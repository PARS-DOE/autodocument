import { AnalysisResult } from '../analyzer/index.js';
import { BaseTool, AutoToolResult, BaseToolConfig } from './base-tool.js';
/**
 * Configuration for the code review tool
 */
export interface ReviewToolConfig extends BaseToolConfig {
    systemPrompt: string;
    topLevelPrompt: string;
    withChildrenPrompt: string;
}
/**
 * Tool for generating code reviews
 */
export declare class ReviewTool extends BaseTool<ReviewToolConfig> {
    readonly name = "autoreview";
    readonly description = "Generates a code review for a repository by recursively analyzing directories and files, focusing on security issues, best practices, and potential improvements";
    private openRouterClient;
    /**
     * Creates a new code review tool
     * @param apiKey OpenRouter API key (optional)
     * @param model LLM model to use (optional)
     * @param updateExisting Whether to update existing files
     */
    constructor(apiKey?: string, model?: string, updateExisting?: boolean);
    /**
     * Generates a code review for a directory
     * @param directoryPath Path to the directory
     * @param analysisResult Results of file analysis
     * @param isTopLevel Whether this is the top level directory
     * @param childrenContent Review content from child directories
     * @returns Review generation result
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
