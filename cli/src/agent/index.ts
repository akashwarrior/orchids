import { config } from 'dotenv';
import chalk from 'chalk';
import path from 'node:path';
import { tools } from './tools.js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, type ModelMessage } from 'ai';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { ResponseSchema, type OperationResult, type AIResponse } from './type.js';

config({
    path: path.resolve(__dirname, '../../.env'),
});

function getGeminiModel({ apiKey }: { apiKey: string }) {
    const gemini = createGoogleGenerativeAI({
        apiKey,
    });

    return gemini("gemini-2.5-flash");
}

const messages: ModelMessage[] = [];

export async function runAgent(prompt: string | null): Promise<{ isCompleted: boolean }> {
    const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!API_KEY) {
        // Program should not run if API key is not defined
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not defined in cli/.env file');
    }

    if (prompt) {
        messages.push({
            role: 'user',
            content: prompt,
        });
    }

    try {
        const { object } = await generateObject({
            model: getGeminiModel({ apiKey: API_KEY }),
            schema: ResponseSchema,
            system: SYSTEM_PROMPT,
            messages: messages,
        });

        messages.push({
            role: 'assistant',
            content: JSON.stringify(object),
        });

        console.log(chalk.cyan("\n🌸 Orchids CLI: ") + object.explanation);

        if (object.request) {
            const operationResult = await executeOperation(object);
            messages.push({
                role: 'user',
                content: JSON.stringify(operationResult),
            });
        }

        return { isCompleted: !object.status };
    } catch (error) {
        if (error instanceof Error) {
            console.error(chalk.red('\n❌ Error: ' + error.message));
        } else {
            console.error(chalk.red('\n❌ Error: ' + String(error)));
        }
        return { isCompleted: true };
    }
}

async function executeOperation({ path, command, content, request }: AIResponse): Promise<OperationResult> {
    if (!path) {
        path = '.';
    }

    try {
        switch (request) {
            case 'runCommand':
                if (!command) {
                    return { success: false, error: 'Command is required for operation' };
                }
                return await tools.runCommand(command, path);

            case 'readfile':
                return await tools.readFile(path);

            case 'writefile':
                return await tools.writeFile(path, content || '');

            case 'deleteFile':
                return await tools.deleteFile(path);

            case 'readdir':
                return await tools.listDirectory(path);

            case 'writedir':
                return await tools.createDirectory(path);

            default:
                return { success: false, error: 'Invalid operation' };
        }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}