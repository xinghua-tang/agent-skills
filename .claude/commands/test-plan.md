---
description: 启动 test-planner agent — 检查知识库完整性，缺失时引导生成，就绪后输出端到端测试计划
---

Invoke the agent-skills:test-planner skill.

Tell the agent the business domain to test (e.g. `trade`, `user`, `pay`).
The agent will:
1. Check whether the knowledge base for the domain is ready (`list_skills` + `get_knowledge`).
2. If not ready, guide you to generate it (PRD + API doc, or code scanning).
3. Once ready, perform reverse-chained reasoning and output a JSON test plan with setup / execute / validate phases.