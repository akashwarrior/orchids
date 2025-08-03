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
    prefixText: chalk.white(' ╰─'),
  }).start();
}

const execAsync = promisify(exec);
const cwd = process.cwd();
const PROJECT_ROOT = path.resolve(cwd, path.basename(cwd) === 'cli' ? '../' : '.');

function resolvePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(PROJECT_ROOT, filePath);
}

const shouldLintFile = (filePath: string): boolean => {
  const ext = path.extname(filePath).toLowerCase();
  const lintableExtensions = ['.js', '.jsx', '.ts', '.tsx'];
  return lintableExtensions.includes(ext);
};

const lintFile = async (filePath: string): Promise<{ error: string | null }> => {
  if (!shouldLintFile(filePath)) {
    return { error: null };
  }
  const spinner = getSpinner(` Linting file: ${filePath}...`)

  try {
    const absolutePath = resolvePath(filePath);
    const relativePath = path.relative(PROJECT_ROOT, absolutePath);
    await execAsync(`npx next lint --file "${relativePath}" --fix`, {
      cwd: PROJECT_ROOT,
      timeout: 1000 * 60,
    });
    spinner.succeed(chalk.green(` Linting successful for ${filePath}`));
    return { error: null };
  } catch (error) {
    spinner.fail(chalk.red(` Linting failed for file: ${filePath}`));
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

const readFile = async (filePath: string): Promise<OperationResult> => {
  const spinner = getSpinner(` Reading file: ${filePath}...`)
  const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
  if (!fileExists) {
    spinner.fail(chalk.red(` File not found: ${filePath}`));
    return {
      success: false,
      path: filePath,
      error: 'File not found'
    };
  }
  try {
    const absolutePath = resolvePath(filePath);
    const content = await fs.readFile(absolutePath, 'utf-8');

    const fileSize = Buffer.byteLength(content, 'utf8');
    const sizeStr = fileSize < 1024 ? `${fileSize} bytes` : `${(fileSize / 1024).toFixed(1)} KB`;

    spinner.succeed(chalk.white(` Read file: ${filePath}`) + chalk.dim(` (${sizeStr})`));
    return { success: true, fileContent: content, path: filePath };
  } catch (error) {
    spinner.fail(chalk.red(` Failed to read file: ${filePath}`));
    return {
      success: false,
      path: filePath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const writeFile = async (filePath: string, content: string): Promise<OperationResult> => {
  const spinner = getSpinner(` Writing file: ${filePath}...`)
  try {
    const absolutePath = resolvePath(filePath);
    const dir = path.dirname(absolutePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf-8');

    const lines = content.split('\n').length;
    spinner.succeed(chalk.white(` Written file: ${filePath}`) + chalk.dim(` (${lines} lines)`));

    const { error } = await lintFile(filePath);

    if (error) {
      return {
        success: false,
        path: filePath,
        error: error
      }
    }

    return { success: true, path: filePath };
  } catch (error) {
    spinner.fail(chalk.red(` Failed to write file: ${filePath}`));
    return {
      success: false,
      path: filePath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const deleteFile = async (filePath: string): Promise<OperationResult> => {
  const spinner = getSpinner(` Deleting file: ${filePath}...`)
  const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
  if (!fileExists) {
    spinner.fail(chalk.white(` File not found: ${filePath}`));
    return {
      success: false,
      path: filePath,
      error: 'File not found'
    };
  }
  try {
    const absolutePath = resolvePath(filePath);
    await fs.unlink(absolutePath);
    spinner.succeed(chalk.white(` Deleted file: ${filePath}`));
    return { success: true, path: filePath };
  } catch (error) {
    spinner.fail(chalk.red(` Failed to delete file: ${filePath}`));
    return {
      success: false,
      path: filePath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const readDirectory = async (dirPath: string): Promise<OperationResult> => {
  const spinner = getSpinner(` Reading directory: ${dirPath || '/'}...`)
  const isDirectoryExists = await fs.access(dirPath).then(() => true).catch(() => false);
  if (!isDirectoryExists) {
    spinner.fail(chalk.red(` Directory not found: ${dirPath}`));
    return {
      success: false,
      path: dirPath,
      error: 'Directory not found'
    };
  }
  try {
    const absolutePath = resolvePath(dirPath || '.');
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });

    const contents = entries.map(entry => ({
      path: path.join(dirPath, entry.name),
      type: entry.isDirectory() ? 'directory' : 'file',
    })) as OperationResult['directoryList'] || [];

    const dirs = contents.filter(c => c.type === 'directory').length;
    const files = contents.filter(c => c.type === 'file').length;

    spinner.succeed(chalk.white(` Scanned directory: Found ${dirs} folders and ${files} files`));
    return { success: true, path: dirPath, directoryList: contents };
  } catch (error) {
    spinner.fail(chalk.red(` Failed to scan directory: ${dirPath}`));
    return {
      success: false,
      path: dirPath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const createDirectory = async (dirPath: string): Promise<OperationResult> => {
  const spinner = getSpinner(` Creating directory: ${dirPath}...`)
  try {
    const absolutePath = resolvePath(dirPath);
    await fs.mkdir(absolutePath, { recursive: true });
    spinner.succeed(chalk.white(` Created directory: ${dirPath}`));
    return { success: true, path: dirPath };
  } catch (error) {
    spinner.fail(chalk.red(` Failed to create directory: ${dirPath}`));
    return {
      success: false,
      path: dirPath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const runCommand = async (command: string, cwd?: string): Promise<OperationResult> => {
  const displayCommand = command.length > 60 ? command.substring(0, 65) + '...' : command;
  const spinner = getSpinner(` Running command: ${displayCommand}`)
  try {
    const workingDir = cwd ? resolvePath(cwd) : PROJECT_ROOT;
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 1000 * 60 * 3,
    });

    const output = stdout + (stderr ? `\nWarnings:\n${stderr}` : '');
    spinner.succeed(chalk.white(' Ran command: ' + displayCommand) + chalk.dim(` (${output.length} characters)`));

    return { success: true, commandOutput: output, path: cwd };

  } catch (error: any) {
    spinner.fail(chalk.red(` Failed to run command: ${command}`));
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
  const spinner = getSpinner(' Scanning project...')
  try {
    const files = await glob(pattern, {
      cwd: PROJECT_ROOT,
      ignore: [
        '**/*node_modules/**/*',
        '**/*cli/**/*',
        '**/*.next/**/*',
        '**/*.git/**/*',
        '**/*components/ui/**/*',
        '**/*components/blocks/**/*',
      ],
      dot: true,
      withFileTypes: true,
    });

    const fileList = files.map((file) => ({
      path: file.relative(),
      type: file.isDirectory() ? 'directory' : 'file',
    })) as OperationResult['directoryList'] || [];

    spinner.succeed(chalk.white(` Scanned project: Found ${fileList.length} items`));
    return { success: true, directoryList: fileList, path: pattern };

  } catch (error) {
    spinner.fail(chalk.red(` Failed to scan project with pattern: ${pattern}`));
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
  readDirectory,
  createDirectory,
  runCommand,
  scanProject,
  lintFile,
};