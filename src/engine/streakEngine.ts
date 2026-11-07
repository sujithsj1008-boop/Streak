/**
 * StreakFlow Core Productivity, Streak, XP, Level, and Achievement Engine
 * Pure, deterministic functions with local timezone date handling.
 */

export const STORAGE_SCHEMA_VERSION = 2;

export const DEFAULT_CATEGORIES = [
  'Work',
  'Personal',
  'Projects',
  'College',
  'Health',
];

export const DEFAULT_SETTINGS = {
  theme: 'system', // 'light' | 'dark' | 'system'
  dailyGoalType: 'tasks', // 'tasks' | 'xp'
  dailyGoalTarget: 3,
  xpRewards: {
    HIGH: 30,
    MEDIUM: 20,
    LOW: 10,
    DAILY_GOAL_BONUS: 25,
  },
  weekStartsOn: 1, // 0 = Sunday, 1 = Monday
  earlyBirdCutoffHour: 9, // 09:00 local time
  priorityProTarget: 10, // number of high-priority tasks
  notificationsEnabled: false,
  reducedMotion: false,
};

export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: 'FIRST_STEP',
    name: 'First Step',
    description: 'Complete your first task.',
    icon: 'Sparkles',
    category: 'Milestones',
  },
  {
    id: 'GETTING_STARTED',
    name: 'Getting Started',
    description: 'Complete five tasks in total.',
    icon: 'Rocket',
    category: 'Milestones',
  },
  {
    id: 'CONSISTENT',
    name: 'Consistent',
    description: 'Achieve a three-day streak.',
    icon: 'Flame',
    category: 'Streaks',
  },
  {
    id: 'WEEK_WARRIOR',
    name: 'Week Warrior',
    description: 'Achieve a seven-day streak.',
    icon: 'Shield',
    category: 'Streaks',
  },
  {
    id: 'TASK_MASTER',
    name: 'Task Master',
    description: 'Complete 100 tasks.',
    icon: 'Crown',
    category: 'Milestones',
  },
  {
    id: 'PERFECT_WEEK',
    name: 'Perfect Week',
    description: 'Meet your daily goal for seven consecutive days.',
    icon: 'Award',
    category: 'Streaks',
  },
  {
    id: 'EARLY_BIRD',
    name: 'Early Bird',
    description: 'Complete a task before your configured morning cutoff.',
    icon: 'Sunrise',
    category: 'Habits',
  },
  {
    id: 'PRIORITY_PRO',
    name: 'Priority Pro',
    description: 'Complete your target number of high-priority tasks.',
    icon: 'Zap',
    category: 'Habits',
  },
];

/**
 * Formats a Date object or ISO string into a local YYYY-MM-DD key.
 */
