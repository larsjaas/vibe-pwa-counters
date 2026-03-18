#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

// fs.appendFile("/tmp/pi-tool-debug.log", "Called list_files.js\n");

let input = "";

process.stdin.on("data", d => input += d);

process.stdin.on("end", async () => {

  let args = {};
  if (input.trim()) {
    args = JSON.parse(input);
  }

  const basePath = args.path || ".";
  const maxDepth = Number.isInteger(args.depth) ? args.depth : 2;

  if (basePath.includes("..")) {
    process.stdout.write("Error: invalid path");
    return;
  }

  try {

    const results = [];

    async function walk(dir, depth) {

      if (depth > maxDepth) return;

      let entries;

      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {

        const full = path.join(dir, entry.name);
        const rel = path.relative(process.cwd(), full);

        if (entry.isDirectory()) {
          results.push(rel + "/");
          await walk(full, depth + 1);
        } else {
          results.push(rel);
        }

        if (results.length > 500) return;
      }
    }

    await walk(basePath, 0);

    process.stdout.write(results.join("\n"));

  } catch (err) {
    process.stdout.write(`Error: ${err.message}`);
  }

});
