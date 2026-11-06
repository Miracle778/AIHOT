// 这个行业的分类体系：类别、标签词表、公司（主体）名录，以及防止张冠李戴的身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 换行业时：类别的 key 会出现在网址里（/all?category=…），上线后就不要再改；标签和名录可以随时增减。

/**
 * 网页上的类别（筛选栏、卡片角标、RSS 分类订阅）。key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题（几个类别可以共用一节，按这里的顺序排）；guide 告诉结构抽取模型这一类收什么、
 * 和相邻类别的边界在哪（总的归类原则写在 prompts/structure.md 里）。
 * commentary 标出评论类（教程、观点）：日报写过的事又有评论类的后续报道，只占一行快讯（报道它的信源够多时除外）。
 * 没归上类的资料在日报里放进第一个 key 为 industry 的类别所在的节（没有就放最后一节）。
 * tagColor 是飞书推送卡片里跟在标题后面的这一类小标签的颜色（飞书 text_tag 的颜色名）。
 * feedLabel 是分类 RSS 标题里的名字（不写就用 label）。公开接口、RSS 和 MCP 里要把一类并进另一类发布，写在站点设置里（site/site.ts 的 PUBLIC_CATEGORIES）。
 */
export const CATEGORIES = [
  { key: "products", tagColor: "turquoise", label: "产品", feedLabel: "竞品更新", section: "竞品发布/更新", guide: "编码 Agent 与 AI 编程工具（IDE、插件、CLI、云端 Agent、SDK）的版本发布、新功能、能力变化和下线。纯修复的小版本也归这一类，由评分压低；模型厂商发布的编码工具仍是产品，不能因为厂商名归成模型。" },
  { key: "models", tagColor: "indigo", label: "模型", feedLabel: "模型", section: "模型发布/更新", guide: "会影响编码 Agent 能力的模型本身：新模型、新版本、权重开放、上下文长度、价格和可用性变化。产品里新接入了一个模型归产品，不归这里。" },
  { key: "eval", tagColor: "wathet", label: "评测", feedLabel: "评测与基准", section: "评测与研究", guide: "编码能力的评测与对比：SWE-bench、Terminal-Bench 等基准的新成绩与新版本，第三方横评，厂商公布的内部评测数据。以提出新方法为核心的论文归研究。" },
  { key: "industry", tagColor: "orange", label: "商业", feedLabel: "商业与市场", section: "商业与市场", guide: "定价与套餐调整、免费额度变化、企业版与私有化方案、融资并购、合作与渠道、人事、政策合规，以及真实的安全事故与事后复盘。只是新增功能归产品，即使功能面向企业。" },
  { key: "paper", tagColor: "violet", label: "研究", section: "评测与研究", guide: "以新方法、实验设计与发现为核心的论文和技术报告，重点是 Agent 架构、上下文工程、工具使用、代码生成与修复、评测方法、Agent 安全。" },
  { key: "tip", tagColor: "green", label: "实践", section: "实践与观点", guide: "工程实践与技术解读：厂商工程博客讲自家 Agent 怎么做（架构、Harness、上下文、沙箱、评测体系）、最佳实践、迁移与使用方法、真实落地复盘。单纯宣布新功能归产品。", commentary: true },
  { key: "opinion", tagColor: "purple", label: "观点", section: "实践与观点", guide: "作者对编码 Agent 格局、产品路线、技术方向的判断、预测、评论或访谈。讨论市场不自动归商业，作者是名人不自动归观点。", commentary: true },
] as const satisfies ReadonlyArray<{ key: string; tagColor: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

/**
 * 这个行业最受关注的一类发布（AI 行业是新模型）：日报报头的“N 个新模型”、改分类后修订已出的报告都按它数。
 * category 是类别，tag 是标签，两者都对上才算；unit 接在数字后面。
 * 没有这样一类的行业设成 null，报头就不显示这个数。
 */
export const RELEASE: { category: string; tag: string; unit: string } | null = { category: "products", tag: "产品更新", unit: "次竞品更新" };

/** 周报月报的总述可以直接写、不必在报道里找到出处的行业通用词（小写）。站名会自动算进去。 */
export const PLAIN_TERMS: readonly string[] = ["ai", "api", "llm", "agent", "ide", "cli", "sdk", "mcp", "ceo"];

/**
 * 内容理解一步给每篇资料判的“内容类型”（写在 prompts/content-understanding.md 里，改了类型要同步改那份提示词）。
 * 评分提示词（prompts/selection-score.md）按类型给五个维度不同的权重。
 */
export const ITEM_TYPES = ["model_release", "product_launch", "tool_or_prompt", "research_paper", "industry_event", "opinion_analysis", "tutorial_explainer"] as const;

// ── 标签词表 ────────────────────────────────────────────────────────────────────────────

/** 每篇资料的第一个标签必须是这些“分类标签”之一。 */
export const CATEGORY_TAGS = [
  "产品更新", "模型发布", "定价/套餐", "评测/基准", "论文/研究", "开源/仓库", "教程/实践", "行业动态", "安全事故", "大佬观点", "政策/监管", "其他",
] as const;

/** 可选的主题标签：竞争力的能力维度。 */
export const TOPIC_TAGS = [
  "Agent 模式", "多 Agent/子 Agent", "上下文工程", "代码库理解", "代码补全", "代码审查", "MCP/工具调用", "Skills/插件", "终端/CLI", "IDE 集成",
  "云端/后台 Agent", "沙箱/权限", "企业/私有化", "模型接入", "成本/用量", "多模态", "远程/移动端", "办公场景",
] as const;

/** 可选的实体标签（产品、公司、平台）。 */
export const ENTITY_TAGS = [
  "Claude Code", "Codex", "GitHub Copilot", "Cursor", "Qoder", "CodeBuddy", "WorkBuddy", "Trae", "opencode", "Pi",
  "Anthropic", "OpenAI", "Google", "DeepSeek", "智谱", "Qwen",
] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  "教程/玩法": "教程/实践", "技巧/最佳实践": "教程/实践", "工程实践": "教程/实践", "合作/生态": "行业动态", "融资/收购": "行业动态", "公司动态": "行业动态",
  合作: "行业动态", 生态: "行业动态", 融资: "行业动态", 收购: "行业动态", 投资: "行业动态", 并购: "行业动态", 人事: "行业动态",
  定价: "定价/套餐", 价格: "定价/套餐", 套餐: "定价/套餐", 订阅: "定价/套餐", 降价: "定价/套餐", 涨价: "定价/套餐",
  政策: "政策/监管", 监管: "政策/监管", 法规: "政策/监管", 合规: "政策/监管",
  安全: "安全事故", 事故: "安全事故", 漏洞: "安全事故", 复盘: "安全事故", 提示词注入: "安全事故",
  论文: "论文/研究", 研究: "论文/研究", paper: "论文/研究", papers: "论文/研究",
  "open-source": "开源/仓库", 开源: "开源/仓库", 仓库: "开源/仓库", repo: "开源/仓库",
  教程: "教程/实践", 玩法: "教程/实践", 指南: "教程/实践", 技巧: "教程/实践", 最佳实践: "教程/实践", 实践: "教程/实践",
  评测: "评测/基准", 基准: "评测/基准", 榜单: "评测/基准", benchmark: "评测/基准",
  产品: "产品更新", 更新: "产品更新", 版本: "产品更新", 版本更新: "产品更新", 新功能: "产品更新", 发布: "产品更新",
  模型: "模型发布", 观点: "大佬观点", 趋势: "大佬观点",
  Copilot: "GitHub Copilot", "Claude Code CLI": "Claude Code", "Codex CLI": "Codex", "OpenCode": "opencode", TRAE: "Trae",
};

