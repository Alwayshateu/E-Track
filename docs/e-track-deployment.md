# E-Track 部署边界与验收说明

## 这份说明解决什么问题

E-Track 当前支持 IELTS、大学英语四级（`cet4`）和六级（`cet6`）的 Practice Session 目录，同时保留旧版单题流程。本文只说明如何审核部署边界和验收证据，不代表任何远程数据库已经被本轮操作部署，也不授权执行迁移、seed、上传或清理。

当前开发默认是本地目录：`PRACTICE_UNITS_SOURCE` 未设置或为 `local` 时，adapter 使用仓库中的本地样例。只有显式设为 `supabase` 时才读远程 `practice_units` / `practice_questions`；远程读取失败不能静默回退为本地样例或“零进度”。内容读取和登录都受 Supabase RLS/会话影响，publishable/anon key 没有有效认证会话时读到空集是可能的。

## 发布前先做边界检查

1. 确认目标项目、部署分支和当前 commit，保留目标数据库备份和迁移记录。`0007_seed_cet_real_exam_review.sql` 是本机未完成的内部试用稿，不属于本次提交或部署范围。
2. 检查最终部署 artifact，而不是只看 Git 状态：不得意外包含 `paper_rewriting_output/`、`public/reports/`、`playwright-report/`、`test-results/`、浏览器 profile/cache、`.env*`、服务角色密钥、原始 Cambridge PDF/OCR 中间文件或未确认可发布的音视频。使用独立的发布 staging/平台上传清单隔离这些产物，不要为发布删除工作目录中的既有 profile 或正式报告。
3. 明白 `.gitignore` 只是 Git 追踪规则，不是部署安全策略。`public/reports/` 一旦进入部署的 `public/` 树，可能被静态公开访问；部署平台还必须配置 artifact 排除、访问控制和缓存清理。本轮静态检查中，`next.config.ts` 没有配置这些产物的 `outputFileTracingExcludes`，仓库根目录未见 `.vercelignore` 或 `.dockerignore`；2026-09-30 本机 build 已通过，但未上传或审查部署包，不能声称部署包已安全隔离。而且 trace 排除也不能替代 `public/` 的单独审查。
4. 检查 `public/audio/` 和 `public/images/` 中的每项资源来源、许可和发布范围。被忽略、放在私有桶或加了登录，并不会自动产生版权授权。
5. 确认环境变量来自部署平台的受控 secret/config，不把值写入日志、截图、README 或测试。

## 数据库迁移是待部署工件

迁移顺序和目标环境必须由管理员按团队登记流程审核。本文不要求初始化本地 Supabase，也不要求本轮执行任何 SQL：

1. 新项目才考虑 `supabase/schema.sql`，它是 legacy 基础结构记录，不是可反复运行的升级脚本。
2. 按已登记的历史顺序审核 `0001_practice_sessions.sql`、`0002_seed_practice_samples.sql` 和 `0003_link_collections_to_practice.sql`。
3. 多考试功能涉及 `0004_multi_exam.sql` 和 `0005_seed_cet_samples.sql`，目标库若未完成前置迁移，不应只打开远程目录配置来掩盖缺列或 RLS 错误。`0004` 增加 `exam` 及翻译相关允许值；`0005` 包含 CET4/CET6 各 6 个单元、各 14 道题（总计 28 道），来源标识为 `e-track-original-sample`。这些是工件内容，不是对某个远程库的核对结果。
4. 本轮新增 `0006_atomic_practice_annotations.sql`，提供 `replace_practice_annotations(uuid, uuid, jsonb, jsonb)` 原子替换协议。它检查当前用户与请求预期账号、整批数据和预期远端基线，并在事务内替换；客户端不在 RPC 缺失时回退为“先删再插”。**该迁移尚未执行**。管理员须先审核 `SECURITY INVOKER`、执行授权、RLS、事务回滚和两个客户端并发冲突，再在获授权测试库验证；静态检查不能写成“已部署”。旧客户端直接写表不参与此锁和基线协议，需另行停用或升级。
5. 不运行会重生成或上传旧 seed 的脚本，不在没有用户授权时执行 `scripts/generate-practice-seed.mjs`、`scripts/apply-practice-seed.mjs`、CLI reset 或远程迁移。

已存在的 seed 文件和历史迁移属于受保护工件。除非获得单独授权，不重写旧 `0002`，不借重跑 seed 处理产品代码问题，不删除旧数据。

`0006` 对单元标注批次设定 1,000 条、文本/笔记各 20,000 字符等上限，并要求客户端标注 ID 唯一。启用前需只读核查旧数据是否符合新协议；超限、格式不合法或重复 ID 的旧备份不能通过自动覆盖来“修好”。客户端应保留本机和远端原数据并报告未完成，由管理员在另行授权、备份后制定兼容迁移。不要把安全拒绝写成原备份已经恢复。

## 环境与发布顺序

建议在隔离测试项目中按下面顺序验证：

1. 备份并核对迁移版本记录。
2. 应用经审核的 schema/migration；检查事务回滚、约束、RLS、owner policy 和只读内容读取。
3. 部署应用对应版本。
4. 默认保持 `PRACTICE_UNITS_SOURCE=local`；确认登录、目录、草稿和旧入口正常后，才在测试环境显式开启 `supabase`。
5. 远程 source 的最低验收包括：真实登录会话读取、目标考试目录隔离、UUID/`external_key` 映射、无权限/空数据/查询错误的明确反馈，以及不回退本地样例。
6. 用户数据同步开关仍默认关闭。attempt/annotation/collection 远程写入要分别验证 owner、CAS/冲突、部分失败重试和“不改变已提交答案”；一次成功的 HTTP 响应不等于跨设备历史恢复。
7. 完成 artifact、浏览器、日志和访问权限检查后，才考虑面向试教用户开放。

