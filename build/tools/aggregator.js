import * as path from 'path';
import * as fs from 'fs';
import { DirectoryCrawler } from '../crawler/index.js';
import { FileAnalyzer } from '../analyzer/index.js';
/**
 * Class for handling the bottom-up aggregation process for auto-* tools
 */
export class ToolAggregator {
    /**
     * Creates a new tool aggregator
     * @param rootPath The root directory to process
     * @param tool The tool to use for generating content
     * @param updateExisting Whether to update existing files
     */
    constructor(rootPath, tool, updateExisting = true) {
        this.rootPath = rootPath;
        this.updateExisting = updateExisting;
        this.crawler = new DirectoryCrawler(rootPath, { respectGitignore: true });
        this.analyzer = new FileAnalyzer();
        this.tool = tool;
    }
    /**
     * Runs the full aggregation process
     * @param progressCallback Optional callback for progress updates
     * @returns Results of the aggregation process
     */
    async run(progressCallback) {
        const result = {
            totalDirectories: 0,
            successfulGenerations: 0,
            failedGenerations: 0,
            fallbackFiles: 0,
            updatedGenerations: 0,
            skippedGenerations: 0,
            errors: []
        };
        try {
            // Create a bottom-up processing order
            const directories = await this.crawler.createBottomUpOrder();
            result.totalDirectories = directories.length;
            // Process each directory in bottom-up order
            for (let i = 0; i < directories.length; i++) {
                const directoryPath = directories[i];
                console.log(`Processing directory: ${directoryPath}`);
                // Get all code files in the directory
                const files = this.crawler.getCodeFiles(directoryPath);
                // Report progress if callback is provided
                if (progressCallback) {
                    progressCallback(path.relative(this.rootPath, directoryPath) || '.', files.length, i + 1, directories.length);
                }
                // Check if directory has subdirectories
                const hasSubdirectories = this.crawler.hasSubdirectories(directoryPath);
                // Check if directory should be processed
                if (!this.analyzer.shouldDocument(directoryPath, files, hasSubdirectories)) {
                    console.log(`Skipping directory ${directoryPath} - Not enough code files to process or skipped due to rules`);
                    // If this is a single-file directory, it will be included in its parent's processing
                    continue;
                }
                // Get content from subdirectories and single-file directories that weren't processed
                const subdirContent = this.crawler.getSubdirectoryDocs(directoryPath);
                // Get single-file subdirectories' content to include in this directory's processing
                const singleFileContent = this.crawler.getSingleFileSubdirectories(directoryPath);
                // Check if this is a directory with no code files but with subdirectories
                if (files.length === 0 && hasSubdirectories) {
                    console.log(`Processing directory ${directoryPath} - No code files, but contains subdirectories with content`);
                }
                // Analyze files (might be empty if directory only has subdirectories)
                const analysisResult = await this.analyzer.analyzeFiles(directoryPath, files);
                // Check if files are too large or too many
                if (analysisResult.limited) {
                    console.log(`Directory ${directoryPath} exceeds limits: ${analysisResult.limitReason}`);
                    const fallbackContent = await this.tool.createFallbackContent(directoryPath, analysisResult);
                    // Get fallback filename from tool's public method
                    const fallbackFilename = this.tool.getFallbackFilename();
                    const fallbackPath = path.join(directoryPath, fallbackFilename);
                    await fs.promises.writeFile(fallbackPath, fallbackContent, 'utf8');
                    result.fallbackFiles++;
                    continue;
                }
                // Get all content from child directories (subdirectories and single-file directories)
                const allChildContent = [...subdirContent];
                // Add content from single-file subdirectories
                if (singleFileContent.length > 0) {
                    allChildContent.push(...singleFileContent);
                }
                // Generate content
                const isTopLevel = directoryPath === this.rootPath;
                const genResult = await this.generateContent(directoryPath, analysisResult, isTopLevel, allChildContent, result);
                if (genResult.skipped) {
                    result.skippedGenerations++;
                    console.log(`Skipped existing content for ${directoryPath} (updateExisting=false)`);
                }
                else if (genResult.isUpdate) {
                    result.updatedGenerations++;
                }
            }
            return result;
        }
        catch (error) {
            console.error('Error during aggregation:', error);
            result.errors.push({
                directory: this.rootPath,
                error: `Global error: ${error.message}`
            });
            return result;
        }
    }
    /**
     * Generates content for a directory and updates the aggregation result
     * @param directoryPath Path to the directory
     * @param analysisResult Results of file analysis
     * @param isTopLevel Whether this is the top level directory
     * @param childContent Content from child directories
     * @param aggregationResult Aggregation result to update
     * @returns Generation result
     */
    async generateContent(directoryPath, analysisResult, isTopLevel, childContent, aggregationResult) {
        try {
            const genResult = await this.tool.generate(directoryPath, analysisResult, isTopLevel, childContent);
            if (genResult.success) {
                console.log(`Successfully ${genResult.isUpdate ? 'updated' : 'generated'} content for ${directoryPath}`);
                aggregationResult.successfulGenerations++;
            }
            else {
                console.error(`Failed to generate content for ${directoryPath}:`, genResult.error);
                aggregationResult.failedGenerations++;
                aggregationResult.errors.push({
                    directory: directoryPath,
                    error: genResult.error || 'Unknown error'
                });
            }
            return genResult;
        }
        catch (error) {
            console.error(`Error generating content for ${directoryPath}:`, error);
            aggregationResult.failedGenerations++;
            aggregationResult.errors.push({
                directory: directoryPath,
                error: error.message
            });
            return {
                outputPath: path.join(directoryPath, this.tool.getOutputFilename()),
                success: false,
                content: '',
                error: error.message,
                isUpdate: false
            };
        }
    }
}
//# sourceMappingURL=aggregator.js.map