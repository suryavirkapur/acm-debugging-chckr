import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const execAsync = promisify(exec);

async function gitCloneRepo(repoName: string): Promise<void> {
    const baseUrl = 'https://github.com/acmcomp';
    const repoUrl = `${baseUrl}/${repoName}.git`;
    const targetDir = path.join(process.cwd(), repoName);

    try {
        // Check if directory already exists
        await fs.access(targetDir).catch(() => null);
        if (await fs.stat(targetDir).catch(() => null)) {
            return;
        }

        // Clone the repository
        await execAsync(`git clone ${repoUrl} ${targetDir}`);
        console.log(`Successfully cloned ${repoName} to ${targetDir}`);
    } catch (error) {
        throw new Error(`Failed to clone repository: ${error}`);
    }
}

export default gitCloneRepo;