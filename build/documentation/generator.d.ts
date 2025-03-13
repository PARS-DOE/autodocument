import { AnalysisResult } from '../analyzer/index.js';
/**
 * Result of the documentation generation process
 */
export interface DocumentationResult {
    /**
     * Path to the generated documentation file
     */
    documentationPath: string;
    /**
     * Whether documentation was generated successfully
     */
    success: boolean;
    /**
     * Content of the generated documentation
     */
    content: string;
    /**
     * Error message if generation failed
     */
    error?: string;
    /**
     * Whether this was a fresh generation or an update
     */
    isUpdate: boolean;
    /**
     * Whether generation was skipped (for existing files when updateExisting is false)
     */
    skipped?: boolean;
}
/**
 * Class for generating documentation from analyzed files
 */
export declare class DocumentationGenerator {
    private config;
    private openRouterClient;
    private updateExisting;
    /**
     * Creates a new documentation generator
     * @param apiKey OpenRouter API key (optional)
     * @param model LLM model to use (optional)
     * @param updateExisting Whether to update existing documentation files (defaults to config value)
     */
    constructor(apiKey?: string, model?: string, updateExisting?: boolean);
    /**
     * Generates documentation for a directory
     * @param directoryPath Path to the directory
     * @param analysisResult Results of file analysis
     * @param isTopLevel Whether this is the top level of the directory structure
     * @param childrenDocs Documentation from child directories
     * @returns Documentation generation result
     */
    generateDocumentation(directoryPath: string, analysisResult: AnalysisResult, isTopLevel?: boolean, childrenDocs?: Array<{
        path: string;
        content: string;
    }>): Promise<DocumentationResult>;
    /**
     * Creates an undocumented.md file for directories that exceed limits
     * @param directoryPath Path to the directory
     * @param analysisResult Analysis result with limitation information
     * @returns Path to the created file
     */
    createUndocumentedFile(directoryPath: string, analysisResult: AnalysisResult): Promise<string>;
    /**
     * Reads existing documentation if it exists
     * @param docFilePath Path to the documentation file
     * @returns Content of the file or null if it doesn't exist
     */
    private readExistingDocumentation;
    /**
     * Creates content for an undocumented.md file
     * @param directoryPath Path to the directory
     * @param result Analysis result with limitation information
     * @returns Content for the undocumented.md file
     */
    private createUndocumentedContent;
}
