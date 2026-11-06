# AgentHot：编码 Agent 竞品情报站

这个分支（`codeagent-intel`）把 AIHOT 框架改成了一个编码 Agent 竞品情报站，给做竞争力分析的同事用：持续抓取竞品的更新日志和官方博客，按“对竞品分析有没有用”打分精选，把同一件事的多篇报道归成一个事件，每天出日报，每周出周报。

## 盯哪些竞品

| 竞品 | 信源 | 方式 |
|---|---|---|
| Claude Code | GitHub Releases、Anthropic Engineering、Anthropic News、Claude Blog | RSS / 网页列表 |
| Codex | Codex Changelog（官方 RSS）、OpenAI News | RSS |
| GitHub Copilot | GitHub Changelog 的 Copilot 标签、GitHub Blog AI & ML | RSS |
| Cursor | Cursor Changelog（官方 RSS） | RSS |
| Qoder | qoder.com/changelog | 网页，`mintlify_changelog` |
| CodeBuddy | CNB 上 CodeBuddy Code 的 CHANGELOG.md | Markdown，`keep_a_changelog` |
| opencode | GitHub Releases（只收 `v*`，不收 process-daemon） | RSS |
| Pi | GitHub Releases | RSS |
| 上游模型 | Anthropic News、OpenAI News、Google DeepMind | RSS / 网页列表 |
| 分析与观点 | Simon Willison、Latent Space | RSS |

`mintlify_changelog` 和 `keep_a_changelog` 是这个分支给框架新增的两种解析方式，说明在 [信源](sources.md) 的 `parseMode` 一节。GitHub Releases 的 Atom 只有 `updated`，框架不把它当发布时间，所以这几个源配了 `detail`，从发布页的 `relative-time` 读日期。

### 还没接上的

- **Trae**：trae.ai/changelog 是前端渲染的，而且只有 TRAE APP 的日志；IDE 的更新日志在 docs.trae.ai，内容嵌在页面的私有文档格式里，每条更新没有独立链接，现有解析方式都接不上。可选的补法：接 Trae 的公众号或 X 账号（付费，见下文），或者给 docs.trae.ai 写一个专门的解析器（参考 `web-list.ts` 里的 `mimo_home`）。
- **WorkBuddy、CodeBuddy IDE、Qoder 博客**：页面都是前端渲染。配好 `JINA_API_KEY` 后，可以在后台用 `https://r.jina.ai/<地址>` 加 `web_list` 试抓。
- **国内厂商的公众号**（Qoder、腾讯云代码助手、TRAE 等）：大陆厂商的很多一手消息只发在公众号上，配 `DAJIALA_KEY` 后在后台加 `mp_account` 信源。按请求计费，有预算熔断。
- **评测榜单**（SWE-bench、Terminal-Bench）：页面结构还没调，需要时在后台加 `web_list`，信源类别选“评测榜单”。

信源上线后主要在后台“信源”页维护：新建、预览抓取、调频率、暂停。`industry/sources.json` 只在第一次启动时导入。

## 改了什么

- `industry/taxonomy.ts`：类别换成 产品 / 模型 / 评测 / 商业 / 研究 / 实践 / 观点；主题标签换成竞争力的能力维度（Agent 模式、上下文工程、MCP/工具调用、沙箱/权限、企业/私有化……）；主体按产品立（Claude Code 和 Anthropic 分开，这样产品主题页只收产品本身的动态）。日报报头的计数改成“N 次竞品更新”。
- `industry/topics.json`：每个竞品一个主题页，另有能力维度和内容类型主题。
- `industry/prompts/`：
  - 预筛只放行与编码 Agent、AI 开发工具相关的内容，模型厂商与编码无关的消息会被挡掉。
  - 评分的读者设定改成“做编码 Agent 竞争力分析的工程师和产品经理”。新能力维度、定价变化、工程博客公开架构、带数据的评测、安全事故，都按正常份量评价。纯修复版本压到最低，补齐别家早有的常规功能压低。
  - 打包多项改动的更新日志（Claude Code、CodeBuddy 这类一长串条目的）按其中最重要的一项能力评，不按平均；国内竞品和海外竞品同等重要，不因为更新日志写成条目列表而压分。
  - 主题标签最多 2 个、实体标签最多 2 个，只标主要落点和主体，让能力维度主题页保持干净。
- `industry/selection.ts`：“全部动态”的展示下限 `browseFloor` 设为 0。竞品分析要能查全：精选负责挑重点，全部动态什么都能查到。
  - 写标题时，只有版本号的更新日志要写出产品名和最重要的变化。
  - 术语上 Agent、Harness、Skills 保留英文。
- `site/site.ts`：站名 AgentHot，行业词“竞品”（页面上显示“竞品日报”“竞品动态”），MCP 工具前缀 `agenthot_`。报头字（`site/brand/nameplates/`）已重新生成。

## 在本机跑起来

需要 Docker（Docker Desktop 或 OrbStack）。在仓库根目录：

```bash
cp .env.example .env
# 编辑 .env：
#   ADMIN_PASSWORD（至少 12 位）、SESSION_SECRET、IMG_PROXY_SIGN_SECRET、POSTGRES_PASSWORD（各用 openssl rand -hex 32 生成）
#   LLM_API_KEY=<你的 DeepSeek key>；LLM_BASE_URL、LLM_MODEL 保持 DeepSeek 的默认值
docker compose up -d --build
```

本机装了 Node 24 的话，也可以用 `node scripts/init-env.ts --llm-key <key>` 自动生成 `.env`。

打开 `http://localhost:3000`，后台在 `/admin`。第一次启动会导入上面的信源，先去后台“信源”页确认都抓成功了。

### 部署到公司内网

- 模型走内网服务：把 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL` 改成内网 DeepSeek 或 GLM 网关的地址（OpenAI 兼容接口即可）。GLM 这类推理模型要设 `LLM_REASONING_TOKENS`（比如 4000），否则推理会占满输出额度、答案为空。也可以一步一个模型，比如评分用 GLM、其余用 DeepSeek，见 `.env.example` 的“每一步单独换模型”。
- 内网 npm 和镜像源：`docker compose build --build-arg NPM_REGISTRY=<内网 npm 源>`。
- 抓外网信源要走代理时设 `EGRESS_PROXY_URL`（只影响抓取，不影响模型调用）。
- `SITE_URL` 设成同事实际访问的地址。

## 下一步：校准精选门槛

门槛（`industry/selection.ts`，T1 60 / T1_5 65 / T2 76）还是 AIHOT 在 AI 行业校准出来的数，换了评分标准以后要重新校准，不要凭感觉改数字：

1. 站跑一周后，从“全部动态”里挑 100–200 条，标“该进竞品周报 / 不该进”，存成 `.data/gold.jsonl`（格式见 [精选与校准](selection.md)）。
2. 运行 `node --env-file=.env scripts/eval-selection.ts --gold .data/gold.jsonl`，看各个门槛下的查准率和查全率。
3. 在后台 SelectBench 里逐条看判错的资料，回头改 `selection-score.md` 或门槛，再跑一遍。

推送（飞书之外的渠道，比如 WeLink）还没做，以后写成 `modules/` 里的模块。
