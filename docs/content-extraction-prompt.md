# PracticeUnit 内容抽取与审核 Prompt

> 本文件是内容编辑和模型辅助抽取的工作指引，不是版权授权证明，也不是把未经审核的输出直接写进生产数据库的脚本。当前目标是得到可审阅的 JSON 草稿；数据库迁移、seed 和公开发布必须走独立审查。

## 0. 先确认权限，再抽取

- Cambridge IELTS PDF、图表、地图、音频和 OCR 中间文件属于受版权约束的外部材料。知道“来自 Cambridge”不等于获得复制、公开发布、训练模型或再分发授权。
- 未确认许可前，原始 PDF、图片和音频放在受控的本地/私有位置，不放进公开 `public/`、公开 CDN 或仓库。`.gitignore` 只是避免 Git 追踪，不是版权或部署安全措施。
- 只有权利负责人确认范围后，才决定是否可以在产品中显示完整文本、参考图、音频或只保留内部审阅路径。私有桶能限制访问，但不会自动取得版权。
- 仓库声明为内部原创的 CET 样例可以用于内部演示，但作者、许可、审核日期和公开发布资格仍须负责人确认，不能由抽取模型代填。
- 不把学生真实回答、个人信息、真实麦克风录音或账号数据发给抽取模型。

## 1. 当前数据契约

一个 section/passage/task 生成一个 `PracticeUnit`，题目放在 `questions` 中。以下是字段示意，含 `|` 的值表示允许枚举，不是可直接导入的实例；以 `src/lib/types.ts` 和当前 mapper 为准。新内容显式填写 `exam: ielts | cet4 | cet6`，旧未填考试的记录兼容为 IELTS：

```json
{
  "exam": "ielts|cet4|cet6",
  "id": "stable-local-id",
  "slug": "reading-source-topic",
  "skill": "foundation|reading|listening|writing|speaking|translation",
  "mode": "basic|progressive|challenge",
  "title": "人类可读标题",
  "description": null,
  "difficulty": "easy|medium|hard",
  "material_type": "none|passage|audio|writing_prompt|translation_prompt|speaking_prompt|foundation_note",
  "passage_text": null,
  "audio_url": null,
  "transcript": null,
  "asset_url": null,
  "time_limit_seconds": null,
  "metadata": {},
  "questions": []
}
```

每道题：

```json
{
  "id": "stable-question-id",
  "unit_id": "stable-local-id",
  "question_number": 1,
  "question_type": "multiple_choice|true_false_not_given|sentence_completion|short_answer|writing_task|speaking_response",
  "question_text": "非空题干",
  "options": null,
  "answer_key": {
    "answers": [],
    "caseSensitive": false,
    "acceptedAlternatives": []
  },
  "explanation": null,
  "metadata": {}
}
```

`PracticeUnit` 必须有 `questions`，且 `question_number` 在本 unit 内从 1 连续递增。`unit_id` 必须等于 unit 的 `id`，所有 id 在本批内容内唯一。不要为了满足格式虚构题干、答案、出处、作者、许可或审核日期。缺少信息时仅输出待审核草稿，在 `metadata.needsReview` 中列明缺口；缺必要答案的客观题不是合格可导入内容，不能把空答案当作通过。

### 既有 Cambridge ID 约定

此约定仅用于维护既有内容关联，不授权抽取新书或发布版权资源：unit 沿用 `{book}-test{n}-{skill}[-p{k}]`，question 沿用 `{book}-t{n}-{seg}-q{k}`（阅读 `p1/p2/p3`，听力 `l1/l2/l3/l4`，写作 `writing`，口语 `speaking`）。question ID 的 `q{k}` 使用原卷连续题号，`question_number` 使用 unit 内序号；原卷题号/题型放 `metadata.ieltsNumber` / `metadata.ieltsType`。不要改已有 ID 来“统一格式”。新 ID、slug 和数据库 UUID/`external_key` 映射由维护者审核，不由模型猜造。

### 题型和答案

