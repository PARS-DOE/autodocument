import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult } from '../analyzer/index.js';
import { OpenRouterClient } from '../openrouter/client.js';
import { BaseTool, AutoToolResult, BaseToolConfig } from './base-tool.js';
import { getConfig } from '../config.js';
import { codeReviewPrompts, updateExistingContentPrompt } from '../prompt-config.js';

/**
 * Configuration for the code review tool
 */
export interface ReviewToolConfig extends BaseToolConfig {
  systemPrompt: string;
  topLevelPrompt: string;
  withChildrenPrompt: string;
}

/**
 * Tool for generating code reviews
 */
export class ReviewTool extends BaseTool<ReviewToolConfig> {
  readonly name = 'autoreview';
  readonly description = 'Generates a code review for a repository by recursively analyzing directories and files, focusing on security issues, best practices, and potential improvements';
  
  private openRouterClient: OpenRouterClient;
  
  /**
   * Creates a new code review tool
   * @param apiKey OpenRouter API key (optional)
   * @param model LLM model to use (optional)
   * @param updateExisting Whether to update existing files
   */
  constructor(apiKey?: string, model?: string, updateExisting?: boolean) {
    // Get default config
    const config = getConfig();
    
    // Create tool config
    const toolConfig: ReviewToolConfig = {
      outputFilename: 'review.md',
      fallbackFilename: 'review-skipped.md',
      updateExisting: updateExisting !== undefined ? updateExisting : config.documentation.updateExisting,
      systemPrompt: codeReviewPrompts.systemPrompt,
      topLevelPrompt: codeReviewPrompts.topLevelPrompt,
      withChildrenPrompt: codeReviewPrompts.withChildrenPrompt
    };
    
    super(toolConfig);
    
    // Initialize OpenRouter client
    this.openRouterClient = new OpenRouterClient(apiKey, model);
  }
  
  /**
   * Generates a code review for a directory
   * @param directoryPath Path to the directory
   * @param analysisResult Results of file analysis
   * @param isTopLevel Whether this is the top level directory
   * @param childrenContent Review content from child directories
   * @returns Review generation result
   */
  public async generate(
    directoryPath: string,
    analysisResult: AnalysisResult,
    isTopLevel: boolean = false,
    childrenContent?: Array<{ path: string; content: string }>
  ): Promise<AutoToolResult> {
    const reviewFilePath = path.join(directoryPath, this.config.outputFilename);
    const existingReview = this.readExistingFile(reviewFilePath);
    const isUpdate = existingReview !== null;
    
    // Skip generation if the file exists and updateExisting is false
    if (isUpdate && !this.config.updateExisting) {
      console.log(`Skipping code review for ${directoryPath} - File exists and updateExisting is false`);
      return {
        outputPath: reviewFilePath,
        success: true,
        content: existingReview as string,
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
      
      // Add instruction about existing review
      if (existingReview) {
        systemPrompt += ` ${updateExistingContentPrompt}`;
      }

      // Generate code review using OpenRouter
      const genResult = await this.openRouterClient.generateWithCustomPrompt(
        files,
        systemPrompt,
        existingReview || undefined,
        isTopLevel,
        childrenContent
      );
      
      if (!genResult.successful) {
        return {
          outputPath: reviewFilePath,
          success: false,
          content: '',
          error: genResult.error || 'Unknown error during code review generation',
          isUpdate
        };
      }
      
      // Write the generated code review to file
      await fs.promises.writeFile(reviewFilePath, genResult.content, 'utf8');
      
      return {
        outputPath: reviewFilePath,
        success: true,
        content: genResult.content,
        isUpdate
      };
    } catch (error: any) {
      return {
        outputPath: reviewFilePath,
        success: false,
        content: '',
        error: `Error generating code review: ${error.message}`,
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
    
    let content = `# ${dirName} - Code Review Skipped\n\n`;
    
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
    content += `You can manually create a code review for this directory by replacing this file with a proper ${this.config.outputFilename} file.\n`;
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