#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

// ---- Read stdin ----
async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

// ---- Ensure directory exists ----
async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

// ---- Parse hunk header ----
// @@ -oldStart,oldLen +newStart,newLen @@
function parseHunkHeader(line) {
  const match = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
  if (!match) return 0;
  return Math.max(parseInt(match[1], 10) - 1, 0); // convert to 0-based
}

// ---- Apply patch ----
async function applyPatch(patchText) {
  const lines = patchText.split("\n");

  let currentFile = null;
  let fileBuffer = [];
  let originalLines = [];

  let mode = null; // null | "add" | "update"
  let inHunk = false;
  let cursor = 0;

  async function flushFile() {
    if (currentFile === null) return;
    await ensureDir(currentFile);
    await fs.writeFile(currentFile, fileBuffer.join("\n"), "utf8");
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ---- FILE OPS ----

    if (line.startsWith("*** Update File: ")) {
      await flushFile();

      currentFile = line.replace("*** Update File: ", "").trim();
      mode = "update";
      inHunk = false;

      try {
        const content = await fs.readFile(currentFile, "utf8");
        originalLines = content.split("\n");
      } catch {
        originalLines = [];
      }

      fileBuffer = [...originalLines];
      continue;
    }

    if (line.startsWith("*** Add File: ")) {
      await flushFile();

      currentFile = line.replace("*** Add File: ", "").trim();
      mode = "add";
      inHunk = false;
      fileBuffer = [];
      continue;
    }

    if (line.startsWith("*** Delete File: ")) {
      const fileToDelete = line.replace("*** Delete File: ", "").trim();

      try {
        await fs.unlink(fileToDelete);
        console.error(`Deleted ${fileToDelete}`);
      } catch {
        console.error(`File not found for deletion: ${fileToDelete}`);
      }

      continue;
    }

    if (line.startsWith("*** End Patch")) {
      await flushFile();
      currentFile = null;
      mode = null;
      continue;
    }

    // ---- HUNK START ----

    if (line.startsWith("@@")) {
      inHunk = true;
      cursor = parseHunkHeader(line);
      continue;
    }

    // ---- ADD FILE MODE ----

    if (mode === "add") {
      if (line.startsWith("+")) {
        fileBuffer.push(line.slice(1));
      } else if (!line.startsWith("@@")) {
        fileBuffer.push(line);
      }
      continue;
    }

    // ---- UPDATE MODE ----

    if (mode === "update" && inHunk) {
      // Context line
      if (line.startsWith(" ")) {
        cursor++;
        continue;
      }

      // Delete line
      if (line.startsWith("-")) {
        const expected = line.slice(1);

        if (fileBuffer[cursor] === expected) {
          fileBuffer.splice(cursor, 1);
        } else {
          // fallback: try to find nearby
          const idx = fileBuffer.indexOf(expected, cursor);
          if (idx !== -1) {
            fileBuffer.splice(idx, 1);
            cursor = idx;
          } else {
            console.error(`WARN: delete mismatch: "${expected}"`);
          }
        }
        continue;
      }

      // Add line
      if (line.startsWith("+")) {
        fileBuffer.splice(cursor, 0, line.slice(1));
        cursor++;
        continue;
      }

      // Unknown line → ignore
      continue;
    }
  }

  // Final flush
  await flushFile();
}

// ---- MAIN ----
(async () => {
  try {
    const input = await readStdin();
    const json = JSON.parse(input);

    if (!json.patch) {
      throw new Error("Missing patch field");
    }

    await applyPatch(json.patch);

    console.log("Patch applied successfully");
  } catch (err) {
    console.error("Error applying patch:", err.message);
    process.exit(1);
  }
})();

