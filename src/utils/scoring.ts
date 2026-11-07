import type { Evaluation, PageResult } from '../types/api';
export function latestByBovine(items: Evaluation[]): Map<number, Evaluation> {
  const result = new Map<number, Evaluation>();
  for (const item of items) {
    if (item.status === 'Rejected') continue;
    const current = result.get(item.bovineId);
    if (!current || item.evaluationDate > current.evaluationDate ||
      (item.evaluationDate === current.evaluationDate && item.id > current.id)) result.set(item.bovineId, item);
  }
  return result;
}
export const hasScore = (evaluation?: Evaluation) => !!evaluation && evaluation.status !== 'Rejected' && evaluation.bodyConditionScore != null;
export const verifiedPhotos = (evaluation: Evaluation) => evaluation.images.filter(image => image.uploadStatus === 'Verified');
export const hasRequiredScorePhotos = (evaluation: Evaluation) =>
  ['RightLateral', 'Rear'].every(angle => evaluation.images.some(image => image.angle === angle && image.uploadStatus === 'Verified'));
export const canScore = (evaluation: Evaluation) =>
  ['Draft', 'PendingUpload'].includes(evaluation.status) && hasRequiredScorePhotos(evaluation);
export const validScore = (value: number | null) =>
  value != null && Number.isFinite(value) && value >= 1 && value <= 5 && Number.isInteger(value * 4);
export async function allPages<T>(fetch: (page: number) => Promise<PageResult<T>>): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await fetch(page);
    items.push(...result.items);
    if (items.length >= result.total) return items;
    if (!result.items.length) throw new Error('No se pudo cargar el listado completo. Inténtalo de nuevo.');
  }
}
