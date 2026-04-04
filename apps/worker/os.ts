import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_WORKER_DIR = path.resolve(
  process.env.BASE_WORKER_DIR ?? "/tmp/bolty-worker",
);

function getSafeTargetPath(filePath: string) {
  const normalizedRelativePath = filePath.replace(/^[/\\]+/, "");
  return path.join(BASE_WORKER_DIR, normalizedRelativePath);
}

mkdirSync(BASE_WORKER_DIR, { recursive: true });

export async function onFileUpdate(filePath: string, fileContent: string) {
  const absoluteFilePath = getSafeTargetPath(filePath);
  mkdirSync(path.dirname(absoluteFilePath), { recursive: true });
  await writeFile(absoluteFilePath, fileContent);
}

export function onShellCommand(shellCommand: string) {
  const commands = shellCommand.split("&&");

  for (const command of commands) {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) {
      continue;
    }

    console.log(`Running command: ${trimmedCommand}`);
    const result = spawnSync(trimmedCommand, {
      cwd: BASE_WORKER_DIR,
      shell: true,
      encoding: "utf8",
    });

    if (result.stdout) {
      console.log(result.stdout);
    }

    if (result.stderr) {
      console.log(result.stderr);
    }
  }
}
