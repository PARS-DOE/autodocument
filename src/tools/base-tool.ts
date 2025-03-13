import { AnalysisResult } from '../analyzer/index.js';
import { DocumentationResult } from '../documentation/generator.js';

/**
 * Base interface for all auto-* tool configurations
 */
export interface BaseToolConfig {
  outputFilename: string;
  fallbackFilename: string;
  updateExisting: boolean;
}

/**
 * Base interface for all auto-* tool results
 */
export interface AutoToolResult {
  /**
   * Path to the generated file
   */
  outputPath: string;
  
  /**
   * Whether generation was successful
   */
  success: boolean;
  
  /**
   * Content of the generated file
   */
  content: string;
  
  /**
   * Error message if generation failed
   */
  error?: string;
  
  /**
   * Whether this was a fresh generation or an update
   */
  isUpdate: boolean;

  /**
   * Whether generation was skipped (for existing files when updateExisting is false)
   */
  skipped?: boolean;
}

/**
 * Abstract base class for all auto-* tools
 */
export abstract class BaseTool<T extends BaseToolConfig> {
  /**
   * The name of the tool (used for registration)
   */
  abstract readonly name: string;
  
  /**
   * The description of the tool
   */
  abstract readonly description: string;
  
  /**
   * The configuration for the tool
   */
  protected config: T;
  
  constructor(config: T) {
    this.config = config;
  }
  
  /**
   * Get the output filename for this tool
   */
  getOutputFilename(): string {
    return this.config.outputFilename;
  }
  
  /**
   * Get the fallback filename for this tool
   */
  getFallbackFilename(): string {
    return this.config.fallbackFilename;
  }
  
  /**
   * Abstract method to generate content for a directory
   */
  abstract generate(
    directoryPath: string,
    analysisResult: AnalysisResult,
    isTopLevel: boolean,
    childrenContent?: Array<{ path: string; content: string }>
  ): Promise<AutoToolResult>;
  
  /**
   * Abstract method to create fallback content for directories that exceed limits
   */
  abstract createFallbackContent(
    directoryPath: string,
    analysisResult: AnalysisResult
  ): Promise<string>;
  
  /**
   * Get the input schema for the tool
   */
  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the directory to analyze. This should be the full directory path, NOT the relative path.',
        },
        openRouterApiKey: {
          type: 'string',
          description: 'OpenRouter API key (optional, can also be set in environment variable)',
        },
        model: {
          type: 'string',
          description: 'LLM model to use (optional, defaults to Claude 3.7)',
        },
        updateExisting: {
          type: 'boolean',
          description: `Whether to update existing ${this.name} files (optional, defaults to true) or only create missing ones`,
        },
      },
      required: ['path'],
    };
  }
  
  /**
   * Format the aggregation result for display
   */
  formatResultSummary(result: any): string {
    let summary = `# ${this.name} Generation Complete\n\n`;
    
    summary += `## Summary\n\n`;
    summary += `- Total directories processed: ${result.totalDirectories}\n`;
    summary += `- Successful generations: ${result.successfulGenerations}\n`;
    summary += `- Updated generations: ${result.updatedGenerations}\n`;
    summary += `- Skipped generations: ${result.skippedGenerations}\n`;
    summary += `- Failed generations: ${result.failedGenerations}\n`;
    summary += `- Fallback files created: ${result.fallbackFiles}\n\n`;
    
    if (result.errors.length > 0) {
      summary += `## Errors\n\n`;
      for (const error of result.errors) {
        summary += `- **${error.directory}**: ${error.error}\n`;
      }
      summary += '\n';
    }
    
    summary += `## Next Steps\n\n`;
    summary += `- Review the generated ${this.config.outputFilename} files\n`;
    summary += `- Manually update any ${this.config.fallbackFilename} files if needed\n`;
    summary += `- Consider adjusting configuration parameters if too many files were skipped\n`;
    
    return summary;
  }
}