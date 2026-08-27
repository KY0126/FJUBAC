export const DEPARTMENT_CAROUSEL_DEFAULT_INTERVAL_MS = 3800;
export const DEPARTMENT_CAROUSEL_MIN_INTERVAL_MS = 2500;
export const DEPARTMENT_CAROUSEL_MAX_INTERVAL_MS = 12_000;

export function isAllowedDepartmentCarouselInterval(intervalMs: number) {
  return Number.isInteger(intervalMs)
    && intervalMs >= DEPARTMENT_CAROUSEL_MIN_INTERVAL_MS
    && intervalMs <= DEPARTMENT_CAROUSEL_MAX_INTERVAL_MS;
}
