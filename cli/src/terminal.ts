import chalk from 'chalk';
import ora from 'ora';
import { spawnAgent } from './agent/index.js';
import type { Interface } from 'node:readline/promises';

interface CommandHistory {
    timestamp: Date;
    command: string;
    completed: boolean;
}

export class Terminal {
    private history: CommandHistory[] = [];
    private isProcessing = false;

    constructor(private terminal: Interface) { }

    async start() {
        this.showWelcome();
        this.startPromptLoop();
    }

    private async startPromptLoop() {
        while (true) {
            const command = await this.getInput();
            if (!command.trim()) continue;

            if (this.handleSpecialCommand(command.toLowerCase())) {
                continue;
            }

            await this.processCommand(command);
        }
    }

    private async getInput(): Promise<string> {
        const prompt = this.isProcessing
            ? chalk.gray('\n⏳ Processing...')
            : chalk.cyan('\nDatabase Agent > ');

        return await this.terminal.question(prompt);
    }

    private handleSpecialCommand(command: string): boolean {
        switch (command) {
            case 'help':
            case '?':
                this.showHelp();
                return true;

            case 'clear':
            case 'cls':
                console.clear();
                this.showHeader();
                return true;

            case 'history':
            case 'h':
                this.showHistory();
                return true;

            case 'exit':
            case 'quit':
            case 'q':
                this.exit();
                return true;

            default:
                return false;
        }
    }

    private async processCommand(command: string) {
        this.isProcessing = true;

        const startTime = Date.now();
        console.log(chalk.gray(`\n${'─'.repeat(60)}`));
        console.log(chalk.blue('📋 Task:'), command);
        console.log(chalk.gray(`${'─'.repeat(60)}`));

        try {
            const result = await spawnAgent(command);

            this.history.push({
                timestamp: new Date(),
                command,
                completed: result.isCompleted,
            });

            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(chalk.gray(`\n⏱️  Total time: ${duration}s`));

        } catch (error) {
            console.error(chalk.red('\n❌ Failed to process command:'), error);
        } finally {
            this.isProcessing = false;
        }
    }

    private showWelcome() {
        console.clear();
        this.showHeader();
        console.log(chalk.green('✨ Ready to help you implement database features!'));
        console.log(chalk.gray('Type "help" for available commands or describe what you need.\n'));
    }

    private showHeader() {
        const title = '🗄️  Database Agent for Next.js';
        const subtitle = 'Intelligent Database Integration Assistant';

        console.log(chalk.blue.bold(`\n${title}`));
        console.log(chalk.gray(subtitle));
        console.log(chalk.gray('─'.repeat(60)));
    }

    private showHelp() {
        console.log(chalk.cyan('\n📚 Available Commands:'));
        console.log(chalk.gray('─'.repeat(50)));

        const commands = [
            { cmd: 'help, ?', desc: 'Show this help message' },
            { cmd: 'clear, cls', desc: 'Clear the screen' },
            { cmd: 'history, h', desc: 'Show command history' },
            { cmd: 'exit, quit, q', desc: 'Exit the application' },
        ];

        commands.forEach(({ cmd, desc }) => {
            console.log(`  ${chalk.yellow(cmd.padEnd(15))} ${chalk.gray(desc)}`);
        });

        console.log(chalk.cyan('\n🎯 Example Database Tasks:'));
        console.log(chalk.gray('─'.repeat(50)));

        const examples = [
            '"Store recently played songs in a table"',
            '"Add user authentication with a users table"',
            '"Create a favorites system for songs"',
            '"Store playlists with song relationships"',
            '"Add play count tracking for songs"',
            '"Create artist and album tables"',
        ];

        examples.forEach(example => {
            console.log(`  ${chalk.gray('•')} ${chalk.green(example)}`);
        });

        console.log(chalk.cyan('\n💡 Tips:'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`  ${chalk.gray('•')} The agent will automatically set up the database if needed`);
        console.log(`  ${chalk.gray('•')} All changes include both backend API and frontend integration`);
        console.log(`  ${chalk.gray('•')} Mock data will be generated for testing`);
        console.log(`  ${chalk.gray('•')} Existing components will be updated to use real data\n`);
    }

    private showHistory() {
        if (this.history.length === 0) {
            console.log(chalk.yellow('\n📜 No command history yet.\n'));
            return;
        }

        console.log(chalk.cyan('\n📜 Command History:'));
        console.log(chalk.gray('─'.repeat(60)));

        this.history.slice(-10).forEach((entry, index) => {
            const time = entry.timestamp.toLocaleTimeString();
            const status = entry.completed ? chalk.green('✓') : chalk.red('✗');
            console.log(`${chalk.gray(time)} ${status} ${entry.command}`);
        });

        if (this.history.length > 10) {
            console.log(chalk.gray(`\n... and ${this.history.length - 10} more`));
        }
    }

    private exit() {
        const spinner = ora({
            text: 'Shutting down...',
            color: 'blue',
        }).start();

        setTimeout(() => {
            spinner.succeed(chalk.green('Thanks for using Database Agent! 👋'));
            this.terminal.close();
            process.exit(0);
        }, 500);
    }
}