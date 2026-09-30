-- IELTS Trainer — practice sample seed (migration 0002).
--
-- GENERATED FILE. Do not edit by hand.
-- Source: src/lib/practice-session-samples.ts
-- Regenerate: node scripts/generate-practice-seed.mjs
--
-- Apply after 0001_practice_sessions.sql. Idempotent: units upsert on slug,
-- questions upsert on (unit_id, external_key). Touches only practice_units and
-- practice_questions — no legacy tables, no user attempt data.
--
-- Units seeded: 40
-- Questions seeded: 352

-- ---------------------------------------------------------------------------
-- reading · Urban Green Roofs
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-progressive-urban-green-roofs-001',
  'reading',
  'progressive',
  'Urban Green Roofs',
  'A Reading MVP preview: one passage with multiple linked questions.',
  'medium',
  'passage',
  $t$In many large cities, rooftops have traditionally been treated as empty technical spaces. They hold ventilation equipment, water tanks, and maintenance pathways, but they are rarely considered part of the urban environment. Over the last two decades, however, a growing number of architects and city planners have argued that rooftops can help solve several problems at once if they are covered with carefully selected plants.

A green roof usually consists of a waterproof layer, a root barrier, drainage material, lightweight soil, and vegetation. Some roofs are designed mainly for environmental performance and require little maintenance. Others are accessible gardens used by residents, office workers, or visitors. Although these two types look different, both can reduce the amount of heat absorbed by buildings during summer.

Supporters often point to stormwater management as one of the strongest benefits. During heavy rain, ordinary roofs send water quickly into drains, increasing pressure on urban sewage systems. A planted roof can hold part of that rainfall and release it more slowly. This does not remove the need for proper drainage, but it can reduce peak flow during storms.

Green roofs may also support biodiversity, especially in districts where ground-level habitat has disappeared. Even small areas of vegetation can provide food or resting places for insects and birds. The effect is greater when roofs are connected across several buildings, creating a network rather than isolated patches.

The main barrier is cost. Green roofs are more expensive to install than conventional roofs, and older buildings may need structural assessment before they can support the extra weight. For this reason, some cities have introduced grants or planning rules to encourage adoption. Advocates argue that the long-term savings in cooling, drainage, and roof durability can justify the initial investment.$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"local-sample","status":"read-only-preview","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'green-roofs-q1',
    1,
    'multiple_choice',
    'What is the main purpose of the first paragraph?',
    $j$["To describe the technical equipment found on roofs","To introduce a changing view of rooftops in cities","To argue that all city roofs should become gardens","To compare old and new waterproofing materials"]$j$::jsonb,
    $j${"answers":["To introduce a changing view of rooftops in cities"],"caseSensitive":false}$j$::jsonb,
    'The paragraph contrasts the traditional view of rooftops with the newer idea that they can help solve urban problems.',
    $j${"ieltsType":"multiple_choice"}$j$::jsonb
  ),
  (
    'green-roofs-q2',
    2,
    'true_false_not_given',
    'All green roofs are designed as accessible gardens for people to use.',
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["False"],"caseSensitive":false}$j$::jsonb,
    'The passage says some roofs are mainly for environmental performance and others are accessible gardens.',
    $j${"ieltsType":"true_false_not_given"}$j$::jsonb
  ),
  (
    'green-roofs-q3',
    3,
    'sentence_completion',
    'A planted roof can reduce pressure on sewage systems by holding rainfall and releasing it more ______.',
    null::jsonb,
    $j${"answers":["slowly"],"caseSensitive":false,"acceptedAlternatives":["gradually"]}$j$::jsonb,
    'Paragraph 3 states that a planted roof can hold rainfall and release it more slowly.',
    $j${"ieltsType":"sentence_completion"}$j$::jsonb
  ),
  (
    'green-roofs-q4',
    4,
    'multiple_choice',
    'According to the passage, biodiversity benefits are greater when green roofs are:',
    $j$["built only on new buildings","connected across several buildings","kept inaccessible to residents","made with heavier soil"]$j$::jsonb,
    $j${"answers":["connected across several buildings"],"caseSensitive":false}$j$::jsonb,
    'The passage says the effect is greater when roofs are connected across several buildings, creating a network.',
    $j${"ieltsType":"multiple_choice"}$j$::jsonb
  ),
  (
    'green-roofs-q5',
    5,
    'short_answer',
    'What is described as the main barrier to installing green roofs?',
    null::jsonb,
    $j${"answers":["cost"],"caseSensitive":false,"acceptedAlternatives":["the cost","high cost"]}$j$::jsonb,
    'The final paragraph directly states that the main barrier is cost.',
    $j${"ieltsType":"short_answer"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-progressive-urban-green-roofs-001'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Library Orientation
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-progressive-library-orientation-001',
  'listening',
  'progressive',
  'Library Orientation',
  'A Listening MVP preview: one short section transcript with linked information-completion questions.',
  'medium',
  'audio',
  null,
  '/audio/sample-listening-orientation.wav',
  $t$Good morning everyone, and welcome to the first-year library orientation. My name is Helen Carter, and I work at the information desk on the ground floor. Today I will explain how to borrow books, where to find study rooms, and what to do if you need research help.

The main library is open from eight thirty in the morning until ten at night from Monday to Friday. On Saturdays it closes earlier, at six o'clock, and on Sundays only the online help service is available. You can enter the building with your student card, which also works as your borrowing card.

Undergraduate students can borrow up to twelve books at one time. Most books can be kept for three weeks, but high-demand course books must be returned after seven days. If nobody else has requested the item, you can renew it twice through your online library account.

Study rooms are located on the second and third floors. Small rooms for two to four people can be booked online, while the larger presentation room must be booked at the information desk. Please remember that food is not allowed in any study room, although drinks with lids are permitted.

If you need help finding academic articles, you can make an appointment with a subject librarian. These appointments are free, but they should be booked at least two days in advance, especially near assignment deadlines.$t$,
  null,
  600,
  $j${"source":"local-sample","status":"read-only-preview","audioStatus":"placeholder-tone","audioDurationSeconds":96,"transcriptCues":[{"start":0,"text":"Good morning everyone, and welcome to the first-year library orientation."},{"start":3,"text":"My name is Helen Carter, and I work at the information desk on the ground floor."},{"start":10,"text":"Today I will explain how to borrow books, where to find study rooms, and what to do if you need research help."},{"start":18,"text":"The main library is open from eight thirty in the morning until ten at night from Monday to Friday."},{"start":25,"text":"On Saturdays it closes earlier, at six o'clock, and on Sundays only the online help service is available."},{"start":32,"text":"You can enter the building with your student card, which also works as your borrowing card."},{"start":38,"text":"Undergraduate students can borrow up to twelve books at one time."},{"start":42,"text":"Most books can be kept for three weeks, but high-demand course books must be returned after seven days."},{"start":49,"text":"If nobody else has requested the item, you can renew it twice through your online library account."},{"start":56,"text":"Study rooms are located on the second and third floors."},{"start":60,"text":"Small rooms for two to four people can be booked online, while the larger presentation room must be booked at the information desk."},{"start":68,"text":"Please remember that food is not allowed in any study room, although drinks with lids are permitted."},{"start":75,"text":"If you need help finding academic articles, you can make an appointment with a subject librarian."},{"start":81,"text":"These appointments are free, but they should be booked at least two days in advance, especially near assignment deadlines."}],"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'library-orientation-q1',
    1,
    'short_answer',
    'Where does Helen Carter work?',
    null::jsonb,
    $j${"answers":["information desk"],"caseSensitive":false,"acceptedAlternatives":["the information desk","ground floor information desk"]}$j$::jsonb,
    'Helen says she works at the information desk on the ground floor.',
    $j${"ieltsType":"short_answer"}$j$::jsonb
  ),
  (
    'library-orientation-q2',
    2,
    'sentence_completion',
    'From Monday to Friday, the main library closes at ______.',
    null::jsonb,
    $j${"answers":["ten at night"],"caseSensitive":false,"acceptedAlternatives":["10 at night","10 pm","10 p.m.","ten pm"]}$j$::jsonb,
    'The speaker says the library is open until ten at night from Monday to Friday.',
    $j${"ieltsType":"sentence_completion"}$j$::jsonb
  ),
  (
    'library-orientation-q3',
    3,
    'multiple_choice',
    'How many books can undergraduate students borrow at one time?',
    $j$["7","10","12","20"]$j$::jsonb,
    $j${"answers":["12"],"caseSensitive":false}$j$::jsonb,
    'Undergraduate students can borrow up to twelve books at one time.',
    $j${"ieltsType":"multiple_choice"}$j$::jsonb
  ),
  (
    'library-orientation-q4',
    4,
    'multiple_choice',
    'Where must the larger presentation room be booked?',
    $j$["Online","At the information desk","On the third floor","Through a subject librarian"]$j$::jsonb,
    $j${"answers":["At the information desk"],"caseSensitive":false}$j$::jsonb,
    'The larger presentation room must be booked at the information desk.',
    $j${"ieltsType":"multiple_choice"}$j$::jsonb
  ),
  (
    'library-orientation-q5',
    5,
    'sentence_completion',
    'Subject librarian appointments should be booked at least ______ in advance.',
    null::jsonb,
    $j${"answers":["two days"],"caseSensitive":false,"acceptedAlternatives":["2 days"]}$j$::jsonb,
    'The speaker says appointments should be booked at least two days in advance.',
    $j${"ieltsType":"sentence_completion"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-progressive-library-orientation-001'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- writing · Remote Work and Productivity
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'writing-progressive-remote-work-task-2-001',
  'writing',
  'progressive',
  'Remote Work and Productivity',
  'A Writing Task 2 MVP preview: one prompt, planning notes, and a local long-form draft area.',
  'medium',
  'writing_prompt',
  null,
  null,
  null,
  null,
  2400,
  $j${"source":"local-sample","status":"read-only-preview","taskType":"task_2","wordTarget":250,"prompt":"Some people believe that working from home improves productivity, while others think it creates more distractions and weakens teamwork.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'remote-work-writing-q1',
    1,
    'writing_task',
    'Write a complete Task 2 response. Include both views and a clear personal opinion.',
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Writing responses need rubric-based feedback rather than exact-answer checking. A future version can evaluate task response, coherence, lexical resource, and grammar.',
    $j${"ieltsType":"writing_task_2","wordTarget":250}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'writing-progressive-remote-work-task-2-001'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- speaking · A Change in Your City
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'speaking-progressive-city-change-part-2-001',
  'speaking',
  'progressive',
  'A Change in Your City',
  'A Speaking Part 2 MVP preview: one cue card, prep guidance, and a local response note area.',
  'medium',
  'speaking_prompt',
  null,
  null,
  null,
  null,
  120,
  $j${"source":"local-sample","status":"read-only-preview","part":2,"prepSeconds":60,"responseSeconds":120,"cueCard":"Describe a change that has improved the area where you live.\n\nYou should say:\n- what the change was\n- when it happened\n- who benefited from it\n- and explain why you think it improved the area.","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'city-change-speaking-q1',
    1,
    'speaking_response',
    'Prepare your 1-2 minute response. Write keywords, a short transcript, or a self-review after speaking aloud.',
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Speaking responses need timing, recording, transcript, and fluency feedback rather than exact-answer checking. This preview keeps the rehearsal draft local only.',
    $j${"ieltsType":"speaking_part_2","prepSeconds":60,"responseSeconds":120}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'speaking-progressive-city-change-part-2-001'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Transport survey
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t1-p1',
  'listening',
  'challenge',
  'Transport survey',
  'Cambridge IELTS 18 · Test 1 · Listening Part 1 (Questions 1–10).',
  'medium',
  'audio',
  null,
  '/audio/cam18/t1-p1.mp3',
  $t$MAN: Excuse me. Would you mind if I asked you some questions? We're doing a survey on transport.

SADIE: Yes, that's OK.

MAN: First of all, can I take your name?

SADIE: Yes. It's Sadie Jones.

MAN: Thanks very much. And could I have your date of birth - just the year will do, actually. Is that all right?

SADIE: Yes, that's fine. It's 1991.

MAN: So next your postcode, please.

SADIE: It's DW30 7YZ.

MAN: Great. Thanks. Is that in Wells?

SADIE: No, it's actually in Harborne - Wells isn't far from there, though.

MAN: I really like that area. My grandmother lived there when I was a kid.

SADIE: Yes, it is nice.

MAN: Right, so now I want to ask you some questions about how you travelled here today. Did you use public transport?

SADIE: Yes. I came by bus.

MAN: OK. And that was today. It's the 24th of April, isn't it?

SADIE: Isn't it the 25th? No, actually, you're right.
MAN: Ha ha. And what was the reason for your trip today? I can see you've got some shopping with you.

SADIE: Yes. I did some shopping but the main reason I came here was to go to the dentist.

MAN: That's not much fun. Hope it was nothing serious.

SADIE: No, it was just a check-up. It's fine.

MAN: Good. Do you normally travel by bus into the city centre?

SADIE: Yes. I stopped driving in ages ago because parking was so difficult to find and it costs so much.

MAN: I see.

SADIE: The bus is much more convenient too. It only takes about 30 minutes.

MAN: That's good. So where did you start your journey?

SADIE: At the bus stop on Claxby Street.

MAN: Is that C-L-A-X-B-Y?

SADIE: That's right.

MAN: And how satisfied with the service are you? Do you have any complaints?

SADIE: Well, as I said, it's very convenient and quick when it's on time, but this morning it was late. Only about 10 minutes, but still.

MAN: Yes, I understand that's annoying. And what about the timetable? Do you have any comments about that?

SADIE: Mmm. I suppose I mainly use the bus during the day, but any time I've been in town in the evening - for dinner or at the cinema - I've noticed you have to wait a long time for a bus - there aren't that many.

MAN: OK, thanks. So now I'd like to ask you about your car use.

SADIE: Well, I have got a car but I don't use it that often. Mainly just to go to the supermarket. But that's about it really. My husband uses it at the weekends to go to the golf club.

MAN: And what about a bicycle?

SADIE: I don't actually have one at the moment.

MAN: What about the city bikes you can rent? Do you ever use those?

SADIE: No - I'm not keen on cycling there because of all the pollution. But I would like to get a bike - it would be good to use it to get to work.

MAN: So why haven't you got one now?

SADIE: Well, I live in a flat - on the second floor and it doesn't have any storage - so we'd have to leave it in the hall outside the flat.

MAN: I see. OK. Well, I think that's all ...$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":1,"part":1,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t1-l1-q1',
    1,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.
Transport survey
Name: Sadie Jones
Year of birth: 1991
Postcode: 1 ________$t$,
    null::jsonb,
    $j${"answers":["DW30 7YZ"],"caseSensitive":false}$j$::jsonb,
    $t$Sadie gives her postcode: "It's DW30 7YZ."$t$,
    $j${"ieltsNumber":1,"ieltsType":"note_completion","instruction":"Write ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t1-l1-q2',
    2,
    'sentence_completion',
    $t$Travelling by bus
Date of bus journey: 2 ________$t$,
    null::jsonb,
    $j${"answers":["24 April"],"caseSensitive":false,"acceptedAlternatives":["24th April"]}$j$::jsonb,
    $t$The interviewer confirms the date: "It's the 24th of April, isn't it?" and Sadie agrees.$t$,
    $j${"ieltsNumber":2,"ieltsType":"note_completion","instruction":"Write ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t1-l1-q3',
    3,
    'sentence_completion',
    'Reason for trip: shopping and visit to the 3 ________',
    null::jsonb,
    $j${"answers":["dentist"],"caseSensitive":false}$j$::jsonb,
    'Sadie: "the main reason I came here was to go to the dentist."',
    $j${"ieltsNumber":3,"ieltsType":"note_completion","instruction":"Write ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t1-l1-q4',
    4,
    'sentence_completion',
    'Travelled by bus because cost of 4 ________ too high',
    null::jsonb,
    $j${"answers":["parking"],"caseSensitive":false}$j$::jsonb,
    'Sadie stopped driving in "because parking was so difficult to find and it costs so much".',
    $j${"ieltsNumber":4,"ieltsType":"note_completion","instruction":"Write ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t1-l1-q5',
    5,
    'sentence_completion',
    'Got on bus at 5 ________ Street',
    null::jsonb,
    $j${"answers":["Claxby"],"caseSensitive":false}$j$::jsonb,
    'Sadie: "At the bus stop on Claxby Street", spelled out as C-L-A-X-B-Y.',
    $j${"ieltsNumber":5,"ieltsType":"note_completion","instruction":"Write ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t1-l1-q6',
    6,
    'sentence_completion',
    $t$Complaints about bus service:
- bus today was 6 ________$t$,
    null::jsonb,
    $j${"answers":["late"],"caseSensitive":false}$j$::jsonb,
    'Sadie says that "this morning it was late. Only about 10 minutes, but still."',
    $j${"ieltsNumber":6,"ieltsType":"note_completion","instruction":"Write ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t1-l1-q7',
    7,
    'sentence_completion',
    '- frequency of buses in the 7 ________',
    null::jsonb,
    $j${"answers":["evening"],"caseSensitive":false}$j$::jsonb,
    $t$In the evening "you have to wait a long time for a bus - there aren't that many".$t$,
    $j${"ieltsNumber":7,"ieltsType":"note_completion","instruction":"Write ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t1-l1-q8',
    8,
    'sentence_completion',
    $t$Travelling by car
Goes to the 8 ________ by car$t$,
    null::jsonb,
    $j${"answers":["supermarket"],"caseSensitive":false}$j$::jsonb,
    'Sadie uses her car "Mainly just to go to the supermarket."',
    $j${"ieltsNumber":8,"ieltsType":"note_completion","instruction":"Write ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t1-l1-q9',
    9,
    'sentence_completion',
    $t$Travelling by bicycle
Dislikes travelling by bike in the city centre because of the 9 ________$t$,
    null::jsonb,
    $j${"answers":["pollution"],"caseSensitive":false}$j$::jsonb,
    $t$Sadie: "I'm not keen on cycling there because of all the pollution."$t$,
    $j${"ieltsNumber":9,"ieltsType":"note_completion","instruction":"Write ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t1-l1-q10',
    10,
    'sentence_completion',
    'Has no bike because her flat has no 10 ________',
    null::jsonb,
    $j${"answers":["storage"],"caseSensitive":false}$j$::jsonb,
    $t$Sadie lives in a second-floor flat and "it doesn't have any storage".$t$,
    $j${"ieltsNumber":10,"ieltsType":"note_completion","instruction":"Write ONE WORD AND/OR A NUMBER."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t1-p1'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Becoming a volunteer for ACE
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t1-p2',
  'listening',
  'challenge',
  'Becoming a volunteer for ACE',
  'Cambridge IELTS 18 · Test 1 · Listening Part 2 (Questions 11–20).',
  'medium',
  'audio',
  null,
  '/audio/cam18/t1-p2.mp3',
  $t$Good evening, everyone. Let me start by welcoming you all to this talk and thanking you for taking the time to consider joining ACE voluntary organisation. ACE offers support to people and services in the local area and we're now looking for more volunteers to help us do this.

By the way, I hope you're all comfortable - we have brought in extra seats so that no one has to stand, but it does mean that the people at the back of the room may be a bit squashed. We'll only be here for about half an hour so, hopefully, that's OK.

One of the first questions we're often asked is how old you need to be to volunteer. Well, you can be as young as 16 or you can be 60 or over; it all depends on what type of voluntary work you want to do. Other considerations, such as reliability, are crucial in voluntary work and age isn't related to these, in our experience.

Another question we get asked relates to training. Well, there's plenty of that and it's all face-to-face. What's more, training doesn't end when you start working for us - it takes place before, during and after periods of work. Often, it's run by other experienced volunteers as managers tend to prefer to get on with other things.

Now, I would ask you to consider a couple of important issues before you decide to apply for voluntary work. We don't worry about why you want to be a volunteer - people have many different reasons that range from getting work experience to just doing something they've always wanted to do. But it is critical that you have enough hours in the day for whatever role we agree is suitable for you - if being a volunteer becomes stressful then it's best not to do it at all. You may think that your income is important, but we don't ask about that. It's up to you to decide if you can work without earning money. What we value is dedication. Some of our most loyal volunteers earn very little themselves but still give their full energy to the work they do with us.

OK, so let's take a look at some of the work areas that we need volunteers for and the sort of things that would help you in those.

You may wish simply to help us raise money. If you have the creativity to come up with an imaginative or novel way of fundraising, we'd be delighted, as standing in the local streets or shops with a collection box can be rather boring!

One outdoor activity that we need volunteers for is litter collection and for this it's useful if you can walk for long periods, sometimes uphill. Some of our regular collectors are quite elderly, but very active and keen to protect the environment.

If you enjoy working with children, we have three vacancies for what are called 'playmates'. These volunteers help children learn about staying healthy through a range of out-of-school activities. You don't need to have children yourself, but it's good if you know something about nutrition and can give clear instructions.

If that doesn't appeal to you, maybe you would be interested in helping out at our story club for disabled children, especially if you have done some acting. We put on three performances a year based on books they have read and we're always looking for support with the theatrical side of this.

The last area I'll mention today is first aid. Volunteers who join this group can end up teaching others in vulnerable groups who may be at risk of injury. Initially, though, your priority will be to take in a lot of information and not forget any important steps or details.

Right, so does anyone have any questions ...$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":1,"part":2,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t1-l2-q11',
    1,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
Why does the speaker apologise about the seats?$t$,
    $j$["A – They are too small.","B – There are not enough of them.","C – Some of them are very close together."]$j$::jsonb,
    $j${"answers":["C – Some of them are very close together."],"caseSensitive":false}$j$::jsonb,
    'Extra seats were brought in so no one has to stand, but "the people at the back of the room may be a bit squashed".',
    $j${"ieltsNumber":11,"ieltsType":"multiple_choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t1-l2-q12',
    2,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
What does the speaker say about the age of volunteers?$t$,
    $j$["A – The age of volunteers is less important than other factors.","B – Young volunteers are less reliable than older ones.","C – Most volunteers are about 60 years old."]$j$::jsonb,
    $j${"answers":["A – The age of volunteers is less important than other factors."],"caseSensitive":false}$j$::jsonb,
    $t$Other considerations "such as reliability, are crucial in voluntary work and age isn't related to these".$t$,
    $j${"ieltsNumber":12,"ieltsType":"multiple_choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t1-l2-q13',
    3,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
What does the speaker say about training?$t$,
    $j$["A – It is continuous.","B – It is conducted by a manager.","C – It takes place online."]$j$::jsonb,
    $j${"answers":["A – It is continuous."],"caseSensitive":false}$j$::jsonb,
    $t$Training "doesn't end when you start working for us - it takes place before, during and after periods of work".$t$,
    $j${"ieltsNumber":13,"ieltsType":"multiple_choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t1-l2-q14',
    4,
    'multiple_choice',
    $t$Choose TWO letters, A–E — this is one of a pair; enter one correct letter here and the other in the paired question.
Which TWO issues does the speaker ask the audience to consider before they apply to be volunteers?
A their financial situation
B their level of commitment
C their work experience
D their ambition
E their availability$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","E"],"caseSensitive":false}$j$::jsonb,
    'The speaker stresses having "enough hours in the day" (availability) and that "What we value is dedication" (commitment).',
    $j${"ieltsNumber":14,"ieltsType":"multiple_choice_two_answers","instruction":"Choose TWO letters.","pairWith":15}$j$::jsonb
  ),
  (
    'cam18-t1-l2-q15',
    5,
    'multiple_choice',
    $t$Choose TWO letters, A–E — this is one of a pair; enter one correct letter here and the other in the paired question.
Which TWO issues does the speaker ask the audience to consider before they apply to be volunteers?
A their financial situation
B their level of commitment
C their work experience
D their ambition
E their availability$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","E"],"caseSensitive":false}$j$::jsonb,
    'The speaker stresses having "enough hours in the day" (availability) and that "What we value is dedication" (commitment).',
    $j${"ieltsNumber":15,"ieltsType":"multiple_choice_two_answers","instruction":"Choose TWO letters.","pairWith":14}$j$::jsonb
  ),
  (
    'cam18-t1-l2-q16',
    6,
    'multiple_choice',
    $t$What does the speaker suggest would be helpful for each of the following areas of voluntary work?
Choose FIVE answers from the box and write the correct letter, A–G, next to Questions 16–20.
Area of voluntary work: Fundraising$t$,
    $j$["A – experience on stage","B – original, new ideas","C – parenting skills","D – an understanding of food and diet","E – retail experience","F – a good memory","G – a good level of fitness"]$j$::jsonb,
    $j${"answers":["B – original, new ideas"],"caseSensitive":false}$j$::jsonb,
    'For raising money the speaker wants "the creativity to come up with an imaginative or novel way of fundraising".',
    $j${"ieltsNumber":16,"ieltsType":"matching","instruction":"Choose FIVE answers from the box, A–G."}$j$::jsonb
  ),
  (
    'cam18-t1-l2-q17',
    7,
    'multiple_choice',
    $t$What does the speaker suggest would be helpful for each of the following areas of voluntary work?
Choose FIVE answers from the box and write the correct letter, A–G, next to Questions 16–20.
Area of voluntary work: Litter collection$t$,
    $j$["A – experience on stage","B – original, new ideas","C – parenting skills","D – an understanding of food and diet","E – retail experience","F – a good memory","G – a good level of fitness"]$j$::jsonb,
    $j${"answers":["G – a good level of fitness"],"caseSensitive":false}$j$::jsonb,
    $t$For litter collection "it's useful if you can walk for long periods, sometimes uphill".$t$,
    $j${"ieltsNumber":17,"ieltsType":"matching","instruction":"Choose FIVE answers from the box, A–G."}$j$::jsonb
  ),
  (
    'cam18-t1-l2-q18',
    8,
    'multiple_choice',
    $t$What does the speaker suggest would be helpful for each of the following areas of voluntary work?
Choose FIVE answers from the box and write the correct letter, A–G, next to Questions 16–20.
Area of voluntary work: 'Playmates'$t$,
    $j$["A – experience on stage","B – original, new ideas","C – parenting skills","D – an understanding of food and diet","E – retail experience","F – a good memory","G – a good level of fitness"]$j$::jsonb,
    $j${"answers":["D – an understanding of food and diet"],"caseSensitive":false}$j$::jsonb,
    $t$For playmates: "it's good if you know something about nutrition"; having children yourself is not needed.$t$,
    $j${"ieltsNumber":18,"ieltsType":"matching","instruction":"Choose FIVE answers from the box, A–G."}$j$::jsonb
  ),
  (
    'cam18-t1-l2-q19',
    9,
    'multiple_choice',
    $t$What does the speaker suggest would be helpful for each of the following areas of voluntary work?
Choose FIVE answers from the box and write the correct letter, A–G, next to Questions 16–20.
Area of voluntary work: Story club$t$,
    $j$["A – experience on stage","B – original, new ideas","C – parenting skills","D – an understanding of food and diet","E – retail experience","F – a good memory","G – a good level of fitness"]$j$::jsonb,
    $j${"answers":["A – experience on stage"],"caseSensitive":false}$j$::jsonb,
    'The story club suits people who "have done some acting" - support is needed with the theatrical side.',
    $j${"ieltsNumber":19,"ieltsType":"matching","instruction":"Choose FIVE answers from the box, A–G."}$j$::jsonb
  ),
  (
    'cam18-t1-l2-q20',
    10,
    'multiple_choice',
    $t$What does the speaker suggest would be helpful for each of the following areas of voluntary work?
Choose FIVE answers from the box and write the correct letter, A–G, next to Questions 16–20.
Area of voluntary work: First aid$t$,
    $j$["A – experience on stage","B – original, new ideas","C – parenting skills","D – an understanding of food and diet","E – retail experience","F – a good memory","G – a good level of fitness"]$j$::jsonb,
    $j${"answers":["F – a good memory"],"caseSensitive":false}$j$::jsonb,
    'For first aid the priority is "to take in a lot of information and not forget any important steps or details".',
    $j${"ieltsNumber":20,"ieltsType":"matching","instruction":"Choose FIVE answers from the box, A–G."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t1-p2'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Talk on jobs in fashion design
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t1-p3',
  'listening',
  'challenge',
  'Talk on jobs in fashion design',
  'Cambridge IELTS 18 · Test 1 · Listening Part 3 (Questions 21–30).',
  'medium',
  'audio',
  null,
  '/audio/cam18/t1-p3.mp3',
  $t$HUGO: Hi Chantal. What did you think of the talk, then?

CHANTAL: Hi Hugo. I thought it was good once I'd moved seats.

HUGO: Oh – were the people beside you chatting or something?

CHANTAL: It wasn't that. I went early so that I'd get a seat and not have to stand, but then this guy sat right in front of me and he was so tall!

HUGO: It's hard to see through people's heads, isn't it?

CHANTAL: Impossible! Anyway, to answer your question, I thought it was really interesting, especially what the speaker said about the job market.

HUGO: Me too. I mean we know we're going into a really competitive field so it's obvious that we may struggle to get work.

CHANTAL: That's right – and we know we can't all have that 'dream job'.

HUGO: Yeah, but it looks like there's a whole range of ... areas of work that we hadn't even thought of – like fashion journalism, for instance.

CHANTAL: Yeah – I wasn't expecting so many career options.

HUGO: Mmm. Overall, she had quite a strong message, didn't she?

CHANTAL: She did. She kept saying things like 'I know you all think this, but ...' and then she'd tell us how it really is.

HUGO: Perhaps she thinks students are a bit narrow-minded about the industry.

CHANTAL: It was a bit harsh, though! We know it's a tough industry.

HUGO: Yeah – and we're only first years, after all. We've got a lot to learn.

CHANTAL: Exactly. Do you think our secondary-school education should have been more career-focused?

HUGO: Well, we had numerous talks on careers, which was good, but none of them were very inspiring. They could have asked more people like today's speaker to talk to us.

CHANTAL: I agree. We were told about lots of different careers – just when we needed to be, but not by the experts who really know stuff.

HUGO: So did today's talk influence your thoughts on what career you'd like to take up in the future?

CHANTAL: Well, I promised myself that I'd go through this course and keep an open mind till the end.

HUGO: But I think it's better to pick an area of the industry now and then aim to get better and better at it.

CHANTAL: Well, I think we'll just have to differ on that issue!

HUGO: One thing's for certain, though. From what she said, we'll be unpaid assistants in the industry for quite a long time.

CHANTAL: Mmm.

HUGO: I'm prepared for that, aren't you?

CHANTAL: Actually, I'm not going to accept that view.

HUGO: Really? But she knows it's the case – and everyone else says the same.

CHANTAL: That doesn't mean it has to be true for me.

HUGO: OK. Well – I hope you're right!

CHANTAL: I thought the speaker's account of her first job was fascinating.

HUGO: Yeah – she admitted she was lucky to get work being a personal dresser for a musician. She didn't even apply for the job and there she was getting paid to choose all his clothes.

CHANTAL: It must have felt amazing – though she said all she was looking for back then was experience, not financial reward.

HUGO: Mmm. And then he was so mean, telling her she was more interested in her own appearance than his!

CHANTAL: But – she did realise he was right about that, which really made me think. I'm always considering my own clothes but now I can see you should be focusing on your client!

HUGO: She obviously regretted losing the job.

CHANTAL: Well, as she said, she should have hidden her negative feelings about him, but she didn't.

HUGO: It was really brave the way she picked herself up and took that job in retail. Fancy working in a shop after that!

CHANTAL: Yeah – well, she recommended we all do it at some point. I guess as a designer you'd get to find out some useful information, like how big or small the average shopper is.

HUGO: I think that's an issue for manufacturers, not designers. However, it would be useful to know if there's a gap in the market – you know, an item that no one's stocking but that consumers are looking for.

CHANTAL: Yeah, people don't give up searching. They also take things back to the store if they aren't right.

HUGO: Yeah. Imagine you worked in an expensive shop and you found out the garments sold there were being returned because they ... fell apart in the wash!

CHANTAL: Yeah, it would be good to know that kind of thing.$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":1,"part":3,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t1-l3-q21',
    1,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
What problem did Chantal have at the start of the talk?$t$,
    $j$["A – Her view of the speaker was blocked.","B – She was unable to find an empty seat.","C – The students next to her were talking."]$j$::jsonb,
    $j${"answers":["A – Her view of the speaker was blocked."],"caseSensitive":false}$j$::jsonb,
    $t$Chantal says a tall guy sat right in front of her, and Hugo replies it is hard to see through people's heads, so her view was blocked.$t$,
    $j${"ieltsNumber":21,"ieltsType":"multiple_choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t1-l3-q22',
    2,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
What were Hugo and Chantal surprised to hear about the job market?$t$,
    $j$["A – It has become more competitive than it used to be.","B – There is more variety in it than they had realised.","C – Some areas of it are more exciting than others."]$j$::jsonb,
    $j${"answers":["B – There is more variety in it than they had realised."],"caseSensitive":false}$j$::jsonb,
    $t$Hugo mentions a whole range of areas of work they hadn't even thought of, and Chantal wasn't expecting so many career options.$t$,
    $j${"ieltsNumber":22,"ieltsType":"multiple_choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t1-l3-q23',
    3,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
Hugo and Chantal agree that the speaker's message was$t$,
    $j$["A – unfair to them at times.","B – hard for them to follow.","C – critical of the industry."]$j$::jsonb,
    $j${"answers":["A – unfair to them at times."],"caseSensitive":false}$j$::jsonb,
    $t$Chantal calls it 'a bit harsh' and Hugo agrees, adding they are only first years with a lot to learn.$t$,
    $j${"ieltsNumber":23,"ieltsType":"multiple_choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t1-l3-q24',
    4,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
What do Hugo and Chantal criticise about their school careers advice?$t$,
    $j$["A – when they received the advice","B – how much advice was given","C – who gave the advice"]$j$::jsonb,
    $j${"answers":["C – who gave the advice"],"caseSensitive":false}$j$::jsonb,
    $t$Hugo says the talks were not inspiring and more people like today's speaker should have been asked; Chantal agrees the advice came at the right time but not from the experts who really know.$t$,
    $j${"ieltsNumber":24,"ieltsType":"multiple_choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t1-l3-q25',
    5,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
When discussing their future, Hugo and Chantal disagree on$t$,
    $j$["A – which is the best career in fashion.","B – when to choose a career in fashion.","C – why they would like a career in fashion."]$j$::jsonb,
    $j${"answers":["B – when to choose a career in fashion."],"caseSensitive":false}$j$::jsonb,
    'Chantal wants to keep an open mind until the end of the course, while Hugo thinks it is better to pick an area now.',
    $j${"ieltsNumber":25,"ieltsType":"multiple_choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t1-l3-q26',
    6,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
How does Hugo feel about being an unpaid assistant?$t$,
    $j$["A – He is realistic about the practice.","B – He feels the practice is dishonest.","C – He thinks others want to change the practice."]$j$::jsonb,
    $j${"answers":["A – He is realistic about the practice."],"caseSensitive":false}$j$::jsonb,
    $t$Hugo says it is 'certain' they will be unpaid assistants for a long time and that he is prepared for that, unlike Chantal.$t$,
    $j${"ieltsNumber":26,"ieltsType":"multiple_choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t1-l3-q27',
    7,
    'multiple_choice',
    $t$Choose TWO letters, A–E — this is one of a pair; enter one correct letter here and the other in the paired question.
Which TWO mistakes did the speaker admit she made in her first job?
A being dishonest to her employer
B paying too much attention to how she looked
C expecting to become well known
D trying to earn a lot of money
E openly disliking her client$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","E"],"caseSensitive":false}$j$::jsonb,
    'The client said she was more interested in her own appearance than his and she realised he was right (B); she also admits she should have hidden her negative feelings about him but did not (E).',
    $j${"ieltsNumber":27,"ieltsType":"multiple_choice_two_answers","instruction":"Choose TWO letters.","pairWith":28}$j$::jsonb
  ),
  (
    'cam18-t1-l3-q28',
    8,
    'multiple_choice',
    $t$Choose TWO letters, A–E — this is one of a pair; enter one correct letter here and the other in the paired question.
Which TWO mistakes did the speaker admit she made in her first job?
A being dishonest to her employer
B paying too much attention to how she looked
C expecting to become well known
D trying to earn a lot of money
E openly disliking her client$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","E"],"caseSensitive":false}$j$::jsonb,
    'The client said she was more interested in her own appearance than his and she realised he was right (B); she also admits she should have hidden her negative feelings about him but did not (E).',
    $j${"ieltsNumber":28,"ieltsType":"multiple_choice_two_answers","instruction":"Choose TWO letters.","pairWith":27}$j$::jsonb
  ),
  (
    'cam18-t1-l3-q29',
    9,
    'multiple_choice',
    $t$Choose TWO letters, A–E — this is one of a pair; enter one correct letter here and the other in the paired question.
Which TWO pieces of retail information do Hugo and Chantal agree would be useful?
A the reasons people return fashion items
B how much time people have to shop for clothes
C fashion designs people want but can't find
D the best time of year for fashion buying
E the most popular fashion sizes$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["A","C"],"caseSensitive":false}$j$::jsonb,
    'Hugo suggests knowing about a gap in the market - an item no one stocks but consumers want (C); and both agree it would be good to know why garments are returned, e.g. because they fell apart in the wash (A).',
    $j${"ieltsNumber":29,"ieltsType":"multiple_choice_two_answers","instruction":"Choose TWO letters.","pairWith":30}$j$::jsonb
  ),
  (
    'cam18-t1-l3-q30',
    10,
    'multiple_choice',
    $t$Choose TWO letters, A–E — this is one of a pair; enter one correct letter here and the other in the paired question.
Which TWO pieces of retail information do Hugo and Chantal agree would be useful?
A the reasons people return fashion items
B how much time people have to shop for clothes
C fashion designs people want but can't find
D the best time of year for fashion buying
E the most popular fashion sizes$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["A","C"],"caseSensitive":false}$j$::jsonb,
    'Hugo suggests knowing about a gap in the market - an item no one stocks but consumers want (C); and both agree it would be good to know why garments are returned, e.g. because they fell apart in the wash (A).',
    $j${"ieltsNumber":30,"ieltsType":"multiple_choice_two_answers","instruction":"Choose TWO letters.","pairWith":29}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t1-p3'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Elephant translocation
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t1-p4',
  'listening',
  'challenge',
  'Elephant translocation',
  'Cambridge IELTS 18 · Test 1 · Listening Part 4 (Questions 31–40).',
  'hard',
  'audio',
  null,
  '/audio/cam18/t1-p4.mp3',
  $t$For my presentation today I want to tell you about how groups of elephants have been moved and settled in new reserves. This is known as translocation and has been carried out in Malawi in Africa in recent years. The reason this is being done is because of overpopulation of elephants in some areas.

Overpopulation is a good problem to have and not one we tend to hear about very often. In Malawi's Majete National Park the elephant population had been wiped out by poachers, who killed the elephants for their ivory. But in 2003, the park was restocked and effective law enforcement was introduced. Since then, not a single elephant has been poached. In this safe environment, the elephant population boomed. Breeding went so well that there were more elephants than the park could support.

This led to a number of problems. Firstly, there was more competition for food, which meant that some elephants were suffering from hunger. As there was a limit to the amount of food in the national park, some elephants began looking further afield. Elephants were routinely knocking down fences around the park, which then had to be repaired at a significant cost.

To solve this problem, the decision was made to move dozens of elephants from Majete National Park to Nkhotakota Wildlife Park, where there were no elephants. But, obviously, attempting to move significant numbers of elephants to a new home 300 kilometres away is quite a challenge.

So how did this translocation process work in practice?

Elephants were moved in groups of between eight and twenty, all belonging to one family. Because relationships are very important to elephants, they all had to be moved at the same time. A team of vets and park rangers flew over the park in helicopters and targeted a group, which were rounded up and directed to a designated open plain.

The vets then used darts to immobilise the elephants - this was a tricky manoeuvre, as they not only had to select the right dose of tranquiliser for different-sized elephants but they had to dart the elephants as they were running around. This also had to be done as quickly as possible so as to minimise the stress caused. As soon as the elephants began to flop onto the ground, the team moved in to take care of them.

To avoid the risk of suffocation, the team had to make sure none of the elephants were lying on their chests because their lungs could be crushed in this position. So all the elephants had to be placed on their sides. One person stayed with each elephant while they waited for the vets to do checks. It was very important to keep an eye on their breathing - if there were fewer than six breaths per minute, the elephant would need urgent medical attention. Collars were fitted to the matriarch in each group so their movements could be tracked in their new home. Measurements were taken of each elephant's tusks - elephants with large tusks would be at greater risk from poachers - and also of their feet. The elephants were then taken to a recovery area before being loaded onto trucks and transported to their new home.

The elephants translocated to Nkhotakota settled in very well and the project has generally been accepted to have been a huge success - and not just for the elephants. Employment prospects have improved enormously, contributing to rising living standards for the whole community. Poaching is no longer an issue, as former poachers are able to find more reliable sources of income. In fact, many of them volunteered to give up their weapons, as they were no longer of any use to them.

More than two dozen elephants have been born at Nkhotakota since relocation. With an area of more than 1,800 square kilometres, there's plenty of space for the elephant population to continue to grow. Their presence is also helping to rebalance Nkhotakota's damaged ecosystem and providing a sustainable conservation model, which could be replicated in other parks. All this has been a big draw for tourism, which contributes five times more than the illegal wildlife trade to GDP, and this is mainly because of the elephants. There's also been a dramatic rise in interest ...$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":1,"part":4,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t1-l4-q31',
    1,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Elephant translocation — Problems caused by elephant overpopulation
greater competition, causing hunger for elephants
damage to 31 .......... in the park$t$,
    null::jsonb,
    $j${"answers":["fences"],"caseSensitive":false}$j$::jsonb,
    'The talk says elephants were routinely knocking down fences around the park, which then had to be repaired at significant cost.',
    $j${"ieltsNumber":31,"ieltsType":"note_completion","instruction":"Write ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-l4-q32',
    2,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Elephant translocation — The translocation process
a suitable group of elephants from the same 32 .......... was selected$t$,
    null::jsonb,
    $j${"answers":["family"],"caseSensitive":false}$j$::jsonb,
    'Elephants were moved in groups of between eight and twenty, all belonging to one family.',
    $j${"ieltsNumber":32,"ieltsType":"note_completion","instruction":"Write ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-l4-q33',
    3,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Elephant translocation — The translocation process
vets and park staff made use of 33 .......... to help guide the elephants into an open plain$t$,
    null::jsonb,
    $j${"answers":["helicopters"],"caseSensitive":false}$j$::jsonb,
    'A team of vets and park rangers flew over the park in helicopters and targeted a group, which were directed to an open plain.',
    $j${"ieltsNumber":33,"ieltsType":"note_completion","instruction":"Write ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-l4-q34',
    4,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Elephant translocation — The translocation process
elephants were immobilised with tranquilisers
– this process had to be completed quickly to reduce 34 ..........$t$,
    null::jsonb,
    $j${"answers":["stress"],"caseSensitive":false}$j$::jsonb,
    'The darting had to be done as quickly as possible so as to minimise the stress caused.',
    $j${"ieltsNumber":34,"ieltsType":"note_completion","instruction":"Write ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-l4-q35',
    5,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Elephant translocation — The translocation process
– elephants had to be turned on their 35 .......... to avoid damage to their lungs$t$,
    null::jsonb,
    $j${"answers":["sides"],"caseSensitive":false}$j$::jsonb,
    'To avoid suffocation none could lie on their chests, so all the elephants had to be placed on their sides.',
    $j${"ieltsNumber":35,"ieltsType":"note_completion","instruction":"Write ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-l4-q36',
    6,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Elephant translocation — The translocation process
– elephants' 36 .......... had to be monitored constantly$t$,
    null::jsonb,
    $j${"answers":["breathing"],"caseSensitive":false}$j$::jsonb,
    'It was very important to keep an eye on their breathing - fewer than six breaths per minute meant urgent medical attention.',
    $j${"ieltsNumber":36,"ieltsType":"note_completion","instruction":"Write ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-l4-q37',
    7,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Elephant translocation — The translocation process
– tracking devices were fitted to the matriarchs
– data including the size of their tusks and 37 .......... was taken$t$,
    null::jsonb,
    $j${"answers":["feet"],"caseSensitive":false}$j$::jsonb,
    $t$Measurements were taken of each elephant's tusks and also of their feet.$t$,
    $j${"ieltsNumber":37,"ieltsType":"note_completion","instruction":"Write ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-l4-q38',
    8,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Elephant translocation — Advantages of translocation at Nkhotakota Wildlife Park
38 .......... opportunities$t$,
    null::jsonb,
    $j${"answers":["employment"],"caseSensitive":false}$j$::jsonb,
    'Employment prospects have improved enormously, contributing to rising living standards for the whole community.',
    $j${"ieltsNumber":38,"ieltsType":"note_completion","instruction":"Write ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-l4-q39',
    9,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Elephant translocation — Advantages of translocation at Nkhotakota Wildlife Park
a reduction in the number of poachers and 39 ..........$t$,
    null::jsonb,
    $j${"answers":["weapons"],"caseSensitive":false}$j$::jsonb,
    'Many former poachers volunteered to give up their weapons as they were no longer of any use to them.',
    $j${"ieltsNumber":39,"ieltsType":"note_completion","instruction":"Write ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-l4-q40',
    10,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Elephant translocation — Advantages of translocation at Nkhotakota Wildlife Park
an example of conservation that other parks can follow
an increase in 40 .......... as a contributor to GDP$t$,
    null::jsonb,
    $j${"answers":["tourism"],"caseSensitive":false}$j$::jsonb,
    'All this has been a big draw for tourism, which contributes five times more than the illegal wildlife trade to GDP.',
    $j${"ieltsNumber":40,"ieltsType":"note_completion","instruction":"Write ONE WORD ONLY."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t1-p4'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- reading · Urban farming
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-cam18-t1-urban-farming',
  'reading',
  'challenge',
  'Urban farming',
  'Cambridge IELTS 18 · Test 1 · Reading Passage 1 (Questions 1–13).',
  'medium',
  'passage',
  $t$In Paris, urban farmers are trying a soil-free approach to agriculture that uses less space and fewer resources. Could it help cities face the threats to our food supplies?

On top of a striking new exhibition hall in southern Paris, the world's largest urban rooftop farm has started to bear fruit. Strawberries that are small, intensely flavoured and resplendently red sprout abundantly from large plastic tubes. Peer inside and you see the tubes are completely hollow, the roots of dozens of strawberry plants dangling down inside them. From identical vertical tubes nearby burst row upon row of lettuces; near those are aromatic herbs, such as basil, sage and peppermint. Opposite, in narrow, horizontal trays packed not with soil but with coconut fibre, grow cherry tomatoes, shiny aubergines and brightly coloured chards.

Pascal Hardy, an engineer and sustainable development consultant, began experimenting with vertical farming and aeroponic growing towers – as the soil-free plastic tubes are known – on his Paris apartment block roof five years ago. The urban rooftop space above the exhibition hall is somewhat bigger: 14,000 square metres and almost exactly the size of a couple of football pitches. Already, the team of young urban farmers who tend it have picked, in one day, 3,000 lettuces and 150 punnets of strawberries. When the remaining two thirds of the vast open area are in production, 20 staff will harvest up to 1,000 kg of perhaps 35 different varieties of fruit and vegetables, every day. 'We're not ever, obviously, going to feed the whole city this way,' cautions Hardy. 'In the urban environment you're working with very significant practical constraints, clearly, on what you can do and where. But if enough unused space can be developed like this, there's no reason why you shouldn't eventually target maybe between 5% and 10% of consumption.'

Perhaps most significantly, however, this is a real-life showcase for the work of Hardy's flourishing urban agriculture consultancy, Agripolis, which is currently fielding enquiries from around the world to design, build and equip a new breed of soil-free inner-city farm. 'The method's advantages are many,' he says. 'First, I don't much like the fact that most of the fruit and vegetables we eat have been treated with something like 17 different pesticides, or that the intensive farming techniques that produced them are such huge generators of greenhouse gases. I don't much like the fact, either, that they've travelled an average of 2,000 refrigerated kilometres to my plate, that their quality is so poor, because the varieties are selected for their capacity to withstand such substantial journeys, or that 80% of the price I pay goes to wholesalers and transport companies, not the producers.'

Produce grown using this soil-free method, on the other hand – which relies solely on a small quantity of water, enriched with organic nutrients, pumped around a closed circuit of pipes, towers and trays – is 'produced up here, and sold locally, just down there. It barely travels at all,' Hardy says. 'You can select crop varieties for their flavour, not their resistance to the transport and storage chain, and you can pick them when they're really at their best, and not before.' No soil is exhausted, and the water that gently showers the plants' roots every 12 minutes is recycled, so the method uses 90% less water than a classic intensive farm for the same yield.

Urban farming is not, of course, a new phenomenon. Inner-city agriculture is booming from Shanghai to Detroit and Tokyo to Bangkok. Strawberries are being grown in disused shipping containers, mushrooms in underground carparks. Aeroponic farming, he says, is 'virtuous'. The equipment weighs little, can be installed on almost any flat surface and is cheap to buy: roughly €100 to €150 per square metre. It is cheap to run, too, consuming a tiny fraction of the electricity used by some techniques.

Produce grown this way typically sells at prices that, while generally higher than those of classic intensive agriculture, are lower than soil-based organic growers. There are limits to what farmers can grow this way, of course, and much of the produce is suited to the summer months. 'Root vegetables we cannot do, at least not yet,' he says. 'Radishes are OK, but carrots, potatoes, that kind of thing – the roots are simply too long. Fruit trees are obviously not an option. And beans tend to take up a lot of space for not much return.' Nevertheless, urban farming of the kind being practised in Paris is one part of a bigger and fast-changing picture that is bringing food production closer to our lives.$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"Cambridge IELTS 18","book":18,"test":1,"passage":1,"ieltsQuestionRange":"1-13","extraction":"mineru-ocr","answerKeyVerified":true,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t1-p1-q1',
    1,
    'sentence_completion',
    'Vertical tubes are used to grow strawberries, ______ and herbs.',
    null::jsonb,
    $j${"answers":["lettuces"],"caseSensitive":false}$j$::jsonb,
    $t$Para 1: 'From identical vertical tubes nearby burst row upon row of lettuces'.$t$,
    $j${"ieltsNumber":1,"ieltsType":"sentence_completion","instruction":"NO MORE THAN TWO WORDS AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t1-p1-q2',
    2,
    'sentence_completion',
    'There will eventually be a daily harvest of as much as ______ in weight of fruit and vegetables.',
    null::jsonb,
    $j${"answers":["1,000 kg"],"caseSensitive":false,"acceptedAlternatives":["1000 kg"]}$j$::jsonb,
    $t$Para 2: '20 staff will harvest up to 1,000 kg ... every day'.$t$,
    $j${"ieltsNumber":2,"ieltsType":"sentence_completion","instruction":"NO MORE THAN TWO WORDS AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t1-p1-q3',
    3,
    'sentence_completion',
    $t$It may be possible that the farm's produce will account for as much as 10% of the city's ______ overall.$t$,
    null::jsonb,
    $j${"answers":["consumption"],"caseSensitive":false,"acceptedAlternatives":["food consumption"]}$j$::jsonb,
    $t$Para 2: 'target maybe between 5% and 10% of consumption'.$t$,
    $j${"ieltsNumber":3,"ieltsType":"sentence_completion","instruction":"NO MORE THAN TWO WORDS AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t1-p1-q4',
    4,
    'sentence_completion',
    'Table — Intensive farming, Growth: a wide range of ______ is used, and the techniques pollute the air.',
    null::jsonb,
    $j${"answers":["pesticides"],"caseSensitive":false}$j$::jsonb,
    $t$Para 3: 'treated with something like 17 different pesticides'.$t$,
    $j${"ieltsNumber":4,"ieltsType":"table_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-p1-q5',
    5,
    'sentence_completion',
    'Table — Intensive farming, Selection: fruit and vegetable varieties are chosen that can survive long ______.',
    null::jsonb,
    $j${"answers":["journeys"],"caseSensitive":false}$j$::jsonb,
    $t$Para 3: 'selected for their capacity to withstand such substantial journeys'.$t$,
    $j${"ieltsNumber":5,"ieltsType":"table_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-p1-q6',
    6,
    'sentence_completion',
    'Table — Intensive farming, Sale: ______ receive very little of the overall income.',
    null::jsonb,
    $j${"answers":["producers"],"caseSensitive":false}$j$::jsonb,
    $t$Para 3: '80% of the price I pay goes to wholesalers and transport companies, not the producers'.$t$,
    $j${"ieltsNumber":6,"ieltsType":"table_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-p1-q7',
    7,
    'sentence_completion',
    'Table — Aeroponic urban farming, Selection: produce is chosen because of its ______.',
    null::jsonb,
    $j${"answers":["flavour"],"caseSensitive":false,"acceptedAlternatives":["flavor"]}$j$::jsonb,
    $t$Para 4: 'select crop varieties for their flavour'.$t$,
    $j${"ieltsNumber":7,"ieltsType":"table_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-p1-q8',
    8,
    'true_false_not_given',
    'Urban farming can take place above or below ground.',
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["True"],"caseSensitive":false}$j$::jsonb,
    $t$Para 5: rooftop farms plus 'mushrooms in underground carparks'.$t$,
    $j${"ieltsNumber":8,"ieltsType":"true_false_not_given"}$j$::jsonb
  ),
  (
    'cam18-t1-p1-q9',
    9,
    'true_false_not_given',
    'Some of the equipment used in aeroponic farming can be made by hand.',
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["Not Given"],"caseSensitive":false}$j$::jsonb,
    'The passage never mentions hand-made equipment.',
    $j${"ieltsNumber":9,"ieltsType":"true_false_not_given"}$j$::jsonb
  ),
  (
    'cam18-t1-p1-q10',
    10,
    'true_false_not_given',
    'Urban farming relies more on electricity than some other types of farming.',
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["False"],"caseSensitive":false}$j$::jsonb,
    $t$Para 5: it consumes 'a tiny fraction of the electricity used by some techniques'.$t$,
    $j${"ieltsNumber":10,"ieltsType":"true_false_not_given"}$j$::jsonb
  ),
  (
    'cam18-t1-p1-q11',
    11,
    'true_false_not_given',
    'Fruit and vegetables grown on an aeroponic urban farm are cheaper than traditionally grown organic produce.',
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["True"],"caseSensitive":false}$j$::jsonb,
    $t$Para 6: prices are 'lower than soil-based organic growers'.$t$,
    $j${"ieltsNumber":11,"ieltsType":"true_false_not_given"}$j$::jsonb
  ),
  (
    'cam18-t1-p1-q12',
    12,
    'true_false_not_given',
    'Most produce can be grown on an aeroponic urban farm at any time of the year.',
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["False"],"caseSensitive":false}$j$::jsonb,
    $t$Para 6: 'much of the produce is suited to the summer months'.$t$,
    $j${"ieltsNumber":12,"ieltsType":"true_false_not_given"}$j$::jsonb
  ),
  (
    'cam18-t1-p1-q13',
    13,
    'true_false_not_given',
    'Beans take longer to grow on an urban farm than other vegetables.',
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["Not Given"],"caseSensitive":false}$j$::jsonb,
    $t$Para 6 only says beans 'take up a lot of space', not that they take longer to grow.$t$,
    $j${"ieltsNumber":13,"ieltsType":"true_false_not_given"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-cam18-t1-urban-farming'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- reading · Forest management in Pennsylvania, USA
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-cam18-t1-forest-management',
  'reading',
  'challenge',
  'Forest management in Pennsylvania, USA',
  'Cambridge IELTS 18 · Test 1 · Reading Passage 2 (Questions 14–26).',
  'medium',
  'passage',
  $t$How managing low-quality wood (also known as low-use wood) for bioenergy can encourage sustainable forest management

A  A tree's 'value' depends on several factors including its species, size, form, condition, quality, function, and accessibility, and depends on the management goals for a given forest. The same tree can be valued very differently by each person who looks at it. A large, straight black cherry tree has high value as timber to be cut into logs or made into furniture, but for a landowner more interested in wildlife habitat, the real value of that stem (or trunk) may be the food it provides to animals. Likewise, if the tree suffers from black knot disease, its value for timber decreases, but to a woodworker interested in making bowls, it brings an opportunity for a unique and beautiful piece of art.

B  In the past, Pennsylvania landowners were solely interested in the value of their trees as high-quality timber. The norm was to remove the stems of highest quality and leave behind poorly formed trees that were not as well suited to the site where they grew. This practice, called 'high-grading', has left a legacy of 'low-use wood' in the forests. Some people even call these 'junk trees', and they are abundant in Pennsylvania. These trees have lower economic value for traditional timber markets, compete for growth with higher-value trees, shade out desirable regeneration and decrease the health of a stand* leaving it more vulnerable to poor weather and disease. Management that specifically targets low-use wood can help landowners manage these forest health issues, and wood energy markets help promote this.

C  Wood energy markets can accept less expensive wood material of lower quality than would be suitable for traditional timber markets. Most wood used for energy in Pennsylvania is used to produce heat or electricity through combustion. Many schools and hospitals use wood boiler systems to heat and power their facilities, many homes are primarily heated with wood, and some coal plants incorporate wood into their coal streams to produce electricity. Wood can also be gasified for electrical generation and can even be made into liquid fuels like ethanol and gasoline for lorries and cars. All these products are made primarily from low-use wood. Several tree- and plant-cutting approaches, which could greatly improve the long-term quality of a forest, focus strongly or solely on the use of wood for those markets.

D  One such approach is called a Timber Stand Improvement (TSI) Cut. In a TSI Cut, really poor-quality tree and plant material is cut down to allow more space, light, and other resources to the highest-valued stems that remain. Removing invasive plants might be another primary goal of a TSI Cut. The stems that are left behind might then grow in size and develop more foliage and larger crowns or tops that produce more coverage for wildlife; they have a better chance to regenerate in a less crowded environment. TSI Cuts can be tailored to one farmer's specific management goals for his or her land.

E  Another approach that might yield a high amount of low-use wood is a Salvage Cut. With the many pests and pathogens visiting forests including hemlock wooly adelgid, Asian longhorned beetle, emerald ash borer, and gypsy moth, to name just a few, it is important to remember that those working in the forests can help ease these issues through cutting procedures. These types of cut reduce the number of sick trees and seek to manage the future spread of a pest problem. They leave vigorous trees that have stayed healthy enough to survive the outbreak.

F  A Shelterwood Cut, which only takes place in a mature forest that has already been thinned several times, involves removing all the mature trees when other seedlings have become established. This then allows the forester to decide which tree species are regenerated. It leaves a young forest where all trees are at a similar point in their growth. It can also be used to develop a two-tier forest so that there are two harvests and the money that comes in is spread out over a decade or more.

G  Thinnings and dense and dead wood removal for fire prevention also center on the production of low-use wood. However, it is important to remember that some retention of what many would classify as low-use wood is very important. The tops of trees that have been cut down should be left on the site so that their nutrients cycle back into the soil. In addition, trees with many cavities are extremely important habitats for insect predators like woodpeckers, bats and small mammals. They help control problem insects and increase the health and resilience of the forest. It is also important to remember that not all small trees are low-use. For example, many species like hawthorn provide food for wildlife. Finally, rare species of trees in a forest should also stay behind as they add to its structural diversity.

* stand – an area covered with trees that have common features (e.g. size)$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"Cambridge IELTS 18","book":18,"test":1,"passage":2,"ieltsQuestionRange":"14-26","extraction":"mineru-ocr","answerKeyVerified":true,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t1-p2-q14',
    1,
    'multiple_choice',
    $t$Which paragraph contains the following information? Choose A–G.
bad outcomes for a forest when people focus only on its financial reward$t$,
    $j$["A","B","C","D","E","F","G"]$j$::jsonb,
    $j${"answers":["B"],"caseSensitive":false}$j$::jsonb,
    'Paragraph B describes how high-grading (removing only the best timber) left a legacy of poor forest health.',
    $j${"ieltsNumber":14,"ieltsType":"matching_information","note":"NB You may use any letter more than once."}$j$::jsonb
  ),
  (
    'cam18-t1-p2-q15',
    2,
    'multiple_choice',
    $t$Which paragraph contains the following information? Choose A–G.
reference to the aspects of any tree that contribute to its worth$t$,
    $j$["A","B","C","D","E","F","G"]$j$::jsonb,
    $j${"answers":["A"],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph A lists the factors (species, size, form, condition, quality, function, accessibility) behind a tree's value.$t$,
    $j${"ieltsNumber":15,"ieltsType":"matching_information","note":"NB You may use any letter more than once."}$j$::jsonb
  ),
  (
    'cam18-t1-p2-q16',
    3,
    'multiple_choice',
    $t$Which paragraph contains the following information? Choose A–G.
mention of the potential use of wood to help run vehicles$t$,
    $j$["A","B","C","D","E","F","G"]$j$::jsonb,
    $j${"answers":["C"],"caseSensitive":false}$j$::jsonb,
    'Paragraph C notes wood can be made into liquid fuels like ethanol and gasoline for lorries and cars.',
    $j${"ieltsNumber":16,"ieltsType":"matching_information","note":"NB You may use any letter more than once."}$j$::jsonb
  ),
  (
    'cam18-t1-p2-q17',
    4,
    'multiple_choice',
    $t$Which paragraph contains the following information? Choose A–G.
examples of insects that attack trees$t$,
    $j$["A","B","C","D","E","F","G"]$j$::jsonb,
    $j${"answers":["E"],"caseSensitive":false}$j$::jsonb,
    'Paragraph E names hemlock wooly adelgid, Asian longhorned beetle, emerald ash borer and gypsy moth.',
    $j${"ieltsNumber":17,"ieltsType":"matching_information","note":"NB You may use any letter more than once."}$j$::jsonb
  ),
  (
    'cam18-t1-p2-q18',
    5,
    'multiple_choice',
    $t$Which paragraph contains the following information? Choose A–G.
an alternative name for trees that produce low-use wood$t$,
    $j$["A","B","C","D","E","F","G"]$j$::jsonb,
    $j${"answers":["B"],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph B says people even call low-use-wood trees 'junk trees'.$t$,
    $j${"ieltsNumber":18,"ieltsType":"matching_information","note":"NB You may use any letter more than once."}$j$::jsonb
  ),
  (
    'cam18-t1-p2-q19',
    6,
    'multiple_choice',
    $t$Which type of timber cut does each description refer to?
to remove trees that are diseased$t$,
    $j$["A – a TSI Cut","B – a Salvage Cut","C – a Shelterwood Cut"]$j$::jsonb,
    $j${"answers":["B – a Salvage Cut"],"caseSensitive":false}$j$::jsonb,
    'A Salvage Cut (B, paragraph E) reduces the number of sick trees.',
    $j${"ieltsNumber":19,"ieltsType":"matching","note":"NB You may use any letter more than once."}$j$::jsonb
  ),
  (
    'cam18-t1-p2-q20',
    7,
    'multiple_choice',
    $t$Which type of timber cut does each description refer to?
to generate income across a number of years$t$,
    $j$["A – a TSI Cut","B – a Salvage Cut","C – a Shelterwood Cut"]$j$::jsonb,
    $j${"answers":["C – a Shelterwood Cut"],"caseSensitive":false}$j$::jsonb,
    'A Shelterwood Cut (C, paragraph F) spreads the money from two harvests over a decade or more.',
    $j${"ieltsNumber":20,"ieltsType":"matching","note":"NB You may use any letter more than once."}$j$::jsonb
  ),
  (
    'cam18-t1-p2-q21',
    8,
    'multiple_choice',
    $t$Which type of timber cut does each description refer to?
to create a forest whose trees are close in age$t$,
    $j$["A – a TSI Cut","B – a Salvage Cut","C – a Shelterwood Cut"]$j$::jsonb,
    $j${"answers":["C – a Shelterwood Cut"],"caseSensitive":false}$j$::jsonb,
    'A Shelterwood Cut (C, paragraph F) leaves a young forest where all trees are at a similar point in their growth.',
    $j${"ieltsNumber":21,"ieltsType":"matching","note":"NB You may use any letter more than once."}$j$::jsonb
  ),
  (
    'cam18-t1-p2-q22',
    9,
    'sentence_completion',
    'Some dead wood is removed to avoid the possibility of ______ .',
    null::jsonb,
    $j${"answers":["fire"],"caseSensitive":false}$j$::jsonb,
    'Paragraph G: dead wood removal is for fire prevention.',
    $j${"ieltsNumber":22,"ieltsType":"sentence_completion","instruction":"Choose ONE WORD ONLY from the passage."}$j$::jsonb
  ),
  (
    'cam18-t1-p2-q23',
    10,
    'sentence_completion',
    'The ______ from the tops of cut trees can help improve soil quality.',
    null::jsonb,
    $j${"answers":["nutrients"],"caseSensitive":false}$j$::jsonb,
    'Paragraph G: the tops should be left so that their nutrients cycle back into the soil.',
    $j${"ieltsNumber":23,"ieltsType":"sentence_completion","instruction":"Choose ONE WORD ONLY from the passage."}$j$::jsonb
  ),
  (
    'cam18-t1-p2-q24',
    11,
    'sentence_completion',
    'Some damaged trees should be left, as their ______ provide habitats for a range of creatures.',
    null::jsonb,
    $j${"answers":["cavities"],"caseSensitive":false}$j$::jsonb,
    'Paragraph G: trees with many cavities are important habitats for insect predators.',
    $j${"ieltsNumber":24,"ieltsType":"sentence_completion","instruction":"Choose ONE WORD ONLY from the passage."}$j$::jsonb
  ),
  (
    'cam18-t1-p2-q25',
    12,
    'sentence_completion',
    'Some trees that are small, such as ______ , are a source of food for animals and insects.',
    null::jsonb,
    $j${"answers":["hawthorn"],"caseSensitive":false}$j$::jsonb,
    'Paragraph G: many species like hawthorn provide food for wildlife.',
    $j${"ieltsNumber":25,"ieltsType":"sentence_completion","instruction":"Choose ONE WORD ONLY from the passage."}$j$::jsonb
  ),
  (
    'cam18-t1-p2-q26',
    13,
    'sentence_completion',
    'Any trees that are ______ should be left to grow, as they add to the variety of species in the forest.',
    null::jsonb,
    $j${"answers":["rare"],"caseSensitive":false}$j$::jsonb,
    'Paragraph G: rare species of trees should stay behind as they add to structural diversity.',
    $j${"ieltsNumber":26,"ieltsType":"sentence_completion","instruction":"Choose ONE WORD ONLY from the passage."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-cam18-t1-forest-management'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- reading · Conquering Earth's space junk problem
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-cam18-t1-space-junk',
  'reading',
  'challenge',
  $t$Conquering Earth's space junk problem$t$,
  'Cambridge IELTS 18 · Test 1 · Reading Passage 3 (Questions 27–40).',
  'hard',
  'passage',
  $t$Satellites, rocket shards and collision debris are creating major traffic risks in orbit around the planet. Researchers are working to reduce these threats.

A  Last year, commercial companies, military and civil departments and amateurs sent more than 400 satellites into orbit, over four times the yearly average in the previous decade. Numbers could rise even more sharply if leading space companies follow through on plans to deploy hundreds to thousands of large constellations of satellites to space in the next few years. All that traffic can lead to disaster. Ten years ago, a US commercial Iridium satellite smashed into an inactive Russian communications satellite called Cosmos-2251, creating thousands of new pieces of space shrapnel that now threaten other satellites in low Earth orbit – the zone stretching up to 2,000 kilometres in altitude. Altogether, there are roughly 20,000 human-made objects in orbit, from working satellites to small rocket pieces. And satellite operators can't steer away from every potential crash, because each move consumes time and fuel that could otherwise be used for the spacecraft's main job.

B  Concern about space junk goes back to the beginning of the satellite era, but the number of objects in orbit is rising so rapidly that researchers are investigating new ways of attacking the problem. Several teams are trying to improve methods for assessing what is in orbit, so that satellite operators can work more efficiently in ever-more-crowded space. Some researchers are now starting to compile a massive data set that includes the best possible information on where everything is in orbit. Others are developing taxonomies of space debris – working on measuring properties such as the shape and size of an object, so that satellite operators know how much to worry about what's coming their way. The alternative, many say, is unthinkable. Just a few uncontrolled space crashes could generate enough debris to set off a runaway cascade of fragments, rendering near-Earth space unusable. 'If we go on like this, we will reach a point of no return,' says Carolin Frueh, an astrodynamical researcher at Purdue University in West Lafayette, Indiana.

C  Even as our ability to monitor space objects increases, so too does the total number of items in orbit. That means companies, governments and other players in space are collaborating in new ways to avoid a shared threat. International groups such as the Inter-Agency Space Debris Coordination Committee have developed guidelines on space sustainability. Those include inactivating satellites at the end of their useful life by venting pressurised materials or leftover fuel that might lead to explosions. The intergovernmental groups also advise lowering satellites deep enough into the atmosphere that they will burn up or disintegrate within 25 years. But so far, only about half of all missions have abided by this 25-year goal, says Holger Krag, head of the European Space Agency's space-debris office in Darmstadt, Germany. Operators of the planned large constellations of satellites say they will be responsible stewards in their enterprises in space, but Krag worries that problems could increase, despite their best intentions. 'What happens to those that fail or go bankrupt?' he asks. 'They are probably not going to spend money to remove their satellites from space.'

D  In theory, given the vastness of space, satellite operators should have plenty of room for all these missions to fly safely without ever nearing another object. So some scientists are tackling the problem of space junk by trying to find out where all the debris is to a high degree of precision. That would alleviate the need for many of the unnecessary manoeuvres that are carried out to avoid potential collisions. 'If you knew precisely where everything was, you would almost never have a problem,' says Marlon Sorge, a space-debris specialist at the Aerospace Corporation in El Segundo, California.

E  The field is called space traffic management, because it's similar to managing traffic on the roads or in the air. Think about a busy day at an airport, says Moriba Jah, an astrodynamicist at the University of Texas at Austin: planes line up in the sky, landing and taking off close to one another in a carefully choreographed routine. Air-traffic controllers know the location of the planes down to one metre in accuracy. The same can't be said for space debris. Not all objects in orbit are known, and even those included in databases are not tracked consistently.

F  An additional problem is that there is no authoritative catalogue that accurately lists the orbits of all known space debris. Jah illustrates this with a web-based database that he has developed. It draws on several sources, such as catalogues maintained by the US and Russian governments, to visualise where objects are in space. When he types in an identifier for a particular space object, the database draws a purple line to designate its orbit. Only this doesn't quite work for a number of objects, such as a Russian rocket body designated in the database as object number 32280. When Jah enters that number, the database draws two purple lines: the US and Russian sources contain two completely different orbits for the same object. Jah says that it is almost impossible to tell which is correct, unless a third source of information made it possible to cross-correlate. Jah describes himself as a space environmentalist: 'I want to make space a place that is safe to operate, that is free and useful for generations to come.' Until that happens, he argues, the space community will continue devolving into a tragedy in which all spaceflight operators are polluting a common resource.$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"Cambridge IELTS 18","book":18,"test":1,"passage":3,"ieltsQuestionRange":"27-40","extraction":"mineru-ocr","answerKeyVerified":true,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t1-p3-q27',
    1,
    'multiple_choice',
    $t$Which section contains the following information?
a reference to the cooperation that takes place to try and minimise risk$t$,
    $j$["A","B","C","D","E","F"]$j$::jsonb,
    $j${"answers":["C"],"caseSensitive":false}$j$::jsonb,
    $t$Section C: 'companies, governments and other players in space are collaborating in new ways to avoid a shared threat'.$t$,
    $j${"ieltsNumber":27,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q28',
    2,
    'multiple_choice',
    $t$Which section contains the following information?
an explanation of a person's aims$t$,
    $j$["A","B","C","D","E","F"]$j$::jsonb,
    $j${"answers":["F"],"caseSensitive":false}$j$::jsonb,
    $t$Section F: Jah — 'I want to make space a place that is safe to operate, that is free and useful for generations to come'.$t$,
    $j${"ieltsNumber":28,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q29',
    3,
    'multiple_choice',
    $t$Which section contains the following information?
a description of a major collision that occurred in space$t$,
    $j$["A","B","C","D","E","F"]$j$::jsonb,
    $j${"answers":["A"],"caseSensitive":false}$j$::jsonb,
    $t$Section A: the Iridium satellite that 'smashed into an inactive Russian communications satellite called Cosmos-2251'.$t$,
    $j${"ieltsNumber":29,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q30',
    4,
    'multiple_choice',
    $t$Which section contains the following information?
a comparison between tracking objects in space and the efficiency of a transportation system$t$,
    $j$["A","B","C","D","E","F"]$j$::jsonb,
    $j${"answers":["E"],"caseSensitive":false}$j$::jsonb,
    'Section E: the airport / air-traffic-control comparison for space traffic management.',
    $j${"ieltsNumber":30,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q31',
    5,
    'multiple_choice',
    $t$Which section contains the following information?
a reference to efforts to classify space junk$t$,
    $j$["A","B","C","D","E","F"]$j$::jsonb,
    $j${"answers":["B"],"caseSensitive":false}$j$::jsonb,
    $t$Section B: 'Others are developing taxonomies of space debris – working on measuring properties such as the shape and size of an object'.$t$,
    $j${"ieltsNumber":31,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q32',
    6,
    'sentence_completion',
    'The Inter-Agency Space Debris Coordination Committee gives advice on how the ______ of space can be achieved.',
    null::jsonb,
    $j${"answers":["sustainability"],"caseSensitive":false}$j$::jsonb,
    $t$Section C: the committee 'have developed guidelines on space sustainability'.$t$,
    $j${"ieltsNumber":32,"ieltsType":"summary_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q33',
    7,
    'sentence_completion',
    'When satellites are no longer active, any unused ______ or pressurised material that could cause explosions should be removed.',
    null::jsonb,
    $j${"answers":["fuel"],"caseSensitive":false}$j$::jsonb,
    $t$Section C: 'venting pressurised materials or leftover fuel that might lead to explosions'.$t$,
    $j${"ieltsNumber":33,"ieltsType":"summary_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q34',
    8,
    'sentence_completion',
    'Any unused fuel or pressurised material that could cause ______ should be removed.',
    null::jsonb,
    $j${"answers":["explosions"],"caseSensitive":false}$j$::jsonb,
    $t$Section C: material or fuel 'that might lead to explosions'.$t$,
    $j${"ieltsNumber":34,"ieltsType":"summary_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q35',
    9,
    'sentence_completion',
    'Holger Krag points out that the operators that become ______ are unlikely to prioritise removing their satellites from space.',
    null::jsonb,
    $j${"answers":["bankrupt"],"caseSensitive":false}$j$::jsonb,
    $t$Section C: Krag asks 'What happens to those that fail or go bankrupt?'$t$,
    $j${"ieltsNumber":35,"ieltsType":"summary_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q36',
    10,
    'multiple_choice',
    $t$Which person is associated with the following statement?
Knowing the exact location of space junk would help prevent any possible danger.$t$,
    $j$["A – Carolin Frueh","B – Holger Krag","C – Marlon Sorge","D – Moriba Jah"]$j$::jsonb,
    $j${"answers":["C – Marlon Sorge"],"caseSensitive":false}$j$::jsonb,
    $t$Section D: Sorge — 'If you knew precisely where everything was, you would almost never have a problem'.$t$,
    $j${"ieltsNumber":36,"ieltsType":"matching_features","note":"A letter may be used more than once."}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q37',
    11,
    'multiple_choice',
    $t$Which person is associated with the following statement?
Space should be available to everyone and should be preserved for the future.$t$,
    $j$["A – Carolin Frueh","B – Holger Krag","C – Marlon Sorge","D – Moriba Jah"]$j$::jsonb,
    $j${"answers":["D – Moriba Jah"],"caseSensitive":false}$j$::jsonb,
    $t$Section F: Jah — space should be 'free and useful for generations to come'.$t$,
    $j${"ieltsNumber":37,"ieltsType":"matching_features","note":"A letter may be used more than once."}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q38',
    12,
    'multiple_choice',
    $t$Which person is associated with the following statement?
A recommendation regarding satellites is widely ignored.$t$,
    $j$["A – Carolin Frueh","B – Holger Krag","C – Marlon Sorge","D – Moriba Jah"]$j$::jsonb,
    $j${"answers":["B – Holger Krag"],"caseSensitive":false}$j$::jsonb,
    $t$Section C: Krag — 'only about half of all missions have abided by this 25-year goal'.$t$,
    $j${"ieltsNumber":38,"ieltsType":"matching_features","note":"A letter may be used more than once."}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q39',
    13,
    'multiple_choice',
    $t$Which person is associated with the following statement?
There is conflicting information about where some satellites are in space.$t$,
    $j$["A – Carolin Frueh","B – Holger Krag","C – Marlon Sorge","D – Moriba Jah"]$j$::jsonb,
    $j${"answers":["D – Moriba Jah"],"caseSensitive":false}$j$::jsonb,
    $t$Section F: Jah — for object 32280 'the US and Russian sources contain two completely different orbits for the same object'.$t$,
    $j${"ieltsNumber":39,"ieltsType":"matching_features","note":"A letter may be used more than once."}$j$::jsonb
  ),
  (
    'cam18-t1-p3-q40',
    14,
    'multiple_choice',
    $t$Which person is associated with the following statement?
There is a risk we will not be able to undo the damage that occurs in space.$t$,
    $j$["A – Carolin Frueh","B – Holger Krag","C – Marlon Sorge","D – Moriba Jah"]$j$::jsonb,
    $j${"answers":["A – Carolin Frueh"],"caseSensitive":false}$j$::jsonb,
    $t$Section B: Frueh — 'If we go on like this, we will reach a point of no return'.$t$,
    $j${"ieltsNumber":40,"ieltsType":"matching_features","note":"A letter may be used more than once."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-cam18-t1-space-junk'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- writing · Cambridge 18 · Test 1 · Writing
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'writing-cam18-t1',
  'writing',
  'progressive',
  'Cambridge 18 · Test 1 · Writing',
  'Cambridge IELTS 18 · Test 1 · Writing Task 1 & Task 2.',
  'medium',
  'writing_prompt',
  null,
  null,
  null,
  '/images/cam18/t1-writing-task1.jpg',
  3600,
  $j${"source":"cambridge-ielts-18","test":1,"paper":"writing","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t1-writing-q1',
    1,
    'writing_task',
    $t$You should spend about 20 minutes on this task.

The graph below shows the percentage of the population living in cities in four Asian countries from 1970 to 2020, with predictions for 2030 and 2040.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Task 1 report. Assessed on task achievement, coherence, lexical resource, and grammar rather than an exact answer.',
    $j${"ieltsNumber":1,"ieltsType":"writing_task_1","taskType":"task_1","wordTarget":150}$j$::jsonb
  ),
  (
    'cam18-t1-writing-q2',
    2,
    'writing_task',
    $t$You should spend about 40 minutes on this task.

Write about the following topic:

The most important aim of science should be to improve people's lives.

To what extent do you agree or disagree?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Task 2 essay. Assessed on task response, coherence, lexical resource, and grammar rather than an exact answer.',
    $j${"ieltsNumber":2,"ieltsType":"writing_task_2","taskType":"task_2","wordTarget":250}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'writing-cam18-t1'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- speaking · Cambridge 18 · Test 1 · Speaking
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'speaking-cam18-t1',
  'speaking',
  'progressive',
  'Cambridge 18 · Test 1 · Speaking',
  'Cambridge IELTS 18 · Test 1 · Speaking Parts 1–3.',
  'medium',
  'speaking_prompt',
  null,
  null,
  null,
  null,
  840,
  $j${"source":"cambridge-ielts-18","test":1,"paper":"speaking","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t1-speaking-q1',
    1,
    'speaking_response',
    $t$Part 1 (Interview) — Topic: Paying bills

- What kinds of bills do you have to pay?
- How do you usually pay your bills – in cash or by another method? [Why?]
- Have you ever forgotten to pay a bill? [Why/Why not?]
- Is there anything you could do to make your bills cheaper? [Why/Why not?]$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Part 1 answers should be short, direct and personal. Assessed on fluency, vocabulary, grammar and pronunciation rather than an exact answer.',
    $j${"ieltsType":"speaking_part_1","part":1}$j$::jsonb
  ),
  (
    'cam18-t1-speaking-q2',
    2,
    'speaking_response',
    $t$Part 2 (Long turn) — Cue card

Describe some food or drink that you learned to prepare.

You should say:
- what food or drink you learned to prepare
- when and where you learned to prepare this
- how you learned to prepare this
- and explain how you felt about learning to prepare this food or drink.

You will have to talk about the topic for one to two minutes. You have one minute to think about what you are going to say. You can make some notes to help you if you wish.$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Speak for 1–2 minutes after 1 minute of preparation. Assessed on fluency, coherence, vocabulary, grammar and pronunciation.',
    $j${"ieltsType":"speaking_part_2","part":2,"prepSeconds":60,"responseSeconds":120}$j$::jsonb
  ),
  (
    'cam18-t1-speaking-q3',
    3,
    'speaking_response',
    $t$Part 3 (Discussion)

Young people and cooking
- What kinds of things can children learn to cook?
- Do you think it is important for children to learn to cook?
- Do you think young people should learn to cook at home or at school?

Working as a chef
- How enjoyable do you think it would be to work as a professional chef?
- What skills does a person need to be a great chef?
- How much influence do celebrity/TV chefs have on what ordinary people cook?$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Part 3 answers should be developed with reasons and examples. Assessed on the ability to discuss abstract ideas, plus fluency, vocabulary, grammar and pronunciation.',
    $j${"ieltsType":"speaking_part_3","part":3}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'speaking-cam18-t1'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Working at Milo's Restaurants
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t2-p1',
  'listening',
  'challenge',
  $t$Working at Milo's Restaurants$t$,
  'Cambridge IELTS 18 · Test 2 · Listening Part 1 (Questions 1–10).',
  'medium',
  'audio',
  null,
  '/audio/cam18/t2-p1.mp3',
  $t$WOMAN: So, I understand you're interested in restaurant work?
MAN: Yes. I've got a bit of experience and I can provide references.
WOMAN: That's good. I can check all that later. Now, Milo's Restaurants have some vacancies at the moment. They're a really good company to work for. Lots of benefits.
MAN: Oh right.
WOMAN: Yes. They've got a very good reputation for looking after staff. For example, all employees get training - even temporary staff.
MAN: Oh really? That's quite unusual, isn't it?
WOMAN: Certainly is.
MAN: And do staff get free uniforms too?
WOMAN: Um ... you just need to wear a white T-shirt and black trousers, it says here. So I guess not ... But another benefit of working for a big company like this is that you can get a discount at any of their restaurants.
MAN: Even at weekends?
WOMAN: No, but you'll be working then anyway.
MAN: Oh yes. I suppose so. Most of their restaurants are in the city centre, aren't they? So, easy to get to by bus?
WOMAN: Yes. That's right. But if you have to do a late shift and finish work after midnight, the company will pay for you to get a taxi home.
MAN: I probably won't need one. I think I'd use my bike.
WOMAN: OK. Now, they do have some quite specific requirements for the kind of person they're looking for. Milo's is a young, dynamic company and they're really keen on creating a strong team. It's really important that you can fit in and get on well with everyone.
MAN: Yeah. I've got no problem with that. It sounds good, actually. The last place I worked for was quite demanding too. We had to make sure we gave a really high level of service.
WOMAN: That's good to hear because that will be equally important at Milo's. I know they want people who have an eye for detail.
MAN: That's fine. I'm very used to working in that kind of environment.
WOMAN: Perfect. So the only other thing that's required is good communication skills, so you'll need to have a certificate in English.
MAN: Sure.
WOMAN: OK. Let's have a look at the current job vacancies at Milo's. The first one is in Wivenhoe Street.
MAN: Sorry, where?
WOMAN: Wivenhoe. W-I-V-E-N-H-O-E. It's quite central, just off Cork Street.
MAN: Oh right.
WOMAN: They're looking for a breakfast supervisor.
MAN: That would be OK.
WOMAN: So you're probably familiar with the kind of responsibilities involved. Obviously checking that all the portions are correct, etc., and then things like checking all the equipment is clean.
MAN: OK. And what about the salary? In my last job I was getting £9.50 per hour. I was hoping to get a bit more than that.
WOMAN: Well, to begin with, you'd be getting £9.75, but that goes up to £11.25 after three months.
MAN: That's not too bad. And I suppose it's a very early start?
WOMAN: Mmm. That's the only unattractive thing about this job. But then you have the afternoons and evenings free. So the restaurant starts serving breakfast from 7 a.m. And you'd have to be there at 5.30 to set everything up. But you'd be finished at 12.30.
MAN: Mmm. Well, as you say, there are advantages to that.
WOMAN: Now, you might also be interested in the job at the City Road branch. That's for a junior chef, so again a position of responsibility.
MAN: I might prefer that, actually.
WOMAN: Right, well obviously this role would involve supporting the sous chef and other senior staff. And you'd be responsible for making sure there's enough stock each week - and sorting out all the deliveries.
MAN: I've never done that before, but I imagine it's fairly straightforward, once you get the hang of it.
WOMAN: Yes, and you'd be working alongside more experienced staff to begin with, so I'm sure it wouldn't be a problem. The salary's slightly higher here. It's an annual salary of £23,000.
MAN: Right.
WOMAN: I know that if they like you, it's likely you'll be promoted quite quickly. So that's worth thinking about.
MAN: Yes. It does sound interesting. What are the hours like?
WOMAN: The usual, I think. There's a lot of evening and weekend work, but they're closed on Mondays. But you do get one Sunday off every four weeks. So would you like me to send off your ...$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":2,"part":1,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t2-l1-q1',
    1,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Working at Milo's Restaurants
Benefits
1 __________ provided for all staff$t$,
    null::jsonb,
    $j${"answers":["training"],"caseSensitive":false}$j$::jsonb,
    $t$The adviser says Milo's has a good reputation for looking after staff: 'all employees get training - even temporary staff'.$t$,
    $j${"ieltsNumber":1,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l1-q2',
    2,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
2 __________ during weekdays at all Milo's Restaurants$t$,
    null::jsonb,
    $j${"answers":["discount"],"caseSensitive":false}$j$::jsonb,
    $t$Another benefit of working for a big company 'is that you can get a discount at any of their restaurants' - but not at weekends.$t$,
    $j${"ieltsNumber":2,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l1-q3',
    3,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
3 __________ provided after midnight$t$,
    null::jsonb,
    $j${"answers":["taxi"],"caseSensitive":false}$j$::jsonb,
    $t$If you finish work after midnight, 'the company will pay for you to get a taxi home'.$t$,
    $j${"ieltsNumber":3,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l1-q4',
    4,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Person specification
must be prepared to work well in a team
must care about maintaining a high standard of 4 __________$t$,
    null::jsonb,
    $j${"answers":["service"],"caseSensitive":false}$j$::jsonb,
    $t$The man says at his last job 'we gave a really high level of service', and the adviser confirms that will be equally important at Milo's.$t$,
    $j${"ieltsNumber":4,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l1-q5',
    5,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
must have a qualification in 5 __________$t$,
    null::jsonb,
    $j${"answers":["English"],"caseSensitive":false}$j$::jsonb,
    $t$Good communication skills are required, so 'you'll need to have a certificate in English'.$t$,
    $j${"ieltsNumber":5,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l1-q6',
    6,
    'sentence_completion',
    $t$Complete the table below. Write ONE WORD AND/OR A NUMBER for each answer.
Location / Job title: 6 __________ Street - Breakfast supervisor$t$,
    null::jsonb,
    $j${"answers":["Wivenhoe"],"caseSensitive":false}$j$::jsonb,
    $t$The first vacancy is in Wivenhoe Street, spelled out as 'W-I-V-E-N-H-O-E'.$t$,
    $j${"ieltsNumber":6,"ieltsType":"table completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t2-l1-q7',
    7,
    'sentence_completion',
    $t$Complete the table below. Write ONE WORD AND/OR A NUMBER for each answer.
Breakfast supervisor - responsibilities include: checking portions, etc. are correct; making sure 7 __________ is clean$t$,
    null::jsonb,
    $j${"answers":["equipment"],"caseSensitive":false}$j$::jsonb,
    $t$Responsibilities are 'checking that all the portions are correct, etc., and then things like checking all the equipment is clean'.$t$,
    $j${"ieltsNumber":7,"ieltsType":"table completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t2-l1-q8',
    8,
    'sentence_completion',
    $t$Complete the table below. Write ONE WORD AND/OR A NUMBER for each answer.
Breakfast supervisor - pay and conditions: starting salary 8 £__________ per hour; start work at 5.30 a.m.$t$,
    null::jsonb,
    $j${"answers":["9.75"],"caseSensitive":false,"acceptedAlternatives":["£9.75"]}$j$::jsonb,
    $t$The adviser says 'to begin with, you'd be getting £9.75, but that goes up to £11.25 after three months'.$t$,
    $j${"ieltsNumber":8,"ieltsType":"table completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t2-l1-q9',
    9,
    'sentence_completion',
    $t$Complete the table below. Write ONE WORD AND/OR A NUMBER for each answer.
City Road - Junior chef - responsibilities include: supporting senior chefs; maintaining stock and organising 9 __________$t$,
    null::jsonb,
    $j${"answers":["deliveries"],"caseSensitive":false}$j$::jsonb,
    $t$The junior chef would make sure there's enough stock each week 'and sorting out all the deliveries'.$t$,
    $j${"ieltsNumber":9,"ieltsType":"table completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t2-l1-q10',
    10,
    'sentence_completion',
    $t$Complete the table below. Write ONE WORD AND/OR A NUMBER for each answer.
City Road - Junior chef - pay and conditions: annual salary £23,000; no work on a 10 __________ once a month$t$,
    null::jsonb,
    $j${"answers":["Sunday"],"caseSensitive":false}$j$::jsonb,
    $t$There is a lot of evening and weekend work, but 'you do get one Sunday off every four weeks'.$t$,
    $j${"ieltsNumber":10,"ieltsType":"table completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t2-p1'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · The new housing development near Nunston
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t2-p2',
  'listening',
  'challenge',
  'The new housing development near Nunston',
  'Cambridge IELTS 18 · Test 2 · Listening Part 2 (Questions 11–20).',
  'medium',
  'audio',
  null,
  '/audio/cam18/t2-p2.mp3',
  $t$Hello everyone. It's good to see that so many members of the public have shown up for our presentation on the new housing development planned on the outskirts of Nunston. I'm Mark Reynolds and I'm Communications Manager at the development.

I'll start by giving you a brief overview of our plans for the development. So one thing I'm sure you'll want to know is why we've selected this particular site for a housing development. At present it's being used for farming, like much of the land around Nunston. But because of the new industrial centre in Nunston, there's a lot of demand for housing for employees in the region, as many employees are having to commute long distances at present. Of course, there's also the fact that we have an international airport just 20 minutes' drive away, but although that's certainly convenient, it wasn't one of our major criteria for choosing the site. We were more interested in the fact that there's an excellent hospital just 15 kilometres away, and a large secondary school even closer than that. One drawback to the site is that it's on quite a steep slope, but we've taken account of that in our planning so it shouldn't be a major problem.

We've had a lot of positive feedback about the plans. People like the wide variety of accommodation types and prices, and the fact that it's only a short drive to get out into the countryside from the development. We were particularly pleased that so many people liked the designs for the layout of the development, with the majority of people saying it generally made a good impression and blended in well with the natural features of the landscape, with provision made for protecting trees and wildlife on the site. Some people have mentioned that they'd like to see more facilities for cyclists, and we'll look at that, but the overall feedback has been that the design and facilities of the development make it seem a place where people of all ages can live together happily.

OK. So I'll put a map of the proposed development up on the screen. You'll see it's bounded on the south side by the main road, which then goes on to Nunston. Another boundary is formed by London Road, on the western side of the development. Inside the development there'll be about 400 houses and 3 apartment blocks.

There'll also be a school for children up to 11 years old. If you look at the South Entrance at the bottom of the map, there's a road from there that goes right up through the development. The school will be on that road, at the corner of the second turning to the left.

A large sports centre is planned with facilities for indoor and outdoor activities. This will be on the western side of the development, just below the road that branches off from London Road.

There'll be a clinic where residents can go if they have any health problems. Can you see the lake towards the top of the map? The clinic will be just below this, to the right of a street of houses.

There'll also be a community centre for people of all ages. On the northeast side of the development, there'll be a row of specially designed houses specifically for residents over 65, and the community centre will be adjoining this.

We haven't forgotten about shopping. There'll be a supermarket between the two entrances to the development. We're planning to leave the three large trees near London Road, and it'll be just to the south of these.

It's planned to have a playground for younger children. If you look at the road that goes up from the South Entrance, you'll see it curves round to the left at the top, and the playground will be in that curve, with nice views of the lake.

OK, so now does anyone ...$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":2,"part":2,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t2-l2-q11',
    1,
    'multiple_choice',
    $t$Choose TWO letters, A-E. This is one of a pair; enter one correct letter here and the other in the paired question.
What are the TWO main reasons why this site has been chosen for the housing development?
A It has suitable geographical features.
B There is easy access to local facilities.
C It has good connections with the airport.
D The land is of little agricultural value.
E It will be convenient for workers.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","E"],"caseSensitive":false}$j$::jsonb,
    'The speaker cites demand for housing for employees who currently commute long distances (E) and an excellent hospital 15 km away plus a large secondary school even closer (B). The airport was explicitly not a major criterion.',
    $j${"ieltsNumber":11,"ieltsType":"multiple choice (choose TWO)","instruction":"Choose TWO letters.","pairWith":12}$j$::jsonb
  ),
  (
    'cam18-t2-l2-q12',
    2,
    'multiple_choice',
    $t$Choose TWO letters, A-E. This is one of a pair; enter one correct letter here and the other in the paired question.
What are the TWO main reasons why this site has been chosen for the housing development?
A It has suitable geographical features.
B There is easy access to local facilities.
C It has good connections with the airport.
D The land is of little agricultural value.
E It will be convenient for workers.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","E"],"caseSensitive":false}$j$::jsonb,
    'Same evidence as the paired question: nearby hospital and secondary school (B), and demand from industrial-centre employees who now commute long distances (E). The steep slope is called a drawback, not a suitable feature.',
    $j${"ieltsNumber":12,"ieltsType":"multiple choice (choose TWO)","instruction":"Choose TWO letters.","pairWith":11}$j$::jsonb
  ),
  (
    'cam18-t2-l2-q13',
    3,
    'multiple_choice',
    $t$Choose TWO letters, A-E. This is one of a pair; enter one correct letter here and the other in the paired question.
Which TWO aspects of the planned housing development have people given positive feedback about?
A the facilities for cyclists
B the impact on the environment
C the encouragement of good relations between residents
D the low cost of all the accommodation
E the rural location$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","C"],"caseSensitive":false}$j$::jsonb,
    'People said the layout blended in with the natural landscape with provision for protecting trees and wildlife (B), and that it seems a place where people of all ages can live together happily (C).',
    $j${"ieltsNumber":13,"ieltsType":"multiple choice (choose TWO)","instruction":"Choose TWO letters.","pairWith":14}$j$::jsonb
  ),
  (
    'cam18-t2-l2-q14',
    4,
    'multiple_choice',
    $t$Choose TWO letters, A-E. This is one of a pair; enter one correct letter here and the other in the paired question.
Which TWO aspects of the planned housing development have people given positive feedback about?
A the facilities for cyclists
B the impact on the environment
C the encouragement of good relations between residents
D the low cost of all the accommodation
E the rural location$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","C"],"caseSensitive":false}$j$::jsonb,
    'Same evidence as the paired question: blending in with natural features and protecting trees and wildlife (B), and all ages living together happily (C). Cyclists wanted more facilities, so A is not positive feedback.',
    $j${"ieltsNumber":14,"ieltsType":"multiple choice (choose TWO)","instruction":"Choose TWO letters.","pairWith":13}$j$::jsonb
  ),
  (
    'cam18-t2-l2-q15',
    5,
    'multiple_choice',
    $t$Label the map below. Write the correct letter, A-I, next to Questions 15-20.
15 School$t$,
    $j$["A","B","C","D","E","F","G","H","I"]$j$::jsonb,
    $j${"answers":["G"],"caseSensitive":false}$j$::jsonb,
    $t$The school for children up to 11 is on the road running up from the South Entrance, 'at the corner of the second turning to the left'.$t$,
    $j${"ieltsNumber":15,"ieltsType":"map labelling","instruction":"Write the correct letter, A-I.","assetUrl":"/images/cam18/t2-listening-p2-map.jpg","assetCaption":"Map of the proposed development (letters A-I mark the positions)"}$j$::jsonb
  ),
  (
    'cam18-t2-l2-q16',
    6,
    'multiple_choice',
    $t$Label the map below. Write the correct letter, A-I, next to Questions 15-20.
16 Sports centre$t$,
    $j$["A","B","C","D","E","F","G","H","I"]$j$::jsonb,
    $j${"answers":["C"],"caseSensitive":false}$j$::jsonb,
    $t$The sports centre 'will be on the western side of the development, just below the road that branches off from London Road'.$t$,
    $j${"ieltsNumber":16,"ieltsType":"map labelling","instruction":"Write the correct letter, A-I.","assetUrl":"/images/cam18/t2-listening-p2-map.jpg","assetCaption":"Map of the proposed development (letters A-I mark the positions)"}$j$::jsonb
  ),
  (
    'cam18-t2-l2-q17',
    7,
    'multiple_choice',
    $t$Label the map below. Write the correct letter, A-I, next to Questions 15-20.
17 Clinic$t$,
    $j$["A","B","C","D","E","F","G","H","I"]$j$::jsonb,
    $j${"answers":["D"],"caseSensitive":false}$j$::jsonb,
    $t$The clinic is 'just below' the lake towards the top of the map, 'to the right of a street of houses'.$t$,
    $j${"ieltsNumber":17,"ieltsType":"map labelling","instruction":"Write the correct letter, A-I.","assetUrl":"/images/cam18/t2-listening-p2-map.jpg","assetCaption":"Map of the proposed development (letters A-I mark the positions)"}$j$::jsonb
  ),
  (
    'cam18-t2-l2-q18',
    8,
    'multiple_choice',
    $t$Label the map below. Write the correct letter, A-I, next to Questions 15-20.
18 Community centre$t$,
    $j$["A","B","C","D","E","F","G","H","I"]$j$::jsonb,
    $j${"answers":["B"],"caseSensitive":false}$j$::jsonb,
    'The community centre adjoins the row of specially designed houses for residents over 65 on the northeast side of the development.',
    $j${"ieltsNumber":18,"ieltsType":"map labelling","instruction":"Write the correct letter, A-I.","assetUrl":"/images/cam18/t2-listening-p2-map.jpg","assetCaption":"Map of the proposed development (letters A-I mark the positions)"}$j$::jsonb
  ),
  (
    'cam18-t2-l2-q19',
    9,
    'multiple_choice',
    $t$Label the map below. Write the correct letter, A-I, next to Questions 15-20.
19 Supermarket$t$,
    $j$["A","B","C","D","E","F","G","H","I"]$j$::jsonb,
    $j${"answers":["H"],"caseSensitive":false}$j$::jsonb,
    $t$The supermarket is 'between the two entrances to the development', just to the south of the three large trees near London Road.$t$,
    $j${"ieltsNumber":19,"ieltsType":"map labelling","instruction":"Write the correct letter, A-I.","assetUrl":"/images/cam18/t2-listening-p2-map.jpg","assetCaption":"Map of the proposed development (letters A-I mark the positions)"}$j$::jsonb
  ),
  (
    'cam18-t2-l2-q20',
    10,
    'multiple_choice',
    $t$Label the map below. Write the correct letter, A-I, next to Questions 15-20.
20 Playground$t$,
    $j$["A","B","C","D","E","F","G","H","I"]$j$::jsonb,
    $j${"answers":["A"],"caseSensitive":false}$j$::jsonb,
    'The road from the South Entrance curves round to the left at the top, and the playground is in that curve with views of the lake.',
    $j${"ieltsNumber":20,"ieltsType":"map labelling","instruction":"Write the correct letter, A-I.","assetUrl":"/images/cam18/t2-listening-p2-map.jpg","assetCaption":"Map of the proposed development (letters A-I mark the positions)"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t2-p2'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · The Laki Volcanic Eruption of 1783
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t2-p3',
  'listening',
  'challenge',
  'The Laki Volcanic Eruption of 1783',
  'Cambridge IELTS 18 · Test 2 · Listening Part 3 (Questions 21–30).',
  'medium',
  'audio',
  null,
  '/audio/cam18/t2-p3.mp3',
  $t$ADAM: So, Michelle, shall we make a start on our presentation? We haven't got that much time left.
MICHELLE: But it was a huge eruption and it had such devastating consequences.
ADAM: I know. It was great there were so many primary sources to look at. It really gives you a sense of how catastrophic the volcano was. People were really trying to make sense of the science for the first time.
MICHELLE: That's right. But what I found more significant was how it impacted directly and indirectly on political events, as well as having massive social and economic consequences.
ADAM: I know. That should be the main focus of our presentation.
MICHELLE: The observations made by people at the time were interesting, weren't they? I mean, they all gave a pretty consistent account of what happened, even if they didn't always use the same terminology.
ADAM: Yeah. I was surprised there were so many weather stations established by that time – so, you know, you can see how the weather changed, often by the hour.
MICHELLE: Right. Writers at the time talked about the Laki haze to describe the volcanic fog that spread across Europe. They all realised that this wasn't the sort of fog they were used to – and of course this was in pre-industrial times – so they hadn't experienced sulphur-smelling fog before.
ADAM: No, that's true.
MICHELLE: Reports from the period blamed the haze for an increase in headaches, respiratory issues and asthma attacks. And they all describe how it covered the sun and made it look a strange red colour.
ADAM: Must have been very weird. It's interesting that Benjamin Franklin wrote about the haze. Did you read that? He was the American ambassador in Paris at the time.
MICHELLE: Yeah. At first no one realised that the haze was caused by the volcanic eruption in Iceland. It was Benjamin Franklin who realised that before anyone else.
ADAM: He's often credited with that, apparently. But a French naturalist beat him to it – I can't remember his name. I'd have to look it up. Then other naturalists had the same idea – all independently of each other.
MICHELLE: Oh right. We should talk about the immediate impact of the eruption, which was obviously enormous – especially in Iceland, where so many people died.
ADAM: Mmm. You'd expect that – and the fact that the volcanic ash drifted so swiftly – but not that the effects would go on for so long. Or that two years after the eruption, strange weather events were being reported as far away as North America and North Africa.
MICHELLE: No. I found all that hard to believe too. It must have been terrible – and there was nothing anyone could do about it, even if they knew the ash cloud was coming in their direction.
ADAM: We should run through some of the terrible consequences of the eruption experienced in different countries. There's quite a varied range. Starting with Iceland, where the impact on farming was devastating.
MICHELLE: Mmm. One of the most dramatic things there was the effect on livestock as they grazed in the fields. They were poisoned because they ate vegetation that had been contaminated with fluorine as a result of the volcanic fallout.
ADAM: That was horrible. In Egypt, the bizarre weather patterns led to a severe drought and as a result the Nile didn't flood, which meant the crops all failed. It's so far from where the eruption happened and yet the famine there led to more people dying than any other country. It was worse than the plague.
MICHELLE: OK. Then in the UK the mortality rate went up a lot – presumably from respiratory illnesses. According to one report it was about double the usual number and included an unusually high percentage of people under the age of 25.
ADAM: Mmm. I think people will be surprised to hear that the weather in the USA was badly affected too. George Washington even makes a note in his diary that they were snowbound until March in Virginia. That was before he became president.
MICHELLE: Yes, and there was ice floating down the Mississippi, which was unprecedented.
ADAM: Astonishing, really. Anyway, what do you think ...$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":2,"part":3,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t2-l3-q21',
    1,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
Why do the students think the Laki eruption of 1783 is so important?$t$,
    $j$["A – It was the most severe eruption in modern times.","B – It led to the formal study of volcanoes.","C – It had a profound effect on society."]$j$::jsonb,
    $j${"answers":["C – It had a profound effect on society."],"caseSensitive":false}$j$::jsonb,
    'Michelle says what she found more significant was how it impacted on political events, as well as having massive social and economic consequences, and Adam agrees this should be the main focus.',
    $j${"ieltsNumber":21,"ieltsType":"multiple choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t2-l3-q22',
    2,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
What surprised Adam about observations made at the time?$t$,
    $j$["A – the number of places producing them","B – the contradictions in them","C – the lack of scientific data to support them"]$j$::jsonb,
    $j${"answers":["A – the number of places producing them"],"caseSensitive":false}$j$::jsonb,
    'Adam says he was surprised there were so many weather stations established by that time.',
    $j${"ieltsNumber":22,"ieltsType":"multiple choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t2-l3-q23',
    3,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
According to Michelle, what did the contemporary sources say about the Laki haze?$t$,
    $j$["A – People thought it was similar to ordinary fog.","B – It was associated with health issues.","C – It completely blocked out the sun for weeks."]$j$::jsonb,
    $j${"answers":["B – It was associated with health issues."],"caseSensitive":false}$j$::jsonb,
    'Michelle says reports from the period blamed the haze for an increase in headaches, respiratory issues and asthma attacks.',
    $j${"ieltsNumber":23,"ieltsType":"multiple choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t2-l3-q24',
    4,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
Adam corrects Michelle when she claims that Benjamin Franklin$t$,
    $j$["A – came to the wrong conclusion about the cause of the haze.","B – was the first to identify the reason for the haze.","C – supported the opinions of other observers about the haze."]$j$::jsonb,
    $j${"answers":["B – was the first to identify the reason for the haze."],"caseSensitive":false}$j$::jsonb,
    'Michelle says Franklin realised the volcanic cause before anyone else; Adam replies that a French naturalist beat him to it.',
    $j${"ieltsNumber":24,"ieltsType":"multiple choice","instruction":"Choose the correct letter, A, B or C."}$j$::jsonb
  ),
  (
    'cam18-t2-l3-q25',
    5,
    'multiple_choice',
    $t$Choose TWO letters, A–E.
Which TWO issues following the Laki eruption surprised the students?
A how widespread the effects were
B how long-lasting the effects were
C the number of deaths it caused
D the speed at which the volcanic ash cloud spread
E how people ignored the warning signs
This is one of a pair; enter one correct letter here and the other in the paired question.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["A","B"],"caseSensitive":false}$j$::jsonb,
    'Adam is surprised the effects went on for so long and that strange weather was reported as far away as North America and North Africa two years later; Michelle found all that hard to believe too.',
    $j${"ieltsNumber":25,"ieltsType":"multiple choice (choose TWO)","instruction":"Choose TWO letters.","pairWith":26}$j$::jsonb
  ),
  (
    'cam18-t2-l3-q26',
    6,
    'multiple_choice',
    $t$Choose TWO letters, A–E.
Which TWO issues following the Laki eruption surprised the students?
A how widespread the effects were
B how long-lasting the effects were
C the number of deaths it caused
D the speed at which the volcanic ash cloud spread
E how people ignored the warning signs
This is one of a pair; enter one correct letter here and the other in the paired question.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["A","B"],"caseSensitive":false}$j$::jsonb,
    'Adam expected the deaths and the swift drift of the ash, but not that the effects would last so long or reach North America and North Africa two years on.',
    $j${"ieltsNumber":26,"ieltsType":"multiple choice (choose TWO)","instruction":"Choose TWO letters.","pairWith":25}$j$::jsonb
  ),
  (
    'cam18-t2-l3-q27',
    7,
    'multiple_choice',
    $t$What comment do the students make about the impact of the Laki eruption on the following countries?
Choose FOUR answers from the box and write the correct letter, A–F, next to Questions 27–30.
27 Iceland$t$,
    $j$["A – This country suffered the most severe loss of life.","B – The impact on agriculture was predictable.","C – There was a significant increase in deaths of young people.","D – Animals suffered from a sickness.","E – This country saw the highest rise in food prices in the world.","F – It caused a particularly harsh winter."]$j$::jsonb,
    $j${"answers":["D – Animals suffered from a sickness."],"caseSensitive":false}$j$::jsonb,
    'In Iceland, livestock were poisoned because they ate vegetation contaminated with fluorine from the volcanic fallout.',
    $j${"ieltsNumber":27,"ieltsType":"matching","instruction":"Choose FOUR answers from the box, A–F."}$j$::jsonb
  ),
  (
    'cam18-t2-l3-q28',
    8,
    'multiple_choice',
    $t$What comment do the students make about the impact of the Laki eruption on the following countries?
Choose FOUR answers from the box and write the correct letter, A–F, next to Questions 27–30.
28 Egypt$t$,
    $j$["A – This country suffered the most severe loss of life.","B – The impact on agriculture was predictable.","C – There was a significant increase in deaths of young people.","D – Animals suffered from a sickness.","E – This country saw the highest rise in food prices in the world.","F – It caused a particularly harsh winter."]$j$::jsonb,
    $j${"answers":["A – This country suffered the most severe loss of life."],"caseSensitive":false}$j$::jsonb,
    'Adam says the famine in Egypt led to more people dying than in any other country.',
    $j${"ieltsNumber":28,"ieltsType":"matching","instruction":"Choose FOUR answers from the box, A–F."}$j$::jsonb
  ),
  (
    'cam18-t2-l3-q29',
    9,
    'multiple_choice',
    $t$What comment do the students make about the impact of the Laki eruption on the following countries?
Choose FOUR answers from the box and write the correct letter, A–F, next to Questions 27–30.
29 UK$t$,
    $j$["A – This country suffered the most severe loss of life.","B – The impact on agriculture was predictable.","C – There was a significant increase in deaths of young people.","D – Animals suffered from a sickness.","E – This country saw the highest rise in food prices in the world.","F – It caused a particularly harsh winter."]$j$::jsonb,
    $j${"answers":["C – There was a significant increase in deaths of young people."],"caseSensitive":false}$j$::jsonb,
    'Michelle says UK mortality doubled and included an unusually high percentage of people under the age of 25.',
    $j${"ieltsNumber":29,"ieltsType":"matching","instruction":"Choose FOUR answers from the box, A–F."}$j$::jsonb
  ),
  (
    'cam18-t2-l3-q30',
    10,
    'multiple_choice',
    $t$What comment do the students make about the impact of the Laki eruption on the following countries?
Choose FOUR answers from the box and write the correct letter, A–F, next to Questions 27–30.
30 USA$t$,
    $j$["A – This country suffered the most severe loss of life.","B – The impact on agriculture was predictable.","C – There was a significant increase in deaths of young people.","D – Animals suffered from a sickness.","E – This country saw the highest rise in food prices in the world.","F – It caused a particularly harsh winter."]$j$::jsonb,
    $j${"answers":["F – It caused a particularly harsh winter."],"caseSensitive":false}$j$::jsonb,
    'In the USA, Washington recorded being snowbound until March in Virginia and there was unprecedented ice on the Mississippi.',
    $j${"ieltsNumber":30,"ieltsType":"matching","instruction":"Choose FOUR answers from the box, A–F."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t2-p3'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Pockets
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t2-p4',
  'listening',
  'challenge',
  'Pockets',
  'Cambridge IELTS 18 · Test 2 · Listening Part 4 (Questions 31–40).',
  'hard',
  'audio',
  null,
  '/audio/cam18/t2-p4.mp3',
  $t$Good morning. Now, we've been asked to choose an aspect of European clothing or fashion and to talk about its development over time.

I decided to focus on a rather small area of clothing and that's pockets. I chose pockets for two reasons, really. We all have them – in jeans, jackets, coats, for example – and even though we often carry bags or briefcases as well, nothing is quite as convenient as being able to pop your phone or credit card into your pocket. Yet, I suspect that, other than that, people don't really think about pockets too much and they're rather overlooked as a fashion item.

It's certainly very interesting to go back in time and see how pockets developed for men and women. In the 18th century, fashions were quite different from the way they are now, and pockets were too. If we think about male fashion first ... that was the time when suits became popular. Trousers were knee-length only and referred to as 'breeches', the waistcoats were short and the jackets were long, but all three garments were lined with material and pockets were sewn into this cloth by whichever tailor the customer used. The wearer could then carry small objects such as pencils or coins on their person and reach them through a gap in the lining. Coat pockets became increasingly decorative on the outside for men who wanted to look stylish, but they were often larger but plainer if the wearer was someone with a profession who needed to carry medical instruments – a doctor or physician, for example.

The development of women's pockets was a little different. For one thing, they weren't nearly as visible or as easy to reach as men's. In the 18th and 19th centuries, women carried numerous possessions on their person and some of these could be worth a lot of money. Women were more vulnerable to theft and wealthy women, in particular, worried constantly about pickpockets. So what they did was to have a pair of pockets made that were tied together with string. The pockets were made of fabric, which might be recycled cloth if the wearer had little money or something more expensive, such as linen, sometimes featuring very delicate embroidery. Women tied the pockets around their waist so that they hung beneath their clothes. Remember, skirts were long then and there was plenty of room to hide a whole range of small possessions between the layers of petticoats that were commonly worn. They would have an opening in the folds of their skirts through which they could reach whatever they needed, like their perfume. Working women, of course, also needed to carry around items that they might use for whatever job or trade they were involved in, but their pairs of pockets still remained on the inside of their clothing, they just got bigger or longer – sometimes reaching down to their knees!

So the tie-on pockets went well into the 19th century and only changed when fashion altered towards the end of that period. That's when dresses became tighter and less bulky, and the pairs of pockets became very noticeable – they stood out too much and detracted from the woman's image. Women who had been used to carrying around a range of personal possessions – and still wanted to – needed somewhere to carry these items about their person. That was when small bags, or pouches as they were known, came into fashion and, of course, they inevitably led on to the handbag of more modern times, particularly when fashion removed pockets altogether.$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":2,"part":4,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t2-l4-q31',
    1,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Pockets
Reason for choice of subject
They are 31 .......... but can be overlooked by consumers and designers.$t$,
    null::jsonb,
    $j${"answers":["convenient"],"caseSensitive":false}$j$::jsonb,
    'The speaker says nothing is quite as convenient as being able to pop your phone or credit card into your pocket.',
    $j${"ieltsNumber":31,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l4-q32',
    2,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Pockets in men's clothes
Men started to wear 32 .......... in the 18th century.$t$,
    null::jsonb,
    $j${"answers":["suits"],"caseSensitive":false}$j$::jsonb,
    'Speaking of 18th-century male fashion, the speaker says that was the time when suits became popular.',
    $j${"ieltsNumber":32,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l4-q33',
    3,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Pockets in men's clothes
A 33 .......... sewed pockets into the lining of the garments.$t$,
    null::jsonb,
    $j${"answers":["tailor"],"caseSensitive":false}$j$::jsonb,
    'Pockets were sewn into the lining cloth by whichever tailor the customer used.',
    $j${"ieltsNumber":33,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l4-q34',
    4,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Pockets in men's clothes
The wearer could use the pockets for small items.
Bigger pockets might be made for men who belonged to a certain type of 34 ..........$t$,
    null::jsonb,
    $j${"answers":["profession"],"caseSensitive":false}$j$::jsonb,
    'Pockets were larger but plainer if the wearer was someone with a profession who needed to carry medical instruments.',
    $j${"ieltsNumber":34,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l4-q35',
    5,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Pockets in women's clothes
Women's pockets were less 35 .......... than men's.$t$,
    null::jsonb,
    $j${"answers":["visible"],"caseSensitive":false}$j$::jsonb,
    $t$The speaker says women's pockets weren't nearly as visible or as easy to reach as men's.$t$,
    $j${"ieltsNumber":35,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l4-q36',
    6,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Pockets in women's clothes
Women were very concerned about pickpockets.
Pockets were produced in pairs using 36 .......... to link them together.$t$,
    null::jsonb,
    $j${"answers":["strings"],"caseSensitive":false,"acceptedAlternatives":["string"]}$j$::jsonb,
    'Women had a pair of pockets made that were tied together with string.',
    $j${"ieltsNumber":36,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l4-q37',
    7,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Pockets in women's clothes
Pockets hung from the women's 37 .......... under skirts and petticoats.$t$,
    null::jsonb,
    $j${"answers":["waist"],"caseSensitive":false,"acceptedAlternatives":["waists"]}$j$::jsonb,
    'Women tied the pockets around their waist so that they hung beneath their clothes.',
    $j${"ieltsNumber":37,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l4-q38',
    8,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Pockets in women's clothes
Items such as 38 .......... could be reached through a gap in the material.
Pockets, of various sizes, stayed inside clothing for many decades.$t$,
    null::jsonb,
    $j${"answers":["perfume"],"caseSensitive":false}$j$::jsonb,
    'Women reached through an opening in the folds of their skirts for whatever they needed, like their perfume.',
    $j${"ieltsNumber":38,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l4-q39',
    9,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Pockets in women's clothes
When dresses changed shape, hidden pockets had a negative effect on the 39 .......... of women.$t$,
    null::jsonb,
    $j${"answers":["image"],"caseSensitive":false}$j$::jsonb,
    $t$As dresses became tighter, the pairs of pockets stood out too much and detracted from the woman's image.$t$,
    $j${"ieltsNumber":39,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-l4-q40',
    10,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Pockets in women's clothes
Bags called 'pouches' became popular, before women carried a 40 ..........$t$,
    null::jsonb,
    $j${"answers":["handbag"],"caseSensitive":false}$j$::jsonb,
    'Small bags or pouches inevitably led on to the handbag of more modern times.',
    $j${"ieltsNumber":40,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t2-p4'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- reading · Stonehenge
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-cam18-t2-stonehenge',
  'reading',
  'challenge',
  'Stonehenge',
  'Cambridge IELTS 18 · Test 2 · Reading Passage 1 (Questions 1–13).',
  'medium',
  'passage',
  $t$For centuries, historians and archaeologists have puzzled over the many mysteries of Stonehenge, a prehistoric monument that took an estimated 1,500 years to erect. Located on Salisbury Plain in southern England, it is comprised of roughly 100 massive upright stones placed in a circular layout.

Archaeologists believe England's most iconic prehistoric ruin was built in several stages, with the earliest constructed 5,000 or more years ago. First, Neolithic Britons used primitive tools, which may have been fashioned out of deer antlers, to dig a massive circular ditch and bank, or henge. Deep pits dating back to that era and located within the circle may have once held a ring of timber posts, according to some scholars.

Several hundred years later, it is thought, Stonehenge's builders hoisted an estimated 80 bluestones, 43 of which remain today, into standing positions and placed them in either a horseshoe or circular formation. These stones have been traced all the way to the Preseli Hills in Wales, some 300 kilometres from Stonehenge. How, then, did prehistoric builders without sophisticated tools or engineering haul these boulders, which weigh up to four tons, over such a great distance?

According to one long-standing theory among archaeologists, Stonehenge's builders fashioned sledges and rollers out of tree trunks to lug the bluestones from the Preseli Hills. They then transferred the boulders onto rafts and floated them first along the Welsh coast and then up the River Avon toward Salisbury Plain; alternatively, they may have towed each stone with a fleet of vessels. More recent archaeological hypotheses have them transporting the bluestones with supersized wicker baskets on a combination of ball bearings and long grooved planks, hauled by oxen.

As early as the 1970s, geologists have been adding their voices to the debate over how Stonehenge came into being. Challenging the classic image of industrious builders pushing, carting, rolling or hauling giant stones from faraway Wales, some scientists have suggested that it was glaciers, not humans, that carried the bluestones to Salisbury Plain. Most archaeologists have remained sceptical about this theory, however, wondering how the forces of nature could possibly have delivered the exact number of stones needed to complete the circle.

The third phase of construction took place around 2000 BCE. At this point, sandstone slabs – known as 'sarsens' – were arranged into an outer crescent or ring; some were assembled into the iconic three-pieced structures called trilithons that stand tall in the centre of Stonehenge. Some 50 of these stones are now visible on the site, which may once have contained many more. Radiocarbon dating has revealed that work continued at Stonehenge until roughly 1600 BCE, with the bluestones in particular being repositioned multiple times.

But who were the builders of Stonehenge? In the 17th century, archaeologist John Aubrey made the claim that Stonehenge was the work of druids, who had important religious, judicial and political roles in Celtic society. This theory was widely popularized by the antiquarian William Stukeley, who had unearthed primitive graves at the site. Even today, people who identify as modern druids continue to gather at Stonehenge for the summer solstice. However, in the mid-20th century, radiocarbon dating demonstrated that Stonehenge stood more than 1,000 years before the Celts inhabited the region.

Many modern historians and archaeologists now agree that several distinct tribes of people contributed to Stonehenge, each undertaking a different phase of its construction. Bones, tools and other artefacts found on the site seem to support this hypothesis. The first stage was achieved by Neolithic agrarians who were likely to have been indigenous to the British Isles. Later, it is believed, groups with advanced tools and a more communal way of life left their mark on the site. Some believe that they were immigrants from the European continent, while others maintain that they were probably native Britons, descended from the original builders.

If the facts surrounding the architects and construction of Stonehenge remain shadowy at best, the purpose of the striking monument is even more of a mystery. While there is consensus among the majority of modern scholars that Stonehenge once served the function of burial ground, they have yet to determine what other purposes it had.

In the 1960s, the astronomer Gerald Hawkins suggested that the cluster of megalithic stones operated as a form of calendar, with different points corresponding to astrological phenomena such as solstices, equinoxes and eclipses occurring at different times of the year. While his theory has received a considerable amount of attention over the decades, critics maintain that Stonehenge's builders probably lacked the knowledge necessary to predict such events or that England's dense cloud cover would have obscured their view of the skies.

More recently, signs of illness and injury in the human remains unearthed at Stonehenge led a group of British archaeologists to speculate that it was considered a place of healing, perhaps because bluestones were thought to have curative powers.$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"Cambridge IELTS 18","book":18,"test":2,"passage":1,"ieltsQuestionRange":"1-13","extraction":"mineru-ocr","answerKeyVerified":true,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t2-p1-q1',
    1,
    'sentence_completion',
    $t$Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.
Stage 1: the ditch and henge were dug, possibly using tools made from 1 __________.$t$,
    null::jsonb,
    $j${"answers":["antlers"],"caseSensitive":false,"acceptedAlternatives":["deer antlers"]}$j$::jsonb,
    'Paragraph 2 states Neolithic Britons used primitive tools "which may have been fashioned out of deer antlers" to dig the ditch and henge.',
    $j${"ieltsNumber":1,"ieltsType":"Note completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t2-p1-q2',
    2,
    'sentence_completion',
    $t$Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.
Stage 1: 2 __________ may have been arranged in deep pits inside the circle.$t$,
    null::jsonb,
    $j${"answers":["posts"],"caseSensitive":false,"acceptedAlternatives":["timber posts"]}$j$::jsonb,
    'Paragraph 2 says deep pits within the circle "may have once held a ring of timber posts".',
    $j${"ieltsNumber":2,"ieltsType":"Note completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t2-p1-q3',
    3,
    'sentence_completion',
    $t$Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.
Stage 2 – archaeological theory: builders used 3 __________ to make sledges and rollers.$t$,
    null::jsonb,
    $j${"answers":["tree trunks"],"caseSensitive":false}$j$::jsonb,
    'Paragraph 4: builders "fashioned sledges and rollers out of tree trunks" to move the bluestones.',
    $j${"ieltsNumber":3,"ieltsType":"Note completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t2-p1-q4',
    4,
    'sentence_completion',
    $t$Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.
Stage 2 – archaeological theory: 4 __________ pulled them on giant baskets.$t$,
    null::jsonb,
    $j${"answers":["oxen"],"caseSensitive":false}$j$::jsonb,
    'Paragraph 4: more recent hypotheses have the bluestones transported in supersized wicker baskets "hauled by oxen".',
    $j${"ieltsNumber":4,"ieltsType":"Note completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t2-p1-q5',
    5,
    'sentence_completion',
    $t$Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.
Stage 2 – geological theory: they were brought from Wales by 5 __________.$t$,
    null::jsonb,
    $j${"answers":["glaciers"],"caseSensitive":false}$j$::jsonb,
    'Paragraph 5: some scientists suggested "it was glaciers, not humans, that carried the bluestones to Salisbury Plain".',
    $j${"ieltsNumber":5,"ieltsType":"Note completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t2-p1-q6',
    6,
    'sentence_completion',
    $t$Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.
Builders: a theory arose in the 17th century that its builders were Celtic 6 __________.$t$,
    null::jsonb,
    $j${"answers":["druids"],"caseSensitive":false}$j$::jsonb,
    'Paragraph 7: John Aubrey claimed Stonehenge "was the work of druids", who had roles in Celtic society.',
    $j${"ieltsNumber":6,"ieltsType":"Note completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t2-p1-q7',
    7,
    'sentence_completion',
    $t$Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.
Purpose: many experts agree it has been used as a 7 __________.$t$,
    null::jsonb,
    $j${"answers":["burial"],"caseSensitive":false}$j$::jsonb,
    'Paragraph 9: there is consensus that Stonehenge "once served the function of burial ground".',
    $j${"ieltsNumber":7,"ieltsType":"Note completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t2-p1-q8',
    8,
    'sentence_completion',
    $t$Complete the notes below. Choose NO MORE THAN TWO WORDS from the passage for each answer.
Purpose: in the 1960s, it was suggested that it worked as a kind of 8 __________.$t$,
    null::jsonb,
    $j${"answers":["calendar"],"caseSensitive":false}$j$::jsonb,
    'Paragraph 10: Gerald Hawkins suggested the megalithic stones "operated as a form of calendar".',
    $j${"ieltsNumber":8,"ieltsType":"Note completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t2-p1-q9',
    9,
    'true_false_not_given',
    $t$Do the following statement agree with the information given in Reading Passage 1?
During the third phase of construction, sandstone slabs were placed in both the outer areas and the middle of the Stonehenge site.$t$,
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["True"],"caseSensitive":false}$j$::jsonb,
    'Paragraph 6: sarsens were arranged into an outer crescent or ring, and some formed trilithons that "stand tall in the centre of Stonehenge" — confirming both outer and middle placement.',
    $j${"ieltsNumber":9,"ieltsType":"True/False/Not Given"}$j$::jsonb
  ),
  (
    'cam18-t2-p1-q10',
    10,
    'true_false_not_given',
    $t$Do the following statement agree with the information given in Reading Passage 1?
There is scientific proof that the bluestones stood in the same spot until approximately 1600 BCE.$t$,
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["False"],"caseSensitive":false}$j$::jsonb,
    'Paragraph 6: radiocarbon dating showed work continued until roughly 1600 BCE "with the bluestones in particular being repositioned multiple times" — so they did not stay in one spot.',
    $j${"ieltsNumber":10,"ieltsType":"True/False/Not Given"}$j$::jsonb
  ),
  (
    'cam18-t2-p1-q11',
    11,
    'true_false_not_given',
    $t$Do the following statement agree with the information given in Reading Passage 1?
John Aubrey's claim about Stonehenge was supported by 20th-century findings.$t$,
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["False"],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph 7: in the mid-20th century radiocarbon dating showed Stonehenge stood more than 1,000 years before the Celts, contradicting Aubrey's druid (Celtic) theory.$t$,
    $j${"ieltsNumber":11,"ieltsType":"True/False/Not Given"}$j$::jsonb
  ),
  (
    'cam18-t2-p1-q12',
    12,
    'true_false_not_given',
    $t$Do the following statement agree with the information given in Reading Passage 1?
Objects discovered at Stonehenge seem to indicate that it was constructed by a number of different groups of people.$t$,
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["True"],"caseSensitive":false}$j$::jsonb,
    'Paragraph 8: experts agree several distinct tribes contributed, and "Bones, tools and other artefacts found on the site seem to support this hypothesis".',
    $j${"ieltsNumber":12,"ieltsType":"True/False/Not Given"}$j$::jsonb
  ),
  (
    'cam18-t2-p1-q13',
    13,
    'true_false_not_given',
    $t$Do the following statement agree with the information given in Reading Passage 1?
Criticism of Gerald Hawkins' theory about Stonehenge has come mainly from other astronomers.$t$,
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["Not Given"],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph 10 reports critics' objections to Hawkins' calendar theory but never states who those critics were or whether they were astronomers.$t$,
    $j${"ieltsNumber":13,"ieltsType":"True/False/Not Given"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-cam18-t2-stonehenge'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- reading · Living with artificial intelligence
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-cam18-t2-ai-risk',
  'reading',
  'challenge',
  'Living with artificial intelligence',
  'Cambridge IELTS 18 · Test 2 · Reading Passage 2 (Questions 14–26).',
  'medium',
  'passage',
  $t$Living with artificial intelligence

Powerful artificial intelligence (AI) needs to be reliably aligned with human values, but does this mean AI will eventually have to police those values?

This has been the decade of AI, with one astonishing feat after another. A chess-playing AI that can defeat not only all human chess players, but also all previous human-programmed chess machines, after learning the game in just four hours? That's yesterday's news, what's next? True, these prodigious accomplishments are all in so-called narrow AI, where machines perform highly specialised tasks. But many experts believe this restriction is very temporary. By mid-century, we may have artificial general intelligence (AGI) – machines that can achieve human-level performance on the full range of tasks that we ourselves can tackle.

If so, there's little reason to think it will stop there. Machines will be free of many of the physical constraints on human intelligence. Our brains run at slow biochemical processing speeds on the power of a light bulb, and their size is restricted by the dimensions of the human birth canal. It is remarkable what they accomplish, given these handicaps. But they may be as far from the physical limits of thought as our eyes are from the incredibly powerful Webb Space Telescope.

Once machines are better than us at designing even smarter machines, progress towards these limits could accelerate. What would this mean for us? Could we ensure a safe and worthwhile coexistence with such machines? On the plus side, AI is already useful and profitable for many things, and super AI might be expected to be super useful, and super profitable. But the more powerful AI becomes, the more important it will be to specify its goals with great care. Folklore is full of tales of people who ask for the wrong thing, with disastrous consequences – King Midas, for example, might have wished that everything he touched turned to gold, but didn't really intend this to apply to his breakfast.

So we need to create powerful AI machines that are 'human-friendly' — that have goals reliably aligned with our own values. One thing that makes this task difficult is that we are far from reliably human-friendly ourselves. We do many terrible things to each other and to many other creatures with whom we share the planet. If superintelligent machines don't do a lot better than us, we'll be in deep trouble. We'll have powerful new intelligence amplifying the dark sides of our own fallible natures.

For safety's sake, then, we want the machines to be ethically as well as cognitively superhuman. We want them to aim for the moral high ground, not for the troughs in which many of us spend some of our time. Luckily they'll be smart enough for the job. If there are routes to the moral high ground, they'll be better than us at finding them, and steering us in the right direction.

However, there are two big problems with this utopian vision. One is how we get the machines started on the journey, the other is what it would mean to reach this destination. The 'getting started' problem is that we need to tell the machines what they're looking for with sufficient clarity that we can be confident they will find it — whatever 'it' actually turns out to be. This won't be easy, given that we are tribal creatures and conflicted about the ideals ourselves. We often ignore the suffering of strangers, and even contribute to it, at least indirectly. How then, do we point machines in the direction of something better?

As for the 'destination' problem, we might, by putting ourselves in the hands of these moral guides and gatekeepers, be sacrificing our own autonomy – an important part of what makes us human. Machines who are better than us at sticking to the moral high ground may be expected to discourage some of the lapses we presently take for granted. We might lose our freedom to discriminate in favour of our own communities, for example.

Loss of freedom to behave badly isn't always a bad thing, of course: denying ourselves the freedom to put children to work in factories, or to smoke in restaurants are signs of progress. But are we ready for ethical silicon police limiting our options? They might be so good at doing it that we won't notice them; but few of us are likely to welcome such a future.

These issues might seem far-fetched, but they are to some extent already here. AI already has some input into how resources are used in our National Health Service (NHS) here in the UK, for example. If it was given a greater role, it might do so much more efficiently than humans can manage, and act in the interests of taxpayers and those who use the health system. However, we'd be depriving some humans (e.g. senior doctors) of the control they presently enjoy. Since we'd want to ensure that people are treated equally and that policies are fair, the goals of AI would need to be specified correctly.

We have a new powerful technology to deal with — itself, literally, a new way of thinking. For our own safety, we need to point these new thinkers in the right direction, and get them to act well for us. It is not yet clear whether this is possible, but if it is, it will require a cooperative spirit, and a willingness to set aside self-interest.

Both general intelligence and moral reasoning are often thought to be uniquely human capacities. But safety seems to require that we think of them as a package: if we are to give general intelligence to machines, we'll need to give them moral authority, too. And where exactly would that leave human beings? All the more reason to think about the destination now, and to be careful about what we wish for.$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"Cambridge IELTS 18","book":18,"test":2,"passage":2,"ieltsQuestionRange":"14-26","extraction":"mineru-ocr","answerKeyVerified":true,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t2-p2-q14',
    1,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
What point does the writer make about AI in the first paragraph?$t$,
    $j$["A – It is difficult to predict how quickly AI will progress.","B – Much can be learned about the use of AI in chess machines.","C – The future is unlikely to see limitations on the capabilities of AI.","D – Experts disagree on which specialised tasks AI will be able to perform."]$j$::jsonb,
    $j${"answers":["C – The future is unlikely to see limitations on the capabilities of AI."],"caseSensitive":false}$j$::jsonb,
    'The first paragraph notes that current feats are in narrow AI, but "many experts believe this restriction is very temporary" and by mid-century we may have AGI — i.e. the future is unlikely to keep AI limited.',
    $j${"ieltsNumber":14,"ieltsType":"Multiple choice (choose one letter A–D)"}$j$::jsonb
  ),
  (
    'cam18-t2-p2-q15',
    2,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
What is the writer doing in the second paragraph?$t$,
    $j$["A – explaining why machines will be able to outperform humans","B – describing the characteristics that humans and machines share","C – giving information about the development of machine intelligence","D – indicating which aspects of humans are the most advanced"]$j$::jsonb,
    $j${"answers":["A – explaining why machines will be able to outperform humans"],"caseSensitive":false}$j$::jsonb,
    'The second paragraph explains that machines will be free of the physical constraints (slow biochemical speeds, brain size limited by the birth canal) that hold human intelligence back — i.e. why machines can surpass us.',
    $j${"ieltsNumber":15,"ieltsType":"Multiple choice (choose one letter A–D)"}$j$::jsonb
  ),
  (
    'cam18-t2-p2-q16',
    3,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
Why does the writer mention the story of King Midas?$t$,
    $j$["A – to compare different visions of progress","B – to illustrate that poorly defined objectives can go wrong","C – to emphasise the need for cooperation","D – to point out the financial advantages of a course of action"]$j$::jsonb,
    $j${"answers":["B – to illustrate that poorly defined objectives can go wrong"],"caseSensitive":false}$j$::jsonb,
    'Midas is given as an example of asking for the wrong thing with disastrous consequences, illustrating why AI goals must be specified with great care.',
    $j${"ieltsNumber":16,"ieltsType":"Multiple choice (choose one letter A–D)"}$j$::jsonb
  ),
  (
    'cam18-t2-p2-q17',
    4,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
What challenge does the writer refer to in the fourth paragraph?$t$,
    $j$["A – encouraging humans to behave in a more principled way","B – deciding which values we want AI to share with us","C – creating a better world for all creatures on the planet","D – ensuring AI is more human-friendly than we are ourselves"]$j$::jsonb,
    $j${"answers":["D – ensuring AI is more human-friendly than we are ourselves"],"caseSensitive":false}$j$::jsonb,
    'The fourth paragraph says the difficulty is that "we are far from reliably human-friendly ourselves," so if machines do not do better than us we will be in trouble — the challenge of making AI more human-friendly than we are.',
    $j${"ieltsNumber":17,"ieltsType":"Multiple choice (choose one letter A–D)"}$j$::jsonb
  ),
  (
    'cam18-t2-p2-q18',
    5,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
What does the writer suggest about the future of AI in the fifth paragraph?$t$,
    $j$["A – The safety of machines will become a key issue.","B – It is hard to know what impact machines will have on the world.","C – Machines will be superior to humans in certain respects.","D – Many humans will oppose machines having a wider role."]$j$::jsonb,
    $j${"answers":["C – Machines will be superior to humans in certain respects."],"caseSensitive":false}$j$::jsonb,
    'The fifth paragraph wants machines to be "ethically as well as cognitively superhuman" and better than us at finding the moral high ground — i.e. superior to humans in certain respects.',
    $j${"ieltsNumber":18,"ieltsType":"Multiple choice (choose one letter A–D)"}$j$::jsonb
  ),
  (
    'cam18-t2-p2-q19',
    6,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
Which of the following best summarises the writer's argument in the sixth paragraph?$t$,
    $j$["A – More intelligent machines will result in greater abuses of power.","B – Machine learning will share very few features with human learning.","C – There are a limited number of people with the knowledge to program machines.","D – Human shortcomings will make creating the machines we need more difficult."]$j$::jsonb,
    $j${"answers":["D – Human shortcomings will make creating the machines we need more difficult."],"caseSensitive":false}$j$::jsonb,
    'The sixth paragraph says the "getting started" problem will not be easy because we are tribal, conflicted about our ideals, and ignore the suffering of strangers — our own flaws make pointing machines in the right direction hard.',
    $j${"ieltsNumber":19,"ieltsType":"Multiple choice (choose one letter A–D)"}$j$::jsonb
  ),
  (
    'cam18-t2-p2-q20',
    7,
    'true_false_not_given',
    $t$Do the following statements agree with the claims of the writer in Reading Passage 2?
Machines with the ability to make moral decisions may prevent us from promoting the interests of our communities.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["Yes"],"caseSensitive":false}$j$::jsonb,
    'The seventh paragraph states that such moral machines "may be expected to discourage some of the lapses we presently take for granted" and that "we might lose our freedom to discriminate in favour of our own communities" — this agrees with the statement.',
    $j${"ieltsNumber":20,"ieltsType":"Yes / No / Not Given"}$j$::jsonb
  ),
  (
    'cam18-t2-p2-q21',
    8,
    'true_false_not_given',
    $t$Do the following statements agree with the claims of the writer in Reading Passage 2?
Silicon police would need to exist in large numbers in order to be effective.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["Not Given"],"caseSensitive":false}$j$::jsonb,
    'The writer mentions "ethical silicon police" and that they might be so good we would not notice them, but says nothing about how many would be needed to be effective.',
    $j${"ieltsNumber":21,"ieltsType":"Yes / No / Not Given"}$j$::jsonb
  ),
  (
    'cam18-t2-p2-q22',
    9,
    'true_false_not_given',
    $t$Do the following statements agree with the claims of the writer in Reading Passage 2?
Many people are comfortable with the prospect of their independence being restricted by machines.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["No"],"caseSensitive":false}$j$::jsonb,
    'The writer states that "few of us are likely to welcome such a future," which contradicts the idea that many people are comfortable with machines restricting their independence.',
    $j${"ieltsNumber":22,"ieltsType":"Yes / No / Not Given"}$j$::jsonb
  ),
  (
    'cam18-t2-p2-q23',
    10,
    'true_false_not_given',
    $t$Do the following statements agree with the claims of the writer in Reading Passage 2?
If we want to ensure that machines act in our best interests, we all need to work together.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["Yes"],"caseSensitive":false}$j$::jsonb,
    'The tenth paragraph says getting machines to act well for us "will require a cooperative spirit, and a willingness to set aside self-interest" — agreeing that we need to work together.',
    $j${"ieltsNumber":23,"ieltsType":"Yes / No / Not Given"}$j$::jsonb
  ),
  (
    'cam18-t2-p2-q24',
    11,
    'multiple_choice',
    $t$Complete the summary using the list of phrases, A–F, below. Write the correct letter, A–F.

Using AI in the UK health system

AI currently has a limited role in the way 24 ______ are allocated in the health service. The positive aspect of AI having a bigger role is that it would be more efficient and lead to patient benefits. However, such a change would result, for example, in certain 25 ______ not having their current level of 26 ______. It is therefore important that AI goals are appropriate so that discriminatory practices could be avoided.

Which phrase best fills gap 24?$t$,
    $j$["A – medical practitioners","B – specialised tasks","C – available resources","D – reduced illness","E – professional authority","F – technology experts"]$j$::jsonb,
    $j${"answers":["C – available resources"],"caseSensitive":false}$j$::jsonb,
    'The ninth paragraph says AI "already has some input into how resources are used" in the NHS — gap 24 refers to available resources being allocated.',
    $j${"ieltsNumber":24,"ieltsType":"Summary completion (matching phrases A–F)"}$j$::jsonb
  ),
  (
    'cam18-t2-p2-q25',
    12,
    'multiple_choice',
    $t$Complete the summary using the list of phrases, A–F, below. Write the correct letter, A–F.

Using AI in the UK health system

AI currently has a limited role in the way 24 ______ are allocated in the health service. The positive aspect of AI having a bigger role is that it would be more efficient and lead to patient benefits. However, such a change would result, for example, in certain 25 ______ not having their current level of 26 ______. It is therefore important that AI goals are appropriate so that discriminatory practices could be avoided.

Which phrase best fills gap 25?$t$,
    $j$["A – medical practitioners","B – specialised tasks","C – available resources","D – reduced illness","E – professional authority","F – technology experts"]$j$::jsonb,
    $j${"answers":["A – medical practitioners"],"caseSensitive":false}$j$::jsonb,
    'The passage says a bigger AI role would mean "depriving some humans (e.g. senior doctors) of the control they presently enjoy" — the certain people in gap 25 are medical practitioners.',
    $j${"ieltsNumber":25,"ieltsType":"Summary completion (matching phrases A–F)"}$j$::jsonb
  ),
  (
    'cam18-t2-p2-q26',
    13,
    'multiple_choice',
    $t$Complete the summary using the list of phrases, A–F, below. Write the correct letter, A–F.

Using AI in the UK health system

AI currently has a limited role in the way 24 ______ are allocated in the health service. The positive aspect of AI having a bigger role is that it would be more efficient and lead to patient benefits. However, such a change would result, for example, in certain 25 ______ not having their current level of 26 ______. It is therefore important that AI goals are appropriate so that discriminatory practices could be avoided.

Which phrase best fills gap 26?$t$,
    $j$["A – medical practitioners","B – specialised tasks","C – available resources","D – reduced illness","E – professional authority","F – technology experts"]$j$::jsonb,
    $j${"answers":["E – professional authority"],"caseSensitive":false}$j$::jsonb,
    'The senior doctors would lose "the control they presently enjoy" — gap 26 refers to their professional authority being reduced.',
    $j${"ieltsNumber":26,"ieltsType":"Summary completion (matching phrases A–F)"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-cam18-t2-ai-risk'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- reading · An ideal city
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-cam18-t2-ai-future',
  'reading',
  'challenge',
  'An ideal city',
  'Cambridge IELTS 18 · Test 2 · Reading Passage 3 (Questions 27–40).',
  'hard',
  'passage',
  $t$An ideal city

Leonardo da Vinci's ideal city was centuries ahead of its time

The word 'genius' is universally associated with the name of Leonardo da Vinci. A true Renaissance man, he embodied scientific spirit, artistic talent and humanist sensibilities. Five hundred years have passed since Leonardo died in his home at Château du Clos Lucé, outside Tours, France. Yet far from fading into insignificance, his thinking has carried down the centuries and still surprises today.

The Renaissance marked the transition from the 15th century to modernity and took place after the spread of the plague in the 14th century, which caused a global crisis resulting in some 200 million deaths across Europe and Asia. Today, the world is on the cusp of a climate crisis, which is predicted to cause widespread displacement, extinctions and death, if left unaddressed. Then, as now, radical solutions were called for to revolutionise the way people lived and safeguard humanity against catastrophe.

Around 1486 - after a pestilence that killed half the population in Milan, Italy - Leonardo turned his thoughts to urban planning problems. Following a typical Renaissance trend, he began to work on an 'ideal city' project, which - due to its excessive costs - would remain unfulfilled. Yet given that unsustainable urban models are a key cause of global climate change today, it's only natural to wonder how Leonardo might have changed the shape of modern cities.

Although the Renaissance is renowned as an era of incredible progress in art and architecture, it is rarely noted that the 15th century also marked the birth of urbanism as a true academic discipline. The rigour and method behind the conscious conception of a city had been largely missing in Western thought until the moment when prominent Renaissance men pushed forward large-scale urban projects in Italy, such as the reconfiguration of the town of Pienza and the expansion of the city of Ferrara. These works surely inspired Leonardo's decision to rethink the design of medieval cities, with their winding and overcrowded streets and with houses piled against one another.

It is not easy to identify a coordinated vision of Leonardo's ideal city because of his disordered way of working with notes and sketches. But from the largest collection of Leonardo's papers ever assembled, a series of innovative thoughts can be reconstructed regarding the foundation of a new city along the Ticino River, which runs from Switzerland into Italy and is 248 kilometres long. He designed the city for the easy transport of goods and clean urban spaces, and he wanted a comfortable and spacious city, with well-ordered streets and architecture. He recommended 'high, strong walls', with 'towers and battlements of all necessary and pleasant beauty'.

His plans for a 'modern and rational' city were consistent with Renaissance ideals. But, in keeping with his personality, Leonardo included several innovations in his urban design. Leonardo wanted the city to be built on several levels, linked with vertical outdoor staircases. This design can be seen in some of today's high-rise buildings but was unconventional at the time. Indeed, this idea of taking full advantage of the interior spaces wasn't implemented until the 1920s and 1930s, with the birth of the Modernist movement.

While in the upper layers of the city, people could walk undisturbed between elegant palaces and streets, the lower layer was the place for services, trade, transport and industry. But the true originality of Leonardo's vision was its fusion of architecture and engineering. Leonardo designed extensive hydraulic plants to create artificial canals throughout the city. The canals, regulated by clocks and basins, were supposed to make it easier for boats to navigate inland. Leonardo also thought that the width of the streets ought to match the average height of the adjacent houses: a rule still followed in many contemporary cities across Italy, to allow access to sun and reduce the risk of damage from earthquakes.

Although some of these features existed in Roman cities, before Leonardo's drawings there had never been a multi-level, compact modern city which was thoroughly technically conceived. Indeed, it wasn't until the 19th century that some of his ideas were applied. For example, the subdivision of the city by function - with services and infrastructures located in the lower levels and wide and well-ventilated boulevards and walkways above for residents - is an idea that can be found in Georges-Eugène Haussmann's renovation of Paris under Emperor Napoleon III between 1853 and 1870.

Today, Leonardo's ideas are not simply valid, they actually suggest a way forward for urban planning. Many scholars think that the compact city, built upwards instead of outwards, integrated with nature (especially water systems), with efficient transport infrastructure, could help modern cities become more efficient and sustainable. This is yet another reason why Leonardo was aligned so closely with modern urban planning and centuries ahead of his time.$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"Cambridge IELTS 18","book":18,"test":2,"passage":3,"ieltsQuestionRange":"27-40","extraction":"mineru-ocr","answerKeyVerified":true,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t2-p3-q27',
    1,
    'true_false_not_given',
    $t$Do the following statements agree with the information given in Reading Passage 3?

People first referred to Leonardo da Vinci as a genius 500 years ago.$t$,
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["Not Given"],"caseSensitive":false}$j$::jsonb,
    'The passage says the word "genius" is universally associated with Leonardo and that 500 years have passed since his death, but it never states when people first called him a genius.',
    $j${"ieltsNumber":27,"ieltsType":"TRUE/FALSE/NOT GIVEN"}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q28',
    2,
    'true_false_not_given',
    $t$Do the following statements agree with the information given in Reading Passage 3?

The current climate crisis is predicted to cause more deaths than the plague.$t$,
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["Not Given"],"caseSensitive":false}$j$::jsonb,
    'The text notes the plague caused some 200 million deaths and that the climate crisis is predicted to cause death if unaddressed, but it makes no comparison of the death tolls.',
    $j${"ieltsNumber":28,"ieltsType":"TRUE/FALSE/NOT GIVEN"}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q29',
    3,
    'true_false_not_given',
    $t$Do the following statements agree with the information given in Reading Passage 3?

Some of the challenges we face today can be compared to those of earlier times.$t$,
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["True"],"caseSensitive":false}$j$::jsonb,
    $t$"Then, as now, radical solutions were called for" directly draws a parallel between the plague-era crisis and today's climate crisis.$t$,
    $j${"ieltsNumber":29,"ieltsType":"TRUE/FALSE/NOT GIVEN"}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q30',
    4,
    'true_false_not_given',
    $t$Do the following statements agree with the information given in Reading Passage 3?

Leonardo da Vinci's 'ideal city' was constructed in the 15th century.$t$,
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["False"],"caseSensitive":false}$j$::jsonb,
    'The passage states the "ideal city" project, due to its excessive costs, would remain unfulfilled — it was never built.',
    $j${"ieltsNumber":30,"ieltsType":"TRUE/FALSE/NOT GIVEN"}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q31',
    5,
    'true_false_not_given',
    $t$Do the following statements agree with the information given in Reading Passage 3?

Poor town planning is a major contributor to climate change.$t$,
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["True"],"caseSensitive":false}$j$::jsonb,
    'The text says "unsustainable urban models are a key cause of global climate change today," matching the idea that poor town planning is a major contributor.',
    $j${"ieltsNumber":31,"ieltsType":"TRUE/FALSE/NOT GIVEN"}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q32',
    6,
    'true_false_not_given',
    $t$Do the following statements agree with the information given in Reading Passage 3?

In Renaissance times, local people fought against the changes to Pienza and Ferrara.$t$,
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["Not Given"],"caseSensitive":false}$j$::jsonb,
    'The passage mentions the reconfiguration of Pienza and the expansion of Ferrara as inspiring urban projects, but says nothing about local people opposing them.',
    $j${"ieltsNumber":32,"ieltsType":"TRUE/FALSE/NOT GIVEN"}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q33',
    7,
    'true_false_not_given',
    $t$Do the following statements agree with the information given in Reading Passage 3?

Leonardo da Vinci kept a neat, organised record of his designs.$t$,
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["False"],"caseSensitive":false}$j$::jsonb,
    'The passage refers to "his disordered way of working with notes and sketches," contradicting the idea of a neat, organised record.',
    $j${"ieltsNumber":33,"ieltsType":"TRUE/FALSE/NOT GIVEN"}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q34',
    8,
    'sentence_completion',
    $t$Complete the summary below.

Leonardo da Vinci's ideal city

A collection of Leonardo da Vinci's paperwork reveals his design of a new city beside the Ticino River. This was to provide better 34 __________ for trade and a less polluted environment.$t$,
    null::jsonb,
    $j${"answers":["transport"],"caseSensitive":false}$j$::jsonb,
    'The passage states he designed the city "for the easy transport of goods and clean urban spaces."',
    $j${"ieltsNumber":34,"ieltsType":"Summary completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q35',
    9,
    'sentence_completion',
    $t$Complete the summary below.

Although Leonardo da Vinci's city shared many of the ideals of his time, some of his innovations were considered unconventional in their design. They included features that can be seen in some tower blocks today, such as 35 __________ on the exterior of a building.$t$,
    null::jsonb,
    $j${"answers":["staircases"],"caseSensitive":false}$j$::jsonb,
    $t$He wanted the city built on several levels "linked with vertical outdoor staircases," a design seen in some of today's high-rise buildings.$t$,
    $j${"ieltsNumber":35,"ieltsType":"Summary completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q36',
    10,
    'sentence_completion',
    $t$Complete the summary below.

Leonardo da Vinci wasn't only an architect. His expertise in 36 __________ was evident in his plans for artificial canals within his ideal city.$t$,
    null::jsonb,
    $j${"answers":["engineering"],"caseSensitive":false}$j$::jsonb,
    'The passage says the true originality of his vision was "its fusion of architecture and engineering," referring to his hydraulic plants and artificial canals.',
    $j${"ieltsNumber":36,"ieltsType":"Summary completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q37',
    11,
    'sentence_completion',
    $t$Complete the summary below.

He also believed that the height of houses should relate to the width of streets in case earthquakes occurred. The design of many cities in Italy today follows this 37 __________.$t$,
    null::jsonb,
    $j${"answers":["rule"],"caseSensitive":false}$j$::jsonb,
    'The passage describes matching street width to house height as "a rule still followed in many contemporary cities across Italy."',
    $j${"ieltsNumber":37,"ieltsType":"Summary completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q38',
    12,
    'sentence_completion',
    $t$Complete the summary below.

While some cities from 38 __________ times have aspects that can also be found in Leonardo's designs, his ideas weren't put into practice until long after his death.$t$,
    null::jsonb,
    $j${"answers":["Roman"],"caseSensitive":false}$j$::jsonb,
    $t$The text notes "some of these features existed in Roman cities" before Leonardo's drawings.$t$,
    $j${"ieltsNumber":38,"ieltsType":"Summary completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q39',
    13,
    'sentence_completion',
    $t$Complete the summary below.

39 __________ is one example of a city that was redesigned in the 19th century in the way that Leonardo had envisaged.$t$,
    null::jsonb,
    $j${"answers":["Paris"],"caseSensitive":false}$j$::jsonb,
    $t$The subdivision of the city by function is "an idea that can be found in Georges-Eugène Haussmann's renovation of Paris" in the 19th century.$t$,
    $j${"ieltsNumber":39,"ieltsType":"Summary completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t2-p3-q40',
    14,
    'sentence_completion',
    $t$Complete the summary below.

His ideas are also relevant to today's world, where building 40 __________ no longer seems to be the best approach.$t$,
    null::jsonb,
    $j${"answers":["outwards"],"caseSensitive":false}$j$::jsonb,
    'Scholars favour "the compact city, built upwards instead of outwards," implying building outwards is no longer the best approach.',
    $j${"ieltsNumber":40,"ieltsType":"Summary completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-cam18-t2-ai-future'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- writing · Cambridge 18 · Test 2 · Writing
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'writing-cam18-t2',
  'writing',
  'progressive',
  'Cambridge 18 · Test 2 · Writing',
  'Cambridge IELTS 18 · Test 2 · Writing Task 1 & Task 2.',
  'medium',
  'writing_prompt',
  null,
  null,
  null,
  '/images/cam18/t2-writing-task1.jpg',
  3600,
  $j${"source":"cambridge-ielts-18","test":2,"paper":"writing","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t2-writing-q1',
    1,
    'writing_task',
    $t$You should spend about 20 minutes on this task.

The chart below shows the number of households in the US by their annual income in 2007, 2011 and 2015.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Task 1 report. Assessed on task achievement, coherence, lexical resource, and grammar rather than an exact answer.',
    $j${"ieltsNumber":1,"ieltsType":"writing_task_1","taskType":"task_1","wordTarget":150}$j$::jsonb
  ),
  (
    'cam18-t2-writing-q2',
    2,
    'writing_task',
    $t$You should spend about 40 minutes on this task.

Write about the following topic:

Some university students want to learn about other subjects in addition to their main subjects. Others believe it is more important to give all their time and attention to studying for a qualification.

Discuss both these views and give your own opinion.

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Task 2 essay. Assessed on task response, coherence, lexical resource, and grammar rather than an exact answer.',
    $j${"ieltsNumber":2,"ieltsType":"writing_task_2","taskType":"task_2","wordTarget":250}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'writing-cam18-t2'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- speaking · Cambridge 18 · Test 2 · Speaking
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'speaking-cam18-t2',
  'speaking',
  'progressive',
  'Cambridge 18 · Test 2 · Speaking',
  'Cambridge IELTS 18 · Test 2 · Speaking Parts 1–3.',
  'medium',
  'speaking_prompt',
  null,
  null,
  null,
  null,
  840,
  $j${"source":"cambridge-ielts-18","test":2,"paper":"speaking","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t2-speaking-q1',
    1,
    'speaking_response',
    $t$Part 1 (Interview) — Topic: Science

- Did you like studying science when you were at school? [Why/Why not?]
- What do you remember about your science teachers at school?
- How interested are you in science now? [Why/Why not?]
- What do you think has been an important recent scientific development? [Why?]$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Part 1 answers should be short, direct and personal. Assessed on fluency, vocabulary, grammar and pronunciation rather than an exact answer.',
    $j${"ieltsType":"speaking_part_1","part":1}$j$::jsonb
  ),
  (
    'cam18-t2-speaking-q2',
    2,
    'speaking_response',
    $t$Part 2 (Long turn) — Cue card

Describe a tourist attraction in your country that you would recommend.

You should say:
- what the tourist attraction is
- where in your country this tourist attraction is
- what visitors can see and do at this tourist attraction
- and explain why you would recommend this tourist attraction.

You will have to talk about the topic for one to two minutes. You have one minute to think about what you are going to say. You can make some notes to help you if you wish.$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Speak for 1–2 minutes after 1 minute of preparation. Assessed on fluency, coherence, vocabulary, grammar and pronunciation.',
    $j${"ieltsType":"speaking_part_2","part":2,"prepSeconds":60,"responseSeconds":120}$j$::jsonb
  ),
  (
    'cam18-t2-speaking-q3',
    3,
    'speaking_response',
    $t$Part 3 (Discussion)

Museums and art galleries
- What are the most popular museums and art galleries where you live?
- Do you believe that all museums and art galleries should be free?
- What kinds of things make a museum or art gallery an interesting place to visit?

The holiday industry
- Why, do you think, do some people book package holidays rather than travelling independently?
- Would you say that large numbers of tourists cause problems for local people?
- What sort of impact can large holiday resorts have on the environment?$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Part 3 answers should be developed with reasons and examples. Assessed on the ability to discuss abstract ideas, plus fluency, vocabulary, grammar and pronunciation.',
    $j${"ieltsType":"speaking_part_3","part":3}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'speaking-cam18-t2'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Wayside Camera Club Membership Form
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t3-p1',
  'listening',
  'challenge',
  'Wayside Camera Club Membership Form',
  'Cambridge IELTS 18 · Test 3 · Listening Part 1 (Questions 1–10).',
  'medium',
  'audio',
  null,
  '/audio/cam18/t3-p1.mp3',
  $t$BREDA: Hello, Wayside Camera Club, Breda speaking.

DAN: Oh, hello, um, my name's Dan and I'd like to join your club.

BREDA: That's great, Dan. We have an application form – would you like to complete it over the phone, then you can ask any questions you might have?

DAN: Oh, yes, thanks.

BREDA: OK, so what's your family name?

DAN: It's Green – Dan Green.

BREDA: So – can I take your email address?

DAN: Yes, it's dan1068@market.com.

BREDA: Thanks. And what about your home address?

DAN: Well, I'm about ten miles away from your club in Peacetown. I live in a house there.

BREDA: OK, so what's the house number and street?

DAN: It's 52 Marrowfield Street.

BREDA: Is that M-A double R-O-W-F-I-E-L-D?

DAN: That's right.

BREDA: ... and that's Peacetown, you said?

DAN: Uhuh.

BREDA: So how did you hear about our club? Did you look on the internet?

DAN: I usually do that, but this time, well, I was talking to a relative the other day and he suggested it.

BREDA: Oh, is he a member too?

DAN: He belongs to another club – but he'd heard good things about yours.

BREDA: OK. So what do you hope to get from joining?

DAN: Well, one thing that really interests me is the competitions that you have. I enjoy entering those.

BREDA: Right. Anything else?

DAN: Well, I also like to socialise with other photographers.

BREDA: That's great. So what type of membership would you like?

DAN: What are the options?

BREDA: It's £30 a year for full membership or £20 a year if you're an associate.

DAN: I think I'll go for the full membership, then.

BREDA: That's a good idea because you can't vote in meetings with an associate membership. If I could just find out a bit more about you ... OK. So you said you wanted to compete – have you ever won any photography competitions?

DAN: Not yet, but I have entered three in the past.

BREDA: Oh, that's interesting. So why don't you tell me something about those? Let's start with the first one.

DAN: Well, the theme was entitled 'Domestic Life'.

BREDA: I see – so it had to be something related to the home?

DAN: Yeah. I chose to take a photo of a family sitting round the dinner table having a meal, and, um, I didn't win, but I did get some feedback.

BREDA: Oh, what did the judges say?

DAN: That it was too 'busy' as a picture.

BREDA: Aha – so it was the composition of the picture that they criticised?

DAN: That's right – and once they'd told me that, I could see my mistake.

BREDA: So what was the theme of the second competition?

DAN: Well, my university was on the coast and that area gets a lot of beautiful sunsets, so that was the theme.

BREDA: Oh, sunsets, that's a great theme.

DAN: Yes. The instructions were to capture the clouds as well – it couldn't just be blue sky and a setting sun.

BREDA: Sure, cause they give you all those amazing pinks and purples.

DAN: Yeah – and I thought I'd done that well, but the feedback was that I should have waited a bit longer to get the shot.

BREDA: I see.

DAN: So the timing wasn't right. Yes – I took it too soon, basically. And then the third competition I entered was called 'Animal Magic'.

BREDA: Well, that's a difficult subject!

DAN: I know! I had to take hundreds of shots.

BREDA: I'm sure – because animals move all the time.

DAN: That's what we had to show – there had to be some movement in the scene. I got a great shot of a fox in the end, but I took it at night and, well, I suspected that it was a bit dark, which is what I was told.

BREDA: Well Dan – you seem to be really keen and we'd be delighted to have you in our club. I'm sure we can help with all those areas that you've outlined.

DAN: Thanks, that's great.$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":3,"part":1,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t3-l1-q1',
    1,
    'sentence_completion',
    $t$Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.
Wayside Camera Club membership form
Home address: 52 __________ Street, Peacetown$t$,
    null::jsonb,
    $j${"answers":["Marrowfield"],"caseSensitive":false}$j$::jsonb,
    $t$Dan gives his address as 'It's 52 Marrowfield Street', then spells it out: M-A double R-O-W-F-I-E-L-D.$t$,
    $j${"ieltsNumber":1,"ieltsType":"form completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t3-l1-q2',
    2,
    'sentence_completion',
    $t$Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.
Wayside Camera Club membership form
Heard about us: from a __________$t$,
    null::jsonb,
    $j${"answers":["relative"],"caseSensitive":false}$j$::jsonb,
    $t$Dan says he usually looks online, 'but this time ... I was talking to a relative the other day and he suggested it.'$t$,
    $j${"ieltsNumber":2,"ieltsType":"form completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t3-l1-q3',
    3,
    'sentence_completion',
    $t$Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.
Wayside Camera Club membership form
Reasons for joining: to enter competitions; to __________ with other photographers$t$,
    null::jsonb,
    $j${"answers":["socialise"],"caseSensitive":false,"acceptedAlternatives":["socialize"]}$j$::jsonb,
    $t$Asked what else he hopes to get from joining, Dan says 'I also like to socialise with other photographers.'$t$,
    $j${"ieltsNumber":3,"ieltsType":"form completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t3-l1-q4',
    4,
    'sentence_completion',
    $t$Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.
Wayside Camera Club membership form
Type of membership: __________ membership (£30)$t$,
    null::jsonb,
    $j${"answers":["full"],"caseSensitive":false}$j$::jsonb,
    $t$Breda offers £30 a year for full membership or £20 for associate; Dan replies 'I think I'll go for the full membership, then.'$t$,
    $j${"ieltsNumber":4,"ieltsType":"form completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t3-l1-q5',
    5,
    'sentence_completion',
    $t$Complete the table below. Write NO MORE THAN TWO WORDS for each answer.
Photography competitions
Title of competition: __________ (Instructions: A scene in the home; Feedback to Dan: The picture’s composition was not good.)$t$,
    null::jsonb,
    $j${"answers":["Domestic Life"],"caseSensitive":false}$j$::jsonb,
    $t$Of the first competition Dan says 'the theme was entitled ‘Domestic Life’', and Breda confirms it had to relate to the home.$t$,
    $j${"ieltsNumber":5,"ieltsType":"table completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t3-l1-q6',
    6,
    'sentence_completion',
    $t$Complete the table below. Write NO MORE THAN TWO WORDS for each answer.
Photography competitions
‘Beautiful Sunsets’ – Instructions: Scene must show some __________$t$,
    null::jsonb,
    $j${"answers":["clouds"],"caseSensitive":false}$j$::jsonb,
    $t$Dan says 'The instructions were to capture the clouds as well – it couldn’t just be blue sky and a setting sun.'$t$,
    $j${"ieltsNumber":6,"ieltsType":"table completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t3-l1-q7',
    7,
    'sentence_completion',
    $t$Complete the table below. Write NO MORE THAN TWO WORDS for each answer.
Photography competitions
‘Beautiful Sunsets’ – Feedback to Dan: The __________ was wrong.$t$,
    null::jsonb,
    $j${"answers":["timing"],"caseSensitive":false}$j$::jsonb,
    $t$The feedback was that he should have waited longer for the shot, and Dan concludes 'So the timing wasn’t right ... I took it too soon.'$t$,
    $j${"ieltsNumber":7,"ieltsType":"table completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t3-l1-q8',
    8,
    'sentence_completion',
    $t$Complete the table below. Write NO MORE THAN TWO WORDS for each answer.
Photography competitions
Title of competition: __________ (Feedback to Dan: The photograph was too dark.)$t$,
    null::jsonb,
    $j${"answers":["Animal Magic"],"caseSensitive":false}$j$::jsonb,
    $t$Dan says 'the third competition I entered was called ‘Animal Magic’.'$t$,
    $j${"ieltsNumber":8,"ieltsType":"table completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t3-l1-q9',
    9,
    'sentence_completion',
    $t$Complete the table below. Write NO MORE THAN TWO WORDS for each answer.
‘Animal Magic’ – Instructions: Scene must show __________$t$,
    null::jsonb,
    $j${"answers":["movement"],"caseSensitive":false,"acceptedAlternatives":["animal movement"]}$j$::jsonb,
    $t$After Breda notes animals move all the time, Dan says 'That’s what we had to show – there had to be some movement in the scene.'$t$,
    $j${"ieltsNumber":9,"ieltsType":"table completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  ),
  (
    'cam18-t3-l1-q10',
    10,
    'sentence_completion',
    $t$Complete the table below. Write NO MORE THAN TWO WORDS for each answer.
‘Animal Magic’ – Feedback to Dan: The photograph was too __________$t$,
    null::jsonb,
    $j${"answers":["dark"],"caseSensitive":false}$j$::jsonb,
    $t$Dan took the fox photo at night and 'suspected that it was a bit dark, which is what I was told.'$t$,
    $j${"ieltsNumber":10,"ieltsType":"table completion","instruction":"NO MORE THAN TWO WORDS."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t3-p1'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Picking Wild Mushrooms
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t3-p2',
  'listening',
  'challenge',
  'Picking Wild Mushrooms',
  'Cambridge IELTS 18 · Test 3 · Listening Part 2 (Questions 11–20).',
  'medium',
  'audio',
  null,
  '/audio/cam18/t3-p2.mp3',
  $t$PRESENTER: This evening we're delighted to welcome Dan Beagle, who's just written a book on looking for and finding food in the wild. He's going to tell us everything we need to know about picking wild mushrooms.

DAN: Thank you very much. Well, I need to start by talking about safety. You really need to know what you're doing because some mushrooms are extremely poisonous. Having said that, once you know what to look for, it's really worth doing for the amazing variety of mushrooms available – which you can't get in the shops. But of course, you have to be very careful and that's why I always say you should never consume mushrooms picked by friends or neighbours – always remember that some poisonous mushrooms look very similar to edible ones and it's easy for people to get confused. The other thing to avoid is mushrooms growing beside busy roads for obvious reasons. But nothing beats the taste of freshly picked mushrooms – don't forget that the ones in the shops are often several days old and past their best.

There are certain ideas about wild mushrooms that it's important to be aware of. Don't listen to people who tell you that it's only OK to eat mushrooms that are pale or dull – this is completely untrue. Some edible mushrooms are bright red, for example. Personally, I prefer mushrooms cooked but it won't do you any harm to eat them uncooked in salads – it's not necessary to peel them. Another thing you should remember is that you can't tell if a mushroom is safe to eat by its smell – some of the most deadly mushrooms have no smell and taste quite nice, apparently. Finally, just because deer or squirrels eat a particular mushroom doesn't mean that you can.

Of course, mushroom picking is associated with the countryside but if you haven't got a car, your local park can be a great place to start. There are usually a range of habitats where mushrooms grow, such as playing fields and wooded areas. But you need to be there first thing in the morning, as there's likely be a lot of competition – not just from people but wildlife too. The deer often get the best mushrooms in my local park.

If you're a complete beginner, I wouldn't recommend going alone or relying on photos in a book, even the one I've written! There are some really good phone apps for identifying mushrooms, but you can't always rely on getting a good signal in the middle of a wood. If possible, you should go with a group led by an expert – you'll stay safe and learn a lot that way.

Conservation is a really important consideration and you must follow a few basic rules. You should never pick all the mushrooms in one area – collect only enough for your own needs. Be very careful that you don't trample on young mushrooms or other plants. And make sure you don't pick any mushrooms that are endangered and protected by law.

There's been a decline in some varieties of wild mushrooms in this part of the country. Restaurants are becoming more interested in locally sourced food like wild mushrooms, but the biggest problem is that so many new houses have been built in this area in the last ten years. And more water is being taken from rivers and reservoirs because of this, and mushroom habitats have been destroyed.

Anyway, a word of advice on storing mushrooms. Collect them in a brown paper bag and as soon as you get home, put them in the fridge. They'll be fine for a couple of days, but it's best to cook them as soon as possible – after washing them really carefully first, of course.

So everybody knows what a mushroom tastes like, right? Well, you'll be surprised by the huge variety of wild mushrooms there are. Be adventurous! They're great in so many dishes – stir fries, risottos, pasta. But just be aware that some people can react badly to certain varieties so it's a good idea not to eat huge quantities to begin with.

OK, so now I'm going to show you ...$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":3,"part":2,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t3-l2-q11',
    1,
    'multiple_choice',
    $t$Choose TWO letters, A–E — this is one of a pair; enter one correct letter here and the other in the paired question.
Which TWO warnings does Dan give about picking mushrooms?
A Don't pick more than one variety of mushroom at a time.
B Don't pick mushrooms near busy roads.
C Don't eat mushrooms given to you.
D Don't eat mushrooms while picking them.
E Don't pick old mushrooms.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","C"],"caseSensitive":false}$j$::jsonb,
    $t$Dan says you should never consume mushrooms picked by friends or neighbours (C), and 'the other thing to avoid is mushrooms growing beside busy roads' (B).$t$,
    $j${"ieltsNumber":11,"ieltsType":"multiple choice (choose TWO)","instruction":"Choose TWO letters.","pairWith":12}$j$::jsonb
  ),
  (
    'cam18-t3-l2-q12',
    2,
    'multiple_choice',
    $t$Choose TWO letters, A–E — this is one of a pair; enter one correct letter here and the other in the paired question.
Which TWO warnings does Dan give about picking mushrooms?
A Don't pick more than one variety of mushroom at a time.
B Don't pick mushrooms near busy roads.
C Don't eat mushrooms given to you.
D Don't eat mushrooms while picking them.
E Don't pick old mushrooms.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","C"],"caseSensitive":false}$j$::jsonb,
    'The two warnings are avoiding mushrooms beside busy roads (B) and never eating mushrooms picked by friends or neighbours (C).',
    $j${"ieltsNumber":12,"ieltsType":"multiple choice (choose TWO)","instruction":"Choose TWO letters.","pairWith":11}$j$::jsonb
  ),
  (
    'cam18-t3-l2-q13',
    3,
    'multiple_choice',
    $t$Choose TWO letters, A–E — this is one of a pair; enter one correct letter here and the other in the paired question.
Which TWO ideas about wild mushrooms does Dan say are correct?
A Mushrooms should always be peeled before eating.
B Mushrooms eaten by animals may be unsafe.
C Cooking destroys toxins in mushrooms.
D Brightly coloured mushrooms can be edible.
E All poisonous mushrooms have a bad smell.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","D"],"caseSensitive":false}$j$::jsonb,
    $t$Dan says the idea that only pale or dull mushrooms are safe is untrue – 'some edible mushrooms are bright red' (D) – and that just because deer or squirrels eat a mushroom doesn't mean you can (B).$t$,
    $j${"ieltsNumber":13,"ieltsType":"multiple choice (choose TWO)","instruction":"Choose TWO letters.","pairWith":14}$j$::jsonb
  ),
  (
    'cam18-t3-l2-q14',
    4,
    'multiple_choice',
    $t$Choose TWO letters, A–E — this is one of a pair; enter one correct letter here and the other in the paired question.
Which TWO ideas about wild mushrooms does Dan say are correct?
A Mushrooms should always be peeled before eating.
B Mushrooms eaten by animals may be unsafe.
C Cooking destroys toxins in mushrooms.
D Brightly coloured mushrooms can be edible.
E All poisonous mushrooms have a bad smell.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","D"],"caseSensitive":false}$j$::jsonb,
    'Bright red mushrooms can be edible (D), and mushrooms eaten by deer or squirrels are not necessarily safe for people (B). He also says peeling is not necessary (not A) and deadly mushrooms may have no smell (not E).',
    $j${"ieltsNumber":14,"ieltsType":"multiple choice (choose TWO)","instruction":"Choose TWO letters.","pairWith":13}$j$::jsonb
  ),
  (
    'cam18-t3-l2-q15',
    5,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
What advice does Dan give about picking mushrooms in parks?$t$,
    $j$["A – Choose wooded areas.","B – Don't disturb wildlife.","C – Get there early."]$j$::jsonb,
    $j${"answers":["C – Get there early."],"caseSensitive":false}$j$::jsonb,
    $t$Dan says 'you need to be there first thing in the morning, as there's likely be a lot of competition – not just from people but wildlife too.'$t$,
    $j${"ieltsNumber":15,"ieltsType":"multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t3-l2-q16',
    6,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
Dan says it is a good idea for beginners to$t$,
    $j$["A – use a mushroom app.","B – join a group.","C – take a reference book."]$j$::jsonb,
    $j${"answers":["B – join a group."],"caseSensitive":false}$j$::jsonb,
    $t$For complete beginners Dan advises 'If possible, you should go with a group led by an expert', warning against going alone, relying on book photos, or depending on a phone signal.$t$,
    $j${"ieltsNumber":16,"ieltsType":"multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t3-l2-q17',
    7,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
What does Dan say is important for conservation?$t$,
    $j$["A – selecting only fully grown mushrooms","B – picking a limited amount of mushrooms","C – avoiding areas where rare mushroom species grow"]$j$::jsonb,
    $j${"answers":["B – picking a limited amount of mushrooms"],"caseSensitive":false}$j$::jsonb,
    $t$On conservation Dan says 'You should never pick all the mushrooms in one area – collect only enough for your own needs.'$t$,
    $j${"ieltsNumber":17,"ieltsType":"multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t3-l2-q18',
    8,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
According to Dan, some varieties of wild mushrooms are in decline because there is$t$,
    $j$["A – a huge demand for them from restaurants.","B – a lack of rain in this part of the country.","C – a rise in building developments locally."]$j$::jsonb,
    $j${"answers":["C – a rise in building developments locally."],"caseSensitive":false}$j$::jsonb,
    $t$Dan mentions restaurant interest but says 'the biggest problem is that so many new houses have been built in this area in the last ten years.'$t$,
    $j${"ieltsNumber":18,"ieltsType":"multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t3-l2-q19',
    9,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
Dan says that when storing mushrooms, people should$t$,
    $j$["A – keep them in the fridge for no more than two days.","B – keep them in a brown bag in a dark room.","C – leave them for a period after washing them."]$j$::jsonb,
    $j${"answers":["A – keep them in the fridge for no more than two days."],"caseSensitive":false}$j$::jsonb,
    $t$Dan advises putting mushrooms in the fridge as soon as you get home: 'They'll be fine for a couple of days, but it's best to cook them as soon as possible.'$t$,
    $j${"ieltsNumber":19,"ieltsType":"multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t3-l2-q20',
    10,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
What does Dan say about trying new varieties of mushrooms?$t$,
    $j$["A – Experiment with different recipes.","B – Expect some to have a strong taste.","C – Cook them for a long time."]$j$::jsonb,
    $j${"answers":["A – Experiment with different recipes."],"caseSensitive":false}$j$::jsonb,
    $t$Dan urges listeners to 'Be adventurous!' because wild mushrooms are 'great in so many dishes – stir fries, risottos, pasta.'$t$,
    $j${"ieltsNumber":20,"ieltsType":"multiple choice"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t3-p2'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Automation and the Future of Work
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t3-p3',
  'listening',
  'challenge',
  'Automation and the Future of Work',
  'Cambridge IELTS 18 · Test 3 · Listening Part 3 (Questions 21–30).',
  'medium',
  'audio',
  null,
  '/audio/cam18/t3-p3.mp3',
  $t$YOUNG MAN: That seminar yesterday on automation and the future of work was really good, wasn't it? Looking at the first industrial revolution in Britain in the 19th century and seeing how people reacted to massive change was a real eye-opener.

YOUNG WOMAN: Yes. It was interesting to hear how people felt about automation then and what challenges they faced. I didn't know that it first started with workers in the textile industry.

YOUNG MAN: With those protesting workers called the Luddites destroying their knitting machines because they were so worried about losing their jobs.

YOUNG WOMAN: Yes, and ultimately, they didn't achieve anything. And anyway industrialisation created more jobs than it destroyed.

YOUNG MAN: Yes, that's true – but it probably didn't seem a positive thing at the time. I can see why the Luddites felt so threatened.

YOUNG WOMAN: I know. I'm sure I would have felt the same. The discussion about the future of work was really optimistic for a change. I like the idea that work won't involve doing boring, repetitive tasks, as robots will do all that. Normally, you only hear negative stuff about the future.

YOUNG MAN: Bit too optimistic, don't you think? For example, I can't see how people are about to have more leisure time, when all the evidence shows people are spending longer than ever at work.

YOUNG WOMAN: No – that's true. And what about lower unemployment?

YOUNG MAN: I'm not so sure about that. Perhaps in the long term – but not in the foreseeable future.

YOUNG WOMAN: Mmm. And I expect most people will be expected to work until they're much older – as everyone's living much longer.

YOUNG MAN: That's already happening.

YOUNG WOMAN: I enjoyed all that stuff on how technology has changed some jobs and how they're likely to change in the near future.

YOUNG MAN: Yeah, incredible. Like accountants. You might think all the technological innovations would have put them out of a job, but in fact there are more of them than ever. They're still really in demand and have become far more efficient.

YOUNG WOMAN: Right. That was amazing. Twenty times more accountants in this country compared to the 19th century.

YOUNG MAN: I know. I'd never have thought that demand for hairdressing would have gone up so much in the last hundred years. One hairdresser for every 287 people now, compared to one for over 1,500.

YOUNG WOMAN: Yeah, because people's earning power has gone up so they can afford to spend more on personal services like that.

YOUNG MAN: But technology hasn't changed the actual job that much.

YOUNG WOMAN: No, they've got hairdryers, etc. but it's one job where you don't depend on a computer ... The kind of work that administrative staff do has changed enormously, thanks to technology. Even 20 years ago there were secretaries doing dictation and typing.

YOUNG MAN: Yes. Really boring compared to these days, when they're given much more responsibility and higher status.

YOUNG WOMAN: Mmm. A lot of graduates go in for this kind of work now ... I'd expected there to be a much bigger change in the number of agricultural workers in the 19th century. But the 1871 census showed that roughly 25% of the population worked on the land.

YOUNG MAN: Yeah, I'd have assumed it would be more than 50%. Now it's less than 0.2%.

YOUNG WOMAN: What about care workers?

YOUNG MAN: They barely existed in the 19th century as people's lifespan was so much shorter. But now of course this sector will see huge growth.

YOUNG WOMAN: Yeah – and it's hard enough to meet current demand. The future looks quite bleak for bank clerks. They've been in decline since ATMs were introduced in the eighties.

YOUNG MAN: And technology will certainly make most of the jobs they do now redundant, I think.

YOUNG WOMAN: I agree, although the situation may change. It's very hard to predict what ...$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":3,"part":3,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t3-l3-q21',
    1,
    'multiple_choice',
    $t$Questions 21 and 22 — Choose TWO letters, A–E.
Which TWO opinions about the Luddites do the students express?

A Their actions were ineffective.
B They are still influential today.
C They have received unfair criticism.
D They were proved right.
E Their attitude is understandable.

This is one of a pair; enter one correct letter here and the other in the paired question.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["A","E"],"caseSensitive":false}$j$::jsonb,
    $t$The woman says the Luddites 'ultimately didn't achieve anything' (A – ineffective), and the man says 'I can see why the Luddites felt so threatened', with the woman agreeing 'I'm sure I would have felt the same' (E – understandable).$t$,
    $j${"ieltsNumber":21,"ieltsType":"Choose TWO letters, A–E","instruction":"Choose TWO letters.","pairWith":22}$j$::jsonb
  ),
  (
    'cam18-t3-l3-q22',
    2,
    'multiple_choice',
    $t$Questions 21 and 22 — Choose TWO letters, A–E.
Which TWO opinions about the Luddites do the students express?

A Their actions were ineffective.
B They are still influential today.
C They have received unfair criticism.
D They were proved right.
E Their attitude is understandable.

This is one of a pair; enter one correct letter here and the other in the paired question.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["A","E"],"caseSensitive":false}$j$::jsonb,
    $t$Same exchange: 'they didn't achieve anything' gives A, and 'I can see why the Luddites felt so threatened' / 'I would have felt the same' gives E.$t$,
    $j${"ieltsNumber":22,"ieltsType":"Choose TWO letters, A–E","instruction":"Choose TWO letters.","pairWith":21}$j$::jsonb
  ),
  (
    'cam18-t3-l3-q23',
    3,
    'multiple_choice',
    $t$Questions 23 and 24 — Choose TWO letters, A–E.
Which TWO predictions about the future of work are the students doubtful about?

A Work will be more rewarding.
B Unemployment will fall.
C People will want to delay retiring.
D Working hours will be shorter.
E People will change jobs more frequently.

This is one of a pair; enter one correct letter here and the other in the paired question.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","D"],"caseSensitive":false}$j$::jsonb,
    $t$The man doubts people will 'have more leisure time, when all the evidence shows people are spending longer than ever at work' (D – shorter hours), and of 'lower unemployment' he says 'I'm not so sure about that' (B).$t$,
    $j${"ieltsNumber":23,"ieltsType":"Choose TWO letters, A–E","instruction":"Choose TWO letters.","pairWith":24}$j$::jsonb
  ),
  (
    'cam18-t3-l3-q24',
    4,
    'multiple_choice',
    $t$Questions 23 and 24 — Choose TWO letters, A–E.
Which TWO predictions about the future of work are the students doubtful about?

A Work will be more rewarding.
B Unemployment will fall.
C People will want to delay retiring.
D Working hours will be shorter.
E People will change jobs more frequently.

This is one of a pair; enter one correct letter here and the other in the paired question.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","D"],"caseSensitive":false}$j$::jsonb,
    $t$Same exchange: doubt about more leisure time / shorter working hours (D) and about 'lower unemployment' (B).$t$,
    $j${"ieltsNumber":24,"ieltsType":"Choose TWO letters, A–E","instruction":"Choose TWO letters.","pairWith":23}$j$::jsonb
  ),
  (
    'cam18-t3-l3-q25',
    5,
    'multiple_choice',
    $t$Questions 25–30 — What comment do the students make about each of the following jobs?
Choose SIX answers from the box and write the correct letter, A–G.

25 Accountants$t$,
    $j$["A – These jobs are likely to be at risk.","B – Their role has become more interesting in recent years.","C – The number of people working in this sector has fallen dramatically.","D – This job will require more qualifications.","E – Higher disposable income has led to a huge increase in jobs.","F – There is likely to be a significant rise in demand for this service.","G – Both employment and productivity have risen."]$j$::jsonb,
    $j${"answers":["G – Both employment and productivity have risen."],"caseSensitive":false}$j$::jsonb,
    $t$Of accountants the man says 'there are more of them than ever' and they 'have become far more efficient' — more employment plus higher productivity.$t$,
    $j${"ieltsNumber":25,"ieltsType":"Matching (options A–G)","instruction":"Choose SIX answers from the box, A–G."}$j$::jsonb
  ),
  (
    'cam18-t3-l3-q26',
    6,
    'multiple_choice',
    $t$Questions 25–30 — What comment do the students make about each of the following jobs?
Choose SIX answers from the box and write the correct letter, A–G.

26 Hairdressers$t$,
    $j$["A – These jobs are likely to be at risk.","B – Their role has become more interesting in recent years.","C – The number of people working in this sector has fallen dramatically.","D – This job will require more qualifications.","E – Higher disposable income has led to a huge increase in jobs.","F – There is likely to be a significant rise in demand for this service.","G – Both employment and productivity have risen."]$j$::jsonb,
    $j${"answers":["E – Higher disposable income has led to a huge increase in jobs."],"caseSensitive":false}$j$::jsonb,
    $t$Demand for hairdressing 'gone up so much', because 'people's earning power has gone up so they can afford to spend more on personal services'.$t$,
    $j${"ieltsNumber":26,"ieltsType":"Matching (options A–G)","instruction":"Choose SIX answers from the box, A–G."}$j$::jsonb
  ),
  (
    'cam18-t3-l3-q27',
    7,
    'multiple_choice',
    $t$Questions 25–30 — What comment do the students make about each of the following jobs?
Choose SIX answers from the box and write the correct letter, A–G.

27 Administrative staff$t$,
    $j$["A – These jobs are likely to be at risk.","B – Their role has become more interesting in recent years.","C – The number of people working in this sector has fallen dramatically.","D – This job will require more qualifications.","E – Higher disposable income has led to a huge increase in jobs.","F – There is likely to be a significant rise in demand for this service.","G – Both employment and productivity have risen."]$j$::jsonb,
    $j${"answers":["B – Their role has become more interesting in recent years."],"caseSensitive":false}$j$::jsonb,
    $t$Secretaries doing dictation and typing were 'really boring compared to these days, when they're given much more responsibility and higher status'.$t$,
    $j${"ieltsNumber":27,"ieltsType":"Matching (options A–G)","instruction":"Choose SIX answers from the box, A–G."}$j$::jsonb
  ),
  (
    'cam18-t3-l3-q28',
    8,
    'multiple_choice',
    $t$Questions 25–30 — What comment do the students make about each of the following jobs?
Choose SIX answers from the box and write the correct letter, A–G.

28 Agricultural workers$t$,
    $j$["A – These jobs are likely to be at risk.","B – Their role has become more interesting in recent years.","C – The number of people working in this sector has fallen dramatically.","D – This job will require more qualifications.","E – Higher disposable income has led to a huge increase in jobs.","F – There is likely to be a significant rise in demand for this service.","G – Both employment and productivity have risen."]$j$::jsonb,
    $j${"answers":["C – The number of people working in this sector has fallen dramatically."],"caseSensitive":false}$j$::jsonb,
    $t$The 1871 census showed roughly 25% of the population worked on the land; 'now it's less than 0.2%'.$t$,
    $j${"ieltsNumber":28,"ieltsType":"Matching (options A–G)","instruction":"Choose SIX answers from the box, A–G."}$j$::jsonb
  ),
  (
    'cam18-t3-l3-q29',
    9,
    'multiple_choice',
    $t$Questions 25–30 — What comment do the students make about each of the following jobs?
Choose SIX answers from the box and write the correct letter, A–G.

29 Care workers$t$,
    $j$["A – These jobs are likely to be at risk.","B – Their role has become more interesting in recent years.","C – The number of people working in this sector has fallen dramatically.","D – This job will require more qualifications.","E – Higher disposable income has led to a huge increase in jobs.","F – There is likely to be a significant rise in demand for this service.","G – Both employment and productivity have risen."]$j$::jsonb,
    $j${"answers":["F – There is likely to be a significant rise in demand for this service."],"caseSensitive":false}$j$::jsonb,
    $t$Care workers 'barely existed in the 19th century', but 'now of course this sector will see huge growth', and it is 'hard enough to meet current demand'.$t$,
    $j${"ieltsNumber":29,"ieltsType":"Matching (options A–G)","instruction":"Choose SIX answers from the box, A–G."}$j$::jsonb
  ),
  (
    'cam18-t3-l3-q30',
    10,
    'multiple_choice',
    $t$Questions 25–30 — What comment do the students make about each of the following jobs?
Choose SIX answers from the box and write the correct letter, A–G.

30 Bank clerks$t$,
    $j$["A – These jobs are likely to be at risk.","B – Their role has become more interesting in recent years.","C – The number of people working in this sector has fallen dramatically.","D – This job will require more qualifications.","E – Higher disposable income has led to a huge increase in jobs.","F – There is likely to be a significant rise in demand for this service.","G – Both employment and productivity have risen."]$j$::jsonb,
    $j${"answers":["A – These jobs are likely to be at risk."],"caseSensitive":false}$j$::jsonb,
    $t$'The future looks quite bleak for bank clerks'; technology 'will certainly make most of the jobs they do now redundant'.$t$,
    $j${"ieltsNumber":30,"ieltsType":"Matching (options A–G)","instruction":"Choose SIX answers from the box, A–G."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t3-p3'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Space Traffic Management
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t3-p4',
  'listening',
  'challenge',
  'Space Traffic Management',
  'Cambridge IELTS 18 · Test 3 · Listening Part 4 (Questions 31–40).',
  'hard',
  'audio',
  null,
  '/audio/cam18/t3-p4.mp3',
  $t$In today's astronomy lecture, I'm going to talk about the need for a system to manage the movement of satellites and other objects in orbit around the Earth. In other words, a Space Traffic Management system. We already have effective Air Traffic Control systems that are used internationally to ensure that planes navigate our skies safely. Well, Space Traffic Management is a similar concept, but focusing on the control of satellites.

The aim of such a system would be to prevent the danger of collisions in space between the objects in orbit around the Earth. In order to do this, we'd need to have a set of legal measures, and we'd also have to develop the technical systems to enable us to prevent such accidents.

But unfortunately, at present we don't actually have a Space Traffic Management system that works. So why not? What are the problems in developing such a system?

Well, for one thing, satellites are relatively cheap these days, compared with how they were in the past, meaning that more people can afford to put them into space. So there's a lot more of them out there, and people aren't just launching single satellites but whole constellations, consisting of thousands of them designed to work together. So space is getting more crowded every day.

But in spite of this, one thing you may be surprised to learn is that you can launch a satellite into space and, once it's out there, it doesn't have to send back any information to Earth to allow its identification. So while we have international systems for ensuring we know where the planes in our skies are, and to prevent them from colliding with one another, when it comes to the safety of satellites, at present we don't have anything like enough proper ways of tracking them.

And it isn't just entire satellites that we need to consider. A greater threat is the huge amount of space debris in orbit around the Earth – broken bits of satellite and junk from space stations and so on. And some of these are so small that they can be very hard to identify, but they can still be very dangerous.

In addition, some operators may be unwilling to share information about the satellites they've launched. For example, a satellite may be designed for military purposes, or it may have been launched for commercial reasons, and the operators don't want competitors to have information about it.

And even if the operators are willing to provide it, the information isn't easy to collect. Details are needed about the object itself, as well as about its location at a particular time – and remember that a satellite isn't very big, and it's likely to be moving at thousands of kilometres an hour. We don't have any sensors that can constantly follow something moving so fast, so all that the scientists can do is to put forward a prediction concerning where the satellite is heading next.

So those are some of the problems that we're facing. Let's consider now some of the solutions that have been suggested. One key issue is the way in which information is dealt with. We need more information, but it also needs to be accessible at a global level, so we need to establish shared standards that we can all agree on for the way in which this information is presented. We already do this in other areas of science, so although this is a challenge, it's not an impossible task. Then, as all this information's collected, it needs to be put together so it can be used, and that will involve creating a single database on which it can be entered.

As we continue to push forward new developments, congestion of the space environment is only going to increase. To cope with this, we need to develop a system like the one I've described to coordinate the work of the numerous spacecraft operators, but it's also essential that this system is one that establishes trust in the people that use it, both nationally and at a global level.$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":3,"part":4,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t3-l4-q31',
    1,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.

Space Traffic Management

A Space Traffic Management system
- is a concept similar to Air Traffic Control, but for satellites rather than planes.
- would aim to set up legal and 31 ......................... ways of improving safety.
- does not actually exist at present.$t$,
    null::jsonb,
    $j${"answers":["technical"],"caseSensitive":false}$j$::jsonb,
    $t$The lecturer says they would need 'a set of legal measures, and we'd also have to develop the technical systems'.$t$,
    $j${"ieltsNumber":31,"ieltsType":"Note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-l4-q32',
    2,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.

Problems in developing effective Space Traffic Management
- Satellites are now quite 32 ......................... and therefore more widespread.$t$,
    null::jsonb,
    $j${"answers":["cheap"],"caseSensitive":false}$j$::jsonb,
    $t$'satellites are relatively cheap these days, compared with how they were in the past, meaning that more people can afford to put them into space'.$t$,
    $j${"ieltsNumber":32,"ieltsType":"Note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-l4-q33',
    3,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.

- Satellites are now quite cheap and therefore more widespread
  (e.g. there are constellations made up of 33 ......................... of satellites).$t$,
    null::jsonb,
    $j${"answers":["thousands"],"caseSensitive":false}$j$::jsonb,
    $t$'whole constellations, consisting of thousands of them designed to work together'.$t$,
    $j${"ieltsNumber":33,"ieltsType":"Note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-l4-q34',
    4,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.

- At present, satellites are not required to transmit information to help with their 34 ......................... .$t$,
    null::jsonb,
    $j${"answers":["identification"],"caseSensitive":false}$j$::jsonb,
    $t$A satellite 'doesn't have to send back any information to Earth to allow its identification'.$t$,
    $j${"ieltsNumber":34,"ieltsType":"Note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-l4-q35',
    5,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.

- There are few systems for 35 ......................... satellites.$t$,
    null::jsonb,
    $j${"answers":["tracking"],"caseSensitive":false}$j$::jsonb,
    $t$'we don't have anything like enough proper ways of tracking them'.$t$,
    $j${"ieltsNumber":35,"ieltsType":"Note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-l4-q36',
    6,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.

- Small pieces of debris may be difficult to identify.
- Operators may be unwilling to share details of satellites used for 36 ......................... or commercial reasons.$t$,
    null::jsonb,
    $j${"answers":["military"],"caseSensitive":false}$j$::jsonb,
    $t$'a satellite may be designed for military purposes, or it may have been launched for commercial reasons'.$t$,
    $j${"ieltsNumber":36,"ieltsType":"Note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-l4-q37',
    7,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.

- It may be hard to collect details of the object's 37 ......................... at a given time.$t$,
    null::jsonb,
    $j${"answers":["location"],"caseSensitive":false}$j$::jsonb,
    $t$'Details are needed about the object itself, as well as about its location at a particular time'.$t$,
    $j${"ieltsNumber":37,"ieltsType":"Note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-l4-q38',
    8,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.

- Scientists can only make a 38 ......................... about where the satellite will go.$t$,
    null::jsonb,
    $j${"answers":["prediction"],"caseSensitive":false}$j$::jsonb,
    $t$'all that the scientists can do is to put forward a prediction concerning where the satellite is heading next'.$t$,
    $j${"ieltsNumber":38,"ieltsType":"Note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-l4-q39',
    9,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.

Solutions
- Common standards should be agreed on for the presentation of information.
- The information should be combined in one 39 ......................... .$t$,
    null::jsonb,
    $j${"answers":["database"],"caseSensitive":false}$j$::jsonb,
    $t$Collected information 'needs to be put together ... that will involve creating a single database on which it can be entered'.$t$,
    $j${"ieltsNumber":39,"ieltsType":"Note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-l4-q40',
    10,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.

- A coordinated system must be designed to create 40 ......................... in its users.$t$,
    null::jsonb,
    $j${"answers":["trust"],"caseSensitive":false}$j$::jsonb,
    $t$'it's also essential that this system is one that establishes trust in the people that use it'.$t$,
    $j${"ieltsNumber":40,"ieltsType":"Note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t3-p4'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- reading · Materials to take us beyond concrete
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-cam18-t3-p1-beyond-concrete',
  'reading',
  'challenge',
  'Materials to take us beyond concrete',
  'Cambridge IELTS 18 · Test 3 · Reading Passage 1 (Questions 1–13).',
  'medium',
  'passage',
  $t$Concrete is everywhere, but it's bad for the planet, generating large amounts of carbon dioxide - alternatives are being developed.

A Concrete is the second most used substance in the global economy, after water - and one of the world's biggest single sources of greenhouse gas emissions. The chemical process by which cement, the key ingredient of concrete, is created results in large quantities of carbon dioxide. The UN estimates that there will be 9.8 billion people living on the planet by mid-century. They will need somewhere to live. If concrete is the only answer to the construction of new cities, then carbon emissions will soar, aggravating global warming. And so scientists have started innovating with other materials, in a scramble for alternatives to a universal commodity that has underpinned our modern life for many years.

B The problem with replacing concrete is that it is so very good at what it does. Chris Cheeseman, an engineering professor at Imperial College London, says the key thing to consider is the extent to which concrete is used around the world, and is likely to continue to be used. 'Concrete is not a high-carbon product. Cement is high carbon, but concrete is not. But it is the scale on which it is used that makes it high carbon. The sheer scale of manufacture is so huge, that is the issue.'

C Not only are the ingredients of concrete relatively cheap and found in abundance in most places around the globe, the stuff itself has marvellous properties: Portland cement, the vital component of concrete, is mouldable and pourable, but quickly sets hard. Cheeseman also notes another advantage: concrete and steel have similar thermal expansion properties, so steel can be used to reinforce concrete, making it far stronger and more flexible as a building material than it could be on its own. According to Cheeseman, all these factors together make concrete hard to beat. 'Concrete is amazing stuff. Making anything with similar properties is going to be very difficult.'

D A possible alternative to concrete is wood. Making buildings from wood may seem like a rather medieval idea, but climate change is driving architects to turn to treated timber as a possible resource. Recent years have seen the emergence of tall buildings constructed almost entirely from timber. Vancouver, Vienna and Brumunddal in Norway are all home to tall, wooden buildings.

E Using wood to construct buildings, however, is not straightforward. Wood expands as it absorbs moisture from the air and is susceptible to pests, not to mention fire. But treating wood and combining it with other materials can improve its properties. Cross-laminated timber is engineered wood. An adhesive is used to stick layers of solid-sawn timber together, crosswise, to form building blocks. This material is light but has the strength of concrete and steel. Construction experts say that wooden buildings can be constructed at a greater speed than ones of concrete and steel and the process, it seems, is quieter.

F Stora Enso is Europe's biggest supplier of cross-laminated timber, and its vice-president Markus Mannström reports that the company is seeing increasing demand globally for building in wood, with climate change concerns the key driver. Finland, with its large forests, where Stora Enso is based, has been leading the way, but the company is seeing a rise in demand for its timber products across the world, including in Asia. Of course, using timber in a building also locks away the carbon that it absorbed as it grew. But even treated wood has its limitations and only when a wider range of construction projects has been proven in practice will it be possible to see wood as a real alternative to concrete in constructing tall buildings.

G Fly ash and slag from iron ore are possible alternatives to cement in a concrete mix. Fly ash, a byproduct of coal-burning power plants, can be incorporated into concrete mixes to make up as much as 15 to 30% of the cement, without harming the strength or durability of the resulting mix. Iron-ore slag, a byproduct of the iron-ore smelting process, can be used in a similar way. Their incorporation into concrete mixes has the potential to reduce greenhouse gas emissions.

But Anna Surgenor, of the UK's Green Building Council, notes that although these waste products can save carbon in the concrete mix, their use is not always straightforward. 'It's possible to replace the cement content in concrete with waste products to lower the overall carbon impact. But there are several calculations that need to be considered across the entire life cycle of the building - these include factoring in where these materials are being shipped from. If they are transported over long distances, using fossil fuels, the use of alternative materials might not make sense from an overall carbon reduction perspective.'

H While these technologies are all promising ideas, they are either unproven or based on materials that are not abundant. In their overview of innovation in the concrete industry, Felix Preston and Johanna Lehne of the UK's Royal Institute of International Affairs reached the conclusion that, 'Some novel cements have been discussed for more than a decade within the research community, without breaking through. At present, these alternatives are rarely as cost-effective as conventional cement, and they face raw-material shortages and resistance from customers.'$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"cambridge-ielts-18","book":18,"test":3,"passage":1,"ieltsQuestionRange":"1-13","extraction":"mineru-ocr","answerKeyVerified":true,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t3-p1-q1',
    1,
    'multiple_choice',
    $t$Reading Passage 1 has eight sections, A–H. Which section contains the following information? Write the correct letter, A–H.

an explanation of the industrial processes that create potential raw materials for concrete$t$,
    $j$["A","B","C","D","E","F","G","H"]$j$::jsonb,
    $j${"answers":["G"],"caseSensitive":false}$j$::jsonb,
    'Section G explains that fly ash is a byproduct of coal-burning power plants and iron-ore slag a byproduct of iron-ore smelting - industrial processes producing materials that can replace cement.',
    $j${"ieltsNumber":1,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t3-p1-q2',
    2,
    'multiple_choice',
    $t$Reading Passage 1 has eight sections, A–H. Which section contains the following information? Write the correct letter, A–H.

a reference to the various locations where high-rise wooden buildings can be found$t$,
    $j$["A","B","C","D","E","F","G","H"]$j$::jsonb,
    $j${"answers":["D"],"caseSensitive":false}$j$::jsonb,
    'Section D lists Vancouver, Vienna and Brumunddal in Norway as places that are home to tall, wooden buildings.',
    $j${"ieltsNumber":2,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t3-p1-q3',
    3,
    'multiple_choice',
    $t$Reading Passage 1 has eight sections, A–H. Which section contains the following information? Write the correct letter, A–H.

an indication of how widely available the raw materials of concrete are$t$,
    $j$["A","B","C","D","E","F","G","H"]$j$::jsonb,
    $j${"answers":["C"],"caseSensitive":false}$j$::jsonb,
    'Section C states the ingredients of concrete are relatively cheap and found in abundance in most places around the globe.',
    $j${"ieltsNumber":3,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t3-p1-q4',
    4,
    'multiple_choice',
    $t$Reading Passage 1 has eight sections, A–H. Which section contains the following information? Write the correct letter, A–H.

the belief that more high-rise wooden buildings are needed before wood can be regarded as a viable construction material$t$,
    $j$["A","B","C","D","E","F","G","H"]$j$::jsonb,
    $j${"answers":["F"],"caseSensitive":false}$j$::jsonb,
    'Section F says only when a wider range of construction projects has been proven in practice will it be possible to see wood as a real alternative to concrete for tall buildings.',
    $j${"ieltsNumber":4,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t3-p1-q5',
    5,
    'sentence_completion',
    $t$Complete the summary below. Choose ONE WORD ONLY from the passage.

Making buildings with wood

Wood is a traditional building material, but current environmental concerns are encouraging (5) ______ to use wood in modern construction projects.$t$,
    null::jsonb,
    $j${"answers":["architects"],"caseSensitive":false,"acceptedAlternatives":[]}$j$::jsonb,
    'Section D says climate change is driving architects to turn to treated timber as a possible resource.',
    $j${"ieltsNumber":5,"ieltsType":"summary_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-p1-q6',
    6,
    'sentence_completion',
    $t$Complete the summary below. Choose ONE WORD ONLY from the passage.

Making buildings with wood

For example, as (6) ______ in the atmosphere enters wood, it increases in size.$t$,
    null::jsonb,
    $j${"answers":["moisture"],"caseSensitive":false,"acceptedAlternatives":[]}$j$::jsonb,
    'Section E says wood expands as it absorbs moisture from the air.',
    $j${"ieltsNumber":6,"ieltsType":"summary_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-p1-q7',
    7,
    'sentence_completion',
    $t$Complete the summary below. Choose ONE WORD ONLY from the passage.

Making buildings with wood

In one process, (7) ______ of solid wood are glued together to create building blocks.$t$,
    null::jsonb,
    $j${"answers":["layers"],"caseSensitive":false,"acceptedAlternatives":[]}$j$::jsonb,
    'Section E says an adhesive is used to stick layers of solid-sawn timber together to form building blocks.',
    $j${"ieltsNumber":7,"ieltsType":"summary_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-p1-q8',
    8,
    'sentence_completion',
    $t$Complete the summary below. Choose ONE WORD ONLY from the passage.

Making buildings with wood

Experts say that wooden buildings are an improvement on those made of concrete and steel in terms of the (8) ______ with which they can be constructed and how much noise is generated by the process.$t$,
    null::jsonb,
    $j${"answers":["speed"],"caseSensitive":false,"acceptedAlternatives":[]}$j$::jsonb,
    'Section E says wooden buildings can be constructed at a greater speed than ones of concrete and steel.',
    $j${"ieltsNumber":8,"ieltsType":"summary_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t3-p1-q9',
    9,
    'multiple_choice',
    $t$Look at the following statement and the list of people below. Match the statement with the correct person, A, B, C or D. NB You may use any letter more than once.

The environmental advantage of cement alternatives may not be as great as initially assumed.$t$,
    $j$["A – Chris Cheeseman","B – Markus Mannström","C – Anna Surgenor","D – Felix Preston and Johanna Lehne"]$j$::jsonb,
    $j${"answers":["C – Anna Surgenor"],"caseSensitive":false}$j$::jsonb,
    'Anna Surgenor (C) warns that using waste products is not always straightforward and, if shipped over long distances, may not reduce carbon overall.',
    $j${"ieltsNumber":9,"ieltsType":"matching_features"}$j$::jsonb
  ),
  (
    'cam18-t3-p1-q10',
    10,
    'multiple_choice',
    $t$Look at the following statement and the list of people below. Match the statement with the correct person, A, B, C or D. NB You may use any letter more than once.

It would be hard to create a construction alternative to concrete that offers so many comparable benefits.$t$,
    $j$["A – Chris Cheeseman","B – Markus Mannström","C – Anna Surgenor","D – Felix Preston and Johanna Lehne"]$j$::jsonb,
    $j${"answers":["A – Chris Cheeseman"],"caseSensitive":false}$j$::jsonb,
    'Chris Cheeseman (A) says making anything with properties similar to concrete is going to be very difficult.',
    $j${"ieltsNumber":10,"ieltsType":"matching_features"}$j$::jsonb
  ),
  (
    'cam18-t3-p1-q11',
    11,
    'multiple_choice',
    $t$Look at the following statement and the list of people below. Match the statement with the correct person, A, B, C or D. NB You may use any letter more than once.

Worries about the environment have led to increased interest in wood as a construction material.$t$,
    $j$["A – Chris Cheeseman","B – Markus Mannström","C – Anna Surgenor","D – Felix Preston and Johanna Lehne"]$j$::jsonb,
    $j${"answers":["B – Markus Mannström"],"caseSensitive":false}$j$::jsonb,
    'Markus Mannström (B) reports increasing demand for building in wood, with climate change concerns the key driver.',
    $j${"ieltsNumber":11,"ieltsType":"matching_features"}$j$::jsonb
  ),
  (
    'cam18-t3-p1-q12',
    12,
    'multiple_choice',
    $t$Look at the following statement and the list of people below. Match the statement with the correct person, A, B, C or D. NB You may use any letter more than once.

Expense has been a factor in the negative response to the development of new cements.$t$,
    $j$["A – Chris Cheeseman","B – Markus Mannström","C – Anna Surgenor","D – Felix Preston and Johanna Lehne"]$j$::jsonb,
    $j${"answers":["D – Felix Preston and Johanna Lehne"],"caseSensitive":false}$j$::jsonb,
    'Felix Preston and Johanna Lehne (D) concluded that alternative cements are rarely as cost-effective as conventional cement.',
    $j${"ieltsNumber":12,"ieltsType":"matching_features"}$j$::jsonb
  ),
  (
    'cam18-t3-p1-q13',
    13,
    'multiple_choice',
    $t$Look at the following statement and the list of people below. Match the statement with the correct person, A, B, C or D. NB You may use any letter more than once.

The environmental damage caused by concrete is due to it being produced in large quantities.$t$,
    $j$["A – Chris Cheeseman","B – Markus Mannström","C – Anna Surgenor","D – Felix Preston and Johanna Lehne"]$j$::jsonb,
    $j${"answers":["A – Chris Cheeseman"],"caseSensitive":false}$j$::jsonb,
    'Chris Cheeseman (A) says it is the scale on which concrete is used that makes it high carbon.',
    $j${"ieltsNumber":13,"ieltsType":"matching_features"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-cam18-t3-p1-beyond-concrete'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- reading · The steam car
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-cam18-t3-p2-steam-car',
  'reading',
  'challenge',
  'The steam car',
  'Cambridge IELTS 18 · Test 3 · Reading Passage 2 (Questions 14–26).',
  'medium',
  'passage',
  $t$The steam car

The successes and failures of the Doble brothers and their steam cars

A When primitive automobiles first began to appear in the 1800s, their engines were based on steam power. Steam had already enjoyed a long and successful career in the railways, so it was only natural that the technology evolved into a miniaturized version which was separate from the trains. But these early cars inherited steam's weaknesses along with its strengths. The boilers had to be lit by hand, and they required about twenty minutes to build up pressure before they could be driven. Furthermore, their water reservoirs only lasted for about thirty miles before needing replenishment. Despite such shortcomings, these newly designed self-propelled carriages offered quick transportation, and by the early 1900s it was not uncommon to see such machines shuttling wealthy citizens around town.

B But the glory days of steam cars were few. A new technology called the Internal Combustion Engine soon appeared, which offered the ability to drive down the road just moments after starting up. At first, these noisy gasoline cars were unpopular because they were more complicated to operate and they had difficult hand-crank starters, which were known to break arms when the engines backfired. But in 1912 General Motors introduced the electric starter, and over the following few years steam power was gradually phased out.

C Even as the market was declining, four brothers made one last effort to rekindle the technology. Between 1906 and 1909, while still attending high school, Abner Doble and his three brothers built their first steam car in their parents' basement. It comprised parts taken from a wrecked early steam car but reconfigured to drive an engine of their own design. Though it did not run well, the Doble brothers went on to build a second and third prototype in the following years. Though the Doble boys' third prototype, nicknamed the Model B, still lacked the convenience of an internal combustion engine, it drew the attention of automobile trade magazines due to its numerous improvements over previous steam cars. The Model B proved to be superior to gasoline automobiles in many ways. Its high-pressure steam drove the engine pistons in virtual silence, in contrast to clattering gas engines which emitted the aroma of burned hydrocarbons. Perhaps most impressively, the Model B was amazingly swift. It could accelerate from zero to sixty miles per hour in just fifteen seconds, a feat described as 'remarkable acceleration' by Automobile magazine in 1914.

D The following year Abner Doble drove the Model B from Massachusetts to Detroit in order to seek investment in his automobile design, which he used to open the General Engineering Company. He and his brothers immediately began working on the Model C, which was intended to expand upon the innovations of the Model B. The brothers added features such as a key-based ignition in the cabin, eliminating the need for the operator to manually ignite the boiler. With these enhancements, the Dobles' new car company promised a steam vehicle which would provide all of the convenience of a gasoline car, but with much greater speed, much simpler driving controls, and a virtually silent powerplant. By the following April, the General Engineering Company had received 5,390 deposits for Doble Detroits, which were scheduled for delivery in early 1918.

E Later that year Abner Doble delivered unhappy news to those eagerly awaiting the delivery of their modern new cars. Those buyers who received the handful of completed cars complained that the vehicles were sluggish and erratic, sometimes going in reverse when they should go forward. The new engine design, though innovative, was still plagued with serious glitches.

F The brothers made one final attempt to produce a viable steam automobile. In early 1924, the Doble brothers shipped a Model E to New York City to be road-tested by the Automobile Club of America. After sitting overnight in freezing temperatures, the car was pushed out into the road and left to sit for over an hour in the frosty morning air. At the turn of the key, the boiler lit and reached its operating pressure inside of forty seconds. As they drove the test vehicle further, they found that its evenly distributed weight lent it surprisingly good handling, even though it was so heavy. As the new Doble steamer was further developed and tested, its maximum speed was pushed to over a hundred miles per hour, and it achieved about fifteen miles per gallon of kerosene with negligible emissions.

G Sadly, the Dobles' brilliant steam car never was a financial success. Priced at around $18,000 in 1924, it was popular only among the very wealthy. Plus, it is said that no two Model Es were quite the same, because Abner Doble tinkered endlessly with the design. By the time the company folded in 1931, fewer than fifty of the amazing Model E steam cars had been produced. For his whole career, until his death in 1961, Abner Doble remained adamant that steam-powered automobiles were at least equal to gasoline cars, if not superior. Given the evidence, he may have been right. Many of the Model E Dobles which have survived are still in good working condition, some having been driven over half a million miles with only normal maintenance. Astonishingly, an unmodified Doble Model E runs clean enough to pass the emissions laws in California today, and they are pretty strict. It is true that the technology poses some difficult problems, but you cannot help but wonder how efficient a steam car might be with the benefit of modern materials and computers. Under the current pressure to improve automotive performance and reduce emissions, it is not unthinkable that the steam car may rise again.$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"cambridge-ielts-18","book":18,"test":3,"passage":2,"ieltsQuestionRange":"14-26","extraction":"mineru-ocr","answerKeyVerified":true,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t3-p2-q14',
    1,
    'multiple_choice',
    $t$Choose the correct heading for Paragraph A from the list of headings.
Paragraph A$t$,
    $j$["i – A period in cold conditions before the technology is assessed","ii – Marketing issues lead to failure","iii – Good and bad aspects of steam technology are passed on","iv – A possible solution to the issues of today","v – Further improvements lead to commercial orders","vi – Positive publicity at last for this quiet, clean, fast vehicle","vii – A disappointing outcome for customers","viii – A better option than the steam car arises"]$j$::jsonb,
    $j${"answers":["iii – Good and bad aspects of steam technology are passed on"],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph A explains that early steam cars inherited steam's weaknesses along with its strengths, so both the good and bad aspects of the technology were carried over.$t$,
    $j${"ieltsNumber":14,"ieltsType":"List of Headings","instruction":"Choose the correct heading (i–viii) for each paragraph."}$j$::jsonb
  ),
  (
    'cam18-t3-p2-q15',
    2,
    'multiple_choice',
    $t$Choose the correct heading for Paragraph B from the list of headings.
Paragraph B$t$,
    $j$["i – A period in cold conditions before the technology is assessed","ii – Marketing issues lead to failure","iii – Good and bad aspects of steam technology are passed on","iv – A possible solution to the issues of today","v – Further improvements lead to commercial orders","vi – Positive publicity at last for this quiet, clean, fast vehicle","vii – A disappointing outcome for customers","viii – A better option than the steam car arises"]$j$::jsonb,
    $j${"answers":["viii – A better option than the steam car arises"],"caseSensitive":false}$j$::jsonb,
    'Paragraph B describes the arrival of the Internal Combustion Engine, which could be driven moments after starting and gradually phased out steam power — a better option than the steam car.',
    $j${"ieltsNumber":15,"ieltsType":"List of Headings","instruction":"Choose the correct heading (i–viii) for each paragraph."}$j$::jsonb
  ),
  (
    'cam18-t3-p2-q16',
    3,
    'multiple_choice',
    $t$Choose the correct heading for Paragraph C from the list of headings.
Paragraph C$t$,
    $j$["i – A period in cold conditions before the technology is assessed","ii – Marketing issues lead to failure","iii – Good and bad aspects of steam technology are passed on","iv – A possible solution to the issues of today","v – Further improvements lead to commercial orders","vi – Positive publicity at last for this quiet, clean, fast vehicle","vii – A disappointing outcome for customers","viii – A better option than the steam car arises"]$j$::jsonb,
    $j${"answers":["vi – Positive publicity at last for this quiet, clean, fast vehicle"],"caseSensitive":false}$j$::jsonb,
    'Paragraph C describes the Model B drawing the attention of trade magazines, running in virtual silence and being amazingly swift — positive publicity for a quiet, clean, fast car.',
    $j${"ieltsNumber":16,"ieltsType":"List of Headings","instruction":"Choose the correct heading (i–viii) for each paragraph."}$j$::jsonb
  ),
  (
    'cam18-t3-p2-q17',
    4,
    'multiple_choice',
    $t$Choose the correct heading for Paragraph D from the list of headings.
Paragraph D$t$,
    $j$["i – A period in cold conditions before the technology is assessed","ii – Marketing issues lead to failure","iii – Good and bad aspects of steam technology are passed on","iv – A possible solution to the issues of today","v – Further improvements lead to commercial orders","vi – Positive publicity at last for this quiet, clean, fast vehicle","vii – A disappointing outcome for customers","viii – A better option than the steam car arises"]$j$::jsonb,
    $j${"answers":["v – Further improvements lead to commercial orders"],"caseSensitive":false}$j$::jsonb,
    'Paragraph D describes the Model C improvements (key-based ignition, greater convenience) leading to 5,390 deposits for the Doble Detroit — improvements producing commercial orders.',
    $j${"ieltsNumber":17,"ieltsType":"List of Headings","instruction":"Choose the correct heading (i–viii) for each paragraph."}$j$::jsonb
  ),
  (
    'cam18-t3-p2-q18',
    5,
    'multiple_choice',
    $t$Choose the correct heading for Paragraph E from the list of headings.
Paragraph E$t$,
    $j$["i – A period in cold conditions before the technology is assessed","ii – Marketing issues lead to failure","iii – Good and bad aspects of steam technology are passed on","iv – A possible solution to the issues of today","v – Further improvements lead to commercial orders","vi – Positive publicity at last for this quiet, clean, fast vehicle","vii – A disappointing outcome for customers","viii – A better option than the steam car arises"]$j$::jsonb,
    $j${"answers":["vii – A disappointing outcome for customers"],"caseSensitive":false}$j$::jsonb,
    'Paragraph E reports that buyers who received completed cars complained they were sluggish and erratic — a disappointing outcome for customers.',
    $j${"ieltsNumber":18,"ieltsType":"List of Headings","instruction":"Choose the correct heading (i–viii) for each paragraph."}$j$::jsonb
  ),
  (
    'cam18-t3-p2-q19',
    6,
    'multiple_choice',
    $t$Choose the correct heading for Paragraph F from the list of headings.
Paragraph F$t$,
    $j$["i – A period in cold conditions before the technology is assessed","ii – Marketing issues lead to failure","iii – Good and bad aspects of steam technology are passed on","iv – A possible solution to the issues of today","v – Further improvements lead to commercial orders","vi – Positive publicity at last for this quiet, clean, fast vehicle","vii – A disappointing outcome for customers","viii – A better option than the steam car arises"]$j$::jsonb,
    $j${"answers":["i – A period in cold conditions before the technology is assessed"],"caseSensitive":false}$j$::jsonb,
    'Paragraph F describes the Model E sitting overnight in freezing temperatures and the frosty morning air before it was road-tested by the Automobile Club of America.',
    $j${"ieltsNumber":19,"ieltsType":"List of Headings","instruction":"Choose the correct heading (i–viii) for each paragraph."}$j$::jsonb
  ),
  (
    'cam18-t3-p2-q20',
    7,
    'multiple_choice',
    $t$Choose the correct heading for Paragraph G from the list of headings.
Paragraph G$t$,
    $j$["i – A period in cold conditions before the technology is assessed","ii – Marketing issues lead to failure","iii – Good and bad aspects of steam technology are passed on","iv – A possible solution to the issues of today","v – Further improvements lead to commercial orders","vi – Positive publicity at last for this quiet, clean, fast vehicle","vii – A disappointing outcome for customers","viii – A better option than the steam car arises"]$j$::jsonb,
    $j${"answers":["iv – A possible solution to the issues of today"],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph G ends by suggesting that, given pressure to improve performance and reduce emissions, a modern steam car may rise again — a possible solution to today's issues.$t$,
    $j${"ieltsNumber":20,"ieltsType":"List of Headings","instruction":"Choose the correct heading (i–viii) for each paragraph."}$j$::jsonb
  ),
  (
    'cam18-t3-p2-q21',
    8,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
What point does the writer make about the steam car in Paragraph B?$t$,
    $j$["A – Its success was short-lived.","B – Not enough cars were made.","C – Car companies found them hard to sell.","D – People found them hard to drive."]$j$::jsonb,
    $j${"answers":["A – Its success was short-lived."],"caseSensitive":false}$j$::jsonb,
    'Paragraph B opens by stating that the glory days of steam cars were few, before the Internal Combustion Engine soon appeared — its success was short-lived.',
    $j${"ieltsNumber":21,"ieltsType":"Multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t3-p2-q22',
    9,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
When building their first steam car, the Doble brothers$t$,
    $j$["A – constructed all the parts themselves.","B – made written notes at each stage of the construction.","C – needed several attempts to achieve a competitive model.","D – sought the advice of experienced people in the car industry."]$j$::jsonb,
    $j${"answers":["C – needed several attempts to achieve a competitive model."],"caseSensitive":false}$j$::jsonb,
    'Paragraph C says the first car did not run well and the brothers went on to build a second and third prototype (the Model B) before producing a car that rivalled gasoline models.',
    $j${"ieltsNumber":22,"ieltsType":"Multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t3-p2-q23',
    10,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
In order to produce the Model C, the Doble brothers$t$,
    $j$["A – moved production to a different city.","B – raised financial capital.","C – employed an additional worker.","D – abandoned their earlier designs."]$j$::jsonb,
    $j${"answers":["B – raised financial capital."],"caseSensitive":false}$j$::jsonb,
    'Paragraph D says Abner Doble drove the Model B to Detroit to seek investment, which he used to open the General Engineering Company and begin work on the Model C.',
    $j${"ieltsNumber":23,"ieltsType":"Multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t3-p2-q24',
    11,
    'sentence_completion',
    $t$Complete the summary. Choose ONE WORD AND/OR A NUMBER from the passage.
The Model E was road-tested in 1924 by the Automobile Club of America. They found it easy to drive, despite its weight, and it impressed the spectators. A later version of the Model E raised its __________ while keeping its emissions extremely low.$t$,
    null::jsonb,
    $j${"answers":["speed"],"caseSensitive":false}$j$::jsonb,
    'Paragraph F states that as the Doble steamer was further developed and tested, its maximum speed was pushed to over a hundred miles per hour with negligible emissions.',
    $j${"ieltsNumber":24,"ieltsType":"Summary completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t3-p2-q25',
    12,
    'sentence_completion',
    $t$Complete the summary. Choose ONE WORD AND/OR A NUMBER from the passage.
The steam car was too expensive for many people and its design was constantly being altered. Under __________ cars were produced before the company went out of business.$t$,
    null::jsonb,
    $j${"answers":["fifty"],"caseSensitive":false,"acceptedAlternatives":["50"]}$j$::jsonb,
    'Paragraph G says that by the time the company folded in 1931, fewer than fifty of the Model E steam cars had been produced.',
    $j${"ieltsNumber":25,"ieltsType":"Summary completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t3-p2-q26',
    13,
    'sentence_completion',
    $t$Complete the summary. Choose ONE WORD AND/OR A NUMBER from the passage.
However, even today, there are Model Es on the road in the US. They are straightforward to maintain, and they satisfy California's __________ emissions laws.$t$,
    null::jsonb,
    $j${"answers":["strict"],"caseSensitive":false}$j$::jsonb,
    'Paragraph G notes that an unmodified Doble Model E runs clean enough to pass the emissions laws in California, which are pretty strict.',
    $j${"ieltsNumber":26,"ieltsType":"Summary completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-cam18-t3-p2-steam-car'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- reading · The case for mixed-ability classes
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-cam18-t3-p3-mixed-ability',
  'reading',
  'challenge',
  'The case for mixed-ability classes',
  'Cambridge IELTS 18 · Test 3 · Reading Passage 3 (Questions 27–40).',
  'hard',
  'passage',
  $t$Picture this scene. It's an English literature lesson in a UK school, and the teacher has just read an extract from Shakespeare's Romeo and Juliet with a class of 15-year-olds. He's given some of the students copies of No Fear Shakespeare, a kid-friendly translation of the original. For three students, even these literacy demands are beyond them. Another girl simply can't focus and he gives her pens and paper to draw with. The teacher can ask the No Fear group to identify the key characters and maybe provide a tentative plot summary. He can ask most of the class about character development, and five of them might be able to support their statements with textual evidence. Now two curious students are wondering whether Shakespeare advocates living a life of moderation or one of passionate engagement.

As a teacher myself, I'd think my lesson would be going rather well if the discussion went as described above. But wouldn't this kind of class work better if there weren't such a huge gap between the top and the bottom? If we put all the kids who needed literacy support into one class, and all the students who want to discuss the virtue of moderation into another?

The practice of 'streaming', or 'tracking', involves separating students into classes depending on their diagnosed levels of attainment. At a macro level, it requires the establishment of academically selective schools for the brightest students, and comprehensive schools for the rest. Within schools, it means selecting students into a 'stream' of general ability, or 'sets' of subject-specific ability. The practice is intuitively appealing to almost every stakeholder.

I have heard the mixed-ability model attacked by way of analogy: a group hike. The fittest in the group take the lead and set a brisk pace, only to have to stop and wait every 20 minutes. This is frustrating, and their enthusiasm wanes. Meanwhile, the slowest ones are not only embarrassed but physically struggling to keep up. What's worse, they never get a long enough break. They honestly just want to quit. Hiking, they feel, is not for them.

Mixed-ability classes bore students, frustrate parents and burn out teachers. The brightest ones will never summit Mount Qomolangma, and the stragglers won't enjoy the lovely stroll in the park they are perhaps more suited to. Individuals suffer at the demands of the collective, mediocrity prevails. So: is learning like hiking?

The current pedagogical paradigm is arguably that of constructivism, which emerged out of the work of psychologist Lev Vygotsky. In the 1930s, Vygotsky emphasised the importance of targeting a student's specific 'zone of proximal development' (ZPD). This is the gap between what they can achieve only with support - teachers, textbooks, worked examples, parents and so on - and what they can achieve independently. The purpose of teaching is to provide and then gradually remove this 'scaffolding' until they are autonomous. If we accept this model, it follows that streaming students with similar ZPDs would be an efficient and effective solution. And that forcing everyone on the same hike – regardless of aptitude – would be madness.

Despite all this, there is limited empirical evidence to suggest that streaming results in better outcomes for students. Professor John Hattie, director of the Melbourne Education Research Institute, notes that 'tracking has minimal effects on learning outcomes'. What is more, streaming appears to significantly - and negatively - affect those students assigned to the lowest sets. These students tend to have much higher representation of low socioeconomic class. Less significant is the small benefit for those lucky clever students in the higher sets. The overall result is that the smart stay smart and the dumb get dumber, further entrenching the social divide.

In the latest update of Hattie's influential meta-analysis of factors influencing student achievement, one of the most significant factors is the teachers' estimate of achievement. Streaming students by diagnosed achievement automatically limits what the teacher feels the student is capable of. Meanwhile, in a mixed environment, teachers' estimates need to be more diverse and flexible.

While streaming might seem to help teachers effectively target a student's ZPD, it can underestimate the importance of peer-to-peer learning. A crucial aspect of constructivist theory is the role of the MKO – 'more knowledgeable other' - in knowledge construction. While teachers are traditionally the MKOs in classrooms, the value of knowledgeable student peers must not go unrecognised either.

I find it amazing to watch students get an idea over to their peers in ways that I would never think of. They operate with different language tools and different social tools from teachers and, having just learnt it themselves, they possess similar cognitive structures to their struggling classmates. There is also something exciting about passing on skills and knowledge that you yourself have just mastered - a certain pride and zeal, a certain freshness to the interaction between 'teacher' and 'learner' that is often lost by the expert for whom the steps are obvious and the joy of discovery forgotten.

Having a variety of different abilities in a collaborative learning environment provides valuable resources for helping students meet their learning needs, not to mention improving their communication and social skills. And today, more than ever, we need the many to flourish – not suffer at the expense of a few bright stars. Once a year, I go on a hike with my class, a mixed bunch of students. It is challenging. The fittest students realise they need to encourage the reluctant. There are lookouts who report back, and extra items to carry for others. We make it - together.$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"cambridge-ielts-18","book":18,"test":3,"passage":3,"ieltsQuestionRange":"27-40","extraction":"mineru-ocr","answerKeyVerified":true,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t3-p3-q27',
    1,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
The writer describes the Romeo and Juliet lesson in order to demonstrate$t$,
    $j$["A – how few students are interested in literature.","B – how a teacher handles a range of learning needs.","C – how unsuitable Shakespeare is for most teenagers.","D – how weaker students can disrupt their classmates’ learning."]$j$::jsonb,
    $j${"answers":["B – how a teacher handles a range of learning needs."],"caseSensitive":false}$j$::jsonb,
    'The opening scene shows one teacher simultaneously supporting weak readers (No Fear Shakespeare, a girl drawing) and stretching the most curious students, illustrating how a single teacher manages a wide spread of abilities.',
    $j${"ieltsNumber":27,"ieltsType":"multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q28',
    2,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
What does the writer say about streaming in the third paragraph?$t$,
    $j$["A – It has a very broad appeal.","B – It favours cleverer students.","C – It is relatively simple to implement.","D – It works better in some schools than others."]$j$::jsonb,
    $j${"answers":["A – It has a very broad appeal."],"caseSensitive":false}$j$::jsonb,
    'The third paragraph ends by stating that the practice of streaming is "intuitively appealing to almost every stakeholder", i.e. it has a very broad appeal.',
    $j${"ieltsNumber":28,"ieltsType":"multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q29',
    3,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
What idea is suggested by the reference to Mount Qomolangma in the fifth paragraph?$t$,
    $j$["A – students following unsuitable paths","B – students attempting interesting tasks","C – students not achieving their full potential","D – students not being aware of their limitations"]$j$::jsonb,
    $j${"answers":["C – students not achieving their full potential"],"caseSensitive":false}$j$::jsonb,
    'The writer says the brightest students "will never summit Mount Qomolangma" in mixed classes, meaning able students fail to reach their full potential.',
    $j${"ieltsNumber":29,"ieltsType":"multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q30',
    4,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
What does the word ‘scaffolding’ in the sixth paragraph refer to?$t$,
    $j$["A – the factors which prevent a student from learning effectively","B – the environment where most of a student’s learning takes place","C – the assistance given to a student in their initial stages of learning","D – the setting of appropriate learning targets for a student’s aptitude"]$j$::jsonb,
    $j${"answers":["C – the assistance given to a student in their initial stages of learning"],"caseSensitive":false}$j$::jsonb,
    'Scaffolding is defined as the support (teachers, textbooks, worked examples, parents) provided and then gradually removed until learners are autonomous — i.e. help given early on.',
    $j${"ieltsNumber":30,"ieltsType":"multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q31',
    5,
    'multiple_choice',
    $t$Complete the summary using the list of phrases, A–I, below.

Is streaming effective?
According to Professor John Hattie of the Melbourne Education Research Institute, there is very little indication that streaming leads to 31 ______. He points out that, in schools which use streaming, the most significant impact is on those students placed in the 32 ______, especially where a large proportion of them have 33 ______. Meanwhile, for the 34 ______, there appears to be only minimal advantage. A further issue is that teachers tend to have 35 ______ of students in streamed groups.

Which phrase fits gap 31?$t$,
    $j$["A – wrong classes","B – lower expectations","C – average learners","D – bottom sets","E – brightest pupils","F – disadvantaged backgrounds","G – weaker students","H – higher achievements","I – positive impressions"]$j$::jsonb,
    $j${"answers":["H – higher achievements"],"caseSensitive":false}$j$::jsonb,
    'The passage says there is "limited empirical evidence to suggest that streaming results in better outcomes" and that tracking "has minimal effects" — so streaming does not lead to higher achievements.',
    $j${"ieltsNumber":31,"ieltsType":"summary completion (matching)","instruction":"Write the correct letter, A–I."}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q32',
    6,
    'multiple_choice',
    $t$Complete the summary using the list of phrases, A–I, below.

Is streaming effective?
According to Professor John Hattie of the Melbourne Education Research Institute, there is very little indication that streaming leads to 31 ______. He points out that, in schools which use streaming, the most significant impact is on those students placed in the 32 ______, especially where a large proportion of them have 33 ______. Meanwhile, for the 34 ______, there appears to be only minimal advantage. A further issue is that teachers tend to have 35 ______ of students in streamed groups.

Which phrase fits gap 32?$t$,
    $j$["A – wrong classes","B – lower expectations","C – average learners","D – bottom sets","E – brightest pupils","F – disadvantaged backgrounds","G – weaker students","H – higher achievements","I – positive impressions"]$j$::jsonb,
    $j${"answers":["D – bottom sets"],"caseSensitive":false}$j$::jsonb,
    'Streaming "significantly - and negatively - affect[s] those students assigned to the lowest sets", i.e. the bottom sets.',
    $j${"ieltsNumber":32,"ieltsType":"summary completion (matching)","instruction":"Write the correct letter, A–I."}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q33',
    7,
    'multiple_choice',
    $t$Complete the summary using the list of phrases, A–I, below.

Is streaming effective?
According to Professor John Hattie of the Melbourne Education Research Institute, there is very little indication that streaming leads to 31 ______. He points out that, in schools which use streaming, the most significant impact is on those students placed in the 32 ______, especially where a large proportion of them have 33 ______. Meanwhile, for the 34 ______, there appears to be only minimal advantage. A further issue is that teachers tend to have 35 ______ of students in streamed groups.

Which phrase fits gap 33?$t$,
    $j$["A – wrong classes","B – lower expectations","C – average learners","D – bottom sets","E – brightest pupils","F – disadvantaged backgrounds","G – weaker students","H – higher achievements","I – positive impressions"]$j$::jsonb,
    $j${"answers":["F – disadvantaged backgrounds"],"caseSensitive":false}$j$::jsonb,
    'Students in the lowest sets "tend to have much higher representation of low socioeconomic class", i.e. disadvantaged backgrounds.',
    $j${"ieltsNumber":33,"ieltsType":"summary completion (matching)","instruction":"Write the correct letter, A–I."}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q34',
    8,
    'multiple_choice',
    $t$Complete the summary using the list of phrases, A–I, below.

Is streaming effective?
According to Professor John Hattie of the Melbourne Education Research Institute, there is very little indication that streaming leads to 31 ______. He points out that, in schools which use streaming, the most significant impact is on those students placed in the 32 ______, especially where a large proportion of them have 33 ______. Meanwhile, for the 34 ______, there appears to be only minimal advantage. A further issue is that teachers tend to have 35 ______ of students in streamed groups.

Which phrase fits gap 34?$t$,
    $j$["A – wrong classes","B – lower expectations","C – average learners","D – bottom sets","E – brightest pupils","F – disadvantaged backgrounds","G – weaker students","H – higher achievements","I – positive impressions"]$j$::jsonb,
    $j${"answers":["E – brightest pupils"],"caseSensitive":false}$j$::jsonb,
    'The "small benefit for those lucky clever students in the higher sets" is described as less significant — only minimal advantage for the brightest pupils.',
    $j${"ieltsNumber":34,"ieltsType":"summary completion (matching)","instruction":"Write the correct letter, A–I."}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q35',
    9,
    'multiple_choice',
    $t$Complete the summary using the list of phrases, A–I, below.

Is streaming effective?
According to Professor John Hattie of the Melbourne Education Research Institute, there is very little indication that streaming leads to 31 ______. He points out that, in schools which use streaming, the most significant impact is on those students placed in the 32 ______, especially where a large proportion of them have 33 ______. Meanwhile, for the 34 ______, there appears to be only minimal advantage. A further issue is that teachers tend to have 35 ______ of students in streamed groups.

Which phrase fits gap 35?$t$,
    $j$["A – wrong classes","B – lower expectations","C – average learners","D – bottom sets","E – brightest pupils","F – disadvantaged backgrounds","G – weaker students","H – higher achievements","I – positive impressions"]$j$::jsonb,
    $j${"answers":["B – lower expectations"],"caseSensitive":false}$j$::jsonb,
    'Streaming by diagnosed achievement "automatically limits what the teacher feels the student is capable of" — teachers hold lower expectations of streamed students.',
    $j${"ieltsNumber":35,"ieltsType":"summary completion (matching)","instruction":"Write the correct letter, A–I."}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q36',
    10,
    'true_false_not_given',
    $t$Do the following statement agree with the views of the writer in Reading Passage 3?
The Vygotsky model of education supports the concept of a mixed-ability class.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["No"],"caseSensitive":false}$j$::jsonb,
    'The writer says that if we accept Vygotsky’s ZPD model, "it follows that streaming students with similar ZPDs would be an efficient and effective solution" — so the model appears to support streaming, not mixed-ability classes.',
    $j${"ieltsNumber":36,"ieltsType":"yes/no/not given"}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q37',
    11,
    'true_false_not_given',
    $t$Do the following statement agree with the views of the writer in Reading Passage 3?
Some teachers are uncertain about allowing students to take on MKO roles in the classroom.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["Not Given"],"caseSensitive":false}$j$::jsonb,
    'The passage discusses the value of student peers as MKOs but never states whether teachers are hesitant or uncertain about letting students take on that role.',
    $j${"ieltsNumber":37,"ieltsType":"yes/no/not given"}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q38',
    12,
    'true_false_not_given',
    $t$Do the following statement agree with the views of the writer in Reading Passage 3?
It can be rewarding to teach knowledge which you have only recently acquired.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["Yes"],"caseSensitive":false}$j$::jsonb,
    'The writer describes "something exciting about passing on skills and knowledge that you yourself have just mastered - a certain pride and zeal", agreeing that teaching newly learned knowledge is rewarding.',
    $j${"ieltsNumber":38,"ieltsType":"yes/no/not given"}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q39',
    13,
    'true_false_not_given',
    $t$Do the following statement agree with the views of the writer in Reading Passage 3?
The priority should be to ensure that the highest-achieving students attain their goals.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["No"],"caseSensitive":false}$j$::jsonb,
    'The writer argues "we need the many to flourish – not suffer at the expense of a few bright stars", contradicting the idea that top students should be the priority.',
    $j${"ieltsNumber":39,"ieltsType":"yes/no/not given"}$j$::jsonb
  ),
  (
    'cam18-t3-p3-q40',
    14,
    'true_false_not_given',
    $t$Do the following statement agree with the views of the writer in Reading Passage 3?
Taking part in collaborative outdoor activities with teachers and classmates can improve student outcomes in the classroom.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["Not Given"],"caseSensitive":false}$j$::jsonb,
    'The writer describes an annual class hike as challenging and cooperative, but never claims that such outdoor activities lead to better classroom outcomes.',
    $j${"ieltsNumber":40,"ieltsType":"yes/no/not given"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-cam18-t3-p3-mixed-ability'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- writing · Cambridge 18 · Test 3 · Writing
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'writing-cam18-t3',
  'writing',
  'progressive',
  'Cambridge 18 · Test 3 · Writing',
  'Cambridge IELTS 18 · Test 3 · Writing Task 1 & Task 2.',
  'medium',
  'writing_prompt',
  null,
  null,
  null,
  '/images/cam18/t3-writing-task1-before.jpg',
  3600,
  $j${"source":"cambridge-ielts-18","test":3,"paper":"writing","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t3-writing-q1',
    1,
    'writing_task',
    $t$You should spend about 20 minutes on this task.

The diagram below shows the floor plan of a public library 20 years ago and how it looks now.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Task 1 report comparing two floor plans. Assessed on task achievement, coherence, lexical resource, and grammar.',
    $j${"ieltsNumber":1,"ieltsType":"writing_task_1","taskType":"task_1","wordTarget":150,"assetUrl":"/images/cam18/t3-writing-task1-after.jpg","assetCaption":"Central Library today"}$j$::jsonb
  ),
  (
    'cam18-t3-writing-q2',
    2,
    'writing_task',
    $t$You should spend about 40 minutes on this task.

Write about the following topic:

In many countries around the world, rural people are moving to cities, so the population in the countryside is decreasing.

Do you think this is a positive or a negative development?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Task 2 essay. Assessed on task response, coherence, lexical resource, and grammar rather than an exact answer.',
    $j${"ieltsNumber":2,"ieltsType":"writing_task_2","taskType":"task_2","wordTarget":250}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'writing-cam18-t3'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- speaking · Cambridge 18 · Test 3 · Speaking
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'speaking-cam18-t3',
  'speaking',
  'progressive',
  'Cambridge 18 · Test 3 · Speaking',
  'Cambridge IELTS 18 · Test 3 · Speaking Parts 1–3.',
  'medium',
  'speaking_prompt',
  null,
  null,
  null,
  null,
  840,
  $j${"source":"cambridge-ielts-18","test":3,"paper":"speaking","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t3-speaking-q1',
    1,
    'speaking_response',
    $t$Part 1 (Interview) — Topic: Online shopping

- How often do you buy things online? [Why?]
- What was the last thing you bought online?
- Do you ever see things in shops and then buy them online? [Why/Why not?]
- Do you think the popularity of online shopping is changing your town or city centre? [Why/Why not?]$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Part 1 answers should be short, direct and personal. Assessed on fluency, vocabulary, grammar and pronunciation rather than an exact answer.',
    $j${"ieltsType":"speaking_part_1","part":1}$j$::jsonb
  ),
  (
    'cam18-t3-speaking-q2',
    2,
    'speaking_response',
    $t$Part 2 (Long turn) — Cue card

Describe a time when you enjoyed visiting a member of your family in their home.

You should say:
- who you visited and where they lived
- why you made this visit
- what happened during this visit
- and explain why you enjoyed this visit.

You will have to talk about the topic for one to two minutes. You have one minute to think about what you are going to say. You can make some notes to help you if you wish.$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Speak for 1–2 minutes after 1 minute of preparation. Assessed on fluency, coherence, vocabulary, grammar and pronunciation.',
    $j${"ieltsType":"speaking_part_2","part":2,"prepSeconds":60,"responseSeconds":120}$j$::jsonb
  ),
  (
    'cam18-t3-speaking-q3',
    3,
    'speaking_response',
    $t$Part 3 (Discussion)

Family occasions
- When do families celebrate together in your country?
- How often do all the generations in a family come together in your country?
- Why is it that some people might not enjoy attending family occasions?

Everyday life in families
- Do you think it is a good thing for parents to help their children with schoolwork?
- How important do you think it is for families to eat together at least once a day?
- Do you believe that everyone in a family should share household tasks?$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Part 3 answers should be developed with reasons and examples. Assessed on the ability to discuss abstract ideas, plus fluency, vocabulary, grammar and pronunciation.',
    $j${"ieltsType":"speaking_part_3","part":3}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'speaking-cam18-t3'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Job details from employment agency
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t4-p1',
  'listening',
  'challenge',
  'Job details from employment agency',
  'Cambridge IELTS 18 · Test 4 · Listening Part 1 (Questions 1–10).',
  'medium',
  'audio',
  null,
  '/audio/cam18/t4-p1.mp3',
  $t$JULIE: Hello?
GREG: Oh, hello. Is that Julie Davison?
JULIE: Yes.
GREG: This is Greg Preston from the Employment Agency. We met last week when you came in to enquire about office work.
JULIE: Oh, that's right.
GREG: Now we've just had some details come in of a job which might interest you.
JULIE: OK.
GREG: So this is a position for a receptionist – I believe you've done that sort of work before?
JULIE: Yes, I have, I worked in a sports centre for a couple of years before I got married and had the children.
GREG: Right. Well, this job's in Fordham, so not too far away for you, and it's at the medical centre there.
JULIE: OK. So where exactly is that?
GREG: It's quite near the station, on Chastons Road.
JULIE: Sorry?
GREG: Chastons Road – that's C-H-A-S-T-O-N-S.
JULIE: OK, thanks. So what would the work involve? Dealing with enquiries from patients?
GREG: Yes, and you'd also be involved in making appointments, whether face to face or on the phone. And rescheduling them if necessary.
JULIE: Fine, that shouldn't be a problem.
GREG: And another of your duties would be keeping the centre's database up-to-date. Then you might have other general administrative duties as well, but those would be the main ones.
JULIE: OK.
GREG: Now when the details came in, I immediately thought of you because one thing they do require is someone with experience, and you did mention your work at the sports centre when you came in to see us.
JULIE: Yes, in fact I enjoyed that job. Is there anything else they're looking for?
GREG: Well, they say it's quite a high-pressure environment, they're always very busy, and patients are often under stress, so they want someone who can cope with that and stay calm, and at the same time be confident when interacting with the public.
JULIE: Well, after dealing with three children all under five, I reckon I can cope with that.
GREG: I'm sure you can.
GREG: And then another thing they mention is that they're looking for someone with good IT skills ...
JULIE: Not a problem.
GREG: So you'd be interested in following this up?
JULIE: Sure. When would it start?
GREG: Well, they're looking for someone from the beginning of next month, but I should tell you that this isn't a permanent job, it's temporary, so the contract would be just to the end of September. But they do say that there could be further opportunities after that.
JULIE: OK. And what would the hours be?
GREG: Well, they want someone who can start at a quarter to eight in the morning – could you manage that?
JULIE: Yes, my husband would have to get the kids up and off to my mother's – she's going to be looking after them while I'm at work. What time would I finish?
GREG: One fifteen.
JULIE: That should work out all right. I can pick the kids up on my way home, and then I'll have the afternoon with them. Oh, one thing ... is there parking available for staff at the centre?
GREG: Yes, there is, and it's also on a bus route.
JULIE: Right. Well, I expect I'll have the car but it's good to know that. OK, so where do I go from here?
GREG: Well, if you're happy for me to do so, I'll forward your CV and references, and then the best thing would probably be for you to phone them so they can arrange for an interview.
JULIE: Great. Well thank you very much.
GREG: You're welcome. Bye now.
JULIE: Bye.$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":4,"part":1,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t4-l1-q1',
    1,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.
Job details from employment agency
Role: 1 ....................$t$,
    null::jsonb,
    $j${"answers":["receptionist"],"caseSensitive":false}$j$::jsonb,
    $t$Greg says: "this is a position for a receptionist – I believe you've done that sort of work before?"$t$,
    $j${"ieltsNumber":1,"ieltsType":"note_completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t4-l1-q2',
    2,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.
Location: Fordham 2 .................... Centre$t$,
    null::jsonb,
    $j${"answers":["Medical"],"caseSensitive":false}$j$::jsonb,
    $t$Greg says the job is "in Fordham ... and it's at the medical centre there".$t$,
    $j${"ieltsNumber":2,"ieltsType":"note_completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t4-l1-q3',
    3,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.
3 .................... Road, Fordham$t$,
    null::jsonb,
    $j${"answers":["Chastons"],"caseSensitive":false}$j$::jsonb,
    $t$Greg spells it out: "Chastons Road – that's C-H-A-S-T-O-N-S."$t$,
    $j${"ieltsNumber":3,"ieltsType":"note_completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t4-l1-q4',
    4,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.
Work involves:
- dealing with enquiries
- making 4 .................... and reorganising them$t$,
    null::jsonb,
    $j${"answers":["appointments"],"caseSensitive":false}$j$::jsonb,
    $t$Greg: "you'd also be involved in making appointments ... And rescheduling them if necessary."$t$,
    $j${"ieltsNumber":4,"ieltsType":"note_completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t4-l1-q5',
    5,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.
- maintaining the internal 5 ....................
- general administration$t$,
    null::jsonb,
    $j${"answers":["database"],"caseSensitive":false}$j$::jsonb,
    $t$Greg: "another of your duties would be keeping the centre's database up-to-date".$t$,
    $j${"ieltsNumber":5,"ieltsType":"note_completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t4-l1-q6',
    6,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.
Requirements:
- 6 .................... (essential)$t$,
    null::jsonb,
    $j${"answers":["experience"],"caseSensitive":false}$j$::jsonb,
    'Greg: "one thing they do require is someone with experience".',
    $j${"ieltsNumber":6,"ieltsType":"note_completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t4-l1-q7',
    7,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.
- a calm and 7 .................... manner
- good IT skills$t$,
    null::jsonb,
    $j${"answers":["confident"],"caseSensitive":false}$j$::jsonb,
    'Greg: they want someone who can "stay calm, and at the same time be confident when interacting with the public".',
    $j${"ieltsNumber":7,"ieltsType":"note_completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t4-l1-q8',
    8,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.
Other information
- a 8 .................... job – further opportunities may be available$t$,
    null::jsonb,
    $j${"answers":["temporary"],"caseSensitive":false}$j$::jsonb,
    $t$Greg: "this isn't a permanent job, it's temporary, so the contract would be just to the end of September".$t$,
    $j${"ieltsNumber":8,"ieltsType":"note_completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t4-l1-q9',
    9,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.
- hours: 7.45 a.m. to 9 .................... p.m. Monday to Friday$t$,
    null::jsonb,
    $j${"answers":["1.15"],"caseSensitive":false,"acceptedAlternatives":["1.15 pm","1.15pm"]}$j$::jsonb,
    'Julie asks what time she would finish and Greg replies "One fifteen."',
    $j${"ieltsNumber":9,"ieltsType":"note_completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  ),
  (
    'cam18-t4-l1-q10',
    10,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.
- 10 .................... is available onsite$t$,
    null::jsonb,
    $j${"answers":["parking"],"caseSensitive":false}$j$::jsonb,
    'Julie asks "is there parking available for staff at the centre?" and Greg confirms "Yes, there is".',
    $j${"ieltsNumber":10,"ieltsType":"note_completion","instruction":"ONE WORD AND/OR A NUMBER."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t4-p1'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Museum of Farming Life
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t4-p2',
  'listening',
  'challenge',
  'Museum of Farming Life',
  'Cambridge IELTS 18 · Test 4 · Listening Part 2 (Questions 11–20).',
  'medium',
  'audio',
  null,
  '/audio/cam18/t4-p2.mp3',
  $t$Good morning everyone, and welcome to the Museum of Farming Life. I understand it's your first visit here, so I'd like to give you some background information about the museum and then explain a little about what you can see during your visit.

So, where we're standing at the moment is the entrance to a large building that was constructed in 1880 as the home of a local businessman, Alfred Palmer, of the Palmer biscuit factory. It was later sold and became a hall of residence for students in 1911, and a museum in 1951. In 2005, a modern extension was built to accommodate the museum's collections.

The museum's owned by the university, and apart from two rooms that are our offices, the university uses the main part of the building. You may see students going into the building for lessons, but it's not open to museum visitors, I'm afraid. It's a shame because the interior architectural features are outstanding, especially the room that used to be the library.

Luckily, we've managed to keep entry to the museum free. This includes access to all the galleries, outdoor areas and the rooms for special exhibitions. We run activities for children and students, such as the museum club, for which there's no charge. We do have a donation box just over there so feel free to give whatever amount you consider appropriate.

We do have a cloakroom, if you'd like to leave your coats and bags somewhere. Unlike other museums, photography is allowed here, so you might like to keep your cameras with you. You might be more comfortable not carrying around heavy rucksacks, though keep your coats and jackets on as it's quite cold in the museum garden today.

I'd like to tell you about the different areas of the museum.

Just inside, and outside the main gallery, we have an area called Four Seasons. Here you can watch a four-minute animation of a woodland scene. It was designed especially for the museum by a group of young people on a film studies course, and it's beautiful. Children absolutely love it, but then, so do adults.

The main gallery's called Town and Country. It includes a photographic collection of prize-winning sheep and shepherds. Leaving Town and Country, you enter Farmhouse Kitchen, which is ... well, self-explanatory. Here we have the oldest collection of equipment for making butter and cheese in the country. And this morning, a specialist cheesemaker will be giving demonstrations of how it's produced. You may even get to try some.

After that, you can go in two directions. To the right is a staircase that takes you up to a landing from where you can look down on the galleries. To the left is a room called A Year on the Farm. There's lots of seating here as sometimes we use the room for school visits, so it's a good place to stop for a rest. If you're feeling competitive, you can take our memory test in which you answer questions about things you've seen in the museum.

The next area's called Wagon Walk. This contains farm carts from nearly every part of the country. It's surprising how much regional variation there was. Beside the carts are display boards with information about each one. The carts are old and fragile, so we ask you to keep your children close to you and ensure they don't climb on the carts.

From Wagon Walk, you can either make your way back to reception or go out into the garden – or even go back to take another look in the galleries. In the far corner of the garden is Bees are Magic, but we're redeveloping this area so you can't visit that at the moment. You can still buy our honey in the shop, though.

Finally, there's The Pond, which contains all kinds of interesting wildlife. There are baby ducks that are only a few days old, as well as tiny frogs. The Pond isn't deep and there's a fence around it, so it's perfectly safe for children.$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":4,"part":2,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t4-l2-q11',
    1,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
The museum building was originally$t$,
    $j$["A – a factory.","B – a private home.","C – a hall of residence."]$j$::jsonb,
    $j${"answers":["B – a private home."],"caseSensitive":false}$j$::jsonb,
    'The building "was constructed in 1880 as the home of a local businessman, Alfred Palmer"; it only became a hall of residence later.',
    $j${"ieltsNumber":11,"ieltsType":"multiple_choice"}$j$::jsonb
  ),
  (
    'cam18-t4-l2-q12',
    2,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
The university uses part of the museum building as$t$,
    $j$["A – teaching rooms.","B – a research library.","C – administration offices."]$j$::jsonb,
    $j${"answers":["A – teaching rooms."],"caseSensitive":false}$j$::jsonb,
    $t$The speaker says "You may see students going into the building for lessons"; the offices are the museum's, and the library is only a former room.$t$,
    $j${"ieltsNumber":12,"ieltsType":"multiple_choice"}$j$::jsonb
  ),
  (
    'cam18-t4-l2-q13',
    3,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
What does the guide say about the entrance fee?$t$,
    $j$["A – Visitors decide whether or not they wish to pay.","B – Only children and students receive a discount.","C – The museum charges extra for special exhibitions."]$j$::jsonb,
    $j${"answers":["A – Visitors decide whether or not they wish to pay."],"caseSensitive":false}$j$::jsonb,
    'Entry is free and there is a donation box: "feel free to give whatever amount you consider appropriate."',
    $j${"ieltsNumber":13,"ieltsType":"multiple_choice"}$j$::jsonb
  ),
  (
    'cam18-t4-l2-q14',
    4,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
What are visitors advised to leave in the cloakroom?$t$,
    $j$["A – cameras","B – coats","C – bags"]$j$::jsonb,
    $j${"answers":["C – bags"],"caseSensitive":false}$j$::jsonb,
    'Visitors are told to keep cameras (photography is allowed) and keep coats on because the garden is cold, but would "be more comfortable not carrying around heavy rucksacks".',
    $j${"ieltsNumber":14,"ieltsType":"multiple_choice"}$j$::jsonb
  ),
  (
    'cam18-t4-l2-q15',
    5,
    'multiple_choice',
    $t$What information does the speaker give about each of the following areas of the museum?
Choose SIX answers from the box and write the correct letter, A–H, next to Questions 15–20.
Four Seasons$t$,
    $j$["A – Parents must supervise their children.","B – There are new things to see.","C – It is closed today.","D – This is only for school groups.","E – There is a quiz for visitors.","F – It features something created by students.","G – An expert is here today.","H – There is a one-way system."]$j$::jsonb,
    $j${"answers":["F – It features something created by students."],"caseSensitive":false}$j$::jsonb,
    'The Four Seasons animation "was designed especially for the museum by a group of young people on a film studies course".',
    $j${"ieltsNumber":15,"ieltsType":"matching","instruction":"Choose SIX answers from the box, A–H."}$j$::jsonb
  ),
  (
    'cam18-t4-l2-q16',
    6,
    'multiple_choice',
    $t$What information does the speaker give about each of the following areas of the museum?
Choose SIX answers from the box and write the correct letter, A–H, next to Questions 15–20.
Farmhouse Kitchen$t$,
    $j$["A – Parents must supervise their children.","B – There are new things to see.","C – It is closed today.","D – This is only for school groups.","E – There is a quiz for visitors.","F – It features something created by students.","G – An expert is here today.","H – There is a one-way system."]$j$::jsonb,
    $j${"answers":["G – An expert is here today."],"caseSensitive":false}$j$::jsonb,
    $t$In Farmhouse Kitchen "this morning, a specialist cheesemaker will be giving demonstrations of how it's produced".$t$,
    $j${"ieltsNumber":16,"ieltsType":"matching","instruction":"Choose SIX answers from the box, A–H."}$j$::jsonb
  ),
  (
    'cam18-t4-l2-q17',
    7,
    'multiple_choice',
    $t$What information does the speaker give about each of the following areas of the museum?
Choose SIX answers from the box and write the correct letter, A–H, next to Questions 15–20.
A Year on the Farm$t$,
    $j$["A – Parents must supervise their children.","B – There are new things to see.","C – It is closed today.","D – This is only for school groups.","E – There is a quiz for visitors.","F – It features something created by students.","G – An expert is here today.","H – There is a one-way system."]$j$::jsonb,
    $j${"answers":["E – There is a quiz for visitors."],"caseSensitive":false}$j$::jsonb,
    $t$In A Year on the Farm "you can take our memory test in which you answer questions about things you've seen in the museum".$t$,
    $j${"ieltsNumber":17,"ieltsType":"matching","instruction":"Choose SIX answers from the box, A–H."}$j$::jsonb
  ),
  (
    'cam18-t4-l2-q18',
    8,
    'multiple_choice',
    $t$What information does the speaker give about each of the following areas of the museum?
Choose SIX answers from the box and write the correct letter, A–H, next to Questions 15–20.
Wagon Walk$t$,
    $j$["A – Parents must supervise their children.","B – There are new things to see.","C – It is closed today.","D – This is only for school groups.","E – There is a quiz for visitors.","F – It features something created by students.","G – An expert is here today.","H – There is a one-way system."]$j$::jsonb,
    $j${"answers":["A – Parents must supervise their children."],"caseSensitive":false}$j$::jsonb,
    $t$The carts in Wagon Walk are fragile, so "we ask you to keep your children close to you and ensure they don't climb on the carts".$t$,
    $j${"ieltsNumber":18,"ieltsType":"matching","instruction":"Choose SIX answers from the box, A–H."}$j$::jsonb
  ),
  (
    'cam18-t4-l2-q19',
    9,
    'multiple_choice',
    $t$What information does the speaker give about each of the following areas of the museum?
Choose SIX answers from the box and write the correct letter, A–H, next to Questions 15–20.
Bees are Magic$t$,
    $j$["A – Parents must supervise their children.","B – There are new things to see.","C – It is closed today.","D – This is only for school groups.","E – There is a quiz for visitors.","F – It features something created by students.","G – An expert is here today.","H – There is a one-way system."]$j$::jsonb,
    $j${"answers":["C – It is closed today."],"caseSensitive":false}$j$::jsonb,
    $t$Of Bees are Magic: "we're redeveloping this area so you can't visit that at the moment".$t$,
    $j${"ieltsNumber":19,"ieltsType":"matching","instruction":"Choose SIX answers from the box, A–H."}$j$::jsonb
  ),
  (
    'cam18-t4-l2-q20',
    10,
    'multiple_choice',
    $t$What information does the speaker give about each of the following areas of the museum?
Choose SIX answers from the box and write the correct letter, A–H, next to Questions 15–20.
The Pond$t$,
    $j$["A – Parents must supervise their children.","B – There are new things to see.","C – It is closed today.","D – This is only for school groups.","E – There is a quiz for visitors.","F – It features something created by students.","G – An expert is here today.","H – There is a one-way system."]$j$::jsonb,
    $j${"answers":["B – There are new things to see."],"caseSensitive":false}$j$::jsonb,
    'At The Pond "There are baby ducks that are only a few days old, as well as tiny frogs."',
    $j${"ieltsNumber":20,"ieltsType":"matching","instruction":"Choose SIX answers from the box, A–H."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t4-p2'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Origami as an educational tool
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t4-p3',
  'listening',
  'challenge',
  'Origami as an educational tool',
  'Cambridge IELTS 18 · Test 4 · Listening Part 3 (Questions 21–30).',
  'medium',
  'audio',
  null,
  '/audio/cam18/t4-p3.mp3',
  $t$TUTOR: So now I want you to discuss the lesson we have just been watching on the video and think about the ways in which origami can be a useful educational tool. Can you all work with the person sitting next to you ...

SEB: I had no idea that such a simple thing like folding squares of paper to make the shape of something like a bird could be such an amazing tool. It's made me see origami in a whole new light.

LIA: I know. It was interesting to see the educational skills the children were developing by doing origami. On the video you could see them really listening hard to make sure they did all the steps in the right order to make the bird.

SEB: That's right. In this lesson they were working individually but it would also be interesting to see if the children could work out how to make something simple without being given any direction. That would help with building teamwork as well.

LIA: Yes, but much more of a challenge. One thing that really stood out for me was that the children were all having fun while being taught something new.

SEB: Which is a key aim of any lesson with this age group. And although these kids had no problems with folding the paper, with younger children you could do origami to help practise fine motor skills.

LIA: Absolutely. Shall we talk about the individual children we saw on the video? I wrote all their names down and took some notes.

SEB: Yes, I did too.

LIA: OK, good. Let's start with Sid.

SEB: He was interesting because before they started doing the origami, he was being quite disruptive.

LIA: Yes. He really benefited from having to use his hands – it helped him to settle down and start concentrating.

SEB: Yes, I noticed that too. What about Jack? I noticed he seemed to want to work things out for himself.

LIA: Mmm. You could see him trying out different things rather than asking the teacher for help. What did you make of Naomi?

SEB: She seemed to be losing interest at one point but then she decided she wanted her mouse to be the best and that motivated her to try harder.

LIA: She didn't seem satisfied with hers in the end, though.

SEB: No.

LIA: Anya was such a star. She listened so carefully and then produced the perfect bird with very little effort.

SEB: Mmm – I think the teacher could have increased the level of difficulty for her.

LIA: Maybe. I think it was the first time Zara had come across origami.

SEB: She looked as if she didn't really get what was going on.

LIA: She seemed unsure about what she was supposed to do, but in the end hers didn't turn out too badly.

SEB: Yeah. I'm sure it was a positive learning experience for her.

LIA: Mmm.

LIA: I think one reason why the origami activity worked so well in this class was that the teacher was well prepared.

SEB: Right. I think it would have taken me ages to prepare examples, showing each of the steps involved in making the bird. But that was a really good idea. The children could see what they were aiming for – and much better for them to be able to hold something, rather than just looking at pictures.

LIA: Mmm – those physical examples supported her verbal explanations really well.

SEB: It's strange that origami isn't used more widely. Why do you think that is?

LIA: Well, teachers may just feel it's not that appealing to children who are used to doing everything on computers, especially boys. Even if they're aware of the benefits.

SEB: Oh, I don't know. It's no different to any other craft activity. I bet it's because so many teachers are clumsy like me.

LIA: That's true – too much effort required if you're not good with your hands.

SEB: Well, anyway, I think we should try it out in our maths teaching practice with Year 3. I can see using origami is a really engaging way of reinforcing children's knowledge of geometric shapes, like they were doing in the video, but I think it would also work really well for presenting fractions, which is coming up soon.

LIA: Good idea – that's something most of the kids in that class might struggle with.

SEB: Origami would also be good practice for using symmetry – but I think they did that last term. OK – well let's try and get some ideas together and plan the lesson next week.$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":4,"part":3,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t4-l3-q21',
    1,
    'multiple_choice',
    $t$Choose TWO letters, A–E.
Which TWO educational skills were shown in the video of children doing origami?
A solving problems
B following instructions
C working cooperatively
D learning through play
E developing hand-eye coordination
This is one of a pair; enter one correct letter here and the other in the paired question.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","D"],"caseSensitive":false}$j$::jsonb,
    'Lia says the children were "really listening hard to make sure they did all the steps in the right order" (following instructions), and that they "were all having fun while being taught something new" (learning through play).',
    $j${"ieltsNumber":21,"ieltsType":"multiple choice (choose TWO letters)","instruction":"Choose TWO letters.","pairWith":22}$j$::jsonb
  ),
  (
    'cam18-t4-l3-q22',
    2,
    'multiple_choice',
    $t$Choose TWO letters, A–E.
Which TWO educational skills were shown in the video of children doing origami?
A solving problems
B following instructions
C working cooperatively
D learning through play
E developing hand-eye coordination
This is one of a pair; enter the second correct letter here.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B","D"],"caseSensitive":false}$j$::jsonb,
    'The two skills actually shown are following instructions (listening hard to do the steps in the right order) and learning through play (having fun while being taught something new); problem-solving and teamwork are only hypothetical suggestions.',
    $j${"ieltsNumber":22,"ieltsType":"multiple choice (choose TWO letters)","instruction":"Choose TWO letters.","pairWith":21}$j$::jsonb
  ),
  (
    'cam18-t4-l3-q23',
    3,
    'multiple_choice',
    $t$Which comment do the students make about each of the following children in the video?
Choose the correct letter, A–G.
23 Sid$t$,
    $j$["A – demonstrated independence","B – asked for teacher support","C – developed a competitive attitude","D – seemed to find the activity calming","E – seemed pleased with the results","F – seemed confused","G – seemed to find the activity easy"]$j$::jsonb,
    $j${"answers":["D – seemed to find the activity calming"],"caseSensitive":false}$j$::jsonb,
    'Sid had been disruptive, but Lia says using his hands "helped him to settle down and start concentrating".',
    $j${"ieltsNumber":23,"ieltsType":"matching (choose from box A–G)"}$j$::jsonb
  ),
  (
    'cam18-t4-l3-q24',
    4,
    'multiple_choice',
    $t$Which comment do the students make about each of the following children in the video?
Choose the correct letter, A–G.
24 Jack$t$,
    $j$["A – demonstrated independence","B – asked for teacher support","C – developed a competitive attitude","D – seemed to find the activity calming","E – seemed pleased with the results","F – seemed confused","G – seemed to find the activity easy"]$j$::jsonb,
    $j${"answers":["A – demonstrated independence"],"caseSensitive":false}$j$::jsonb,
    'Jack "seemed to want to work things out for himself" and was "trying out different things rather than asking the teacher for help".',
    $j${"ieltsNumber":24,"ieltsType":"matching (choose from box A–G)"}$j$::jsonb
  ),
  (
    'cam18-t4-l3-q25',
    5,
    'multiple_choice',
    $t$Which comment do the students make about each of the following children in the video?
Choose the correct letter, A–G.
25 Naomi$t$,
    $j$["A – demonstrated independence","B – asked for teacher support","C – developed a competitive attitude","D – seemed to find the activity calming","E – seemed pleased with the results","F – seemed confused","G – seemed to find the activity easy"]$j$::jsonb,
    $j${"answers":["C – developed a competitive attitude"],"caseSensitive":false}$j$::jsonb,
    'Naomi was losing interest but "decided she wanted her mouse to be the best and that motivated her to try harder"; she was not satisfied with the result.',
    $j${"ieltsNumber":25,"ieltsType":"matching (choose from box A–G)"}$j$::jsonb
  ),
  (
    'cam18-t4-l3-q26',
    6,
    'multiple_choice',
    $t$Which comment do the students make about each of the following children in the video?
Choose the correct letter, A–G.
26 Anya$t$,
    $j$["A – demonstrated independence","B – asked for teacher support","C – developed a competitive attitude","D – seemed to find the activity calming","E – seemed pleased with the results","F – seemed confused","G – seemed to find the activity easy"]$j$::jsonb,
    $j${"answers":["G – seemed to find the activity easy"],"caseSensitive":false}$j$::jsonb,
    'Anya "produced the perfect bird with very little effort", and Seb thinks the teacher could have increased the level of difficulty for her.',
    $j${"ieltsNumber":26,"ieltsType":"matching (choose from box A–G)"}$j$::jsonb
  ),
  (
    'cam18-t4-l3-q27',
    7,
    'multiple_choice',
    $t$Which comment do the students make about each of the following children in the video?
Choose the correct letter, A–G.
27 Zara$t$,
    $j$["A – demonstrated independence","B – asked for teacher support","C – developed a competitive attitude","D – seemed to find the activity calming","E – seemed pleased with the results","F – seemed confused","G – seemed to find the activity easy"]$j$::jsonb,
    $j${"answers":["F – seemed confused"],"caseSensitive":false}$j$::jsonb,
    $t$Of Zara they say she "looked as if she didn't really get what was going on" and "seemed unsure about what she was supposed to do".$t$,
    $j${"ieltsNumber":27,"ieltsType":"matching (choose from box A–G)"}$j$::jsonb
  ),
  (
    'cam18-t4-l3-q28',
    8,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
28 Before starting an origami activity in class, the students think it is important for the teacher to$t$,
    $j$["A – make models that demonstrate the different stages.","B – check children understand the terminology involved.","C – tell children not to worry if they find the activity difficult."]$j$::jsonb,
    $j${"answers":["A – make models that demonstrate the different stages."],"caseSensitive":false}$j$::jsonb,
    'Seb praises preparing "examples, showing each of the steps involved in making the bird", and Lia adds that those physical examples supported the verbal explanations.',
    $j${"ieltsNumber":28,"ieltsType":"multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t4-l3-q29',
    9,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
29 The students agree that some teachers might be unwilling to use origami in class because$t$,
    $j$["A – they may not think that crafts are important.","B – they may not have the necessary skills.","C – they may worry that it will take up too much time."]$j$::jsonb,
    $j${"answers":["B – they may not have the necessary skills."],"caseSensitive":false}$j$::jsonb,
    $t$Seb bets it is "because so many teachers are clumsy like me" and Lia agrees: "too much effort required if you're not good with your hands."$t$,
    $j${"ieltsNumber":29,"ieltsType":"multiple choice"}$j$::jsonb
  ),
  (
    'cam18-t4-l3-q30',
    10,
    'multiple_choice',
    $t$Choose the correct letter, A, B or C.
30 Why do the students decide to use origami in their maths teaching practice?$t$,
    $j$["A – to correct a particular misunderstanding","B – to set a challenge","C – to introduce a new concept"]$j$::jsonb,
    $j${"answers":["C – to introduce a new concept"],"caseSensitive":false}$j$::jsonb,
    'Seb says origami "would also work really well for presenting fractions, which is coming up soon" – a topic the class has not met yet.',
    $j${"ieltsNumber":30,"ieltsType":"multiple choice"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t4-p3'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Victor Hugo
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-cam18-t4-p4',
  'listening',
  'challenge',
  'Victor Hugo',
  'Cambridge IELTS 18 · Test 4 · Listening Part 4 (Questions 31–40).',
  'hard',
  'audio',
  null,
  '/audio/cam18/t4-p4.mp3',
  $t$The person I've chosen to talk about is the French writer Victor Hugo – many people have heard of him because his novel, Les Misérables, which he wrote in 1862, is famous around the world. It became a stage musical in the 1980s, and a film version was also released in 2012. So, some of us, I'm sure, have a pretty general idea of the plot, but we know much less about the author. Today, I'm going to provide a little more insight into this talented man and I'm going to talk particularly about the home he had on the island of Guernsey in the British Channel Islands.

But first, his early career ... as I've said, he was a writer, he was at the height of his career in Paris and he was very highly regarded by his colleagues. As far as literature was concerned, he was the leading figure of the Romantic movement. However, as well as being a literary genius, he also gave many speeches about issues like the level of poverty in his society. He felt very strongly about this and about other areas where change was needed, like education. This kind of outspoken criticism was not well liked by the rulers of France and, eventually, the emperor – Napoleon III – told Victor Hugo to leave Paris and not return; in other words, he sent him into exile.

So Victor Hugo was forced to reside in other parts of Europe. Guernsey was actually his third place of exile and he landed there in 1855. He produced a lot while on Guernsey – including Les Misérables – and to do this, he had to spend a great deal of time in the home that he had there. This was a property that he bought using the money he'd made in France from the publication of a collection of his poetry. It was the only property he ever owned, and he was very proud of it.

The property Victor Hugo bought on Guernsey was a large, five-storey house in the capital town of St Peter Port and he lived there for 15 years, returning to France in 1870 when Napoleon's Empire collapsed. He decorated and furnished each level, or floor, of the house in unique and wonderful ways, and many people consider the inside of the house to be a 'work of art'. Today it's a museum that attracts 200,000 visitors a year.

He lived in the house with his family ... and portraits of its members still hang in rooms on the ground floor, along with drawings that he did during his travels that he felt were important to him. In other ground-floor rooms, there are huge tapestries that he would have designed and loved. The walls are covered in dark wood panelling that Victor Hugo created himself using wooden furniture that he bought in the market. The items were relatively inexpensive, and he used them to create intricate carvings. They gave an atmosphere on the lower level that was shadowy and rather solemn.

On the next level of the house there are two impressive lounges, where he entertained his guests. One lounge has entirely red furnishings, such as sofas and wall coverings, and the other blue. There's a strong Chinese influence in these areas in things like the wallpaper pattern and the lamps – which he would have made himself by copying original versions.

His library, where he left many of his favourite books, forms the hallway to the third floor and was a comfortable area where he could relax and enjoy his afternoons. And then, at the very top of the house, there's a room called the Lookout – called that because it looks out over the harbour. In contrast to the rather dark lower levels, it's full of light and was like a glass office where he would write until lunchtime – often at his desk.

So, Victor Hugo was a man of many talents, but he was also true to his values. While living in his house on Guernsey, he entertained many other famous writers, but he also invited a large group of local children from the deprived areas of the island to dinner once a week. What's more, he served them their food, which was an extraordinary gesture for the time period.

In 1927, the house was owned by his relatives, and they decided to donate it to the city of Paris. It has since been restored using photographs from the period and, as I mentioned earlier, is now a museum that is open to the public.$t$,
  null,
  600,
  $j${"source":"cambridge-ielts-18","test":4,"part":4,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t4-l4-q31',
    1,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
Victor Hugo
His novel, Les Misérables
- It has been adapted for theatre and cinema.
- We know more about its overall 31 .......... than about its author.$t$,
    null::jsonb,
    $j${"answers":["plot"],"caseSensitive":false}$j$::jsonb,
    'The speaker says most people "have a pretty general idea of the plot, but we know much less about the author".',
    $j${"ieltsNumber":31,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-l4-q32',
    2,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
His early career
- In Paris, his career was successful and he led the Romantic movement.
- He spoke publicly about social issues, such as 32 .......... and education.
- Napoleon III disliked his views and exiled him.$t$,
    null::jsonb,
    $j${"answers":["poverty"],"caseSensitive":false}$j$::jsonb,
    'He "gave many speeches about issues like the level of poverty in his society" and other areas needing change, "like education".',
    $j${"ieltsNumber":32,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-l4-q33',
    3,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
His exile from France
- Victor Hugo had to live elsewhere in 33 ...........$t$,
    null::jsonb,
    $j${"answers":["Europe"],"caseSensitive":false}$j$::jsonb,
    'After exile he "was forced to reside in other parts of Europe".',
    $j${"ieltsNumber":33,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-l4-q34',
    4,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
His exile from France
- He used his income from the sale of some 34 .......... he had written to buy a house on Guernsey.$t$,
    null::jsonb,
    $j${"answers":["poetry"],"caseSensitive":false}$j$::jsonb,
    'He bought the property with money made in France "from the publication of a collection of his poetry".',
    $j${"ieltsNumber":34,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-l4-q35',
    5,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
His house on Guernsey
- Victor Hugo lived in this house until the end of the Empire in France.
- The ground floor contains portraits, 35 .......... and tapestries that he valued.$t$,
    null::jsonb,
    $j${"answers":["drawings"],"caseSensitive":false}$j$::jsonb,
    'Ground-floor rooms hold family portraits "along with drawings that he did during his travels", plus huge tapestries.',
    $j${"ieltsNumber":35,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-l4-q36',
    6,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
His house on Guernsey
- He bought cheap 36 .......... made of wood and turned this into beautiful wall carvings.$t$,
    null::jsonb,
    $j${"answers":["furniture"],"caseSensitive":false}$j$::jsonb,
    'The wood panelling was made from "wooden furniture that he bought in the market", which was relatively inexpensive.',
    $j${"ieltsNumber":36,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-l4-q37',
    7,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
His house on Guernsey
- The first floor consists of furnished areas with wallpaper and 37 .......... that have a Chinese design.$t$,
    null::jsonb,
    $j${"answers":["lamps"],"caseSensitive":false}$j$::jsonb,
    'In the two lounges there is "a strong Chinese influence ... in things like the wallpaper pattern and the lamps".',
    $j${"ieltsNumber":37,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-l4-q38',
    8,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
His house on Guernsey
- The library still contains many of his favourite books.
- He wrote in a room at the top of the house that had a view of the 38 ...........$t$,
    null::jsonb,
    $j${"answers":["harbour"],"caseSensitive":false,"acceptedAlternatives":["harbor"]}$j$::jsonb,
    'The top-floor room is called the Lookout "because it looks out over the harbour", and he wrote there until lunchtime.',
    $j${"ieltsNumber":38,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-l4-q39',
    9,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
His house on Guernsey
- He entertained other writers as well as poor 39 .......... in his house.$t$,
    null::jsonb,
    $j${"answers":["children"],"caseSensitive":false}$j$::jsonb,
    'He invited "a large group of local children from the deprived areas of the island to dinner once a week".',
    $j${"ieltsNumber":39,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-l4-q40',
    10,
    'sentence_completion',
    $t$Complete the notes below. Write ONE WORD ONLY for each answer.
His house on Guernsey
- Victor Hugo's 40 .......... gave ownership of the house to the city of Paris.$t$,
    null::jsonb,
    $j${"answers":["relatives"],"caseSensitive":false}$j$::jsonb,
    'In 1927 "the house was owned by his relatives, and they decided to donate it to the city of Paris".',
    $j${"ieltsNumber":40,"ieltsType":"note completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-cam18-t4-p4'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- reading · Green roofs
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-cam18-t4-p1-green-roofs',
  'reading',
  'challenge',
  'Green roofs',
  'Cambridge IELTS 18 · Test 4 · Reading Passage 1 (Questions 1–13).',
  'medium',
  'passage',
  $t$A Rooftops covered with grass, vegetable gardens and lush foliage are now a common sight in many cities around the world. More and more private companies and city authorities are investing in green roofs, drawn to their wide-ranging benefits. Among the benefits are saving on energy costs, mitigating the risk of floods, making habitats for urban wildlife, tackling air pollution and even growing food. These increasingly radical urban designs can help cities adapt to the monumental problems they face, such as access to resources and a lack of green space due to development. But the involvement of city authorities, businesses and other institutions is crucial to ensuring their success – as is research investigating different options to suit the variety of rooftop spaces found in cities. The UK is relatively new to developing green roofs, and local governments and institutions are playing a major role in spreading the practice. London is home to much of the UK's green roof market, mainly due to forward-thinking policies such as the London Plan, which has paved the way to more than doubling the area of green roofs in the capital.

B Ongoing research is showcasing how green roofs in cities can integrate with 'living walls': environmentally friendly walls which are partially or completely covered with greenery, including a growing medium, such as soil or water. Research also indicates that green roofs can be integrated with drainage systems on the ground, such as street trees, so that the water is managed better and the built environment is made more sustainable. There is also evidence to demonstrate the social value of green roofs. Doctors are increasingly prescribing time spent gardening outdoors for patients dealing with anxiety and depression. And research has found that access to even the most basic green spaces can provide a better quality of life for dementia sufferers and help people avoid obesity.

C In North America, green roofs have become mainstream, with a wide array of expansive, accessible and food-producing roofs installed in buildings. Again, city leaders and authorities have helped push the movement forward – only recently, San Francisco, USA, created a policy requiring new buildings to have green roofs. Toronto, Canada, has policies dating from the 1990s, encouraging the development of urban farms on rooftops. These countries also benefit from having newer buildings than in many parts of the world, which makes it easier to install green roofs. Being able to keep enough water at roof height and distribute it right across the rooftop is crucial to maintaining the plants on any green roof – especially on edible roofs where fruit and vegetables are farmed. And it's much easier to do this in newer buildings, which can typically hold greater weight, than to retro-fit old ones. Having a stronger roof also makes it easier to grow a greater variety of plants, since the soil can be deeper.

D For green roofs to become the norm for new developments, there needs to be support from public authorities and private investors. Those responsible for maintaining buildings may have to acquire new skills, such as landscaping, and in some cases, volunteers may be needed to help out. Other considerations include installing drainage paths, meeting health and safety requirements and perhaps allowing access for the public, as well as planning restrictions and disruption from regular activities in and around the buildings during installation. To convince investors and developers that installing green roofs is worthwhile, economic arguments are still the most important. The term 'natural capital' has been developed to explain the economic value of nature; for example, measuring the money saved by installing natural solutions to protect against flood damage, adapt to climate change or help people lead healthier and happier lives.

E As the expertise about green roofs grows, official standards have been developed to ensure that they are designed, constructed and maintained properly, and function well. Improvements in the science and technology underpinning green roof development have also led to new variations in the concept. For example, 'blue roofs' enable buildings to hold water over longer periods of time, rather than draining it away quickly – crucial in times of heavier rainfall. There are also combinations of green roofs with solar panels, and 'brown roofs' which are wilder in nature and maximise biodiversity. If the trend continues, it could create new jobs and a more vibrant and sustainable local food economy – alongside many other benefits. There are still barriers to overcome, but the evidence so far indicates that green roofs have the potential to transform cities and help them function sustainably long into the future. The success stories need to be studied and replicated elsewhere, to make green, blue, brown and food-producing roofs the norm in cities around the world.$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"cambridge-ielts-18","book":18,"test":4,"passage":1,"ieltsQuestionRange":"1-13","extraction":"mineru-ocr","answerKeyVerified":true,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t4-p1-q1',
    1,
    'multiple_choice',
    $t$Reading Passage 1 has five paragraphs, A–E. Which paragraph contains the following information?
NB You may use any letter more than once.
mention of several challenges to be overcome before a green roof can be installed$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["D"],"caseSensitive":false}$j$::jsonb,
    'Paragraph D lists considerations such as installing drainage paths, meeting health and safety requirements, planning restrictions and disruption during installation.',
    $j${"ieltsNumber":1,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t4-p1-q2',
    2,
    'multiple_choice',
    $t$Reading Passage 1 has five paragraphs, A–E. Which paragraph contains the following information?
NB You may use any letter more than once.
reference to a city where green roofs have been promoted for many years$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["C"],"caseSensitive":false}$j$::jsonb,
    'Paragraph C notes that Toronto, Canada, has had policies encouraging rooftop urban farms since the 1990s.',
    $j${"ieltsNumber":2,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t4-p1-q3',
    3,
    'multiple_choice',
    $t$Reading Passage 1 has five paragraphs, A–E. Which paragraph contains the following information?
NB You may use any letter more than once.
a belief that existing green roofs should be used as a model for new ones$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["E"],"caseSensitive":false}$j$::jsonb,
    'Paragraph E states that success stories need to be studied and replicated elsewhere to make such roofs the norm.',
    $j${"ieltsNumber":3,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t4-p1-q4',
    4,
    'multiple_choice',
    $t$Reading Passage 1 has five paragraphs, A–E. Which paragraph contains the following information?
NB You may use any letter more than once.
examples of how green roofs can work in combination with other green urban initiatives$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["B"],"caseSensitive":false}$j$::jsonb,
    'Paragraph B describes integrating green roofs with living walls and with ground drainage systems such as street trees.',
    $j${"ieltsNumber":4,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t4-p1-q5',
    5,
    'multiple_choice',
    $t$Reading Passage 1 has five paragraphs, A–E. Which paragraph contains the following information?
NB You may use any letter more than once.
the need to make a persuasive argument for the financial benefits of green roofs$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["D"],"caseSensitive":false}$j$::jsonb,
    'Paragraph D says that to convince investors and developers, economic arguments are still the most important, introducing the idea of natural capital.',
    $j${"ieltsNumber":5,"ieltsType":"matching_information"}$j$::jsonb
  ),
  (
    'cam18-t4-p1-q6',
    6,
    'sentence_completion',
    $t$Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.
Advantages of green roofs
City rooftops covered with greenery have many advantages. These include lessening the likelihood that floods will occur, reducing how much money is spent on 6 __________ and creating environments that are suitable for wildlife.$t$,
    null::jsonb,
    $j${"answers":["energy"],"caseSensitive":false}$j$::jsonb,
    'Paragraph A lists the benefits, including saving on energy costs.',
    $j${"ieltsNumber":6,"ieltsType":"summary_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-p1-q7',
    7,
    'sentence_completion',
    $t$Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.
Advantages of green roofs
In many cases, they can also be used for producing 7 __________.$t$,
    null::jsonb,
    $j${"answers":["food"],"caseSensitive":false}$j$::jsonb,
    'Paragraph A mentions even growing food; North American roofs are described as food-producing.',
    $j${"ieltsNumber":7,"ieltsType":"summary_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-p1-q8',
    8,
    'sentence_completion',
    $t$Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.
Advantages of green roofs
There are also social benefits of green roofs. For example, the medical profession recommends 8 __________ as an activity to help people cope with mental health issues.$t$,
    null::jsonb,
    $j${"answers":["gardening"],"caseSensitive":false}$j$::jsonb,
    'Paragraph B says doctors are increasingly prescribing time spent gardening outdoors for anxiety and depression.',
    $j${"ieltsNumber":8,"ieltsType":"summary_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-p1-q9',
    9,
    'sentence_completion',
    $t$Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.
Advantages of green roofs
Studies have also shown that the availability of green spaces can prevent physical problems such as 9 __________.$t$,
    null::jsonb,
    $j${"answers":["obesity"],"caseSensitive":false}$j$::jsonb,
    'Paragraph B notes that access to basic green spaces can help people avoid obesity.',
    $j${"ieltsNumber":9,"ieltsType":"summary_completion","instruction":"ONE WORD ONLY."}$j$::jsonb
  ),
  (
    'cam18-t4-p1-q10',
    10,
    'multiple_choice',
    $t$Choose TWO letters, A–E. Which TWO advantages of using newer buildings for green roofs are mentioned in Paragraph C of the passage?
A a longer growing season for edible produce
B more economical use of water
C greater water-storage capacity
D ability to cultivate more plant types
E a large surface area for growing plants
This is one of a pair — enter one correct letter here and the other in the paired question.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["C","D"],"caseSensitive":false}$j$::jsonb,
    'Paragraph C says newer buildings can hold greater weight (allowing more water storage) and that a stronger roof with deeper soil makes it easier to grow a greater variety of plants.',
    $j${"ieltsNumber":10,"ieltsType":"multiple_choice","instruction":"Choose TWO letters.","pairWith":11,"note":"Questions 10 and 11 are a Choose TWO letters pair; the two correct answers are C and D in either order, and both slots accept either letter."}$j$::jsonb
  ),
  (
    'cam18-t4-p1-q11',
    11,
    'multiple_choice',
    $t$Choose TWO letters, A–E. Which TWO advantages of using newer buildings for green roofs are mentioned in Paragraph C of the passage?
A a longer growing season for edible produce
B more economical use of water
C greater water-storage capacity
D ability to cultivate more plant types
E a large surface area for growing plants
This is one of a pair — enter one correct letter here and the other in the paired question.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["C","D"],"caseSensitive":false}$j$::jsonb,
    'Paragraph C says newer buildings can hold greater weight (allowing more water storage) and that a stronger roof with deeper soil makes it easier to grow a greater variety of plants.',
    $j${"ieltsNumber":11,"ieltsType":"multiple_choice","instruction":"Choose TWO letters.","pairWith":10,"note":"Questions 10 and 11 are a Choose TWO letters pair; the two correct answers are C and D in either order, and both slots accept either letter."}$j$::jsonb
  ),
  (
    'cam18-t4-p1-q12',
    12,
    'multiple_choice',
    $t$Choose TWO letters, A–E. Which TWO aims of new variations on the concept of green roofs are mentioned in Paragraph E of the passage?
A to provide habitats for a wide range of species
B to grow plants successfully even in the wettest climates
C to regulate the temperature of the immediate environment
D to generate power from a sustainable source
E to collect water to supply other buildings
This is one of a pair — enter one correct letter here and the other in the paired question.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["A","D"],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph E describes 'brown roofs' that are wilder and maximise biodiversity (habitats for species) and combinations of green roofs with solar panels (generating sustainable power).$t$,
    $j${"ieltsNumber":12,"ieltsType":"multiple_choice","instruction":"Choose TWO letters.","pairWith":13,"note":"Questions 12 and 13 are a Choose TWO letters pair; the two correct answers are A and D in either order, and both slots accept either letter."}$j$::jsonb
  ),
  (
    'cam18-t4-p1-q13',
    13,
    'multiple_choice',
    $t$Choose TWO letters, A–E. Which TWO aims of new variations on the concept of green roofs are mentioned in Paragraph E of the passage?
A to provide habitats for a wide range of species
B to grow plants successfully even in the wettest climates
C to regulate the temperature of the immediate environment
D to generate power from a sustainable source
E to collect water to supply other buildings
This is one of a pair — enter one correct letter here and the other in the paired question.$t$,
    $j$["A","B","C","D","E"]$j$::jsonb,
    $j${"answers":["A","D"],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph E describes 'brown roofs' that are wilder and maximise biodiversity (habitats for species) and combinations of green roofs with solar panels (generating sustainable power).$t$,
    $j${"ieltsNumber":13,"ieltsType":"multiple_choice","instruction":"Choose TWO letters.","pairWith":12,"note":"Questions 12 and 13 are a Choose TWO letters pair; the two correct answers are A and D in either order, and both slots accept either letter."}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-cam18-t4-p1-green-roofs'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- reading · The growth mindset
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-cam18-t4-p2-growth-mindset',
  'reading',
  'challenge',
  'The growth mindset',
  'Cambridge IELTS 18 · Test 4 · Reading Passage 2 (Questions 14–26).',
  'medium',
  'passage',
  $t$Over the past century, a powerful idea has taken root in the educational landscape. The concept of intelligence as something innate has been supplanted by the idea that intelligence is not fixed, and that, with the right training, we can be the authors of our own cognitive capabilities. Psychologist Alfred Binet, the developer of the first intelligence tests, was one of many 19th-century scientists who held that earlier view and sought to quantify cognitive ability. Then, in the early 20th century, progressive thinkers revolted against the notion that inherent ability is destiny. Instead, educators such as John Dewey argued that every child's intelligence could be developed, given the right environment.

'Growth mindset theory' is a relatively new – and extremely popular – version of this idea. In many schools today you will see hallways covered in motivational posters and hear speeches on the mindset of great sporting heroes who simply believed their way to the top. A major focus of the growth mindset in schools is coaxing students away from seeing failure as an indication of their ability, and towards seeing it as a chance to improve that ability. As educationalist Jeff Howard noted several decades ago: 'Smart is not something that you just are, smart is something that you can get.'

The idea of the growth mindset is based on the work of psychologist Carol Dweck in California in the 1990s. In one key experiment, Dweck divided a group of 10- to 12-year-olds into two groups. All were told that they had achieved a high score on a test but the first group were praised for their intelligence in achieving this, while the others were praised for their effort. The second group – those who had been instilled with a 'growth mindset' – were subsequently far more likely to put effort into future tasks. Meanwhile, the former took on only those tasks that would not risk their sense of worth. This group had inferred that success or failure is due to innate ability, and this 'fixed mindset' had led them to fear of failure and lack of effort. Praising ability actually made the students perform worse, while praising effort emphasised that change was possible.

One of the greatest impediments to successfully implementing a growth mindset, however, is the education system itself: in many parts of the world, the school climate is obsessed with performance in the form of constant testing, analysing and ranking of students – a key characteristic of the fixed mindset. Nor is it unusual for schools to create a certain cognitive dissonance, when they applaud the benefits of a growth mindset but then hand out fixed target grades in lessons based on performance.

Aside from the implementation problem, the original growth mindset research has also received harsh criticism. The statistician Andrew Gelman claims that 'their research designs have enough degrees of freedom that they could take their data to support just about any theory at all'. Professor of Psychology Timothy Bates, who has been trying to replicate Dweck's work, is finding that the results are repeatedly null. He notes that: 'People with a growth mindset don't cope any better with failure ... Kids with the growth mindset aren't getting better grades, either before or after our intervention study.'

Much of this criticism is not lost on Dweck, and she deserves great credit for responding to it and adapting her work accordingly. In fact, she argues that her work has been misunderstood and misapplied in a range of ways. She has also expressed concerns that her theories are being misappropriated in schools by being conflated with the self-esteem movement: 'For me the growth mindset is a tool for learning and improvement. It's not just a vehicle for making children feel good.'

But there is another factor at work here. The failure to translate the growth mindset into the classroom might reflect a misunderstanding of the nature of teaching and learning itself. Growth mindset supporters David Yeager and Gregory Walton claim that interventions should be delivered in a subtle way to maximise their effectiveness. They say that if adolescents perceive a teacher's intervention as conveying that they are in need of help, this could undo its intended effects.

A lot of what drives students is their innate beliefs and how they perceive themselves. There is a strong correlation between self-perception and achievement, but there is evidence to suggest that the actual effect of achievement on self-perception is stronger than the other way round. To stand up in a classroom and successfully deliver a good speech is a genuine achievement, and that is likely to be more powerfully motivating than vague notions of 'motivation' itself.

Recent evidence would suggest that growth mindset interventions are not the elixir of student learning that its proponents claim it to be. The growth mindset appears to be a viable construct in the lab, which, when administered in the classroom via targeted interventions, doesn't seem to work. It is hard to dispute that having faith in the capacity to change is a good attribute for students. Paradoxically, however, that aspiration is not well served by direct interventions that try to instil it.

Motivational posters and talks are often a waste of time, and might well give students a deluded notion of what success actually means. Teaching concrete skills such as how to write an effective introduction to an essay then praising students' effort in getting there is probably a far better way of improving confidence than telling them how unique they are, or indeed how capable they are of changing their own brains. Perhaps growth mindset works best as a philosophy and not an intervention.$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"cambridge-ielts-18","book":18,"test":4,"passage":2,"ieltsQuestionRange":"14-26","extraction":"mineru-ocr","answerKeyVerified":true,"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t4-p2-q14',
    1,
    'multiple_choice',
    $t$What can we learn from the first paragraph?
Choose the correct letter, A, B, C or D.$t$,
    $j$["A – where the notion of innate intelligence first began","B – when ideas about the nature of intelligence began to shift","C – how scientists have responded to changing views of intelligence","D – why thinkers turned away from the idea of intelligence being fixed"]$j$::jsonb,
    $j${"answers":["B – when ideas about the nature of intelligence began to shift"],"caseSensitive":false}$j$::jsonb,
    'The first paragraph tracks how the older view of intelligence as innate was supplanted in the early 20th century by the idea it can be developed — it charts when ideas about intelligence began to shift.',
    $j${"ieltsNumber":14,"ieltsType":"Multiple choice (A/B/C/D)"}$j$::jsonb
  ),
  (
    'cam18-t4-p2-q15',
    2,
    'multiple_choice',
    $t$The second paragraph describes how schools encourage students to
Choose the correct letter, A, B, C or D.$t$,
    $j$["A – identify their personal ambitions.","B – help each other to realise their goals.","C – have confidence in their potential to succeed.","D – concentrate on where their particular strengths lie."]$j$::jsonb,
    $j${"answers":["C – have confidence in their potential to succeed."],"caseSensitive":false}$j$::jsonb,
    'The second paragraph says schools coax students away from seeing failure as an indication of their ability and towards seeing it as a chance to improve — building confidence in their potential to succeed.',
    $j${"ieltsNumber":15,"ieltsType":"Multiple choice (A/B/C/D)"}$j$::jsonb
  ),
  (
    'cam18-t4-p2-q16',
    3,
    'multiple_choice',
    $t$In the third paragraph, the writer suggests that students with a fixed mindset
Choose the correct letter, A, B, C or D.$t$,
    $j$["A – tend to be less competitive.","B – generally have a low sense of self-esteem.","C – will only work hard if they are given constant encouragement.","D – are afraid to push themselves beyond what they see as their limitations."]$j$::jsonb,
    $j${"answers":["D – are afraid to push themselves beyond what they see as their limitations."],"caseSensitive":false}$j$::jsonb,
    'In the third paragraph the fixed-mindset group only took on tasks that would not risk their sense of worth and were led to a fear of failure — afraid to push beyond their perceived limitations.',
    $j${"ieltsNumber":16,"ieltsType":"Multiple choice (A/B/C/D)"}$j$::jsonb
  ),
  (
    'cam18-t4-p2-q17',
    4,
    'multiple_choice',
    $t$Match the statement with the correct person or people, A-E.
The methodology behind the growth mindset studies was not strict enough.$t$,
    $j$["A – Alfred Binet","B – Carol Dweck","C – Andrew Gelman","D – Timothy Bates","E – David Yeager and Gregory Walton"]$j$::jsonb,
    $j${"answers":["C – Andrew Gelman"],"caseSensitive":false}$j$::jsonb,
    'Andrew Gelman claims their research designs have enough degrees of freedom that they could support just about any theory — a criticism of the methodology.',
    $j${"ieltsNumber":17,"ieltsType":"Matching statements to people (A-E)"}$j$::jsonb
  ),
  (
    'cam18-t4-p2-q18',
    5,
    'multiple_choice',
    $t$Match the statement with the correct person or people, A-E.
The idea of the growth mindset has been incorrectly interpreted.$t$,
    $j$["A – Alfred Binet","B – Carol Dweck","C – Andrew Gelman","D – Timothy Bates","E – David Yeager and Gregory Walton"]$j$::jsonb,
    $j${"answers":["B – Carol Dweck"],"caseSensitive":false}$j$::jsonb,
    'Dweck argues that her work has been misunderstood and misapplied in a range of ways — that the idea has been incorrectly interpreted.',
    $j${"ieltsNumber":18,"ieltsType":"Matching statements to people (A-E)"}$j$::jsonb
  ),
  (
    'cam18-t4-p2-q19',
    6,
    'multiple_choice',
    $t$Match the statement with the correct person or people, A-E.
Intellectual ability is an unchangeable feature of each individual.$t$,
    $j$["A – Alfred Binet","B – Carol Dweck","C – Andrew Gelman","D – Timothy Bates","E – David Yeager and Gregory Walton"]$j$::jsonb,
    $j${"answers":["A – Alfred Binet"],"caseSensitive":false}$j$::jsonb,
    'Alfred Binet held the earlier view that intelligence was innate and sought to quantify cognitive ability — treating intellectual ability as fixed.',
    $j${"ieltsNumber":19,"ieltsType":"Matching statements to people (A-E)"}$j$::jsonb
  ),
  (
    'cam18-t4-p2-q20',
    7,
    'multiple_choice',
    $t$Match the statement with the correct person or people, A-E.
The growth mindset should be promoted without students being aware of it.$t$,
    $j$["A – Alfred Binet","B – Carol Dweck","C – Andrew Gelman","D – Timothy Bates","E – David Yeager and Gregory Walton"]$j$::jsonb,
    $j${"answers":["E – David Yeager and Gregory Walton"],"caseSensitive":false}$j$::jsonb,
    'Yeager and Walton claim interventions should be delivered in a subtle way, warning that if adolescents perceive the intervention it could undo its effects.',
    $j${"ieltsNumber":20,"ieltsType":"Matching statements to people (A-E)"}$j$::jsonb
  ),
  (
    'cam18-t4-p2-q21',
    8,
    'multiple_choice',
    $t$Match the statement with the correct person or people, A-E.
The growth mindset is not simply about boosting students' morale.$t$,
    $j$["A – Alfred Binet","B – Carol Dweck","C – Andrew Gelman","D – Timothy Bates","E – David Yeager and Gregory Walton"]$j$::jsonb,
    $j${"answers":["B – Carol Dweck"],"caseSensitive":false}$j$::jsonb,
    'Dweck says the growth mindset is a tool for learning and improvement, not just a vehicle for making children feel good.',
    $j${"ieltsNumber":21,"ieltsType":"Matching statements to people (A-E)"}$j$::jsonb
  ),
  (
    'cam18-t4-p2-q22',
    9,
    'multiple_choice',
    $t$Match the statement with the correct person or people, A-E.
Research shows that the growth mindset has no effect on academic achievement.$t$,
    $j$["A – Alfred Binet","B – Carol Dweck","C – Andrew Gelman","D – Timothy Bates","E – David Yeager and Gregory Walton"]$j$::jsonb,
    $j${"answers":["D – Timothy Bates"],"caseSensitive":false}$j$::jsonb,
    'Timothy Bates finds the results repeatedly null: kids with a growth mindset are not getting better grades before or after the intervention study.',
    $j${"ieltsNumber":22,"ieltsType":"Matching statements to people (A-E)"}$j$::jsonb
  ),
  (
    'cam18-t4-p2-q23',
    10,
    'true_false_not_given',
    $t$Do the following statement agree with the views of the writer in Reading Passage 2?
Dweck has handled criticisms of her work in an admirable way.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["Yes"],"caseSensitive":false}$j$::jsonb,
    'The writer states that Dweck deserves great credit for responding to the criticism and adapting her work accordingly.',
    $j${"ieltsNumber":23,"ieltsType":"Yes/No/Not Given"}$j$::jsonb
  ),
  (
    'cam18-t4-p2-q24',
    11,
    'true_false_not_given',
    $t$Do the following statement agree with the views of the writer in Reading Passage 2?
Students' self-perception is a more effective driver of self-confidence than actual achievement is.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["No"],"caseSensitive":false}$j$::jsonb,
    'The writer says evidence suggests the effect of achievement on self-perception is stronger than the other way round — the opposite of the statement.',
    $j${"ieltsNumber":24,"ieltsType":"Yes/No/Not Given"}$j$::jsonb
  ),
  (
    'cam18-t4-p2-q25',
    12,
    'true_false_not_given',
    $t$Do the following statement agree with the views of the writer in Reading Passage 2?
Recent evidence about growth mindset interventions has attracted unfair coverage in the media.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["Not Given"],"caseSensitive":false}$j$::jsonb,
    'The writer discusses recent evidence that interventions do not work but makes no comment about media coverage being fair or unfair.',
    $j${"ieltsNumber":25,"ieltsType":"Yes/No/Not Given"}$j$::jsonb
  ),
  (
    'cam18-t4-p2-q26',
    13,
    'true_false_not_given',
    $t$Do the following statement agree with the views of the writer in Reading Passage 2?
Deliberate attempts to encourage students to strive for high achievement may have a negative effect.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["Yes"],"caseSensitive":false}$j$::jsonb,
    'The writer argues that direct interventions do not serve the aspiration well and that motivational posters and talks may give students a deluded notion of success.',
    $j${"ieltsNumber":26,"ieltsType":"Yes/No/Not Given"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-cam18-t4-p2-growth-mindset'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- reading · Alfred Wegener: science, exploration and the theory of continental drift
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-cam18-t4-p3-wegener',
  'reading',
  'challenge',
  'Alfred Wegener: science, exploration and the theory of continental drift',
  'Cambridge IELTS 18 · Test 4 · Reading Passage 3 (Questions 27–40).',
  'hard',
  'passage',
  $t$by Mott T Greene

Introduction

This is a book about the life and scientific work of Alfred Wegener, whose reputation today rests with his theory of continental displacements, better known as 'continental drift'. Wegener proposed this theory in 1912 and developed it extensively for nearly 20 years. His book on the subject, The Origin of Continents and Oceans, went through four editions and was the focus of an international controversy in his lifetime and for some years after his death.

Wegener's basic idea was that many mysteries about the Earth's history could be solved if one supposed that the continents moved laterally, rather than supposing that they remained fixed in place. Wegener showed in great detail how such continental movements were plausible and how they worked, using evidence from a large number of sciences including geology, geophysics, paleontology, and climatology. Wegener's idea - that the continents move - is at the heart of the theory that guides Earth sciences today: namely plate tectonics. Plate tectonics is in many respects quite different from Wegener's proposal, in the same way that modern evolutionary theory is very different from the ideas Charles Darwin proposed in the 1850s about biological evolution. Yet plate tectonics is a descendant of Alfred Wegener's theory of continental drift, in quite the same way that modern evolutionary theory is a descendant of Darwin's theory of natural selection.

When I started writing about Wegener's life and work, one of the most intriguing things about him for me was that, although he came up with a theory on continental drift, he was not a geologist. He trained as an astronomer and pursued a career in atmospheric physics. When he proposed the theory of continental displacements in 1912, he was a lecturer in physics and astronomy at the University of Marburg, in southern Germany. However, he was not an 'unknown'. In 1906 he had set a world record (with his brother Kurt) for time aloft in a hot-air balloon: 52 hours. Between 1906 and 1908 he had taken part in a highly publicized and extremely dangerous expedition to the coast of northeast Greenland. He had also made a name for himself amongst a small circle of meteorologists and atmospheric physicists in Germany as the author of a textbook, Thermodynamics of the Atmosphere (1911), and of a number of interesting scientific papers.

As important as Wegener's work on continental drift has turned out to be, it was largely a sideline to his interest in atmospheric physics, geophysics, and paleoclimatology, and thus I have been at great pains to put Wegener's work on continental drift in the larger context of his other scientific work, and in the even larger context of atmospheric sciences in his lifetime. This is a 'continental drift book' only to the extent that Wegener was interested in that topic and later became famous for it. My treatment of his other scientific work is no less detailed, though I certainly have devoted more attention to the reception of his ideas on continental displacement, as they were much more controversial than his other work.

Readers interested in the specific detail of Wegener's career will see that he often stopped pursuing a given line of investigation (sometimes for years on end), only to pick it up later. I have tried to provide guideposts to his rapidly shifting interests by characterizing different phases of his life as careers in different sciences, which is reflected in the titles of the chapters. Thus, the index should be a sufficient guide for those interested in a particular aspect of Wegener's life but perhaps not all of it. My own feeling, however, is that the parts do not make as much sense on their own as do all of his activities taken together. In this respect I urge readers to try to experience Wegener's life as he lived it, with all the interruptions, changes of mind, and renewed efforts this entailed.

Wegener left behind a few published works but, as was standard practice, these reported the results of his work - not the journey he took to reach that point. Only a few hundred of the many thousands of letters he wrote and received in his lifetime have survived and he didn't keep notebooks or diaries that recorded his life and activities. He was not active (with a few exceptions) in scientific societies, and did not seek to find influence or advance his ideas through professional contacts and politics, spending most of his time at home in his study reading and writing, or in the field collecting observations.

Some famous scientists, such as Newton, Darwin, and Einstein, left mountains of written material behind, hundreds of notebooks and letters numbering in the tens of thousands. Others, like Michael Faraday, left extensive journals of their thoughts and speculations, parallel to their scientific notebooks. The more such material a scientist leaves behind, the better chance a biographer has of forming an accurate picture of how a scientist's ideas took shape and evolved.

I am firmly of the opinion that most of us, Wegener included, are not in any real sense the authors of our own lives. We plan, think, and act, often with apparent freedom, but most of the time our lives 'happen to us', and we only retrospectively turn this happenstance into a coherent narrative of fulfilled intentions. This book, therefore, is a story both of the life and scientific work that Alfred Wegener planned and intended and of the life and scientific work that actually 'happened to him'. These are, as I think you will soon see, not always the same thing.$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"cambridge-ielts-18","book":18,"test":4,"passage":3,"ieltsQuestionRange":"27-40","extraction":"mineru-ocr","answerKeyVerified":true,"note":"Per OCR headers: Q31-36 are summary completion from a phrase bank (A-J) and Q37-40 are multiple choice (A-D); both encoded as multiple_choice with full-text, letter-prefixed options. Task STEP-4 labelled 31-38 as one matching group, but the OCR headers and verified answer letters show 31-36 summary + 37-40 MCQ, so question TYPE was taken from the OCR headers as instructed.","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t4-p3-q27',
    1,
    'true_false_not_given',
    $t$Do the following statement agree with the claims of the writer in Reading Passage 3?
Wegener's ideas about continental drift were widely disputed while he was alive.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["Yes"],"caseSensitive":false}$j$::jsonb,
    $t$The first paragraph states his theory 'was the focus of an international controversy in his lifetime', and paragraph four calls his continental-drift ideas 'much more controversial than his other work'.$t$,
    $j${"ieltsNumber":27,"ieltsType":"YES/NO/NOT GIVEN"}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q28',
    2,
    'true_false_not_given',
    $t$Do the following statement agree with the claims of the writer in Reading Passage 3?
The idea that the continents remained fixed in place was defended in a number of respected scientific publications.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["Not Given"],"caseSensitive":false}$j$::jsonb,
    $t$The passage mentions the notion that continents 'remained fixed in place' only as the alternative to Wegener's view; it says nothing about publications defending that fixed-continent idea.$t$,
    $j${"ieltsNumber":28,"ieltsType":"YES/NO/NOT GIVEN"}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q29',
    3,
    'true_false_not_given',
    $t$Do the following statement agree with the claims of the writer in Reading Passage 3?
Wegener relied on a limited range of scientific fields to support his theory of continental drift.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["No"],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph two says he used 'evidence from a large number of sciences including geology, geophysics, paleontology, and climatology', contradicting the claim of a limited range.$t$,
    $j${"ieltsNumber":29,"ieltsType":"YES/NO/NOT GIVEN"}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q30',
    4,
    'true_false_not_given',
    $t$Do the following statement agree with the claims of the writer in Reading Passage 3?
The similarities between Wegener's theory of continental drift and modern-day plate tectonics are enormous.$t$,
    $j$["Yes","No","Not Given"]$j$::jsonb,
    $j${"answers":["No"],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph two states 'Plate tectonics is in many respects quite different from Wegener's proposal', contradicting the claim that the similarities are enormous.$t$,
    $j${"ieltsNumber":30,"ieltsType":"YES/NO/NOT GIVEN"}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q31',
    5,
    'multiple_choice',
    $t$Complete the summary. Choose the correct phrase (A-J) for gap 31.
One of the remarkable things about Wegener from a ___ is that although he proposed a theory of continental drift, he was not a geologist.$t$,
    $j$["A – modest fame","B – vast range","C – record-breaking achievement","D – research methods","E – select group","F – professional interests","G – scientific debate","H – hazardous exploration","I – biographer's perspective","J – narrow investigation"]$j$::jsonb,
    $j${"answers":["I – biographer's perspective"],"caseSensitive":false}$j$::jsonb,
    $t$The writer, as Wegener's biographer, opens paragraph three by noting from his own point of view that although Wegener devised the theory 'he was not a geologist' - a biographer's perspective.$t$,
    $j${"ieltsNumber":31,"ieltsType":"Summary completion (list of phrases A-J)","instruction":"Complete the summary using the list of phrases, A-J."}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q32',
    6,
    'multiple_choice',
    $t$Complete the summary. Choose the correct phrase (A-J) for gap 32.
His ___ were limited to atmospheric physics.$t$,
    $j$["A – modest fame","B – vast range","C – record-breaking achievement","D – research methods","E – select group","F – professional interests","G – scientific debate","H – hazardous exploration","I – biographer's perspective","J – narrow investigation"]$j$::jsonb,
    $j${"answers":["F – professional interests"],"caseSensitive":false}$j$::jsonb,
    $t$The text says Wegener 'trained as an astronomer and pursued a career in atmospheric physics', so his professional interests centred on that field.$t$,
    $j${"ieltsNumber":32,"ieltsType":"Summary completion (list of phrases A-J)","instruction":"Complete the summary using the list of phrases, A-J."}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q33',
    7,
    'multiple_choice',
    $t$Complete the summary. Choose the correct phrase (A-J) for gap 33.
However, at the time he proposed his theory of continental drift in 1912, he was already a person of ___.$t$,
    $j$["A – modest fame","B – vast range","C – record-breaking achievement","D – research methods","E – select group","F – professional interests","G – scientific debate","H – hazardous exploration","I – biographer's perspective","J – narrow investigation"]$j$::jsonb,
    $j${"answers":["A – modest fame"],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph three notes 'he was not an unknown', having set a ballooning record and joined a publicized expedition - i.e. a person of modest fame.$t$,
    $j${"ieltsNumber":33,"ieltsType":"Summary completion (list of phrases A-J)","instruction":"Complete the summary using the list of phrases, A-J."}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q34',
    8,
    'multiple_choice',
    $t$Complete the summary. Choose the correct phrase (A-J) for gap 34.
Six years previously, there had been his ___ of 52 hours in a hot-air balloon,$t$,
    $j$["A – modest fame","B – vast range","C – record-breaking achievement","D – research methods","E – select group","F – professional interests","G – scientific debate","H – hazardous exploration","I – biographer's perspective","J – narrow investigation"]$j$::jsonb,
    $j${"answers":["C – record-breaking achievement"],"caseSensitive":false}$j$::jsonb,
    $t$In 1906 Wegener 'set a world record (with his brother Kurt) for time aloft in a hot-air balloon: 52 hours' - a record-breaking achievement.$t$,
    $j${"ieltsNumber":34,"ieltsType":"Summary completion (list of phrases A-J)","instruction":"Complete the summary using the list of phrases, A-J."}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q35',
    9,
    'multiple_choice',
    $t$Complete the summary. Choose the correct phrase (A-J) for gap 35.
followed by his well-publicised but ___ of Greenland's coast.$t$,
    $j$["A – modest fame","B – vast range","C – record-breaking achievement","D – research methods","E – select group","F – professional interests","G – scientific debate","H – hazardous exploration","I – biographer's perspective","J – narrow investigation"]$j$::jsonb,
    $j${"answers":["H – hazardous exploration"],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph three describes his 'highly publicized and extremely dangerous expedition to the coast of northeast Greenland' - a hazardous exploration.$t$,
    $j${"ieltsNumber":35,"ieltsType":"Summary completion (list of phrases A-J)","instruction":"Complete the summary using the list of phrases, A-J."}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q36',
    10,
    'multiple_choice',
    $t$Complete the summary. Choose the correct phrase (A-J) for gap 36.
With the publication of his textbook on thermodynamics, he had also come to the attention of a ___ of German scientists.$t$,
    $j$["A – modest fame","B – vast range","C – record-breaking achievement","D – research methods","E – select group","F – professional interests","G – scientific debate","H – hazardous exploration","I – biographer's perspective","J – narrow investigation"]$j$::jsonb,
    $j${"answers":["E – select group"],"caseSensitive":false}$j$::jsonb,
    $t$As author of his textbook he 'made a name for himself amongst a small circle of meteorologists and atmospheric physicists in Germany' - a select group.$t$,
    $j${"ieltsNumber":36,"ieltsType":"Summary completion (list of phrases A-J)","instruction":"Complete the summary using the list of phrases, A-J."}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q37',
    11,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
What is Mott T Greene doing in the fifth paragraph?$t$,
    $j$["A – describing what motivated him to write the book","B – explaining why it is desirable to read the whole book","C – suggesting why Wegener pursued so many different careers","D – indicating what aspects of Wegener's life interested him most"]$j$::jsonb,
    $j${"answers":["B – explaining why it is desirable to read the whole book"],"caseSensitive":false}$j$::jsonb,
    $t$In paragraph five he says 'the parts do not make as much sense on their own as do all of his activities taken together' and urges readers to experience Wegener's whole life - i.e. why to read the whole book.$t$,
    $j${"ieltsNumber":37,"ieltsType":"Multiple choice (A-D)"}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q38',
    12,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
What is said about Wegener in the sixth paragraph?$t$,
    $j$["A – He was not a particularly ambitious person.","B – He kept a record of all his scientific observations.","C – He did not adopt many of the scientific practices of the time.","D – He enjoyed discussing new discoveries with other scientists."]$j$::jsonb,
    $j${"answers":["A – He was not a particularly ambitious person."],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph six says he 'did not seek to find influence or advance his ideas through professional contacts and politics', preferring quiet work at home - suggesting he was not especially ambitious.$t$,
    $j${"ieltsNumber":38,"ieltsType":"Multiple choice (A-D)"}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q39',
    13,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
What does Greene say about some other famous scientists?$t$,
    $j$["A – Their published works had a greater impact than Wegener's did.","B – They had fewer doubts about their scientific ideas than Wegener did.","C – Their scientific ideas were more controversial than Wegener's.","D – They are easier subjects to write about than Wegener."]$j$::jsonb,
    $j${"answers":["D – They are easier subjects to write about than Wegener."],"caseSensitive":false}$j$::jsonb,
    $t$Paragraph seven notes scientists like Newton and Darwin 'left mountains of written material', and 'the more such material a scientist leaves behind, the better chance a biographer has' - making them easier to write about than the sparsely documented Wegener.$t$,
    $j${"ieltsNumber":39,"ieltsType":"Multiple choice (A-D)"}$j$::jsonb
  ),
  (
    'cam18-t4-p3-q40',
    14,
    'multiple_choice',
    $t$Choose the correct letter, A, B, C or D.
What is Greene's main point in the final paragraph?$t$,
    $j$["A – It is not enough in life to have good intentions.","B – People need to plan carefully if they want to succeed.","C – People have little control over many aspects of their lives.","D – It is important that people ensure they have the freedom to act."]$j$::jsonb,
    $j${"answers":["C – People have little control over many aspects of their lives."],"caseSensitive":false}$j$::jsonb,
    $t$The final paragraph argues most people 'are not in any real sense the authors of our own lives' and that 'most of the time our lives happen to us' - i.e. people have little control over much of their lives.$t$,
    $j${"ieltsNumber":40,"ieltsType":"Multiple choice (A-D)"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-cam18-t4-p3-wegener'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- writing · Cambridge 18 · Test 4 · Writing
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'writing-cam18-t4',
  'writing',
  'progressive',
  'Cambridge 18 · Test 4 · Writing',
  'Cambridge IELTS 18 · Test 4 · Writing Task 1 & Task 2.',
  'medium',
  'writing_prompt',
  null,
  null,
  null,
  '/images/cam18/t4-writing-task1.jpg',
  3600,
  $j${"source":"cambridge-ielts-18","test":4,"paper":"writing","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t4-writing-q1',
    1,
    'writing_task',
    $t$You should spend about 20 minutes on this task.

The graph below shows the average monthly change in the prices of three metals (copper, nickel and zinc) during 2014.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Task 1 report. Assessed on task achievement, coherence, lexical resource, and grammar rather than an exact answer.',
    $j${"ieltsNumber":1,"ieltsType":"writing_task_1","taskType":"task_1","wordTarget":150}$j$::jsonb
  ),
  (
    'cam18-t4-writing-q2',
    2,
    'writing_task',
    $t$You should spend about 40 minutes on this task.

Write about the following topic:

In many countries, people are now living longer than ever before. Some people say an ageing population creates problems for governments. Other people think there are benefits if society has more elderly people.

To what extent do the advantages of having an ageing population outweigh the disadvantages?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Task 2 essay. Assessed on task response, coherence, lexical resource, and grammar rather than an exact answer.',
    $j${"ieltsNumber":2,"ieltsType":"writing_task_2","taskType":"task_2","wordTarget":250}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'writing-cam18-t4'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- speaking · Cambridge 18 · Test 4 · Speaking
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'speaking-cam18-t4',
  'speaking',
  'progressive',
  'Cambridge 18 · Test 4 · Speaking',
  'Cambridge IELTS 18 · Test 4 · Speaking Parts 1–3.',
  'medium',
  'speaking_prompt',
  null,
  null,
  null,
  null,
  840,
  $j${"source":"cambridge-ielts-18","test":4,"paper":"speaking","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'cam18-t4-speaking-q1',
    1,
    'speaking_response',
    $t$Part 1 (Interview) — Topic: Sleep

- How many hours do you usually sleep at night?
- Do you sometimes sleep during the day? [Why/Why not?]
- What do you do if you can't get to sleep at night? [Why?]
- Do you ever remember the dreams you've had while you were asleep?$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Part 1 answers should be short, direct and personal. Assessed on fluency, vocabulary, grammar and pronunciation rather than an exact answer.',
    $j${"ieltsType":"speaking_part_1","part":1}$j$::jsonb
  ),
  (
    'cam18-t4-speaking-q2',
    2,
    'speaking_response',
    $t$Part 2 (Long turn) — Cue card

Describe a time when you met someone who you became good friends with.

You should say:
- who you met
- when and where you met this person
- what you thought about this person when you first met
- and explain why you think you became good friends.

You will have to talk about the topic for one to two minutes. You have one minute to think about what you are going to say. You can make some notes to help you if you wish.$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Speak for 1–2 minutes after 1 minute of preparation. Assessed on fluency, coherence, vocabulary, grammar and pronunciation.',
    $j${"ieltsType":"speaking_part_2","part":2,"prepSeconds":60,"responseSeconds":120}$j$::jsonb
  ),
  (
    'cam18-t4-speaking-q3',
    3,
    'speaking_response',
    $t$Part 3 (Discussion)

Friends at school
- How important is it for children to have lots of friends at school?
- Do you think it is wrong for parents to influence which friends their children have?
- Why do you think children often choose different friends as they get older?

Making new friends
- If a person is moving to a new town, what is a good way for them to make friends?
- Can you think of any disadvantages of making new friends online?
- Would you say it is harder for people to make new friends as they get older?$t$,
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Part 3 answers should be developed with reasons and examples. Assessed on the ability to discuss abstract ideas, plus fluency, vocabulary, grammar and pronunciation.',
    $j${"ieltsType":"speaking_part_3","part":3}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'speaking-cam18-t4'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

