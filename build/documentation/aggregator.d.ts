/**
 * Result of the documentation aggregation process
 */
export interface AggregationResult {
    /**
     * Total number of directories processed
     */
    totalDirectories: number;
    /**
     * Number of directories successfully documented
     */
    successfulDocumentations: number;
    /**
     * Number of directories that failed documentation
     */
    failedDocumentations: number;
    /**
     * Number of directories with undocumented.md files
     */
    undocumentedFiles: number;
    /**
     * Number of directories that were updated
     */
    updatedDocumentations: number;
    /**
     * Number of directories that were skipped (existing files when updateExisting is false)
     */
    skippedDocumentations: number;
    /**
     * Errors encountered during the process
     */
    errors: Array<{
        directory: string;
        error: string;
    }>;
}
/**
 * Type definition for progress callback
 */
export type ProgressCallback = (directory: string, fileCount: number, currentIndex: number, totalDirectories: number) => void;
/**
 * Class for handling the bottom-up aggregation of documentation
 */
export declare class DocumentationAggregator {
    private rootPath;
    private updateExisting;
    private crawler;
    private analyzer;
    private generator;
    /**
     * Creates a new documentation aggregator
     * @param rootPath The root directory to process
     * @param apiKey OpenRouter API key (optional)
     * @param model LLM model to use (optional)
     */
    constructor(rootPath: string, apiKey?: string, model?: string, updateExisting?: boolean);
    /**
     * Runs the full documentation aggregation process
     * @param progressCallback Optional callback for progress updates
     * @returns Results of the aggregation process
     */
    run(progressCallback?: ProgressCallback): Promise<AggregationResult>;
    /**
     * Generates documentation for a directory and updates the aggregation result
     * @param directoryPath Path to the directory
     * @param analysisResult Results of file analysis
     * @param isTopLevel Whether this is the top level directory
     * @param subdirDocs Documentation from subdirectories
     * @param aggregationResult Aggregation result to update
     * @returns Documentation generation result
     */
    private generateDocumentation;
}
