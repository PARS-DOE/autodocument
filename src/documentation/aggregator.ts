import * as path from 'path';
import { DirectoryCrawler } from '../crawler/index.js';
import { FileAnalyzer, AnalysisResult } from '../analyzer/index.js';
import { DocumentationGenerator, DocumentationResult } from './generator.js';

/**
 * Result of the documentation aggregation process
 */
export interface AggregationResult {
  /**
   * Total number of directories processed
   */
  totalDirectories: number;
  
  /**
   * Number of directories successfully documented
   */
  successfulDocumentations: number;
  
  /**
   * Number of directories that failed documentation
   */
  failedDocumentations: number;
  
  /**
   * Number of directories with undocumented.md files
   */
  undocumentedFiles: number;
  
  /**
   * Number of directories that were updated
   */
  updatedDocumentations: number;
  
  /**
   * Errors encountered during the process
   */
  errors: Array<{ directory: string, error: string }>;
}

/**
 * Type definition for progress callback
 */
export type ProgressCallback = (directory: string, fileCount: number, currentIndex: number, totalDirectories: number) => void;

/**
 * Class for handling the bottom-up aggregation of documentation
 */
export class DocumentationAggregator {
  private crawler: DirectoryCrawler;
  private analyzer: FileAnalyzer;
  private generator: DocumentationGenerator;
  
  /**
   * Creates a new documentation aggregator
   * @param rootPath The root directory to process
   * @param apiKey OpenRouter API key (optional)
   * @param model LLM model to use (optional)
   */
  constructor(
    private rootPath: string,
    apiKey?: string,
    model?: string
  ) {
    this.crawler = new DirectoryCrawler(rootPath, { respectGitignore: true });
    this.analyzer = new FileAnalyzer();
    this.generator = new DocumentationGenerator(apiKey, model);
  }
  
  /**
   * Runs the full documentation aggregation process
   * @param progressCallback Optional callback for progress updates
   * @returns Results of the aggregation process
   */
  public async run(progressCallback?: ProgressCallback): Promise<AggregationResult> {
    const result: AggregationResult = {
      totalDirectories: 0,
      successfulDocumentations: 0,
      failedDocumentations: 0,
      undocumentedFiles: 0,
      updatedDocumentations: 0,
      errors: []
    };
    
    try {
      // Create a bottom-up processing order
      const directories = await this.crawler.createBottomUpOrder();
      result.totalDirectories = directories.length;
      
      // Process each directory in bottom-up order
      for (let i = 0; i < directories.length; i++) {
        const directoryPath = directories[i];
        console.log(`Processing directory: ${directoryPath}`);
        
        // Get all code files in the directory
        const files = this.crawler.getCodeFiles(directoryPath);
        
        // Report progress if callback is provided
        if (progressCallback) {
          progressCallback(
            path.relative(this.rootPath, directoryPath) || '.', 
            files.length, 
            i + 1, 
            directories.length
          );
        }
        
        // Check if directory has subdirectories
        const hasSubdirectories = this.crawler.hasSubdirectories(directoryPath);
        
        // Check if directory should be documented
        if (!this.analyzer.shouldDocument(directoryPath, files, hasSubdirectories)) {
          console.log(`Skipping directory ${directoryPath} - Not enough code files to document or skipped due to rules`);
          
          // If this is a single-file directory, it will be included in its parent's documentation
          continue;
        }
        
        // Get documentation from subdirectories and single-file directories that weren't documented
        const subdirDocs = this.crawler.getSubdirectoryDocs(directoryPath);
        
        // Get single-file subdirectories' content to include in this directory's documentation
        const singleFileDocs = this.crawler.getSingleFileSubdirectories(directoryPath);
        
        // Check if this is a directory with no code files but with subdirectories
        if (files.length === 0 && hasSubdirectories) {
          console.log(`Processing directory ${directoryPath} - No code files, but contains subdirectories with documentation`);
        }

        // Analyze files (might be empty if directory only has subdirectories)
        const analysisResult = await this.analyzer.analyzeFiles(directoryPath, files);
        
        // Check if files are too large or too many
        if (analysisResult.limited) {
          console.log(`Directory ${directoryPath} exceeds limits: ${analysisResult.limitReason}`);
          await this.generator.createUndocumentedFile(directoryPath, analysisResult);
          result.undocumentedFiles++;
          continue;
        }
        
        // Get all documentation from child directories (subdirectories and single-file directories)
        const allChildDocs = [...subdirDocs];
        
        // Add content from single-file subdirectories
        if (singleFileDocs.length > 0) {
          allChildDocs.push(...singleFileDocs);
        }
        
        // Generate documentation
        const isTopLevel = directoryPath === this.rootPath;
        const docResult = await this.generateDocumentation(
          directoryPath,
          analysisResult,
          isTopLevel,
          allChildDocs,
          result
        );
        
        if (docResult.isUpdate) {
          result.updatedDocumentations++;
        }
      }
      
      return result;
    } catch (error: any) {
      console.error('Error during documentation aggregation:', error);
      result.errors.push({
        directory: this.rootPath,
        error: `Global error: ${error.message}`
      });
      return result;
    }
  }
  
  /**
   * Generates documentation for a directory and updates the aggregation result
   * @param directoryPath Path to the directory
   * @param analysisResult Results of file analysis
   * @param isTopLevel Whether this is the top level directory
   * @param subdirDocs Documentation from subdirectories
   * @param aggregationResult Aggregation result to update
   * @returns Documentation generation result
   */
  private async generateDocumentation(
    directoryPath: string,
    analysisResult: AnalysisResult,
    isTopLevel: boolean,
    subdirDocs: Array<{ path: string; content: string }>,
    aggregationResult: AggregationResult
  ): Promise<DocumentationResult> {
    try {
      const docResult = await this.generator.generateDocumentation(
        directoryPath,
        analysisResult,
        isTopLevel,
        subdirDocs
      );
      
      if (docResult.success) {
        console.log(`Successfully ${docResult.isUpdate ? 'updated' : 'generated'} documentation for ${directoryPath}`);
        aggregationResult.successfulDocumentations++;
      } else {
        console.error(`Failed to generate documentation for ${directoryPath}:`, docResult.error);
        aggregationResult.failedDocumentations++;
        aggregationResult.errors.push({
          directory: directoryPath,
          error: docResult.error || 'Unknown error'
        });
      }
      
      return docResult;
    } catch (error: any) {
      console.error(`Error generating documentation for ${directoryPath}:`, error);
      aggregationResult.failedDocumentations++;
      aggregationResult.errors.push({
        directory: directoryPath,
        error: error.message
      });
      
      return {
        documentationPath: path.join(directoryPath, 'documentation.md'),
        success: false,
        content: '',
        error: error.message,
        isUpdate: false
      };
    }
  }
}