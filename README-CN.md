# Agent Skills

**面向 AI 编程助手的生产级工程技能。**

技能将资深工程师在构建软件时遵循的工作流程、质量关卡和最佳实践编码化。这些技能经过封装，确保 AI 助手在开发的每个阶段都能一致地遵循它们。

<a href="https://trendshift.io/repositories/25200" target="_blank"><img src="https://trendshift.io/api/badge/repositories/25200" alt="addyosmani%2Fagent-skills | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

![Addy's Agent Skills](https://addyosmani.com/assets/images/addys-agent-skills.jpg)

```
   定义            规划            构建            验证            审查            发布
  ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
  │ 需求 │ ───▶ │ 规格 │ ───▶ │ 编码 │ ───▶ │ 测试 │ ───▶ │ 质量 │ ───▶ │ 上线 │
  │ 澄清 │      │ 说明 │      │ 实现 │      │ 调试 │      │ 把关 │      │ 交付 │
  └──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  /spec          /plan          /build        /test         /review       /ship
```

## 端到端测试工作流

自包含的黑盒 API 测试框架。一个专用的 MCP 服务器提供 7 个工具，由两个专业 Agent —— **test-planner** 和 **test-executor** —— 协同编排，从零知识到生成经过验证、可直接运行的测试脚本。每个测试步骤都由接口契约为依据：不猜测，不虚构参数。

```
                            ┌──────────────────────────┐
  PRD + 接口文档 ─────────▶│   knowledge-builder       │
  或代码扫描               │   按业务域生成：           │
                            │   • knowledge.md          │
                            │   • skills.json           │
                            └────────────┬─────────────┘
                                         │
                            ┌────────────▼─────────────┐
  /test-plan ─────────────▶│   test-planner            │
                            │   • 看门人检查（知识库）     │
                            │   • 意图三元组提取        │
                            │   • 逆向链式映射          │
                            │   • 依赖树构建            │
                            │   • 拓扑排序              │
                            │   → test_plan.json        │
                            └────────────┬─────────────┘
                                         │
                            ┌────────────▼─────────────┐
  /test-executor ─────────▶│   test-executor           │
                            │   • 脚本复用检索          │
                            │   • Debug-first 探测      │
                            │   • 组装 execute()        │
                            │   • 运行 → 修复 → 重试    │
                            │   • 归档并更新索引        │
                            └──────────────────────────┘
```

| # | 阶段 | Agent | 做什么 |
|---|------|-------|--------|
| 0 | **知识库构建** | `knowledge-builder` | 从 PRD + 接口文档或后端代码扫描中生成 `knowledge.md`（业务名词、流程、约束）和 `skills.json`（含出入参结构的 API 清单） |
| 1 | **看门人检查** | `test-planner` | 调用 `list_skills(domain)` + `get_knowledge(domain)`。任一为空则阻塞，引导你提供文档或代码路径 —— 不允许猜测 |
| 2 | **逆向链式规划** | `test-planner` | 意图三元组（动作/实体/属性）→ API 到动作的映射 → 属性到字段校验 → 从入参回溯到源输出的依赖树 → 拓扑排序生成有序调用计划 |
| 3 | **计划输出** | `test-planner` | 写入 `knowledge-base/{domain}/test_plan.json`，包含 `intent_analysis`、`precheck_report`、`dependency_tree` 和 `call_plan` |
| 4 | **脚本复用** | `test-executor` | 通过 `manage_script list` 扫描脚本索引。相似度 > 80% 时复用历史脚本，部分匹配时借鉴调用链 |
| 5 | **Debug-first 探索** | `test-executor` | 对每个未覆盖的 API 调用 `exec_skill(debug_mode: true)` —— 传参、观察真实返回、发现隐藏约束（单位、枚举值、伪选填字段）。绝不凭文档猜测 |
| 6 | **执行-修复循环** | `test-executor` | 将验证过的调用链组装为 `execute()` 函数，逐步运行并将上一步输出传递为下一步输入。失败 → 诊断 → 修复 → 重试（最多 5 轮）。通过 → 归档 |
| 7 | **自学习沉淀** | `test-executor` | 将发现的隐性坑写回工具提示（`toolPrompt`），更新脚本索引供后续 RAG 召回 |

### 命令

| 你在做什么 | 命令 | 核心原则 |
|-----------|------|---------|
| 从知识库生成有契约依据的测试计划 | `/test-plan` | 无知识库，无计划 |
| 对真实 API 执行测试计划并产出已验证脚本 | `/test-executor` | 先调通，再动笔 |

---

## 命令

8 个斜杠命令映射到开发生命周期，每个命令自动激活对应的技能。

| 你在做什么 | 命令 | 核心原则 |
|-----------|------|---------|
| 定义要构建什么 | `/spec` | 先规格，后代码 |
| 规划如何构建 | `/plan` | 小而原子的任务 |
| 增量构建 | `/build` | 一次一片，逐步推进 |
| 证明它能用 | `/test` | 测试即证明 |
| 合并前审查 | `/review` | 提升代码健康度 |
| 审计 Web 性能 | `/webperf` | 先测量，再优化 |
| 简化代码 | `/code-simplify` | 清晰胜于聪明 |
| 发布到生产 | `/ship` | 越快越安全 |

规格说明就绪后想要更少的的手动步骤？**`/build auto`** 会生成计划并在单次批准后实现每一项任务 —— 你只需批准一次计划，然后它会自主运行。它省去的是任务**之间**的人工确认，而非验证环节：每项任务仍然采用测试驱动方式、独立提交，并在失败或有风险的步骤上暂停。

技能也会根据你正在做的事情自动激活 —— 设计 API 时自动触发 `api-and-interface-design`，构建 UI 时触发 `frontend-ui-engineering`，以此类推。

---

## 快速开始

<details>
<summary><b>Claude Code（推荐）</b></summary>

**从市场安装：**

```
/plugin marketplace add tangXinghua/agent-skills
/plugin install agent-skills@txh-agent-skills
```

> **SSH 报错？** 市场通过 SSH 克隆仓库。如果你尚未在 GitHub 上配置 SSH 密钥，可以[添加 SSH 密钥](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account)，或使用完整的 HTTPS URL 强制走 HTTPS 克隆：
> ```bash
> /plugin marketplace add https://github.com/xinghua-tang/agent-skills.git 
> /plugin install agent-skills@txh-agent-skills
> ```

**本地 / 开发模式：**

```bash
git clone https://github.com/xinghua-tang/agent-skills.git
claude --plugin-dir /path/to/agent-skills -debug
```

</details>

<details>
<summary><b>Cursor</b></summary>

将任意 `SKILL.md` 复制到 `.cursor/rules/`，或引用整个 `skills/` 目录。详见 [docs/cursor-setup.md](docs/cursor-setup.md)。

</details>

<details>
<summary><b>Antigravity CLI</b></summary>

作为原生插件安装，支持技能、子 Agent 和斜杠命令。详见 [docs/antigravity-setup.md](docs/antigravity-setup.md)。

**从 Git 仓库安装：**

```bash
agy plugin install https://github.com/addyosmani/agent-skills.git
```

**从本地克隆安装：**

```bash
git clone https://github.com/addyosmani/agent-skills.git
agy plugin install ./agent-skills
```

</details>

<details>
<summary><b>Gemini CLI</b></summary>

作为原生技能安装以支持自动发现，或添加到 `GEMINI.md` 保持持久上下文。详见 [docs/gemini-cli-setup.md](docs/gemini-cli-setup.md)。

**从 Git 仓库安装：**

```bash
gemini skills install https://github.com/addyosmani/agent-skills.git --path skills
```

**从本地克隆安装：**

```bash
gemini skills install ./agent-skills/skills/
```

</details>

<details>
<summary><b>Windsurf</b></summary>

将技能内容添加到你的 Windsurf 规则配置中。详见 [docs/windsurf-setup.md](docs/windsurf-setup.md)。

</details>

<details>
<summary><b>OpenCode</b></summary>

通过 AGENTS.md 和 `skill` 工具使用 Agent 驱动的技能执行。

详见 [docs/opencode-setup.md](docs/opencode-setup.md)。

</details>

<details>
<summary><b>GitHub Copilot</b></summary>

将 `agents/` 中的 Agent 定义用作 Copilot 角色，将技能内容放入 `.github/copilot-instructions.md`。详见 [docs/copilot-setup.md](docs/copilot-setup.md)。

</details>

<details>
  <summary><b>Kiro IDE & CLI</b></summary>
  Kiro 的技能存放在 ".kiro/skills/" 下，可配置在项目级别或全局级别。Kiro 同样支持 Agents.md。详见 Kiro 文档：https://kiro.dev/docs/skills/
</details>

<details>
<summary><b>Codex / 其他 Agent</b></summary>

技能是纯 Markdown 文件 —— 可与任何接受系统提示词或指令文件的 Agent 配合使用。详见 [docs/getting-started.md](docs/getting-started.md)。

</details>

---

## 全部 24 项技能

上面的命令是入口。本包共包含 24 项技能 —— 23 项生命周期技能加上 `using-agent-skills` 元技能。每项技能都是结构化的工作流，包含执行步骤、验证关卡和防自我合理化表格。你也可以直接引用任何技能。

### 元技能 - 发现该用哪个技能

| 技能 | 做什么 | 何时使用 |
|------|--------|---------|
| [using-agent-skills](skills/using-agent-skills/SKILL.md) | 将当前任务映射到正确的技能工作流，并定义共享操作规则 | 开始一个会话，或不确定该用哪个技能时 |

### 定义 - 明确要构建什么

| 技能 | 做什么 | 何时使用 |
|------|--------|---------|
| [interview-me](skills/interview-me/SKILL.md) | 一次一个问题式的访谈，挖掘用户真正想要的而非他们以为自己想要的，直到约 95% 置信度 | 需求描述模糊，或用户说出"采访我"/"问清楚我" |
| [idea-refine](skills/idea-refine/SKILL.md) | 结构化的发散/收敛思维，将模糊的想法转化为具体方案 | 有一个粗略的概念需要深入探索 |
| [spec-driven-development](skills/spec-driven-development/SKILL.md) | 在编码前撰写 PRD，覆盖目标、命令、结构、代码风格、测试和边界 | 开始新项目、新功能或重大改动 |

### 规划 - 拆解任务

| 技能 | 做什么 | 何时使用 |
|------|--------|---------|
| [planning-and-task-breakdown](skills/planning-and-task-breakdown/SKILL.md) | 将规格说明分解为小型的、可验证的任务，含验收标准和依赖排序 | 已有规格说明，需要可实施的单元 |

### 构建 - 编写代码

| 技能 | 做什么 | 何时使用 |
|------|--------|---------|
| [incremental-implementation](skills/incremental-implementation/SKILL.md) | 薄垂直切片 —— 实现、测试、验证、提交。特性开关、安全默认值、可回滚的变更 | 涉及多个文件的任何改动 |
| [test-driven-development](skills/test-driven-development/SKILL.md) | 红-绿-重构，测试金字塔（80/15/5），测试规模，DAMP 优于 DRY，Beyonce 法则，浏览器测试 | 实现逻辑、修复 bug 或改变行为 |
| [context-engineering](skills/context-engineering/SKILL.md) | 在正确的时间给 Agent 提供正确的信息 —— 规则文件、上下文打包、MCP 集成 | 开始会话、切换任务或输出质量下降时 |
| [source-driven-development](skills/source-driven-development/SKILL.md) | 每个框架决策都以官方文档为依据 —— 验证、引用来源、标记未被验证的部分 | 需要为任何框架或库生成有据可查的代码 |
| [doubt-driven-development](skills/doubt-driven-development/SKILL.md) | 对每个非平凡决策进行对抗式新鲜上下文审查 —— CLAIM → EXTRACT → DOUBT → RECONCILE → STOP，可选用户授权的跨模型升级 | 风险高（生产、安全、不可逆）、在不熟悉的代码中工作、或验证比日后调试更划算时 |
| [frontend-ui-engineering](skills/frontend-ui-engineering/SKILL.md) | 组件架构、设计系统、状态管理、响应式设计、WCAG 2.1 AA 无障碍标准 | 构建或修改用户界面 |
| [api-and-interface-design](skills/api-and-interface-design/SKILL.md) | 契约优先设计，Hyrum 定律，单版本规则，错误语义，边界校验 | 设计 API、模块边界或公共接口 |

### 验证 - 证明它能用

| 技能 | 做什么 | 何时使用 |
|------|--------|---------|
| [browser-testing-with-devtools](skills/browser-testing-with-devtools/SKILL.md) | Chrome DevTools MCP 获取实时运行时数据 —— DOM 检查、控制台日志、网络追踪、性能分析 | 构建或调试任何在浏览器中运行的东西 |
| [debugging-and-error-recovery](skills/debugging-and-error-recovery/SKILL.md) | 五步排查：复现、定位、缩小、修复、守卫。停线规则，安全回退 | 测试失败、构建中断或行为异常 |

### 审查 - 合并前的质量关卡

| 技能 | 做什么 | 何时使用 |
|------|--------|---------|
| [code-review-and-quality](skills/code-review-and-quality/SKILL.md) | 五轴审查，变更规模（~100 行），严重级别标签（Nit/Optional/FYI），审查速度规范，拆分策略 | 合并任何变更之前 |
| [code-simplification](skills/code-simplification/SKILL.md) | Chesterton 之栏，500 法则，在保持行为完全不变的前提下降低复杂度 | 代码能跑但比应有的更难读或更难维护 |
| [security-and-hardening](skills/security-and-hardening/SKILL.md) | OWASP Top 10 防护，认证模式，密钥管理，依赖审计，三级边界系统 | 处理用户输入、认证、数据存储或外部集成 |
| [performance-optimization](skills/performance-optimization/SKILL.md) | 先测量再优化 —— Core Web Vitals 指标目标、性能分析工作流、包分析、反模式检测 | 存在性能要求或怀疑有性能回退 |

### 发布 - 信心交付

| 技能 | 做什么 | 何时使用 |
|------|--------|---------|
| [git-workflow-and-versioning](skills/git-workflow-and-versioning/SKILL.md) | 主干开发，原子提交，变更规模（~100 行），提交即保存点模式 | 做任何代码改动（始终） |
| [ci-cd-and-automation](skills/ci-cd-and-automation/SKILL.md) | 左移理念，越快越安全，特性开关，质量关卡流水线，失败反馈循环 | 设置或修改构建和部署流水线 |
| [deprecation-and-migration](skills/deprecation-and-migration/SKILL.md) | 代码即负债思维，强制 vs 建议废弃，迁移模式，僵尸代码清理 | 移除旧系统、迁移用户或下线功能 |
| [documentation-and-adrs](skills/documentation-and-adrs/SKILL.md) | 架构决策记录，API 文档，行内文档标准 —— 记录**为什么** | 做架构决策、变更 API 或发布功能 |
| [observability-and-instrumentation](skills/observability-and-instrumentation/SKILL.md) | 结构化日志，RED 指标，OpenTelemetry 链路追踪，基于症状的告警 —— 边构建边埋点 | 添加可观测性，或发布任何运行在生产环境的东西 |
| [shipping-and-launch](skills/shipping-and-launch/SKILL.md) | 发布前检查清单，特性开关生命周期，分阶段发布，回滚流程，监控配置 | 准备部署到生产环境 |

---

## Agent 角色

针对特定审查场景预配置的专家角色：

| Agent | 角色 | 视角 |
|-------|------|------|
| [code-reviewer](agents/code-reviewer.md) | 高级资深工程师 | 五轴代码审查，以"资深工程师会批准吗？"为标准 |
| [test-engineer](agents/test-engineer.md) | QA 专家 | 测试策略、覆盖率分析和 Prove-It 模式 |
| [security-auditor](agents/security-auditor.md) | 安全工程师 | 漏洞检测、威胁建模、OWASP 评估 |
| [web-performance-auditor](agents/web-performance-auditor.md) | Web 性能工程师 | Core Web Vitals 审计，支持 Quick/Deep 模式和指标诚实原则；通过 `/webperf` 运行 |

详见 [docs/agents.md](docs/agents.md)，了解决策矩阵、编排规则以及角色如何与技能和斜杠命令组合使用。

---

## 参考检查清单

技能在需要时加载的快速参考材料：

| 参考 | 覆盖内容 |
|------|---------|
| [testing-patterns.md](references/testing-patterns.md) | 测试结构、命名、Mock、React/API/E2E 示例、反模式 |
| [security-checklist.md](references/security-checklist.md) | 提交前检查、认证、输入校验、Headers、CORS、OWASP Top 10 |
| [performance-checklist.md](references/performance-checklist.md) | Core Web Vitals 指标目标、前端/后端检查清单、测量命令 |
| [accessibility-checklist.md](references/accessibility-checklist.md) | 键盘导航、屏幕阅读器、视觉设计、ARIA、测试工具 |
| [observability-checklist.md](references/observability-checklist.md) | On-call 问题、结构化日志、RED/USE 指标、链路追踪、基于症状的告警、上线前关卡 |
| [orchestration-patterns.md](references/orchestration-patterns.md) | 推荐的多角色编排模式、反模式以及"角色不调用角色"原则 |

---

## 技能如何工作

每项技能遵循一致的结构：

```
┌─────────────────────────────────────────────────┐
│  SKILL.md                                       │
│                                                 │
│  ┌─ 前置元数据 ───────────────────────────────┐  │
│  │ name: lowercase-hyphen-name               │  │
│  │ description: 引导 Agent 完成 [任务]。       │  │
│  │              何时使用…                    │  │
│  └───────────────────────────────────────────┘  │
│  概述           → 这项技能做什么                │
│  何时使用       → 触发条件                      │
│  流程           → 分步工作流                    │
│  常见自我合理化  → 借口 + 反驳                   │
│  红旗           → 出问题的信号                  │
│  验证           → 证据要求                      │
└─────────────────────────────────────────────────┘
```

**关键设计选择：**

- **流程优先，而非散文。** 技能是 Agent 遵循的工作流，不是参考文档。每项都包含步骤、检查点和退出条件。
- **防自我合理化。** 每项技能都包含一个表格，列出 Agent 用来跳过步骤的常见借口（如"我稍后再加测试"），并附有文档化的反驳理由。
- **验证不可协商。** 每项技能都以证据要求收尾 —— 通过的测试、构建输出、运行时数据。单凭"看起来是对的"永远不够。
- **渐进式披露。** `SKILL.md` 是入口。辅助参考资料仅在需要时加载，将 Token 消耗降到最低。

---

## 项目结构

```
agent-skills/
├── skills/                            # 24 项技能（23 项生命周期 + 1 项元技能）
│   ├── interview-me/                  #   定义
│   ├── idea-refine/                   #   定义
│   ├── spec-driven-development/       #   定义
│   ├── planning-and-task-breakdown/   #   规划
│   ├── incremental-implementation/    #   构建
│   ├── context-engineering/           #   构建
│   ├── source-driven-development/     #   构建
│   ├── doubt-driven-development/      #   构建
│   ├── frontend-ui-engineering/       #   构建
│   ├── test-driven-development/       #   构建
│   ├── api-and-interface-design/      #   构建
│   ├── browser-testing-with-devtools/ #   验证
│   ├── debugging-and-error-recovery/  #   验证
│   ├── code-review-and-quality/       #   审查
│   ├── code-simplification/          #   审查
│   ├── security-and-hardening/        #   审查
│   ├── performance-optimization/      #   审查
│   ├── git-workflow-and-versioning/   #   发布
│   ├── ci-cd-and-automation/          #   发布
│   ├── deprecation-and-migration/     #   发布
│   ├── documentation-and-adrs/        #   发布
│   ├── observability-and-instrumentation/ # 发布
│   ├── shipping-and-launch/           #   发布
│   └── using-agent-skills/            #   元技能：如何使用本包
├── agents/                            # 7 个专家角色
├── references/                        # 6 个辅助检查清单
├── hooks/                             # 会话生命周期钩子
├── .claude/commands/                  # 8 个斜杠命令（Claude Code）
├── .gemini/commands/                  # 8 个斜杠命令（Gemini CLI）
├── commands/                          # 8 个斜杠命令（Antigravity CLI）
├── plugin.json                        # Antigravity 插件清单
└── docs/                              # 各工具配置指南
```

---

## 为什么需要 Agent Skills？

AI 编程助手默认走最短路径 —— 这通常意味着跳过规格说明、测试、安全审查以及那些让软件变得可靠的实践。Agent Skills 为 Agent 提供结构化的工作流，强制执行资深工程师在编写生产代码时遵循的纪律。

每项技能都编码了来之不易的工程判断：**何时**写规格说明，**测什么**，**怎么**审查，以及**何时**发布。这些不是通用提示词 —— 它们是观点鲜明的、流程驱动的工作流，区分了生产级质量和原型级质量。

技能融入了来自 Google 工程文化的最佳实践 —— 包括 [Software Engineering at Google](https://abseil.io/resources/swe-book) 和 Google [工程实践指南](https://google.github.io/eng-practices/) 中的概念。你会在 API 设计中看到 Hyrum 定律，在测试中看到 Beyonce 法则和测试金字塔，在代码审查中看到变更规模规范和审查速度规范，在简化中看到 Chesterton 之栏，在 Git 工作流中看到主干开发，在 CI/CD 中看到左移理念和特性开关，以及一个将代码视为负债的专门的废弃迁移技能。这些不是抽象原则 —— 它们直接嵌入到 Agent 遵循的分步工作流中。

---

## 与其他方案对比

想知道它与 [Superpowers](https://github.com/obra/superpowers) 或 [Matt Pocock's skills](https://github.com/mattpocock/skills) 相比如何？详见 **[docs/comparison.md](docs/comparison.md)**，获取三者设计理念差异的诚实对比，以及何时该用哪个 —— 还包括一篇关于可控[头对头实验](https://www.linkedin.com/pulse/superpowers-vs-agent-skills-faster-shipping-safer-reasoning-om-mishra-dzakf/)的链接。

---

## 贡献指南

技能应当**具体**（可执行的步骤，而非模糊的建议），**可验证**（清晰的退出条件和证据要求），**经过实战检验**（基于真实工作流），以及**最小化**（仅包含引导 Agent 所需的内容）。

格式规范见 [docs/skill-anatomy.md](docs/skill-anatomy.md)，贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 许可证

MIT —— 在你的项目、团队和工具中自由使用这些技能。