export function toLocalDateKey(input = new Date()) {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses a YYYY-MM-DD local date key into a local Date at noon (avoids DST midnight shifts).
 */
export function parseLocalDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/**
 * Adds `days` to a YYYY-MM-DD date key and returns the resulting YYYY-MM-DD key.
 */
export function addDaysToKey(dateKey, days) {
  const dt = parseLocalDateKey(dateKey);
  dt.setDate(dt.getDate() + days);
  return toLocalDateKey(dt);
}

/**
 * Returns the difference in calendar days between two YYYY-MM-DD keys (a - b).
 */
export function diffDaysKeys(keyA, keyB) {
  const a = parseLocalDateKey(keyA);
  const b = parseLocalDateKey(keyB);
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Computes XP for a single task based on priority and settings.
 */
export function getTaskXpValue(priority, settings = DEFAULT_SETTINGS) {
  const rewards = settings?.xpRewards || DEFAULT_SETTINGS.xpRewards;
  if (priority === 'HIGH') return Number(rewards.HIGH ?? 30);
  if (priority === 'MEDIUM') return Number(rewards.MEDIUM ?? 20);
  return Number(rewards.LOW ?? 10);
}

/**
 * Deduplicates and merges active completed tasks + archived completion records
 * so that deleting a task preserves historical stats and editing/reloading never duplicates completions.
 */
export function buildUnifiedCompletionLedger(tasks = [], archivedCompletions = [], settings = DEFAULT_SETTINGS) {
  const byTaskId = new Map();

  // First load archived completions (from deleted tasks that were completed)
  for (const rec of archivedCompletions || []) {
    if (!rec || !rec.taskId || !rec.completedDateKey) continue;
    byTaskId.set(rec.taskId, {
      taskId: rec.taskId,
      title: rec.title || 'Completed Task',
      priority: rec.priority || 'MEDIUM',
      category: rec.category || 'Personal',
      completedAt: rec.completedAt || `${rec.completedDateKey}T12:00:00.000Z`,
      completedDateKey: rec.completedDateKey,
      xpEarned: typeof rec.xpEarned === 'number' ? rec.xpEarned : getTaskXpValue(rec.priority, settings),
      isArchived: true,
    });
  }

  // Live tasks override archived records for the same taskId
  for (const task of tasks || []) {
    if (!task || !task.id) continue;
    if (task.completed) {
      const dateKey = task.completedDateKey || (task.completedAt ? toLocalDateKey(task.completedAt) : toLocalDateKey());
      const xp = typeof task.xpAwarded === 'number' && task.xpAwarded > 0
        ? task.xpAwarded
        : getTaskXpValue(task.priority, settings);
      byTaskId.set(task.id, {
        taskId: task.id,
        title: task.title,
        priority: task.priority || 'MEDIUM',
        category: task.category || 'Personal',
        completedAt: task.completedAt || new Date().toISOString(),
        completedDateKey: dateKey,
        xpEarned: xp,
        isArchived: false,
      });
    } else {
      // If a task exists and is incomplete, ensure it's not counted in the ledger
      byTaskId.delete(task.id);
    }
  }

  return Array.from(byTaskId.values());
}

/**
 * Checks if a day's metrics meet the configured daily goal.
 */
export function doesDayQualify(dayStats, settings = DEFAULT_SETTINGS) {
  const goalType = settings?.dailyGoalType || 'tasks';
  const target = Math.max(1, Number(settings?.dailyGoalTarget || 3));
  if (goalType === 'xp') {
    return dayStats.taskXp >= target;
  }
  return dayStats.completedCount >= target;
}

/**
 * Aggregates completions by local date key (ignoring future dates for streak qualification).
 */
export function aggregateDailyStats(tasks = [], archivedCompletions = [], settings = DEFAULT_SETTINGS, todayKey = toLocalDateKey()) {
  const ledger = buildUnifiedCompletionLedger(tasks, archivedCompletions, settings);
  const dayMap = new Map();

  const ensureDay = (dateKey) => {
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        dateKey,
        completedCount: 0,
        taskXp: 0,
        bonusXp: 0,
        totalXp: 0,
        qualifies: false,
        completions: [],
      });
    }
    return dayMap.get(dateKey);
  };

  for (const item of ledger) {
    const dk = item.completedDateKey;
    if (!dk) continue;
    const day = ensureDay(dk);
    day.completedCount += 1;
    day.taskXp += item.xpEarned;
    day.completions.push(item);
  }

  // Ensure todayKey always exists in dayMap
  ensureDay(todayKey);

  const bonusAmount = Number(settings?.xpRewards?.DAILY_GOAL_BONUS ?? 25);

  for (const [dk, day] of dayMap.entries()) {
    // Future dates cannot count as productive/qualified days
    if (dk > todayKey) {
      day.qualifies = false;
      day.bonusXp = 0;
      day.totalXp = day.taskXp;
    } else {
      day.qualifies = doesDayQualify(day, settings);
      day.bonusXp = day.qualifies ? bonusAmount : 0;
      day.totalXp = day.taskXp + day.bonusXp;
    }
  }

  return { dayMap, ledger };
}

/**
 * Calculates current streak, longest streak, and total productive days from actual history.
 */
export function calculateStreaks(dayMap, todayKey = toLocalDateKey()) {
  const qualifyingKeys = Array.from(dayMap.values())
    .filter((d) => d.qualifies && d.dateKey <= todayKey)
    .map((d) => d.dateKey)
    .sort();

  const qualifyingSet = new Set(qualifyingKeys);
  const totalProductiveDays = qualifyingKeys.length;

  // Calculate Longest Streak across all historical qualifying dates <= todayKey
  let longestStreak = 0;
  let currentRun = 0;
  let prevKey = null;

  for (const key of qualifyingKeys) {
    if (prevKey === null) {
      currentRun = 1;
    } else {
      const diff = diffDaysKeys(key, prevKey);
      if (diff === 1) {
        currentRun += 1;
      } else if (diff > 1) {
        currentRun = 1;
      }
    }
    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }
    prevKey = key;
  }

  // Calculate Current Streak
  // Starts at todayKey if today qualifies, otherwise starts at yesterdayKey if yesterday qualifies
  let currentStreak = 0;
  const yesterdayKey = addDaysToKey(todayKey, -1);
  let cursor = null;

  if (qualifyingSet.has(todayKey)) {
    cursor = todayKey;
  } else if (qualifyingSet.has(yesterdayKey)) {
    cursor = yesterdayKey;
  }

  while (cursor && qualifyingSet.has(cursor)) {
    currentStreak += 1;
    cursor = addDaysToKey(cursor, -1);
  }

  const todayStats = dayMap.get(todayKey) || {
    dateKey: todayKey,
    completedCount: 0,
    taskXp: 0,
    bonusXp: 0,
    totalXp: 0,
    qualifies: false,
    completions: [],
  };

  return {
    currentStreak,
    longestStreak,
    totalProductiveDays,
    todayQualified: Boolean(todayStats.qualifies),
    qualifyingKeys,
  };
}

