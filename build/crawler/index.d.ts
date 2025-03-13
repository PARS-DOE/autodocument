/**
 * Represents a directory in the file system
 */
export interface Directory {
    path: string;
    name: string;
    subdirectories: Directory[];
    files: string[];
    isLeaf: boolean;
}
/**
 * Options for the directory crawler
 */
export interface CrawlerOptions {
    respectGitignore: boolean;
    includeHidden: boolean;
}
/**
 * Class for crawling directories and identifying leaf directories
 */
export declare class DirectoryCrawler {
    private rootPath;
    private gitIgnoreParser;
    private config;
    private options;
    /**
     * Creates a new directory crawler
     * @param rootPath The root directory to start from
     * @param options Options for the crawler
     */
    constructor(rootPath: string, options?: Partial<CrawlerOptions>);
    /**
     * Scans the root directory and builds a directory tree
     * @returns The directory tree
     */
    scan(): Promise<Directory>;
    /**
     * Finds all leaf directories (directories with no subdirectories)
     * @returns Array of leaf directory paths
     */
    findLeafDirectories(): Promise<string[]>;
    /**
     * Creates a bottom-up processing order for directories
     * @returns Array of directory paths in bottom-up order
     */
    createBottomUpOrder(): Promise<string[]>;
    /**
     * Gets all code files in a directory based on the configured extensions
     * @param directoryPath Path to the directory
     * @returns Array of file paths
     */
    getCodeFiles(directoryPath: string): string[];
    /**
     * Checks if a directory contains any documentation files
     * @param directoryPath Path to the directory
     * @returns Path to documentation file if it exists, null otherwise
     */
    getDocumentationFile(directoryPath: string): string | null;
    /**
     * Checks if a directory has subdirectories
     * @param directoryPath Path to the directory
     * @returns True if the directory has subdirectories, false otherwise
     */
    hasSubdirectories(directoryPath: string): boolean;
    /**
     * Gets single-file subdirectories that weren't documented on their own
     * @param directoryPath Path to the parent directory
     * @returns Array of file contents with information about their subdirectory
     */
    getSingleFileSubdirectories(directoryPath: string): Array<{
        path: string;
        content: string;
    }>;
    /**
     * Gets content of documentation files from subdirectories
     * @param directoryPath Path to the parent directory
     * @returns Array of documentation file contents with paths
     */
    getSubdirectoryDocs(directoryPath: string): Array<{
        path: string;
        content: string;
    }>;
    /**
     * Reads the content of a file
     * @param filePath Path to the file
     * @returns File content or null if error
     */
    readFileContent(filePath: string): string | null;
    /**
     * Recursively scans a directory
     * @param dirPath Path to the directory
     * @returns Directory object
     */
    private scanDirectory;
    /**
     * Recursively collects leaf directories
     * @param dir Directory to process
     * @param result Array to collect leaf directories
     */
    private collectLeafDirs;
}
