/**
 * Class for parsing and applying .gitignore rules
 */
export declare class GitIgnoreParser {
    private rootPath;
    private ig;
    private loaded;
    /**
     * Creates a new GitIgnore parser
     * @param rootPath The root directory to start from
     */
    constructor(rootPath: string);
    /**
     * Loads gitignore rules from the root directory
     */
    loadRules(): boolean;
    /**
     * Checks if a path should be ignored based on gitignore rules
     * @param filePath Path to check (relative to the root directory)
     * @returns True if the path should be ignored, false otherwise
     */
    shouldIgnore(filePath: string): boolean;
    /**
     * Filters an array of paths based on gitignore rules
     * @param paths Array of paths to filter
     * @returns Array of paths that should not be ignored
     */
    filterPaths(paths: string[]): string[];
}