/**
 * Calculates level progression from total XP.
 * Level 1 requires 100 XP for Level 2; each subsequent level requires +50 more XP than the previous level.
 */
export function calculateLevelProgress(totalXpInput = 0) {
  const totalXp = Math.max(0, Math.floor(Number(totalXpInput) || 0));
  let level = 1;
  let xpRemaining = totalXp;
  let xpForNext = 100;

  while (xpRemaining >= xpForNext) {
    xpRemaining -= xpForNext;
    level += 1;
    xpForNext = 100 + (level - 1) * 50;
  }

  const progressPercent = Math.min(100, Math.round((xpRemaining / xpForNext) * 100));

  const titles = [
    'Focused Beginner',
    'Momentum Seeker',
    'Habit Architect',
    'Consistency Builder',
    'Flow Practitioner',
    'Streak Vanguard',
    'Productivity Artisan',
    'Deep Work Specialist',
    'Master of Rhythm',
    'Grandmaster of Flow',
  ];
  const levelTitle = titles[Math.min(titles.length - 1, level - 1)];

  return {
    level,
    levelTitle,
    totalXp,
    currentLevelXp: xpRemaining,
    nextLevelXpRequired: xpForNext,
    xpToNextLevel: xpForNext - xpRemaining,
    progressPercent,
  };
}

/**
 * Evaluates all achievements against actual completion ledger & streak stats.
 * Preserves existing unlock timestamps so achievements are never unlocked repeatedly.
 */
export function evaluateAchievements({
  ledger = [],
  streakStats,
  settings = DEFAULT_SETTINGS,
  existingUnlocks = {},
  nowIso = new Date().toISOString(),
}) {
  const totalCompleted = ledger.length;
  const highPriorityCompleted = ledger.filter((c) => c.priority === 'HIGH').length;
  const cutoffHour = Number(settings?.earlyBirdCutoffHour ?? 9);
  const priorityProTarget = Math.max(1, Number(settings?.priorityProTarget ?? 10));

  const hasEarlyBird = ledger.some((c) => {
    if (!c.completedAt) return false;
    const dt = new Date(c.completedAt);
    if (Number.isNaN(dt.getTime())) return false;
    return dt.getHours() < cutoffHour;
  });

  const maxConsecutive = Math.max(
    streakStats?.currentStreak || 0,
    streakStats?.longestStreak || 0
  );

  const conditions = {
    FIRST_STEP: totalCompleted >= 1,
    GETTING_STARTED: totalCompleted >= 5,
    CONSISTENT: maxConsecutive >= 3,
    WEEK_WARRIOR: maxConsecutive >= 7,
    TASK_MASTER: totalCompleted >= 100,
    PERFECT_WEEK: maxConsecutive >= 7,
    EARLY_BIRD: hasEarlyBird,
    PRIORITY_PRO: highPriorityCompleted >= priorityProTarget,
  };

  const progressMap = {
    FIRST_STEP: { current: Math.min(1, totalCompleted), target: 1 },
    GETTING_STARTED: { current: Math.min(5, totalCompleted), target: 5 },
    CONSISTENT: { current: Math.min(3, maxConsecutive), target: 3 },
    WEEK_WARRIOR: { current: Math.min(7, maxConsecutive), target: 7 },
    TASK_MASTER: { current: Math.min(100, totalCompleted), target: 100 },
    PERFECT_WEEK: { current: Math.min(7, maxConsecutive), target: 7 },
    EARLY_BIRD: { current: hasEarlyBird ? 1 : 0, target: 1 },
    PRIORITY_PRO: { current: Math.min(priorityProTarget, highPriorityCompleted), target: priorityProTarget },
  };

  const updatedUnlocks = { ...existingUnlocks };
  const newlyUnlocked = [];

  const achievements = ACHIEVEMENT_DEFINITIONS.map((def) => {
    const previouslyUnlockedAt = updatedUnlocks[def.id] || null;
    const conditionMet = Boolean(conditions[def.id]);
    let unlockedAt = previouslyUnlockedAt;

    if (conditionMet && !previouslyUnlockedAt) {
      unlockedAt = nowIso;
      updatedUnlocks[def.id] = unlockedAt;
      newlyUnlocked.push({ ...def, unlockedAt });
    }

    const prog = progressMap[def.id] || { current: 0, target: 1 };

    return {
      ...def,
      unlocked: Boolean(unlockedAt),
      unlockedAt,
      progressCurrent: prog.current,
      progressTarget: prog.target,
      progressPercent: Math.min(100, Math.round((prog.current / prog.target) * 100)),
    };
  });

  return {
    achievements,
    updatedUnlocks,
    newlyUnlocked,
  };
}

