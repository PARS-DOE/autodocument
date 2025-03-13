import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from '../config.js';

/**
 * Result of file analysis
 */
export interface AnalysisResult {
  /**
   * Files that were successfully analyzed
   */
  analyzedFiles: Array<{
    path: string;
    content: string;
    extension: string;
  }>;
  
  /**
   * Files that were excluded due to size or other limits
   */
  excludedFiles: Array<{
    path: string;
    reason: string;
  }>;
  
  /**
   * Whether the analysis was limited due to size/count constraints
   */
  limited: boolean;
  
  /**
   * Total size of all analyzed files in bytes
   */
  totalSize: number;
  
  /**
   * Reason for limitation if any
   */
  limitReason?: string;
}

/**
 * Class for analyzing files in a directory
 */
export class FileAnalyzer {
  private config = getConfig();
  
  /**
   * Analyzes files in a directory
   * @param directoryPath Path to the directory
   * @param filePaths Array of file paths to analyze
   * @returns Analysis result
   */
  public async analyzeFiles(directoryPath: string, filePaths: string[]): Promise<AnalysisResult> {
    const result: AnalysisResult = {
      analyzedFiles: [],
      excludedFiles: [],
      limited: false,
      totalSize: 0
    };
    
    // Filter files based on extension
    const codeFiles = filePaths.filter(file => {
      const ext = path.extname(file).toLowerCase();
      // Don't consider .md files as code files
      if (ext === '.md') {
        result.excludedFiles.push({
          path: file,
          reason: 'Markdown file excluded from code analysis'
        });
        return false;
      }
      
      return this.config.fileProcessing.codeExtensions.includes(ext);
    });
    
    // Check if there are too many files
    if (codeFiles.length > this.config.fileProcessing.maxFilesPerDirectory) {
      result.limited = true;
      result.limitReason = `Too many files (${codeFiles.length} > ${this.config.fileProcessing.maxFilesPerDirectory})`;
      
      // Still analyze files up to the limit
      const limitedFiles = codeFiles.slice(0, this.config.fileProcessing.maxFilesPerDirectory);
      for (const file of codeFiles) {
        if (limitedFiles.includes(file)) {
          await this.processFile(file, result);
        } else {
          result.excludedFiles.push({
            path: file,
            reason: 'Excluded due to file count limit'
          });
        }
      }
      
      return result;
    }
    
    // Process all files
    for (const file of codeFiles) {
      await this.processFile(file, result);
      
      // Check if total size has exceeded limit
      const maxTotalSize = this.config.fileProcessing.maxFilesPerDirectory * this.config.fileProcessing.maxFileSizeKb * 1024;
      if (result.totalSize > maxTotalSize) {
        result.limited = true;
        result.limitReason = `Total size exceeds limit (${Math.round(result.totalSize / 1024)}KB > ${Math.round(maxTotalSize / 1024)}KB)`;
        break;
      }
    }
    
    return result;
  }
  
  /**
   * Checks if a directory has enough code files to be documented
   * @param directoryPath Path to the directory
   * @param filePaths Array of file paths in the directory
   * @returns True if the directory should be documented, false otherwise
   */
  public shouldDocument(directoryPath: string, filePaths: string[], hasSubdirectories: boolean = false): boolean {
    // Filter out non-code files and markdown files
    const codeFiles = filePaths.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext !== '.md' && this.config.fileProcessing.codeExtensions.includes(ext);
    });
    
    // Skip directories with only one code file unless they have subdirectories
    if (codeFiles.length === 1 && !hasSubdirectories) {
      return false;
    }
    
    // Need at least 1 code file to document
    return codeFiles.length > 0;
  }
  
  /**
   * Creates content for an undocumented.md file
   * @param directoryPath Path to the directory
   * @param result Analysis result
   * @returns Content for undocumented.md file
   */
  public createUndocumentedContent(directoryPath: string, result: AnalysisResult): string {
    const dirName = path.basename(directoryPath);
    
    let content = `# ${dirName} - Documentation Skipped\n\n`;
    
    if (result.limited && result.limitReason) {
      content += `## Reason\n\n${result.limitReason}\n\n`;
    }
    
    if (result.analyzedFiles.length > 0) {
      content += `## Analyzed Files\n\n`;
      for (const file of result.analyzedFiles) {
        content += `- \`${path.relative(directoryPath, file.path)}\`\n`;
      }
      content += '\n';
    }
    
    if (result.excludedFiles.length > 0) {
      content += `## Excluded Files\n\n`;
      for (const file of result.excludedFiles) {
        content += `- \`${path.relative(directoryPath, file.path)}\`: ${file.reason}\n`;
      }
      content += '\n';
    }
    
    content += `## How to Fix\n\n`;
    content += `You can manually document this directory by replacing this file with a proper documentation.md file.\n`;
    content += `Alternatively, you can increase the file limits in the tool configuration and run again.\n`;
    
    return content;
  }
  
  /**
   * Process a single file and add it to the analysis result
   * @param filePath Path to the file
   * @param result Analysis result to update
   */
  private async processFile(filePath: string, result: AnalysisResult): Promise<void> {
    try {
      const stats = fs.statSync(filePath);
      const maxFileSize = this.config.fileProcessing.maxFileSizeKb * 1024;
      
      // Check if file is too large
      if (stats.size > maxFileSize) {
        result.excludedFiles.push({
          path: filePath,
          reason: `File size (${Math.round(stats.size / 1024)}KB) exceeds limit (${this.config.fileProcessing.maxFileSizeKb}KB)`
        });
        return;
      }
      
      // Read file content
      const content = await fs.promises.readFile(filePath, 'utf8');
      
      // Add to analyzed files
      result.analyzedFiles.push({
        path: filePath,
        content,
        extension: path.extname(filePath).toLowerCase()
      });
      
      // Update total size
      result.totalSize += stats.size;
    } catch (error: any) {
      result.excludedFiles.push({
        path: filePath,
        reason: `Error reading file: ${error.message}`
      });
    }
  }
}