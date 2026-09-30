# IELTS Practice Model：历史设计与当前边界

> 本文保留早期 Practice Session 的设计背景，便于理解表、路由和兼容层的来历。它不是当前验收清单，也不是“已应用”“已完成”或“已授权”的证明。当前实现和本轮验收状态以代码、测试、部署记录和 [部署说明](e-track-deployment.md) 为准。

## 为什么保留两套入口

项目原先以 legacy `ielts_questions` 单题模型为主，后来加入 `practice_units` / `practice_questions` 以表达 Reading passage、Listening section、Writing task 和 Speaking prompt。旧入口、旧表、旧收藏/错题和旧存储键仍需要兼容，不能因为新 Session 页面存在就假设旧闭环已迁移。

Practice Unit 的概念仍然有用：一份材料和其题组/任务构成一次练习上下文。新入口的 adapter 负责把本地或显式远程目录映射成 UI-facing unit；远程读取失败不应静默使用本地样例。

## 当前模型的真实限制

以下结论属于模型背景，不是对当前产品的过度承诺：

- 旧记录可能只有摘要，不能从后来编辑的草稿伪造历史全文。
- 浏览器 localStorage 不是账号隔离数据库；退出或切换账号不自动清除本机历史。
- 口语录音可能只是当前页面内存中的 Blob，不随历史快照保存，也没有云端恢复承诺。
- 合成 speech/占位音轨不是官方录音、真人英语朗读或学习效果证据。
- Writing、Translation 和 Speaking 可以提供人工 rubric、自评和 notes，但本项目不把它们写成官方 IELTS Band，也不在本轮验收未经验证的 AI 自动评分。
- Cambridge 来源标签不等于复制、公开展示、下载、模型训练或再分发许可；CET 内部原创声明也不能代替权利负责人确认。

## 目标数据边界

本轮产品目标是把一次练习从“页面上的输入”变成可回看的、可继续复盘的记录：

1. 非空作答首次检查时冻结稳定的 `attemptId`、答案、结果、耗时和提交时间。
2. 新记录保存完整回答与换行，不继续使用旧的 400 字符摘要策略；超限必须明确失败，不能静默截断。
3. 提交后的自评、notes、错因、标记和目标更新同一次 attempt 的复盘字段，不增加虚假的练习次数，也不改原始答案/耗时。
4. 用户写下一个“下次只改这一点”的目标后，明确开始新的练习/下一稿，复制规则按 skill 说明执行，并保存 `parentAttemptId` 和目标副本。
5. 详情页展示真实的父子关联、完整回答（若该记录确实保存了全文）和两次对照；父稿被移出保留窗口或缺失时显示真实提示，不按相邻时间猜测。

这些是验收目标，不是仅凭组件存在即可宣称通过的功能。需要相应的纯函数测试、hook/存储测试和隔离浏览器操作证据；真实 Supabase 事务、RLS、麦克风和部署 artifact 另行验收。

## Skill 设计背景

下面是概念概要；更早的枚举、SQL 草图和路线图保留在 Git 历史中，不在本文复制成可执行指令。

- Reading：一篇 passage 对应有序题组。
- Listening：section、audio/transcript 和题组；当前音频来源和授权必须逐项确认。
- Writing：task prompt、可选图表、字数目标和人工 rubric；参考文本不是唯一答案。
- Speaking：cue card、准备/回答时间和人工自评；录音只是明确标注的临时本地能力。
- Foundation：基础材料和短题组，不应被误称为真实 IELTS 试卷。

`basic`、`progressive`、`challenge` 是训练模式，不是 `easy`、`medium`、`hard` 的同义词。CET 使用自己的考试标识和内部样例，不换算成 IELTS Band 或官方 710 分。

## 数据与迁移的历史背景

仓库中的 schema/migration 记录了 `practice_units`、`practice_questions`、`practice_attempts`、`practice_answers` 和 `practice_annotations` 等目标结构，以及 legacy 表之间的兼容关系。其存在不等于当前部署环境已执行、事务已验证、RLS 已确认或数据已经恢复。

- 历史迁移按团队登记流程审核和应用，不在普通开发中 reset、重跑 baseline 或上传 seed。
- 旧 seed 和版权内容是受保护工件，未经授权不重写 `0002`，不以生成脚本覆盖现状。
- 新内容应有独立版本、来源和权利记录；抽取草稿不能直接成为公开内容。
- `.gitignore` 只能减少误提交，不能限制 Next/Vercel artifact、静态 `public/` 访问或私有桶的权利范围。

## 当前可以怎样理解“已完成”

代码中可能已有本地目录、题组作答、客观题检查、主观人工复盘、标记、错因和历史视图。这些可以由对应离线测试或手动隔离验证支持。

“稳定 attempt + 完整文本 + 同条复盘更新 + 一个目标驱动的父子二稿对照”是本轮正在做、需要收尾校准和验收的目标。教学演示可以展示夹具流程，但不得称为真实学生成果。没有实际证据的云同步、跨设备恢复、真人音频、AI 评分、学生提升、作者/许可/审核日期和公共发布资格都应写成待确认。
