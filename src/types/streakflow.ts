export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ThemeMode = 'light' | 'dark' | 'system';
export type DailyGoalType = 'tasks' | 'xp';
export type NavView =
  | 'dashboard'
  | 'all-tasks'
  | 'today'
  | 'board'
  | 'calendar'
  | 'achievements'
  | 'statistics'
  | 'settings';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  category: string;
  createdAt: string;
  dueDate?: string;
  dueTime?: string;
  completed: boolean;
  completedAt?: string;
  completedDateKey?: string;
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

export interface UserSettings {
  userName: string;
  theme: ThemeMode;
  dailyGoalType: DailyGoalType;
  dailyGoalTarget: number;
  xpRewards: XpRewardsConfig;
  weekStartsOn: 0 | 1;
  earlyBirdCutoffHour: number;
  priorityProTarget: number;
  notificationsEnabled: boolean;
  reducedMotion: boolean;
}
