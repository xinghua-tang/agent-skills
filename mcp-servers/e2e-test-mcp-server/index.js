#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import fg from 'fast-glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ---------- 辅助函数 ----------
async function readFileSafe(filePath) {
    try {
        return await fs.readFile(filePath, "utf-8");
    } catch {
        return null;
    }
}

async function writeFileSafe(filePath, content) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
}

// ---------- 核心工具逻辑 ----------
const TOOLS = [
    {
        name: "get_knowledge",
        description: "渐进式加载业务域知识库（名词解释、依赖关系、流程）。",
        inputSchema: {
            type: "object",
            properties: {
                domain: { type: "string", description: "业务域，如 trade / product / buyer" },
            },
            required: ["domain"],
        },
    },
    {
        name: "list_skills",
        description: "列出某业务域下可用的接口清单（工具列表）。",
        inputSchema: {
            type: "object",
            properties: {
                domain: { type: "string", description: "业务域" },
            },
            required: ["domain"],
        },
    },
    {
        name: "exec_skill",
        description: "执行接口调用（Debug-first 模式：先探索参数，再正式调用）。",
        inputSchema: {
            type: "object",
            properties: {
                domain: { type: "string" },
                skill_name: { type: "string" },
                params: { type: "object" },
                debug_mode: { type: "boolean", default: true },
            },
            required: ["domain", "skill_name"],
        },
    },
    {
        name: "manage_script",
        description: "脚本管理（全上下文注入）：list（列出索引）、read（读完整源码）、write（写脚本并自动更新索引）。",
        inputSchema: {
            type: "object",
            properties: {
                action: { type: "string", enum: ["list", "read", "write"] },
                script_id: { type: "string", description: "read/write 时必填" },
                code: { type: "string", description: "write 时必填" },
                meta: {
                    type: "object",
                    description: "write 时的元信息（domain, actions, summary）",
                },
            },
            required: ["action"],
        },
    },
    // 新增工具定义
    {
        name: "read_files",
        description: "读取指定路径的文件内容。支持单个文件路径或glob模式（如 src/**/*.js）。返回文件内容列表。",
        inputSchema: {
            type: "object",
            properties: {
                paths: { type: "array", items: { type: "string" }, description: "文件路径或glob模式数组" },
                encoding: { type: "string", default: "utf-8" }
            },
            required: ["paths"]
        }
    },
    {
        name: "write_knowledge",
        description: "将生成的知识库内容写入 knowledge-base 目录。支持写入 knowledge.md 或 skills.json。",
        inputSchema: {
            type: "object",
            properties: {
                domain: { type: "string", description: "业务域名称（如 trade）" },
                file_type: { type: "string", enum: ["knowledge", "skills"] },
                content: { type: "string", description: "要写入的内容（文本或JSON字符串）" }
            },
            required: ["domain", "file_type", "content"]
        }
    },
    {
        name: "list_directory",
        description: "列出指定目录下的文件和子目录列表（用于探索代码结构）。",
        inputSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "目录路径" },
                recursive: { type: "boolean", default: false },
                pattern: { type: "string", description: "可选过滤模式（如 *.js）" }
            },
            required: ["path"]
        }
    },
];

// ---------- 工具处理器 ----------
async function handleGetKnowledge(domain) {
    const filePath = path.join(PROJECT_ROOT, "knowledge-base", domain, "knowledge.md");
    const content = await readFileSafe(filePath);
    if (!content) {
        return `⚠️ 未找到 [${domain}] 域的知识库文件。

            【初始化引导】请按以下步骤创建知识库：
            1. 在项目根目录创建文件夹：knowledge-base/${domain}/
            2. 创建文件 knowledge-base/${domain}/knowledge.md，至少包含：
               - 名词解释（如订单状态、支付渠道）
               - 依赖关系（如创建订单依赖商品域的sku_id）
               - 业务流程（如下单→支付→发货）
            
            【临时兜底】若暂无文档，你可以直接在对话中告诉我该域的：
            - 核心名词定义
            - 接口间依赖关系
            我会在本次对话中基于你的描述继续工作。
            `;
    }
    return `# ${domain} 域知识库\n\n${content}`;
}

