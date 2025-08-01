import chalk from 'chalk';
import path from 'path';
import type { ModelMessage } from 'ai';
import * as readline from 'node:readline/promises';
import { runAgent } from './agent/index.js';
import { SYSTEM_PROMPT } from './agent/systemPrompt.js';

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: ModelMessage[] = [{
  role: 'system',
  content: SYSTEM_PROMPT,
}];

async function main() {
  console.log(chalk.blue('🌸 Orchids CLI - Intelligent Code Assistant'));
  console.log(chalk.gray('Type "exit" to quit.' + '\n'));

  const cwd = process.cwd();

  while (true) {
    const command = await terminal.question(`📁 ${path.basename(cwd)}> `);
    if (command.toLowerCase() === 'exit' || command.toLowerCase() === 'quit') {
      console.log(chalk.green('Goodbye! 👋'));
      terminal.close();
      break;
    }

    if (command.trim()) {
      messages.push({
        role: 'user',
        content: command,
      });

      try {
        const response = await runAgent(messages);
        messages.push({
          role: 'assistant',
          content: response,
        });
      } catch (error) {
        console.error(chalk.red('Error:', error instanceof Error ? error.message : String(error)));
      }
    }
  }
}

main();