/**
 * Complete snapshot calculation from state.
 */
export function computeApplicationMetrics({
  tasks = [],
  archivedCompletions = [],
  settings = DEFAULT_SETTINGS,
  existingUnlocks = {},
  todayKey = toLocalDateKey(),
}) {
  const { dayMap, ledger } = aggregateDailyStats(tasks, archivedCompletions, settings, todayKey);
  const streakStats = calculateStreaks(dayMap, todayKey);

  // Total XP is sum of all non-future day totalXp + any future taskXp
  let totalXp = 0;
  for (const day of dayMap.values()) {
    totalXp += day.totalXp;
  }

  const levelProgress = calculateLevelProgress(totalXp);

  // Daily progress for today
  const todayStats = dayMap.get(todayKey);
  const scheduledTodayTasks = tasks.filter((t) => {
    if (t.dueDate === todayKey) return true;
    if (t.completed && (t.completedDateKey === todayKey || (t.completedAt && toLocalDateKey(t.completedAt) === todayKey))) {
      return true;
    }
    if (!t.dueDate && !t.completed) return true;
    return false;
  });

  const completedTodayCount = todayStats ? todayStats.completedCount : 0;
  const totalScheduledToday = Math.max(scheduledTodayTasks.length, completedTodayCount);

  const goalType = settings?.dailyGoalType || 'tasks';
  const goalTarget = Math.max(1, Number(settings?.dailyGoalTarget || 3));
  const goalCurrent = goalType === 'xp' ? (todayStats?.taskXp || 0) : completedTodayCount;
  const dailyGoalPercent = Math.min(100, Math.round((goalCurrent / goalTarget) * 100));

  const achievementEval = evaluateAchievements({
    ledger,
    streakStats,
    settings,
    existingUnlocks,
  });

  return {
    dayMap,
    ledger,
    streakStats,
    levelProgress,
    todayStats,
    dailyProgress: {
      completedTodayCount,
      totalScheduledToday,
      goalType,
      goalTarget,
      goalCurrent,
      dailyGoalPercent,
      goalReached: Boolean(todayStats?.qualifies),
      earnedXpToday: todayStats?.totalXp || 0,
      taskXpToday: todayStats?.taskXp || 0,
      bonusXpToday: todayStats?.bonusXp || 0,
    },
    achievements: achievementEval.achievements,
    updatedUnlocks: achievementEval.updatedUnlocks,
    newlyUnlocked: achievementEval.newlyUnlocked,
  };
}

/**
 * Validates and migrates imported or persisted state JSON.
 */
export function validateAndMigrateState(rawInput) {
  if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    return { valid: false, error: 'Root data must be a JSON object.' };
  }

  const tasksInput = Array.isArray(rawInput.tasks) ? rawInput.tasks : null;
  if (!tasksInput) {
    return { valid: false, error: 'Missing or invalid "tasks" array.' };
  }

  const seenIds = new Set();
  const sanitizedTasks = [];

  for (const t of tasksInput) {
    if (!t || typeof t !== 'object') {
      return { valid: false, error: 'Each task must be an object.' };
    }
    if (typeof t.id !== 'string' || !t.id.trim()) {
      return { valid: false, error: 'Every task must have a non-empty string "id".' };
    }
    if (typeof t.title !== 'string' || !t.title.trim()) {
      return { valid: false, error: `Task "${t.id}" is missing a valid title.` };
    }
    if (seenIds.has(t.id)) {
      // Prevent duplicate task IDs
      continue;
    }
    seenIds.add(t.id);

    const priority = ['HIGH', 'MEDIUM', 'LOW'].includes(t.priority) ? t.priority : 'MEDIUM';
    const completed = Boolean(t.completed);
    const createdAt = typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString();
    const completedAt = completed
      ? (typeof t.completedAt === 'string' ? t.completedAt : createdAt)
      : undefined;
    const completedDateKey = completed
      ? (typeof t.completedDateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.completedDateKey)
          ? t.completedDateKey
          : toLocalDateKey(completedAt))
      : undefined;

    sanitizedTasks.push({
      id: t.id.trim(),
      title: t.title.trim(),
      description: typeof t.description === 'string' ? t.description : '',
      priority,
      category: typeof t.category === 'string' && t.category.trim() ? t.category.trim() : 'Personal',
      createdAt,
      dueDate: typeof t.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) ? t.dueDate : undefined,
      dueTime: typeof t.dueTime === 'string' ? t.dueTime : undefined,
      completed,
      completedAt,
      completedDateKey,
      estimatedMinutes: typeof t.estimatedMinutes === 'number' && t.estimatedMinutes > 0 ? t.estimatedMinutes : undefined,
      tags: Array.isArray(t.tags) ? t.tags.filter((x) => typeof x === 'string') : [],
      xpAwarded: typeof t.xpAwarded === 'number' ? t.xpAwarded : undefined,
    });
  }

  const rawCategories = Array.isArray(rawInput.categories) ? rawInput.categories : DEFAULT_CATEGORIES;
  const categories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...rawCategories.filter((c) => typeof c === 'string' && c.trim()).map((c) => c.trim()),
    ])
  );

  const rawSettings = rawInput.settings && typeof rawInput.settings === 'object' ? rawInput.settings : {};
  const settings = {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
    theme: ['light', 'dark', 'system'].includes(rawSettings.theme) ? rawSettings.theme : DEFAULT_SETTINGS.theme,
    dailyGoalType: ['tasks', 'xp'].includes(rawSettings.dailyGoalType) ? rawSettings.dailyGoalType : DEFAULT_SETTINGS.dailyGoalType,
    dailyGoalTarget: Math.max(1, Number(rawSettings.dailyGoalTarget || DEFAULT_SETTINGS.dailyGoalTarget)),
    xpRewards: {
      ...DEFAULT_SETTINGS.xpRewards,
      ...(rawSettings.xpRewards || {}),
    },
  };

  const archivedCompletions = Array.isArray(rawInput.archivedCompletions)
    ? rawInput.archivedCompletions.filter((c) => c && typeof c.taskId === 'string' && typeof c.completedDateKey === 'string')
    : [];

  const unlockedAchievements = rawInput.unlockedAchievements && typeof rawInput.unlockedAchievements === 'object'
    ? { ...rawInput.unlockedAchievements }
    : {};

  return {
    valid: true,
    data: {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      tasks: sanitizedTasks,
      categories,
      settings,
      archivedCompletions,
      unlockedAchievements,
    },
  };
}