| 原始题型 | 当前类型 | 规则 |
| --- | --- | --- |
| Multiple choice、matching、heading、map/plan labeling | `multiple_choice` | `options` 是完整候选文本；`answers` 必须是候选文本，不是字母 |
| True/False/Not Given、Yes/No/Not Given | `true_false_not_given` | `options` 为 `True`、`False`、`Not Given`，答案使用完整词 |
| sentence/summary/note/table/form completion | `sentence_completion` | `options: null`，答案至少一项；合理拼写变体放 `acceptedAlternatives` |
| short answer | `short_answer` | `options: null`，答案至少一项 |
| writing task / CET 汉译英 | `writing_task` | `options: null`，`answers: []`；翻译用 `skill: translation`、`material_type: translation_prompt` 和 `metadata.cetTask: translation` |
| speaking cue/response | `speaking_response` | `options: null`，`answers: []`，只提供人工复盘提示 |

选择题的 `options` 至少两项且互不相同，每个答案都必须能在选项中找到。主观题不填“标准答案”来伪造自动评分；参考范文如获授权可以放在受控 metadata，但不能声称是唯一答案或官方评分。

## 2. 抽取流程

### 2.0 PDF 的安全预处理边界

不要使用 Claude Code 的文件读取工具直接打开 PDF、音频、压缩包或其他二进制文件；即使指定很小的行数限制，PDF 也可能作为完整 document/base64 返回并写入会话历史。一次错误的二进制读取可能超过 API 的单个 tool output 上限；仓库代码无法修复已经损坏的外部会话，因此应新开会话并只带入纯文本片段。

对已获内部处理许可的本地 PDF，先在本机运行离线预处理器：

```bash
npm run extract:document-text -- --input "D:\\private\\source.pdf" --output-dir "D:\\private\\cet-extracted"
```

输出目录必须是仓库外的私有目录，或被忽略的 `/raw/` 子目录。脚本只调用本机 `pdfinfo`/`pdftotext`，不会联网、上传、打印 PDF、base64、全文或完整 manifest；终端只显示文本字符数、manifest 路径和审核提醒。若本机没有 Poppler，请先安装并确认 `pdfinfo` 与 `pdftotext` 可执行，不要改用把 PDF 编码后传入对话的办法。

提取成功后，只读取 `.txt`、MinerU Markdown 或 `content_list.json` 的有页码/顺序的小段。每个送入模型的片段建议控制在 1–2 MB 对话安全预算以内，并保留页码边界；完整 draft 写入私有/忽略目录，不把全文打印到终端。脚本生成的 manifest 只用于追踪路径、hash、大小和审核状态，不代表 OCR 正确或取得版权许可。

随后按以下步骤继续：

1. 只处理已获内部使用授权的 passage/section，记录来源标识、页码和权限状态，不把机密值写进公开输出。
2. 让 OCR 工具输出 markdown、`content_list.json` 和图片文件名；用页码、题号和版面相邻关系建立图与题的映射，不凭文件名猜测。
3. 先输出 JSON 草稿和 `needsReview` 清单，再由人工逐题核对题号、换行、选项、答案和图片归属。模型不能证明 OCR 正确，也不能证明版权许可。
4. 完整材料保留段落和换行。学生历史的旧 400 字符摘要策略不是材料抽取规则；本轮历史回答的保存上限也不能套到题库全文。若输入超过模型/OCR 容量，按有页码和顺序的片段处理并人工合并核对，不静默截断或生成缺失原文。
5. 图片映射沿用当前契约：整份任务的图用 `unit.asset_url`，某题的图用 `question.metadata.assetUrl`；无图时 unit 填 `null`、question 省略 `assetUrl`（不填空字符串）。未确认许可或私有路径解析未实现时，URL 保持 `null`/省略，并在 `metadata.needsReview` 标注 `asset-rights`/`asset-resolver`，受控对象路径只作为内部审核引用。不要让私有对象名假装是可直接渲染的 `/images/...` 或 `/audio/...` URL。
6. 审核通过后才由维护者决定是否创建新的、可追踪的内容迁移。不要重写、重生成或直接手改历史 `supabase/migrations/0002_seed_practice_samples.sql`，不要运行旧 seed 上传脚本。
7. 内容更新应产生新的版本/迁移，保留来源和审核记录；不得把审阅草稿当成已经部署或已经公开的内容。

## 3. 资源与媒体声明

