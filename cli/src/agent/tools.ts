import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { OperationResult } from './type.js';
import { glob } from 'glob';
import ora from 'ora';

const getSpinner = (text: string) => {
  return ora({
    text: chalk.dim(text),
    spinner: 'dots2',
    color: 'white',
    indent: 2,
    prefixText: chalk.white(' ╰─'),
  }).start();
}

const execAsync = promisify(exec);
const PROJECT_ROOT = path.resolve(process.cwd());

function resolvePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(PROJECT_ROOT, filePath);
}

const readFile = async (filePath: string): Promise<OperationResult> => {
  const spinner = getSpinner(`Reading ${filePath}...`)
  try {
    const absolutePath = resolvePath(filePath);
    const content = await fs.readFile(absolutePath, 'utf-8');

    const fileSize = Buffer.byteLength(content, 'utf8');
    const sizeStr = fileSize < 1024 ? `${fileSize} bytes` : `${(fileSize / 1024).toFixed(1)} KB`;

    spinner.succeed(chalk.white(` Read ${filePath}`) + chalk.dim(` (${sizeStr})`));
    return { success: true, fileContent: content, path: filePath };
  } catch (error) {
    spinner.fail(chalk.white(` Failed to read ${filePath}`));
    return {
      success: false,
      path: filePath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const writeFile = async (filePath: string, content: string): Promise<OperationResult> => {
  const spinner = getSpinner(`Writing ${filePath}...`)
  try {
    const absolutePath = resolvePath(filePath);
    const dir = path.dirname(absolutePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf-8');
    const newContent = await fs.readFile(absolutePath, 'utf-8');

    const lines = content.split('\n').length;
    spinner.succeed(chalk.white(` Created ${filePath}`) + chalk.dim(` (${lines} lines)`));
    return { success: true, path: filePath, fileContent: newContent };
  } catch (error) {
    spinner.fail(chalk.white(` Failed to write ${filePath}`));
    return {
      success: false,
      path: filePath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const deleteFile = async (filePath: string): Promise<OperationResult> => {
  const spinner = getSpinner(`Deleting ${filePath}...`)
  try {
    const absolutePath = resolvePath(filePath);
    await fs.unlink(absolutePath);
    spinner.succeed(chalk.white(` Deleted ${filePath}`));
    return { success: true, path: filePath };
  } catch (error) {
    spinner.fail(chalk.white(` Failed to delete ${filePath}`));
    return {
      success: false,
      path: filePath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const listDirectory = async (dirPath: string): Promise<OperationResult> => {
  const spinner = getSpinner(`Scanning ${dirPath || '/'}...`)
  try {
    const absolutePath = resolvePath(dirPath || '.');
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });

    const contents = entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
    }));

    const dirs = contents.filter(c => c.type === 'directory').length;
    const files = contents.filter(c => c.type === 'file').length;

    spinner.succeed(chalk.white(` Found ${dirs} folders and ${files} files`));
    return { success: true, path: dirPath, directoryList: contents };
  } catch (error) {
    spinner.fail(chalk.white(` Failed to list directory`));
    return {
      success: false,
      path: dirPath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const createDirectory = async (dirPath: string): Promise<OperationResult> => {
  const spinner = getSpinner(`Creating directory ${dirPath}...`)
  try {
    const absolutePath = resolvePath(dirPath);
    await fs.mkdir(absolutePath, { recursive: true });
    spinner.succeed(chalk.white(` Created ${dirPath}`));
    return { success: true, path: dirPath };
  } catch (error) {
    spinner.fail(chalk.white(` Failed to create directory`));
    return {
      success: false,
      path: dirPath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const runCommand = async (command: string, cwd?: string): Promise<OperationResult> => {
  const displayCommand = command.length > 60 ? command.substring(0, 57) + '...' : command;
  const spinner = getSpinner(`Running: ${displayCommand}`)
  try {
    const workingDir = cwd ? resolvePath(cwd) : PROJECT_ROOT;
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 10,
    });

    const output = stdout + (stderr ? `\nWarnings:\n${stderr}` : '');
    spinner.succeed(chalk.white('Ran command ' + displayCommand));

    return { success: true, commandOutput: output.trim(), path: cwd };

  } catch (error: any) {
    spinner.fail(chalk.white(' Command failed'));
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
      commandOutput: error.stdout || '',
      path: cwd
    };
  }
};

const scanProject = async (pattern: string = '**/*'): Promise<OperationResult> => {
  const spinner = getSpinner('Scanning project structure...')
  try {
    const files = await glob(pattern, {
      cwd: PROJECT_ROOT,
      ignore: [
        '**/*node_modules/**/*',
        '**/*cli/**/*',
        '**/*.next/**/*',
        '**/*.git/**/*',
      ],
      dot: true,
      withFileTypes: true,
    });

    const fileList = await Promise.all(
      files.map(async (file) => {
        return {
          name: file.name,
          type: file.isDirectory() ? 'directory' : 'file',
        };
      })
    );

    spinner.succeed(chalk.white(` Found ${fileList.length} items`));
    return { success: true, directoryList: fileList, path: pattern };

  } catch (error) {
    spinner.fail(chalk.white(' Failed to scan project'));
    return {
      success: false,
      path: pattern,
      error: error instanceof Error ? error.message : String(error)
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
  scanProject,
};