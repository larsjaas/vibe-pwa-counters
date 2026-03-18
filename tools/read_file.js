#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

let input = "";

process.stdin.on("data", d => input += d);

process.stdin.on("end", async () => {
  try {
    let args = {};
    if (input.trim()) {
      args = JSON.parse(input);
    }

    const filePath = args.path;
    const startLine = Number.isInteger(args.start_line) ? args.start_line : 1;
    const endLine = Number.isInteger(args.end_line) ? args.end_line : startLine + 199; // default 200 lines

    if (!filePath) {
      process.stdout.write("Error: missing path");
      return;
    }

    // Safety: no path traversal
    if (filePath.includes("..")) {
      process.stdout.write("Error: invalid path");
      return;
    }

    const content = await fs.readFile(filePath, "utf8");
    const lines = content.split("\n");

    const slice = lines.slice(startLine - 1, endLine);
    const numbered = slice.map((line, i) => `${startLine + i}: ${line}`);

    // Limit output to ~8000 characters
    const output = numbered.join("\n").slice(0, 8000);

    process.stdout.write(output);

  } catch (err) {
    process.stdout.write(`Error: ${err.message}`);
  }
});

