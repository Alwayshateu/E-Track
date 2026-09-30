# E-Track

E-Track 是一个面向课堂试教和个人练习的 IELTS / CET 练习工作台。当前仓库同时保留旧的单题练习入口和新的 Practice Session 入口。新入口把材料、题组、作答、复盘和下一步练习放在同一条流程中；本轮已实现稳定 attempt、完整长文本、同条复盘更新和目标驱动二稿。实际保存以页面的成功/失败反馈为准，不能只凭界面出现判断；本机验证范围见文末。

## 先从哪里进入

启动开发服务器后打开 `http://localhost:3000`。先选择考试（目录支持 `?exam=ielts`、`?exam=cet4`、`?exam=cet6`）；不指定考试的旧入口默认按 IELTS 解释：

- `/`：产品首页和入口。
- `/login`：登录入口。Dashboard、Practice、History、Favorites、Wrong Book 等需要认证的页面会在未登录时转到这里。
- `/dashboard`：学习概览。
- `/practice/sessions`：按考试和技能浏览 Practice Session 目录。
- `/practice/session/[unitId]`：打开一个完整材料和题组。
- `/practice/history`：查看本浏览器中的历史快照；详情页使用 `/practice/history/[id]`。
- `/practice`：保留的旧版单题练习入口。
- `/settings`、`/favorites`、`/wrong-book`：设置、收藏和错题入口。

用于课堂演示时，优先使用隔离的浏览器上下文和仓库中明确标为演示用的样例，不要把真实学生账号、真实麦克风或真实个人回答放进截图和报告。

## 本地开发

使用与 CI 一致的 Node.js 20 最新补丁版（至少 20.19.0）及 npm。仓库技术栈为 Next.js App Router、React、TypeScript、Tailwind CSS、Supabase 和 Vitest。

练习保存需要可用的浏览器本机存储及 Web Locks。请在支持此能力的近期浏览器中，以 HTTPS 或本机 `localhost` / `127.0.0.1` 打开；缺少锁、存储被禁用或配额不足时，页面会明确显示未保存，不会退回不受保护的覆盖写入。当前输入留在页面内并不等于刷新后可恢复。