// ── 产品、公司与主体 ────────────────────────────────────────────────────────────────────

/**
 * 公司主题：id → 显示名、卡片上显示的标签（null 表示只用 entity:<id> 归类）、别名。
 * aliases 给结构抽取模型看；orgNames 是这家公司发消息时开头用的组织名（公司、实验室、团队），
 * 在它自己的主题页上读者知道说的是谁，可以省去；otherNames 是公司的其他称呼（官方账号名、子品牌）。
 * 所有这些名字都用来认出说的是哪家公司，比如把事实的主体对到发布方。
 * 竞品按产品立主体（Claude Code 和 Anthropic 分开），这样产品主题页只收产品本身的动态。
 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; orgNames?: string[]; otherNames?: string[] }> = {
  "claude-code": { name: "Claude Code", displayTag: "Claude Code", aliases: ["Claude Code"], orgNames: ["Claude Code"] },
  codex: { name: "Codex", displayTag: "Codex", aliases: ["Codex", "Codex CLI", "Codex app"], orgNames: ["Codex"], otherNames: ["OpenAI Codex"] },
  copilot: { name: "GitHub Copilot", displayTag: "GitHub Copilot", aliases: ["GitHub Copilot", "Copilot", "Copilot coding agent"], orgNames: ["GitHub"], otherNames: ["Copilot CLI"] },
  cursor: { name: "Cursor", displayTag: "Cursor", aliases: ["Cursor", "Anysphere"], orgNames: ["Cursor"] },
  qoder: { name: "Qoder", displayTag: "Qoder", aliases: ["Qoder", "Qoder CLI", "QoderWork"], orgNames: ["Qoder"], otherNames: ["阿里 Qoder"] },
  codebuddy: { name: "CodeBuddy / WorkBuddy", displayTag: "CodeBuddy", aliases: ["CodeBuddy", "CodeBuddy Code", "WorkBuddy", "腾讯云代码助手"], orgNames: ["CodeBuddy", "腾讯云"], otherNames: ["Tencent WorkBuddy"] },
  trae: { name: "Trae", displayTag: "Trae", aliases: ["Trae", "TRAE", "Trae SOLO"], orgNames: ["TRAE"] },
  opencode: { name: "opencode", displayTag: "opencode", aliases: ["opencode", "OpenCode"], orgNames: ["opencode"] },
  pi: { name: "Pi", displayTag: "Pi", aliases: ["Pi coding agent", "pi-mono"], orgNames: ["Earendil"] },
  anthropic: { name: "Anthropic", displayTag: "Anthropic", aliases: ["Anthropic", "Claude"], orgNames: ["Anthropic"] },
  openai: { name: "OpenAI", displayTag: "OpenAI", aliases: ["OpenAI", "ChatGPT", "GPT"], orgNames: ["OpenAI"], otherNames: ["OpenAI Developers"] },
  google: { name: "Google", displayTag: "Google", aliases: ["Google", "DeepMind", "Gemini", "谷歌"], orgNames: ["Google DeepMind", "Google", "DeepMind", "谷歌"], otherNames: ["Gemini CLI", "Jules"] },
  deepseek: { name: "DeepSeek", displayTag: "DeepSeek", aliases: ["DeepSeek", "深度求索"], orgNames: ["DeepSeek", "深度求索"] },
  zhipu: { name: "智谱 GLM", displayTag: "智谱", aliases: ["智谱", "GLM", "Z.ai"], orgNames: ["智谱AI", "智谱", "Zhipu AI", "Z.ai"] },
  qwen: { name: "千问 Qwen", displayTag: "Qwen", aliases: ["Qwen", "通义"], orgNames: ["通义实验室", "Qwen Team", "Qwen"], otherNames: ["Qwen Code"] },
  microsoft: { name: "Microsoft", displayTag: null, aliases: ["Microsoft", "微软"], orgNames: ["Microsoft", "微软"] },
  windsurf: { name: "Windsurf", displayTag: null, aliases: ["Windsurf"], orgNames: ["Windsurf"] },
  kiro: { name: "Kiro", displayTag: null, aliases: ["Kiro"], orgNames: ["Kiro"] },
};

/**
 * 身份词典：摘要和标题里出现的公司，必须在原文里也出现过，否则退回原标题、丢掉摘要（防止模型张冠李戴）。
 * 行业没有这个问题时可以留空数组。
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "claude-code", name: "Claude Code", patterns: [/claude\s?code/i] },
  { id: "codex", name: "Codex", patterns: [/\bcodex\b/i] },
  { id: "copilot", name: "GitHub Copilot", patterns: [/copilot/i] },
  { id: "cursor", name: "Cursor", patterns: [/\bCursor\b/] },
  { id: "qoder", name: "Qoder", patterns: [/qoder/i] },
  { id: "codebuddy", name: "CodeBuddy / WorkBuddy", patterns: [/codebuddy|workbuddy|腾讯云代码助手/i] },
  { id: "trae", name: "Trae", patterns: [/\btrae\b/i] },
  { id: "opencode", name: "opencode", patterns: [/\bopen\s?code\b/i] },
  { id: "pi", name: "Pi", patterns: [/\bpi-mono\b|earendil|\bpi\s+(?:coding\s+)?agent\b/i] },
  { id: "anthropic", name: "Anthropic", patterns: [/anthropic|\bclaude\b/i, /\b(?:opus|sonnet|haiku)\s*\d+(?:[.\-]\d+)*\b/i] },
  { id: "openai", name: "OpenAI", patterns: [/openai|chatgpt|\bgpt-?[o\d]/i] },
  { id: "google", name: "Google / Gemini", patterns: [/google|deepmind|\bgemini\b|\bjules\b/i] },
  { id: "deepseek", name: "DeepSeek", patterns: [/deepseek|深度求索/i] },
  { id: "zhipu", name: "智谱 GLM", patterns: [/智谱|\bglm-?[4-9]|\bz\.ai\b/i] },
  { id: "qwen", name: "千问 Qwen", patterns: [/\bqwen|通义|千问/i] },
  { id: "microsoft", name: "Microsoft", patterns: [/microsoft|微软/i] },
  { id: "windsurf", name: "Windsurf", patterns: [/windsurf/i] },
  { id: "kiro", name: "Kiro", patterns: [/\bkiro\b/i] },
];

/** 这些域名上的文章，发布方就是对应的主体（原文不必再写出它的名字）。 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "openai", domains: ["openai.com"] },
  { entityId: "anthropic", domains: ["anthropic.com", "claude.com"] },
  { entityId: "google", domains: ["deepmind.google", "ai.google", "blog.google"] },
  { entityId: "deepseek", domains: ["deepseek.com"] },
  { entityId: "cursor", domains: ["cursor.com"] },
  { entityId: "qoder", domains: ["qoder.com", "qoder.cn"] },
  { entityId: "codebuddy", domains: ["codebuddy.ai", "codebuddy.cn", "workbuddy.ai"] },
  { entityId: "trae", domains: ["trae.ai", "trae.cn"] },
  { entityId: "zhipu", domains: ["bigmodel.cn", "z.ai"] },
];

/** 原文里的这些写法也算提到了对应主体。 */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [];
