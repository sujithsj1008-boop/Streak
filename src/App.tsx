import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  Plus,
  Search,
  Flame,
  Trophy,
  Calendar as CalendarIcon,
  BarChart3,
  Settings as SettingsIcon,
  LayoutDashboard,
  ListTodo,
  Sun,
  Moon,
  Monitor,
  Trash2,
  Edit3,
  Clock,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Rocket,
  Shield,
  Crown,
  Award,
  Sunrise,
  Zap,
  Download,
  Upload,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  Filter,
  Bell,
  BellRing,
  BellOff,
  Smartphone,
  Wifi,
  WifiOff,
  Star,
  Target,
  CheckSquare,
  ArrowRight,
  Info,
  Copy,
  Layers,
  Volume2,
  VolumeX,
  PauseCircle,
  PlayCircle,
  CheckCheck,
  User,
  Database,
  Sliders,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ThemeMode = 'light' | 'dark' | 'system';
export type DailyGoalType = 'tasks' | 'xp';

export type PrimarySection = 'home' | 'tasks' | 'progress' | 'settings';
export type TasksSubView = 'today' | 'all' | 'board' | 'completed';
export type ProgressSubView = 'overview' | 'calendar' | 'achievements' | 'statistics';
export type SettingsCategoryKey =
  | 'profile'
  | 'goals'
  | 'tasks'
  | 'reminders'
  | 'streaks'
  | 'data'
  | 'about';

export type SortOption = 'SMART' | 'PRIORITY' | 'DUE_DATE' | 'CREATED_DATE';
export type ReminderFrequency = 'off' | 'once' | 'twice' | 'thrice' | 'custom';

export type MascotMood =
  | 'IDLE'
  | 'TASK_COMPLETED'
  | 'DAILY_GOAL_REACHED'
  | 'STREAK_INCREASED'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'NO_TASKS_COMPLETED'
  | 'MISSED_A_DAY';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  category: string;
  createdAt: string;
  dueDate?: string; // YYYY-MM-DD local
  dueTime?: string; // HH:mm
  completed: boolean;
  completedAt?: string; // ISO
  completedDateKey?: string; // YYYY-MM-DD local
  estimatedMinutes?: number;
  tags: string[];
  xpAwarded?: number;
}

export interface ArchivedCompletion {
  taskId: string;
  title: string;
  priority: Priority;
  category: string;
  completedAt: string;
  completedDateKey: string;
  xpEarned: number;
  isArchived?: boolean;
}

export interface XpRewardsConfig {
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  DAILY_GOAL_BONUS: number;
}

export interface ReminderCategoriesConfig {
  pendingTasks: boolean;
  highPriority: boolean;
  upcomingDeadlines: boolean;
  dailyGoalProgress: boolean;
  streakProtection: boolean;
  achievementCelebrations: boolean;
}

export interface ReminderPreferences {
  masterEnabled: boolean;
  frequency: ReminderFrequency;
  morningTime: string;
  afternoonTime: string;
  eveningTime: string;
  customTimes: string[];
  categories: ReminderCategoriesConfig;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  activeDays: number[]; // 0 = Sun .. 6 = Sat
  dailyLimit: number;
  pausedUntil: string | null;
  browserNotifications: boolean;
  soundEffects: boolean;
}

export interface SmartNotificationItem {
  id: string;
  dedupeKey: string;
  category: keyof ReminderCategoriesConfig;
  priority: 'important' | 'normal';
  title: string;
  message: string;
  actionLabel: string;
  actionSection: PrimarySection;
  actionTasksSub?: TasksSubView;
  actionProgressSub?: ProgressSubView;
  taskId?: string;
  dateKey: string;
  createdAt: string;
  read: boolean;
  source: 'smart-reminder' | 'event' | 'test';
}

export interface UserSettings {
  userName: string;
  theme: ThemeMode;
  dailyGoalType: DailyGoalType;
  dailyGoalTarget: number;
  xpRewards: XpRewardsConfig;
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  earlyBirdCutoffHour: number;
  priorityProTarget: number;
  defaultSortBy: SortOption;
  notificationsEnabled: boolean;
  reducedMotion: boolean;
  reminders: ReminderPreferences;
}

export interface XpActivityItem {
  id: string;
  label: string;
  xpDelta: number;
  timestamp: string;
  dateKey: string;
  kind: 'complete' | 'uncomplete' | 'bonus' | 'system';
}

export interface PersistedAppState {
  schemaVersion: number;
  hasCompletedOnboarding: boolean;
  tasks: Task[];
  categories: string[];
  settings: UserSettings;
  archivedCompletions: ArchivedCompletion[];
  unlockedAchievements: Record<string, string>;
  xpActivity: XpActivityItem[];
  notifications: SmartNotificationItem[];
  celebratedGoalDates: Record<string, string>;
  celebratedStreakDates: Record<string, number>;
}

export interface DayAggregate {
  dateKey: string;
  completedCount: number;
  taskXp: number;
  bonusXp: number;
  totalXp: number;
  qualifies: boolean;
  completions: ArchivedCompletion[];
}

export interface AchievementStatus {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progressCurrent: number;
  progressTarget: number;
  progressPercent: number;
}

export interface ToastNotice {
  id: string;
  title: string;
  subtitle?: string;
  variant: 'success' | 'xp' | 'achievement' | 'warning' | 'info';
}

export interface CelebrationModalState {
  open: boolean;
  kind: 'STREAK_AND_GOAL' | 'DAILY_GOAL_ONLY';
  streakDays: number;
  streakIncreased: boolean;
  completedToday: number;
  goalTarget: number;
  bonusXp: number;
  totalXpToday: number;
}

// ============================================================================
// 2. CONSTANTS & DEFAULTS
// ============================================================================

const STORAGE_KEY_V3 = 'streakflow_pwa_state_v3';
const LEGACY_STORAGE_KEY_V2 = 'streakflow_pwa_state_v2';
const STORAGE_SCHEMA_VERSION = 3;

const DEFAULT_CATEGORIES: string[] = [
  'Work',
  'Personal',
  'Projects',
  'College',
  'Health',
];

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  masterEnabled: true,
  frequency: 'twice',
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
  activeDays: [0, 1, 2, 3, 4, 5, 6],
  dailyLimit: 5,
  pausedUntil: null,
  browserNotifications: false,
  soundEffects: true,
};

const DEFAULT_SETTINGS: UserSettings = {
  userName: '',
  theme: 'dark',
  dailyGoalType: 'tasks',
  dailyGoalTarget: 3,
  xpRewards: {
    HIGH: 30,
    MEDIUM: 20,
    LOW: 10,
    DAILY_GOAL_BONUS: 25,
  },
  weekStartsOn: 1,
  earlyBirdCutoffHour: 9,
  priorityProTarget: 10,
  defaultSortBy: 'SMART',
  notificationsEnabled: false,
  reducedMotion: false,
  reminders: DEFAULT_REMINDER_PREFERENCES,
};

const ACHIEVEMENT_DEFINITIONS = [
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

// ============================================================================
// 3. USERNAME VALIDATION, DATE, STREAK & REMINDER ENGINE UTILITIES
// ============================================================================

export function validateUsername(rawInput: unknown): {
  valid: boolean;
  trimmed: string;
  error: string;
} {
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

export function toLocalDateKey(input: Date | string = new Date()): string {
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

export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDaysToKey(dateKey: string, days: number): string {
  const dt = parseLocalDateKey(dateKey);
  dt.setDate(dt.getDate() + days);
  return toLocalDateKey(dt);
}

export function diffDaysKeys(keyA: string, keyB: string): number {
  const a = parseLocalDateKey(keyA);
  const b = parseLocalDateKey(keyB);
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatReadableDate(dateKey: string): string {
  const dt = parseLocalDateKey(dateKey);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatFullDate(dateKey: string): string {
  const dt = parseLocalDateKey(dateKey);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function timeStringToMinutes(timeStr = '00:00'): number {
  const [h, m] = String(timeStr).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return Math.max(0, Math.min(1439, h * 60 + m));
}

export function isWithinQuietHours(
  timeOrDate: Date | string,
  reminderPrefs: ReminderPreferences = DEFAULT_REMINDER_PREFERENCES
): boolean {
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
  return currentMins >= startMins || currentMins < endMins;
}

export function playSynthesizedChime(
  kind: 'task' | 'goal' | 'achievement',
  enabled: boolean
): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes =
      kind === 'goal'
        ? [523.25, 659.25, 783.99, 1046.5]
        : kind === 'achievement'
        ? [587.33, 739.99, 880, 1174.66]
        : [523.25, 659.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.25);
    });
  } catch {
    // Audio optional if blocked before gesture
  }
}

export function getTaskXpValue(priority: Priority, settings: UserSettings = DEFAULT_SETTINGS): number {
  const rewards = settings?.xpRewards || DEFAULT_SETTINGS.xpRewards;
  if (priority === 'HIGH') return Math.max(1, Number(rewards.HIGH ?? 30));
  if (priority === 'MEDIUM') return Math.max(1, Number(rewards.MEDIUM ?? 20));
  return Math.max(1, Number(rewards.LOW ?? 10));
}

export function buildUnifiedCompletionLedger(
  tasks: Task[],
  archivedCompletions: ArchivedCompletion[],
  settings: UserSettings
): ArchivedCompletion[] {
  const byTaskId = new Map<string, ArchivedCompletion>();

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

  for (const task of tasks || []) {
    if (!task || !task.id) continue;
    if (task.completed) {
      const dateKey =
        task.completedDateKey ||
        (task.completedAt ? toLocalDateKey(task.completedAt) : toLocalDateKey());
      const xp =
        typeof task.xpAwarded === 'number' && task.xpAwarded > 0
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
      byTaskId.delete(task.id);
    }
  }

  return Array.from(byTaskId.values());
}

export function doesDayQualify(
  dayStats: { completedCount: number; taskXp: number },
  settings: UserSettings
): boolean {
  const goalType = settings?.dailyGoalType || 'tasks';
  const target = Math.max(1, Number(settings?.dailyGoalTarget || 3));
  if (goalType === 'xp') {
    return dayStats.taskXp >= target;
  }
  return dayStats.completedCount >= target;
}

export function aggregateDailyStats(
  tasks: Task[],
  archivedCompletions: ArchivedCompletion[],
  settings: UserSettings,
  todayKey: string
) {
  const ledger = buildUnifiedCompletionLedger(tasks, archivedCompletions, settings);
  const dayMap = new Map<string, DayAggregate>();

  const ensureDay = (dateKey: string): DayAggregate => {
    const existing = dayMap.get(dateKey);
    if (existing) return existing;
    const created: DayAggregate = {
      dateKey,
      completedCount: 0,
      taskXp: 0,
      bonusXp: 0,
      totalXp: 0,
      qualifies: false,
      completions: [],
    };
    dayMap.set(dateKey, created);
    return created;
  };

  for (const item of ledger) {
    if (!item.completedDateKey) continue;
    const day = ensureDay(item.completedDateKey);
    day.completedCount += 1;
    day.taskXp += item.xpEarned;
    day.completions.push(item);
  }

  ensureDay(todayKey);

  const bonusAmount = Math.max(0, Number(settings?.xpRewards?.DAILY_GOAL_BONUS ?? 25));

  for (const [dk, day] of dayMap.entries()) {
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

export function calculateStreaks(dayMap: Map<string, DayAggregate>, todayKey: string) {
  const qualifyingKeys = Array.from(dayMap.values())
    .filter((d) => d.qualifies && d.dateKey <= todayKey)
    .map((d) => d.dateKey)
    .sort();

  const qualifyingSet = new Set(qualifyingKeys);
  const totalProductiveDays = qualifyingKeys.length;

  let longestStreak = 0;
  let currentRun = 0;
  let prevKey: string | null = null;

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

  let currentStreak = 0;
  const yesterdayKey = addDaysToKey(todayKey, -1);
  let cursor: string | null = null;

  if (qualifyingSet.has(todayKey)) {
    cursor = todayKey;
  } else if (qualifyingSet.has(yesterdayKey)) {
    cursor = yesterdayKey;
  }

  while (cursor && qualifyingSet.has(cursor)) {
    currentStreak += 1;
    cursor = addDaysToKey(cursor, -1);
  }

  const todayStats = dayMap.get(todayKey);

  return {
    currentStreak,
    longestStreak,
    totalProductiveDays,
    todayQualified: Boolean(todayStats?.qualifies),
    yesterdayQualified: qualifyingSet.has(yesterdayKey),
    qualifyingKeys,
  };
}

export function calculateLevelProgress(totalXpInput: number) {
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

export function evaluateAchievements(params: {
  ledger: ArchivedCompletion[];
  streakStats: { currentStreak: number; longestStreak: number };
  settings: UserSettings;
  existingUnlocks: Record<string, string>;
}) {
  const { ledger, streakStats, settings, existingUnlocks } = params;
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

  const maxConsecutive = Math.max(streakStats.currentStreak || 0, streakStats.longestStreak || 0);

  const conditions: Record<string, boolean> = {
    FIRST_STEP: totalCompleted >= 1,
    GETTING_STARTED: totalCompleted >= 5,
    CONSISTENT: maxConsecutive >= 3,
    WEEK_WARRIOR: maxConsecutive >= 7,
    TASK_MASTER: totalCompleted >= 100,
    PERFECT_WEEK: maxConsecutive >= 7,
    EARLY_BIRD: hasEarlyBird,
    PRIORITY_PRO: highPriorityCompleted >= priorityProTarget,
  };

  const progressMap: Record<string, { current: number; target: number }> = {
    FIRST_STEP: { current: Math.min(1, totalCompleted), target: 1 },
    GETTING_STARTED: { current: Math.min(5, totalCompleted), target: 5 },
    CONSISTENT: { current: Math.min(3, maxConsecutive), target: 3 },
    WEEK_WARRIOR: { current: Math.min(7, maxConsecutive), target: 7 },
    TASK_MASTER: { current: Math.min(100, totalCompleted), target: 100 },
    PERFECT_WEEK: { current: Math.min(7, maxConsecutive), target: 7 },
    EARLY_BIRD: { current: hasEarlyBird ? 1 : 0, target: 1 },
    PRIORITY_PRO: {
      current: Math.min(priorityProTarget, highPriorityCompleted),
      target: priorityProTarget,
    },
  };

  const updatedUnlocks: Record<string, string> = { ...existingUnlocks };
  const newlyUnlocked: AchievementStatus[] = [];
  const nowIso = new Date().toISOString();

  const achievements: AchievementStatus[] = ACHIEVEMENT_DEFINITIONS.map((def) => {
    const previouslyUnlockedAt = updatedUnlocks[def.id] || null;
    const conditionMet = Boolean(conditions[def.id]);
    let unlockedAt = previouslyUnlockedAt;

    if (conditionMet && !previouslyUnlockedAt) {
      unlockedAt = nowIso;
      updatedUnlocks[def.id] = unlockedAt;
    }

    const prog = progressMap[def.id] || { current: 0, target: 1 };
    const statusObj: AchievementStatus = {
      ...def,
      unlocked: Boolean(unlockedAt),
      unlockedAt,
      progressCurrent: prog.current,
      progressTarget: prog.target,
      progressPercent: Math.min(100, Math.round((prog.current / prog.target) * 100)),
    };

    if (conditionMet && !previouslyUnlockedAt) {
      newlyUnlocked.push(statusObj);
    }

    return statusObj;
  });

  return {
    achievements,
    updatedUnlocks,
    newlyUnlocked,
  };
}

export function generateSmartReminders(params: {
  tasks: Task[];
  dailyProgress: {
    goalReached: boolean;
    completedTodayCount: number;
    goalTarget: number;
    goalCurrent: number;
    goalType: DailyGoalType;
    earnedXpToday: number;
  };
  streakStats: { currentStreak: number; longestStreak: number };
  reminderPrefs: ReminderPreferences;
  existingNotifications: SmartNotificationItem[];
  now?: Date;
  todayKey: string;
  bypassScheduleGates?: boolean;
}): { generated: SmartNotificationItem[]; blockedReason: string | null } {
  const {
    tasks,
    dailyProgress,
    streakStats,
    reminderPrefs,
    existingNotifications,
    now = new Date(),
    todayKey,
    bypassScheduleGates = false,
  } = params;

  // Never auto-generate unsolicited notifications on a brand-new empty zero-state workspace
  if (
    !bypassScheduleGates &&
    tasks.length === 0 &&
    dailyProgress.completedTodayCount === 0 &&
    streakStats.currentStreak === 0
  ) {
    return { generated: [], blockedReason: 'empty_workspace' };
  }

  const prefs: ReminderPreferences = {
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

  const candidates: SmartNotificationItem[] = [];
  const activeTasks = tasks.filter((t) => !t.completed);
  const highPriorityOpen = activeTasks.filter((t) => t.priority === 'HIGH');
  const dueTodayOrOverdue = activeTasks.filter((t) => t.dueDate && t.dueDate <= todayKey);
  const goalReached = Boolean(dailyProgress.goalReached);
  const completedToday = Number(dailyProgress.completedTodayCount || 0);
  const goalTarget = Math.max(1, Number(dailyProgress.goalTarget || 3));
  const remainingForGoal = Math.max(0, goalTarget - (dailyProgress.goalCurrent || 0));

  if (goalReached && prefs.categories.dailyGoalProgress) {
    candidates.push({
      id: `rem-goal-done-${todayKey}`,
      dedupeKey: `goal_completed:${todayKey}`,
      category: 'dailyGoalProgress',
      priority: 'normal',
      title: 'Daily goal complete!',
      message: `Your daily goal is complete (+${dailyProgress.earnedXpToday} XP today). Great work!`,
      actionLabel: 'View Progress',
      actionSection: 'progress',
      actionProgressSub: 'overview',
      dateKey: todayKey,
      createdAt: now.toISOString(),
      read: false,
      source: 'smart-reminder',
    });
  }

  if (
    !goalReached &&
    completedToday > 0 &&
    remainingForGoal > 0 &&
    prefs.categories.dailyGoalProgress
  ) {
    const unitLabel =
      dailyProgress.goalType === 'xp'
        ? `${remainingForGoal} more XP`
        : `${remainingForGoal} more task${remainingForGoal === 1 ? '' : 's'}`;
    candidates.push({
      id: `rem-progress-${todayKey}-${completedToday}`,
      dedupeKey: `daily_progress:${todayKey}:${completedToday}`,
      category: 'dailyGoalProgress',
      priority: 'normal',
      title: 'One step away from your goal',
      message: `You're making progress! Complete ${unitLabel} to reach your daily goal.`,
      actionLabel: 'View Tasks',
      actionSection: 'tasks',
      actionTasksSub: 'today',
      dateKey: todayKey,
      createdAt: now.toISOString(),
      read: false,
      source: 'smart-reminder',
    });
  }

  if (highPriorityOpen.length > 0 && prefs.categories.highPriority) {
    const firstHigh = highPriorityOpen[0];
    candidates.push({
      id: `rem-high-${todayKey}-${firstHigh.id}`,
      dedupeKey: `high_priority:${todayKey}:${firstHigh.id}`,
      category: 'highPriority',
      priority: 'important',
      title: 'High-priority focus waiting',
      message:
        highPriorityOpen.length === 1
          ? `One high-priority task ("${firstHigh.title}") is still waiting. Give it a little attention today.`
          : `You have ${highPriorityOpen.length} high-priority tasks waiting, starting with "${firstHigh.title}".`,
      actionLabel: 'Open Task',
      actionSection: 'tasks',
      actionTasksSub: 'today',
      taskId: firstHigh.id,
      dateKey: todayKey,
      createdAt: now.toISOString(),
      read: false,
      source: 'smart-reminder',
    });
  }

  if (dueTodayOrOverdue.length > 0 && prefs.categories.upcomingDeadlines) {
    const urgentTask = dueTodayOrOverdue[0];
    candidates.push({
      id: `rem-deadline-${todayKey}-${urgentTask.id}`,
      dedupeKey: `deadline:${todayKey}:${urgentTask.id}`,
      category: 'upcomingDeadlines',
      priority: 'important',
      title:
        urgentTask.dueDate && urgentTask.dueDate < todayKey
          ? 'Overdue task check-in'
          : 'A task deadline is approaching',
      message: `"${urgentTask.title}" is scheduled${
        urgentTask.dueTime ? ` for ${urgentTask.dueTime}` : ' for today'
      }. Review your plan before the deadline.`,
      actionLabel: 'Open Task',
      actionSection: 'tasks',
      actionTasksSub: 'all',
      taskId: urgentTask.id,
      dateKey: todayKey,
      createdAt: now.toISOString(),
      read: false,
      source: 'smart-reminder',
    });
  }

  if (!goalReached && prefs.categories.streakProtection && (streakStats.currentStreak > 0 || bypassScheduleGates)) {
    const activeStreak = Number(streakStats.currentStreak || 0);
    candidates.push({
      id: `rem-streak-${todayKey}`,
      dedupeKey: `streak_support:${todayKey}`,
      category: 'streakProtection',
      priority: 'normal',
      title:
        activeStreak > 0
          ? `Your ${activeStreak}-day streak is waiting`
          : 'Ready for a fresh streak',
      message:
        activeStreak > 0
          ? `Your streak is waiting for today's progress. Take a small step toward your goal.`
          : `Create and complete tasks today to reach your daily goal and ignite Day 1.`,
      actionLabel: 'View Tasks',
      actionSection: 'tasks',
      actionTasksSub: 'today',
      dateKey: todayKey,
      createdAt: now.toISOString(),
      read: false,
      source: 'smart-reminder',
    });
  }

  if (activeTasks.length > 0 && prefs.categories.pendingTasks) {
    candidates.push({
      id: `rem-pending-${todayKey}`,
      dedupeKey: `pending_tasks:${todayKey}`,
      category: 'pendingTasks',
      priority: 'normal',
      title: `${activeTasks.length} task${activeTasks.length === 1 ? '' : 's'} waiting`,
      message: `You have ${activeTasks.length} task${
        activeTasks.length === 1 ? '' : 's'
      } waiting. Which one will you tackle first?`,
      actionLabel: 'View Tasks',
      actionSection: 'tasks',
      actionTasksSub: 'today',
      taskId: activeTasks[0]?.id,
      dateKey: todayKey,
      createdAt: now.toISOString(),
      read: false,
      source: 'smart-reminder',
    });
  }

  const remainingAllowance = bypassScheduleGates
    ? Math.max(1, candidates.length)
    : Math.max(0, maxDaily - sentTodayCount);
  const generated: SmartNotificationItem[] = [];

  for (const item of candidates) {
    if (generated.length >= remainingAllowance) break;
    if (seenDedupeKeys.has(item.dedupeKey)) continue;
    seenDedupeKeys.add(item.dedupeKey);
    generated.push(item);
  }

  return { generated, blockedReason: null };
}

// ============================================================================
// 4. ZERO-STATE INITIALIZATION & SAFE MIGRATION (No Demo Seed Tasks)
// ============================================================================

export function createCleanInitialState(username = ''): PersistedAppState {
  const check = validateUsername(username);
  const onboarded = check.valid;
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
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

export function validateAndMigrateState(
  rawInput: unknown
): { valid: true; data: PersistedAppState } | { valid: false; error: string } {
  if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    return { valid: false, error: 'Root backup data must be a JSON object.' };
  }

  const obj = rawInput as Record<string, unknown>;
  if (!Array.isArray(obj.tasks)) {
    return { valid: false, error: 'Backup JSON must contain a valid "tasks" array.' };
  }

  const seenIds = new Set<string>();
  const sanitizedTasks: Task[] = [];
  let hadSeedTasks = false;

  for (const item of obj.tasks) {
    if (!item || typeof item !== 'object') {
      return { valid: false, error: 'Every item in "tasks" must be an object.' };
    }
    const t = item as Record<string, unknown>;
    if (typeof t.id !== 'string' || !t.id.trim()) {
      return { valid: false, error: 'Every task must have a non-empty string "id".' };
    }
    const trimmedId = t.id.trim();
    if (trimmedId.startsWith('seed-')) {
      hadSeedTasks = true;
      continue; // Safely strip legacy demo seed tasks
    }
    if (typeof t.title !== 'string' || !t.title.trim()) {
      return { valid: false, error: `Task "${trimmedId}" is missing a non-empty "title".` };
    }
    if (seenIds.has(trimmedId)) {
      continue;
    }
    seenIds.add(trimmedId);

    const priority: Priority =
      t.priority === 'HIGH' || t.priority === 'MEDIUM' || t.priority === 'LOW'
        ? t.priority
        : 'MEDIUM';
    const completed = Boolean(t.completed);
    const createdAt =
      typeof t.createdAt === 'string' && t.createdAt ? t.createdAt : new Date().toISOString();
    const completedAt = completed
      ? typeof t.completedAt === 'string' && t.completedAt
        ? t.completedAt
        : createdAt
      : undefined;
    const completedDateKey = completed
      ? typeof t.completedDateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.completedDateKey)
        ? t.completedDateKey
        : toLocalDateKey(completedAt)
      : undefined;

    sanitizedTasks.push({
      id: trimmedId,
      title: t.title.trim(),
      description: typeof t.description === 'string' ? t.description : '',
      priority,
      category:
        typeof t.category === 'string' && t.category.trim() ? t.category.trim() : 'Personal',
      createdAt,
      dueDate:
        typeof t.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)
          ? t.dueDate
          : undefined,
      dueTime: typeof t.dueTime === 'string' && t.dueTime ? t.dueTime : undefined,
      completed,
      completedAt,
      completedDateKey,
      estimatedMinutes:
        typeof t.estimatedMinutes === 'number' && t.estimatedMinutes > 0
          ? Math.round(t.estimatedMinutes)
          : undefined,
      tags: Array.isArray(t.tags)
        ? t.tags.filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
        : [],
      xpAwarded: typeof t.xpAwarded === 'number' ? t.xpAwarded : undefined,
    });
  }

  const rawCategories = Array.isArray(obj.categories) ? obj.categories : DEFAULT_CATEGORIES;
  const categories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...rawCategories
        .filter((c): c is string => typeof c === 'string' && Boolean(c.trim()))
        .map((c) => c.trim()),
    ])
  );

  const rawSettings =
    obj.settings && typeof obj.settings === 'object'
      ? (obj.settings as Record<string, unknown>)
      : {};
  const rawRewards =
    rawSettings.xpRewards && typeof rawSettings.xpRewards === 'object'
      ? (rawSettings.xpRewards as Record<string, unknown>)
      : {};
  const rawReminders =
    rawSettings.reminders && typeof rawSettings.reminders === 'object'
      ? (rawSettings.reminders as Partial<ReminderPreferences>)
      : {};

  const reminders: ReminderPreferences = {
    ...DEFAULT_REMINDER_PREFERENCES,
    ...rawReminders,
    categories: {
      ...DEFAULT_REMINDER_PREFERENCES.categories,
      ...(rawReminders.categories || {}),
    },
    activeDays: Array.isArray(rawReminders.activeDays)
      ? rawReminders.activeDays
      : DEFAULT_REMINDER_PREFERENCES.activeDays,
    customTimes: Array.isArray(rawReminders.customTimes)
      ? rawReminders.customTimes
      : DEFAULT_REMINDER_PREFERENCES.customTimes,
  };

  const archivedCompletions: ArchivedCompletion[] = Array.isArray(obj.archivedCompletions)
    ? obj.archivedCompletions
        .filter(
          (c): c is ArchivedCompletion =>
            Boolean(
              c &&
                typeof c === 'object' &&
                typeof (c as ArchivedCompletion).taskId === 'string' &&
                !(c as ArchivedCompletion).taskId.startsWith('seed-')
            )
        )
        .map((c) => ({
          taskId: c.taskId,
          title: c.title || 'Archived Task',
          priority: c.priority || 'MEDIUM',
          category: c.category || 'Personal',
          completedAt: c.completedAt || new Date().toISOString(),
          completedDateKey: c.completedDateKey || toLocalDateKey(),
          xpEarned: typeof c.xpEarned === 'number' ? c.xpEarned : 20,
          isArchived: true,
        }))
    : [];

  const hasLegitimateCompletions =
    sanitizedTasks.some((t) => t.completed) || archivedCompletions.length > 0;

  const nameCheck = validateUsername(rawSettings.userName);
  const explicitOnboarded = Boolean(obj.hasCompletedOnboarding);
  const isPureLegacyDemo = hadSeedTasks && sanitizedTasks.length === 0 && !explicitOnboarded;
  const hasCompletedOnboarding = isPureLegacyDemo
    ? false
    : explicitOnboarded || (nameCheck.valid && !hadSeedTasks);

  const settings: UserSettings = {
    userName: hasCompletedOnboarding && nameCheck.valid ? nameCheck.trimmed : '',
    theme:
      rawSettings.theme === 'light' ||
      rawSettings.theme === 'dark' ||
      rawSettings.theme === 'system'
        ? rawSettings.theme
        : DEFAULT_SETTINGS.theme,
    dailyGoalType:
      rawSettings.dailyGoalType === 'tasks' || rawSettings.dailyGoalType === 'xp'
        ? rawSettings.dailyGoalType
        : DEFAULT_SETTINGS.dailyGoalType,
    dailyGoalTarget: Math.max(
      1,
      Number(rawSettings.dailyGoalTarget || DEFAULT_SETTINGS.dailyGoalTarget)
    ),
    xpRewards: {
      HIGH: Math.max(1, Number(rawRewards.HIGH ?? DEFAULT_SETTINGS.xpRewards.HIGH)),
      MEDIUM: Math.max(1, Number(rawRewards.MEDIUM ?? DEFAULT_SETTINGS.xpRewards.MEDIUM)),
      LOW: Math.max(1, Number(rawRewards.LOW ?? DEFAULT_SETTINGS.xpRewards.LOW)),
      DAILY_GOAL_BONUS: Math.max(
        0,
        Number(rawRewards.DAILY_GOAL_BONUS ?? DEFAULT_SETTINGS.xpRewards.DAILY_GOAL_BONUS)
      ),
    },
    weekStartsOn: rawSettings.weekStartsOn === 0 ? 0 : 1,
    earlyBirdCutoffHour: Math.min(
      12,
      Math.max(5, Number(rawSettings.earlyBirdCutoffHour ?? DEFAULT_SETTINGS.earlyBirdCutoffHour))
    ),
    priorityProTarget: Math.max(
      1,
      Number(rawSettings.priorityProTarget ?? DEFAULT_SETTINGS.priorityProTarget)
    ),
    defaultSortBy:
      rawSettings.defaultSortBy === 'PRIORITY' ||
      rawSettings.defaultSortBy === 'DUE_DATE' ||
      rawSettings.defaultSortBy === 'CREATED_DATE'
        ? rawSettings.defaultSortBy
        : 'SMART',
    notificationsEnabled: Boolean(rawSettings.notificationsEnabled),
    reducedMotion: Boolean(rawSettings.reducedMotion),
    reminders,
  };

  const unlockedAchievements: Record<string, string> =
    hasLegitimateCompletions &&
    obj.unlockedAchievements &&
    typeof obj.unlockedAchievements === 'object'
      ? (obj.unlockedAchievements as Record<string, string>)
      : {};

  const xpActivity: XpActivityItem[] =
    hasLegitimateCompletions && Array.isArray(obj.xpActivity)
      ? (obj.xpActivity as XpActivityItem[])
          .filter((a) => !String(a.id).startsWith('act-'))
          .slice(0, 50)
      : [];

  const notifications: SmartNotificationItem[] =
    hasLegitimateCompletions && Array.isArray(obj.notifications)
      ? (obj.notifications as SmartNotificationItem[])
          .filter((n) => !String(n.dedupeKey).includes('seed-'))
          .slice(0, 60)
      : [];

  const celebratedGoalDates: Record<string, string> =
    hasLegitimateCompletions &&
    obj.celebratedGoalDates &&
    typeof obj.celebratedGoalDates === 'object'
      ? (obj.celebratedGoalDates as Record<string, string>)
      : {};

  const celebratedStreakDates: Record<string, number> =
    hasLegitimateCompletions &&
    obj.celebratedStreakDates &&
    typeof obj.celebratedStreakDates === 'object'
      ? (obj.celebratedStreakDates as Record<string, number>)
      : {};

  return {
    valid: true,
    data: {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      hasCompletedOnboarding,
      tasks: sanitizedTasks,
      categories,
      settings,
      archivedCompletions,
      unlockedAchievements,
      xpActivity,
      notifications,
      celebratedGoalDates,
      celebratedStreakDates,
    },
  };
}

function loadInitialState(): PersistedAppState {
  try {
    const rawV3 = window.localStorage.getItem(STORAGE_KEY_V3);
    if (rawV3) {
      const parsed = JSON.parse(rawV3);
      const validated = validateAndMigrateState(parsed);
      if (validated.valid) {
        return validated.data;
      }
    }
    const rawV2 = window.localStorage.getItem(LEGACY_STORAGE_KEY_V2);
    if (rawV2) {
      const parsedV2 = JSON.parse(rawV2);
      const migrated = validateAndMigrateState(parsedV2);
      if (migrated.valid) {
        window.localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(migrated.data));
        return migrated.data;
      }
    }
  } catch {
    // Graceful fallback if localStorage is unavailable or corrupted
  }
  return createCleanInitialState('');
}

