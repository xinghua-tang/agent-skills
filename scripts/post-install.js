import { existsSync } from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const nodeModules = path.join(root, "node_modules", "@modelcontextprotocol");

if (!existsSync(nodeModules)) {
    console.log("[agent-skills] 正在安装 MCP 依赖...");
    execSync("npm install --omit=dev", { cwd: root, stdio: "inherit" });
    console.log("[agent-skills] ✓ 依赖已就绪");
}