// ============================================================================
// SMART REMINDER, QUIET HOURS, DEDUPLICATION & CELEBRATION ENGINE
// ============================================================================

export const DEFAULT_REMINDER_PREFERENCES = {
  masterEnabled: true,
  frequency: 'twice', // 'off' | 'once' | 'twice' | 'thrice' | 'custom'
  morningTime: '08:30',
  afternoonTime: '14:00',
  eveningTime: '19:30',
  customTimes: ['11:00', '17:00'],
  categories: {
    pendingTasks: true,
    highPriority: true,
    upcomingDeadlines: true,
    dailyGoalProgress: true,
    streakProtection: true,
    achievementCelebrations: true,
  },
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:30',
  activeDays: [0, 1, 2, 3, 4, 5, 6], // Sun..Sat
  dailyLimit: 5,
  pausedUntil: null, // ISO timestamp or null
  browserNotifications: false,
  soundEffects: true,
};

/**
 * Converts "HH:mm" string to minutes since midnight (0..1439).
 */
export function timeStringToMinutes(timeStr = '00:00') {
  const [h, m] = String(timeStr).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return Math.max(0, Math.min(1439, h * 60 + m));
}

/**
 * Checks whether a given local time ("HH:mm" or Date) falls inside configured quiet hours.
 * Handles overnight ranges (e.g. 22:00 -> 07:30) and same-day ranges (e.g. 01:00 -> 06:00).
 */
export function isWithinQuietHours(timeOrDate, reminderPrefs = DEFAULT_REMINDER_PREFERENCES) {
  if (!reminderPrefs?.quietHoursEnabled) return false;
  let currentMins = 0;
  if (typeof timeOrDate === 'string' && /^\d{2}:\d{2}$/.test(timeOrDate)) {
    currentMins = timeStringToMinutes(timeOrDate);
  } else {
    const dt = timeOrDate instanceof Date ? timeOrDate : new Date(timeOrDate);
    currentMins = dt.getHours() * 60 + dt.getMinutes();
  }

  const startMins = timeStringToMinutes(reminderPrefs.quietHoursStart || '22:00');
  const endMins = timeStringToMinutes(reminderPrefs.quietHoursEnd || '07:30');

  if (startMins === endMins) return false;
  if (startMins < endMins) {
    return currentMins >= startMins && currentMins < endMins;
  }
  // Overnight wrap (e.g., 22:00 to 07:30)
  return currentMins >= startMins || currentMins < endMins;
}

/**
 * Determines the Mascot's emotional state from real application metrics & recent events.
 */
export function resolveMascotMood({
  recentEventMood = null,
  dailyProgress,
  streakStats,
  previousLongestStreak = 0,
}) {
  if (recentEventMood) return recentEventMood;
  if (dailyProgress?.goalReached) return 'DAILY_GOAL_REACHED';
  if ((dailyProgress?.completedTodayCount || 0) > 0) return 'TASK_COMPLETED';
  if ((streakStats?.currentStreak || 0) === 0 && (streakStats?.longestStreak || previousLongestStreak) > 0) {
    return 'MISSED_A_DAY';
  }
  return 'NO_TASKS_COMPLETED';
}

