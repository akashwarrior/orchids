import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { type ModelMessage, streamText } from 'ai';
import { tools } from './tools';
import { config } from 'dotenv';
import path from 'path';

config({
    path: path.resolve(__dirname, '../../.env'),
});

function getGeminiModel(apiKey: string) {
    const gemini = createGoogleGenerativeAI({
        apiKey,
    });

    return gemini("gemini-2.5-flash-lite");
}

export async function runAgent(messages: ModelMessage[]): Promise<string> {
    const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!API_KEY) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not defined');
    }

    const result = streamText({
        model: getGeminiModel(API_KEY),
        messages,
        tools: tools,
    });

    let fullResponse = '';
    process.stdout.write('\nAssistant: ');

    for await (const delta of result.textStream) {
        fullResponse += delta;
        process.stdout.write(delta); // TODO: response parsing
    }
    process.stdout.write('\n\n');

    return fullResponse;
}