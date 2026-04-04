#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

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

  // ---- Load .rgignore ----

  let ignorePatterns = [];

  try {
    const ignoreFile = await fs.readFile(".rgignore", "utf8");
    ignorePatterns = ignoreFile
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"));
  } catch {
    // no .rgignore → ignore nothing
  }

  // ---- Simple matcher ----

  function matchesIgnore(relPath) {
    return ignorePatterns.some(pattern => {
      if (pattern.endsWith("/")) {
        // directory match
        return relPath.startsWith(pattern);
      }

      if (pattern.includes("*")) {
        // very simple glob
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        return regex.test(relPath);
      }

      return relPath === pattern || relPath.startsWith(pattern + "/");
    });
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

        // ---- Ignore check ----
        if (matchesIgnore(rel)) continue;

        if (entry.isDirectory()) {
          results.push(rel + "/");

          // skip recursion into ignored dirs
          if (!matchesIgnore(rel + "/")) {
            await walk(full, depth + 1);
          }

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
