import { z } from 'zod';

export const FileOperationEnum = z.enum([
    'READ_FILE',        // Read content from a specific file
    'WRITE_FILE',       // Create or update a file with content
    'DELETE_FILE',      // Remove a specific file
    'READ_DIRECTORY',   // Read contents of a directory
    'CREATE_DIRECTORY', // Create a new directory
    'EXECUTE_COMMAND',  // Run a terminal/shell command
    'SCAN_PROJECT'      // Recursively scan entire project structure
]);

export const AIResponseSchema = z.object({
    success: z.boolean().describe('true when task is complete, false when still processing'),
    operation: FileOperationEnum.nullable().describe('required operation type (null if no operation needed)'),
    path: z.string().default('.').describe('target file/directory path relative to project root'),
    fileContent: z.string().optional().describe('content to write when using WRITE_FILE operation'),
    command: z.string().optional().describe('shell command to execute when using EXECUTE_COMMAND operation'),
    explanation: z.string().describe('clear explanation of what action is being performed and why'),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;

export interface OperationResult {
    success: boolean;
    path?: string;
    error?: string;
    fileContent?: string;
    directoryList?: { path: string; type: 'directory' | 'file' }[];
    commandOutput?: string;
}