async function handleListSkills(domain) {
    const filePath = path.join(PROJECT_ROOT, "knowledge-base", domain, "skills.json");
    const content = await readFileSafe(filePath);
    if (!content) {
        return `⚠️ 未找到 [${domain}] 域的接口清单（skills.json）。

            【初始化引导】请创建 knowledge-base/${domain}/skills.json，格式如下：
            {
              "createOrder": {
                "description": "创建交易订单",
                "required_params": ["buyer_id", "sku_id"],
                "output_example": { "code": 0, "data": { "order_id": "123" } }
              }
            }
            
            【临时兜底】你也可以直接告诉我该域有哪些接口（接口名、入参、出参），
            我会在本次对话中记住它们，并继续执行测试。
            `;
    }
    try {
        const json = JSON.parse(content);
        return `# ${domain} 域可用接口\n\n${JSON.stringify(json, null, 2)}`;
    } catch {
        return `接口清单格式错误。`;
    }
}

async function handleExecSkill(domain, skillName, params, debugMode = true) {
    // 1. 读取技能定义以校验参数（生产环境可替换为真实API网关调用）
    const skillPath = path.join(PROJECT_ROOT, "knowledge-base", domain, "skills.json");
    const skillContent = await readFileSafe(skillPath);
    if (!skillContent) return `域 ${domain} 不存在。`;

    const skills = JSON.parse(skillContent);
    const skillDef = skills[skillName];
    if (!skillDef) {
        return `接口 ${skillName} 在 ${domain} 域未定义。可用的有：${Object.keys(skills).join(", ")}`;
    }

    // 2. Debug-first 模拟：先打印参数探索结果
    if (debugMode) {
        const required = skillDef.required_params || [];
        const missing = required.filter((p) => !(p in params));
        if (missing.length > 0) {
            return `[Debug] 参数缺失：${missing.join(", ")}。接口定义要求入参：${required.join(", ")}。请补充后重试。`;
        }
        // 模拟返回结构（告知Claude真实的Input/Output结构）
        return `[Debug] 接口 ${domain}.${skillName} 调用预览（模拟）：
- 入参: ${JSON.stringify(params, null, 2)}
- 预期出参结构: ${JSON.stringify(skillDef.output_example || { code: 0, data: {} }, null, 2)}
- 提示: 若字段不匹配，请根据此结构调整参数。`;
    }

    // 3. 正式执行（此处替换为真实 HTTP 调用）
    // const response = await fetch(`${API_GATEWAY}/${domain}/${skillName}`, { method: 'POST', body: JSON.stringify(params) });
    return `[Exec] 接口 ${domain}.${skillName} 执行成功（模拟）。参数：${JSON.stringify(params)}`;
}

