/*
    <boltArtifact>
        <boltAction type="shell">
            npm run start
        </boltAction>
        <boltAction type="file" filePath="src/index.js">
            console.log("Hello, world!");
        </boltAction>
    </boltArtifact>
*/

export class ArtifactProcessor {
  public currentArtifact: string;
  private onFileContent: (filePath: string, fileContent: string) => void;
  private onShellCommand: (shellCommand: string) => void;

  constructor(
    currentArtifact: string,
    onFileContent: (filePath: string, fileContent: string) => void,
    onShellCommand: (shellCommand: string) => void,
  ) {
    this.currentArtifact = currentArtifact;
    this.onFileContent = onFileContent;
    this.onShellCommand = onShellCommand;
  }

  append(artifact: string) {
    this.currentArtifact += artifact;
  }

  parse() {
    const lines = this.currentArtifact.split("\n");
    const latestActionStart = lines.findIndex((line) =>
      line.includes("<boltAction type="),
    );
    const latestActionEnd = lines.findIndex((line) =>
      line.includes("</boltAction>"),
    );

    if (latestActionStart === -1 || latestActionEnd === -1) {
      return;
    }

    const latestActionLine = lines[latestActionStart];
    if (!latestActionLine) {
      return;
    }

    const actionTypePart = latestActionLine.split("type=")[1];
    if (!actionTypePart) {
      return;
    }

    const latestActionType = actionTypePart.split(" ")[0]?.split(">")[0];
    if (!latestActionType) {
      return;
    }

    const latestActionContent = lines
      .slice(latestActionStart, latestActionEnd + 1)
      .join("\n");

    try {
      if (latestActionType === '"shell"') {
        let shellCommand = latestActionContent.split("\n").slice(1).join("\n");
        if (shellCommand.includes("</boltAction>")) {
          const parsedCommand = shellCommand.split("</boltAction>")[0];
          const remainingArtifact =
            this.currentArtifact.split(latestActionContent)[1];

          if (parsedCommand === undefined || remainingArtifact === undefined) {
            return;
          }

          shellCommand = parsedCommand;
          this.currentArtifact = remainingArtifact;
          this.onShellCommand(shellCommand);
        }
      } else if (latestActionType === '"file"') {
        const filePathPart = latestActionLine.split("filePath=")[1];
        if (!filePathPart) {
          return;
        }

        const filePath = filePathPart.split(">")[0];
        const parsedFilePath = filePath?.split('"')[1];
        if (!parsedFilePath) {
          return;
        }

        let fileContent = latestActionContent.split("\n").slice(1).join("\n");
        if (fileContent.includes("</boltAction>")) {
          const parsedFileContent = fileContent.split("</boltAction>")[0];
          const remainingArtifact =
            this.currentArtifact.split(latestActionContent)[1];

          if (
            parsedFileContent === undefined ||
            remainingArtifact === undefined
          ) {
            return;
          }

          fileContent = parsedFileContent;
          this.currentArtifact = remainingArtifact;
          this.onFileContent(parsedFilePath, fileContent);
        }
      }
    } catch (_e) {}
  }
}
