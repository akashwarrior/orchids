import { config } from 'dotenv';
import chalk from 'chalk';
import path from 'path';
import { tools } from './tools.js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { ResponseSchema } from './type.js';
import type { OperationResult, AIResponse } from './type.js';
import type { ModelMessage } from 'ai';
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
    return google('gemini-2.5-flash-lite');
}

export class DatabaseAgent {
    private messages: ModelMessage[] = [];
    private stepCount = 0;
    private startTime: number;
    private thinkingSpinner: any = null;

    constructor(initialPrompt: string) {
        this.startTime = Date.now();
        this.messages.push({
            role: 'user',
            content: initialPrompt,
        });
    }

    async runNextStep(): Promise<{ isCompleted: boolean; error?: string }> {
        try {
            // Start thinking spinner
            this.thinkingSpinner = ora({
                text: chalk.dim('AI is analyzing...'),
                spinner: 'dots2',
                color: 'gray'
            }).start();

            const { object } = await generateObject({
                model: getGeminiModel(),
                schema: ResponseSchema,
                system: SYSTEM_PROMPT,
                messages: this.messages,
                temperature: 0,
                topK: 1,
            });

            this.thinkingSpinner.stop();

            this.messages.push({
                role: 'assistant',
                content: JSON.stringify(object),
            });

            this.stepCount++;

            // Display action before execution
            this.displayAgentAction(object.explanation);

            let result: OperationResult | null = null;

            if (object.request) {
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

            if (object.status) {
                this.displayCompletionSummary();
            }

            return { isCompleted: object.status };

        } catch (error) {
            if (this.thinkingSpinner) {
                this.thinkingSpinner.fail(chalk.red('AI error'));
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk.red('\n❌ Agent Error:'), errorMessage);
            return { isCompleted: true, error: errorMessage };
        }
    }

    private async executeOperation(response: AIResponse): Promise<OperationResult> {
        const { request, path, command, fileContent } = response;

        try {
            switch (request) {
                case 'runCommand':
                    if (!command) {
                        return { success: false, error: 'Command is required for runCommand operation' };
                    }
                    return await tools.runCommand(command, path);

                case 'readfile':
                    return await tools.readFile(path);

                case 'writefile':
                    if (!fileContent) {
                        return { success: false, error: 'File content is required for writefile operation' };
                    }
                    return await tools.writeFile(path, fileContent);

                case 'deleteFile':
                    return await tools.deleteFile(path);

                case 'readdir':
                    return await tools.listDirectory(path);

                case 'writedir':
                    return await tools.createDirectory(path);

                case 'scanProject':
                    return await tools.scanProject(path);

                default:
                    return { success: false, error: `Unknown operation: ${request}` };
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
            text: chalk.dim('Waiting to avoid rate limits...'),
            spinner: 'dots2',
            color: 'gray'
        }).start();

        await new Promise(resolve => setTimeout(resolve, 5000));
        waitSpinner.stop();
    }

    console.log();
    console.log(chalk.yellow('⚠️  Maximum iterations reached'));
    console.log(chalk.dim('The task may be too complex. Consider breaking it down.'));
}