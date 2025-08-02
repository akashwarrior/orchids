import { z } from 'zod';

export const StepsEnum = z.enum(['readfile', 'writefile', 'deleteFile', 'readdir', 'writedir', 'runCommand']);

export const ResponseSchema = z.object({
    status: z.boolean().describe('true when task is complete, false when still processing'),
    request: StepsEnum.optional().describe('operation type needed'),
    path: z.string().default('.').describe('relative path from project root'),
    fileContent: z.string().optional().describe('file content for writefile operation'),
    command: z.string().optional().describe('terminal command for runCommand operation'),
    explanation: z.string().describe('explanation of current action'),
});

export type AIResponse = z.infer<typeof ResponseSchema>;

export interface OperationResult {
    success: boolean;
    path?: string;
    error?: string;
    fileContent?: string;
    directoryList?: { name: string; type: string }[];
    commandOutput?: string;
}

export interface AgentContext {
    messagesCount: number;
    currentTask: string;
    startTime: number;
}