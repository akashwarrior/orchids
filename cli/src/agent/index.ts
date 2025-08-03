import { config } from 'dotenv';
import chalk from 'chalk';
import path from 'path';
import { tools } from './tools.js';
import { generateObject } from 'ai';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { AIResponseSchema } from './type.js';
import type { OperationResult, AIResponse } from './type.js';
import type { ModelMessage } from 'ai';
import { createGoogleGenerativeAI, type GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import ora from 'ora';

config({
    path: path.resolve(process.cwd(), 'cli/.env'),
});

function getGeminiModel() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
        throw new Error(
            chalk.red('\n❌ GOOGLE_GENERATIVE_AI_API_KEY is not defined in cli/.env file\n')
        );
    }

    const google = createGoogleGenerativeAI({ apiKey });
    return google('gemini-2.5-pro');
}

export class DatabaseAgent {
    private messages: ModelMessage[] = [];
    private stepCount = 0;
    private startTime: number;

    constructor(initialPrompt: string) {
        this.startTime = Date.now();
        this.messages.push({
            role: 'user',
            content: initialPrompt,
        });
    }

    async runNextStep(retryCount: number = 0): Promise<{ isCompleted: boolean; error?: string }> {
        if (retryCount > 3) {
            return { isCompleted: false, error: 'Maximum retries reached' };
        }
        const thinkingSpinner = ora({
            text: chalk.dim(' AI is analyzing...'),
            spinner: 'dots2',
            color: 'gray'
        }).start();

        try {
            const { object } = await generateObject({
                model: getGeminiModel(),
                schema: AIResponseSchema,
                system: SYSTEM_PROMPT,
                messages: this.messages,
                temperature: 0,
                topK: 1,
                providerOptions: {
                    google: {
                        responseModalities: ['TEXT'],
                        structuredOutputs: true,
                        thinkingConfig: {
                            includeThoughts: true,
                        },
                    } as GoogleGenerativeAIProviderOptions,
                },
            });

            thinkingSpinner.stop();

            this.messages.push({
                role: 'assistant',
                content: JSON.stringify(object),
            });

            this.stepCount++;

            this.displayAgentAction(object.explanation);

            let result: OperationResult | null = null;

            if (object.operation) {
                result = await this.executeOperation(object);
            } else {
                if (object.command || object.path) {
                    result = {
                        error: 'You cannot run a command or read a file without a request',
                        success: false,
                    };
                }
            }

            if (result) {
                this.messages.push({
                    role: 'user',
                    content: JSON.stringify(result),
                });
            }

            if (object.success) {
                this.displayCompletionSummary();
            }

            return { isCompleted: object.success };

        } catch (error) {
            thinkingSpinner.stop();
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk.red('\n❌ Agent Error:'), errorMessage);
            console.log(this.messages[this.messages.length - 1]?.content);
            const retrySpinner = ora({
                text: chalk.dim(" Retrying in 10 seconds..."),
                spinner: 'dots2',
                color: 'gray'
            }).start();
            await new Promise(resolve => setTimeout(resolve, 10000));
            retrySpinner.stop();
            const { isCompleted, error: err } = await this.runNextStep(retryCount + 1);
            return { isCompleted, error: err };
        }
    }

    private async executeOperation(response: AIResponse): Promise<OperationResult> {
        const { operation, path, command, fileContent } = response;

        try {
            switch (operation) {
                case 'EXECUTE_COMMAND':
                    if (!command) {
                        return { success: false, error: 'Command is required for runCommand operation' };
                    }
                    return await tools.runCommand(command, path);

                case 'READ_FILE':
                    return await tools.readFile(path);

                case 'WRITE_FILE':
                    if (!fileContent) {
                        return { success: false, error: 'File content is required for writefile operation' };
                    }
                    return await tools.writeFile(path, fileContent);

                case 'DELETE_FILE':
                    return await tools.deleteFile(path);

                case 'READ_DIRECTORY':
                    return await tools.readDirectory(path);

                case 'CREATE_DIRECTORY':
                    return await tools.createDirectory(path);

                case 'SCAN_PROJECT':
                    return await tools.scanProject(path);

                default:
                    return { success: false, error: `Unknown operation: ${operation}` };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private displayAgentAction(explanation: string) {
        console.log(
            chalk.hex('#6B7280')(`[${this.stepCount}]`),
            chalk.hex('#6B7280')(explanation)
        );
    }

    private displayCompletionSummary() {
        const duration = Math.round((Date.now() - this.startTime) / 1000);
        console.log(
            chalk.white.bold('Task Completed Successfully in '),
            chalk.dim(`${duration}s`)
        );
    }
}

export async function spawnAgent(prompt: string): Promise<void> {
    const agent = new DatabaseAgent(prompt);
    const maxIterations = 50;
    let iterations = 0;

    while (iterations < maxIterations) {
        iterations++;
        const result = await agent.runNextStep();

        if (result.isCompleted) {
            return;
        }

        console.log();
        // Rate limit protection with visual feedback
        const waitSpinner = ora({
            text: chalk.dim(' Waiting to avoid rate limits...'),
            spinner: 'dots2',
            color: 'gray'
        }).start();

        await new Promise(resolve => setTimeout(resolve, 4000));
        waitSpinner.stop();
    }

    console.log();
    console.log(chalk.yellow('⚠️  Maximum iterations reached'));
    console.log(chalk.dim('The task may be too complex. Consider breaking it down.'));
}