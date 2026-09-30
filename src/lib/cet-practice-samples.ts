import type { ExamType, PracticeQuestion, PracticeUnit } from './types';

type CetExam = Exclude<ExamType, 'ielts'>;
type CetTask = 'banked_cloze' | 'paragraph_matching' | 'reading_choice' | 'listening_choice' | 'essay' | 'translation';
type Choice = { prompt: string; options: string[]; answer: string; explanation: string };
type Sample = {
  exam: CetExam;
  number: number;
  slug: string;
  title: string;
  task: CetTask;
  text: string;
  instructions: string;
  minutes: number;
  choices?: Choice[];
  referenceAnswer?: string;
  reviewChecklist?: string[];
  wordRange?: [number, number];
};

// Stable UUID-shaped identifiers shared by local fixtures and future database seeds.
function sampleId(exam: CetExam, unitNumber: number, questionNumber = 0) {
  const examNumber = exam === 'cet4' ? '04' : '06';
  return `ec${examNumber}0000-0000-4000-8000-${String(unitNumber * 100 + questionNumber).padStart(12, '0')}`;
}

function createUnit(sample: Sample): PracticeUnit {
  const id = sampleId(sample.exam, sample.number);
  const subjective = sample.task === 'essay' || sample.task === 'translation';
  const listening = sample.task === 'listening_choice';
  const skill = sample.task === 'translation' ? 'translation' : sample.task === 'essay' ? 'writing' : listening ? 'listening' : 'reading';
  const questions: PracticeQuestion[] = subjective
    ? [{
        id: sampleId(sample.exam, sample.number, 1),
        unit_id: id,
        question_number: 1,
        question_type: 'writing_task',
        question_text: sample.instructions,
        options: null,
        answer_key: { answers: [] },
        explanation: '参考内容仅用于对照与自我复盘，不是唯一正确答案，也不提供官方分数。',
        metadata: {
          cetTask: sample.task,
          referenceAnswer: sample.referenceAnswer ?? '',
          reviewChecklist: sample.reviewChecklist ?? [],
          ...(sample.wordRange ? { wordRange: sample.wordRange } : {}),
        },
      }]
    : (sample.choices ?? []).map((choice, index) => ({
        id: sampleId(sample.exam, sample.number, index + 1),
        unit_id: id,
        question_number: index + 1,
        question_type: 'multiple_choice',
        question_text: choice.prompt,
        options: choice.options,
        answer_key: { answers: [choice.answer] },
        explanation: choice.explanation,
        metadata: {
          cetTask: sample.task,
          groupId: sample.slug,
          allowOptionReuse: sample.task === 'paragraph_matching',
        },
      }));

  return {
    id,
    exam: sample.exam,
    slug: `${sample.exam}-${sample.slug}`,
    skill,
    mode: 'progressive',
    title: sample.title,
    description: `原创专项样例，非官方真题或完整试卷。${sample.instructions}`,
    difficulty: sample.exam === 'cet4' ? 'medium' : 'hard',
    material_type: sample.task === 'translation' ? 'translation_prompt' : sample.task === 'essay' ? 'writing_prompt' : listening ? 'audio' : 'passage',
    passage_text: listening ? null : sample.text,
    audio_url: null,
    transcript: listening ? sample.text : null,
    asset_url: null,
    time_limit_seconds: sample.minutes * 60,
    metadata: {
      source: 'e-track-original-sample',
      cetTask: sample.task,
      instructions: sample.instructions,
      prompt: sample.text,
      ...(listening ? { syntheticSpeech: true, audioStatus: 'synthetic-speech', speechLanguage: 'en-US' } : {}),
      ...(sample.wordRange ? { wordRange: sample.wordRange } : {}),
      ...(sample.task === 'banked_cloze' || sample.task === 'paragraph_matching'
        ? { allowOptionReuse: sample.task === 'paragraph_matching', options: sample.choices?.[0]?.options ?? [] }
        : {}),
    },
    questions,
  };
}