- 版权图表/地图/音频默认按私有受控资源处理。私有 bucket + signed URL 是访问控制方案，不是许可来源；signed URL 也不等于允许下载、模型训练或再分发。
- 浏览器 TTS 与占位音轨必须区分：当前 CET 合成听力使用 `audio_url: null`、`metadata.syntheticSpeech: true`；现有占位提示音使用 `metadata.audioStatus: placeholder-tone`，没有英语朗读。不要给占位音轨套 TTS 标记。两者都不是官方录音或真人录音。
- 私有对象路径目前不能假装是浏览器可用的 URL：当前尚无已验收的 signed URL 解析链路。记录为内部审核引用；生产 URL 保持 `null`，直到解析、安全和许可都验证。
- 临时麦克风录音是学生浏览器内存对象，不是内容抽取资源，不随 history 自动上传；不得拿它作为真实音频素材。
- 不在本 prompt 中设计 AI 自动评分。写作、翻译、口语可提供人工 rubric、自评和复盘提示，但不生成官方 Band、学生效果或能力诊断。

## 4. 内容审核清单

- [ ] 来源、页码/section、处理日期和权限负责人有内部记录。
- [ ] 原文与 OCR 逐段核对，题号连续，unit/question id 稳定且唯一。
- [ ] 每道选择题答案是完整选项文本；填空/简答答案非空；主观题答案为空。
- [ ] 完整材料和换行无静默截断；缺失内容没有靠模型生成补齐。
- [ ] 图、音频和 transcript 与题号对应；未获许可的资源没有公开 URL。
- [ ] `metadata` 不虚构作者、许可证、审核日期、官方身份或学生效果。
- [ ] 人工审核者确认后才进入版本控制/迁移流程；没有直接重写 `0002`。
- [ ] 通过内容完整性测试后，仍把数据库、RLS、部署 artifact 和真实浏览器验收单独记录。

## 5. 维护者的离线内容检查

内容经过授权并进入对应 fixture 后，可运行定向检查（本文不表示它们已执行）：

```bash
npx vitest run src/lib/__tests__/practice-session-samples.test.ts src/lib/__tests__/practice-session-content-integrity.test.ts
npx vitest run src/lib/__tests__/cet-practice-samples.test.ts src/lib/__tests__/cet-seed-sync.test.ts
```

这些测试只检查被导入的仓库样例，不会自动读取刚生成的任意 JSON，也不能验证版权、答案事实或 PostgreSQL 执行。需要更新内容时新建经审核的增量迁移；不要为让 seed 一致性测试变绿而重写已发布的 `0002` 或其他旧迁移。

## 6. 可复制的模型 Prompt

```text
你是内容结构化助手。我会提供一段已获内部处理许可的材料和题目 OCR。只输出一个 PracticeUnit JSON 草稿，将待审核事项放在 metadata.needsReview；不输出 SQL，不生成迁移，不声称已部署，不声称拥有版权。

严格使用：
- skill: foundation|reading|listening|writing|speaking|translation
- mode: basic|progressive|challenge
- difficulty: easy|medium|hard
- material_type: none|passage|audio|writing_prompt|translation_prompt|speaking_prompt|foundation_note
- question_type: multiple_choice|true_false_not_given|sentence_completion|short_answer|writing_task|speaking_response

PracticeUnit 必须含 exam（ielts|cet4|cet6）、id、slug、skill、mode、title、description|null、difficulty、material_type、passage_text|null、audio_url|null、transcript|null、asset_url|null、time_limit_seconds|null、metadata、questions。每题必须含 id、unit_id（等于 unit.id）、question_number（本 unit 从 1 连续）、question_type、question_text、options、answer_key、explanation|null、metadata。

题型规则：选择题 options 至少两个且互不相同，answer_key.answers 必须是完整候选文本；判断题 options 固定为 ["True","False","Not Given"]；填空/简答 options 必须为 null 且 answers 至少一项；写作/口语 options 为 null 且 answers 为 []。不要把字母代号当答案。不要杜撰未知答案、作者、许可、日期、官方分数、学生效果或唯一范文。

完整材料保留换行，不静默截断；超过处理容量时在 metadata.needsReview 标明缺口，等待分段处理，不能生成缺失原文。图片/音频未确认许可和可用解析链路时，URL 填 null，受控路径只作内部审核引用。TTS 与 placeholder-tone 分开标明：后者没有英语朗读，前者不是真人或官方录音。不要设计 AI 自动评分。缺少客观题答案时不猜答案，输出待审核草稿，不能称为可导入数据。CET 汉译英使用 translation / translation_prompt / writing_task，并填 metadata.cetTask=translation。

最后自检：id 唯一、question_number 连续、unit_id 一致、选择题答案可在 options 找到、主观题无自动答案、资源不是空字符串，并列出所有需要人工核对的页码、OCR、答案、许可和部署事项。
```
