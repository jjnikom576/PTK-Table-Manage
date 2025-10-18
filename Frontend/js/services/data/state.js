const DEFAULT_SERVICE_CONFIG = {
  mode: 'api',
  enableCache: true,
  cacheTimeout: 300000, // 5 minutes
  maxCacheSize: 50
};

let serviceConfig = { ...DEFAULT_SERVICE_CONFIG };

let currentContext = {
  year: null,
  semesterId: null,
  semester: null,
  academicYear: null
};

let lastLoadedPeriods = [];
let lastPeriodsContext = { year: null, semesterId: null };

export const cache = {
  years: null,
  semesters: {},
  byYear: {},
  exportCache: {},
  timestamps: {},
  lastCleared: null,

  set(key, data) {
    if (!serviceConfig.enableCache) return;
    this.timestamps[key] = Date.now();
    if (key.includes('.')) {
      const [section, subKey] = key.split('.');
      if (!this[section]) {
        this[section] = {};
      }
      this[section][subKey] = data;
    } else {
      this[key] = data;
    }
    this.cleanup();
  },

  get(key) {
    if (!serviceConfig.enableCache) return null;
    const timestamp = this.timestamps[key];
    if (!timestamp || Date.now() - timestamp > serviceConfig.cacheTimeout) {
      this.delete(key);
      return null;
    }
    if (key.includes('.')) {
      const [section, subKey] = key.split('.');
      return this[section]?.[subKey] || null;
    }
    return this[key] || null;
  },

  delete(key) {
    delete this.timestamps[key];
    if (key.includes('.')) {
      const [section, subKey] = key.split('.');
      if (this[section]) {
        delete this[section][subKey];
      }
    } else {
      delete this[key];
    }
  },

  clear() {
    this.years = null;
    this.semesters = {};
    this.byYear = {};
    this.exportCache = {};
    this.timestamps = {};
    this.lastCleared = Date.now();
  },

  cleanup() {
    const now = Date.now();
    const expired = Object.entries(this.timestamps)
      .filter(([_, time]) => now - time > serviceConfig.cacheTimeout)
      .map(([key]) => key);
    expired.forEach((key) => this.delete(key));
  }
};

export function initDataService(config = {}) {
  serviceConfig = {
    ...serviceConfig,
    ...config
  };

  console.log('[DataService] Initialized with config:', serviceConfig);

  if (Object.prototype.hasOwnProperty.call(config, 'mode')) {
    cache.clear();
  }

  return Promise.resolve(serviceConfig);
}

export function getServiceConfig() {
  return { ...serviceConfig };
}

export function getCurrentContext() {
  return { ...currentContext };
}

export function getCurrentContextRef() {
  return currentContext;
}

export function replaceCurrentContext(nextContext) {
  currentContext = {
    year: nextContext?.year ?? null,
    semesterId: nextContext?.semesterId ?? null,
    semester: nextContext?.semester ?? null,
    academicYear: nextContext?.academicYear ?? null
  };
  return currentContext;
}

export function updateCurrentContext(partial = {}) {
  currentContext = {
    ...currentContext,
    ...partial
  };
  return currentContext;
}

export function resetContext() {
  currentContext = {
    year: null,
    semesterId: null,
    semester: null,
    academicYear: null
  };
  return currentContext;
}

export function getLastLoadedPeriods() {
  return lastLoadedPeriods;
}

export function getLastPeriodsContext() {
  return { ...lastPeriodsContext };
}

export function setLastLoadedPeriods(periods = [], context = null) {
  lastLoadedPeriods = Array.isArray(periods) ? periods : [];
  if (context) {
    lastPeriodsContext = {
      year: context.year ?? null,
      semesterId: context.semesterId ?? null
    };
  }
}

export function setLastPeriodsContext(context = {}) {
  lastPeriodsContext = {
    year: context.year ?? null,
    semesterId: context.semesterId ?? null
  };
  return lastPeriodsContext;
}

export function resetLastPeriods() {
  lastLoadedPeriods = [];
  lastPeriodsContext = { year: null, semesterId: null };
}
