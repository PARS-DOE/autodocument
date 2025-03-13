import { BaseTool } from './base-tool.js';
/**
 * Result of the tool aggregation process
 */
export interface AggregationResult {
    /**
     * Total number of directories processed
     */
    totalDirectories: number;
    /**
     * Number of directories successfully processed
     */
    successfulGenerations: number;
    /**
     * Number of directories that failed processing
     */
    failedGenerations: number;
    /**
     * Number of directories with fallback files
     */
    fallbackFiles: number;
    /**
     * Number of directories that were updated
     */
    updatedGenerations: number;
    /**
     * Number of directories that were skipped (existing files when updateExisting is false)
     */
    skippedGenerations: number;
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
 * Class for handling the bottom-up aggregation process for auto-* tools
 */
export declare class ToolAggregator {
    private rootPath;
    private updateExisting;
    private crawler;
    private analyzer;
    private tool;
    /**
     * Creates a new tool aggregator
     * @param rootPath The root directory to process
     * @param tool The tool to use for generating content
     * @param updateExisting Whether to update existing files
     */
    constructor(rootPath: string, tool: BaseTool<any>, updateExisting?: boolean);
    /**
     * Runs the full aggregation process
     * @param progressCallback Optional callback for progress updates
     * @returns Results of the aggregation process
     */
    run(progressCallback?: ProgressCallback): Promise<AggregationResult>;
    /**
     * Generates content for a directory and updates the aggregation result
     * @param directoryPath Path to the directory
     * @param analysisResult Results of file analysis
     * @param isTopLevel Whether this is the top level directory
     * @param childContent Content from child directories
     * @param aggregationResult Aggregation result to update
     * @returns Generation result
     */
    private generateContent;
}
