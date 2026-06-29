---
description: 启动 test-planner agent — 检查知识库完整性，缺失时引导生成，就绪后输出端到端测试计划文档
---

Invoke the agent-skills:test-planner skill.

告诉要测试的业务领域（例如 trade、user、pay）
1. 检查该领域的知识库是否就绪（使用 list_skills + get_knowledge）
2. 如果未就绪，委托 agent-skills:knowledge-generator 引导生成知识库。
3. 严格按步骤执行agent-skill:test-planner 中的逻辑

将测试计划保存为项目根目录下的 <领域>/test-plan.md 文件，并在继续之前与用户确认。