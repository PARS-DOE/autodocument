import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';
/**
 * Class for parsing and applying .gitignore rules
 */
export class GitIgnoreParser {
    /**
     * Creates a new GitIgnore parser
     * @param rootPath The root directory to start from
     */
    constructor(rootPath) {
        this.rootPath = rootPath;
        this.ig = ignore();
        this.loaded = false;
    }
    /**
     * Loads gitignore rules from the root directory
     */
    loadRules() {
        try {
            const gitignorePath = path.join(this.rootPath, '.gitignore');
            // Check if .gitignore exists
            if (fs.existsSync(gitignorePath)) {
                const content = fs.readFileSync(gitignorePath, 'utf8');
                this.ig = ignore().add(content);
                this.loaded = true;
                console.log('GitIgnore rules loaded successfully');
                return true;
            }
            else {
                console.log('No .gitignore file found, no ignore rules will be applied');
                this.loaded = false;
                return false;
            }
        }
        catch (error) {
            console.error('Error loading .gitignore rules:', error);
            this.loaded = false;
            return false;
        }
    }
    /**
     * Checks if a path should be ignored based on gitignore rules
     * @param filePath Path to check (relative to the root directory)
     * @returns True if the path should be ignored, false otherwise
     */
    shouldIgnore(filePath) {
        // If no rules are loaded, don't ignore anything
        if (!this.loaded) {
            return false;
        }
        // Make path relative to root if it's absolute
        let relativePath = filePath;
        if (path.isAbsolute(filePath)) {
            relativePath = path.relative(this.rootPath, filePath);
        }
        // Normalize path separators to forward slashes for ignore to work correctly
        relativePath = relativePath.replace(/\\/g, '/');
        return this.ig.ignores(relativePath);
    }
    /**
     * Filters an array of paths based on gitignore rules
     * @param paths Array of paths to filter
     * @returns Array of paths that should not be ignored
     */
    filterPaths(paths) {
        // If no rules are loaded, return all paths
        if (!this.loaded) {
            return paths;
        }
        return paths.filter(p => !this.shouldIgnore(p));
    }
}
//# sourceMappingURL=gitignore.js.map