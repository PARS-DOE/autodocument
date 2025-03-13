import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult } from '../analyzer/index.js';
import { OpenRouterClient } from '../openrouter/client.js';
import { BaseTool, AutoToolResult, BaseToolConfig } from './base-tool.js';
import { getConfig } from '../config.js';
import { documentationPrompts, updateExistingContentPrompt } from '../prompt-config.js';

/**
 * Configuration for the documentation tool
 */
export interface DocumentationToolConfig extends BaseToolConfig {
  systemPrompt: string;
  topLevelPrompt: string;
  withChildrenPrompt: string;
}

/**
 * Tool for generating documentation
 */
export class DocumentationTool extends BaseTool<DocumentationToolConfig> {
  readonly name = 'generate_documentation';
  readonly description = 'Generates documentation for a code repository by recursively analyzing directories and files';
  
  private openRouterClient: OpenRouterClient;
  
  /**
   * Creates a new documentation tool
   * @param apiKey OpenRouter API key (optional)
   * @param model LLM model to use (optional)
   * @param updateExisting Whether to update existing files
   */
  constructor(apiKey?: string, model?: string, updateExisting?: boolean) {
    // Get default config
    const config = getConfig();
    
    // Create tool config
    const toolConfig: DocumentationToolConfig = {
      outputFilename: config.documentation.outputFilename,
      fallbackFilename: config.documentation.fallbackFilename,
      updateExisting: updateExisting !== undefined ? updateExisting : config.documentation.updateExisting,
      systemPrompt: documentationPrompts.systemPrompt,
      topLevelPrompt: documentationPrompts.topLevelPrompt,
      withChildrenPrompt: documentationPrompts.withChildrenPrompt
    };
    
    super(toolConfig);
    
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
  public async generate(
    directoryPath: string,
    analysisResult: AnalysisResult,
    isTopLevel: boolean = false,
    childrenContent?: Array<{ path: string; content: string }>
  ): Promise<AutoToolResult> {
    const docFilePath = path.join(directoryPath, this.config.outputFilename);
    const existingDocumentation = this.readExistingFile(docFilePath);
    const isUpdate = existingDocumentation !== null;
    
    // Skip generation if the file exists and updateExisting is false
    if (isUpdate && !this.config.updateExisting) {
      console.log(`Skipping documentation for ${directoryPath} - File exists and updateExisting is false`);
      return {
        outputPath: docFilePath,
        success: true,
        content: existingDocumentation as string,
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
      } else if (childrenContent && childrenContent.length > 0) {
        systemPrompt = this.config.withChildrenPrompt;
      }
      
      // Add instruction about existing documentation
      if (existingDocumentation) {
        systemPrompt += ` ${updateExistingContentPrompt}`;
      }

      // Generate documentation using OpenRouter
      const genResult = await this.openRouterClient.generateWithCustomPrompt(
        files,
        systemPrompt,
        existingDocumentation || undefined,
        isTopLevel,
        childrenContent
      );
      
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
    } catch (error: any) {
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
  public async createFallbackContent(
    directoryPath: string,
    analysisResult: AnalysisResult
  ): Promise<string> {
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
  private readExistingFile(filePath: string): string | null {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
      return null;
    } catch (error) {
      console.error(`Error reading existing file at ${filePath}:`, error);
      return null;
    }
  }
}