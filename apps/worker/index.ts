import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import { prismaClient } from "db/client";
import express from "express";
import { onFileUpdate, onShellCommand as runShellCommand } from "./os";
import { ArtifactProcessor } from "./parser";
import { systemPrompt } from "./systemPrompt";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "Hello from the worker!" });
});
app.post("/prompt", async (req, res) => {
  const { prompt, projectId } = req.body;

  if (!prompt || !projectId) {
    res.status(400).json({ message: "prompt and projectId are required" });
    return;
  }

  await prismaClient.prompt.create({
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

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt("REACT_NATIVE"),
  });

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const chat = model.startChat({ history });
  const streamResult = await chat.sendMessageStream(prompt);
  console.log("LLM response stream started");
  console.log("Stream result:", streamResult);

  let fullText = "";
  const executedActions = new Set<string>();

  const executeFileAction = async (filePath: string, fileContent: string) => {
    const actionKey = `file:${filePath}:${fileContent}`;
    if (executedActions.has(actionKey)) {
      return;
    }

    executedActions.add(actionKey);
    console.log(
      `Processing file action for ${filePath} with content length ${fileContent.length}`,
    );

    try {
      await onFileUpdate(filePath, fileContent);
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
    console.log(`Executing shell command from LLM: ${normalizedCommand}`);
    runShellCommand(normalizedCommand);

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

  console.log(processor);
  console.log("Processing LLM response stream...");
  console.log("Stream result stream:", streamResult.stream);

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
  await prismaClient.prompt.create({
    data: { content: fullText, projectId, type: "SYSTEM" },
  });

  // Fallback pass: process all actions from full model output to recover any
  // action that might have been missed during incremental chunk parsing.
  await parseAndExecuteActionsFromText(fullText);

  await onFileUpdate(`${projectId}/llm-response.txt`, fullText);

  res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  res.end();
});

app.listen(9091, () => {
  console.log("Worker is running on port 9091");
});
