---
description: 启动 test-executor agent — 接收 test-planner 输出的 JSON 测试计划，生成可执行的 JS 端到端测试脚本
---

Spawn the `test-executor` subagent.

Provide the agent with a test plan (typically the JSON output from `/test-plan`) and the business domain to test.
The agent will:
1. Search for reusable historical scripts via `manage_script` (action: list) and reuse them when similarity > 80%.
2. For unmapped calls, run Debug-first exploration via `exec_skill` (debug_mode: true) to discover real input/output shapes.
3. Compose a runnable `execute()` function with structured header comments, then persist it via `manage_script` (action: write).