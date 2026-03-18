#!/usr/bin/env node

const { exec } = require("child_process");

let input = "";

process.stdin.on("data", d => input += d);

process.stdin.on("end", async () => {
  try {
    const args = input ? JSON.parse(input) : {};
    const command = args.command;

    if (!command) {
      process.stdout.write("Error: missing command");
      return;
    }

    // Optional: reject obviously dangerous commands
    const forbidden = ["rm -rf", "shutdown", "reboot", "sudo"];
    for (const f of forbidden) {
      if (command.includes(f)) {
        process.stdout.write(`Error: forbidden command "${f}"`);
        return;
      }
    }

    // Run command
    exec(command, { maxBuffer: 8 * 1024 * 1024, timeout: 60000 }, (err, stdout, stderr) => {
      let output = "";
      if (stdout) output += stdout;
      if (stderr) output += stderr;
      if (err && !output) output = err.message;

      // truncate to 8000 chars for agent consumption
      process.stdout.write(output.slice(0, 8000));
    });

  } catch (err) {
    process.stdout.write(`Error: ${err.message}`);
  }
});
