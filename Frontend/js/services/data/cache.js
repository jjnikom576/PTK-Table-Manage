import { cache, getServiceConfig, resetLastPeriods } from './state.js';

export function clearCache() {
  console.log('[DataService] Clearing all cache...');
  cache.clear();
  resetLastPeriods();
  console.log('[DataService] ✅ Cache cleared');
}

export function clearYearCache(year) {
  if (year == null) {
    console.warn('[DataService] clearYearCache called without year');
    return;
  }

  const numericYear = Number(year);
  const yearKey = Number.isFinite(numericYear) ? String(numericYear) : String(year).trim();

  console.log(`[DataService] Clearing cache for year ${yearKey}...`);

  const prefixes = [
    `teachers_${yearKey}`,
    `classes_${yearKey}`,
    `rooms_${yearKey}`,
    `subjects_${yearKey}`,
    `schedules_${yearKey}`,
    `byYear.${yearKey}`,
    `exportCache.${yearKey}`,
    `semesters.${yearKey}`
  ];

  const keysToRemove = new Set(prefixes);

  const collectMatches = (key) => {
    if (!key) return;
    if (
      prefixes.some(
        (prefix) =>
          key === prefix ||
          key.startsWith(`${prefix}_`) ||
          key.startsWith(`${prefix}.`)
      )
    ) {
      keysToRemove.add(key);
    }
  };

  Object.keys(cache).forEach(collectMatches);
  Object.keys(cache.timestamps || {}).forEach(collectMatches);

  let removedCount = 0;

  keysToRemove.forEach((key) => {
    const hadTimestamp =
      cache.timestamps && Object.prototype.hasOwnProperty.call(cache.timestamps, key);
    let hadData = false;

    if (key.includes('.')) {
      const [section, subKey] = key.split('.');
      if (cache[section] && Object.prototype.hasOwnProperty.call(cache[section], subKey)) {
        hadData = true;
      }
    } else if (Object.prototype.hasOwnProperty.call(cache, key)) {
      hadData = true;
    }

    if (hadTimestamp || hadData) {
      cache.delete(key);
      removedCount += 1;
    }
  });

  console.log(`[DataService] ✅ Removed ${removedCount} cache entries for year ${yearKey}`);
}

export function getCacheStatus() {
  const config = getServiceConfig();
  return {
    enabled: config.enableCache,
    timeout: config.cacheTimeout,
    size: Object.keys(cache.timestamps || {}).length,
    years: Object.keys(cache.byYear || {}),
    lastCleared: cache.lastCleared || null
  };
}
