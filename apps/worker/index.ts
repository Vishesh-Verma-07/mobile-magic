import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import { prismaClient } from "db/client";
import express from "express";
import { spawnSync } from "node:child_process";
import { onFileUpdate, onShellCommand as runShellCommand } from "./os";
import { ArtifactProcessor } from "./parser";
import { systemPrompt } from "./systemPrompt";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const app = express();
app.use(express.json());
app.use(cors());

const CODE_SERVER_CONTAINER =
  process.env.CODE_SERVER_CONTAINER ?? "code-server";
const CODE_SERVER_LOG_LINES = Number(
  process.env.CODE_SERVER_LOG_LINES ?? "200",
);
const CODE_SERVER_LOG_MAX_CHARS = Number(
  process.env.CODE_SERVER_LOG_MAX_CHARS ?? "16000",
);

function getCodeServerTerminalContext() {
  const result = spawnSync(
    "docker",
    ["logs", "--tail", String(CODE_SERVER_LOG_LINES), CODE_SERVER_CONTAINER],
    {
      encoding: "utf8",
      timeout: 5000,
    },
  );

  const rawLog = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  if (!rawLog) {
    return "";
  }

  if (rawLog.length <= CODE_SERVER_LOG_MAX_CHARS) {
    return rawLog;
  }

  return rawLog.slice(-CODE_SERVER_LOG_MAX_CHARS);
}

app.get("/", (req, res) => {
  res.json({ message: "Hello from the worker!" });
});
app.post("/prompt", async (req, res) => {
  // console.log("reached prompt endpoint with body:", req.body);
  const { prompt, projectId } = req.body;

  if (!prompt || !projectId) {
    res.status(400).json({ message: "prompt and projectId are required" });
    return;
  }

  const userPrompt = await prismaClient.prompt.create({
    data: { content: prompt, projectId, type: "USER" },
  });

  const allPrompts = await prismaClient.prompt.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  const history = allPrompts.slice(0, -1).map((p) => ({
    role: p.type === "USER" ? "user" : "model",
    parts: [{ text: p.content }],
  }));

  const terminalContext = getCodeServerTerminalContext();
  const promptWithTerminalContext = terminalContext
    ? `${prompt}\n\n[RECENT TERMINAL OUTPUT FROM CODE-SERVER DOCKER CONTAINER]\n${terminalContext}`
    : prompt;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt("REACT_NATIVE"),
  });

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const chat = model.startChat({ history });
  const streamResult = await chat.sendMessageStream(promptWithTerminalContext);

  let fullText = "";
  const executedActions = new Set<string>();

  const executeFileAction = async (filePath: string, fileContent: string) => {
    const actionKey = `file:${filePath}:${fileContent}`;
    if (executedActions.has(actionKey)) {
      return;
    }

    executedActions.add(actionKey);

    try {
      await onFileUpdate(filePath, fileContent, projectId, userPrompt.id);
    } catch (error) {
      console.error(`Failed to write file ${filePath}:`, error);
    }

    res.write(
      `data: ${JSON.stringify({ type: "file", filePath, fileContent })}\n\n`,
    );
  };

  const executeShellAction = async (shellCommand: string) => {
    const normalizedCommand = shellCommand.trim();
    if (!normalizedCommand) {
      return;
    }

    const actionKey = `shell:${normalizedCommand}`;
    if (executedActions.has(actionKey)) {
      return;
    }

    executedActions.add(actionKey);

    runShellCommand(normalizedCommand, projectId, userPrompt.id);

    res.write(
      `data: ${JSON.stringify({ type: "shell", shellCommand: normalizedCommand })}\n\n`,
    );
  };

  const parseAndExecuteActionsFromText = async (text: string) => {
    const actionRegex = /<boltAction\b([^>]*)>([\s\S]*?)<\/boltAction>/gi;

    let match: RegExpExecArray | null;
    while ((match = actionRegex.exec(text)) !== null) {
      const rawAttributes = match[1] ?? "";
      const rawContent = match[2] ?? "";
      const typeMatch = rawAttributes.match(
        /type\s*=\s*["']?([a-zA-Z]+)["']?/i,
      );
      const actionType = typeMatch?.[1]?.toLowerCase();

      if (actionType === "file") {
        const filePathMatch = rawAttributes.match(
          /filePath\s*=\s*["']([^"']+)["']/i,
        );
        const filePath = filePathMatch?.[1];
        if (filePath) {
          await executeFileAction(filePath, rawContent);
        }
      } else if (actionType === "shell") {
        await executeShellAction(rawContent);
      }
    }
  };

  const processor = new ArtifactProcessor(
    "",
    // onFileContent — fires each time a complete file is parsed
    async (filePath, fileContent) => {
      await executeFileAction(filePath, fileContent);
    },
    // onShellCommand — fires each time a complete shell action is parsed
    async (shellCommand) => {
      await executeShellAction(shellCommand);
    },
  );

  for await (const chunk of streamResult.stream) {
    const chunkText = chunk.text();
    fullText += chunkText;

    // Feed chunk into processor and attempt to parse completed actions
    processor.append(chunkText);
    await processor.parse();

    // Also stream raw chunk to client so UI can show live typing effect
    res.write(
      `data: ${JSON.stringify({ type: "chunk", chunk: chunkText })}\n\n`,
    );
  }

  // Save full LLM response to DB
  const llmPrompt = await prismaClient.prompt.create({
    data: { content: fullText, projectId, type: "SYSTEM" },
  });

  // Fallback pass: process all actions from full model output to recover any
  // action that might have been missed during incremental chunk parsing.
  await parseAndExecuteActionsFromText(fullText);

  await onFileUpdate(
    `${projectId}/llm-response.txt`,
    fullText,
    projectId,
    llmPrompt.id,
  );

  res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  res.end();
});

app.listen(9091, () => {
  console.log("Worker is running on port 9091");
});
