/**
 * Result of file analysis
 */
export interface AnalysisResult {
    /**
     * Files that were successfully analyzed
     */
    analyzedFiles: Array<{
        path: string;
        content: string;
        extension: string;
    }>;
    /**
     * Files that were excluded due to size or other limits
     */
    excludedFiles: Array<{
        path: string;
        reason: string;
    }>;
    /**
     * Whether the analysis was limited due to size/count constraints
     */
    limited: boolean;
    /**
     * Total size of all analyzed files in bytes
     */
    totalSize: number;
    /**
     * Reason for limitation if any
     */
    limitReason?: string;
}
/**
 * Class for analyzing files in a directory
 */
export declare class FileAnalyzer {
    private config;
    /**
     * Analyzes files in a directory
     * @param directoryPath Path to the directory
     * @param filePaths Array of file paths to analyze
     * @returns Analysis result
     */
    analyzeFiles(directoryPath: string, filePaths: string[]): Promise<AnalysisResult>;
    /**
     * Checks if a directory has enough code files to be documented
     * @param directoryPath Path to the directory
     * @param filePaths Array of file paths in the directory
     * @returns True if the directory should be documented, false otherwise
     */
    shouldDocument(directoryPath: string, filePaths: string[], hasSubdirectories?: boolean): boolean;
    /**
     * A simple function to test if the analyzer would document an empty directory with subdirectories
     * This can be invoked manually to verify the fix is working
     * @param hasSubdirectories Whether the directory has subdirectories
     * @returns Whether the directory should be documented
     */
    testShouldDocumentEmptyDirWithSubdirs(hasSubdirectories: boolean): boolean;
    /**
     * Creates content for an undocumented.md file
     * @param directoryPath Path to the directory
     * @param result Analysis result
     * @returns Content for undocumented.md file
     */
    createUndocumentedContent(directoryPath: string, result: AnalysisResult): string;
    /**
     * Process a single file and add it to the analysis result
     * @param filePath Path to the file
     * @param result Analysis result to update
     */
    private processFile;
}
