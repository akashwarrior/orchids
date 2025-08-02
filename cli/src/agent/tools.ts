import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { OperationResult } from './type.js';
import ora from 'ora';

const execAsync = promisify(exec);
const PROJECT_ROOT = path.resolve(process.cwd());

function resolvePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(PROJECT_ROOT, filePath);
}

const readFile = async (filePath: string): Promise<OperationResult> => {
  const spinner = ora({
    text: `Reading file: ${chalk.cyan(filePath)}`,
    color: 'blue',
  }).start();

  try {
    const absolutePath = resolvePath(filePath);
    const content = await fs.readFile(absolutePath, 'utf-8');
    spinner.succeed(chalk.green(`Read file: ${filePath}`));
    return { success: true, fileContent: content, path: filePath };
  } catch (error) {
    spinner.fail(chalk.red(`Failed to read file: ${filePath}`));
    return {
      success: false,
      path: filePath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const writeFile = async (filePath: string, content: string): Promise<OperationResult> => {
  const spinner = ora({
    text: `Writing file: ${chalk.yellow(filePath)}`,
    color: 'yellow',
  }).start();

  try {
    const absolutePath = resolvePath(filePath);
    const dir = path.dirname(absolutePath);

    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(absolutePath, content, 'utf-8');
    const newContent = await fs.readFile(absolutePath, 'utf-8');
    
    spinner.succeed(chalk.green(`Wrote file: ${filePath}`));
    return { success: true, path: filePath, fileContent: newContent };
  } catch (error) {
    spinner.fail(chalk.red(`Failed to write file: ${filePath}`));
    return {
      success: false,
      path: filePath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const deleteFile = async (filePath: string): Promise<OperationResult> => {
  const spinner = ora({
    text: `Deleting file: ${chalk.red(filePath)}`,
    color: 'red',
  }).start();

  try {
    const absolutePath = resolvePath(filePath);
    await fs.unlink(absolutePath);
    spinner.succeed(chalk.green(`Deleted file: ${filePath}`));
    return { success: true, path: filePath };
  } catch (error) {
    spinner.fail(chalk.red(`Failed to delete file: ${filePath}`));
    return {
      success: false,
      path: filePath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const listDirectory = async (dirPath: string): Promise<OperationResult> => {
  const spinner = ora({
    text: `Listing directory: ${chalk.blue(dirPath || '/')}`,
    color: 'blue',
  }).start();

  try {
    const absolutePath = resolvePath(dirPath || '.');
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });

    const contents = entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
    }));

    spinner.succeed(chalk.green(`Listed ${contents.length} items`));
    return { success: true, path: dirPath, directoryList: contents };
  } catch (error) {
    spinner.fail(chalk.red(`Failed to list directory`));
    return {
      success: false,
      path: dirPath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const createDirectory = async (dirPath: string): Promise<OperationResult> => {
  const spinner = ora({
    text: `Creating directory: ${chalk.yellow(dirPath)}`,
    color: 'yellow',
  }).start();

  try {
    const absolutePath = resolvePath(dirPath);
    await fs.mkdir(absolutePath, { recursive: true });
    spinner.succeed(chalk.green(`Created directory: ${dirPath}`));
    return { success: true, path: dirPath };
  } catch (error) {
    spinner.fail(chalk.red(`Failed to create directory`));
    return {
      success: false,
      path: dirPath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const runCommand = async (command: string, cwd?: string): Promise<OperationResult> => {
  const spinner = ora({
    text: `Running: ${chalk.cyan(command)}`,
    color: 'cyan',
  }).start();

  if (cwd) {
    spinner.text += chalk.gray(` in ${cwd}`);
  }

  try {
    const workingDir = cwd ? resolvePath(cwd) : PROJECT_ROOT;
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 10,
    });

    const output = stdout + (stderr ? `\nWarnings:\n${stderr}` : '');

    spinner.succeed(chalk.green(`Command completed`));

    if (stdout && stdout.length < 500) {
      console.log(chalk.gray('Output:'));
      console.log(chalk.gray(stdout.trim()));
    } else if (stdout) {
      console.log(chalk.gray(`Output: ${stdout.length} characters (truncated)`));
    }

    if (stderr) {
      console.log(chalk.yellow('Warnings:'));
      console.log(chalk.yellow(stderr.trim()));
    }

    return { success: true, commandOutput: output.trim(), path: cwd };
  } catch (error: any) {
    spinner.fail(chalk.red(`Command failed`));
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(chalk.red('Error:'), errorMessage);

    if (error.stdout) {
      console.log(chalk.gray('Output before error:'));
      console.log(chalk.gray(error.stdout));
    }

    return {
      success: false,
      error: errorMessage,
      commandOutput: error.stdout || '',
      path: cwd
    };
  }
};

export const tools = {
  readFile,
  writeFile,
  deleteFile,
  listDirectory,
  createDirectory,
  runCommand,
};