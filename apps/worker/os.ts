import { prismaClient } from "db/client";
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

export async function onFileUpdate(
  filePath: string,
  fileContent: string,
  projectId: string,
  promptId: string,
) {
  console.log(`Received file update for ${filePath}`);
  const absoluteFilePath = getSafeTargetPath(filePath);
  mkdirSync(path.dirname(absoluteFilePath), { recursive: true });
  await writeFile(absoluteFilePath, fileContent);

  const action = await prismaClient.action.create({
    data: {
      content: `Received file update for ${filePath}`,
      projectId: projectId,
      promptId: promptId,
      type: "FILE",
    },
  });

  console.log(
    `File written to ${absoluteFilePath} and action logged with id ${action.id}`,
  );
}

export async function onShellCommand(
  shellCommand: string,
  projectId: string,
  promptId: string,
) {
  console.log("Received shell command:", shellCommand);
  const action = await prismaClient.action.create({
    data: {
      content: `Received shell command: ${shellCommand}`,
      projectId: projectId,
      promptId: promptId,
      type: "SHELL",
    },
  });

  const commands = shellCommand.split("&&");
  const commandLogs: string[] = [];

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

    const exitCode = result.status ?? 1;
    const commandLog = [
      `$ ${trimmedCommand}`,
      result.stdout?.trim() ? `stdout:\n${result.stdout.trim()}` : "",
      result.stderr?.trim() ? `stderr:\n${result.stderr.trim()}` : "",
      `exit_code: ${exitCode}`,
    ]
      .filter(Boolean)
      .join("\n");

    commandLogs.push(commandLog);

    if (result.stdout) {
      console.log(result.stdout);
    }

    if (result.stderr) {
      console.log(result.stderr);
    }
  }

  const aggregatedLog = [
    `Received shell command: ${shellCommand}`,
    "--- terminal output ---",
    commandLogs.join("\n\n"),
  ].join("\n");

  await prismaClient.action.update({
    where: { id: action.id },
    data: {
      content: aggregatedLog,
    },
  });
}
