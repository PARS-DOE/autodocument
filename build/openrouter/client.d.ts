/**
 * Response from the LLM after generating documentation
 */
export interface DocumentationResponse {
    content: string;
    successful: boolean;
    error?: string;
}
/**
 * Client for communicating with OpenRouter API using OpenAI SDK
 */
export declare class OpenRouterClient {
    private client;
    private config;
    /**
     * Creates a new OpenRouter client
     * @param apiKey OpenRouter API key (overrides config)
     * @param model LLM model to use (overrides config)
     */
    constructor(apiKey?: string, model?: string);
    /**
     * Generate content with a custom system prompt
     * @param files Array of file content objects with path and content
     * @param systemPrompt Custom system prompt to use
     * @param existingContent Optional existing content to update
     * @param isTopLevel Whether this is the top level of the directory structure
     * @param childrenContent Optional content from child directories
     */
    generateWithCustomPrompt(files: Array<{
        path: string;
        content: string;
    }>, systemPrompt: string, existingContent?: string, isTopLevel?: boolean, childrenContent?: Array<{
        path: string;
        content: string;
    }>): Promise<DocumentationResponse>;
    /**
     * Generate documentation for a collection of files (for backward compatibility)
     * @param files Array of file content objects with path and content
     * @param existingDocumentation Optional existing documentation to update
     * @param isTopLevel Whether this is the top level of the directory structure
     * @param childrenDocs Optional documentation from child directories
     */
    generateDocumentation(files: Array<{
        path: string;
        content: string;
    }>, existingDocumentation?: string, isTopLevel?: boolean, childrenDocs?: Array<{
        path: string;
        content: string;
    }>): Promise<DocumentationResponse>;
}
