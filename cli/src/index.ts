import chalk from 'chalk';
import readline from 'node:readline/promises';
import { Terminal } from './terminal';

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n❌ Unexpected error:'), error.message);
  console.log(chalk.yellow('\nPlease report this issue if it persists.'));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('\n❌ Unhandled Promise Rejection:'), reason);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.green('\n\n✨ Database Agent stopped. Goodbye! 👋\n'));
  terminal.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  terminal.close();
  process.exit(0);
});

// Entry point
const app = new Terminal(terminal);
await app.start();