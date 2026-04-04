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
  private onFileContent: (
    filePath: string,
    fileContent: string,
  ) => void | Promise<void>;
  private onShellCommand: (shellCommand: string) => void | Promise<void>;

  constructor(
    currentArtifact: string,
    onFileContent: (
      filePath: string,
      fileContent: string,
    ) => void | Promise<void>,
    onShellCommand: (shellCommand: string) => void | Promise<void>,
  ) {
    this.currentArtifact = currentArtifact;
    this.onFileContent = onFileContent;
    this.onShellCommand = onShellCommand;
  }

  append(artifact: string) {
    this.currentArtifact += artifact;
  }

  async parse() {
    while (true) {
      const startIndex = this.currentArtifact.indexOf("<boltAction");
      if (startIndex === -1) {
        return;
      }

      const headerEndIndex = this.currentArtifact.indexOf(">", startIndex);
      if (headerEndIndex === -1) {
        return;
      }

      const closeTag = "</boltAction>";
      const closeIndex = this.currentArtifact.indexOf(closeTag, headerEndIndex);
      if (closeIndex === -1) {
        return;
      }

      const header = this.currentArtifact.slice(startIndex, headerEndIndex + 1);
      const content = this.currentArtifact.slice(
        headerEndIndex + 1,
        closeIndex,
      );

      try {
        const typeMatch = header.match(/type\s*=\s*["'](shell|file)["']/i);
        const actionType = typeMatch?.[1]?.toLowerCase();

        if (!actionType) {
          this.currentArtifact = this.currentArtifact.slice(
            closeIndex + closeTag.length,
          );
          continue;
        }

        if (actionType === "shell") {
          await this.onShellCommand(content.trim());
        } else {
          const filePathMatch = header.match(
            /filePath\s*=\s*["']([^"']+)["']/i,
          );
          const filePath = filePathMatch?.[1];
          if (filePath) {
            await this.onFileContent(filePath, content);
          }
        }
      } catch (_e) {
        // Swallow parser-side exceptions so the stream can continue.
      }

      this.currentArtifact =
        this.currentArtifact.slice(0, startIndex) +
        this.currentArtifact.slice(closeIndex + closeTag.length);
    }
  }
}
