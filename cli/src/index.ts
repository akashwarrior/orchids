import chalk from 'chalk';
import readline from 'node:readline/promises';
import { main } from './terminal.js';

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


main(terminal).catch((error) => {
  console.error(chalk.red('Fatal error:', error));
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.green('\n\n✨ Thanks for using Orchids CLI! Goodbye! 👋\n'));
  terminal.close();
  process.exit(0);
});