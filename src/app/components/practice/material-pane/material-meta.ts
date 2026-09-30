import { BookOpenText, Headphones, Microphone, PenNib } from '@phosphor-icons/react';
import type { PracticeUnit } from '@/lib/types';
import { resolveExam } from '@/lib/exam-config';

export function getMaterialMeta(unit: PracticeUnit) {
  if (unit.material_type === 'audio') {
    return {
      Icon: Headphones,
      label: 'Listening Section',
      hintTarget: 'Transcript',
      annotationTitle: 'Transcript 标注',
      emptyLabel: unit.metadata?.syntheticSpeech === true ? '原创合成听力' : unit.audio_url ? null : '音频暂未提供',
      emptyDescription: unit.metadata?.syntheticSpeech === true
        ? '使用浏览器英语语音朗读原创材料，非官方考试录音。请先听音作答；展开原文后仅作为文字辅助练习。'
        : unit.audio_url ? null : '当前单元没有可播放音频，可阅读原文进行文字辅助练习，但不能视为已完成听力训练。',
      tone: 'sky',
    };
  }

  if (unit.material_type === 'translation_prompt') {
    return {
      Icon: PenNib,
      label: 'Translation Prompt',
      hintTarget: '中文材料',
      annotationTitle: '翻译材料标注',
      emptyLabel: '汉译英练习',
      emptyDescription: '将中文段落译成英文。提交后对照参考译文与复核清单，检查信息完整性、句法和用词；参考译文不是唯一答案。',
      tone: 'amber',
    };
  }

  if (unit.material_type === 'writing_prompt') {
    return {
      Icon: PenNib,
      label: 'Writing Task',
      hintTarget: 'Prompt',
      annotationTitle: 'Prompt 标注',
      emptyLabel: '写作工作区',
      emptyDescription: resolveExam(unit.exam) === 'ielts'
        ? '阅读 Task 要求并完成草稿，提交后结合评分维度进行自评和复盘。'
        : '按题目要求与目标词数完成英语短文，提交后对照参考范文与复核清单自评；不生成官方分数。',
      tone: 'amber',
    };
  }

  if (unit.material_type === 'speaking_prompt') {
    return {
      Icon: Microphone,
      label: 'Speaking Session',
      hintTarget: 'Cue card',
      annotationTitle: 'Cue card 标注',
      emptyLabel: '口语练习',
      emptyDescription: '使用准备计时与录音练习回答，在右侧记录文字要点并自评；录音能力取决于浏览器和麦克风权限。',
      tone: 'rose',
    };
  }

  return {
    Icon: BookOpenText,
    label: 'Reading Passage',
    hintTarget: 'Passage',
    annotationTitle: 'Passage 标注',
    emptyLabel: null,
    emptyDescription: null,
    tone: 'emerald',
  };
}
