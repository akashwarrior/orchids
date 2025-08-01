import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { OperationResult } from './type.js';

const execAsync = promisify(exec);
const PROJECT_ROOT = path.resolve(__dirname, '../../../');

function resolvePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(PROJECT_ROOT, filePath);
}

const readFile = async (filePath: string): Promise<OperationResult> => {
  console.log(chalk.blue(`📖 Reading file: ${filePath}`));
  try {
    const absolutePath = resolvePath(filePath);
    const content = await fs.readFile(absolutePath, 'utf-8');
    console.log(chalk.green(`✓ Read file: ${filePath}`));
    return { success: true, fileContent: content, path: filePath };
  } catch (error) {
    console.log(chalk.red(`✗ Failed to read file: ${filePath}`));
    return { success: false, path: filePath, error: error instanceof Error ? error.message : String(error) };
  }
}

const writeFile = async (filePath: string, content: string): Promise<OperationResult> => {
  console.log(chalk.yellow(`✏️  Writing file: ${filePath}`));
  try {
    const absolutePath = resolvePath(filePath);
    const dir = path.dirname(absolutePath);

    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(absolutePath, content, 'utf-8');
    console.log(chalk.green(`✓ Wrote file: ${filePath}`));
    return { success: true, path: filePath };
  } catch (error) {
    console.log(chalk.red(`✗ Failed to write file: ${filePath}`));
    return { success: false, path: filePath, error: error instanceof Error ? error.message : String(error) };
  }
}

const deleteFile = async (filePath: string): Promise<OperationResult> => {
  console.log(chalk.red(`🗑️  Deleting file: ${filePath}`));
  try {
    const absolutePath = resolvePath(filePath);
    await fs.unlink(absolutePath);
    console.log(chalk.green(`✓ Deleted file: ${filePath}`));
    return { success: true, path: filePath };
  } catch (error) {
    console.log(chalk.red(`✗ Failed to delete file: ${filePath}`));
    return { success: false, path: filePath, error: error instanceof Error ? error.message : String(error) };
  }
}

const listDirectory = async (dirPath: string): Promise<OperationResult> => {
  console.log(chalk.blue(`📁 Listing directory: ${dirPath || '/'}`));
  try {
    const absolutePath = resolvePath(dirPath || '.');
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });

    const contents = entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
    }));

    console.log(chalk.green(`✓ Listed ${contents.length} items`));
    return { success: true, path: dirPath, directoryList: contents };
  } catch (error) {
    console.log(chalk.red(`✗ Failed to list directory`));
    return { success: false, path: dirPath, error: error instanceof Error ? error.message : String(error) };
  }
}

const createDirectory = async (dirPath: string): Promise<OperationResult> => {
  console.log(chalk.yellow(`📂 Creating directory: ${dirPath}`));
  try {
    const absolutePath = resolvePath(dirPath);
    await fs.mkdir(absolutePath, { recursive: true });
    console.log(chalk.green(`✓ Created directory: ${dirPath}`));
    return { success: true, path: dirPath };
  } catch (error) {
    console.log(chalk.red(`✗ Failed to create directory`));
    return { success: false, path: dirPath, error: error instanceof Error ? error.message : String(error) };
  }
}

const runCommand = async (command: string, cwd?: string): Promise<OperationResult> => {
  console.log(chalk.cyan(`🚀 Running command: ${command}`));
  if (cwd) {
    console.log(chalk.gray(`   Working directory: ${cwd}`));
  }

  try {
    const workingDir = cwd ? resolvePath(cwd) : PROJECT_ROOT;
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 60000,
    });

    const output = stdout + (stderr ? `\nErrors:\n${stderr}` : '');
    console.log(chalk.green(`✓ Command executed successfully`));
    if (stdout) {
      console.log(chalk.gray(`Output:\n${stdout}`));
    }
    if (stderr) {
      console.log(chalk.yellow(`Warnings:\n${stderr}`));
    }

    return { success: true, commandOutput: output.trim(), path: cwd };
  } catch (error) {
    console.log(chalk.red(`✗ Command failed`));
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`Error: ${errorMessage}`));
    return {
      success: false,
      error: errorMessage,
      commandOutput: error instanceof Error && 'stdout' in error ? String(error.stdout) : '',
      path: cwd
    };
  }
}

export const tools = {
  readFile,
  writeFile,
  deleteFile,
  listDirectory,
  createDirectory,
  runCommand,
};