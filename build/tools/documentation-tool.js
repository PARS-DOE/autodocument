import * as fs from 'fs';
import * as path from 'path';
import { OpenRouterClient } from '../openrouter/client.js';
import { BaseTool } from './base-tool.js';
import { getConfig } from '../config.js';
import { documentationPrompts, updateExistingContentPrompt } from '../prompt-config.js';
/**
 * Tool for generating documentation
 */
export class DocumentationTool extends BaseTool {
    /**
     * Creates a new documentation tool
     * @param apiKey OpenRouter API key (optional)
     * @param model LLM model to use (optional)
     * @param updateExisting Whether to update existing files
     */
    constructor(apiKey, model, updateExisting) {
        // Get default config
        const config = getConfig();
        // Create tool config
        const toolConfig = {
            outputFilename: config.documentation.outputFilename,
            fallbackFilename: config.documentation.fallbackFilename,
            updateExisting: updateExisting !== undefined ? updateExisting : config.documentation.updateExisting,
            systemPrompt: documentationPrompts.systemPrompt,
            topLevelPrompt: documentationPrompts.topLevelPrompt,
            withChildrenPrompt: documentationPrompts.withChildrenPrompt
        };
        super(toolConfig);
        this.name = 'generate_documentation';
        this.description = 'Generates documentation for a code repository by recursively analyzing directories and files';
        // Initialize OpenRouter client
        this.openRouterClient = new OpenRouterClient(apiKey, model);
    }
    /**
     * Generates documentation for a directory
     * @param directoryPath Path to the directory
     * @param analysisResult Results of file analysis
     * @param isTopLevel Whether this is the top level directory
     * @param childrenContent Documentation from child directories
     * @returns Documentation generation result
     */
    async generate(directoryPath, analysisResult, isTopLevel = false, childrenContent) {
        const docFilePath = path.join(directoryPath, this.config.outputFilename);
        const existingDocumentation = this.readExistingFile(docFilePath);
        const isUpdate = existingDocumentation !== null;
        // Skip generation if the file exists and updateExisting is false
        if (isUpdate && !this.config.updateExisting) {
            console.log(`Skipping documentation for ${directoryPath} - File exists and updateExisting is false`);
            return {
                outputPath: docFilePath,
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
            // Determine the appropriate system prompt based on context
            let systemPrompt = this.config.systemPrompt;
            if (isTopLevel) {
                systemPrompt = this.config.topLevelPrompt;
            }
            else if (childrenContent && childrenContent.length > 0) {
                systemPrompt = this.config.withChildrenPrompt;
            }
            // Add instruction about existing documentation
            if (existingDocumentation) {
                systemPrompt += ` ${updateExistingContentPrompt}`;
            }
            // Generate documentation using OpenRouter
            const genResult = await this.openRouterClient.generateWithCustomPrompt(files, systemPrompt, existingDocumentation || undefined, isTopLevel, childrenContent);
            if (!genResult.successful) {
                return {
                    outputPath: docFilePath,
                    success: false,
                    content: '',
                    error: genResult.error || 'Unknown error during documentation generation',
                    isUpdate
                };
            }
            // Write the generated documentation to file
            await fs.promises.writeFile(docFilePath, genResult.content, 'utf8');
            return {
                outputPath: docFilePath,
                success: true,
                content: genResult.content,
                isUpdate
            };
        }
        catch (error) {
            return {
                outputPath: docFilePath,
                success: false,
                content: '',
                error: `Error generating documentation: ${error.message}`,
                isUpdate
            };
        }
    }
    /**
     * Creates fallback content for directories that exceed limits
     * @param directoryPath Path to the directory
     * @param analysisResult Analysis result with limitation information
     * @returns Content for the fallback file
     */
    async createFallbackContent(directoryPath, analysisResult) {
        const dirName = path.basename(directoryPath);
        let content = `# ${dirName} - Documentation Skipped\n\n`;
        if (analysisResult.limited && analysisResult.limitReason) {
            content += `## Reason\n\n${analysisResult.limitReason}\n\n`;
        }
        if (analysisResult.analyzedFiles.length > 0) {
            content += `## Analyzed Files\n\n`;
            for (const file of analysisResult.analyzedFiles) {
                content += `- \`${path.relative(directoryPath, file.path)}\`\n`;
            }
            content += '\n';
        }
        if (analysisResult.excludedFiles.length > 0) {
            content += `## Excluded Files\n\n`;
            for (const file of analysisResult.excludedFiles) {
                content += `- \`${path.relative(directoryPath, file.path)}\`: ${file.reason}\n`;
            }
            content += '\n';
        }
        content += `## How to Fix\n\n`;
        content += `You can manually document this directory by replacing this file with a proper documentation.md file.\n`;
        content += `Alternatively, you can increase the file limits in the tool configuration and run again.\n`;
        return content;
    }
    /**
     * Reads an existing file if it exists
     * @param filePath Path to the file
     * @returns Content of the file or null if it doesn't exist
     */
    readExistingFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }
            return null;
        }
        catch (error) {
            console.error(`Error reading existing file at ${filePath}:`, error);
            return null;
        }
    }
}
//# sourceMappingURL=documentation-tool.js.map