import * as fs from 'fs';
import * as path from 'path';
import { OpenRouterClient } from '../openrouter/client.js';
import { getConfig } from '../config.js';
/**
 * Class for generating documentation from analyzed files
 */
export class DocumentationGenerator {
    /**
     * Creates a new documentation generator
     * @param apiKey OpenRouter API key (optional)
     * @param model LLM model to use (optional)
     * @param updateExisting Whether to update existing documentation files (defaults to config value)
     */
    constructor(apiKey, model, updateExisting) {
        this.config = getConfig();
        this.openRouterClient = new OpenRouterClient(apiKey, model);
        this.updateExisting = updateExisting !== undefined ? updateExisting : this.config.documentation.updateExisting;
    }
    /**
     * Generates documentation for a directory
     * @param directoryPath Path to the directory
     * @param analysisResult Results of file analysis
     * @param isTopLevel Whether this is the top level of the directory structure
     * @param childrenDocs Documentation from child directories
     * @returns Documentation generation result
     */
    async generateDocumentation(directoryPath, analysisResult, isTopLevel = false, childrenDocs) {
        const docFilePath = path.join(directoryPath, this.config.documentation.outputFilename);
        const existingDocumentation = this.readExistingDocumentation(docFilePath);
        const isUpdate = existingDocumentation !== null;
        // Skip generation if the file exists and updateExisting is false
        if (isUpdate && !this.updateExisting) {
            console.log(`Skipping documentation for ${directoryPath} - File exists and updateExisting is false`);
            return {
                documentationPath: docFilePath,
                success: true,
                content: existingDocumentation,
                isUpdate: false,
                skipped: true
            };
        }
        // Convert analyzed files to format expected by OpenRouterClient
        const files = analysisResult.analyzedFiles.map((file) => ({
            path: path.relative(directoryPath, file.path),
            content: file.content
        }));
        try {
            // Generate documentation using OpenRouter
            const genResult = await this.openRouterClient.generateDocumentation(files, existingDocumentation || undefined, isTopLevel, childrenDocs);
            if (!genResult.successful) {
                return {
                    documentationPath: docFilePath,
                    success: false,
                    content: '',
                    error: genResult.error || 'Unknown error during documentation generation',
                    isUpdate
                };
            }
            // Write the generated documentation to file
            await fs.promises.writeFile(docFilePath, genResult.content, 'utf8');
            return {
                documentationPath: docFilePath,
                success: true,
                content: genResult.content,
                isUpdate
            };
        }
        catch (error) {
            return {
                documentationPath: docFilePath,
                success: false,
                content: '',
                error: `Error generating documentation: ${error.message}`,
                isUpdate
            };
        }
    }
    /**
     * Creates an undocumented.md file for directories that exceed limits
     * @param directoryPath Path to the directory
     * @param analysisResult Analysis result with limitation information
     * @returns Path to the created file
     */
    async createUndocumentedFile(directoryPath, analysisResult) {
        const undocPath = path.join(directoryPath, this.config.documentation.fallbackFilename);
        // Create content for undocumented.md
        const content = this.createUndocumentedContent(directoryPath, analysisResult);
        // Write to file
        await fs.promises.writeFile(undocPath, content, 'utf8');
        return undocPath;
    }
    /**
     * Reads existing documentation if it exists
     * @param docFilePath Path to the documentation file
     * @returns Content of the file or null if it doesn't exist
     */
    readExistingDocumentation(docFilePath) {
        try {
            if (fs.existsSync(docFilePath)) {
                return fs.readFileSync(docFilePath, 'utf8');
            }
            return null;
        }
        catch (error) {
            console.error(`Error reading existing documentation at ${docFilePath}:`, error);
            return null;
        }
    }
    /**
     * Creates content for an undocumented.md file
     * @param directoryPath Path to the directory
     * @param result Analysis result with limitation information
     * @returns Content for the undocumented.md file
     */
    createUndocumentedContent(directoryPath, result) {
        const dirName = path.basename(directoryPath);
        let content = `# ${dirName} - Documentation Skipped\n\n`;
        if (result.limited && result.limitReason) {
            content += `## Reason\n\n${result.limitReason}\n\n`;
        }
        if (result.analyzedFiles.length > 0) {
            content += `## Analyzed Files\n\n`;
            for (const file of result.analyzedFiles) {
                content += `- \`${path.relative(directoryPath, file.path)}\`\n`;
            }
            content += '\n';
        }
        if (result.excludedFiles.length > 0) {
            content += `## Excluded Files\n\n`;
            for (const file of result.excludedFiles) {
                content += `- \`${path.relative(directoryPath, file.path)}\`: ${file.reason}\n`;
            }
            content += '\n';
        }
        content += `## How to Fix\n\n`;
        content += `You can manually document this directory by replacing this file with a proper documentation.md file.\n`;
        content += `Alternatively, you can increase the file limits in the tool configuration and run again.\n`;
        return content;
    }
}
//# sourceMappingURL=generator.js.map