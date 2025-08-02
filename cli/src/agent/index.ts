import { config } from 'dotenv';
import chalk from 'chalk';
import path from 'path';
import { tools } from './tools.js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import { ResponseSchema } from './type.js';
import type { AgentContext, OperationResult, AIResponse } from './type.js';
import type { ModelMessage } from 'ai';

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
    return google('gemini-2.5-flash');
}

export class DatabaseAgent {
    private messages: ModelMessage[] = [];
    private context: AgentContext;

    constructor(initialPrompt: string) {
        this.context = {
            messagesCount: 0,
            currentTask: initialPrompt,
            startTime: Date.now(),
        };

        this.messages.push({
            role: 'user',
            content: initialPrompt,
        });
    }

    async runNextStep(): Promise<{ isCompleted: boolean; error?: string }> {
        try {
            const { object } = await generateObject({
                model: getGeminiModel(),
                schema: ResponseSchema,
                system: SYSTEM_PROMPT,
                messages: this.messages,
                temperature: 0.1,
            });

            this.messages.push({
                role: 'assistant',
                content: JSON.stringify(object),
            });

            this.context.messagesCount++;

            this.displayAgentThinking(object.explanation);

            if (object.request) {
                const result = await this.executeOperation(object);

                this.messages.push({
                    role: 'user',
                    content: JSON.stringify(result),
                });
            }

            if (object.status) {
                this.displayCompletionMessage();
            }

            return { isCompleted: object.status };

        } catch (error) {
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
                    return await tools.writeFile(path, fileContent || '');

                case 'deleteFile':
                    return await tools.deleteFile(path);

                case 'readdir':
                    return await tools.listDirectory(path || '.');

                case 'writedir':
                    return await tools.createDirectory(path);

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

    private displayAgentThinking(explanation: string) {
        console.log(`\n${chalk.cyan('🤖 Agent:')} ${explanation}`);
    }

    private displayCompletionMessage() {
        const duration = Math.round((Date.now() - this.context.startTime) / 1000);
        console.log(chalk.green(`\n✅ Task completed successfully!`));
        console.log(chalk.gray(`   Total operations: ${this.context.messagesCount}`));
        console.log(chalk.gray(`   Time taken: ${duration}s`));
    }
}

export async function spawnAgent(prompt: string): Promise<{ isCompleted: boolean }> {
    const agent = new DatabaseAgent(prompt);
    const maxIterations = 50;
    let iterations = 0;

    while (iterations < maxIterations) {
        iterations++;
        const result = await agent.runNextStep();

        if (result.isCompleted) {
            return { isCompleted: true };
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(chalk.yellow('\n⚠️  Maximum iterations reached. Task may be incomplete.'));
    console.log(chalk.gray('   Consider breaking down the task into smaller parts.'));

    return { isCompleted: true };
}