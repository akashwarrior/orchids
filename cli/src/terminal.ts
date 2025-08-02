import chalk from 'chalk';
import { spawnAgent } from './agent/index.js';
import type { Interface } from 'node:readline/promises';
import path from 'node:path';

export class Terminal {
    constructor(private terminal: Interface) { }

    async start() {
        this.showWelcome();
        const cwd = path.basename(process.cwd());

        while (true) {
            console.log();
            const command = await this.terminal.question(chalk.hex('#8B5CF6')(`🌸 ${cwd} `) + chalk.dim('› '));
            if (!command.trim()) continue;

            if (this.handleSpecialCommand(command.toLowerCase())) {
                continue;
            }
            console.log();

            try {
                console.log(chalk.hex('#8B5CF6')(' │'), chalk.white.bold('Task:'), chalk.white(command));
                console.log(chalk.hex('#8B5CF6')(' ╰') + chalk.hex('#8B5CF6')('─').repeat(60));

                await spawnAgent(command);
            } catch (error) {
                console.error(chalk.red('\n✗ Error:'), error);
            }
        }
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

            case 'exit':
            case 'quit':
            case 'q':
                this.exit();
                return true;

            default:
                return false;
        }
    }

    private showWelcome() {
        console.clear();
        console.log();
        console.log(chalk.hex('#b0aea5').bold('Orchids Database Agent'));
        console.log(chalk.hex('#b0aea5')('Intelligent database integration for Next.js'));
        console.log();
        console.log(chalk.hex('#b0aea5')('Type'), chalk.white('help'), chalk.hex('#b0aea5')('for commands or describe what you need.'));
    }

    private showHeader() {
        console.log();
        console.log(chalk.hex('#b0aea5').bold('Orchids Database Agent'));
        console.log(chalk.dim('─'.repeat(60)));
    }

    private showHelp() {
        console.log();
        console.log(chalk.white.bold('Commands'));
        console.log(chalk.dim('─'.repeat(40)));
        console.log();
        console.log(chalk.hex('#8B5CF6')('  help, ?        '), chalk.dim('Show this help'));
        console.log(chalk.hex('#8B5CF6')('  clear, cls     '), chalk.dim('Clear screen'));
        console.log(chalk.hex('#8B5CF6')('  exit, quit, q  '), chalk.dim('Exit application'));

        console.log();
        console.log(chalk.white.bold('Examples'));
        console.log(chalk.dim('─'.repeat(40)));
    }

    private exit() {
        console.log();
        console.log(chalk.hex('#8B5CF6')('Goodbye! 👋'));
        console.log();
        this.terminal.close();
        process.exit(0);
    }
}