# Autodocument MCP Server

An MCP (Model Context Protocol) server that automatically generates documentation for code repositories by analyzing directory structures and code files using OpenRouter API.


## Features

- **Smart Directory Analysis**: Recursively analyzes directories and files in a code repository
- **Git Integration**: Respects `.gitignore` patterns to skip ignored files
- **AI-Powered Documentation**: Uses OpenRouter API (with Claude 3.7 by default) to generate comprehensive documentation
- **Test Plan Generation**: Automatically creates test plans with suitable test types, edge cases, and mock requirements
- **Code Review**: Performs senior developer-level code reviews focused on security, best practices, and improvements
- **Bottom-Up Approach**: Starts with leaf directories and works upward, creating a coherent documentation hierarchy
- **Intelligent File Handling**:
  - Creates `documentation.md`, `testplan.md`, and `review.md` files at each directory level
  - Skips single-file directories but includes their content in parent outputs
  - Supports updating existing files
  - Creates fallback files for directories that exceed limits
- **Progress Reporting**: Provides detailed progress updates to prevent timeouts in long-running operations
- **Highly Configurable**: Customize file extensions, size limits, models, prompts, and more
- **Extensible Architecture**: Modular design makes it easy to add more auto-* tools in the future

## Installation

### Prerequisites

- Node.js (v16 or newer)
- An [OpenRouter API key](https://openrouter.ai/)

### Installation Steps

```bash
# Clone the repository
git clone https://github.com/PARS-DOE/autodocument.git
cd autodocument

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

Configure autodocument using environment variables, command-line arguments, or an MCP configuration file:

### Environment Variables

- `OPENROUTER_API_KEY`: Your OpenRouter API key
- `OPENROUTER_MODEL`: Model to use (default: `anthropic/claude-3-7-sonnet`)
- `MAX_FILE_SIZE_KB`: Maximum file size in KB (default: 100)
- `MAX_FILES_PER_DIR`: Maximum number of files per directory (default: 20)

## Using with Roo or Cline

Roo Code and Cline are AI assistants that support the Model Context Protocol (MCP), which allows them to use external tools like autodocument.

### Setup for Roo/Cline

1. **Clone and build the repository** (follow the Installation Steps above)

2. **Configure the MCP server**:

   #### For Roo:

   In the MCP Servers menu, Edit the MCP Settings and add the autodocument configuration using the full path to where you cloned the repository:

   Add the autodocument configuration using the full path to where you cloned the repository:
   ```json
   {
     "mcpServers": {
       "autodocument": {
         "command": "node",
         "args": ["/path/to/autodocument/build/index.js"],
         "env": {
           "OPENROUTER_API_KEY": "your-api-key-here"
         },
         "disabled": false,
         "alwaysAllow": []
       }
     }
   }
   ```

   #### For Claude Desktop App:
   Edit the Claude desktop app configuration file at:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

   Add the autodocument configuration using the full path to where you cloned the repository:
   ```json
   {
     "mcpServers": {
       "autodocument": {
         "command": "node",
         "args": ["/path/to/autodocument/build/index.js"],
         "env": {
           "OPENROUTER_API_KEY": "your-api-key-here"
         },
         "disabled": false,
         "alwaysAllow": []
       }
     }
   }
   ```

3. **Important:** Make sure to use absolute paths to the build/index.js file in your cloned repository

4. **Restart Roo/Cline or the Claude desktop app**

4. **Use the tool**:
   In a conversation with Roo or Claude, you can now ask it to generate documentation or test plans for your code repository:
   ```
   Please generate documentation for my project at /path/to/my/project
   ```
   
   Or for test plans:
   ```
   Please create a test plan for my project at /path/to/my/project
   ```
   
   Or for code reviews:
   ```
   Please review the code in my project at /path/to/my/project
   ```

## How It Works

The autodocument server works using a bottom-up approach:

1. **Discovery**: Scans the target directory recursively, respecting `.gitignore` rules
2. **Smart Directory Processing**: 
   - Identifies directories with multiple code files or subdirectories
   - Skips single-file directories but includes their content in parent documentation
3. **File Analysis**: Analyzes code files, filtering by extension and size
4. **Documentation Generation**: For each qualifying directory:
   - Reads code files
   - Sends code to OpenRouter API with optimized prompts
   - Creates a `documentation.md` file (or updates existing one)
5. **Aggregation**: As it moves up the directory tree:
   - Processes each parent directory
   - Includes documentation from child directories
   - Creates a comprehensive overview at each level

## Architecture

The project follows a modular architecture:

- **Core Components**: Configuration management and server implementation
- **Crawler Module**: Directory traversal and file discovery
- **Analyzer Module**: Code file analysis and filtering
- **OpenRouter Module**: AI integration for LLM-based content generation
- **Documentation Module**: Orchestration of the documentation process
- **Tools Module**: Extensible system for different auto-* tools (documentation, test plans, etc.)
- **Prompts Configuration**: Centralized prompt management for easy customization

## Example Usage

### Command Line

```bash
# Navigate to your cloned repository
cd path/to/cloned/autodocument

# Set your API key (or configure in environment variables)
export OPENROUTER_API_KEY=your-api-key-here

# Run documentation generation on a project
node build/index.js /path/to/your/project
```

### Programmatic Usage

```javascript
const { spawn } = require('child_process');
const path = require('path');

// Path to your project
const projectPath = '/path/to/your/project';

// Your OpenRouter API key
const apiKey = 'your-api-key-here';

// Create a JSON command to simulate an MCP tool call
const toolCallCommand = JSON.stringify({
  jsonrpc: '2.0',
  method: 'call_tool',
  params: {
    name: 'generate_documentation',
    arguments: {
      path: projectPath,
      openRouterApiKey: apiKey
    }
  },
  id: 1
});

// Start the server process - use the full path to your cloned repository
const serverProcess = spawn('node', ['/path/to/autodocument/build/index.js'], {
  env: {
    ...process.env,
    OPENROUTER_API_KEY: apiKey
  }
});

// Send the tool command
serverProcess.stdin.write(toolCallCommand + '\n');

// Handle server output and errors
// ...
```

## Customizing Prompts

You can easily customize the prompts used by the tools by editing the `src/prompt-config.ts` file. This allows you to:

- Adjust the tone and style of generated content
- Add specific instructions for your project's needs
- Modify how existing content is updated

The prompt configuration is separated from the tool implementation, making it easy to experiment with different prompts without changing the code.

## Available Tools

### generate_documentation

Generates comprehensive documentation for a code repository:
```
{
  "path": "/path/to/your/project",
  "openRouterApiKey": "your-api-key-here", // Optional
  "model": "anthropic/claude-3-7-sonnet", // Optional
  "updateExisting": true // Optional, defaults to true
}
```

### autotestplan

Generates test plans for functions and components in a code repository:
```
{
  "path": "/path/to/your/project",
  "openRouterApiKey": "your-api-key-here", // Optional
  "model": "anthropic/claude-3-7-sonnet", // Optional
  "updateExisting": true // Optional, defaults to true
}
```

### autoreview

Generates a senior developer-level code review for a repository:
```
{
  "path": "/path/to/your/project",
  "openRouterApiKey": "your-api-key-here", // Optional
  "model": "anthropic/claude-3-7-sonnet", // Optional
  "updateExisting": true // Optional, defaults to true
}
```

## Output Files

The server creates several types of output files:

### documentation.md

Contains comprehensive documentation of the code in a directory, including:
- Purpose of the code
- Key functions and classes
- Relationships between files
- Integration with child components

### testplan.md

Contains detailed test plans for code in a directory, including:
- Appropriate test types (unit, integration, e2e) for each function
- Common edge cases to test
- Dependency mocking requirements
- Integration testing strategies

### review.md

Contains senior developer-level code review feedback, including:
- Security issues and vulnerabilities
- Best practice violations
- Potential bugs or architectural concerns
- Opportunities for refactoring
- Practical, constructive feedback (not nitpicking style issues)

### Fallback Files

Created when a directory exceeds size or file count limits:
- `undocumented.md` - For documentation generation
- `untested.md` - For test plan generation
- `review-skipped.md` - For code review generation

These files contain:
- Reason for skipping processing
- List of files that were analyzed and excluded
- Instructions on how to fix (increase limits or manually create content)

## Troubleshooting

### API Key Issues

If you see errors about invalid API key:
- Ensure you've set the `OPENROUTER_API_KEY` environment variable
- Check that your OpenRouter account is active
- Verify you have sufficient credits for the API calls

### Size Limit Errors

If too many directories are skipped due to size limits:
- Set environment variables to increase limits: `MAX_FILE_SIZE_KB` and `MAX_FILES_PER_DIR`
- Consider documenting very large directories manually

### Model Selection

If you're not satisfied with the documentation quality:
- Try a different model by setting the `OPENROUTER_MODEL` environment variable

## License

CC0-1.0 License - This work is dedicated to the public domain under CC0 by the United States Department of Energy

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Adding New Tools

The architecture is designed to make it easy to add new auto-* tools:

1. Create a new class that extends `BaseTool` in the `src/tools` directory
2. Define the prompts in `src/prompt-config.ts`
3. Register the tool in the `ToolRegistry`

See the existing tools for examples of how to implement new functionality.