const CET4_BANK = ['A. reduce', 'B. available', 'C. confidence', 'D. expensive', 'E. disappear', 'F. silently'];
const CET6_BANK = ['A. provisional', 'B. obscure', 'C. incentives', 'D. inevitable', 'E. identical', 'F. reluctantly'];
const PARAGRAPHS = ['A', 'B', 'C', 'D'];

const samples: Sample[] = [
  {
    exam: 'cet4', number: 1, slug: 'reading-campus-repair', title: '四级 · 选词填空：校园修理角', task: 'banked_cloze', minutes: 5,
    instructions: '从共享词库选择适当词语填入 1—3 空，每词最多使用一次。本组为缩短的题型练习。',
    text: 'A student repair corner opens in the library every Friday. Its volunteers hope to (1) ______ the amount of waste produced on campus. Instead of replacing a broken bag or lamp immediately, students can bring it in and learn a simple repair. Basic tools are (2) ______ at the desk, so visitors do not need to buy their own. A volunteer always explains the safety rules before any work begins. Not every object can be repaired, but even an unsuccessful attempt can teach a useful lesson. Students who once felt helpless around tools often leave with greater (3) ______. The corner is therefore both an environmental project and a place to learn practical skills.',
    choices: [
      { prompt: '选择第 1 空的答案。', options: CET4_BANK, answer: 'A. reduce', explanation: 'hope to 后接动词原形，后文修理而非换新说明目标是减少 waste，故选 reduce。' },
      { prompt: '选择第 2 空的答案。', options: CET4_BANK, answer: 'B. available', explanation: 'are 后需表语；不必自己购买工具，说明工具在服务台可供使用，available 符合语义。' },
      { prompt: '选择第 3 空的答案。', options: CET4_BANK, answer: 'C. confidence', explanation: 'greater 后接名词；从 helpless 到学会实用技能，对应 confidence 的提升。' },
    ],
  },
  {
    exam: 'cet4', number: 2, slug: 'reading-study-spaces', title: '四级 · 段落匹配：找到合适的学习空间', task: 'paragraph_matching', minutes: 6,
    instructions: '将 1—3 条陈述与 A—D 段匹配。段落可以重复选择。本组为缩短的题型练习。',
    text: 'A. The university library offers a quiet floor for individual study. Phone calls and group conversations are not allowed there. Students who need to read a difficult chapter without interruption often choose this floor.\n\nB. Group rooms can be booked online for up to two hours. A screen and a whiteboard are provided in each room. Students preparing a joint presentation find these rooms useful because discussion will not disturb readers elsewhere.\n\nC. An outdoor study area was added last spring. On dry days, students can read under the trees or meet classmates at the large tables. However, the area closes when heavy rain is expected, and charging points are not available.\n\nD. A weekly survey asks students which spaces they use and what needs to improve. Last month, several students requested brighter lamps on the quiet floor. The library tested different lamps and chose one after collecting comments from users.',
    choices: [
      { prompt: 'Students can discuss a shared assignment in a room with presentation equipment.', options: PARAGRAPHS, answer: 'B', explanation: 'B 段的 group rooms、screen、whiteboard 和 joint presentation 与共同作业讨论对应。' },
      { prompt: 'Weather conditions can prevent students from using one of the study areas.', options: PARAGRAPHS, answer: 'C', explanation: 'C 段明确说 heavy rain 时 outdoor area 关闭。' },
      { prompt: 'Students’ suggestions influenced a change to the lighting.', options: PARAGRAPHS, answer: 'D', explanation: 'D 段描述学生建议 brighter lamps，并在收集使用反馈后选择新灯。' },
    ],
  },
  {
    exam: 'cet4', number: 3, slug: 'reading-canteen-trial', title: '四级 · 仔细阅读：食堂的小份菜试验', task: 'reading_choice', minutes: 6,
    instructions: '阅读材料，选择每题的最佳答案。',
    text: 'For two weeks, a university canteen offered smaller portions at a lower price. The manager introduced the trial after noticing that many students left rice on their plates. Some students had asked for smaller meals, but the old serving system gave everyone the same amount.\n\nDuring the trial, students could choose either a regular or a small portion. Those who still felt hungry could buy more. Staff weighed the food left on returned plates each evening. They found less rice waste than in the previous two weeks. However, the manager noted that fewer students were on campus during the trial, so the total weight alone could not show how much each diner had wasted.\n\nBefore making a permanent change, the canteen plans to record both the number of meals sold and the amount of food left over. The manager also wants to ask students whether the smaller portion is enough. “The aim is not to make people eat less than they need,” she said. “It is to offer a choice that better matches their appetite.”',
    choices: [
      { prompt: 'Why did the canteen introduce smaller portions?', options: ['A. To shorten its opening hours.', 'B. To reduce leftovers and respond to students’ needs.', 'C. To stop students from buying rice.', 'D. To replace all regular meals.'], answer: 'B. To reduce leftovers and respond to students’ needs.', explanation: '首段同时提到剩饭和学生对小份餐的需求。试验保留常规份量，并非完全替代。' },
      { prompt: 'Why was the lower total weight of waste not enough to evaluate the trial?', options: ['A. The scales were broken.', 'B. Staff weighed only empty plates.', 'C. Fewer students ate on campus during the trial.', 'D. Students were required to eat outside.'], answer: 'C. Fewer students ate on campus during the trial.', explanation: '第二段指出用餐人数减少，因此总量降低不能直接说明每人浪费减少。' },
      { prompt: 'What will the canteen do before deciding on a permanent change?', options: ['A. Collect meal counts, waste data and student feedback.', 'B. Remove every regular portion from the menu.', 'C. Ask students to bring their own food.', 'D. Increase prices without further observation.'], answer: 'A. Collect meal counts, waste data and student feedback.', explanation: '末段明确列出 meals sold、food left over 以及学生对份量是否足够的反馈。' },
    ],
  },
  {
    exam: 'cet4', number: 4, slug: 'listening-bike-workshop', title: '四级 · 合成听力：自行车维护工作坊', task: 'listening_choice', minutes: 5,
    instructions: '主动播放合成英语语音后回答问题；这是原创听力专项样例，不是官方录音。',
    text: 'Hello everyone. This is a message from the campus cycling club. Our bicycle maintenance workshop will take place this Saturday in the west courtyard, not in the sports hall as originally planned. The sports hall is being prepared for a basketball match. The workshop starts at ten in the morning and lasts about ninety minutes. You do not need to own a bicycle to join us. We will provide practice bikes and basic tools. Please bring a pair of old gloves, because some of the work can be messy. A local mechanic will demonstrate how to check the brakes and repair a flat tyre. After the demonstration, you will work in pairs. There is no fee, but places are limited. To reserve a place, email the club secretary by Thursday evening. Please do not send your request to the mechanic, as she does not handle bookings.',
    choices: [
      { prompt: 'Where will the workshop take place?', options: ['A. In the sports hall.', 'B. In the west courtyard.', 'C. In the local bicycle shop.', 'D. In the library entrance.'], answer: 'B. In the west courtyard.', explanation: '通知先给出新地点 west courtyard，再说明不是原计划的 sports hall，要注意地点修正。' },
      { prompt: 'What should participants bring?', options: ['A. A practice bicycle.', 'B. A set of repair tools.', 'C. A pair of old gloves.', 'D. A basketball ticket.'], answer: 'C. A pair of old gloves.', explanation: '自行车和工具由主办方提供；通知明确要求带 old gloves。' },
      { prompt: 'How can students reserve a place?', options: ['A. Email the club secretary by Thursday evening.', 'B. Call the mechanic on Saturday.', 'C. Pay at the sports hall on Friday.', 'D. Arrive without contacting anyone.'], answer: 'A. Email the club secretary by Thursday evening.', explanation: '结尾指出报名方式、收件人和截止时间，并排除联系 mechanic。' },
    ],
  },
  {
    exam: 'cet4', number: 5, slug: 'writing-peer-learning', title: '四级 · 写作：组织同伴学习活动', task: 'essay', minutes: 20, wordRange: [120, 180],
    instructions: '用英语写一篇 120—180 词的短文，说明同伴学习的益处，并提出一项组织活动的具体建议。提交后对照参考与清单自评，不生成官方分数。',
    text: 'Your class is considering a weekly peer-learning session. Write a short essay explaining how students may benefit from learning together and suggest one practical way to organise the session. Use reasons or examples to support your view.',
    referenceAnswer: 'A weekly peer-learning session can help students develop both knowledge and confidence. When someone explains a difficult idea to a classmate, the explanation often reveals gaps in their own understanding. At the same time, students who hesitate to speak in a large lecture may feel more comfortable asking questions in a small group.\n\nTo make the session useful, I suggest choosing one clear topic each week. Participants could send their questions in advance, and a different student could guide each meeting. For example, a group preparing for an English test might compare ways of finding evidence in a reading passage instead of simply sharing answers.\n\nThe session should not replace independent study. Everyone needs time to prepare and review afterwards. With a clear goal and shared responsibility, however, peer learning can turn a lonely task into a productive and encouraging habit.',
    reviewChecklist: ['是否明确说明同伴学习的益处，而非只描述活动？', '是否提出具体可操作的组织建议并解释原因？', '是否用例子或细节支持观点？', '检查段落衔接、主谓一致、拼写和 120—180 词的长度要求。'],
  },
  {
    exam: 'cet4', number: 6, slug: 'translation-community-library', title: '四级 · 汉译英：社区图书角', task: 'translation', minutes: 15,
    instructions: '将左侧中文段落译成英语。允许合理的不同表达，提交后进行人工对照复盘，不按参考译文逐字判分。',
    text: '近年来，一些社区在居民活动中心设立了图书角。这些地方虽然面积不大，却为居民提供了方便的阅读空间。居民可以捐赠自己读过的书，也可以借阅他人分享的书。周末，志愿者会组织儿童阅读活动，帮助孩子养成阅读习惯。图书角不仅让知识得到分享，也增加了邻里之间交流的机会。为了让服务长期持续，社区还需要定期整理图书，并听取居民的建议。',
    referenceAnswer: 'In recent years, some communities have set up reading corners in their community centres. Although these places are small, they provide residents with convenient spaces to read. Residents can donate books they have finished and borrow books shared by others. At weekends, volunteers organise reading activities for children to help them develop a reading habit. These corners not only allow people to share knowledge but also create more opportunities for neighbours to communicate. To keep the service running over time, communities need to sort the books regularly and listen to residents’ suggestions.',
    reviewChecklist: ['是否完整传达地点、捐借方式、志愿活动和长期维护措施？', '“虽然……却……”和“不仅……也……”的逻辑是否保留？', '检查 residents、volunteers 等名词的数和代词指代。', '是否避免中文逐字排列，使用自然英语句式？'],
  },
  {
    exam: 'cet6', number: 1, slug: 'reading-research-incentives', title: '六级 · 选词填空：研究中的不确定性', task: 'banked_cloze', minutes: 6,
    instructions: '从共享词库选择适当词语填入 1—3 空，每词最多使用一次。本组为缩短的题型练习。',
    text: 'Scientific findings are often communicated as settled facts, although many are better understood as (1) ______ conclusions. A small study may suggest a promising relationship without establishing that it will hold in every setting. When headlines omit these qualifications, they can (2) ______ the difference between an interesting observation and a reliable basis for policy. The problem does not arise solely from careless writing. Researchers and publishers also respond to (3) ______ that reward novelty and attention. Improving communication therefore requires more than asking individuals to choose cautious words. Institutions must also value replication, clear methods and the publication of results that fail to support an attractive hypothesis.',
    choices: [
      { prompt: '选择第 1 空的答案。', options: CET6_BANK, answer: 'A. provisional', explanation: '与 settled facts 对照，后文也强调小规模研究不保证普遍成立，故 conclusions 是暂定的 provisional。' },
      { prompt: '选择第 2 空的答案。', options: CET6_BANK, answer: 'B. obscure', explanation: 'can 后接动词；省略限制条件会模糊观察与政策依据之间的区别，obscure 符合。' },
      { prompt: '选择第 3 空的答案。', options: CET6_BANK, answer: 'C. incentives', explanation: 'respond to 后需名词，后置从句 that reward novelty 描述激励机制，故选 incentives。' },
    ],
  },
  {
    exam: 'cet6', number: 2, slug: 'reading-urban-heat', title: '六级 · 段落匹配：城市降温的取舍', task: 'paragraph_matching', minutes: 7,
    instructions: '将 1—3 条陈述与 A—D 段匹配。段落可以重复选择。本组为缩短的题型练习。',
    text: 'A. A city’s average temperature can conceal large differences between neighbourhoods. Streets with little shade may remain uncomfortable even when a citywide indicator improves. Planners therefore need measurements close to where people actually walk, wait and work rather than relying only on a single central weather station.\n\nB. Planting trees can provide shade and improve outdoor spaces, but planting is only the beginning. Young trees require water, suitable soil and years of care. A plan that counts the number planted without budgeting for maintenance may report impressive early progress while delivering little lasting shade.\n\nC. Reflective roofs offer another way to reduce heat absorbed by buildings. They can be installed more quickly than a mature tree canopy can grow. Their benefits, however, depend on building design and local conditions, so results from one district should not automatically be applied to another.\n\nD. Public consultation can reveal needs that temperature maps miss. Older residents may value shaded benches near shops, while delivery workers may need drinking-water points along busy routes. These observations help officials connect technical interventions with everyday use. Consultation cannot replace measurement, but it can improve the questions that measurements are intended to answer.',
    choices: [
      { prompt: 'An apparently successful numerical target may fail to produce a durable benefit if continued care is neglected.', options: PARAGRAPHS, answer: 'B', explanation: 'B 段的 number planted 与 maintenance 对比说明，种植数量漂亮不等于长期形成树荫。' },
      { prompt: 'An aggregate indicator may hide the conditions experienced by people in particular locations.', options: PARAGRAPHS, answer: 'A', explanation: 'A 段强调城市平均温度掩盖街区差异，应在真实活动地点测量。' },
      { prompt: 'Information from different users can complement, rather than replace, technical evidence.', options: PARAGRAPHS, answer: 'D', explanation: 'D 段以老人和配送员为例，并明确 consultation cannot replace measurement。' },
    ],
  },
  {
    exam: 'cet6', number: 3, slug: 'reading-algorithmic-feedback', title: '六级 · 仔细阅读：推荐系统与学习选择', task: 'reading_choice', minutes: 8,
    instructions: '阅读论述材料，辨别作者的证据、限定条件和核心观点。',
    text: 'A learning platform can recommend an exercise that a student is likely to finish, but completion is not the same as learning. If a system is rewarded mainly for keeping users active, it may repeatedly offer familiar tasks. Such tasks produce reassuring success rates while leaving important weaknesses untouched.\n\nThis does not mean recommendations are inherently harmful. They can reduce the effort required to locate suitable material, especially for beginners who do not yet know how to judge difficulty. The difficulty lies in choosing what the system should optimise and how that choice is explained to learners. A useful recommendation may occasionally feel less convenient because it introduces a necessary challenge.\n\nEvaluation also needs a longer horizon. A student’s immediate accuracy may fall when they begin a demanding topic, even if the experience helps them perform independently later. Comparing only the next click or the next answer would miss that possibility. Yet delayed improvement should not be assumed merely because a task is difficult; it must be checked through later performance.\n\nThe most defensible design therefore combines recommendations with learner control and transparent explanations. Students should be able to see why an exercise was suggested and choose an alternative. Instead of presenting the system as an unquestionable authority, the interface can make it a tool for informed decisions.',
    choices: [
      { prompt: 'What risk does the author associate with optimising mainly for continued activity?', options: ['A. Every learner will stop using the platform.', 'B. The system may prioritise familiar tasks over unresolved weaknesses.', 'C. All difficult exercises will become impossible to locate.', 'D. Students will no longer need independent practice.'], answer: 'B. The system may prioritise familiar tasks over unresolved weaknesses.', explanation: '首段将 keeping users active 与反复推荐熟悉题目联系起来，指出高完成率可能掩盖薄弱项。' },
      { prompt: 'How does the author qualify the possible value of a demanding task?', options: ['A. Any immediate error proves the task is unsuitable.', 'B. Difficulty alone guarantees eventual improvement.', 'C. Later independent performance is needed to verify its benefit.', 'D. The next click is the only reliable measure.'], answer: 'C. Later independent performance is needed to verify its benefit.', explanation: '第三段说明即时正确率下降可能伴随长期收益，但不能仅凭困难就假定有效，需后续表现验证。' },
      { prompt: 'Which design best reflects the author’s conclusion?', options: ['A. Hide recommendation criteria to prevent disagreement.', 'B. Require every student to follow the same sequence.', 'C. Replace all recommendations with random exercises.', 'D. Explain recommendations and allow learners to choose alternatives.'], answer: 'D. Explain recommendations and allow learners to choose alternatives.', explanation: '末段明确提出 learner control、transparent explanations 及 choose an alternative。' },
    ],
  },
  {
    exam: 'cet6', number: 4, slug: 'listening-citizen-science', title: '六级 · 合成听力：公众参与的河流观察', task: 'listening_choice', minutes: 6,
    instructions: '主动播放合成英语语音后回答问题；注意研究限制和改进措施。这是原创专项样例，不是官方录音。',
    text: 'Today I would like to discuss a river-monitoring project involving local volunteers. At first, the team asked people to photograph the water whenever they happened to walk past it. The photographs were useful for locating visible litter, but they could not establish whether water quality was improving. Most pictures were taken on sunny weekends, so the collection left out many conditions after heavy rain. The project then introduced a more consistent schedule. Volunteers received a short training session and were assigned observation points, while laboratory staff continued to analyse water samples. Notice that the volunteers did not replace the specialists. Their repeated observations helped the specialists decide where further investigation might be needed. There was also an unexpected social benefit. Some residents who had rarely spoken to one another began discussing changes along the river. This strengthened interest in the project, but the team avoided treating enthusiasm as proof of environmental improvement. Its next report will separate participation figures from measurements of the river itself. The lesson is that public involvement can broaden observation, provided that the limits of the evidence remain clear.',
    choices: [
      { prompt: 'What was a limitation of the original photograph collection?', options: ['A. It represented mainly sunny weekends rather than a full range of conditions.', 'B. It was collected only by laboratory specialists.', 'C. It contained no visible features of the river.', 'D. It was too consistent to reveal changes.'], answer: 'A. It represented mainly sunny weekends rather than a full range of conditions.', explanation: '录音指出晴朗周末拍摄居多，尤其缺少大雨后的情况，形成观察条件偏差。' },
      { prompt: 'How did volunteers contribute after the project changed its approach?', options: ['A. They replaced all laboratory analysis.', 'B. They decided that no further research was needed.', 'C. Their regular observations helped identify places for further investigation.', 'D. They collected only participation statistics.'], answer: 'C. Their regular observations helped identify places for further investigation.', explanation: '更规律的观察帮助专业人员决定进一步调查地点，录音明确说没有替代 specialists。' },
      { prompt: 'Why will the next report separate participation figures from river measurements?', options: ['A. Residents no longer wish to participate.', 'B. Increased enthusiasm does not itself prove environmental improvement.', 'C. Photographs always provide better evidence than samples.', 'D. Laboratory staff refuse to publish their findings.'], answer: 'B. Increased enthusiasm does not itself prove environmental improvement.', explanation: '后半段区分社会参与收益与环境改善，强调不能把 enthusiasm 当成水质变好的证据。' },
    ],
  },
  {
    exam: 'cet6', number: 5, slug: 'writing-digital-convenience', title: '六级 · 写作：便利与独立判断', task: 'essay', minutes: 25, wordRange: [150, 200],
    instructions: '用英语写一篇 150—200 词的短文，讨论数字工具带来的便利与独立判断之间的关系，并提出合理的使用原则。提交后自评，不生成官方分数。',
    text: 'Digital tools can make everyday decisions faster, but convenience may also encourage people to accept suggestions without reflection. Discuss how university students can benefit from these tools while maintaining independent judgement. Support your argument with a specific example.',
    referenceAnswer: 'Digital tools have made it easier for university students to organise information and plan their work. However, a convenient suggestion should be treated as a starting point rather than a final decision. Maintaining independent judgement requires students to examine both the recommendation and the purpose behind it.\n\nConsider a tool that proposes a study schedule. It can save time by arranging tasks around deadlines, but it may not know that a student needs extra practice in a particular skill. Accepting the schedule without revision could therefore produce an efficient-looking plan that does not address the real problem. The student should compare the suggestion with recent performance and adjust the priorities accordingly.\n\nThis does not require rejecting automation. Instead, students can adopt a simple principle: delegate repetitive organisation while retaining responsibility for goals and evaluation. They should also check important factual claims against reliable sources and notice when a tool lacks relevant context.\n\nUsed in this way, digital convenience supports independence rather than replacing it. The value of a tool lies not only in the effort it removes, but also in the quality of the decisions it helps people make.',
    reviewChecklist: ['是否提出关于便利与独立判断关系的明确立场？', '具体例子是否解释了工具的帮助和局限？', '建议是否可执行，避免只喊口号？', '是否保持逻辑连贯、用词准确，并满足 150—200 词的要求？'],
  },
  {
    exam: 'cet6', number: 6, slug: 'translation-industrial-heritage', title: '六级 · 汉译英：旧厂房与公共文化空间', task: 'translation', minutes: 20,
    instructions: '将左侧中文段落译成英语，关注长句逻辑与概念表达。参考译文不是唯一答案，不自动换算成绩。',
    text: '随着城市发展方式的转变，一些曾经闲置的工业建筑被改造成公共文化空间。与完全拆除重建相比，这种做法既能保留城市的历史记忆，也有机会减少建筑材料的浪费。然而，改造并不意味着简单地保留外墙、增加商业设施。设计者还需要考虑建筑安全、公共交通以及不同人群的实际需求。如果周边居民能够参与讨论，并以合理的成本使用这些空间，工业遗产的保护就更有可能与日常生活建立联系。评价改造的成效，因此不能只看游客数量，还应关注其能否长期提供有价值的公共服务。',
    referenceAnswer: 'As approaches to urban development change, some formerly unused industrial buildings have been converted into public cultural spaces. Compared with complete demolition and reconstruction, this approach can preserve a city’s historical memory while potentially reducing the waste of construction materials. However, conversion involves more than simply keeping the outer walls and adding commercial facilities. Designers also need to consider structural safety, public transport and the practical needs of different groups. If local residents can participate in discussions and use these spaces at an affordable cost, the protection of industrial heritage is more likely to become connected with everyday life. The success of such projects should therefore be judged not only by visitor numbers, but also by their ability to provide valuable public services over the long term.',
    reviewChecklist: ['是否保留“有机会”“更有可能”等限定，而非强化为必然结果？', '比较、转折、条件和结论之间的逻辑是否准确？', 'industrial heritage、structural safety 等概念是否表达清楚？', '是否完整覆盖居民参与、使用成本与长期公共服务，而非遗漏末句？'],
  },
];

const cetPracticeUnits = samples.map(createUnit);

export function getCetPracticeUnits(): PracticeUnit[] {
  return cetPracticeUnits;
}

export function getCetPracticeUnit(idOrSlug: string): PracticeUnit | null {
  return cetPracticeUnits.find((unit) => unit.id === idOrSlug || unit.slug === idOrSlug) ?? null;
}