async function handleManageScript(action, scriptId, code, meta) {
    const indexPath = path.join(PROJECT_ROOT, "scripts", "_index.json");

    // 确保索引存在
    let indexData = { scripts: [] };
    const indexRaw = await readFileSafe(indexPath);
    if (indexRaw) {
        try { indexData = JSON.parse(indexRaw); } catch {}
    }

    // ---- action: list ----
    if (action === "list") {
        if (indexData.scripts.length === 0) {
            return "当前脚本库为空。可通过 `manage_script` (write) 沉淀新脚本。";
        }
        // 返回轻量摘要（仅 id, domain, summary），方便Claude扫描
        const summary = indexData.scripts.map((s) => ({
            id: s.id,
            domain: s.domain,
            summary: s.summary,
        }));
        return `# 可用脚本索引（${indexData.scripts.length} 个）\n\n${JSON.stringify(summary, null, 2)}\n\n如需查看完整源码，请使用 action: read + script_id。`;
    }

    // ---- action: read ----
    if (action === "read") {
        if (!scriptId) return "错误：read 操作需要提供 script_id。";
        const found = indexData.scripts.find((s) => s.id === scriptId);
        if (!found) {
            return `未找到脚本 ID: ${scriptId}。请先执行 list 查看可用 ID。`;
        }
        const scriptPath = path.join(PROJECT_ROOT, "scripts", found.path);
        const codeContent = await readFileSafe(scriptPath);
        if (!codeContent) {
            return `脚本文件 ${found.path} 不存在，可能已被删除。请更新索引。`;
        }
        // 返回完整源码，直接注入上下文
        return `# 完整脚本: ${scriptId}\n\n\`\`\`javascript\n${codeContent}\n\`\`\``;
    }

    // ---- action: write ----
    if (action === "write") {
        if (!scriptId || !code || !meta) {
            return "错误：write 操作需要 script_id, code, meta (domain/actions/summary)。";
        }
        // 检查是否已存在
        const existing = indexData.scripts.find((s) => s.id === scriptId);
        if (existing) {
            return `脚本 ID ${scriptId} 已存在。如需覆盖，请先手动删除或使用新 ID。`;
        }

        // 确定存储路径（按域分文件夹）
        const domainFolder = meta.domain || "common";
        const fileName = `${scriptId}.js`;
        const relativePath = path.join(domainFolder, fileName);
        const fullPath = path.join(PROJECT_ROOT, "scripts", relativePath);

        // 写入脚本文件
        await writeFileSafe(fullPath, code);

        // 更新索引
        indexData.scripts.push({
            id: scriptId,
            path: relativePath,
            domain: meta.domain || "common",
            actions: meta.actions || [],
            summary: meta.summary || scriptId,
        });
        await writeFileSafe(indexPath, JSON.stringify(indexData, null, 2));

        return `✅ 脚本 ${scriptId} 已保存至 ${fullPath}，索引已更新（总数：${indexData.scripts.length}）。\n下次对话中执行 'manage_script list' 即可看到该脚本。`;
    }

    return `未知 action: ${action}`;
}

async function handleReadFiles(paths) {
    const files = await fg(paths, { cwd: PROJECT_ROOT, absolute: true });
    const results = await Promise.all(files.map(async (file) => ({
        path: file,
        content: await fs.readFile(file, 'utf-8')
    })));
    return JSON.stringify(results, null, 2);
}

// write_knowledge：写入 knowledge-base/{domain}/{file_type}.md 或 .json
async function handleWriteKnowledge(domain, fileType, content) {
    const ext = fileType === 'knowledge' ? 'md' : 'json';
    const dir = path.join(PROJECT_ROOT, 'knowledge-base', domain);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${fileType}.${ext}`);
    await fs.writeFile(filePath, content, 'utf-8');
    return `✅ ${fileType} 文件已写入：${filePath}`;
}

// list_directory：递归列出文件（可限制深度）
async function handleListDirectory(dirPath, recursive, pattern) {
    // 使用 fs.readdir 和递归，或使用 fast-glob
    const entries = await fg(pattern || '*', { cwd: dirPath, absolute: false, deep: recursive ? Infinity : 1 });
    return entries.join('\n');
}

// ---------- MCP Server 主程序 ----------
const server = new Server(
    { name: "e2e-test-mcp-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    let result = "";

    try {
        switch (name) {
            case "get_knowledge":
                result = await handleGetKnowledge(args.domain);
                break;
            case "list_skills":
                result = await handleListSkills(args.domain);
                break;
            case "exec_skill":
                result = await handleExecSkill(args.domain, args.skill_name, args.params, args.debug_mode);
                break;
            case "manage_script":
                result = await handleManageScript(args.action, args.script_id, args.code, args.meta);
                break;
            case "read_files":
                result = await handleReadFiles(args.paths);
                break;
            case "write_knowledge":
                result = await handleWriteKnowledge(args.domain, args.file_type, args.content);
                break;
            case "list_directory":
                result = await handleListDirectory(args.path, args.recursive, args.pattern);
                break;
            default:
                throw new Error(`未知工具: ${name}`);
        }
    } catch (err) {
        result = `执行失败: ${err.message}`;
    }

    return { content: [{ type: "text", text: result }] };
});

// ---------- 启动服务 ----------
const transport = new StdioServerTransport();
await server.connect(transport);
console.info("E2E Test MCP Server running on stdio");