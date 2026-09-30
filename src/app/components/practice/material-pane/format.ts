import type { PracticeUnit } from '@/lib/types';
import type { AnnotationSyncStatus } from '../usePracticeAnnotationSync';

// mm:ss + minute-duration formatters live in @/lib/practice-clock; re-exported here for material-pane consumers.
export { formatClock as formatTimer, formatMinutes } from '@/lib/practice-clock';

export function formatMetadataSeconds(value: unknown) {
  if (typeof value !== 'number') return '未设置';
  if (value < 60) return `${value} 秒`;
  return `${Math.round(value / 60)} 分钟`;
}

export function formatMetadataValue(value: unknown, fallback = '未设置') {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
}

export function formatWordRange(value: unknown) {
  if (!Array.isArray(value) || value.length !== 2) return '按题目要求';
  const [min, max] = value;
  if (typeof min !== 'number' || typeof max !== 'number' || !Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) {
    return '按题目要求';
  }
  return `${min}–${max} words`;
}

export function getMaterialText(unit: PracticeUnit) {
  return unit.passage_text ?? unit.transcript ?? String(unit.metadata?.prompt ?? unit.metadata?.cueCard ?? '');
}

export function annotationSyncCopy(sync: { status: AnnotationSyncStatus; restoredCount: number; dirty?: boolean }): string {
  switch (sync.status) {
    case 'loading':
      return '，正在读取云端备份；读取完成前不会上传本机空集。';
    case 'authorization-required':
      return '，需要登录并明确授权后才会读取或写入云端。';
    case 'syncing':
      return '，正在同步到云端…';
    case 'conflict':
      return '，本机与云端内容不同，等待你选择恢复云端或上传本机。';
    case 'paused':
      return '，云端同步已暂停；标注仍可留在本机。';
    case 'error':
      return '，本机已保存，云端同步未完成，请查看下方提示。';
    case 'ready':
      if (sync.dirty) return '，本机已保存，最新改动尚未得到云端确认。';
      return sync.restoredCount > 0
        ? `，已与云端一致（本轮恢复 ${sync.restoredCount} 条）。`
        : '，已与云端一致。';
    case 'disabled':
      return '，只保存在本机浏览器，不会写入数据库。';
    default:
      return sync.dirty ? '，本机有尚未确认的改动。' : '，本机已保存；云端状态待确认。';
  }
}