// ============================================================================
// 5. BLACK + CRIMSON LIQUID GLASS DESIGN SYSTEM & LUMI MASCOT
// ============================================================================

const LIQUID_GLASS_STYLES = `
  :root {
    --sf-font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, sans-serif;
    --sf-bg-canvas: #F6F6F9;
    --sf-bg-secondary: #EEEEF4;
    --sf-crimson: #FF303F;
    --sf-crimson-deep: #C8102E;
    --sf-crimson-glow: rgba(255, 48, 63, 0.14);
    --sf-orb-1: rgba(255, 48, 63, 0.12);
    --sf-orb-2: rgba(200, 16, 46, 0.08);
    --sf-orb-3: rgba(161, 161, 170, 0.14);
    --sf-glass-primary: rgba(255, 255, 255, 0.78);
    --sf-glass-elevated: rgba(255, 255, 255, 0.90);
    --sf-glass-subtle: rgba(255, 255, 255, 0.56);
    --sf-glass-input: rgba(255, 255, 255, 0.76);
    --sf-glass-border: rgba(15, 23, 42, 0.09);
    --sf-glass-border-subtle: rgba(15, 23, 42, 0.06);
    --sf-glass-highlight: inset 0 1px 0 0 rgba(255, 255, 255, 0.92);
    --sf-glass-shadow: 0 14px 36px -10px rgba(15, 23, 42, 0.07), 0 4px 12px -2px rgba(15, 23, 42, 0.04);
    --sf-glass-shadow-hover: 0 20px 44px -10px rgba(200, 16, 46, 0.10), 0 6px 16px -3px rgba(15, 23, 42, 0.06);
  }

  .dark {
    --sf-bg-canvas: #08090D;
    --sf-bg-secondary: #101116;
    --sf-crimson: #FF303F;
    --sf-crimson-deep: #C8102E;
    --sf-crimson-glow: rgba(255, 48, 63, 0.20);
    --sf-orb-1: rgba(255, 48, 63, 0.18);
    --sf-orb-2: rgba(200, 16, 46, 0.14);
    --sf-orb-3: rgba(38, 38, 46, 0.35);
    --sf-glass-primary: rgba(25, 25, 32, 0.72);
    --sf-glass-elevated: rgba(38, 38, 46, 0.78);
    --sf-glass-subtle: rgba(16, 17, 22, 0.62);
    --sf-glass-input: rgba(16, 17, 22, 0.75);
    --sf-glass-border: rgba(255, 255, 255, 0.10);
    --sf-glass-border-subtle: rgba(255, 255, 255, 0.07);
    --sf-glass-highlight: inset 0 1px 0 0 rgba(255, 255, 255, 0.12);
    --sf-glass-shadow: 0 18px 42px -12px rgba(0, 0, 0, 0.68), 0 4px 14px -2px rgba(0, 0, 0, 0.45);
    --sf-glass-shadow-hover: 0 22px 48px -12px rgba(255, 48, 63, 0.18), 0 8px 20px -4px rgba(0, 0, 0, 0.55);
  }

  .sf-app-shell {
    font-family: var(--sf-font);
    background-color: var(--sf-bg-canvas);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    letter-spacing: -0.011em;
  }

  .sf-glass-panel {
    background: var(--sf-glass-primary);
    border: 1px solid var(--sf-glass-border);
    box-shadow: var(--sf-glass-highlight), var(--sf-glass-shadow);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
  }

  .sf-glass-elevated {
    background: var(--sf-glass-elevated);
    border: 1px solid var(--sf-glass-border);
    box-shadow: var(--sf-glass-highlight), var(--sf-glass-shadow-hover);
    backdrop-filter: blur(30px) saturate(190%);
    -webkit-backdrop-filter: blur(30px) saturate(190%);
  }

  .sf-glass-subtle {
    background: var(--sf-glass-subtle);
    border: 1px solid var(--sf-glass-border-subtle);
    box-shadow: var(--sf-glass-highlight);
    backdrop-filter: blur(16px) saturate(150%);
    -webkit-backdrop-filter: blur(16px) saturate(150%);
  }

  .sf-glass-input {
    background: var(--sf-glass-input);
    border: 1px solid var(--sf-glass-border);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .sf-glass-card {
    background: var(--sf-glass-primary);
    border: 1px solid var(--sf-glass-border);
    box-shadow: var(--sf-glass-highlight), var(--sf-glass-shadow);
    backdrop-filter: blur(20px) saturate(175%);
    -webkit-backdrop-filter: blur(20px) saturate(175%);
    transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
                box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1),
                border-color 200ms ease,
                background-color 200ms ease;
  }

  .sf-glass-card:hover {
    box-shadow: var(--sf-glass-highlight), var(--sf-glass-shadow-hover);
  }

  .sf-crimson-btn {
    background: linear-gradient(135deg, #FF303F 0%, #C8102E 100%);
    color: #FFFFFF;
    box-shadow: 0 8px 22px -6px rgba(255, 48, 63, 0.50), inset 0 1px 0 rgba(255, 255, 255, 0.30);
  }

  .sf-crimson-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #FF4754 0%, #D91434 100%);
    box-shadow: 0 10px 26px -5px rgba(255, 48, 63, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.38);
  }

  .sf-crimson-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }

  .sf-tactile-press:active:not(:disabled) {
    transform: scale(0.975);
  }

  @keyframes sf-mascot-float {
    0%, 100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-4px) scale(1.02); }
  }

  @keyframes sf-mascot-jump {
    0%, 100% { transform: translateY(0px) scale(1); }
    35% { transform: translateY(-10px) scale(1.08) rotate(-3deg); }
    70% { transform: translateY(-4px) scale(1.04) rotate(3deg); }
  }

  @keyframes sf-flame-pulse {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(255, 48, 63, 0.45)); }
    50% { transform: scale(1.09); filter: drop-shadow(0 0 16px rgba(255, 48, 63, 0.78)); }
  }

  .sf-mascot-idle {
    animation: sf-mascot-float 3.4s ease-in-out infinite;
  }

  .sf-mascot-excited {
    animation: sf-mascot-jump 0.9s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }

  .sf-flame-animated {
    animation: sf-flame-pulse 2.4s ease-in-out infinite;
  }

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .sf-glass-panel, .sf-glass-elevated, .sf-glass-card {
      background: rgba(255, 255, 255, 0.96);
    }
    .dark .sf-glass-panel, .dark .sf-glass-elevated, .dark .sf-glass-card {
      background: rgba(25, 25, 32, 0.96);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

function GlassPanel({
  children,
  className = '',
  variant = 'primary',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'elevated' | 'subtle';
}) {
  const surfaceClass =
    variant === 'elevated'
      ? 'sf-glass-elevated'
      : variant === 'subtle'
      ? 'sf-glass-subtle'
      : 'sf-glass-panel';
  return <div className={`rounded-3xl ${surfaceClass} ${className}`}>{children}</div>;
}

function GlassIconContainer({
  children,
  tone = 'crimson',
  size = 'md',
}: {
  children: React.ReactNode;
  tone?: 'crimson' | 'amber' | 'emerald' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeMap = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-2xl',
    lg: 'w-12 h-12 rounded-2xl',
  };
  const toneMap = {
    crimson:
      'bg-gradient-to-br from-[#FF303F]/20 to-[#C8102E]/10 text-[#FF303F] border border-[#FF303F]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
    amber:
      'bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-500 border border-amber-400/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
    emerald:
      'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-500 border border-emerald-400/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
    neutral: 'sf-glass-subtle text-zinc-600 dark:text-zinc-300',
  };

  return (
    <div
      className={`${sizeMap[size]} ${toneMap[tone]} flex items-center justify-center flex-shrink-0`}
    >
      {children}
    </div>
  );
}

function LiquidProgressBar({
  percent,
  tone = 'crimson',
  heightClass = 'h-2.5',
}: {
  percent: number;
  tone?: 'crimson' | 'emerald' | 'amber';
  heightClass?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const fillGradient =
    tone === 'emerald'
      ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.45)]'
      : tone === 'amber'
      ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-[#FF303F] shadow-[0_0_12px_rgba(245,158,11,0.45)]'
      : 'bg-gradient-to-r from-[#FF303F] via-[#E11D2E] to-[#C8102E] shadow-[0_0_12px_rgba(255,48,63,0.45)]';

  return (
    <div
      className={`w-full ${heightClass} rounded-full bg-zinc-900/[0.08] dark:bg-white/[0.08] overflow-hidden p-[1px] border border-white/30 dark:border-white/5`}
    >
      <div
        className={`h-full rounded-full ${fillGradient} transition-all duration-700 ease-out`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/**
 * Lumi — StreakFlow's Original Non-AI Productivity Mascot
 */
function LumiMascot({
  mood,
  reducedMotion,
  size = 60,
}: {
  mood: MascotMood;
  reducedMotion: boolean;
  size?: number;
}) {
  const isExcited =
    mood === 'TASK_COMPLETED' ||
    mood === 'DAILY_GOAL_REACHED' ||
    mood === 'STREAK_INCREASED' ||
    mood === 'ACHIEVEMENT_UNLOCKED';

  const animClass = reducedMotion
    ? ''
    : isExcited
    ? 'sf-mascot-excited'
    : 'sf-mascot-idle';

  const outerStop1 =
    mood === 'DAILY_GOAL_REACHED' || mood === 'STREAK_INCREASED'
      ? '#FF303F'
      : mood === 'ACHIEVEMENT_UNLOCKED'
      ? '#F59E0B'
      : mood === 'MISSED_A_DAY'
      ? '#E11D2E'
      : '#FF303F';

  const outerStop2 =
    mood === 'DAILY_GOAL_REACHED' || mood === 'STREAK_INCREASED'
      ? '#F59E0B'
      : mood === 'ACHIEVEMENT_UNLOCKED'
      ? '#C8102E'
      : '#990A22';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${animClass}`}
      style={{ width: size, height: size }}
    >
      {isExcited && !reducedMotion && (
        <>
          <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-[#FF303F] animate-ping" />
          <span className="absolute -top-1.5 right-0 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="absolute bottom-0 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </>
      )}

      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label={`Lumi mascot in ${mood.toLowerCase().replace(/_/g, ' ')} state`}
      >
        <defs>
          <linearGradient id={`lumiCrimson-${mood}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={outerStop1} />
            <stop offset="100%" stopColor={outerStop2} />
          </linearGradient>
          <linearGradient id="lumiGlassShine" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.78)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="56" r="36" fill={outerStop1} opacity="0.18" />

        <path
          d="M50 10 C64 28, 84 44, 84 65 C84 83, 69 94, 50 94 C31 94, 16 83, 16 65 C16 44, 36 28, 50 10 Z"
          fill={`url(#lumiCrimson-${mood})`}
        />

        <path
          d="M50 28 C59 41, 72 52, 72 67 C72 79, 62 87, 50 87 C38 87, 28 79, 28 67 C28 52, 41 41, 50 28 Z"
          fill="rgba(255, 255, 255, 0.22)"
        />

        <ellipse
          cx="38"
          cy="44"
          rx="10"
          ry="16"
          transform="rotate(-22 38 44)"
          fill="url(#lumiGlassShine)"
        />

        {isExcited ? (
          <>
            <path
              d="M34 60 Q39 53 44 60"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M56 60 Q61 53 66 60"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <>
            <circle cx="39" cy="59" r="4.5" fill="#ffffff" />
            <circle cx="61" cy="59" r="4.5" fill="#ffffff" />
            <circle cx="40.5" cy="57.5" r="1.6" fill="#18181b" />
            <circle cx="62.5" cy="57.5" r="1.6" fill="#18181b" />
          </>
        )}

        <ellipse cx="32" cy="66" rx="4" ry="2.2" fill="#fecdd3" opacity="0.7" />
        <ellipse cx="68" cy="66" rx="4" ry="2.2" fill="#fecdd3" opacity="0.7" />

        {isExcited ? (
          <path d="M43 67 Q50 76 57 67 Z" fill="#ffffff" />
        ) : mood === 'MISSED_A_DAY' ? (
          <path
            d="M45 70 Q50 73 55 70"
            stroke="#ffffff"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            d="M44 68 Q50 74 56 68"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
}

function renderAchievementIcon(iconName: string, className = 'w-5 h-5') {
  switch (iconName) {
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Rocket':
      return <Rocket className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'Shield':
      return <Shield className={className} />;
    case 'Crown':
      return <Crown className={className} />;
    case 'Award':
      return <Award className={className} />;
    case 'Sunrise':
      return <Sunrise className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    default:
      return <Trophy className={className} />;
  }
}

function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === 'HIGH') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FF303F]/15 text-[#FF303F] border border-[#FF303F]/30">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF303F] shadow-[0_0_6px_#FF303F]" />
        High
      </span>
    );
  }
  if (priority === 'MEDIUM') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
      Low
    </span>
  );
}