首次运行前，由获授权的项目管理员提供 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`（名称沿用代码；值使用项目对应的公开客户端 key）。在本机受控 `.env.local` 或部署平台配置，绝不使用 service-role key 代替。Supabase 登录方式和允许的回调 URL（本地为 `/auth/callback` 对应地址）也要在目标项目配置。本地题库不等于离线免登录应用；没有正确认证配置不能完成登录后的操作。

```bash
npm ci
npm run dev
```

常用离线检查命令：

```bash
npm run typecheck
npm run lint
npm test
```

`npm test` 默认不读取 `.env.local`，live Supabase 套件在没有显式 `RUN_LIVE_SUPABASE_TESTS=1` 和所需配置时跳过。若 shell 曾导出该开关，先关闭它；不要把带授权的 live 环境当作默认离线测试环境。构建命令是：

```bash
npm run build
npm start
```

构建所需的公开 Supabase 配置应由部署平台或本机受控环境提供。不要把 `.env.local`、服务角色密钥、真实账号数据或密钥值写进 README、截图、测试夹具或提交记录。

## 配置默认值

下面是代码默认值，不是对本机或线上实际环境值的检查。三个 `NEXT_PUBLIC_PRACTICE_*` 开关都只有值为 `on` 才开启；`NEXT_PUBLIC_*` 在客户端 bundle 构建时固化，改值后应按部署平台流程重新构建/部署。配置默认让 Session 作答和复盘留在本浏览器，但登录和账号收藏等仍依赖网络：

| 配置名 | 默认行为 | 开启后的边界 |
| --- | --- | --- |
| `PRACTICE_UNITS_SOURCE` | 未设置或 `local` 时使用本地目录 | `supabase` 时只读远程目录；读取失败不会静默回退本地样例 |
| `NEXT_PUBLIC_PRACTICE_ATTEMPT_SYNC` | 关闭，历史不后台上传 | 仅在已有登录和远程表/策略验收后允许手动同步；不等于云端恢复 |
| `NEXT_PUBLIC_PRACTICE_ANNOTATION_SYNC` | 关闭，标注留在本机 | 仅在同步授权、远端基线和冲突处理验收后启用 |
| `NEXT_PUBLIC_PRACTICE_COLLECTION_LINK` | 关闭，旧收藏/错题入口继续保留 | 审核并应用 `0003` 后，设为 `on` 才关联 Practice Question |
| `RUN_LIVE_SUPABASE_TESTS` | 未设置时跳过 live 套件 | 只可在获授权的测试项目中显式开启，默认 CI 不开启 |

Supabase 的内容表和用户数据表受 RLS 保护。只有 publishable/anon key、没有有效认证会话时，内容读取可能是空结果；这不能证明 seed 没有执行，也不能用放宽 RLS 来排查。

## 内容、音频和数据边界

- 本地目录是当前开发默认，不代表远程数据库已经部署或通过真实 RLS 验收。
- CET 样例的仓库元数据可以声明其为内部原创演示材料，但公共发布资格、作者、许可和审核日期仍要由权利负责人确认。
- Cambridge 内容的来源说明不等于授权。原始 PDF、OCR 中间文件、图像和音频不得因为被 `.gitignore` 忽略就视为可以发布。本次 GitHub 源码提交不包含本机新增的 Cambridge MP3/JPG，因此对应播放与图像展示只有在单独配置获准的媒体分发后才可用。
- 占位音轨只是分段提示音，没有英语朗读；浏览器合成语音可读出文字，但不是 IELTS 官方录音或真人录音。当前不以真人录音或 AI 自动评分作为验收证据。
- Speaking 录音是临时浏览器内存对象，不随历史快照保存；上传一个记录也不代表另一台设备可以恢复它。
- 本机 localStorage 记录没有按账号隔离。退出或切换账号不会自动替你清理旧本机数据，开启云同步前必须明确确认归属。

详细的课堂、演示、隐私和来源材料见：

- [20-30 分钟课堂活动卡](docs/teaching-activity-card.md)
- [学生使用指南](docs/student-guide.md)
- [5-8 分钟演示与验收脚本](docs/demo-and-acceptance.md)
- [数据与隐私说明](docs/data-and-privacy.md)
- [匿名试用反馈表](docs/pilot-feedback-template.md)
- [内容来源与许可清单](docs/content-provenance.md)
- [部署边界与迁移说明](docs/e-track-deployment.md)
- [内容抽取与审核 Prompt](docs/content-extraction-prompt.md)
- [历史模型设计说明](docs/ielts-practice-model.md)

### 本地 PDF 内容抽取

不要用 Claude Code 的文件读取工具直接打开 PDF。PDF 可能被作为完整的 base64 document 写入会话历史，即使读取命令带有行数限制，也可能超过 API 的单个输出上限。对已获授权的本地材料，先使用离线预处理器：

```bash
npm run extract:document-text -- --input "D:\\private\\source.pdf" --output-dir "D:\\private\\cet-extracted"
```

该命令要求绝对路径，只调用本机 `pdfinfo`/`pdftotext`，将 UTF-8 文本和小型 manifest 写入仓库外私有目录或 `/raw/`，拒绝覆盖既有输出，并且不会把 PDF、base64、全文或完整 JSON 打印到终端。然后只按页/顺序读取生成的 `.txt`、MinerU Markdown 或 `content_list.json` 小片段；每个交给模型的片段控制在约 1–2 MB 对话安全预算以内。若一次 PDF 读取已经触发 API 400，请新开会话，不要继续恢复包含超大二进制 tool result 的旧会话。详见[内容抽取与审核 Prompt](docs/content-extraction-prompt.md)。

## SQL 和部署

本次源码提交不包含本机待核对的 `0007_seed_cet_real_exam_review.sql`，不应在远程项目执行或激活该内部试用稿。`supabase/migrations/` 中的其他 SQL 是需要管理员按目标项目、迁移顺序和维护窗口审核的部署工件。不要在普通开发中运行 seed 生成或上传脚本，不要执行 reset，也不要把迁移静态检查写成远程部署成功。部署前应单独检查最终 artifact 是否包含 `public/reports/`、浏览器 profile、报告 PDF 或版权资源；`.gitignore` 只控制 Git 是否追踪，不能替代部署平台的上传排除和公开访问检查。

## CI

GitHub Actions 使用 Node 依赖缓存，按顺序运行 typecheck、lint、离线 test 和 build。live Supabase 测试默认关闭，build 使用占位的公开配置满足构造函数检查，不代表连接了真实 Supabase。CI 通过不等于课堂试用、真实登录、麦克风、RLS、迁移事务或学生学习效果已经验收。

## 验收状态

已实现稳定 attempt、完整文本、同条复盘更新，以及目标驱动的父子稿关系。2026-09-30 本机运行 `npm run typecheck` 和 `npm run build` 均通过；`npm run lint` 为 0 错误、1 条既有登录页导航警告；`npm test -- --no-file-parallelism` 为 **982 项通过、23 项 live 跳过**。构建读取了本机未提交的 `.env.local`；这些结果只证明当前工作树的本地离线检查与构建，不代表 GitHub CI、线上部署或真实账号验收。

旧记录若只有摘要，无法从当前草稿恢复历史全文。离线测试和演示夹具不代表真实登录、远程同步/RLS、部署、内容公开再分发许可或学生学习效果；仍需逐项验收，不把演示文字写成学生真实成果。
