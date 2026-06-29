#!/usr/bin/env node
/**
 * Bootstrap script for the e2e-test MCP server.
 *
 * Ensures npm dependencies (`@modelcontextprotocol/sdk`, `fast-glob`) are
 * installed before the actual server starts.  On first launch after
 * `claude plugin add` the install may take a few seconds; subsequent starts
 * skip the check entirely because node_modules/ already exists.
 *
 * This is the **primary** mechanism — it runs in-process before the real
 * server is loaded, so there is no race between a SessionStart hook and the
 * MCP server startup.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Plugin root = 2 levels up (mcp-servers/e2e-test-mcp-server → repo root)
const pluginRoot = resolve(__dirname, "..", "..");

const nodeModules = resolve(pluginRoot, "node_modules");
const pkgJson = resolve(pluginRoot, "package.json");

// ---------------------------------------------------------------------------
// 1. Ensure dependencies are installed
// ---------------------------------------------------------------------------
if (!existsSync(nodeModules) && existsSync(pkgJson)) {
  console.error("[agent-skills] First launch detected — installing dependencies…");
  try {
    execSync("npm install --production --no-audit --no-fund", {
      cwd: pluginRoot,
      stdio: "inherit",
    });
    console.info("[agent-skills] Dependencies installed successfully.");
  } catch (err) {
    console.error(
      "[agent-skills] Failed to install dependencies:",
      err.message,
    );
    console.error(
      "[agent-skills] Please run `npm install` manually in:",
      pluginRoot,
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 2. Load and run the actual MCP server
// ---------------------------------------------------------------------------
import("./index.js").catch((err) => {
  console.error("[agent-skills] Server failed to start:", err);
  process.exit(1);
});