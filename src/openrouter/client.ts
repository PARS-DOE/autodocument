import { OpenAI } from 'openai';
import { getConfig } from '../config.js';

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
export class OpenRouterClient {
  private client: OpenAI;
  private config = getConfig();

  /**
   * Creates a new OpenRouter client
   * @param apiKey OpenRouter API key (overrides config)
   * @param model LLM model to use (overrides config)
   */
  constructor(apiKey?: string, model?: string) {
    if (apiKey) {
      this.config.openRouter.apiKey = apiKey;
    }

    if (model) {
      this.config.openRouter.model = model;
    }

    // Validate API key
    if (!this.config.openRouter.apiKey) {
      throw new Error('OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable or pass it to the constructor.');
    }

    // Initialize OpenAI client with OpenRouter base URL
    this.client = new OpenAI({
      apiKey: this.config.openRouter.apiKey,
      baseURL: this.config.openRouter.baseUrl,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/PARS-DOE/autodocument', // Required by OpenRouter
      },
    });
  }

  /**
   * Generate documentation for a collection of files
   * @param files Array of file content objects with path and content
   * @param existingDocumentation Optional existing documentation to update
   * @param isTopLevel Whether this is the top level of the directory structure
   * @param childrenDocs Optional documentation from child directories
   */
  async generateDocumentation(
    files: Array<{ path: string; content: string }>,
    existingDocumentation?: string,
    isTopLevel: boolean = false,
    childrenDocs?: Array<{ path: string; content: string }>
  ): Promise<DocumentationResponse> {
    try {
      // Prepare file contents for the prompt
      const fileContents = files.map(file => 
        `File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\``
      ).join('\n\n');

      // Prepare children documentation if available
      const childrenDocsContent = childrenDocs ? 
        childrenDocs.map(doc => 
          `Sub-directory Documentation: ${doc.path}\n\`\`\`markdown\n${doc.content}\n\`\`\``
        ).join('\n\n') : '';

      // Determine prompt based on level and existing documentation
      let systemPrompt: string;
      
      if (isTopLevel) {
        systemPrompt = `You are a technical documentation expert. Create a high-level markdown documentation file that explains the functionality and architecture of a code project. This is the TOP-LEVEL directory, so provide a comprehensive overview of the entire project structure. DO NOT INCLUDE CODE SAMPLES. Keep your response concise and focused on explaining what each file does and how components relate.`;
      } else if (childrenDocs && childrenDocs.length > 0) {
        systemPrompt = `You are a technical documentation expert. Create a markdown documentation file that explains the functionality of the code files in this directory. Include a section that integrates information from subdirectory documentation to show how components relate. DO NOT INCLUDE CODE SAMPLES. Simply explain what each file in the directory does and recap key information from subdirectories.`;
      } else {
        systemPrompt = `You are a technical documentation expert. Create a concise markdown documentation file that explains the functionality of the code files in this directory. Focus on what the code does, key functions, and how the files are related. DO NOT INCLUDE CODE SAMPLES. Keep your response brief and clear.`;
      }

      // Add instruction about existing documentation
      if (existingDocumentation) {
        systemPrompt += ` There is existing documentation that may need updating. Review it and incorporate any still-relevant information, but update as needed to match the current code.`;
      }

      // Prepare user message
      let userMessage;
      
      if (files.length === 0 && childrenDocs && childrenDocs.length > 0) {
        userMessage = "Generate documentation that synthesizes and summarizes information from the following subdirectory documentation files. This directory contains no code files itself, but needs documentation that aggregates information from its subdirectories:";
      } else {
        userMessage = "Generate comprehensive but concise documentation for the following code files:";
        
        if (fileContents) {
          userMessage += `\n\n${fileContents}`;
        }
      }
      
      if (childrenDocsContent) {
        userMessage += `\n\nAdditionally, incorporate information from these subdirectory documentation files:\n\n${childrenDocsContent}`;
      }
      
      if (existingDocumentation) {
        userMessage += `\n\nExisting documentation for reference:\n\`\`\`markdown\n${existingDocumentation}\n\`\`\``;
      }
      userMessage += "\n\nThe output should be in Markdown format with appropriate headings and explanations of purpose and functionality. DO NOT INCLUDE CODE SAMPLES OR CODE BLOCKS. Simply explain what each file does and its role in the system. Focus on creating concise, practical documentation that helps developers understand the code structure quickly.";

      // Make request to OpenRouter
      const completion = await this.client.chat.completions.create({
        model: this.config.openRouter.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: this.config.openRouter.temperature,
        max_tokens: this.config.openRouter.maxTokens,
      });

      // Extract generated documentation
      const generatedContent = completion.choices[0].message.content || '';
      
      return {
        content: generatedContent,
        successful: true
      };
    } catch (error: any) {
      console.error('Error generating documentation:', error.message);
      return {
        content: '',
        successful: false,
        error: error.message
      };
    }
  }
}