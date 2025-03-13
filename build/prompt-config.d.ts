/**
 * Configuration for prompts used across different auto-* tools
 *
 * These prompts can be modified to customize the behavior of the tools
 * without having to change the code implementation.
 */
/**
 * Prompts for documentation generation
 */
export declare const documentationPrompts: {
    /**
     * Default prompt for regular directories
     */
    systemPrompt: string;
    /**
     * Prompt for top-level directories
     */
    topLevelPrompt: string;
    /**
     * Prompt for directories with children
     */
    withChildrenPrompt: string;
};
/**
 * Prompts for test plan generation
 */
export declare const testPlanPrompts: {
    /**
     * Default prompt for regular directories
     */
    systemPrompt: string;
    /**
     * Prompt for top-level directories
     */
    topLevelPrompt: string;
    /**
     * Prompt for directories with children
     */
    withChildrenPrompt: string;
};
/**
 * Prompts for code review generation
 */
export declare const codeReviewPrompts: {
    /**
     * Default prompt for regular directories
     */
    systemPrompt: string;
    /**
     * Prompt for top-level directories
     */
    topLevelPrompt: string;
    /**
     * Prompt for directories with children
     */
    withChildrenPrompt: string;
};
export declare const updateExistingContentPrompt = "There is existing content that may need updating. Review it and incorporate any still-relevant information, but update as needed to match the current code.";