/**
 * Generates smart, context-aware reminders based on actual task data, streak state,
 * quiet hours, active days, daily limits, pause state, and deduplication keys.
 */
export function generateSmartReminders({
  tasks = [],
  dailyProgress,
  streakStats,
  reminderPrefs = DEFAULT_REMINDER_PREFERENCES,
  existingNotifications = [],
  now = new Date(),
  todayKey = toLocalDateKey(now),
  bypassScheduleGates = false,
}) {
  const prefs = {
    ...DEFAULT_REMINDER_PREFERENCES,
    ...(reminderPrefs || {}),
    categories: {
      ...DEFAULT_REMINDER_PREFERENCES.categories,
      ...(reminderPrefs?.categories || {}),
    },
  };

  if (!bypassScheduleGates) {
    if (!prefs.masterEnabled || prefs.frequency === 'off') {
      return { generated: [], blockedReason: 'disabled' };
    }
    if (prefs.pausedUntil && new Date(prefs.pausedUntil).getTime() > now.getTime()) {
      return { generated: [], blockedReason: 'paused' };
    }
    const dayOfWeek = now.getDay();
    if (Array.isArray(prefs.activeDays) && !prefs.activeDays.includes(dayOfWeek)) {
      return { generated: [], blockedReason: 'inactive_day' };
    }
    if (isWithinQuietHours(now, prefs)) {
      return { generated: [], blockedReason: 'quiet_hours' };
    }
  }

  const seenDedupeKeys = new Set((existingNotifications || []).map((n) => n.dedupeKey));
  const sentTodayCount = (existingNotifications || []).filter(
    (n) => n.dateKey === todayKey && n.source === 'smart-reminder'
  ).length;
  const maxDaily = Math.max(1, Number(prefs.dailyLimit || 5));

  if (!bypassScheduleGates && sentTodayCount >= maxDaily) {
    return { generated: [], blockedReason: 'daily_limit_reached' };
  }

  const candidates = [];
  const activeTasks = tasks.filter((t) => !t.completed);
  const highPriorityOpen = activeTasks.filter((t) => t.priority === 'HIGH');
  const dueTodayOrOverdue = activeTasks.filter((t) => t.dueDate && t.dueDate <= todayKey);
  const goalReached = Boolean(dailyProgress?.goalReached);
  const completedToday = Number(dailyProgress?.completedTodayCount || 0);
  const goalTarget = Math.max(1, Number(dailyProgress?.goalTarget || 3));
  const remainingForGoal = Math.max(0, goalTarget - (dailyProgress?.goalCurrent || 0));

  // 1. Goal Completed celebration reminder (only when goal IS reached)
  if (goalReached && prefs.categories.dailyGoalProgress) {
    candidates.push({
      id: `rem-goal-done-${todayKey}`,
      dedupeKey: `goal_completed:${todayKey}`,
      category: 'dailyGoalProgress',
      priority: 'normal',
      title: 'Daily goal complete!',
      message: `Daily goal complete! You earned your reward (${dailyProgress?.earnedXpToday || 0} XP today). Enjoy the progress you've made.`,
      actionLabel: 'View Progress',
      actionView: 'statistics',
      taskId: undefined,
      dateKey: todayKey,
      createdAt: now.toISOString(),
      read: false,
      source: 'smart-reminder',
    });
  }

  // 2. One step away / Daily Goal Progress reminder (never sent if goal already reached!)
  if (!goalReached && completedToday > 0 && remainingForGoal > 0 && prefs.categories.dailyGoalProgress) {
    const unitLabel = dailyProgress?.goalType === 'xp' ? `${remainingForGoal} more XP` : `${remainingForGoal} more task${remainingForGoal === 1 ? '' : 's'}`;
    candidates.push({
      id: `rem-progress-${todayKey}-${completedToday}`,
      dedupeKey: `daily_progress:${todayKey}:${completedToday}`,
      category: 'dailyGoalProgress',
      priority: 'normal',
      title: 'Almost at your daily goal!',
      message: `You're making progress! Complete ${unitLabel} to reach your daily goal.`,
      actionLabel: 'View Tasks',
      actionView: 'today',
      taskId: undefined,
      dateKey: todayKey,
      createdAt: now.toISOString(),
      read: false,
      source: 'smart-reminder',
    });
  }

  // 3. High-priority task waiting
  if (highPriorityOpen.length > 0 && prefs.categories.highPriority) {
    const firstHigh = highPriorityOpen[0];
    candidates.push({
      id: `rem-high-${todayKey}-${firstHigh.id}`,
      dedupeKey: `high_priority:${todayKey}:${firstHigh.id}`,
      category: 'highPriority',
      priority: 'important',
      title: 'High-Priority Focus',
      message:
        highPriorityOpen.length === 1
          ? `One high-priority task ("${firstHigh.title}") is still waiting. Give it a little attention today.`
          : `You have ${highPriorityOpen.length} high-priority tasks waiting, starting with "${firstHigh.title}".`,
      actionLabel: 'Open Task',
      actionView: 'today',
      taskId: firstHigh.id,
      dateKey: todayKey,
      createdAt: now.toISOString(),
      read: false,
      source: 'smart-reminder',
    });
  }

  // 4. Upcoming deadline / due today
  if (dueTodayOrOverdue.length > 0 && prefs.categories.upcomingDeadlines) {
    const urgentTask = dueTodayOrOverdue[0];
    candidates.push({
      id: `rem-deadline-${todayKey}-${urgentTask.id}`,
      dedupeKey: `deadline:${todayKey}:${urgentTask.id}`,
      category: 'upcomingDeadlines',
      priority: 'important',
      title: urgentTask.dueDate < todayKey ? 'Overdue Task Check-In' : 'Upcoming Deadline Today',
      message: `"${urgentTask.title}" is scheduled${urgentTask.dueTime ? ` for ${urgentTask.dueTime}` : ' for today'}. Review your plan before the deadline.`,
      actionLabel: 'Open Task',
      actionView: 'all-tasks',
      taskId: urgentTask.id,
      dateKey: todayKey,
      createdAt: now.toISOString(),
      read: false,
      source: 'smart-reminder',
    });
  }

  // 5. Streak protection / supportive nudge (only when goal not yet reached today)
  if (!goalReached && prefs.categories.streakProtection) {
    const activeStreak = Number(streakStats?.currentStreak || 0);
    candidates.push({
      id: `rem-streak-${todayKey}`,
      dedupeKey: `streak_support:${todayKey}`,
      category: 'streakProtection',
      priority: 'normal',
      title: activeStreak > 0 ? `Keep your ${activeStreak}-day streak glowing` : 'Start a fresh streak today',
      message:
        activeStreak > 0
          ? `Your ${activeStreak}-day streak is waiting for today's progress. Take a small step toward your goal.`
          : `Every streak begins with a single day. Complete your daily goal whenever you feel ready.`,
      actionLabel: 'View Calendar',
      actionView: 'calendar',
      taskId: undefined,
      dateKey: todayKey,
      createdAt: now.toISOString(),
      read: false,
      source: 'smart-reminder',
    });
  }

  // 6. Pending tasks general morning/day prompt
  if (activeTasks.length > 0 && prefs.categories.pendingTasks) {
    candidates.push({
      id: `rem-pending-${todayKey}`,
      dedupeKey: `pending_tasks:${todayKey}`,
      category: 'pendingTasks',
      priority: 'normal',
      title: 'Ready when you are',
      message: `You have ${activeTasks.length} task${activeTasks.length === 1 ? '' : 's'} waiting. Which one will you tackle first?`,
      actionLabel: 'View Tasks',
      actionView: 'today',
      taskId: activeTasks[0]?.id,
      dateKey: todayKey,
      createdAt: now.toISOString(),
      read: false,
      source: 'smart-reminder',
    });
  }

  const remainingAllowance = bypassScheduleGates ? candidates.length : Math.max(0, maxDaily - sentTodayCount);
  const generated = [];

  for (const item of candidates) {
    if (generated.length >= remainingAllowance) break;
    if (seenDedupeKeys.has(item.dedupeKey)) continue;
    seenDedupeKeys.add(item.dedupeKey);
    generated.push(item);
  }

  return { generated, blockedReason: null };
}

