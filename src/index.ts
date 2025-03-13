#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { DocumentationAggregator } from './documentation/aggregator.js';
import { getConfig } from './config.js';

interface GenerateDocumentationArgs {
  path: string;
  openRouterApiKey?: string;
  model?: string;
}

/**
 * Validates the arguments for the generate_documentation tool
 */
function isValidGenerateDocumentationArgs(args: any): args is GenerateDocumentationArgs {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.path === 'string' &&
    (args.openRouterApiKey === undefined || typeof args.openRouterApiKey === 'string') &&
    (args.model === undefined || typeof args.model === 'string')
  );
}

/**
 * Main MCP server class for the autodocument tool
 */
class AutodocumentServer {
  private server: Server;
  private config = getConfig();

  constructor() {
    this.server = new Server(
      {
        name: 'autodocument-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Sets up the tool handlers for the MCP server
   */
  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_documentation',
          description: 'Generates documentation for a code repository by recursively analyzing directories and files',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the directory to analyze',
              },
              openRouterApiKey: {
                type: 'string',
                description: 'OpenRouter API key (optional, can also be set in environment variable)',
              },
              model: {
                type: 'string',
                description: 'LLM model to use (optional, defaults to Claude 3.7)',
              },
            },
            required: ['path'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'generate_documentation') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      if (!isValidGenerateDocumentationArgs(request.params.arguments)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid arguments for generate_documentation tool'
        );
      }

      const { path, openRouterApiKey, model } = request.params.arguments;

      try {
        console.log(`Starting documentation generation for directory: ${path}`);
        
        // Create an aggregator with the provided arguments
        const aggregator = new DocumentationAggregator(
          path,
          openRouterApiKey || this.config.openRouter.apiKey,
          model || this.config.openRouter.model
        );
        
        // Get progress token from the request metadata if available
        const progressToken = request.params._meta?.progressToken || `autodoc-${Date.now()}`;
        
        // Create a progress callback for logging progress and preventing timeouts
        const progressCallback = (directory: string, fileCount: number, currentDir: number, totalDirs: number) => {
          // Calculate progress percentage
          const percent = Math.round((currentDir / totalDirs) * 100);
          
          // Log detailed progress to console - this will be seen in the logs
          console.log(`[${percent}%] Processing directory: ${directory} (${fileCount} files, ${currentDir}/${totalDirs})`);
          
          // Add heartbeat logging to prevent timeouts
          if (currentDir % 3 === 0 || percent % 10 === 0) {
            console.log(`Heartbeat at ${new Date().toISOString()}: ${percent}% complete`);
          }
        };
        
        // Run the documentation process with progress updates
        const result = await aggregator.run(progressCallback);
        
        // Format the result for display
        const resultSummary = this.formatResultSummary(result);
        
        return {
          content: [
            {
              type: 'text',
              text: resultSummary,
            },
          ],
        };
      } catch (error: any) {
        console.error('Error generating documentation:', error);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error generating documentation: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Formats the aggregation result for display
   * @param result Aggregation result to format
   * @returns Formatted result as a string
   */
  private formatResultSummary(result: any): string {
    let summary = `# Documentation Generation Complete\n\n`;
    
    summary += `## Summary\n\n`;
    summary += `- Total directories processed: ${result.totalDirectories}\n`;
    summary += `- Successful documentations: ${result.successfulDocumentations}\n`;
    summary += `- Updated documentations: ${result.updatedDocumentations}\n`;
    summary += `- Failed documentations: ${result.failedDocumentations}\n`;
    summary += `- Undocumented files created: ${result.undocumentedFiles}\n\n`;
    
    if (result.errors.length > 0) {
      summary += `## Errors\n\n`;
      for (const error of result.errors) {
        summary += `- **${error.directory}**: ${error.error}\n`;
      }
      summary += '\n';
    }
    
    summary += `## Next Steps\n\n`;
    summary += `- Review the generated documentation.md files\n`;
    summary += `- Manually update any undocumented.md files if needed\n`;
    summary += `- Consider adjusting configuration parameters if too many files were skipped\n`;
    
    return summary;
  }

  /**
   * Starts the MCP server
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Autodocument MCP server running on stdio');
  }
}

// Run the server
const server = new AutodocumentServer();
server.run().catch(console.error);