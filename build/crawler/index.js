import * as fs from 'fs';
import * as path from 'path';
import { GitIgnoreParser } from './gitignore.js';
import { getConfig } from '../config.js';
/**
 * Class for crawling directories and identifying leaf directories
 */
export class DirectoryCrawler {
    /**
     * Creates a new directory crawler
     * @param rootPath The root directory to start from
     * @param options Options for the crawler
     */
    constructor(rootPath, options) {
        this.rootPath = rootPath;
        this.config = getConfig();
        this.options = {
            respectGitignore: true,
            includeHidden: false
        };
        if (options) {
            this.options = { ...this.options, ...options };
        }
        this.gitIgnoreParser = new GitIgnoreParser(rootPath);
        if (this.options.respectGitignore) {
            this.gitIgnoreParser.loadRules();
        }
    }
    /**
     * Scans the root directory and builds a directory tree
     * @returns The directory tree
     */
    async scan() {
        return this.scanDirectory(this.rootPath);
    }
    /**
     * Finds all leaf directories (directories with no subdirectories)
     * @returns Array of leaf directory paths
     */
    async findLeafDirectories() {
        const dirTree = await this.scan();
        const leafDirs = [];
        this.collectLeafDirs(dirTree, leafDirs);
        return leafDirs;
    }
    /**
     * Creates a bottom-up processing order for directories
     * @returns Array of directory paths in bottom-up order
     */
    async createBottomUpOrder() {
        const dirTree = await this.scan();
        const allDirs = [];
        const processedDirs = new Set();
        // Helper function to process directories bottom-up
        const processDir = (dir) => {
            // First process all subdirectories
            for (const subdir of dir.subdirectories) {
                if (!processedDirs.has(subdir.path)) {
                    processDir(subdir);
                }
            }
            // Then add this directory if not already processed
            if (!processedDirs.has(dir.path)) {
                allDirs.push(dir.path);
                processedDirs.add(dir.path);
            }
        };
        processDir(dirTree);
        return allDirs;
    }
    /**
     * Gets all code files in a directory based on the configured extensions
     * @param directoryPath Path to the directory
     * @returns Array of file paths
     */
    getCodeFiles(directoryPath) {
        try {
            const allFiles = fs.readdirSync(directoryPath)
                .filter(file => {
                const filePath = path.join(directoryPath, file);
                const stats = fs.statSync(filePath);
                // Skip directories
                if (stats.isDirectory()) {
                    return false;
                }
                // Check if it should be ignored by gitignore
                if (this.options.respectGitignore && this.gitIgnoreParser.shouldIgnore(filePath)) {
                    return false;
                }
                // Check if it's a hidden file
                if (!this.options.includeHidden && file.startsWith('.')) {
                    return false;
                }
                // Check if it's a code file based on extension
                const ext = path.extname(file).toLowerCase();
                return this.config.fileProcessing.codeExtensions.includes(ext);
            })
                .map(file => path.join(directoryPath, file));
            return allFiles;
        }
        catch (error) {
            console.error(`Error getting code files for ${directoryPath}:`, error);
            return [];
        }
    }
    /**
     * Checks if a directory contains any documentation files
     * @param directoryPath Path to the directory
     * @returns Path to documentation file if it exists, null otherwise
     */
    getDocumentationFile(directoryPath) {
        const docFilePath = path.join(directoryPath, this.config.documentation.outputFilename);
        if (fs.existsSync(docFilePath)) {
            return docFilePath;
        }
        return null;
    }
    /**
     * Checks if a directory has subdirectories
     * @param directoryPath Path to the directory
     * @returns True if the directory has subdirectories, false otherwise
     */
    hasSubdirectories(directoryPath) {
        try {
            // Get immediate subdirectories
            const subdirs = fs.readdirSync(directoryPath)
                .map(file => path.join(directoryPath, file))
                .filter(filePath => {
                try {
                    const stats = fs.statSync(filePath);
                    return stats.isDirectory() &&
                        (!this.options.respectGitignore || !this.gitIgnoreParser.shouldIgnore(filePath));
                }
                catch (e) {
                    return false;
                }
            });
            return subdirs.length > 0;
        }
        catch (error) {
            console.error(`Error checking subdirectories for ${directoryPath}:`, error);
            return false;
        }
    }
    /**
     * Gets single-file subdirectories that weren't documented on their own
     * @param directoryPath Path to the parent directory
     * @returns Array of file contents with information about their subdirectory
     */
    getSingleFileSubdirectories(directoryPath) {
        try {
            const result = [];
            // Get immediate subdirectories
            const subdirs = fs.readdirSync(directoryPath)
                .map(file => path.join(directoryPath, file))
                .filter(filePath => {
                const stats = fs.statSync(filePath);
                return stats.isDirectory() &&
                    (!this.options.respectGitignore || !this.gitIgnoreParser.shouldIgnore(filePath));
            });
            // For each subdirectory, check if it has only one code file
            for (const subdir of subdirs) {
                const files = this.getCodeFiles(subdir);
                if (files.length === 1) {
                    // This is a single-file directory - include its content
                    const fileContent = this.readFileContent(files[0]);
                    if (fileContent) {
                        result.push({
                            path: subdir,
                            content: `# ${path.basename(subdir)} - ${path.basename(files[0])}\n\n` +
                                `This file is from a single-file directory: ${path.relative(directoryPath, subdir)}\n\n` +
                                `\`\`\`\n${fileContent}\n\`\`\``
                        });
                    }
                }
            }
            return result;
        }
        catch (error) {
            console.error(`Error getting single-file subdirectories for ${directoryPath}:`, error);
            return [];
        }
    }
    /**
     * Gets content of documentation files from subdirectories
     * @param directoryPath Path to the parent directory
     * @returns Array of documentation file contents with paths
     */
    getSubdirectoryDocs(directoryPath) {
        try {
            const result = [];
            // Get immediate subdirectories
            const subdirs = fs.readdirSync(directoryPath)
                .map(file => path.join(directoryPath, file))
                .filter(filePath => {
                const stats = fs.statSync(filePath);
                return stats.isDirectory() &&
                    (!this.options.respectGitignore || !this.gitIgnoreParser.shouldIgnore(filePath));
            });
            // Check for documentation in each subdirectory
            for (const subdir of subdirs) {
                const docFile = this.getDocumentationFile(subdir);
                if (docFile) {
                    try {
                        const content = fs.readFileSync(docFile, 'utf8');
                        result.push({
                            path: subdir,
                            content
                        });
                    }
                    catch (e) {
                        console.error(`Error reading documentation file ${docFile}:`, e);
                    }
                }
            }
            return result;
        }
        catch (error) {
            console.error(`Error getting subdirectory docs for ${directoryPath}:`, error);
            return [];
        }
    }
    /**
     * Reads the content of a file
     * @param filePath Path to the file
     * @returns File content or null if error
     */
    readFileContent(filePath) {
        try {
            const stats = fs.statSync(filePath);
            // Check if file is too large
            if (stats.size > this.config.fileProcessing.maxFileSizeKb * 1024) {
                console.warn(`File ${filePath} exceeds max size limit of ${this.config.fileProcessing.maxFileSizeKb}KB`);
                return null;
            }
            return fs.readFileSync(filePath, 'utf8');
        }
        catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return null;
        }
    }
    // Private helper methods
    /**
     * Recursively scans a directory
     * @param dirPath Path to the directory
     * @returns Directory object
     */
    scanDirectory(dirPath) {
        try {
            const subdirectories = [];
            const files = [];
            // Read all entries in directory
            const entries = fs.readdirSync(dirPath);
            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry);
                // Skip if entry should be ignored
                if (this.options.respectGitignore && this.gitIgnoreParser.shouldIgnore(entryPath)) {
                    continue;
                }
                // Skip hidden files/directories if not included
                if (!this.options.includeHidden && entry.startsWith('.')) {
                    continue;
                }
                try {
                    const stats = fs.statSync(entryPath);
                    if (stats.isDirectory()) {
                        // Recursively scan subdirectory
                        const subdir = this.scanDirectory(entryPath);
                        subdirectories.push(subdir);
                    }
                    else {
                        // Add file
                        files.push(entryPath);
                    }
                }
                catch (error) {
                    console.error(`Error processing ${entryPath}:`, error);
                }
            }
            return {
                path: dirPath,
                name: path.basename(dirPath),
                subdirectories,
                files,
                isLeaf: subdirectories.length === 0
            };
        }
        catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
            return {
                path: dirPath,
                name: path.basename(dirPath),
                subdirectories: [],
                files: [],
                isLeaf: true
            };
        }
    }
    /**
     * Recursively collects leaf directories
     * @param dir Directory to process
     * @param result Array to collect leaf directories
     */
    collectLeafDirs(dir, result) {
        if (dir.isLeaf) {
            result.push(dir.path);
        }
        else {
            for (const subdir of dir.subdirectories) {
                this.collectLeafDirs(subdir, result);
            }
        }
    }
}
//# sourceMappingURL=index.js.map