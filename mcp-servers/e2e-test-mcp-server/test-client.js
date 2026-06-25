#!/usr/bin/env node

// 测试客户端：连接 e2e-test-mcp-server 并验证所有工具
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
    command: "node",
    args: ["index.js"],
});

const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
);

const SEP = "─".repeat(60);

function log(title, content) {
    console.log(`\n${SEP}`);
    console.log(`▶ ${title}`);
    console.log(SEP);
    const text = typeof content === "string"
        ? content
        : JSON.stringify(content, null, 2);
    console.log(text);
}

try {
    console.log("🔌 正在连接 MCP Server ...");
    await client.connect(transport);
    console.log("✅ 已连接\n");

    // 1. 列出所有工具
    const { tools } = await client.listTools();
    log("1. listTools() — 服务器注册的工具", tools.map(t => ({
        name: t.name,
        description: t.description,
    })));

    // 2. list_directory（递归列出当前 mcp-servers 目录）
    const r2 = await client.callTool({
        name: "list_directory",
        arguments: { path: ".", recursive: true },
    });
    log("2. list_directory('.', recursive=true) — mcp-servers 内容", r2.content[0].text);

    // 3. list_directory（带 pattern）
    const r3 = await client.callTool({
        name: "list_directory",
        arguments: { path: ".", recursive: false, pattern: "*.js" },
    });
    log("3. list_directory('.', pattern='*.js')", r3.content[0].text);

    // 4. read_files（glob 模式 — 读取 server 相关 .js 文件）
    const r4 = await client.callTool({
        name: "read_files",
        arguments: { paths: ["mcp-servers/**/*.js"] },
    });
    const parsed = JSON.parse(r4.content[0].text);
    log("4. read_files('mcp-servers/**/*.js')", `共 ${parsed.length} 个文件：\n${parsed.map(f => f.path).join("\n")}`);

    // 5. get_knowledge（不存在的域）
    const r5 = await client.callTool({
        name: "get_knowledge",
        arguments: { domain: "trade" },
    });
    log("5. get_knowledge('trade') — 未初始化场景", r5.content[0].text.slice(0, 400));

    // 6. list_skills（不存在的域）
    const r6 = await client.callTool({
        name: "list_skills",
        arguments: { domain: "trade" },
    });
    log("6. list_skills('trade') — 未初始化场景", r6.content[0].text.slice(0, 400));

    // 7. manage_script (list — 空索引)
    const r7 = await client.callTool({
        name: "manage_script",
        arguments: { action: "list" },
    });
    log("7. manage_script(list) — 空索引场景", r7.content[0].text);

    // 8. manage_script (write — 写入测试脚本)
    const r8 = await client.callTool({
        name: "manage_script",
        arguments: {
            action: "write",
            script_id: "test_hello_world",
            code: 'console.log("hello from test script");',
            meta: {
                domain: "common",
                actions: ["demo"],
                summary: "测试用 hello world 脚本",
            },
        },
    });
    log("8. manage_script(write)", r8.content[0].text);

    // 9. manage_script (list — 确认已写入)
    const r9 = await client.callTool({
        name: "manage_script",
        arguments: { action: "list" },
    });
    log("9. manage_script(list) — 确认写入", r9.content[0].text);

    // 10. write_knowledge
    const r10 = await client.callTool({
        name: "write_knowledge",
        arguments: {
            domain: "trade",
            file_type: "knowledge",
            content: "# Trade 域知识库\n\n## 核心名词\n- order_id: 订单唯一标识\n- sku_id: 商品SKU\n",
        },
    });
    log("10. write_knowledge(trade, knowledge)", r10.content[0].text);

    // 11. get_knowledge（读取刚写入的内容）
    const r11 = await client.callTool({
        name: "get_knowledge",
        arguments: { domain: "trade" },
    });
    log("11. get_knowledge('trade') — 写入后读取", r11.content[0].text);

    // 12. write_knowledge (skills)
    const r12 = await client.callTool({
        name: "write_knowledge",
        arguments: {
            domain: "trade",
            file_type: "skills",
            content: JSON.stringify({
                createOrder: {
                    description: "创建订单",
                    required_params: ["buyer_id", "sku_id"],
                    output_example: { code: 0, data: { order_id: "123" } },
                },
            }),
        },
    });
    log("12. write_knowledge(trade, skills)", r12.content[0].text);

    // 13. list_skills（读取刚写入的接口清单）
    const r13 = await client.callTool({
        name: "list_skills",
        arguments: { domain: "trade" },
    });
    log("13. list_skills('trade') — 写入后读取", r13.content[0].text);

    // 14. exec_skill (debug_mode=true — 参数缺失场景)
    const r14 = await client.callTool({
        name: "exec_skill",
        arguments: {
            domain: "trade",
            skill_name: "createOrder",
            params: { buyer_id: "B001" }, // 缺少 sku_id
            debug_mode: true,
        },
    });
    log("14. exec_skill(trade.createOrder) — 参数缺失 debug", r14.content[0].text);

    // 15. exec_skill (debug_mode=true — 参数完整)
    const r15 = await client.callTool({
        name: "exec_skill",
        arguments: {
            domain: "trade",
            skill_name: "createOrder",
            params: { buyer_id: "B001", sku_id: "SKU-999" },
            debug_mode: true,
        },
    });
    log("15. exec_skill(trade.createOrder) — 完整参数 debug", r15.content[0].text);

    // 16. exec_skill (debug_mode=false — 正式执行)
    const r16 = await client.callTool({
        name: "exec_skill",
        arguments: {
            domain: "trade",
            skill_name: "createOrder",
            params: { buyer_id: "B001", sku_id: "SKU-999" },
            debug_mode: false,
        },
    });
    log("16. exec_skill(trade.createOrder) — 正式执行", r16.content[0].text);

    // 17. exec_skill (接口不存在)
    const r17 = await client.callTool({
        name: "exec_skill",
        arguments: {
            domain: "trade",
            skill_name: "nonExistentApi",
            params: {},
        },
    });
    log("17. exec_skill(trade.nonExistentApi)", r17.content[0].text);

    // 18. manage_script (read — 读取刚写入的脚本)
    const r18 = await client.callTool({
        name: "manage_script",
        arguments: { action: "read", script_id: "test_hello_world" },
    });
    log("18. manage_script(read)", r18.content[0].text);

    console.log(`\n${SEP}`);
    console.log("✅ 全部 18 个测试用例执行完毕");
    console.log(SEP);
} catch (err) {
    console.error("❌ 测试失败:", err);
    process.exit(1);
} finally {
    await client.close();
}