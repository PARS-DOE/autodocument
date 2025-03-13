#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { getConfig } from './config.js';
import { ToolRegistry } from './tools/registry.js';
import { ToolAggregator } from './tools/aggregator.js';
/**
 * Validates the arguments for auto-* tools
 */
function isValidAutoToolArgs(args) {
    return (typeof args === 'object' &&
        args !== null &&
        typeof args.path === 'string' &&
        (args.openRouterApiKey === undefined || typeof args.openRouterApiKey === 'string') &&
        (args.model === undefined || typeof args.model === 'string') &&
        (args.updateExisting === undefined || typeof args.updateExisting === 'boolean'));
}
/**
 * Main MCP server class for the autodocument tools
 */
class AutodocumentServer {
    constructor() {
        this.config = getConfig();
        // Initialize tool registry
        this.toolRegistry = new ToolRegistry(this.config.openRouter.apiKey, this.config.openRouter.model);
        this.server = new Server({
            name: 'autodocument-server',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
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
    setupToolHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: this.toolRegistry.getToolSchemas(),
        }));
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            // Check if the tool exists
            if (!this.toolRegistry.hasTool(request.params.name)) {
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
            // Validate arguments
            if (!isValidAutoToolArgs(request.params.arguments)) {
                throw new McpError(ErrorCode.InvalidParams, `Invalid arguments for ${request.params.name} tool. Expected: path (string), openRouterApiKey? (string), model? (string), updateExisting? (boolean)`);
            }
            const { path, openRouterApiKey, model, updateExisting } = request.params.arguments;
            const toolName = request.params.name;
            try {
                console.log(`Starting ${toolName} for directory: ${path} (updateExisting: ${updateExisting ?? 'default'})`);
                // Get the tool from the registry
                const tool = this.toolRegistry.getTool(toolName);
                // Create an aggregator with the provided arguments
                const aggregator = new ToolAggregator(path, tool, updateExisting);
                // Get progress token from the request metadata if available
                const progressToken = request.params._meta?.progressToken || `autodoc-${Date.now()}`;
                // Create a progress callback for logging progress and preventing timeouts
                const progressCallback = (directory, fileCount, currentDir, totalDirs) => {
                    // Calculate progress percentage
                    const percent = Math.round((currentDir / totalDirs) * 100);
                    // Log detailed progress to console - this will be seen in the logs
                    console.log(`[${percent}%] Processing directory: ${directory} (${fileCount} files, ${currentDir}/${totalDirs})`);
                    // Add heartbeat logging to prevent timeouts
                    if (currentDir % 3 === 0 || percent % 10 === 0) {
                        console.log(`Heartbeat at ${new Date().toISOString()}: ${percent}% complete`);
                    }
                };
                // Run the tool process with progress updates
                const result = await aggregator.run(progressCallback);
                // Format the result for display
                const resultSummary = tool.formatResultSummary(result);
                return {
                    content: [
                        {
                            type: 'text',
                            text: resultSummary,
                        },
                    ],
                };
            }
            catch (error) {
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
    // No more need for formatResultSummary here - it's now handled by each tool
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
//# sourceMappingURL=index.js.map