// ============================================================================
// 6. MAIN APPLICATION COMPONENT
// ============================================================================

export default function App() {
  const [todayKey, setTodayKey] = useState<string>(() => toLocalDateKey());
  const [appState, setAppState] = useState<PersistedAppState>(() => loadInitialState());

  // First-Run Onboarding state
  const [onboardingInput, setOnboardingInput] = useState<string>('');
  const [onboardingTouched, setOnboardingTouched] = useState<boolean>(false);

  // Settings Profile username editing state
  const [profileNameDraft, setProfileNameDraft] = useState<string>(() => appState.settings.userName);
  const [profileNameError, setProfileNameError] = useState<string>('');

  // 4 Primary Navigation Destinations + Internal Subviews
  const [activeSection, setActiveSection] = useState<PrimarySection>('home');
  const [tasksSubView, setTasksSubView] = useState<TasksSubView>('today');
  const [progressSubView, setProgressSubView] = useState<ProgressSubView>('overview');
  const [expandedSettingsCategory, setExpandedSettingsCategory] =
    useState<SettingsCategoryKey | null>('profile');

  // Search, Filters & Sorting inside Tasks
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<'ALL' | Priority>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE'>(
    'ALL'
  );
  const [sortBy, setSortBy] = useState<SortOption>(
    () => appState.settings.defaultSortBy || 'SMART'
  );

  // Quick-add state
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickPriority, setQuickPriority] = useState<Priority>('HIGH');
  const [quickCategory, setQuickCategory] = useState<string>('Work');
  const [quickMinutes] = useState<string>('25');

  // Task Modal (Create / Edit)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formPriority, setFormPriority] = useState<Priority>('MEDIUM');
  const [formCategory, setFormCategory] = useState<string>('Work');
  const [formDueDate, setFormDueDate] = useState<string>(todayKey);
  const [formDueTime, setFormDueTime] = useState<string>('');
  const [formMinutes, setFormMinutes] = useState<string>('');
  const [formTags, setFormTags] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Confirmation Dialog state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'primary';
    onConfirm: () => void;
  } | null>(null);

  // Notification Center & Celebrations state
  const [notificationCenterOpen, setNotificationCenterOpen] = useState<boolean>(false);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'UNREAD' | 'IMPORTANT'>('ALL');
  const [transientMascotMood, setTransientMascotMood] = useState<MascotMood | null>(null);
  const [celebrationModal, setCelebrationModal] = useState<CelebrationModalState | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<AchievementStatus[]>([]);
  const [streakBumpActive, setStreakBumpActive] = useState<boolean>(false);
  const [customTimeInput, setCustomTimeInput] = useState<string>('16:00');

  // Import / Export / PWA Modal states
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importError, setImportError] = useState<string>('');
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [pwaModalOpen, setPwaModalOpen] = useState<boolean>(false);
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');
  const [categoryError, setCategoryError] = useState<string>('');

  // Calendar state
  const [calendarMonthDate, setCalendarMonthDate] = useState<Date>(() =>
    parseLocalDateKey(todayKey)
  );
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string>(todayKey);

  // Achievements filter
  const [achievementFilter, setAchievementFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');

  // Drag & Drop Board state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [boardMobileTab, setBoardMobileTab] = useState<Priority>('HIGH');

  // Animations & Toasts
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const [celebratingGoal, setCelebratingGoal] = useState<boolean>(false);
  const [recentlyAnimatedTaskId, setRecentlyAnimatedTaskId] = useState<string | null>(null);
  const [floatingXpTaskId, setFloatingXpTaskId] = useState<{ id: string; xp: number } | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<Event | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pushToast = useCallback(
    (title: string, subtitle?: string, variant: ToastNotice['variant'] = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, subtitle, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  // Sync profileNameDraft when userName changes
  useEffect(() => {
    setProfileNameDraft(appState.settings.userName);
  }, [appState.settings.userName]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(appState));
    } catch {
      // Ignore quota errors in restricted sandboxes
    }
  }, [appState]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentKey = toLocalDateKey();
      if (currentKey !== todayKey) {
        setTodayKey(currentKey);
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [todayKey]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
    return undefined;
  }, []);

  const isDark =
    appState.settings.theme === 'dark' ||
    (appState.settings.theme === 'system' && systemPrefersDark);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, [isDark]);

  // ============================================================================
  // 7. DERIVED METRICS & MASCOT EMOTIONAL STATE
  // ============================================================================

  const metrics = useMemo(() => {
    const { dayMap, ledger } = aggregateDailyStats(
      appState.tasks,
      appState.archivedCompletions,
      appState.settings,
      todayKey
    );
    const streakStats = calculateStreaks(dayMap, todayKey);

    let totalXp = 0;
    for (const day of dayMap.values()) {
      totalXp += day.totalXp;
    }

    const levelProgress = calculateLevelProgress(totalXp);
    const todayStats = dayMap.get(todayKey);

    const todayScheduledTasks = appState.tasks.filter((t) => {
      if (t.dueDate === todayKey) return true;
      if (t.completed && t.completedDateKey === todayKey) return true;
      if (!t.dueDate && !t.completed) return true;
      if (t.dueDate && t.dueDate < todayKey && !t.completed) return true;
      return false;
    });

    const completedTodayCount = todayStats ? todayStats.completedCount : 0;
    const totalScheduledToday = Math.max(todayScheduledTasks.length, completedTodayCount);

    const goalType = appState.settings.dailyGoalType;
    const goalTarget = Math.max(1, Number(appState.settings.dailyGoalTarget || 3));
    const goalCurrent = goalType === 'xp' ? todayStats?.taskXp || 0 : completedTodayCount;
    const dailyGoalPercent = Math.min(100, Math.round((goalCurrent / goalTarget) * 100));

    const achievementEval = evaluateAchievements({
      ledger,
      streakStats,
      settings: appState.settings,
      existingUnlocks: appState.unlockedAchievements,
    });

    return {
      dayMap,
      ledger,
      streakStats,
      levelProgress,
      todayStats,
      todayScheduledTasks,
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
  }, [
    appState.tasks,
    appState.archivedCompletions,
    appState.settings,
    appState.unlockedAchievements,
    todayKey,
  ]);

  const currentMascotMood: MascotMood = useMemo(() => {
    if (transientMascotMood) return transientMascotMood;
    if (metrics.dailyProgress.goalReached) return 'DAILY_GOAL_REACHED';
    if (metrics.dailyProgress.completedTodayCount > 0) return 'IDLE';
    if (metrics.streakStats.currentStreak === 0 && metrics.streakStats.longestStreak > 0) {
      return 'MISSED_A_DAY';
    }
    return 'NO_TASKS_COMPLETED';
  }, [transientMascotMood, metrics.dailyProgress, metrics.streakStats]);

  // Predefined, local non-AI motivational messages from Lumi
  const mascotSpeechText = useMemo(() => {
    const displayUser = appState.settings.userName || 'friend';
    switch (currentMascotMood) {
      case 'STREAK_INCREASED':
        return `STREAK CONTINUES! ${metrics.streakStats.currentStreak} days of consistency. You showed up for yourself today.`;
      case 'DAILY_GOAL_REACHED':
        return `Your daily goal is complete! You earned +${metrics.dailyProgress.earnedXpToday} XP today. Consistency beats perfection.`;
      case 'ACHIEVEMENT_UNLOCKED':
        return `New milestone badge unlocked! Your steady habits are paying off.`;
      case 'TASK_COMPLETED':
        return `One task at a time! Each completed task brings you closer to today's goal.`;
      case 'MISSED_A_DAY':
        return `Welcome back, ${displayUser}. Your ${metrics.streakStats.longestStreak}-day best streak is preserved—ready for a fresh start?`;
      case 'NO_TASKS_COMPLETED':
        return appState.tasks.length === 0
          ? `Ready for a fresh start, ${displayUser}? Create your first task to begin your flow.`
          : `One task at a time, ${displayUser}. Pick a priority task to start today's progress.`;
      default: {
        const rem = Math.max(
          0,
          metrics.dailyProgress.goalTarget - metrics.dailyProgress.goalCurrent
        );
        return `You're making progress! Complete ${rem} more ${
          metrics.dailyProgress.goalType === 'xp' ? 'XP' : rem === 1 ? 'task' : 'tasks'
        } to reach your daily goal.`;
      }
    }
  }, [
    currentMascotMood,
    metrics.streakStats,
    metrics.dailyProgress,
    appState.settings.userName,
    appState.tasks.length,
  ]);

  useEffect(() => {
    if (!appState.hasCompletedOnboarding) return;
    if (metrics.newlyUnlocked.length > 0) {
      setAppState((prev) => {
        const achievementNotifs: SmartNotificationItem[] = metrics.newlyUnlocked.map((b) => ({
          id: `notif-ach-${b.id}-${Date.now()}`,
          dedupeKey: `achievement_unlock:${b.id}`,
          category: 'achievementCelebrations',
          priority: 'important',
          title: `Badge Unlocked: ${b.name}!`,
          message: b.description,
          actionLabel: 'View Badges',
          actionSection: 'progress',
          actionProgressSub: 'achievements',
          dateKey: todayKey,
          createdAt: new Date().toISOString(),
          read: false,
          source: 'event',
        }));

        return {
          ...prev,
          unlockedAchievements: {
            ...prev.unlockedAchievements,
            ...metrics.updatedUnlocks,
          },
          notifications: [...achievementNotifs, ...prev.notifications].slice(0, 60),
        };
      });

      setAchievementQueue((prev) => [...prev, ...metrics.newlyUnlocked]);
      setTransientMascotMood('ACHIEVEMENT_UNLOCKED');
      playSynthesizedChime('achievement', appState.settings.reminders.soundEffects);
      window.setTimeout(() => setTransientMascotMood(null), 3500);

      for (const badge of metrics.newlyUnlocked) {
        pushToast(`Achievement Unlocked: ${badge.name}!`, badge.description, 'achievement');
      }
    }
  }, [
    appState.hasCompletedOnboarding,
    metrics.newlyUnlocked,
    metrics.updatedUnlocks,
    pushToast,
    todayKey,
    appState.settings.reminders.soundEffects,
  ]);

  useEffect(() => {
    if (!appState.hasCompletedOnboarding) return;
    const { generated } = generateSmartReminders({
      tasks: appState.tasks,
      dailyProgress: metrics.dailyProgress,
      streakStats: metrics.streakStats,
      reminderPrefs: appState.settings.reminders,
      existingNotifications: appState.notifications,
      now: new Date(),
      todayKey,
      bypassScheduleGates: false,
    });

    if (generated.length > 0) {
      setAppState((prev) => {
        const existingKeys = new Set(prev.notifications.map((n) => n.dedupeKey));
        const trulyNew = generated.filter((g) => !existingKeys.has(g.dedupeKey));
        if (trulyNew.length === 0) return prev;
        return {
          ...prev,
          notifications: [...trulyNew, ...prev.notifications].slice(0, 60),
        };
      });
    }
  }, [
    appState.hasCompletedOnboarding,
    appState.tasks,
    metrics.dailyProgress,
    metrics.streakStats,
    appState.settings.reminders,
    appState.notifications,
    todayKey,
  ]);

  // ============================================================================
  // 8. ONBOARDING, TASK CRUD, SMART REMINDER & CELEBRATION HANDLERS
  // ============================================================================

  const onboardingValidation = useMemo(
    () => validateUsername(onboardingInput),
    [onboardingInput]
  );

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingTouched(true);
    const check = validateUsername(onboardingInput);
    if (!check.valid) return;

    const cleanState = createCleanInitialState(check.trimmed);
    setAppState(cleanState);
    setActiveSection('home');
    pushToast(`Welcome to StreakFlow, ${check.trimmed}!`, 'Your workspace is ready.', 'success');
  };

  const handleSaveProfileUsername = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateUsername(profileNameDraft);
    if (!check.valid) {
      setProfileNameError(check.error);
      return;
    }
    setProfileNameError('');
    setAppState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        userName: check.trimmed,
      },
    }));
    pushToast('Username Updated', `Saved as "${check.trimmed}"`, 'success');
  };

  const handleToggleTaskComplete = (taskId: string) => {
    const targetTask = appState.tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const wasGoalReachedBefore = metrics.dailyProgress.goalReached;
    const previousStreak = metrics.streakStats.currentStreak;
    const willComplete = !targetTask.completed;
    const nowIso = new Date().toISOString();
    const xpVal = getTaskXpValue(targetTask.priority, appState.settings);

    setRecentlyAnimatedTaskId(taskId);
    if (willComplete) {
      setFloatingXpTaskId({ id: taskId, xp: xpVal });
      setTransientMascotMood('TASK_COMPLETED');
    }
    window.setTimeout(() => {
      setRecentlyAnimatedTaskId(null);
      setFloatingXpTaskId(null);
      setTransientMascotMood(null);
    }, 1800);

    const updatedTasks = appState.tasks.map((t) => {
      if (t.id !== taskId) return t;
      if (willComplete) {
        return {
          ...t,
          completed: true,
          completedAt: nowIso,
          completedDateKey: todayKey,
          xpAwarded: xpVal,
        };
      }
      return {
        ...t,
        completed: false,
        completedAt: undefined,
        completedDateKey: undefined,
        xpAwarded: undefined,
      };
    });

    const nextAgg = aggregateDailyStats(
      updatedTasks,
      appState.archivedCompletions,
      appState.settings,
      todayKey
    );
    const nextStreakStats = calculateStreaks(nextAgg.dayMap, todayKey);
    const nextTodayStat = nextAgg.dayMap.get(todayKey);
    const isGoalReachedAfter = Boolean(nextTodayStat?.qualifies);
    const newStreak = nextStreakStats.currentStreak;

    const newActivityEntries: XpActivityItem[] = [
      {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        label: willComplete
          ? `Completed "${targetTask.title}"`
          : `Reopened "${targetTask.title}"`,
        xpDelta: willComplete ? xpVal : -xpVal,
        timestamp: nowIso,
        dateKey: todayKey,
        kind: willComplete ? 'complete' : 'uncomplete',
      },
    ];

    const nextCelebratedGoalDates = { ...appState.celebratedGoalDates };
    const nextCelebratedStreakDates = { ...appState.celebratedStreakDates };

    if (willComplete && !wasGoalReachedBefore && isGoalReachedAfter) {
      const bonus = appState.settings.xpRewards.DAILY_GOAL_BONUS;
      newActivityEntries.unshift({
        id: `act-bonus-${Date.now()}`,
        label: 'Daily Goal Reached Bonus!',
        xpDelta: bonus,
        timestamp: nowIso,
        dateKey: todayKey,
        kind: 'bonus',
      });

      const alreadyCelebratedToday = Boolean(nextCelebratedGoalDates[todayKey]);
      const streakIncreased = newStreak > previousStreak;

      if (!alreadyCelebratedToday) {
        nextCelebratedGoalDates[todayKey] = nowIso;
        if (streakIncreased) {
          nextCelebratedStreakDates[todayKey] = newStreak;
          setTransientMascotMood('STREAK_INCREASED');
          setStreakBumpActive(true);
          window.setTimeout(() => setStreakBumpActive(false), 1600);
        } else {
          setTransientMascotMood('DAILY_GOAL_REACHED');
        }

        setCelebrationModal({
          open: true,
          kind: streakIncreased ? 'STREAK_AND_GOAL' : 'DAILY_GOAL_ONLY',
          streakDays: newStreak,
          streakIncreased,
          completedToday: nextTodayStat?.completedCount || 1,
          goalTarget: appState.settings.dailyGoalTarget,
          bonusXp: bonus,
          totalXpToday: nextTodayStat?.totalXp || xpVal + bonus,
        });
      }

      if (!appState.settings.reducedMotion) {
        setCelebratingGoal(true);
        window.setTimeout(() => setCelebratingGoal(false), 3800);
      }
      playSynthesizedChime('goal', appState.settings.reminders.soundEffects);
      pushToast(
        `Daily Goal Reached! +${bonus} Bonus XP`,
        `Streak at ${newStreak} day${newStreak === 1 ? '' : 's'}!`,
        'xp'
      );
    } else if (willComplete) {
      playSynthesizedChime('task', appState.settings.reminders.soundEffects);
      pushToast(`+${xpVal} XP Earned`, `Completed "${targetTask.title}"`, 'xp');
    } else {
      pushToast(`Task Reopened (${-xpVal} XP)`, `"${targetTask.title}" marked active`, 'info');
    }

    setAppState((prev) => ({
      ...prev,
      tasks: updatedTasks,
      xpActivity: [...newActivityEntries, ...prev.xpActivity].slice(0, 50),
      celebratedGoalDates: nextCelebratedGoalDates,
      celebratedStreakDates: nextCelebratedStreakDates,
    }));
  };

  const handleTriggerSmartReminderCheck = (isManualTest = false) => {
    const { generated, blockedReason } = generateSmartReminders({
      tasks: appState.tasks,
      dailyProgress: metrics.dailyProgress,
      streakStats: metrics.streakStats,
      reminderPrefs: appState.settings.reminders,
      existingNotifications: isManualTest ? [] : appState.notifications,
      now: new Date(),
      todayKey,
      bypassScheduleGates: isManualTest,
    });

    if (generated.length === 0) {
      const reasonMsg =
        blockedReason === 'quiet_hours'
          ? 'Quiet hours are currently active.'
          : blockedReason === 'paused'
          ? 'Reminders are currently paused.'
          : blockedReason === 'daily_limit_reached'
          ? 'Daily reminder limit reached.'
          : 'No pending reminders right now.';
      pushToast('Smart Reminder Check', reasonMsg, 'info');
      return;
    }

    const first = {
      ...generated[0],
      id: `rem-manual-${Date.now()}`,
      dedupeKey: isManualTest ? `test:${Date.now()}` : generated[0].dedupeKey,
      source: (isManualTest ? 'test' : 'smart-reminder') as 'test' | 'smart-reminder',
    };

    setAppState((prev) => ({
      ...prev,
      notifications: [first, ...prev.notifications].slice(0, 60),
    }));

    pushToast(first.title, first.message, 'info');

    if (
      appState.settings.notificationsEnabled &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(`StreakFlow · ${first.title}`, { body: first.message });
      } catch {
        // Fallback to in-app notification
      }
    }
  };

  const handleNotificationActionClick = (notif: SmartNotificationItem) => {
    setAppState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notif.id ? { ...n, read: true } : n
      ),
    }));
    setNotificationCenterOpen(false);
    setActiveSection(notif.actionSection);
    if (notif.actionTasksSub) setTasksSubView(notif.actionTasksSub);
    if (notif.actionProgressSub) setProgressSubView(notif.actionProgressSub);

    if (notif.taskId) {
      const targetTask = appState.tasks.find((t) => t.id === notif.taskId);
      if (targetTask) {
        openEditTaskModal(targetTask);
      }
    }
  };

  const handleMarkNotificationRead = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  };

  const handleMarkAllNotificationsRead = () => {
    setAppState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
    pushToast('Notifications Read', 'All notifications marked as read', 'info');
  };

  const handleDismissNotification = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
    }));
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) return;

    const mins = parseInt(quickMinutes, 10);
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: trimmed,
      description: '',
      priority: quickPriority,
      category: quickCategory || appState.categories[0] || 'Work',
      createdAt: new Date().toISOString(),
      dueDate: todayKey,
      completed: false,
      estimatedMinutes: !Number.isNaN(mins) && mins > 0 ? mins : undefined,
      tags: [],
    };

    setAppState((prev) => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
    }));
    setQuickTitle('');
    pushToast('Task Added', `"${newTask.title}" scheduled for today`, 'success');
  };

  const openCreateTaskModal = (defaultDateKey?: string, defaultPriority?: Priority) => {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormPriority(defaultPriority || 'MEDIUM');
    setFormCategory(appState.categories[0] || 'Work');
    setFormDueDate(defaultDateKey || todayKey);
    setFormDueTime('');
    setFormMinutes('30');
    setFormTags('');
    setFormError('');
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description || '');
    setFormPriority(task.priority);
    setFormCategory(task.category);
    setFormDueDate(task.dueDate || '');
    setFormDueTime(task.dueTime || '');
    setFormMinutes(task.estimatedMinutes ? String(task.estimatedMinutes) : '');
    setFormTags((task.tags || []).join(', '));
    setFormError('');
    setIsTaskModalOpen(true);
  };

  const handleSaveTaskModal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      setFormError('Please enter a task title.');
      return;
    }

    const mins = parseInt(formMinutes, 10);
    const parsedTags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingTask) {
      const updatedXp = editingTask.completed
        ? getTaskXpValue(formPriority, appState.settings)
        : undefined;
      setAppState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                title: trimmedTitle,
                description: formDesc.trim(),
                priority: formPriority,
                category: formCategory,
                dueDate: formDueDate || undefined,
                dueTime: formDueTime || undefined,
                estimatedMinutes: !Number.isNaN(mins) && mins > 0 ? mins : undefined,
                tags: parsedTags,
                xpAwarded: updatedXp,
              }
            : t
        ),
      }));
      pushToast('Task Updated', `"${trimmedTitle}" saved`, 'success');
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: trimmedTitle,
        description: formDesc.trim(),
        priority: formPriority,
        category: formCategory,
        createdAt: new Date().toISOString(),
        dueDate: formDueDate || undefined,
        dueTime: formDueTime || undefined,
        completed: false,
        estimatedMinutes: !Number.isNaN(mins) && mins > 0 ? mins : undefined,
        tags: parsedTags,
      };
      setAppState((prev) => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
      }));
      pushToast('Task Created', `"${trimmedTitle}" added to your list`, 'success');
    }

    setIsTaskModalOpen(false);
  };

  const requestDeleteTask = (task: Task) => {
    setConfirmModal({
      open: true,
      title: 'Delete Task?',
      message: task.completed
        ? `Delete "${task.title}"? Its historical completion record will be preserved so your past streak statistics are not corrupted.`
        : `Are you sure you want to permanently delete "${task.title}"?`,
      confirmLabel: 'Delete Task',
      variant: 'danger',
      onConfirm: () => {
        setAppState((prev) => {
          let nextArchived = prev.archivedCompletions;
          if (task.completed) {
            const dk =
              task.completedDateKey ||
              (task.completedAt ? toLocalDateKey(task.completedAt) : todayKey);
            const xp =
              typeof task.xpAwarded === 'number'
                ? task.xpAwarded
                : getTaskXpValue(task.priority, prev.settings);
            nextArchived = [
              ...prev.archivedCompletions.filter((a) => a.taskId !== task.id),
              {
                taskId: task.id,
                title: task.title,
                priority: task.priority,
                category: task.category,
                completedAt: task.completedAt || new Date().toISOString(),
                completedDateKey: dk,
                xpEarned: xp,
                isArchived: true,
              },
            ];
          }
          return {
            ...prev,
            tasks: prev.tasks.filter((t) => t.id !== task.id),
            archivedCompletions: nextArchived,
          };
        });
        setConfirmModal(null);
        pushToast('Task Deleted', `"${task.title}" was removed`, 'info');
      },
    });
  };

  const handleChangeTaskPriority = (taskId: string, newPriority: Priority) => {
    setAppState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const updatedXp = t.completed ? getTaskXpValue(newPriority, prev.settings) : undefined;
        return {
          ...t,
          priority: newPriority,
          xpAwarded: updatedXp,
        };
      }),
    }));
    pushToast('Priority Updated', `Moved task to ${newPriority} priority`, 'info');
  };

  // ============================================================================
  // 9. FILTERING, SORTING & ANALYTICS DATA
  // ============================================================================

  const priorityRank: Record<Priority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

  const sortTasksList = useCallback(
    (list: Task[], mode: SortOption) => {
      return list.slice().sort((a, b) => {
        if (mode === 'PRIORITY') {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return priorityRank[b.priority] - priorityRank[a.priority];
        }
        if (mode === 'DUE_DATE') {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          const da = a.dueDate || '9999-12-31';
          const db = b.dueDate || '9999-12-31';
          return da.localeCompare(db);
        }
        if (mode === 'CREATED_DATE') {
          return b.createdAt.localeCompare(a.createdAt);
        }
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const aOverdue = Boolean(!a.completed && a.dueDate && a.dueDate < todayKey);
        const bOverdue = Boolean(!b.completed && b.dueDate && b.dueDate < todayKey);
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (priorityRank[b.priority] !== priorityRank[a.priority]) {
          return priorityRank[b.priority] - priorityRank[a.priority];
        }
        const da = a.dueDate || '9999-12-31';
        const db = b.dueDate || '9999-12-31';
        return da.localeCompare(db);
      });
    },
    [todayKey]
  );

  const homePriorityTasks = useMemo(() => {
    const activeRelevant = appState.tasks.filter(
      (t) => !t.completed && (!t.dueDate || t.dueDate <= todayKey)
    );
    const pool =
      activeRelevant.length > 0 ? activeRelevant : appState.tasks.filter((t) => !t.completed);
    return sortTasksList(pool, sortBy).slice(0, 3);
  }, [appState.tasks, todayKey, sortBy, sortTasksList]);

  const filteredAndSortedTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = appState.tasks.filter((t) => {
      if (q) {
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = (t.description || '').toLowerCase().includes(q);
        const matchesCat = t.category.toLowerCase().includes(q);
        const matchesTag = (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesCat && !matchesTag) return false;
      }
      if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
      if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
      if (filterStatus === 'ACTIVE' && t.completed) return false;
      if (filterStatus === 'COMPLETED' && !t.completed) return false;
      if (filterStatus === 'OVERDUE') {
        if (t.completed || !t.dueDate || t.dueDate >= todayKey) return false;
      }
      return true;
    });

    return sortTasksList(filtered, sortBy);
  }, [
    appState.tasks,
    searchQuery,
    filterPriority,
    filterCategory,
    filterStatus,
    sortBy,
    todayKey,
    sortTasksList,
  ]);

  const weeklyChartData = useMemo(() => {
    const days: Array<{
      dateKey: string;
      label: string;
      tasks: number;
      xp: number;
      qualified: boolean;
      goalTarget: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const dk = addDaysToKey(todayKey, -i);
      const dt = parseLocalDateKey(dk);
      const dayStat = metrics.dayMap.get(dk);
      days.push({
        dateKey: dk,
        label: dt.toLocaleDateString('en-US', { weekday: 'short' }),
        tasks: dayStat ? dayStat.completedCount : 0,
        xp: dayStat ? dayStat.totalXp : 0,
        qualified: Boolean(dayStat?.qualifies),
        goalTarget: appState.settings.dailyGoalTarget,
      });
    }
    return days;
  }, [metrics.dayMap, todayKey, appState.settings.dailyGoalTarget]);

  const weeklyQualifyingRate = useMemo(() => {
    const qualifiedCount = weeklyChartData.filter((d) => d.qualified).length;
    return Math.round((qualifiedCount / 7) * 100);
  }, [weeklyChartData]);

  const twoWeekTrendData = useMemo(() => {
    const result = [];
    for (let i = 13; i >= 0; i--) {
      const dk = addDaysToKey(todayKey, -i);
      const dt = parseLocalDateKey(dk);
      const stat = metrics.dayMap.get(dk);
      result.push({
        dateKey: dk,
        label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tasks: stat ? stat.completedCount : 0,
        xp: stat ? stat.totalXp : 0,
      });
    }
    return result;
  }, [metrics.dayMap, todayKey]);

  const categoryStatsData = useMemo(() => {
    const map = new Map<string, { name: string; completed: number; pending: number; total: number }>();
    for (const cat of appState.categories) {
      map.set(cat, { name: cat, completed: 0, pending: 0, total: 0 });
    }
    for (const t of appState.tasks) {
      const entry = map.get(t.category) || { name: t.category, completed: 0, pending: 0, total: 0 };
      if (t.completed) entry.completed += 1;
      else entry.pending += 1;
      entry.total += 1;
      map.set(t.category, entry);
    }
    return Array.from(map.values());
  }, [appState.tasks, appState.categories]);

  const calendarGridDays = useMemo(() => {
    const year = calendarMonthDate.getFullYear();
    const month = calendarMonthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1, 12, 0, 0);
    const weekStart = appState.settings.weekStartsOn;

    const startDayOfWeek = firstDayOfMonth.getDay();
    const leadingDays = (startDayOfWeek - weekStart + 7) % 7;

    const cells: Array<{
      dateKey: string;
      dayNumber: number;
      inCurrentMonth: boolean;
      isToday: boolean;
      isFuture: boolean;
      completedCount: number;
      totalXp: number;
      qualifies: boolean;
    }> = [];

    const startCursor = new Date(year, month, 1 - leadingDays, 12, 0, 0);
    const totalCells = 42;

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(
        startCursor.getFullYear(),
        startCursor.getMonth(),
        startCursor.getDate() + i,
        12,
        0,
        0
      );
      const dk = toLocalDateKey(cellDate);
      const stat = metrics.dayMap.get(dk);
      cells.push({
        dateKey: dk,
        dayNumber: cellDate.getDate(),
        inCurrentMonth: cellDate.getMonth() === month,
        isToday: dk === todayKey,
        isFuture: dk > todayKey,
        completedCount: stat ? stat.completedCount : 0,
        totalXp: stat ? stat.totalXp : 0,
        qualifies: Boolean(stat?.qualifies),
      });
    }

    const lastRowInMonth = cells.slice(35).some((c) => c.inCurrentMonth);
    return lastRowInMonth ? cells : cells.slice(0, 35);
  }, [calendarMonthDate, appState.settings.weekStartsOn, metrics.dayMap, todayKey]);

  const greetingText = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const unreadNotificationsCount = useMemo(
    () => appState.notifications.filter((n) => !n.read).length,
    [appState.notifications]
  );

  const filteredNotifications = useMemo(() => {
    return appState.notifications.filter((n) => {
      if (notifFilter === 'UNREAD') return !n.read;
      if (notifFilter === 'IMPORTANT') return n.priority === 'important';
      return true;
    });
  }, [appState.notifications, notifFilter]);

  const handleCycleTheme = () => {
    const order: ThemeMode[] = ['dark', 'light', 'system'];
    const next = order[(order.indexOf(appState.settings.theme) + 1) % order.length];
    setAppState((prev) => ({
      ...prev,
      settings: { ...prev.settings, theme: next },
    }));
    pushToast('Theme Updated', `Switched to ${next} appearance`, 'info');
  };

  const handleDownloadBackupJson = () => {
    const payload = JSON.stringify(appState, null, 2);
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `streakflow-backup-${todayKey}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      pushToast('Backup Exported', `Saved streakflow-backup-${todayKey}.json`, 'success');
    } catch {
      setExportModalOpen(true);
    }
  };

  const handleCopyBackupJson = () => {
    const payload = JSON.stringify(appState, null, 2);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload);
      } else {
        const ta = document.createElement('textarea');
        ta.value = payload;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      pushToast('Copied to Clipboard', 'Backup JSON copied successfully', 'success');
    } catch {
      pushToast('Copy Ready', 'Select the text in the export box to copy', 'info');
    }
  };

  const handleApplyImportedJson = (rawText: string) => {
    setImportError('');
    try {
      const parsed = JSON.parse(rawText);
      const validation = validateAndMigrateState(parsed);
      if (!validation.valid) {
        setImportError(validation.error);
        return;
      }
      const nextData = {
        ...validation.data,
        hasCompletedOnboarding: true,
        settings: {
          ...validation.data.settings,
          userName: validation.data.settings.userName || appState.settings.userName || 'User',
        },
      };
      setAppState(nextData);
      setImportModalOpen(false);
      setImportJsonText('');
      pushToast(
        'Data Imported Successfully',
        `Loaded ${nextData.tasks.length} tasks and historical records`,
        'success'
      );
    } catch {
      setImportError('Invalid JSON syntax. Please check the file or pasted JSON.');
    }
  };

  const handleFileUploadImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = typeof ev.target?.result === 'string' ? ev.target.result : '';
      setImportJsonText(content);
      handleApplyImportedJson(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleToggleBrowserNotifications = async () => {
    if (appState.settings.notificationsEnabled) {
      setAppState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          notificationsEnabled: false,
          reminders: { ...prev.settings.reminders, browserNotifications: false },
        },
      }));
      pushToast('Notifications Disabled', 'In-app reminders only', 'info');
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      pushToast(
        'Notifications Unavailable',
        'This browser environment does not support the Web Notification API.',
        'warning'
      );
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setAppState((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            notificationsEnabled: true,
            reminders: { ...prev.settings.reminders, browserNotifications: true },
          },
        }));
        pushToast('Notifications Enabled', 'Foreground streak reminders active', 'success');
      } else {
        pushToast(
          'Permission Not Granted',
          'Browser notifications remain disabled. You will still receive in-app reminders.',
          'warning'
        );
      }
    } catch {
      pushToast('Notification Check', 'Using in-app toast notifications.', 'info');
    }
  };

  const updateReminderPrefs = (patch: Partial<ReminderPreferences>) => {
    setAppState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        reminders: {
          ...prev.settings.reminders,
          ...patch,
        },
      },
    }));
  };

  const toggleReminderCategory = (key: keyof ReminderCategoriesConfig) => {
    setAppState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        reminders: {
          ...prev.settings.reminders,
          categories: {
            ...prev.settings.reminders.categories,
            [key]: !prev.settings.reminders.categories[key],
          },
        },
      },
    }));
  };

  // ============================================================================
  // 10. LIQUID GLASS TASK CARD & EMPTY STATE COMPONENTS
  // ============================================================================

  const renderEmptyTasksState = (
    heading = 'No tasks yet',
    subtext = 'Your next small win starts here.',
    showCreateButton = true
  ) => (
    <div className="py-12 px-6 rounded-3xl sf-glass-subtle text-center space-y-4">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FF303F]/15 border border-[#FF303F]/30 flex items-center justify-center text-[#FF303F]">
        <CheckSquare className="w-7 h-7" />
      </div>
      <div className="space-y-1 max-w-sm mx-auto">
        <h4 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">{heading}</h4>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-[#A1A1AA]">{subtext}</p>
      </div>
      {showCreateButton && (
        <div>
          <button
            type="button"
            onClick={() => openCreateTaskModal(todayKey)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold sf-crimson-btn sf-tactile-press"
          >
            <Plus className="w-4 h-4" />
            Create Your First Task
          </button>
        </div>
      )}
    </div>
  );

  const renderTaskCard = (task: Task, compact = false) => {
    const isOverdue = !task.completed && task.dueDate && task.dueDate < todayKey;
    const isAnimated = recentlyAnimatedTaskId === task.id;
    const showFloatingXp = floatingXpTaskId?.id === task.id;
    const taskXp = getTaskXpValue(task.priority, appState.settings);

    return (
      <div
        key={task.id}
        draggable
        onDragStart={() => setDraggedTaskId(task.id)}
        onDragEnd={() => setDraggedTaskId(null)}
        className={`group relative rounded-2xl sf-glass-card sf-tactile-press ${
          compact ? 'p-3.5' : 'p-4'
        } ${
          task.completed
            ? 'opacity-65 bg-white/40 dark:bg-zinc-900/40'
            : 'hover:-translate-y-[1px] hover:border-[#FF303F]/45'
        } ${
          isAnimated && !appState.settings.reducedMotion
            ? 'scale-[1.012] ring-2 ring-[#FF303F]/45'
            : ''
        }`}
      >
        {showFloatingXp && !appState.settings.reducedMotion && (
          <div className="pointer-events-none absolute -top-3 right-8 z-10 px-2.5 py-0.5 rounded-full text-xs font-bold sf-crimson-btn animate-bounce">
            +{floatingXpTaskId?.xp} XP
          </div>
        )}

        <div className="flex items-start gap-3.5">
          <button
            type="button"
            onClick={() => handleToggleTaskComplete(task.id)}
            aria-label={
              task.completed ? `Mark "${task.title}" incomplete` : `Complete "${task.title}"`
            }
            className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#FF303F] ${
              task.completed
                ? 'sf-crimson-btn scale-105 border border-white/40'
                : 'border-2 border-zinc-300 dark:border-zinc-600 hover:border-[#FF303F] bg-white/50 dark:bg-zinc-800/40 text-transparent'
            }`}
          >
            <Check
              className={`w-3.5 h-3.5 stroke-[3] transition-transform duration-200 ${
                task.completed ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              }`}
            />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`font-semibold text-sm sm:text-[15px] tracking-tight transition-all ${
                  task.completed
                    ? 'line-through text-zinc-400 dark:text-zinc-500'
                    : 'text-zinc-900 dark:text-[#F5F5F7]'
                }`}
              >
                {task.title}
              </span>
              <PriorityBadge priority={task.priority} />
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium sf-glass-subtle text-zinc-600 dark:text-zinc-300">
                {task.category}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#FF303F] bg-[#FF303F]/10 border border-[#FF303F]/25 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" />+{taskXp} XP
              </span>
            </div>

            {task.description && !compact && (
              <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-[#A1A1AA] line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-[#A1A1AA]">
              {task.dueDate && (
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    isOverdue
                      ? 'text-[#FF303F] bg-[#FF303F]/12 border border-[#FF303F]/30 px-2 py-0.5 rounded-full'
                      : ''
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {isOverdue ? 'Overdue · ' : ''}
                  {task.dueDate === todayKey ? 'Today' : formatReadableDate(task.dueDate)}
                  {task.dueTime ? ` at ${task.dueTime}` : ''}
                </span>
              )}

              {task.estimatedMinutes && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {task.estimatedMinutes}m
                </span>
              )}

              {task.tags &&
                task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 text-zinc-500 dark:text-[#A1A1AA]"
                  >
                    <Tag className="w-3 h-3" />#{tag}
                  </span>
                ))}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-90 sm:opacity-60 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => openEditTaskModal(task)}
              title="Edit task"
              aria-label={`Edit "${task.title}"`}
              className="p-2 rounded-xl text-zinc-400 hover:text-[#FF303F] hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => requestDeleteTask(task)}
              title="Delete task"
              aria-label={`Delete "${task.title}"`}
              className="p-2 rounded-xl text-zinc-400 hover:text-[#FF303F] hover:bg-[#FF303F]/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // 11. FIRST-RUN USERNAME ONBOARDING SCREEN (Blocks Main App Until Completed)
  // ============================================================================

  if (!appState.hasCompletedOnboarding || !appState.settings.userName.trim()) {
    return (
      <div className={isDark ? 'dark' : ''}>
        <style>{LIQUID_GLASS_STYLES}</style>
        <div className="sf-app-shell relative min-h-screen text-zinc-900 dark:text-[#F5F5F7] flex items-center justify-center p-4 overflow-hidden">
          {/* Ambient Crimson & Charcoal Atmospheric Orbs */}
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
            <div
              className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, var(--sf-orb-1) 0%, transparent 70%)' }}
            />
            <div
              className="absolute bottom-0 -right-24 w-[420px] h-[420px] rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, var(--sf-orb-2) 0%, transparent 70%)' }}
            />
          </div>

          <GlassPanel
            variant="elevated"
            className="relative z-10 max-w-md w-full p-7 sm:p-9 text-center space-y-6"
          >
            {/* StreakFlow Brand & Lumi */}
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl sf-crimson-btn flex items-center justify-center shadow-lg">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <LumiMascot mood="IDLE" reducedMotion={false} size={56} />
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF303F]">
                  Your goals. Your progress. Your flow.
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-[#F5F5F7]">
                  Welcome to StreakFlow
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-[#A1A1AA]">
                  Build better habits, one task at a time. Choose a username to get started.
                </p>
              </div>
            </div>

            <form onSubmit={handleOnboardingSubmit} className="space-y-4 text-left" noValidate>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="onboarding-username-input"
                    className="text-xs font-semibold text-zinc-600 dark:text-zinc-300"
                  >
                    Username
                  </label>
                  <span className="text-[11px] text-zinc-400">
                    {onboardingInput.trim().length} / 24
                  </span>
                </div>
                <input
                  id="onboarding-username-input"
                  type="text"
                  autoFocus
                  maxLength={28}
                  value={onboardingInput}
                  onChange={(e) => {
                    setOnboardingInput(e.target.value);
                    if (!onboardingTouched) setOnboardingTouched(true);
                  }}
                  placeholder="Enter your username"
                  aria-invalid={onboardingTouched && !onboardingValidation.valid}
                  aria-describedby="onboarding-username-feedback"
                  className="w-full rounded-2xl px-4 py-3 text-sm sm:text-base sf-glass-input text-zinc-900 dark:text-[#F5F5F7] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF303F]"
                />
                {onboardingTouched && !onboardingValidation.valid && (
                  <p
                    id="onboarding-username-feedback"
                    className="mt-1.5 text-xs font-medium text-[#FF303F]"
                  >
                    {onboardingValidation.error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!onboardingValidation.valid}
                className="w-full py-3 px-5 rounded-2xl text-sm font-bold sf-crimson-btn sf-tactile-press flex items-center justify-center gap-2 transition-all"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
              Local-first privacy: your username, tasks, and streak history are stored directly on
              your device with no external account required.
            </p>
          </GlassPanel>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 12. SIMPLIFIED 4-DESTINATION PRIMARY NAVIGATION
  // ============================================================================

  const primaryNavItems: Array<{
    id: PrimarySection;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
  }> = [
    { id: 'home', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <ListTodo className="w-5 h-5" />,
      badge: appState.tasks.filter((t) => !t.completed).length || undefined,
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: <BarChart3 className="w-5 h-5" />,
      badge: `${metrics.streakStats.currentStreak}d`,
    },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  const ringRadius = 56;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (metrics.dailyProgress.dailyGoalPercent / 100) * ringCircumference;

  const activeAchievementModalItem = achievementQueue[0] || null;

  return (
    <div className={isDark ? 'dark' : ''}>
      <style>{LIQUID_GLASS_STYLES}</style>

      <div className="sf-app-shell relative min-h-screen text-zinc-900 dark:text-[#F5F5F7] flex flex-col md:flex-row transition-colors duration-300 pb-28 md:pb-0 overflow-x-hidden">
        {/* ================================================================== */}
        {/* AMBIENT CRIMSON & CHARCOAL ATMOSPHERIC ORBS                        */}
        {/* ================================================================== */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden z-0"
        >
          <div
            className="absolute -top-28 -left-24 w-[480px] h-[480px] rounded-full blur-3xl transition-opacity duration-700"
            style={{ background: 'radial-gradient(circle, var(--sf-orb-1) 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-1/3 -right-28 w-[440px] h-[440px] rounded-full blur-3xl transition-opacity duration-700"
            style={{ background: 'radial-gradient(circle, var(--sf-orb-2) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] rounded-full blur-3xl transition-opacity duration-700"
            style={{ background: 'radial-gradient(circle, var(--sf-orb-3) 0%, transparent 70%)' }}
          />
        </div>

        {/* ================================================================== */}
        {/* COMPACT 4-ITEM FLOATING DESKTOP GLASS SIDEBAR                      */}
        {/* ================================================================== */}
        <aside className="hidden md:flex md:w-64 lg:w-68 flex-col p-3.5 sticky top-0 h-screen z-20 select-none">
          <div className="sf-glass-panel rounded-3xl flex-1 flex flex-col justify-between overflow-hidden">
            <div>
              {/* Brand Header */}
              <div className="p-5 flex items-center justify-between border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl sf-crimson-btn flex items-center justify-center">
                    <Zap className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg tracking-tight text-zinc-900 dark:text-[#F5F5F7] flex items-center gap-1.5">
                      StreakFlow
                    </h1>
                    <p className="text-xs text-zinc-500 dark:text-[#A1A1AA] truncate max-w-[130px]">
                      {appState.settings.userName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compact Level & Streak Summary Capsule */}
              <div className="mx-3.5 mt-4 p-3.5 rounded-2xl sf-glass-subtle space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#FF303F] flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    Level {metrics.levelProgress.level}
                  </span>
                  <span className="text-zinc-700 dark:text-[#F5F5F7] font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-[#FF303F] fill-[#FF303F]" />
                    {metrics.streakStats.currentStreak}d
                  </span>
                </div>
                <LiquidProgressBar percent={metrics.levelProgress.progressPercent} heightClass="h-2" />
                <div className="flex justify-between text-[11px] text-zinc-500 dark:text-[#A1A1AA]">
                  <span>{metrics.levelProgress.levelTitle}</span>
                  <span>{metrics.levelProgress.totalXp} XP</span>
                </div>
              </div>

              {/* 4 Primary Navigation Destinations */}
              <nav className="px-3 py-4 space-y-1.5" aria-label="Primary Navigation">
                {primaryNavItems.map((item) => {
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 sf-tactile-press ${
                        active
                          ? 'sf-crimson-btn'
                          : 'text-zinc-600 dark:text-[#A1A1AA] hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-[#F5F5F7]'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {item.icon}
                        {item.label}
                      </span>
                      {item.badge !== undefined && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            active
                              ? 'bg-white/25 text-white'
                              : 'sf-glass-subtle text-zinc-600 dark:text-zinc-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom PWA & Offline Status Pill */}
            <div className="p-3.5 border-t border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => setPwaModalOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold sf-glass-subtle text-zinc-700 dark:text-zinc-200 hover:border-[#FF303F]/40 transition-colors sf-tactile-press"
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#FF303F]" />
                  Install App / Offline Ready
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  {isOnline ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  )}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* ================================================================== */}
        {/* MAIN CONTENT AREA                                                  */}
        {/* ================================================================== */}
        <div className="flex-1 flex flex-col min-w-0 z-10">
          {/* Compact Floating Glass Header */}
          <header className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 pt-3.5 pb-2">
            <div className="max-w-6xl mx-auto sf-glass-panel rounded-3xl px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
              {/* Left: Personalized Greeting, Date & Compact Streak Indicator */}
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-[#F5F5F7] tracking-tight">
                    {greetingText}, {appState.settings.userName}.
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('progress');
                      setProgressSubView('calendar');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border transition-all duration-300 ${
                      streakBumpActive ? 'scale-110 ring-2 ring-[#FF303F]' : ''
                    } ${
                      metrics.streakStats.todayQualified
                        ? 'bg-[#FF303F]/15 text-[#FF303F] border-[#FF303F]/35'
                        : 'sf-glass-subtle text-zinc-700 dark:text-zinc-200 border-white/20 dark:border-white/10'
                    }`}
                    title="Current streak — click to open Calendar"
                  >
                    <Flame
                      className={`w-3.5 h-3.5 ${
                        metrics.streakStats.currentStreak > 0
                          ? 'text-[#FF303F] fill-[#FF303F] sf-flame-animated'
                          : 'text-zinc-400'
                      }`}
                    />
                    {metrics.streakStats.currentStreak}d streak
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-[#A1A1AA] mt-0.5">
                  {formatFullDate(todayKey)}
                </p>
              </div>

              {/* Right: Notification Bell, Theme Control, Quick-Add Task Button */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setNotificationCenterOpen((prev) => !prev)}
                  title="Smart Notification Center"
                  aria-label={`Open notifications (${unreadNotificationsCount} unread)`}
                  className="relative p-2.5 rounded-2xl sf-glass-subtle text-zinc-700 dark:text-zinc-200 hover:border-[#FF303F]/40 transition-all sf-tactile-press"
                >
                  {unreadNotificationsCount > 0 ? (
                    <BellRing className="w-4 h-4 text-[#FF303F]" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF303F] text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCycleTheme}
                  title={`Theme: ${appState.settings.theme} (click to switch)`}
                  aria-label="Toggle color theme"
                  className="p-2.5 rounded-2xl sf-glass-subtle text-zinc-700 dark:text-zinc-200 hover:border-[#FF303F]/40 transition-all sf-tactile-press"
                >
                  {appState.settings.theme === 'light' && (
                    <Sun className="w-4 h-4 text-amber-500" />
                  )}
                  {appState.settings.theme === 'dark' && (
                    <Moon className="w-4 h-4 text-[#FF303F]" />
                  )}
                  {appState.settings.theme === 'system' && <Monitor className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => openCreateTaskModal(todayKey)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold sf-crimson-btn transition-all sf-tactile-press"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Task</span>
                </button>
              </div>
            </div>
          </header>

          {/* Daily Goal Celebration Banner */}
          {celebratingGoal && (
            <div className="mx-4 sm:mx-6 lg:mx-8 mt-2 rounded-2xl sf-crimson-btn px-4 py-3 text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-lg">
              <Sparkles className="w-4 h-4" />
              Daily Goal Achieved! You earned +{appState.settings.xpRewards.DAILY_GOAL_BONUS} Bonus
              XP and locked in today&apos;s streak!
            </div>
          )}

          {/* Main View Container */}
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
            {/* ============================================================== */}
            {/* DESTINATION 1: HOME (Clean Daily Dashboard)                    */}
            {/* ============================================================== */}
            {activeSection === 'home' && (
              <div className="space-y-6">
                {/* Top Row: Spacious Daily Progress Card + Streak Summary Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <GlassPanel className="lg:col-span-7 p-6 flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 132 132">
                        <defs>
                          <linearGradient id="crimsonRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop
                              offset="0%"
                              stopColor={metrics.dailyProgress.goalReached ? '#10B981' : '#FF303F'}
                            />
                            <stop
                              offset="100%"
                              stopColor={metrics.dailyProgress.goalReached ? '#059669' : '#C8102E'}
                            />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="66"
                          cy="66"
                          r={ringRadius}
                          fill="transparent"
                          stroke="currentColor"
                          strokeWidth="11"
                          className="text-zinc-900/[0.08] dark:text-white/[0.08]"
                        />
                        <circle
                          cx="66"
                          cy="66"
                          r={ringRadius}
                          fill="transparent"
                          stroke="url(#crimsonRingGrad)"
                          strokeWidth="11"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringOffset}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                          style={{
                            filter: metrics.dailyProgress.goalReached
                              ? 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.45))'
                              : 'drop-shadow(0 0 10px rgba(255, 48, 63, 0.45))',
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-[#F5F5F7]">
                          {metrics.dailyProgress.dailyGoalPercent}%
                        </span>
                        <span className="text-xs font-medium text-zinc-500 dark:text-[#A1A1AA]">
                          Daily Goal
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 w-full min-w-0 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-lg text-zinc-900 dark:text-[#F5F5F7] tracking-tight">
                            Today&apos;s Progress
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                            {metrics.dailyProgress.goalReached
                              ? 'Daily goal reached — bonus XP unlocked!'
                              : `Target: ${
                                  metrics.dailyProgress.goalType === 'tasks'
                                    ? `${metrics.dailyProgress.goalTarget} completed tasks`
                                    : `${metrics.dailyProgress.goalTarget} task XP`
                                }`}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                            metrics.dailyProgress.goalReached
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-[#FF303F]/15 text-[#FF303F] border-[#FF303F]/30'
                          }`}
                        >
                          {metrics.dailyProgress.goalReached ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Daily Goal Reached!
                            </>
                          ) : (
                            <>
                              <Target className="w-3.5 h-3.5" />
                              {metrics.dailyProgress.goalCurrent} / {metrics.dailyProgress.goalTarget}{' '}
                              {metrics.dailyProgress.goalType === 'tasks' ? 'Tasks' : 'XP'}
                            </>
                          )}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl sf-glass-subtle min-w-[140px] flex flex-col justify-between">
                          <span className="text-xs font-medium text-zinc-500 dark:text-[#A1A1AA]">
                            Completed Today
                          </span>
                          <div className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap">
                            <span className="text-xl font-extrabold text-zinc-900 dark:text-[#F5F5F7]">
                              {metrics.dailyProgress.completedTodayCount}
                            </span>
                            <span className="text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA]">
                              of {metrics.dailyProgress.totalScheduledToday} tasks
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl sf-glass-subtle min-w-[140px] flex flex-col justify-between">
                          <span className="text-xs font-medium text-zinc-500 dark:text-[#A1A1AA]">
                            Earned Today
                          </span>
                          <div className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap">
                            <span className="text-xl font-extrabold text-[#FF303F]">
                              +{metrics.dailyProgress.earnedXpToday} XP
                            </span>
                            {metrics.dailyProgress.bonusXpToday > 0 && (
                              <span className="text-[11px] font-semibold text-emerald-500">
                                (incl. +{metrics.dailyProgress.bonusXpToday} bonus)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassPanel>

                  {/* Compact Streak Summary Card */}
                  <GlassPanel className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-[#FF303F] fill-[#FF303F] sf-flame-animated" />
                        Streak Summary
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          metrics.streakStats.todayQualified
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-[#FF303F]/15 text-[#FF303F] border-[#FF303F]/30'
                        }`}
                      >
                        {metrics.streakStats.todayQualified ? 'Goal Met Today' : 'Today In Progress'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div
                        className={`p-3 rounded-2xl bg-[#FF303F]/12 border border-[#FF303F]/30 transition-transform duration-300 ${
                          streakBumpActive ? 'scale-105' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1 text-xl font-extrabold text-[#FF303F]">
                          <Flame className="w-5 h-5 fill-current" />
                          {metrics.streakStats.currentStreak}
                        </div>
                        <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 mt-0.5">
                          Current
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl sf-glass-subtle">
                        <div className="text-xl font-extrabold text-zinc-900 dark:text-[#F5F5F7]">
                          {metrics.streakStats.longestStreak}
                        </div>
                        <div className="text-[11px] font-medium text-zinc-500 dark:text-[#A1A1AA] mt-0.5">
                          Longest
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl sf-glass-subtle">
                        <div className="text-xl font-extrabold text-zinc-900 dark:text-[#F5F5F7]">
                          {metrics.streakStats.totalProductiveDays}
                        </div>
                        <div className="text-[11px] font-medium text-zinc-500 dark:text-[#A1A1AA] mt-0.5">
                          Productive
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 px-3 py-2 rounded-2xl sf-glass-subtle">
                      {weeklyChartData.map((d) => (
                        <div key={d.dateKey} className="flex flex-col items-center gap-1">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                              d.qualified
                                ? 'sf-crimson-btn'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                            }`}
                            title={`${d.label}: ${d.tasks} tasks`}
                          >
                            {d.qualified ? '✓' : '·'}
                          </span>
                          <span className="text-[9px] text-zinc-400">{d.label.slice(0, 2)}</span>
                        </div>
                      ))}
                    </div>
                  </GlassPanel>
                </div>

                {/* Second Row: Lumi Companion Card + Compact XP Summary Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <GlassPanel className="lg:col-span-7 p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setTransientMascotMood(
                            metrics.dailyProgress.goalReached
                              ? 'STREAK_INCREASED'
                              : 'TASK_COMPLETED'
                          );
                          window.setTimeout(() => setTransientMascotMood(null), 2200);
                        }}
                        title="Tap Lumi"
                        className="focus:outline-none sf-tactile-press flex-shrink-0"
                      >
                        <LumiMascot
                          mood={currentMascotMood}
                          reducedMotion={appState.settings.reducedMotion}
                          size={58}
                        />
                      </button>
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-[#FF303F]">
                          Lumi Mascot
                        </span>
                        <p className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-200 leading-relaxed">
                          {mascotSpeechText}
                        </p>
                      </div>
                    </div>

                    {metrics.dailyProgress.goalReached && (
                      <button
                        type="button"
                        onClick={() =>
                          setCelebrationModal({
                            open: true,
                            kind: 'STREAK_AND_GOAL',
                            streakDays: metrics.streakStats.currentStreak,
                            streakIncreased: true,
                            completedToday: metrics.dailyProgress.completedTodayCount,
                            goalTarget: metrics.dailyProgress.goalTarget,
                            bonusXp: appState.settings.xpRewards.DAILY_GOAL_BONUS,
                            totalXpToday: metrics.dailyProgress.earnedXpToday,
                          })
                        }
                        className="px-3 py-1.5 rounded-2xl text-xs font-semibold bg-[#FF303F]/15 text-[#FF303F] border border-[#FF303F]/30 flex items-center gap-1.5 flex-shrink-0 sf-tactile-press"
                      >
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        Celebrate
                      </button>
                    )}
                  </GlassPanel>

                  <GlassPanel className="lg:col-span-5 p-5 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GlassIconContainer tone="crimson" size="md">
                          <span className="font-extrabold text-sm">
                            L{metrics.levelProgress.level}
                          </span>
                        </GlassIconContainer>
                        <div>
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-[#F5F5F7]">
                            {metrics.levelProgress.levelTitle}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                            {metrics.levelProgress.totalXp} Total XP ·{' '}
                            {metrics.levelProgress.xpToNextLevel} XP to Level{' '}
                            {metrics.levelProgress.level + 1}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection('progress');
                          setProgressSubView('achievements');
                        }}
                        className="text-xs font-semibold text-[#FF303F] hover:underline flex items-center gap-0.5"
                      >
                        Progress <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <LiquidProgressBar percent={metrics.levelProgress.progressPercent} />
                      <div className="flex justify-between text-[11px] text-zinc-500 dark:text-[#A1A1AA]">
                        <span>
                          {metrics.levelProgress.currentLevelXp} /{' '}
                          {metrics.levelProgress.nextLevelXpRequired} XP
                        </span>
                        <span>{metrics.levelProgress.progressPercent}%</span>
                      </div>
                    </div>
                  </GlassPanel>
                </div>

                {/* Third Row: Top Priority Tasks (Maximum of 3 Tasks on Home) */}
                <GlassPanel className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <GlassIconContainer tone="crimson" size="sm">
                        <CheckSquare className="w-4 h-4" />
                      </GlassIconContainer>
                      <div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7] tracking-tight">
                          Top Priority Tasks
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                          Up to 3 focus tasks — overdue and high-priority first.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection('tasks');
                        setTasksSubView('all');
                      }}
                      className="px-3.5 py-1.5 rounded-2xl text-xs font-semibold sf-glass-subtle text-[#FF303F] hover:border-[#FF303F]/40 flex items-center gap-1 sf-tactile-press"
                    >
                      View All Tasks ({appState.tasks.length})
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Rapid Quick-Add Bar */}
                  <form
                    onSubmit={handleQuickAddSubmit}
                    className="p-2.5 rounded-2xl sf-glass-subtle flex flex-wrap sm:flex-nowrap items-center gap-2"
                  >
                    <input
                      type="text"
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      placeholder="Quick-add a task for today..."
                      aria-label="Quick-add task title"
                      className="flex-1 min-w-[160px] bg-transparent text-sm px-2.5 py-1.5 text-zinc-900 dark:text-[#F5F5F7] placeholder-zinc-400 focus:outline-none"
                    />
                    <select
                      value={quickPriority}
                      onChange={(e) => setQuickPriority(e.target.value as Priority)}
                      aria-label="Quick-add task priority"
                      className="text-xs rounded-xl px-2.5 py-1.5 sf-glass-input text-zinc-700 dark:text-zinc-200 focus:outline-none"
                    >
                      <option value="HIGH">High (+{appState.settings.xpRewards.HIGH} XP)</option>
                      <option value="MEDIUM">
                        Med (+{appState.settings.xpRewards.MEDIUM} XP)
                      </option>
                      <option value="LOW">Low (+{appState.settings.xpRewards.LOW} XP)</option>
                    </select>
                    <select
                      value={quickCategory}
                      onChange={(e) => setQuickCategory(e.target.value)}
                      aria-label="Quick-add task category"
                      className="text-xs rounded-xl px-2.5 py-1.5 sf-glass-input text-zinc-700 dark:text-zinc-200 focus:outline-none"
                    >
                      {appState.categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl sf-crimson-btn text-xs font-semibold flex items-center gap-1 transition-all sf-tactile-press"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </form>

                  <div className="space-y-3">
                    {appState.tasks.length === 0
                      ? renderEmptyTasksState('No tasks yet', 'Your next small win starts here.')
                      : homePriorityTasks.length === 0
                      ? renderEmptyTasksState(
                          'All scheduled tasks complete!',
                          'Add another task or review your completed tasks.',
                          true
                        )
                      : homePriorityTasks.map((task) => renderTaskCard(task))}
                  </div>
                </GlassPanel>
              </div>
            )}

            {/* ============================================================== */}
            {/* DESTINATION 2: TASKS (Today, All Tasks, Priority Board, Done)  */}
            {/* ============================================================== */}
            {activeSection === 'tasks' && (
              <div className="space-y-5">
                <GlassPanel className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-[#F5F5F7] tracking-tight">
                        Tasks Workspace
                      </h2>
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-[#A1A1AA]">
                        Manage today&apos;s focus, all tasks, the priority board, and completed
                        history in one place.
                      </p>
                    </div>

                    <div className="flex flex-wrap rounded-2xl sf-glass-subtle p-1 gap-1">
                      {(
                        [
                          {
                            id: 'today',
                            label: 'Today',
                            count: metrics.todayScheduledTasks.filter((t) => !t.completed).length,
                          },
                          {
                            id: 'all',
                            label: 'All Tasks',
                            count: appState.tasks.length,
                          },
                          {
                            id: 'board',
                            label: 'Priority Board',
                          },
                          {
                            id: 'completed',
                            label: 'Completed',
                            count: appState.tasks.filter((t) => t.completed).length,
                          },
                        ] as Array<{ id: TasksSubView; label: string; count?: number }>
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setTasksSubView(tab.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all sf-tactile-press flex items-center gap-1.5 ${
                            tasksSubView === tab.id
                              ? 'sf-crimson-btn'
                              : 'text-zinc-600 dark:text-[#A1A1AA] hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          <span>{tab.label}</span>
                          {tab.count !== undefined && (
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                tasksSubView === tab.id
                                  ? 'bg-white/25 text-white'
                                  : 'bg-black/5 dark:bg-white/10'
                              }`}
                            >
                              {tab.count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Unified Search & Compact Filters Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
                    <div className="sm:col-span-2 relative">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tasks, categories, #tags..."
                        aria-label="Search tasks"
                        className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-2xl sf-glass-input text-zinc-900 dark:text-[#F5F5F7] placeholder-zinc-400 focus:outline-none"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          aria-label="Clear search"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value as 'ALL' | Priority)}
                      aria-label="Filter by priority"
                      className="rounded-2xl px-3 py-2 text-xs sm:text-sm sf-glass-input text-zinc-800 dark:text-[#F5F5F7] focus:outline-none"
                    >
                      <option value="ALL">All Priorities</option>
                      <option value="HIGH">High Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="LOW">Low Priority</option>
                    </select>

                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      aria-label="Filter by category"
                      className="rounded-2xl px-3 py-2 text-xs sm:text-sm sf-glass-input text-zinc-800 dark:text-[#F5F5F7] focus:outline-none"
                    >
                      <option value="ALL">All Categories</option>
                      {appState.categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      aria-label="Sort tasks"
                      className="rounded-2xl px-3 py-2 text-xs sm:text-sm sf-glass-input text-zinc-800 dark:text-[#F5F5F7] focus:outline-none"
                    >
                      <option value="SMART">Sort: Overdue &amp; Priority</option>
                      <option value="PRIORITY">Sort: Priority Level</option>
                      <option value="DUE_DATE">Sort: Due Date</option>
                      <option value="CREATED_DATE">Sort: Recently Created</option>
                    </select>
                  </div>
                </GlassPanel>

                {/* SUB-VIEW 2A: TODAY */}
                {tasksSubView === 'today' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <GlassPanel className="p-5 sm:p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-200">
                          Active for Today (
                          {metrics.todayScheduledTasks.filter((t) => !t.completed).length})
                        </h3>
                        <span className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                          {metrics.todayScheduledTasks
                            .filter((t) => !t.completed)
                            .reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0)}{' '}
                          mins est.
                        </span>
                      </div>
                      {metrics.todayScheduledTasks.filter((t) => !t.completed).length === 0 ? (
                        renderEmptyTasksState(
                          'No tasks scheduled for today.',
                          'Your next small win starts here.',
                          true
                        )
                      ) : (
                        sortTasksList(
                          metrics.todayScheduledTasks.filter((t) => !t.completed),
                          sortBy
                        ).map((t) => renderTaskCard(t))
                      )}
                    </GlassPanel>

                    <GlassPanel className="p-5 sm:p-6 space-y-3">
                      <h3 className="font-bold text-sm text-emerald-500">
                        Completed Today (
                        {metrics.todayScheduledTasks.filter((t) => t.completed).length})
                      </h3>
                      {metrics.todayScheduledTasks.filter((t) => t.completed).length === 0 ? (
                        renderEmptyTasksState(
                          'No completed tasks yet.',
                          'Check off your first task today to build momentum.',
                          false
                        )
                      ) : (
                        metrics.todayScheduledTasks
                          .filter((t) => t.completed)
                          .map((t) => renderTaskCard(t))
                      )}
                    </GlassPanel>
                  </div>
                )}

                {/* SUB-VIEW 2B: ALL TASKS */}
                {tasksSubView === 'all' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(
                        [
                          { id: 'ALL', label: `All (${appState.tasks.length})` },
                          {
                            id: 'ACTIVE',
                            label: `Active (${appState.tasks.filter((t) => !t.completed).length})`,
                          },
                          {
                            id: 'OVERDUE',
                            label: `Overdue (${
                              appState.tasks.filter(
                                (t) => !t.completed && t.dueDate && t.dueDate < todayKey
                              ).length
                            })`,
                          },
                          {
                            id: 'COMPLETED',
                            label: `Completed (${appState.tasks.filter((t) => t.completed).length})`,
                          },
                        ] as const
                      ).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setFilterStatus(st.id)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            filterStatus === st.id
                              ? 'sf-crimson-btn'
                              : 'sf-glass-subtle text-zinc-600 dark:text-[#A1A1AA]'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>

                    {appState.tasks.length === 0 ? (
                      <GlassPanel className="p-6">
                        {renderEmptyTasksState('No tasks yet', 'Your next small win starts here.')}
                      </GlassPanel>
                    ) : filteredAndSortedTasks.length === 0 ? (
                      <GlassPanel className="p-12 text-center space-y-3">
                        <Filter className="w-10 h-10 text-zinc-400 mx-auto" />
                        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                          No tasks match your search.
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setFilterPriority('ALL');
                            setFilterCategory('ALL');
                            setFilterStatus('ALL');
                          }}
                          className="px-4 py-2 rounded-2xl sf-glass-subtle text-xs font-semibold text-[#FF303F]"
                        >
                          Reset All Filters
                        </button>
                      </GlassPanel>
                    ) : (
                      filteredAndSortedTasks.map((task) => renderTaskCard(task))
                    )}
                  </div>
                )}

                {/* SUB-VIEW 2C: PRIORITY BOARD */}
                {tasksSubView === 'board' && (
                  <div className="space-y-4">
                    <div className="flex md:hidden rounded-2xl sf-glass-subtle p-1 w-full">
                      {(['HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setBoardMobileTab(p)}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                            boardMobileTab === p ? 'sf-crimson-btn' : 'text-zinc-500'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {(['HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((prio) => {
                        const colTasks = filteredAndSortedTasks.filter((t) => t.priority === prio);
                        const xpVal = getTaskXpValue(prio, appState.settings);

                        return (
                          <div
                            key={prio}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (draggedTaskId) {
                                handleChangeTaskPriority(draggedTaskId, prio);
                                setDraggedTaskId(null);
                              }
                            }}
                            className={`${
                              boardMobileTab === prio ? 'block' : 'hidden md:block'
                            } sf-glass-panel rounded-3xl p-5 flex flex-col min-h-[400px]`}
                          >
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/5 dark:border-white/10">
                              <div className="flex items-center gap-2">
                                <PriorityBadge priority={prio} />
                                <span className="text-xs font-bold text-zinc-400">
                                  ({colTasks.length})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[#FF303F]">
                                  +{xpVal} XP
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openCreateTaskModal(todayKey, prio)}
                                  aria-label={`Add ${prio} priority task`}
                                  className="p-1.5 rounded-xl sf-glass-subtle text-zinc-600 dark:text-zinc-300"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3 flex-1">
                              {colTasks.length === 0 ? (
                                <div className="h-44 rounded-2xl sf-glass-subtle flex flex-col items-center justify-center text-center p-4 space-y-2">
                                  <p className="text-xs text-zinc-400">
                                    No {prio.toLowerCase()} priority tasks yet.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => openCreateTaskModal(todayKey, prio)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold sf-glass-input text-[#FF303F]"
                                  >
                                    + Add {prio} Task
                                  </button>
                                </div>
                              ) : (
                                colTasks.map((task) => (
                                  <div key={task.id} className="space-y-1.5">
                                    {renderTaskCard(task, true)}
                                    <div className="flex items-center justify-end gap-1 px-1">
                                      <span className="text-[10px] text-zinc-400 mr-1">
                                        Move to:
                                      </span>
                                      {(['HIGH', 'MEDIUM', 'LOW'] as Priority[])
                                        .filter((p) => p !== task.priority)
                                        .map((targetP) => (
                                          <button
                                            key={targetP}
                                            type="button"
                                            onClick={() =>
                                              handleChangeTaskPriority(task.id, targetP)
                                            }
                                            className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full sf-glass-subtle hover:border-[#FF303F]/40 text-zinc-600 dark:text-zinc-300"
                                          >
                                            {targetP}
                                          </button>
                                        ))}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SUB-VIEW 2D: COMPLETED TASKS */}
                {tasksSubView === 'completed' && (
                  <GlassPanel className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-zinc-900 dark:text-[#F5F5F7]">
                        Completed Tasks ({appState.tasks.filter((t) => t.completed).length})
                      </h3>
                      <span className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                        Uncheck any task to reopen it and reverse its XP
                      </span>
                    </div>
                    {appState.tasks.filter((t) => t.completed).length === 0 ? (
                      renderEmptyTasksState(
                        'No completed tasks yet.',
                        'Complete a task to earn XP and build your daily streak.',
                        false
                      )
                    ) : (
                      appState.tasks
                        .filter((t) => t.completed)
                        .map((task) => renderTaskCard(task))
                    )}
                  </GlassPanel>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* DESTINATION 3: PROGRESS (Overview, Calendar, Badges, Stats)    */}
            {/* ============================================================== */}
            {activeSection === 'progress' && (
              <div className="space-y-6">
                <GlassPanel className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-[#F5F5F7] tracking-tight">
                      {appState.settings.userName}&apos;s Progress
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-[#A1A1AA]">
                      Track your streaks, historical calendar, milestone achievements, and analytics.
                    </p>
                  </div>

                  <div className="flex flex-wrap rounded-2xl sf-glass-subtle p-1 gap-1">
                    {(
                      [
                        { id: 'overview', label: 'Overview' },
                        { id: 'calendar', label: 'Calendar' },
                        {
                          id: 'achievements',
                          label: `Achievements (${
                            metrics.achievements.filter((a) => a.unlocked).length
                          }/${metrics.achievements.length})`,
                        },
                        { id: 'statistics', label: 'Statistics' },
                      ] as Array<{ id: ProgressSubView; label: string }>
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setProgressSubView(tab.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all sf-tactile-press ${
                          progressSubView === tab.id
                            ? 'sf-crimson-btn'
                            : 'text-zinc-600 dark:text-[#A1A1AA] hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </GlassPanel>

                {/* SUB-VIEW 3A: OVERVIEW */}
                {progressSubView === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      <GlassPanel className="lg:col-span-6 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7] flex items-center gap-2">
                            <Flame className="w-5 h-5 text-[#FF303F] fill-[#FF303F]" />
                            Streak Consistency
                          </h3>
                          <button
                            type="button"
                            onClick={() => setProgressSubView('calendar')}
                            className="text-xs font-semibold text-[#FF303F] hover:underline"
                          >
                            Open Calendar →
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-3.5 rounded-2xl bg-[#FF303F]/12 border border-[#FF303F]/30">
                            <div className="text-2xl font-extrabold text-[#FF303F]">
                              {metrics.streakStats.currentStreak}d
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-[#A1A1AA] mt-0.5">
                              Current Streak
                            </div>
                          </div>
                          <div className="p-3.5 rounded-2xl sf-glass-subtle">
                            <div className="text-2xl font-extrabold text-zinc-900 dark:text-[#F5F5F7]">
                              {metrics.streakStats.longestStreak}d
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-[#A1A1AA] mt-0.5">
                              Longest Streak
                            </div>
                          </div>
                          <div className="p-3.5 rounded-2xl sf-glass-subtle">
                            <div className="text-2xl font-extrabold text-emerald-500">
                              {metrics.streakStats.totalProductiveDays}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-[#A1A1AA] mt-0.5">
                              Productive Days
                            </div>
                          </div>
                        </div>
                      </GlassPanel>

                      <GlassPanel className="lg:col-span-6 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GlassIconContainer tone="crimson" size="md">
                              <Crown className="w-5 h-5" />
                            </GlassIconContainer>
                            <div>
                              <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                                Level {metrics.levelProgress.level} ·{' '}
                                {metrics.levelProgress.levelTitle}
                              </h3>
                              <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                                {metrics.levelProgress.totalXp} Total XP Earned
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#FF303F]">
                            {metrics.levelProgress.xpToNextLevel} XP to Level{' '}
                            {metrics.levelProgress.level + 1}
                          </span>
                        </div>

                        <LiquidProgressBar
                          percent={metrics.levelProgress.progressPercent}
                          heightClass="h-3"
                        />

                        <div className="flex justify-between text-xs text-zinc-500 dark:text-[#A1A1AA]">
                          <span>
                            Level Progress: {metrics.levelProgress.currentLevelXp} /{' '}
                            {metrics.levelProgress.nextLevelXpRequired} XP
                          </span>
                          <span>{metrics.levelProgress.progressPercent}%</span>
                        </div>
                      </GlassPanel>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      <GlassPanel className="lg:col-span-7 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                              Weekly Completion Overview
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                              Last 7 days task completions vs. daily target
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                            {weeklyQualifyingRate}% Weekly Goal Rate
                          </span>
                        </div>

                        <div className="relative h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={weeklyChartData}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke={
                                  isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'
                                }
                              />
                              <XAxis
                                dataKey="label"
                                tick={{ fill: isDark ? '#A1A1AA' : '#52525B', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                allowDecimals={false}
                                tick={{ fill: isDark ? '#A1A1AA' : '#52525B', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <RechartsTooltip
                                contentStyle={{
                                  backgroundColor: isDark
                                    ? 'rgba(16, 17, 22, 0.92)'
                                    : 'rgba(255, 255, 255, 0.92)',
                                  borderColor: isDark
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'rgba(15, 23, 42, 0.12)',
                                  borderRadius: '16px',
                                  fontSize: '12px',
                                }}
                              />
                              <Bar dataKey="tasks" name="Tasks Completed" radius={[8, 8, 2, 2]}>
                                {weeklyChartData.map((entry) => (
                                  <Cell
                                    key={entry.dateKey}
                                    fill={
                                      entry.qualified
                                        ? '#FF303F'
                                        : isDark
                                        ? 'rgba(161, 161, 170, 0.25)'
                                        : 'rgba(161, 161, 170, 0.45)'
                                    }
                                  />
                                ))}
                              </Bar>
                              <Line
                                type="monotone"
                                dataKey="goalTarget"
                                name="Daily Target"
                                stroke="#10B981"
                                strokeWidth={2}
                                dot={false}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </GlassPanel>

                      <GlassPanel className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                            Achievements ({metrics.achievements.filter((a) => a.unlocked).length}/
                            {metrics.achievements.length})
                          </h3>
                          <button
                            type="button"
                            onClick={() => setProgressSubView('achievements')}
                            className="text-xs font-semibold text-[#FF303F] hover:underline"
                          >
                            All Badges →
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {metrics.achievements.slice(0, 4).map((badge) => (
                            <div
                              key={badge.id}
                              className="p-3 rounded-2xl sf-glass-subtle flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                    badge.unlocked
                                      ? 'sf-crimson-btn'
                                      : 'sf-glass-input text-zinc-400'
                                  }`}
                                >
                                  {renderAchievementIcon(badge.icon, 'w-4 h-4')}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-zinc-900 dark:text-[#F5F5F7] truncate">
                                    {badge.name}
                                  </div>
                                  <div className="text-[11px] text-zinc-500 dark:text-[#A1A1AA] truncate">
                                    {badge.description}
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                  badge.unlocked
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : 'bg-zinc-500/10 text-zinc-400'
                                }`}
                              >
                                {badge.unlocked ? 'Unlocked' : 'Locked'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </GlassPanel>
                    </div>
                  </div>
                )}

                {/* SUB-VIEW 3B: CALENDAR */}
                {progressSubView === 'calendar' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <GlassPanel className="lg:col-span-8 p-6 space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-zinc-900 dark:text-[#F5F5F7]">
                            Interactive Streak Calendar
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                            Select any date to inspect completed tasks, XP, and daily goal status.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonthDate(
                                new Date(
                                  calendarMonthDate.getFullYear(),
                                  calendarMonthDate.getMonth() - 1,
                                  1,
                                  12,
                                  0,
                                  0
                                )
                              )
                            }
                            aria-label="Previous month"
                            className="p-2 rounded-2xl sf-glass-subtle sf-tactile-press"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-bold min-w-[140px] text-center">
                            {calendarMonthDate.toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonthDate(
                                new Date(
                                  calendarMonthDate.getFullYear(),
                                  calendarMonthDate.getMonth() + 1,
                                  1,
                                  12,
                                  0,
                                  0
                                )
                              )
                            }
                            aria-label="Next month"
                            className="p-2 rounded-2xl sf-glass-subtle sf-tactile-press"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarMonthDate(parseLocalDateKey(todayKey));
                              setSelectedCalendarDateKey(todayKey);
                            }}
                            className="px-3.5 py-1.5 rounded-2xl text-xs font-semibold bg-[#FF303F]/15 text-[#FF303F] border border-[#FF303F]/30 sf-tactile-press"
                          >
                            Today
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-zinc-400">
                        {(appState.settings.weekStartsOn === 1
                          ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                          : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                        ).map((dayName) => (
                          <div key={dayName} className="py-1">
                            {dayName}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {calendarGridDays.map((cell) => {
                          const isSelected = cell.dateKey === selectedCalendarDateKey;

                          let surfaceStyle =
                            'sf-glass-subtle text-zinc-700 dark:text-zinc-300 hover:border-[#FF303F]/40';
                          if (cell.isFuture) {
                            surfaceStyle =
                              'bg-white/20 dark:bg-zinc-900/25 border border-black/5 dark:border-white/5 text-zinc-400 dark:text-zinc-600';
                          } else if (cell.qualifies) {
                            surfaceStyle = 'sf-crimson-btn text-white';
                          } else if (cell.completedCount > 0) {
                            surfaceStyle =
                              'bg-[#FF303F]/15 border border-[#FF303F]/30 text-[#FF303F]';
                          }

                          return (
                            <button
                              key={cell.dateKey}
                              type="button"
                              onClick={() => setSelectedCalendarDateKey(cell.dateKey)}
                              title={`${cell.dateKey}: ${cell.completedCount} tasks completed, ${
                                cell.totalXp
                              } XP${cell.qualifies ? ' (Daily Goal Met)' : ''}`}
                              className={`relative h-14 sm:h-16 rounded-2xl p-2 flex flex-col justify-between items-start transition-all duration-200 sf-tactile-press ${surfaceStyle} ${
                                !cell.inCurrentMonth ? 'opacity-40' : ''
                              } ${
                                isSelected
                                  ? 'ring-2 ring-offset-2 ring-[#FF303F] dark:ring-offset-[#08090D] scale-[1.03]'
                                  : ''
                              } ${cell.isToday ? 'border-2 border-amber-400' : ''}`}
                            >
                              <div className="w-full flex items-center justify-between">
                                <span className="text-xs font-bold">{cell.dayNumber}</span>
                                {cell.qualifies && <Flame className="w-3.5 h-3.5 fill-current" />}
                              </div>

                              {!cell.isFuture && cell.completedCount > 0 && (
                                <div className="text-[10px] font-semibold opacity-90">
                                  {cell.completedCount}t · {cell.totalXp}xp
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-3 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-[#A1A1AA]">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded sf-glass-subtle inline-block" />0 Tasks
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-[#FF303F]/20 border border-[#FF303F]/35 inline-block" />
                            Partial Progress
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded sf-crimson-btn inline-block" />
                            Goal Met
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded border-2 border-amber-400 inline-block" />
                          Today
                        </span>
                      </div>
                    </GlassPanel>

                    <GlassPanel className="lg:col-span-4 p-6 space-y-4">
                      {(() => {
                        const selectedStat = metrics.dayMap.get(selectedCalendarDateKey);
                        const isFutureSelected = selectedCalendarDateKey > todayKey;
                        const completedList = selectedStat ? selectedStat.completions : [];
                        const selectedDayProgressPct = Math.min(
                          100,
                          Math.round(
                            ((appState.settings.dailyGoalType === 'xp'
                              ? selectedStat?.taskXp || 0
                              : selectedStat?.completedCount || 0) /
                              Math.max(1, appState.settings.dailyGoalTarget)) *
                              100
                          )
                        );

                        return (
                          <>
                            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3.5">
                              <div>
                                <div className="text-xs font-semibold text-[#FF303F]">
                                  Day Inspector
                                </div>
                                <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                                  {formatFullDate(selectedCalendarDateKey)}
                                </h3>
                              </div>
                              {isFutureSelected ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold sf-glass-subtle text-zinc-500">
                                  Upcoming
                                </span>
                              ) : selectedStat?.qualifies ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                                  <Flame className="w-3.5 h-3.5 fill-current" />
                                  Goal Met
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold sf-glass-subtle text-zinc-500">
                                  Goal Not Met
                                </span>
                              )}
                            </div>

                            {!isFutureSelected && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA]">
                                  <span>Daily Goal Completion</span>
                                  <span>{selectedDayProgressPct}%</span>
                                </div>
                                <LiquidProgressBar
                                  percent={selectedDayProgressPct}
                                  tone={selectedStat?.qualifies ? 'emerald' : 'crimson'}
                                  heightClass="h-2"
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3.5 rounded-2xl sf-glass-subtle">
                                <div className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                                  Tasks Completed
                                </div>
                                <div className="text-lg font-extrabold text-zinc-900 dark:text-[#F5F5F7] mt-0.5">
                                  {selectedStat?.completedCount || 0}
                                </div>
                              </div>
                              <div className="p-3.5 rounded-2xl sf-glass-subtle">
                                <div className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                                  XP Earned
                                </div>
                                <div className="text-lg font-extrabold text-[#FF303F] mt-0.5">
                                  +{selectedStat?.totalXp || 0} XP
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-zinc-500 dark:text-[#A1A1AA]">
                                  Completed Tasks
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => openCreateTaskModal(selectedCalendarDateKey)}
                                  className="text-xs font-semibold text-[#FF303F] hover:underline"
                                >
                                  + Schedule Task
                                </button>
                              </div>

                              {completedList.length === 0 ? (
                                <div className="p-6 rounded-2xl sf-glass-subtle text-center text-xs text-zinc-500">
                                  {isFutureSelected
                                    ? 'Future date — schedule tasks ahead of time!'
                                    : 'No completed tasks recorded on this date.'}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {completedList.map((item) => (
                                    <div
                                      key={item.taskId}
                                      className="p-3 rounded-2xl sf-glass-subtle flex items-center justify-between gap-2"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-[#F5F5F7] truncate">
                                          {item.title}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <PriorityBadge priority={item.priority} />
                                          <span className="text-[11px] text-zinc-400">
                                            {item.category}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-xs font-bold text-[#FF303F] flex-shrink-0">
                                        +{item.xpEarned} XP
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </GlassPanel>
                  </div>
                )}

                {/* SUB-VIEW 3C: ACHIEVEMENTS */}
                {progressSubView === 'achievements' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-[#F5F5F7]">
                        Milestone Badges (
                        {metrics.achievements.filter((a) => a.unlocked).length}/
                        {metrics.achievements.length} Unlocked)
                      </h3>
                      <div className="flex rounded-2xl sf-glass-subtle p-1">
                        {(['ALL', 'UNLOCKED', 'LOCKED'] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setAchievementFilter(tab)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                              achievementFilter === tab
                                ? 'sf-crimson-btn'
                                : 'text-zinc-600 dark:text-[#A1A1AA]'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {metrics.achievements
                        .filter((a) => {
                          if (achievementFilter === 'UNLOCKED') return a.unlocked;
                          if (achievementFilter === 'LOCKED') return !a.unlocked;
                          return true;
                        })
                        .map((badge) => (
                          <div
                            key={badge.id}
                            className={`p-5 rounded-3xl sf-glass-card flex flex-col justify-between ${
                              badge.unlocked
                                ? 'border-[#FF303F]/40 shadow-[0_14px_34px_-10px_rgba(255,48,63,0.18)]'
                                : 'opacity-70'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-3.5">
                                <div
                                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                    badge.unlocked
                                      ? 'sf-crimson-btn border-white/30'
                                      : 'sf-glass-subtle text-zinc-400 border-white/10'
                                  }`}
                                >
                                  {renderAchievementIcon(badge.icon, 'w-5 h-5')}
                                </div>
                                <span
                                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                    badge.unlocked
                                      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                      : 'sf-glass-subtle text-zinc-500 border-transparent'
                                  }`}
                                >
                                  {badge.unlocked ? 'Unlocked' : 'Locked'}
                                </span>
                              </div>

                              <h4 className="font-bold text-base text-zinc-900 dark:text-[#F5F5F7]">
                                {badge.name}
                              </h4>
                              <p className="text-xs text-zinc-500 dark:text-[#A1A1AA] mt-1 leading-relaxed">
                                {badge.description}
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/10">
                              <div className="flex justify-between text-xs font-semibold mb-1.5">
                                <span className="text-zinc-500">Progress</span>
                                <span className="text-zinc-700 dark:text-zinc-200">
                                  {badge.progressCurrent} / {badge.progressTarget}
                                </span>
                              </div>
                              <LiquidProgressBar
                                percent={badge.progressPercent}
                                tone={badge.unlocked ? 'emerald' : 'crimson'}
                                heightClass="h-2"
                              />
                              {badge.unlockedAt && (
                                <div className="mt-2 text-[11px] text-zinc-400">
                                  Unlocked {formatReadableDate(toLocalDateKey(badge.unlockedAt))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* SUB-VIEW 3D: STATISTICS */}
                {progressSubView === 'statistics' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <GlassPanel className="p-5">
                        <div className="text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA]">
                          Total Completed
                        </div>
                        <div className="text-2xl font-extrabold text-zinc-900 dark:text-[#F5F5F7] mt-1">
                          {metrics.ledger.length} Tasks
                        </div>
                        <div className="text-xs text-emerald-500 mt-1">
                          {appState.tasks.length > 0
                            ? `${Math.round(
                                (appState.tasks.filter((t) => t.completed).length /
                                  appState.tasks.length) *
                                  100
                              )}% active completion rate`
                            : '0% completion rate'}
                        </div>
                      </GlassPanel>

                      <GlassPanel className="p-5">
                        <div className="text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA]">
                          High-Priority Done
                        </div>
                        <div className="text-2xl font-extrabold text-[#FF303F] mt-1">
                          {metrics.ledger.filter((c) => c.priority === 'HIGH').length}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-[#A1A1AA] mt-1">
                          +{appState.settings.xpRewards.HIGH} XP per high-priority task
                        </div>
                      </GlassPanel>

                      <GlassPanel className="p-5">
                        <div className="text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA]">
                          Productive Days
                        </div>
                        <div className="text-2xl font-extrabold text-zinc-900 dark:text-[#F5F5F7] mt-1">
                          {metrics.streakStats.totalProductiveDays} Days
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-[#A1A1AA] mt-1">
                          Best streak: {metrics.streakStats.longestStreak} days
                        </div>
                      </GlassPanel>

                      <GlassPanel className="p-5">
                        <div className="text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA]">
                          Focus Minutes Logged
                        </div>
                        <div className="text-2xl font-extrabold text-emerald-500 mt-1">
                          {appState.tasks
                            .filter((t) => t.completed)
                            .reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0)}{' '}
                          m
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-[#A1A1AA] mt-1">
                          From estimated task durations
                        </div>
                      </GlassPanel>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <GlassPanel className="p-6">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7] mb-1">
                          14-Day XP Momentum
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-[#A1A1AA] mb-4">
                          Daily XP earned from task completions and daily goal bonuses
                        </p>
                        <div className="relative h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={twoWeekTrendData}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke={
                                  isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'
                                }
                              />
                              <XAxis
                                dataKey="label"
                                tick={{ fill: isDark ? '#A1A1AA' : '#52525B', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fill: isDark ? '#A1A1AA' : '#52525B', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <RechartsTooltip
                                contentStyle={{
                                  backgroundColor: isDark
                                    ? 'rgba(16, 17, 22, 0.92)'
                                    : 'rgba(255, 255, 255, 0.92)',
                                  borderColor: isDark
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'rgba(15, 23, 42, 0.12)',
                                  borderRadius: '16px',
                                  fontSize: '12px',
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="xp"
                                name="XP Earned"
                                stroke="#FF303F"
                                fill="#FF303F"
                                fillOpacity={0.22}
                                strokeWidth={2.5}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </GlassPanel>

                      <GlassPanel className="p-6">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7] mb-1">
                          Tasks by Category
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-[#A1A1AA] mb-4">
                          Completed vs. pending tasks across your categories
                        </p>
                        <div className="relative h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={categoryStatsData}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke={
                                  isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'
                                }
                              />
                              <XAxis
                                dataKey="name"
                                tick={{ fill: isDark ? '#A1A1AA' : '#52525B', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                allowDecimals={false}
                                tick={{ fill: isDark ? '#A1A1AA' : '#52525B', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <RechartsTooltip
                                contentStyle={{
                                  backgroundColor: isDark
                                    ? 'rgba(16, 17, 22, 0.92)'
                                    : 'rgba(255, 255, 255, 0.92)',
                                  borderColor: isDark
                                    ? 'rgba(255, 255, 255, 0.12)'
                                    : 'rgba(15, 23, 42, 0.12)',
                                  borderRadius: '16px',
                                  fontSize: '12px',
                                }}
                              />
                              <Bar
                                dataKey="completed"
                                name="Completed"
                                stackId="a"
                                fill="#10B981"
                                radius={[0, 0, 0, 0]}
                              />
                              <Bar
                                dataKey="pending"
                                name="Pending"
                                stackId="a"
                                fill="#FF303F"
                                radius={[8, 8, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </GlassPanel>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* DESTINATION 4: ORGANIZED EXPANDABLE SETTINGS HUB               */}
            {/* ============================================================== */}
            {activeSection === 'settings' && (
              <div className="max-w-3xl mx-auto space-y-4">
                <GlassPanel className="p-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-[#F5F5F7] tracking-tight">
                    Settings Hub
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-[#A1A1AA] mt-1">
                    Select any category below to configure your profile, goals, reminders, streaks,
                    or local data backups.
                  </p>
                </GlassPanel>

                {/* CATEGORY A: Profile & Appearance */}
                <GlassPanel className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSettingsCategory((prev) => (prev === 'profile' ? null : 'profile'))
                    }
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <GlassIconContainer tone="crimson" size="md">
                        <User className="w-5 h-5" />
                      </GlassIconContainer>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                          Profile &amp; Appearance
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                          Username ({appState.settings.userName}), {appState.settings.theme} theme,
                          week start, and motion preferences
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${
                        expandedSettingsCategory === 'profile' ? 'rotate-180 text-[#FF303F]' : ''
                      }`}
                    />
                  </button>

                  {expandedSettingsCategory === 'profile' && (
                    <div className="px-5 pb-5 pt-2 border-t border-black/5 dark:border-white/10 space-y-4">
                      <form onSubmit={handleSaveProfileUsername} className="space-y-1.5">
                        <label
                          htmlFor="settings-username-input"
                          className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA]"
                        >
                          Username
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="settings-username-input"
                            type="text"
                            maxLength={28}
                            value={profileNameDraft}
                            onChange={(e) => {
                              setProfileNameDraft(e.target.value);
                              setProfileNameError('');
                            }}
                            className="flex-1 rounded-2xl px-3.5 py-2 text-sm sf-glass-input"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-2xl text-xs font-bold sf-crimson-btn sf-tactile-press"
                          >
                            Save Username
                          </button>
                        </div>
                        {profileNameError && (
                          <p className="text-xs text-[#FF303F]">{profileNameError}</p>
                        )}
                      </form>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1.5">
                          Theme Preference
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() =>
                                setAppState((prev) => ({
                                  ...prev,
                                  settings: { ...prev.settings, theme: mode },
                                }))
                              }
                              className={`py-2.5 px-3 rounded-2xl text-xs font-semibold capitalize flex items-center justify-center gap-1.5 transition-all sf-tactile-press ${
                                appState.settings.theme === mode
                                  ? 'sf-crimson-btn'
                                  : 'sf-glass-subtle text-zinc-700 dark:text-zinc-200'
                              }`}
                            >
                              {mode === 'light' && <Sun className="w-3.5 h-3.5" />}
                              {mode === 'dark' && <Moon className="w-3.5 h-3.5" />}
                              {mode === 'system' && <Monitor className="w-3.5 h-3.5" />}
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                            Week Starts On
                          </label>
                          <select
                            value={appState.settings.weekStartsOn}
                            onChange={(e) =>
                              setAppState((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  weekStartsOn: Number(e.target.value) === 0 ? 0 : 1,
                                },
                              }))
                            }
                            className="w-full rounded-2xl px-3 py-2 text-sm sf-glass-input"
                          >
                            <option value={1}>Monday</option>
                            <option value={0}>Sunday</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-2xl sf-glass-subtle">
                          <div>
                            <div className="text-xs font-bold">Reduced Motion</div>
                            <div className="text-[11px] text-zinc-500 dark:text-[#A1A1AA]">
                              Minimize animations
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setAppState((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  reducedMotion: !prev.settings.reducedMotion,
                                },
                              }))
                            }
                            className={`px-3 py-1 rounded-xl text-xs font-bold ${
                              appState.settings.reducedMotion
                                ? 'sf-crimson-btn'
                                : 'sf-glass-input text-zinc-500'
                            }`}
                          >
                            {appState.settings.reducedMotion ? 'Enabled' : 'Off'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </GlassPanel>

                {/* CATEGORY B: Goals & Rewards */}
                <GlassPanel className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSettingsCategory((prev) => (prev === 'goals' ? null : 'goals'))
                    }
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <GlassIconContainer tone="emerald" size="md">
                        <Target className="w-5 h-5" />
                      </GlassIconContainer>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                          Goals &amp; Rewards
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                          Daily target ({appState.settings.dailyGoalTarget}{' '}
                          {appState.settings.dailyGoalType}) and priority XP reward values
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${
                        expandedSettingsCategory === 'goals' ? 'rotate-180 text-[#FF303F]' : ''
                      }`}
                    />
                  </button>

                  {expandedSettingsCategory === 'goals' && (
                    <div className="px-5 pb-5 pt-2 border-t border-black/5 dark:border-white/10 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                            Daily Goal Type
                          </label>
                          <select
                            value={appState.settings.dailyGoalType}
                            onChange={(e) => {
                              const nextType = e.target.value as DailyGoalType;
                              setAppState((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  dailyGoalType: nextType,
                                  dailyGoalTarget: nextType === 'xp' ? 60 : 3,
                                },
                              }));
                            }}
                            className="w-full rounded-2xl px-3 py-2 text-sm sf-glass-input"
                          >
                            <option value="tasks">Completed Tasks</option>
                            <option value="xp">Earned Task XP</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                            Daily Target (
                            {appState.settings.dailyGoalType === 'tasks' ? 'Tasks' : 'XP'})
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={appState.settings.dailyGoalTarget}
                            onChange={(e) =>
                              setAppState((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  dailyGoalTarget: Math.max(1, Number(e.target.value) || 1),
                                },
                              }))
                            }
                            className="w-full rounded-2xl px-3 py-2 text-sm sf-glass-input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['HIGH', 'MEDIUM', 'LOW', 'DAILY_GOAL_BONUS'] as const).map((key) => (
                          <div key={key}>
                            <label className="block text-[11px] font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                              {key === 'DAILY_GOAL_BONUS' ? 'Goal Bonus' : `${key} XP`}
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={appState.settings.xpRewards[key]}
                              onChange={(e) =>
                                setAppState((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    xpRewards: {
                                      ...prev.settings.xpRewards,
                                      [key]: Math.max(1, Number(e.target.value) || 10),
                                    },
                                  },
                                }))
                              }
                              className="w-full rounded-2xl px-2.5 py-1.5 text-sm sf-glass-input"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </GlassPanel>

                {/* CATEGORY C: Tasks & Categories */}
                <GlassPanel className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSettingsCategory((prev) => (prev === 'tasks' ? null : 'tasks'))
                    }
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <GlassIconContainer tone="amber" size="md">
                        <Sliders className="w-5 h-5" />
                      </GlassIconContainer>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                          Tasks &amp; Categories
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                          Manage {appState.categories.length} task categories and default sorting
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${
                        expandedSettingsCategory === 'tasks' ? 'rotate-180 text-[#FF303F]' : ''
                      }`}
                    />
                  </button>

                  {expandedSettingsCategory === 'tasks' && (
                    <div className="px-5 pb-5 pt-2 border-t border-black/5 dark:border-white/10 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                          Default Task Sorting
                        </label>
                        <select
                          value={appState.settings.defaultSortBy}
                          onChange={(e) => {
                            const nextSort = e.target.value as SortOption;
                            setSortBy(nextSort);
                            setAppState((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, defaultSortBy: nextSort },
                            }));
                          }}
                          className="w-full rounded-2xl px-3 py-2 text-sm sf-glass-input"
                        >
                          <option value="SMART">Smart Default (Overdue &gt; Priority)</option>
                          <option value="PRIORITY">Highest Priority First</option>
                          <option value="DUE_DATE">Earliest Due Date First</option>
                          <option value="CREATED_DATE">Newest Created First</option>
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {appState.categories.map((cat) => {
                          const isDefault = DEFAULT_CATEGORIES.includes(cat);
                          return (
                            <span
                              key={cat}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-semibold sf-glass-subtle text-zinc-700 dark:text-zinc-200"
                            >
                              {cat}
                              {!isDefault && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAppState((prev) => ({
                                      ...prev,
                                      categories: prev.categories.filter((c) => c !== cat),
                                    }))
                                  }
                                  aria-label={`Remove category ${cat}`}
                                  className="text-zinc-400 hover:text-[#FF303F]"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const trimmed = newCategoryInput.trim();
                          if (!trimmed) return;
                          if (
                            appState.categories.some(
                              (c) => c.toLowerCase() === trimmed.toLowerCase()
                            )
                          ) {
                            setCategoryError('Category already exists.');
                            return;
                          }
                          setCategoryError('');
                          setAppState((prev) => ({
                            ...prev,
                            categories: [...prev.categories, trimmed],
                          }));
                          setNewCategoryInput('');
                          pushToast('Category Added', `"${trimmed}" is now available`, 'success');
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={newCategoryInput}
                          onChange={(e) => {
                            setNewCategoryInput(e.target.value);
                            setCategoryError('');
                          }}
                          placeholder="Add custom category..."
                          className="flex-1 rounded-2xl px-3.5 py-2 text-sm sf-glass-input"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-2xl sf-crimson-btn text-xs font-semibold sf-tactile-press"
                        >
                          Add
                        </button>
                      </form>
                      {categoryError && <p className="text-xs text-[#FF303F]">{categoryError}</p>}
                    </div>
                  )}
                </GlassPanel>

                {/* CATEGORY D: Reminders & Notifications */}
                <GlassPanel className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSettingsCategory((prev) =>
                        prev === 'reminders' ? null : 'reminders'
                      )
                    }
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <GlassIconContainer tone="crimson" size="md">
                        <BellRing className="w-5 h-5" />
                      </GlassIconContainer>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                          Reminders &amp; Notifications
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                          Schedule ({appState.settings.reminders.frequency}), quiet hours,
                          categories, and browser alerts
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${
                        expandedSettingsCategory === 'reminders'
                          ? 'rotate-180 text-[#FF303F]'
                          : ''
                      }`}
                    />
                  </button>

                  {expandedSettingsCategory === 'reminders' && (
                    <div className="px-5 pb-5 pt-2 border-t border-black/5 dark:border-white/10 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleTriggerSmartReminderCheck(true)}
                          className="px-3.5 py-2 rounded-2xl text-xs font-semibold sf-glass-subtle text-[#FF303F] sf-tactile-press"
                        >
                          Send Test Notification
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateReminderPrefs({
                              masterEnabled: !appState.settings.reminders.masterEnabled,
                            })
                          }
                          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all sf-tactile-press ${
                            appState.settings.reminders.masterEnabled
                              ? 'sf-crimson-btn'
                              : 'sf-glass-subtle text-zinc-500'
                          }`}
                        >
                          {appState.settings.reminders.masterEnabled
                            ? 'Reminders Active'
                            : 'Reminders Off'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                            Reminder Frequency
                          </label>
                          <select
                            value={appState.settings.reminders.frequency}
                            onChange={(e) =>
                              updateReminderPrefs({
                                frequency: e.target.value as ReminderFrequency,
                              })
                            }
                            className="w-full rounded-2xl px-3 py-2 text-sm sf-glass-input"
                          >
                            <option value="off">Off</option>
                            <option value="once">Once a day</option>
                            <option value="twice">Twice a day</option>
                            <option value="thrice">Three times a day</option>
                            <option value="custom">Custom schedule</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                            Daily Reminder Limit
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={appState.settings.reminders.dailyLimit}
                            onChange={(e) =>
                              updateReminderPrefs({
                                dailyLimit: Math.max(1, Number(e.target.value) || 3),
                              })
                            }
                            className="w-full rounded-2xl px-3 py-2 text-sm sf-glass-input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                            Morning
                          </label>
                          <input
                            type="time"
                            value={appState.settings.reminders.morningTime}
                            onChange={(e) => updateReminderPrefs({ morningTime: e.target.value })}
                            className="w-full rounded-2xl px-2.5 py-1.5 text-xs sf-glass-input"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                            Afternoon
                          </label>
                          <input
                            type="time"
                            value={appState.settings.reminders.afternoonTime}
                            onChange={(e) => updateReminderPrefs({ afternoonTime: e.target.value })}
                            className="w-full rounded-2xl px-2.5 py-1.5 text-xs sf-glass-input"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                            Evening
                          </label>
                          <input
                            type="time"
                            value={appState.settings.reminders.eveningTime}
                            onChange={(e) => updateReminderPrefs({ eveningTime: e.target.value })}
                            className="w-full rounded-2xl px-2.5 py-1.5 text-xs sf-glass-input"
                          />
                        </div>
                      </div>

                      {appState.settings.reminders.frequency === 'custom' && (
                        <div className="p-3.5 rounded-2xl sf-glass-subtle space-y-2">
                          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                            Custom Schedule Times
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {appState.settings.reminders.customTimes.map((ct) => (
                              <span
                                key={ct}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#FF303F]/15 text-[#FF303F]"
                              >
                                {ct}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateReminderPrefs({
                                      customTimes:
                                        appState.settings.reminders.customTimes.filter(
                                          (x) => x !== ct
                                        ),
                                    })
                                  }
                                  aria-label={`Remove custom time ${ct}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="time"
                              value={customTimeInput}
                              onChange={(e) => setCustomTimeInput(e.target.value)}
                              className="rounded-xl px-2.5 py-1 text-xs sf-glass-input"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  customTimeInput &&
                                  !appState.settings.reminders.customTimes.includes(customTimeInput)
                                ) {
                                  updateReminderPrefs({
                                    customTimes: [
                                      ...appState.settings.reminders.customTimes,
                                      customTimeInput,
                                    ].sort(),
                                  });
                                }
                              }}
                              className="px-3 py-1 rounded-xl sf-crimson-btn text-xs font-semibold"
                            >
                              Add Time
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="p-3.5 rounded-2xl sf-glass-subtle space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold">Quiet Hours</div>
                            <div className="text-[11px] text-zinc-500 dark:text-[#A1A1AA]">
                              Suppress reminders during rest hours
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateReminderPrefs({
                                quietHoursEnabled: !appState.settings.reminders.quietHoursEnabled,
                              })
                            }
                            className={`px-3 py-1 rounded-xl text-xs font-bold ${
                              appState.settings.reminders.quietHoursEnabled
                                ? 'sf-crimson-btn'
                                : 'sf-glass-input text-zinc-500'
                            }`}
                          >
                            {appState.settings.reminders.quietHoursEnabled ? 'Active' : 'Off'}
                          </button>
                        </div>

                        {appState.settings.reminders.quietHoursEnabled && (
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-semibold text-zinc-400 mb-0.5">
                                Quiet Starts
                              </label>
                              <input
                                type="time"
                                value={appState.settings.reminders.quietHoursStart}
                                onChange={(e) =>
                                  updateReminderPrefs({ quietHoursStart: e.target.value })
                                }
                                className="w-full rounded-xl px-2.5 py-1 text-xs sf-glass-input"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-zinc-400 mb-0.5">
                                Quiet Ends
                              </label>
                              <input
                                type="time"
                                value={appState.settings.reminders.quietHoursEnd}
                                onChange={(e) =>
                                  updateReminderPrefs({ quietHoursEnd: e.target.value })
                                }
                                className="w-full rounded-xl px-2.5 py-1 text-xs sf-glass-input"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1.5">
                          Active Reminder Days
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dLabel, idx) => {
                            const selected = appState.settings.reminders.activeDays.includes(idx);
                            return (
                              <button
                                key={dLabel}
                                type="button"
                                onClick={() => {
                                  const next = selected
                                    ? appState.settings.reminders.activeDays.filter(
                                        (x) => x !== idx
                                      )
                                    : [...appState.settings.reminders.activeDays, idx].sort();
                                  updateReminderPrefs({ activeDays: next });
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  selected ? 'sf-crimson-btn' : 'sf-glass-subtle text-zinc-500'
                                }`}
                              >
                                {dLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(
                          [
                            { key: 'pendingTasks', label: 'Pending Tasks' },
                            { key: 'highPriority', label: 'High-Priority Tasks' },
                            { key: 'upcomingDeadlines', label: 'Upcoming Deadlines' },
                            { key: 'dailyGoalProgress', label: 'Daily Goal Progress' },
                            { key: 'streakProtection', label: 'Streak Support' },
                            {
                              key: 'achievementCelebrations',
                              label: 'Achievement Celebrations',
                            },
                          ] as Array<{ key: keyof ReminderCategoriesConfig; label: string }>
                        ).map((item) => {
                          const enabled = appState.settings.reminders.categories[item.key];
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => toggleReminderCategory(item.key)}
                              className={`p-3 rounded-2xl text-left flex items-center justify-between text-xs font-semibold transition-all sf-tactile-press ${
                                enabled
                                  ? 'bg-[#FF303F]/15 text-zinc-900 dark:text-[#F5F5F7] border border-[#FF303F]/35'
                                  : 'sf-glass-subtle text-zinc-500'
                              }`}
                            >
                              <span>{item.label}</span>
                              <span
                                className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                  enabled ? 'sf-crimson-btn' : 'bg-zinc-300/60'
                                }`}
                              >
                                {enabled && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl sf-glass-subtle">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleToggleBrowserNotifications}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                              appState.settings.notificationsEnabled
                                ? 'bg-emerald-600 text-white'
                                : 'sf-glass-input text-zinc-700 dark:text-zinc-200'
                            }`}
                          >
                            <Bell className="w-3.5 h-3.5" />
                            {appState.settings.notificationsEnabled
                              ? 'Browser Alerts Active'
                              : 'Enable Browser Alerts'}
                          </button>

                          {appState.settings.reminders.pausedUntil &&
                          new Date(appState.settings.reminders.pausedUntil).getTime() >
                            Date.now() ? (
                            <button
                              type="button"
                              onClick={() => updateReminderPrefs({ pausedUntil: null })}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                              Resume
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const until = new Date(
                                  Date.now() + 2 * 60 * 60 * 1000
                                ).toISOString();
                                updateReminderPrefs({ pausedUntil: until });
                                pushToast('Reminders Paused', 'Snoozed for 2 hours', 'info');
                              }}
                              className="px-3 py-1.5 rounded-xl sf-glass-input text-xs font-semibold flex items-center gap-1"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                              Pause 2h
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            updateReminderPrefs({
                              soundEffects: !appState.settings.reminders.soundEffects,
                            })
                          }
                          className="p-2 rounded-xl sf-glass-input text-zinc-600 dark:text-zinc-300"
                          title="Toggle celebration sound effects"
                          aria-label="Toggle celebration sound effects"
                        >
                          {appState.settings.reminders.soundEffects ? (
                            <Volume2 className="w-4 h-4 text-[#FF303F]" />
                          ) : (
                            <VolumeX className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </GlassPanel>

                {/* CATEGORY E: Streaks & Achievements */}
                <GlassPanel className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSettingsCategory((prev) => (prev === 'streaks' ? null : 'streaks'))
                    }
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <GlassIconContainer tone="crimson" size="md">
                        <Flame className="w-5 h-5" />
                      </GlassIconContainer>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                          Streaks &amp; Achievements
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                          Early Bird cutoff ({appState.settings.earlyBirdCutoffHour}:00 AM) and
                          Priority Pro target ({appState.settings.priorityProTarget} tasks)
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${
                        expandedSettingsCategory === 'streaks' ? 'rotate-180 text-[#FF303F]' : ''
                      }`}
                    />
                  </button>

                  {expandedSettingsCategory === 'streaks' && (
                    <div className="px-5 pb-5 pt-2 border-t border-black/5 dark:border-white/10 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                            Early Bird Cutoff Hour
                          </label>
                          <select
                            value={appState.settings.earlyBirdCutoffHour}
                            onChange={(e) =>
                              setAppState((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  earlyBirdCutoffHour: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full rounded-2xl px-3 py-2 text-sm sf-glass-input"
                          >
                            <option value={7}>7:00 AM</option>
                            <option value={8}>8:00 AM</option>
                            <option value={9}>9:00 AM</option>
                            <option value={10}>10:00 AM</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                            Priority Pro Target (High-Priority Tasks)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={appState.settings.priorityProTarget}
                            onChange={(e) =>
                              setAppState((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  priorityProTarget: Math.max(1, Number(e.target.value) || 10),
                                },
                              }))
                            }
                            className="w-full rounded-2xl px-3 py-2 text-sm sf-glass-input"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </GlassPanel>

                {/* CATEGORY F: Data & Privacy */}
                <GlassPanel className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSettingsCategory((prev) => (prev === 'data' ? null : 'data'))
                    }
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <GlassIconContainer tone="emerald" size="md">
                        <Database className="w-5 h-5" />
                      </GlassIconContainer>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                          Data &amp; Privacy
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                          Export JSON backup, import validated data, or reset application state
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${
                        expandedSettingsCategory === 'data' ? 'rotate-180 text-[#FF303F]' : ''
                      }`}
                    />
                  </button>

                  {expandedSettingsCategory === 'data' && (
                    <div className="px-5 pb-5 pt-2 border-t border-black/5 dark:border-white/10 space-y-4">
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={handleDownloadBackupJson}
                          className="px-3.5 py-2 rounded-2xl sf-crimson-btn text-xs font-semibold flex items-center gap-1.5 sf-tactile-press"
                        >
                          <Download className="w-4 h-4" />
                          Export JSON File
                        </button>

                        <button
                          type="button"
                          onClick={() => setExportModalOpen(true)}
                          className="px-3.5 py-2 rounded-2xl sf-glass-subtle text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 sf-tactile-press"
                        >
                          <Copy className="w-4 h-4" />
                          View / Copy JSON
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setImportError('');
                            setImportModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-2xl sf-glass-subtle text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 sf-tactile-press"
                        >
                          <Upload className="w-4 h-4" />
                          Import JSON
                        </button>
                      </div>

                      <div className="pt-3 border-t border-black/5 dark:border-white/10 flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmModal({
                              open: true,
                              title: 'Reset All Application Data?',
                              message:
                                'This will permanently clear all tasks, completion history, streaks, XP, and achievements back to zero while keeping your username. This action cannot be undone.',
                              confirmLabel: 'Reset Everything to Zero',
                              variant: 'danger',
                              onConfirm: () => {
                                setAppState(createCleanInitialState(appState.settings.userName));
                                setConfirmModal(null);
                                pushToast('Workspace Reset', 'Started with a clean slate', 'info');
                              },
                            })
                          }
                          className="px-3.5 py-2 rounded-2xl bg-[#FF303F]/12 text-[#FF303F] border border-[#FF303F]/30 text-xs font-semibold flex items-center gap-1.5 sf-tactile-press"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reset Application Data
                        </button>
                      </div>
                    </div>
                  )}
                </GlassPanel>

                {/* CATEGORY G: About StreakFlow */}
                <GlassPanel className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSettingsCategory((prev) => (prev === 'about' ? null : 'about'))
                    }
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <GlassIconContainer tone="neutral" size="md">
                        <Info className="w-5 h-5" />
                      </GlassIconContainer>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                          About StreakFlow
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                          Version 3.0.0 · Standalone Black &amp; Crimson Liquid Glass PWA
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${
                        expandedSettingsCategory === 'about' ? 'rotate-180 text-[#FF303F]' : ''
                      }`}
                    />
                  </button>

                  {expandedSettingsCategory === 'about' && (
                    <div className="px-5 pb-5 pt-2 border-t border-black/5 dark:border-white/10 space-y-3 text-xs text-zinc-600 dark:text-[#A1A1AA] leading-relaxed">
                      <p>
                        <strong>StreakFlow v3.0.0</strong> is an independent, local-first
                        Progressive Web App built with React, TypeScript, Tailwind CSS, Recharts,
                        and an Apple-inspired Black &amp; Crimson Liquid Glass design system.
                      </p>
                      <p>
                        <strong>Local-First Privacy &amp; Static Deployment Ready:</strong> Your
                        username, tasks, streak history, and preferences are stored directly in your
                        browser&apos;s local storage with zero external servers or third-party
                        accounts required.
                      </p>
                    </div>
                  )}
                </GlassPanel>
              </div>
            )}
          </main>
        </div>

        {/* ================================================================== */}
        {/* 4-ITEM FLOATING MOBILE LIQUID GLASS BOTTOM NAVIGATION BAR          */}
        {/* ================================================================== */}
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-3 inset-x-4 z-30 sf-glass-elevated rounded-3xl px-3 py-2 flex items-center justify-around"
        >
          {primaryNavItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl text-xs font-semibold transition-all sf-tactile-press ${
                  active
                    ? 'bg-[#FF303F]/15 text-[#FF303F]'
                    : 'text-zinc-500 dark:text-[#A1A1AA]'
                }`}
              >
                {item.icon}
                <span className="mt-0.5 text-[11px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ================================================================== */}
        {/* SMART NOTIFICATION CENTER DRAWER / POPOVER                         */}
        {/* ================================================================== */}
        {notificationCenterOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end p-3 sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Smart Notification Center"
          >
            <div className="sf-glass-elevated rounded-3xl max-w-md w-full h-full max-h-[88vh] flex flex-col p-5 space-y-4 overflow-hidden">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <GlassIconContainer tone="crimson" size="sm">
                    <BellRing className="w-4 h-4" />
                  </GlassIconContainer>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                      Smart Notification Center
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-[#A1A1AA]">
                      {unreadNotificationsCount} unread · Context-aware habit reminders
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationCenterOpen(false)}
                  aria-label="Close Notification Center"
                  className="p-1.5 rounded-xl sf-glass-subtle text-zinc-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex rounded-xl sf-glass-subtle p-0.5">
                  {(['ALL', 'UNREAD', 'IMPORTANT'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setNotifFilter(tab)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        notifFilter === tab
                          ? 'sf-crimson-btn'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleMarkAllNotificationsRead}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold sf-glass-subtle text-zinc-600 dark:text-zinc-300 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationCenterOpen(false);
                      setActiveSection('settings');
                      setExpandedSettingsCategory('reminders');
                    }}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold sf-glass-subtle text-[#FF303F]"
                  >
                    Preferences
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {filteredNotifications.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-2xl sf-glass-subtle space-y-2">
                    <BellOff className="w-8 h-8 text-zinc-400 mx-auto" />
                    <div className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                      No notifications yet
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                      Reminders will appear here as you add tasks and work toward your daily goal.
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        notif.read
                          ? 'sf-glass-subtle opacity-75 border-transparent'
                          : 'sf-glass-card border-[#FF303F]/35'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-[#FF303F] flex-shrink-0" />
                          )}
                          <span className="text-xs font-bold text-zinc-900 dark:text-[#F5F5F7]">
                            {notif.title}
                          </span>
                          {notif.priority === 'important' && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-[#FF303F]/15 text-[#FF303F]">
                              Priority
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notif.read && (
                            <button
                              type="button"
                              onClick={() => handleMarkNotificationRead(notif.id)}
                              title="Mark as read"
                              aria-label={`Mark "${notif.title}" as read`}
                              className="p-1 rounded-lg text-zinc-400 hover:text-[#FF303F]"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDismissNotification(notif.id)}
                            title="Dismiss notification"
                            aria-label={`Dismiss "${notif.title}"`}
                            className="p-1 rounded-lg text-zinc-400 hover:text-[#FF303F]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="mt-1 text-xs text-zinc-600 dark:text-[#A1A1AA] leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400">
                          {formatReadableDate(notif.dateKey)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleNotificationActionClick(notif)}
                          className="px-3 py-1 rounded-xl text-xs font-semibold sf-crimson-btn flex items-center gap-1 sf-tactile-press"
                        >
                          {notif.actionLabel}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-black/5 dark:border-white/10 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => handleTriggerSmartReminderCheck(true)}
                  className="text-xs font-semibold text-[#FF303F] hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Check Reminders Now
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationCenterOpen(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold sf-glass-subtle"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SIGNATURE STREAK & DAILY GOAL CELEBRATION MODAL                    */}
        {/* ================================================================== */}
        {celebrationModal && celebrationModal.open && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Daily Goal and Streak Celebration"
          >
            <div className="sf-glass-elevated rounded-3xl max-w-md w-full p-6 text-center space-y-5 relative overflow-hidden">
              <div className="flex justify-center">
                <LumiMascot
                  mood="STREAK_INCREASED"
                  reducedMotion={appState.settings.reducedMotion}
                  size={88}
                />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#FF303F]/15 text-[#FF303F] border border-[#FF303F]/35">
                  <Flame className="w-4 h-4 fill-current sf-flame-animated" />
                  {celebrationModal.streakIncreased
                    ? 'STREAK CONTINUES!'
                    : 'DAILY GOAL COMPLETE!'}
                </div>

                <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-[#F5F5F7] tracking-tight">
                  {celebrationModal.streakDays}{' '}
                  {celebrationModal.streakDays === 1 ? 'day' : 'days'} of consistency
                </h3>

                <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#A1A1AA]">
                  You showed up for yourself today. Consistency beats perfection!
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-2xl sf-glass-subtle">
                  <div className="text-lg font-extrabold text-emerald-500">
                    {celebrationModal.completedToday}/{celebrationModal.goalTarget}
                  </div>
                  <div className="text-[10px] font-semibold text-zinc-500">Tasks Done</div>
                </div>
                <div className="p-3 rounded-2xl sf-glass-subtle">
                  <div className="text-lg font-extrabold text-[#FF303F]">
                    +{celebrationModal.bonusXp} XP
                  </div>
                  <div className="text-[10px] font-semibold text-zinc-500">Goal Bonus</div>
                </div>
                <div className="p-3 rounded-2xl sf-glass-subtle">
                  <div className="text-lg font-extrabold text-amber-500">
                    +{celebrationModal.totalXpToday} XP
                  </div>
                  <div className="text-[10px] font-semibold text-zinc-500">Total Today</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCelebrationModal(null);
                    setActiveSection('progress');
                    setProgressSubView('calendar');
                  }}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold sf-glass-subtle text-zinc-700 dark:text-zinc-200"
                >
                  View Streak Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setCelebrationModal(null)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold sf-crimson-btn sf-tactile-press"
                >
                  Continue Flow
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* QUEUED ACHIEVEMENT UNLOCK CELEBRATION MODAL                        */}
        {/* ================================================================== */}
        {activeAchievementModalItem && !celebrationModal && (
          <div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Achievement Unlocked"
          >
            <div className="sf-glass-elevated rounded-3xl max-w-sm w-full p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl sf-crimson-btn flex items-center justify-center border border-white/30">
                {renderAchievementIcon(activeAchievementModalItem.icon, 'w-8 h-8')}
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF303F]">
                  Achievement Unlocked!
                </span>
                <h3 className="text-xl font-extrabold text-zinc-900 dark:text-[#F5F5F7]">
                  {activeAchievementModalItem.name}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#A1A1AA]">
                  {activeAchievementModalItem.description}
                </p>
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAchievementQueue((prev) => prev.slice(1));
                    setActiveSection('progress');
                    setProgressSubView('achievements');
                  }}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold sf-glass-subtle"
                >
                  Open Achievements
                </button>
                <button
                  type="button"
                  onClick={() => setAchievementQueue((prev) => prev.slice(1))}
                  className="px-5 py-2 rounded-2xl text-xs font-bold sf-crimson-btn"
                >
                  Awesome!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* MODAL 1: CREATE / EDIT TASK                                        */}
        {/* ================================================================== */}
        {isTaskModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
          >
            <div className="sf-glass-elevated rounded-3xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3
                  id="task-modal-title"
                  className="text-lg font-bold text-zinc-900 dark:text-[#F5F5F7]"
                >
                  {editingTask ? 'Edit Task' : 'Create New Task'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  aria-label="Close modal"
                  className="p-1.5 rounded-xl sf-glass-subtle text-zinc-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTaskModal} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      setFormError('');
                    }}
                    placeholder="What needs to be accomplished?"
                    className="w-full rounded-2xl px-3.5 py-2 text-sm sf-glass-input"
                  />
                  {formError && <p className="text-xs text-[#FF303F] mt-1">{formError}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Add context, sub-steps, or notes..."
                    className="w-full rounded-2xl px-3.5 py-2 text-sm sf-glass-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                      Priority Level
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as Priority)}
                      className="w-full rounded-2xl px-3 py-2 text-sm sf-glass-input"
                    >
                      <option value="HIGH">High (+{appState.settings.xpRewards.HIGH} XP)</option>
                      <option value="MEDIUM">
                        Medium (+{appState.settings.xpRewards.MEDIUM} XP)
                      </option>
                      <option value="LOW">Low (+{appState.settings.xpRewards.LOW} XP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full rounded-2xl px-3 py-2 text-sm sf-glass-input"
                    >
                      {appState.categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full rounded-2xl px-3 py-2 text-xs sm:text-sm sf-glass-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                      Due Time
                    </label>
                    <input
                      type="time"
                      value={formDueTime}
                      onChange={(e) => setFormDueTime(e.target.value)}
                      className="w-full rounded-2xl px-3 py-2 text-xs sm:text-sm sf-glass-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                      Est. Minutes
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={480}
                      value={formMinutes}
                      onChange={(e) => setFormMinutes(e.target.value)}
                      placeholder="30"
                      className="w-full rounded-2xl px-3 py-2 text-xs sm:text-sm sf-glass-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 dark:text-[#A1A1AA] mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="deep-work, sprint, health"
                    className="w-full rounded-2xl px-3.5 py-2 text-sm sf-glass-input"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold sf-glass-subtle text-zinc-700 dark:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-2xl text-xs sm:text-sm font-semibold sf-crimson-btn sf-tactile-press"
                  >
                    {editingTask ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* MODAL 2: ACCESSIBLE CONFIRMATION DIALOG                            */}
        {/* ================================================================== */}
        {confirmModal && confirmModal.open && (
          <div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="sf-glass-elevated rounded-3xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <GlassIconContainer tone="crimson" size="md">
                  <AlertTriangle className="w-5 h-5" />
                </GlassIconContainer>
                <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                  {confirmModal.title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#A1A1AA] leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold sf-glass-subtle text-zinc-700 dark:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold sf-crimson-btn sf-tactile-press"
                >
                  {confirmModal.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* MODAL 3: IMPORT JSON                                               */}
        {/* ================================================================== */}
        {importModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex items-center justify-center p-4">
            <div className="sf-glass-elevated rounded-3xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                  Import StreakFlow Backup JSON
                </h3>
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="p-1.5 rounded-xl sf-glass-subtle text-zinc-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleFileUploadImport}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-[#FF303F]/40 text-[#FF303F] text-xs font-semibold hover:bg-[#FF303F]/10"
                  >
                    Select a .json Backup File from Device
                  </button>
                </div>

                <div className="text-center text-xs text-zinc-400">or paste backup JSON below</div>

                <textarea
                  rows={6}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{"schemaVersion": 3, "tasks": [...]}'
                  className="w-full rounded-2xl p-3 text-xs font-mono sf-glass-input"
                />

                {importError && (
                  <div className="p-3 rounded-2xl bg-[#FF303F]/12 border border-[#FF303F]/30 text-xs text-[#FF303F]">
                    {importError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold sf-glass-subtle"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyImportedJson(importJsonText)}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold sf-crimson-btn"
                >
                  Validate &amp; Import
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* MODAL 4: EXPORT / COPY JSON                                        */}
        {/* ================================================================== */}
        {exportModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex items-center justify-center p-4">
            <div className="sf-glass-elevated rounded-3xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                  StreakFlow JSON Backup
                </h3>
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="p-1.5 rounded-xl sf-glass-subtle text-zinc-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <textarea
                readOnly
                rows={8}
                value={JSON.stringify(appState, null, 2)}
                className="w-full rounded-2xl p-3 text-xs font-mono sf-glass-input"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCopyBackupJson}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold sf-crimson-btn flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy to Clipboard
                </button>
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold sf-glass-subtle"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* MODAL 5: PWA INSTALLATION & OFFLINE ARCHITECTURE                   */}
        {/* ================================================================== */}
        {pwaModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="sf-glass-elevated rounded-3xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GlassIconContainer tone="crimson" size="md">
                    <Smartphone className="w-5 h-5" />
                  </GlassIconContainer>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-[#F5F5F7]">
                      Install StreakFlow PWA
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-[#A1A1AA]">
                      Offline-first architecture · Zero account required
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPwaModalOpen(false)}
                  className="p-1.5 rounded-xl sf-glass-subtle text-zinc-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-zinc-600 dark:text-[#A1A1AA]">
                <div className="p-3.5 rounded-2xl bg-emerald-500/12 border border-emerald-400/25 flex items-center justify-between">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Local Persistence &amp; Offline Shell
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px]">
                    ACTIVE
                  </span>
                </div>

                <p className="leading-relaxed">
                  StreakFlow saves all tasks, streak calendars, and XP progression locally on your
                  device so you never lose data when offline.
                </p>

                {deferredInstallPrompt ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const promptEvent = deferredInstallPrompt as unknown as {
                        prompt: () => Promise<void>;
                      };
                      if (promptEvent && promptEvent.prompt) {
                        await promptEvent.prompt();
                        setDeferredInstallPrompt(null);
                      }
                    }}
                    className="w-full py-2.5 rounded-2xl sf-crimson-btn font-bold text-xs"
                  >
                    Install StreakFlow to Home Screen / Desktop
                  </button>
                ) : (
                  <div className="p-3.5 rounded-2xl sf-glass-subtle space-y-1.5">
                    <div className="font-bold text-zinc-800 dark:text-[#F5F5F7] flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-[#FF303F]" />
                      How to Install on Your Device:
                    </div>
                    <p>
                      • <strong>Desktop Chrome / Edge:</strong> Click the install icon in the
                      address bar.
                    </p>
                    <p>
                      • <strong>iOS Safari:</strong> Tap <em>Share</em> →{' '}
                      <em>Add to Home Screen</em>.
                    </p>
                    <p>
                      • <strong>Android Chrome:</strong> Tap the browser menu (⋮) →{' '}
                      <em>Install app</em>.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setPwaModalOpen(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold sf-glass-subtle"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* LIQUID GLASS FLOATING TOAST NOTIFICATIONS                          */}
        {/* ================================================================== */}
        <div
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto p-3.5 rounded-2xl sf-glass-elevated flex items-start justify-between gap-3 transition-all"
            >
              <div className="flex items-start gap-2.5">
                {t.variant === 'achievement' && (
                  <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                )}
                {t.variant === 'xp' && (
                  <Zap className="w-5 h-5 text-[#FF303F] flex-shrink-0 mt-0.5" />
                )}
                {t.variant === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                )}
                {t.variant === 'warning' && (
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                )}
                {t.variant === 'info' && (
                  <Layers className="w-5 h-5 text-[#FF303F] flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-[#F5F5F7]">
                    {t.title}
                  </div>
                  {t.subtitle && (
                    <div className="text-[11px] text-zinc-600 dark:text-[#A1A1AA] mt-0.5">
                      {t.subtitle}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                aria-label="Dismiss notification"
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
