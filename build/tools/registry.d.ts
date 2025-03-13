import { BaseTool } from './base-tool.js';
/**
 * Registry for all auto-* tools
 */
export declare class ToolRegistry {
    private tools;
    /**
     * Creates a new tool registry
     * @param apiKey OpenRouter API key (optional)
     * @param model LLM model to use (optional)
     */
    constructor(apiKey?: string, model?: string);
    /**
     * Registers all available tools
     * @param apiKey OpenRouter API key (optional)
     * @param model LLM model to use (optional)
     */
    private registerTools;
    /**
     * Registers a tool
     * @param tool Tool to register
     */
    registerTool(tool: BaseTool<any>): void;
    /**
     * Gets a tool by name
     * @param name Name of the tool
     * @returns Tool instance
     */
    getTool(name: string): BaseTool<any>;
    /**
     * Gets all tools
     * @returns Array of all registered tools
     */
    getAllTools(): BaseTool<any>[];
    /**
     * Checks if a tool exists
     * @param name Name of the tool
     * @returns True if the tool exists, false otherwise
     */
    hasTool(name: string): boolean;
    /**
     * Gets tool input schemas
     * @returns Array of tool schemas
     */
    getToolSchemas(): any[];
}
