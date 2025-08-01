import chalk from 'chalk';
import { runAgent } from './agent/index.js';
import type { Interface } from 'node:readline/promises';

export async function main(terminal: Interface) {
    showWelcome();

    while (true) {
        const command = await terminal.question(chalk.cyan("\nOrchids> "));

        if (command.trim()) {
            const trimmedCommand = command.trim().toLowerCase();

            if (trimmedCommand === 'help') {
                showHelp();
                continue;
            }

            if (trimmedCommand === 'clear') {
                console.clear();
                console.log(chalk.green('✨ Conversation cleared!'));
                continue;
            }

            if (trimmedCommand === 'exit' || trimmedCommand === 'quit') {
                console.log(chalk.green('\n✨ Thanks for using Orchids CLI! Goodbye! 👋\n'));
                terminal.close();
                process.exit(0);
            }

            await processCommand(command);
        }
    }
}

async function processCommand(userCommand: string) {
    let prompt: string | null = userCommand;
    let iterationCount = 0;
    const maxIterations = 50;

    while (iterationCount < maxIterations) {
        iterationCount++;
        const { isCompleted } = await runAgent(prompt);
        prompt = null;
        if (isCompleted) return; // all task by agent is completed
    }

    if (iterationCount >= maxIterations) {
        console.log(chalk.yellow('\n⚠️  Maximum iterations reached. Task may be incomplete.'));
    }
}

function showHelp() {
    console.log(chalk.cyan('\n📚 Available Commands:'));

    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.yellow('  help') + chalk.gray(' - Show this help message'));
    console.log(chalk.yellow('  clear') + chalk.gray(' - Clear the conversation history'));
    console.log(chalk.yellow('  exit/quit') + chalk.gray(' - Exit the CLI'));
    console.log(chalk.gray('─'.repeat(50)));

    console.log(chalk.cyan('\n🛠️ Example Tasks:'));
    console.log(chalk.gray('  • "Add remove signin button"'));
    console.log(chalk.gray('  • "Create a new header component"'));
    console.log(chalk.gray('  • "Update the navigation to include a search bar"'));
    console.log(chalk.gray('  • "Add dark mode toggle to the settings"'));
    console.log(chalk.gray('  • "Remove the footer from the home page"'));
    console.log();
}

function showWelcome() {
    console.clear();
    console.log(chalk.blue.bold('\n🌸 Orchids CLI - Intelligent Code Assistant'));

    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.green('✨ I can help you navigate and modify your Next.js project'));
    console.log(chalk.green('📝 Type "help" for commands or just tell me what you need'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log();
}