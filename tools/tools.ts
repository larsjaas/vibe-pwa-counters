import { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import { Text } from '@mariozechner/pi-tui';
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

function runTool(script, args) {

  return new Promise((resolve, reject) => {
    const ext = path.extname(script);

    let command: string;
    const commandArgs: string[] = [script];

    if (ext === ".py") {
      command = "python3";
    } else if (ext === ".ts") {
      command = "ts-node";
    } else {
      command = "node";
    }

    const proc = spawn(command, commandArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", d => stdout += d);
    proc.stderr.on("data", d => stderr += d);

    proc.on("close", code => {
      if (code == 0) {
        resolve(stdout);
      } else {
        reject(stderr || stdout)
      }
    });

    try {
      proc.stdin.write(JSON.stringify(args));
      proc.stdin.end();
    } catch (err: any) {
      reject("Failed to write to stdin: " + err.message);
    }
  });
}

export default function (pi: ExtensionAPI) {

  pi.registerTool({
    name: "list_files",
    label: "List Files Tool",
    description: "Lists files in directories",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory to start listing from" },
        depth: { type: "number", description: "Depth of subdirectories to traverse" }
      },
      required: ["path"]
    },
    execute: async (toolCallId, params, signal, onUpdate, ctx) => {
      // await fs.appendFile("/tmp/pi-tool-debug.log", "RENDER: " + JSON.stringify(params,null,2)+"\n");
      const result = await runTool("tools/list_files.js", params);
      return {
        content: [
          {
            type: "text",
            text: result || "No files found"
          }
        ]
      };
    },
    renderCall: (args, theme) => {
      return new Text("list_files:\n"+JSON.stringify(args,null,2)+"\n", 0, 0);
    // },
    // renderResult: (result, options, theme) => {
    //   return new Text(result.text, 0, 0);
    }
  });

  pi.registerTool({
    name: "apply_patch",
    label: "Apply Patch",
    description: "Apply a unified diff patch to modify files",
    parameters: {
      type: "object",
      properties: {
        patch: { type: "string", description: "Unified diff patch beginning with *** Begin Patch" }
      },
      required: ["patch"]
    },
    execute: async (toolCallId, params, signal, onUpdate, ctx) => {
      const result = await runTool("tools/apply_patch.js", params);
      return {
        content: [
          {
            type: "text",
            text: result || "Patch applied"
          }
        ]
      };
    },
    renderCall: (args, theme) => {
      return new Text("apply_patch:\n"+args.patch+"\n", 0, 0);
    }
  });

  pi.registerTool({
    name: "search",
    label: "Search for text",
    description: "Search for text in files",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to search for" },
        path: { type: "string", description: "File/path to search" }
      },
      required: ["query", "path"]
    },
    execute: async (toolCallId, params, signal, onUpdate, ctx) => {
      const result = await runTool("tools/search.js", params);
      return {
        content: [
          {
            type: "text",
            text: result || "No match"
          }
        ]
      };
    },
    renderCall: (args, theme) => {
      return new Text("search:\n"+JSON.stringify(args,null,2)+"\n", 0, 0);
    }
  });

  pi.registerTool({
    name: "write_file",
    label: "Write file to disk",
    description: "Write a file to disk",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path for file to write" },
        contents: { type: "string", description: "The contents of the file" }
      },
      required: ["path", "contents"]
    },
    execute: async (toolCallId, params, signal, onUpdate, ctx) => {
      const result = await runTool("tools/write_file.py", params);
      return {
        content: [
          {
            type: "text",
            text: result || "No result"
          }
        ]
      };
    },
    renderCall: (args, theme) => {
      return new Text("write_file:\n"+JSON.stringify(args,null,2)+"\n", 0, 0);
    }
  });

  pi.registerTool({
    name: "read_file",
    label: "Read File",
    description: "Read a file from disk",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path for file to write" }
      },
      required: ["path"]
    },
    execute: async (toolCallId, params, signal, onUpdate, ctx) => {
      const result = await runTool("tools/read_file.js", params);
      return {
        content: [
          {
            type: "text",
            text: result || "No result"
          }
        ]
      };
    },
    renderCall: (args, theme) => {
      return new Text("read_file:\n"+JSON.stringify(args,null,2)+"\n", 0, 0);
    }
  });

  pi.registerTool({
    name: "run_shell",
    label: "Run Shell Command",
    description: "Run a shell command",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The command to run" }
      },
      required: ["command"]
    },
    execute: async (toolCallId, params, signal, onUpdate, ctx) => {
      const result = await runTool("tools/run_shell.js", params);
      return {
        content: [
          {
            type: "text",
            text: result || "No result"
          }
        ]
      };
    },
    renderCall: (args, theme) => {
      return new Text("run_shell:\n"+JSON.stringify(args,null,2)+"\n", 0, 0);
    }
  });
}