不需要在客户端使用 service-role key。数据库管理员凭证不能出现在浏览器、提交记录、日志或截图中。

## 本地离线检查

这些命令只检查当前工作树，不连接远程数据库：

```bash
npm run typecheck
npm run lint
npm test
```

CI 复用同一套 typecheck、lint、离线 test 和 build；live Supabase 套件只有在显式 `RUN_LIVE_SUPABASE_TESTS=1` 且提供授权环境时才运行，普通 CI 默认关闭。离线通过不等于远程事务/RLS、真实登录、浏览器麦克风或学生试用已经通过。

历史工程审查记录保留在维护者的内部证据位置，不作为公开仓库中的当前验收证明。本机最新离线检查与构建结果见项目 [README](../README.md)；这仍不替代真实 Auth/RLS、迁移、同步、部署 artifact 和正式入口验收。

## 依赖安全维护记录（2026-09-20）

- 直接依赖固定为 Next / eslint-config-next 16.3.3、Vitest 4.1.11；React / React DOM 保持 19.2.0，没有因为 RSC 编译包公告盲目升级 React 核心。
- `package.json` 的主版本限定 overrides 用于补齐审计指出的传递依赖修复，未使用 `audit fix --force`。Vite 8.1.5 和 PostCSS 8.5.23 同时用于限制非必要漂移。今后上游依赖已满足安全边界时，可在完整回归后逐项移除对应 override，不应直接删除全部约束。
- 官方 registry 完整审计与生产审计均为 0 项；只代表检查时数据库中已知的公告，不证明所有代码安全、本机依赖安装完整或生产 build 可用。旧版曾因 Windows SWC 缺失阻塞依赖审计；2026-09-30 的本机 build 已通过，但本轮未重跑官方 registry 漏洞审计，也未完成独立依赖完整性审计。历史漏洞报告不能冒充当前版本证据。
- Node 20 至少需要 20.19.0（Vite / rolldown 要求）。本次离线检查实际运行于 Node 24.11.1，Node 20 只核对了 engine 范围，真实 CI 未运行。
- 2026-09-30 本机运行当前版本的生产 build 已通过；旧版本的 Windows SWC 缺失记录仅为历史记录。仍须在 CI 与实际部署环境独立验证锁定依赖、构建和真实入口。

## 学习数据和媒体边界

- 本机 history/draft/annotation 仍受浏览器存储和账号切换边界约束；localStorage 不是账号隔离数据库。
- 录音 Blob 只在当前浏览器内存中暂存，不随 history 快照写入；离开页面、刷新或清理后不能承诺恢复。
- “上传”若存在，只表示某个明确的同步动作；不应写成“换设备即可查”或“云端已备份全部记录”，除非对应远程读取和恢复路径已验收。
- 占位音轨、浏览器 TTS 和合成 speech 只用于交互演示，不是官方录音、真人朗读或发音质量证据。
- 写作/翻译和 speaking 的自评、notes、rubric 是学习复盘输入；当前不宣称 AI 自动评分、官方 IELTS Band 或学生效果。

## 最低运行维护

- 每次试教前用独立测试上下文检查登录、三个考试目录、打开材料、保存提示和历史详情；新目标/二稿链路未验收时不用于正式作业收集。
- 负责人在[数据与隐私说明](data-and-privacy.md)填联系人、保存期限、受众、备份位置和权限。缺项时只做无个人数据的隔离演示。
- 发现目录失败、存储拒绝/损坏、quota 或同步冲突，先暂停受影响流程，保留当前输入和最小化错误信息；不要清库、重跑 seed、关闭 RLS 或让学生反复提交。
- 云端同步故障时不宣称备份成功；管理员先停用相关功能并保留待处理数据，核对客户端版本/协议和远端基线后再恢复。不能回退到旧的“先删再插”覆盖方案。
- 数据库备份恢复、应用回退和真实事务/RLS 必须在获授权测试环境演练。不要把版本回退当作迁移回滚，不直接覆盖已有历史或 profile。
- 日志只记录最小错误类别/步骤，不记录 cookie、token、密钥、全文作答、录音或个人标识。每次发布检查静态资源路径和缓存，没有真实请求证据不能说“不公开可访问”。

## 验收状态模板

发布记录应分开填写：

- **代码已有**：本地 Practice Session、目录筛选、客观题检查、主观题人工复盘和本机草稿等能由代码/离线测试证明的能力。
- **本机实现与离线验证已有**：稳定 attempt、完整长文本、同 attempt review update、goal → `parentAttemptId` 新稿 → 详情对照；实际隔离浏览器证据见工程记录，不能替代部署环境验收。
- **构建/环境待验收**：本机生产构建已通过，但 GitHub CI、真实认证、RLS/事务、远程同步、部署 artifact 和公开资源访问仍需验收。
- **明确不在本轮**：真人音频、云端录音恢复、未经验证的 AI 评分、完整模考和学生学习成效。

没有证据的作者、许可证、审核日期、学生提升或公共发布资格均保留为“待权利/产品负责人确认”。