/**
 * Determines whether a Daily Goal or Streak Celebration should trigger,
 * ensuring celebrations only fire once per qualifying dateKey and never replay on reload.
 */
export function evaluateCelebrationTrigger({
  wasGoalReachedBefore = false,
  isGoalReachedAfter = false,
  previousStreak = 0,
  newStreak = 0,
  todayKey,
  celebratedGoalDates = {},
  celebratedStreakDates = {},
}) {
  let triggerDailyGoalCelebration = false;
  let triggerStreakCelebration = false;
  const nextCelebratedGoalDates = { ...celebratedGoalDates };
  const nextCelebratedStreakDates = { ...celebratedStreakDates };

  if (!wasGoalReachedBefore && isGoalReachedAfter) {
    if (!nextCelebratedGoalDates[todayKey]) {
      triggerDailyGoalCelebration = true;
      nextCelebratedGoalDates[todayKey] = new Date().toISOString();
    }
    if (newStreak > previousStreak && !nextCelebratedStreakDates[todayKey]) {
      triggerStreakCelebration = true;
      nextCelebratedStreakDates[todayKey] = newStreak;
    }
  }

  return {
    triggerDailyGoalCelebration,
    triggerStreakCelebration,
    nextCelebratedGoalDates,
    nextCelebratedStreakDates,
  };
}

