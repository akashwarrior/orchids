import z from 'zod';

export type Steps = 'readfile' | 'writefile' | 'deleteFile' | 'readdir' | 'writedir' | 'runCommand';

export interface AIResponse {
    status: boolean;
    request?: Steps;
    path?: string;
    content?: string;
    command?: string;
    explanation: string;
}

export interface OperationResult {
    success: boolean;
    path?: string;
    error?: string;
    fileContent?: string;
    directoryList?: { name: string, type: string }[];
    commandOutput?: string;
}

export const ResponseSchema = z.object({
    status: z.boolean(),
    request: z.string(),
    path: z.string(),
    content: z.string(),
    command: z.string(),
    explanation: z.string(),
}) as z.ZodType<AIResponse>;