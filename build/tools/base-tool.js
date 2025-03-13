/**
 * Abstract base class for all auto-* tools
 */
export class BaseTool {
    constructor(config) {
        this.config = config;
        this.name = this.constructor.name || 'Tool';
    }
    /**
     * Get the output filename for this tool
     */
    getOutputFilename() {
        return this.config.outputFilename;
    }
    /**
     * Get the fallback filename for this tool
     */
    getFallbackFilename() {
        return this.config.fallbackFilename;
    }
    /**
     * Get the input schema for the tool
     */
    getInputSchema() {
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
    formatResultSummary(result) {
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
//# sourceMappingURL=base-tool.js.map