// ============================================================================
// FIRST-RUN USERNAME ONBOARDING, ZERO-STATE INIT & SAFE DEMO MIGRATION
// ============================================================================

/**
 * Validates a username for local onboarding and profile updates.
 * Rules:
 * - Trims leading and trailing whitespace
 * - Rejects empty or whitespace-only strings
 * - Requires 2 to 24 characters
 * - Rejects control characters and disallowed symbols (allows letters, numbers, spaces, _, -)
 */
export function validateUsername(rawInput) {
  if (typeof rawInput !== 'string') {
    return { valid: false, trimmed: '', error: 'Please enter a username to continue.' };
  }
  if (/[\x00-\x1F\x7F]/.test(rawInput)) {
    return { valid: false, trimmed: '', error: 'Username cannot contain control characters.' };
  }
  const trimmed = rawInput.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return { valid: false, trimmed: '', error: 'Please enter a username to get started.' };
  }
  if (trimmed.length < 2) {
    return { valid: false, trimmed, error: 'Username must be at least 2 characters long.' };
  }
  if (trimmed.length > 24) {
    return { valid: false, trimmed, error: 'Username must be 24 characters or fewer.' };
  }
  if (!/^[A-Za-z0-9 _-]+$/.test(trimmed)) {
    return {
      valid: false,
      trimmed,
      error: 'Use only letters, numbers, spaces, hyphens (-), or underscores (_).',
    };
  }
  return { valid: true, trimmed, error: '' };
}

/**
 * Creates a 100% clean, zero-state application state for new users.
 * Zero tasks, zero completed tasks, zero XP, zero streak, zero notifications.
 */
export function createCleanInitialState(username = '') {
  const check = validateUsername(username);
  const onboarded = check.valid;
  return {
    schemaVersion: 3,
    hasCompletedOnboarding: onboarded,
    tasks: [],
    categories: [...DEFAULT_CATEGORIES],
    settings: {
      ...DEFAULT_SETTINGS,
      userName: onboarded ? check.trimmed : '',
      theme: 'dark',
    },
    archivedCompletions: [],
    unlockedAchievements: {},
    xpActivity: [],
    notifications: [],
    celebratedGoalDates: {},
    celebratedStreakDates: {},
  };
}

/**
 * Safely migrates stored application state, stripping legacy hardcoded demo seed records
 * (IDs starting with "seed-") while preserving all legitimate user-created tasks and progress.
 */
export function migrateAndCleanDemoData(rawState) {
  const baseValidation = validateAndMigrateState(rawState);
  if (!baseValidation.valid) {
    return baseValidation;
  }

  const data = baseValidation.data;
  const userCreatedTasks = (data.tasks || []).filter((t) => !String(t.id).startsWith('seed-'));
  const hadSeedTasks = (data.tasks || []).some((t) => String(t.id).startsWith('seed-'));
  const userArchived = (data.archivedCompletions || []).filter(
    (a) => !String(a.taskId).startsWith('seed-')
  );

  // If the previous state only contained demo seed tasks and the default 'Alex' seed name,
  // reset unlockedAchievements/xpActivity/notifications that came from seed data
  const hasLegitimateCompletions =
    userCreatedTasks.some((t) => t.completed) || userArchived.length > 0;

  const rawObj = rawState && typeof rawState === 'object' ? rawState : {};
  const explicitOnboarded = Boolean(rawObj.hasCompletedOnboarding);
  const rawUserName =
    rawObj.settings && typeof rawObj.settings === 'object' ? rawObj.settings.userName : '';
  const nameValidation = validateUsername(rawUserName);

  // If it was purely a seeded v2 state without explicit onboarding and no user tasks, require onboarding
  const isPureDemoState = hadSeedTasks && userCreatedTasks.length === 0 && !explicitOnboarded;

  const hasCompletedOnboarding = isPureDemoState
    ? false
    : explicitOnboarded || (nameValidation.valid && userCreatedTasks.length > 0);

  return {
    valid: true,
    data: {
      ...data,
      schemaVersion: 3,
      hasCompletedOnboarding,
      tasks: userCreatedTasks,
      archivedCompletions: userArchived,
      unlockedAchievements: hasLegitimateCompletions ? data.unlockedAchievements : {},
      xpActivity: hasLegitimateCompletions
        ? (rawObj.xpActivity || []).filter((a) => !String(a.id).startsWith('act-'))
        : [],
      notifications: hasLegitimateCompletions
        ? (rawObj.notifications || []).filter((n) => !String(n.dedupeKey).includes('seed-'))
        : [],
      settings: {
        ...data.settings,
        userName: hasCompletedOnboarding && nameValidation.valid ? nameValidation.trimmed : '',
      },
    },
  };
}
