#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

let input = "";

process.stdin.on("data", d => input += d);

process.stdin.on("end", async () => {
  try {
    const args = input ? JSON.parse(input) : {};
    const query = args.query;
    const basePath = args.path || ".";

    if (!query) {
      process.stdout.write("Error: missing query");
      return;
    }

    if (basePath.includes("..")) {
      process.stdout.write("Error: invalid path");
      return;
    }

    // First, try ripgrep if available
    const rgCmd = `rg --with-filename --line-number --max-columns 200 --context 2 "${query}" "${basePath}"`;

    exec(rgCmd, { maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (!err && stdout) {
        // Truncate output to 8000 chars
        process.stdout.write(stdout.slice(0, 8000));
      } else {
        // Fallback: naive JS search
        simpleSearch(basePath, query);
      }
    });

  } catch (err) {
    process.stdout.write(`Error: ${err.message}`);
  }
});

// --- fallback naive search ---
async function simpleSearch(dir, query) {
  const results = [];
  async function walk(d) {
    let entries;
    try {
      entries = await fs.promises.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(d, entry.name);
      const rel = path.relative(process.cwd(), full);

      if (entry.isDirectory()) {
        await walk(full);
      } else {
        try {
          const content = await fs.promises.readFile(full, "utf8");
          const lines = content.split("\n");
          lines.forEach((line, i) => {
            if (line.includes(query)) {
              results.push(`${rel}:${i + 1}: ${line}`);
            }
          });
        } catch {}
      }
      if (results.length >= 200) return;
    }
  }

  await walk(dir);
  process.stdout.write(results.slice(0, 200).join("\n"));
}

