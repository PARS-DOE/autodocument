import { DocumentationTool } from './documentation-tool.js';
import { TestPlanTool } from './testplan-tool.js';
import { ReviewTool } from './review-tool.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
/**
 * Registry for all auto-* tools
 */
export class ToolRegistry {
    /**
     * Creates a new tool registry
     * @param apiKey OpenRouter API key (optional)
     * @param model LLM model to use (optional)
     */
    constructor(apiKey, model) {
        this.tools = new Map();
        // Register available tools
        this.registerTools(apiKey, model);
    }
    /**
     * Registers all available tools
     * @param apiKey OpenRouter API key (optional)
     * @param model LLM model to use (optional)
     */
    registerTools(apiKey, model) {
        // Register documentation tool
        const documentationTool = new DocumentationTool(apiKey, model);
        this.registerTool(documentationTool);
        // Register test plan tool
        const testPlanTool = new TestPlanTool(apiKey, model);
        this.registerTool(testPlanTool);
        // Register code review tool
        const reviewTool = new ReviewTool(apiKey, model);
        this.registerTool(reviewTool);
        // Register more tools here...
    }
    /**
     * Registers a tool
     * @param tool Tool to register
     */
    registerTool(tool) {
        this.tools.set(tool.name, tool);
    }
    /**
     * Gets a tool by name
     * @param name Name of the tool
     * @returns Tool instance
     */
    getTool(name) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
        return tool;
    }
    /**
     * Gets all tools
     * @returns Array of all registered tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Checks if a tool exists
     * @param name Name of the tool
     * @returns True if the tool exists, false otherwise
     */
    hasTool(name) {
        return this.tools.has(name);
    }
    /**
     * Gets tool input schemas
     * @returns Array of tool schemas
     */
    getToolSchemas() {
        return this.getAllTools().map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.getInputSchema(),
        }));
    }
}
//# sourceMappingURL=registry.js.map