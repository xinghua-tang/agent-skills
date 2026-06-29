---
name: knowledge-builder
description: Use when a business domain has no knowledge base yet, or when the existing one is incomplete — extracts business concepts, dependency graphs, and an interface catalog from PRD+接口文档 (new project) or source code (existing project) and writes the result to the project root under <domain>/.
allowed-tools: read_files, write_knowledge, list_directory, get_knowledge, list_skills
---

# Knowledge Builder

## Overview

You turn scattered inputs (PRD, 接口文档, 源代码) into the structured knowledge base that downstream `test-planner` consumes: a `knowledge.md` (concepts, rules, flows, dependencies) and a `skills.json` (interface catalog). The two modes differ only in where the source material comes from; the output contract is identical.

## When to Use

- A new domain has no knowledge base but the user has PRD and 接口文档 ready.
- An existing project has source code but no knowledge base has been generated.
- The user explicitly asks to refresh / regenerate a domain's knowledge base.
- `test-planner` reports a knowledge-base gap for a domain.

Do NOT use when the knowledge base is already complete and only minor edits are needed — patch the existing files directly with `write_knowledge`.

## Output Contract (固定不变)

Both modes write **exactly two files** under the project root, inside a folder named after the domain:

```
<project-root>/
└── <domain>/
    ├── knowledge.md     # 业务语义层 — 名词 / 规则 / 流程 / 依赖
    └── skills.json      # 接口契约层 — 路径 / 方法 / 入参 / 出参
```

- `<domain>` = 业务域标识,小写蛇形(如 `fuel`、`trade`)。
- `knowledge.md` 必须含四节:`名词解释`、`业务流程`(主流程 + 异常流程)、`关键约束与注意点`、`依赖关系`。
- `skills.json` 是 `key → 接口定义` 的扁平对象,每个接口含 `method` / `path` / `required_params` / `optional_params` / `output_example`(格式参考 `mcp-servers/knowledge-base/fuel/skills.json`)。
- 落盘统一使用 `write_knowledge(domain, file_type, content)`,由它负责目录创建与索引更新。

## Mode Selection (必须先调用 AskUserQuestion)

进入具体流程前,**用 AskUserQuestion 让用户在两种模式间二选一**,不要凭默认假设推进:

```
Question: 请选择知识库生成模式
Options:
  1. 模式一 · 新项目(基于 PRD + 接口文档) — 需要同时提供 PRD 文件路径 和 接口文档路径
  2. 模式二 · 已有项目(基于代码扫描) — 需要提供代码目录路径(Controller / Router 层)
Header: 生成模式
```

若用户在选项外补充第三种(如 "两者都有"),按优先级处理:同时存在时**优先模式一**(PRD 语义更全),模式二作为补充,合并后再落盘。

## Mode 1 · 新项目(基于 PRD + 接口文档)

**前置校验**(缺一项立即停下,不要猜):
- 必须提供 PRD 文件路径。
- 必须提供接口文档路径(OpenAPI / Swagger / Postman / `.md` 接口文件 任一)。

**流程**:

1. `read_files(PRD 路径)` 读取产品文档。
2. `read_files(接口文档路径)` 读取接口契约,支持 JSON / YAML / Markdown。
3. 从 PRD 抽取四类语义信息(对应 `knowledge.md` 四节):
   - **名词解释** — 业务实体(订单、分账、收货行…)及关键字段语义。
   - **业务流程** — 主流程 + 异常流程,用编号步骤或流程图表达。
   - **关键约束** — 单位(分 vs 元)、必填差异、租户隔离键、文件大小限制等隐性规则。
   - **依赖关系** — 域内接口调用链 + 跨域依赖(订单域 → 商品域)。
4. 从接口文档抽取 `skills.json` 字段:`method` / `path` / `required_params` / `optional_params` / `output_example`。
   - 按路径前缀(如 `/visFuel/`、`/api/trade/`)识别业务域,若一个文档含多域,生成多套 `<domain>/` 目录。
5. 用 `write_knowledge(domain, "knowledge", ...)` 与 `write_knowledge(domain, "skills", ...)` 落盘。
6. 输出回执:已生成文件路径 + 域内接口数量 + 关键名词清单(便于人工核对)。

## Mode 2 · 已有项目(基于代码扫描)

**前置校验**:
- 必须提供可读的代码目录(包含 Controller / Router)。
- 框架不限(Spring Boot / Express / FastAPI / NestJS …),但必须能从中定位路由声明。

**流程**:

1. `list_directory(代码目录)` 识别框架与目录结构。
2. 定位路由入口文件:
   - Java: `*Controller.java`(搜 `@RequestMapping` / `@PostMapping`)。
   - Node: `*Router.js` / `routes/*`(搜 `router.get/post/put`)。
   - Python: `*Routes.py` / `routes/*`(搜 `@app.route` / `@router`)。
3. `read_files(关键文件)` 逐文件解析:
   - **路由** → `path` / `method`。
   - **方法参数 / DTO** → `required_params` / `optional_params`(区分 `@NotNull` / `@NotBlank` / `@AssertTrue`)。
   - **返回值 / 模型类** → `output_example`(跟 `entity/*` 或 `dto/*`)。
   - **注释** → 业务语义线索(写进 `knowledge.md` 的"关键约束")。
4. 按包名或路径前缀划分业务域;无法划分则统一归 `common`。
5. 生成 `skills.json`(必有);`knowledge.md` 只填"关键约束"和"名词解释"两节,其余两节标 `TBD - 待补充`,**明确提醒用户**:

> ⚠️ 知识库已从代码生成,但"业务流程"和"依赖关系"两节无法从代码静态推断,
> 建议补充业务描述后再进入 `test-planner`。

## Common Errors (两个模式都适用)

| 现象     | 处理 |
|----------|------|
| 模式一只给了一份文档 | 回:「需要同时提供 PRD 和接口文档,请补充另一份」,停。 |
| 接口文档格式无法解析 | 先尝试作为自然语言读取;若仍无法结构化,反问用户确认格式。 |
| 路径前缀含多域     | 每个域生成独立 `<domain>/` 目录,不要塞到 `common`。 |
| 已有 `knowledge.md` / `skills.json` | 走"追加"语义:解析后合并同名接口,以最新抽取为准,冲突时询问用户。 |
| 用户说"全部重新生成" | 先 `list_skills(domain)` 调出旧索引,再全量覆盖,完成后回显变更清单。 |

## Red Flags

- 跳过 AskUserQuestion 直接选模式 — 模式决策错了整个产物方向就错。
- 凭接口名猜业务语义 — 必须有 PRD / 注释 / 字段名三选一作为依据,否则标 TBD。
- 把多域接口塞进一个 `knowledge.md` — 破坏下游 `test-planner` 的 `get_knowledge(domain)` 单域加载。
- 不写 `output_example` — `test-executor` 调试期强依赖该字段反推参数。