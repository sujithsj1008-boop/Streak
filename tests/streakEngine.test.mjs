import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  toLocalDateKey,
  addDaysToKey,
  getTaskXpValue,
  computeApplicationMetrics,
  calculateLevelProgress,
  validateAndMigrateState,
} from '../src/engine/streakEngine.mjs';

test('1. Multiple completions on a single day count as only 1 productive day and award daily bonus once', () => {
  const today = '2026-10-29';
  const settings = { ...DEFAULT_SETTINGS, dailyGoalType: 'tasks', dailyGoalTarget: 2 };
  const tasks = [
    { id: 't1', title: 'Task 1', priority: 'HIGH', category: 'Work', completed: true, completedDateKey: today, completedAt: '2026-10-29T10:00:00.000Z' },
    { id: 't2', title: 'Task 2', priority: 'MEDIUM', category: 'Work', completed: true, completedDateKey: today, completedAt: '2026-10-29T11:00:00.000Z' },
    { id: 't3', title: 'Task 3', priority: 'LOW', category: 'Personal', completed: true, completedDateKey: today, completedAt: '2026-10-29T12:00:00.000Z' },
  ];

  const metrics = computeApplicationMetrics({ tasks, settings, todayKey: today });
  assert.equal(metrics.streakStats.totalProductiveDays, 1);
  assert.equal(metrics.streakStats.currentStreak, 1);
  assert.equal(metrics.dailyProgress.completedTodayCount, 3);
  assert.equal(metrics.dailyProgress.goalReached, true);
  // XP: 30 (HIGH) + 20 (MEDIUM) + 10 (LOW) + 25 (Bonus) = 85
  assert.equal(metrics.dailyProgress.taskXpToday, 60);
  assert.equal(metrics.dailyProgress.bonusXpToday, 25);
  assert.equal(metrics.dailyProgress.earnedXpToday, 85);
  assert.equal(metrics.levelProgress.totalXp, 85);
});

test('2. Completing and uncompleting a task reverses XP and updates daily goal status consistently', () => {
  const today = '2026-10-29';
  const settings = { ...DEFAULT_SETTINGS, dailyGoalType: 'tasks', dailyGoalTarget: 2 };
  const completedTasks = [
    { id: 't1', title: 'Task 1', priority: 'HIGH', completed: true, completedDateKey: today },
    { id: 't2', title: 'Task 2', priority: 'MEDIUM', completed: true, completedDateKey: today },
  ];

  const afterComplete = computeApplicationMetrics({ tasks: completedTasks, settings, todayKey: today });
  assert.equal(afterComplete.dailyProgress.goalReached, true);
  assert.equal(afterComplete.levelProgress.totalXp, 30 + 20 + 25);

  // Now uncomplete t2
  const afterUncomplete = computeApplicationMetrics({
    tasks: [
      completedTasks[0],
      { ...completedTasks[1], completed: false, completedAt: undefined, completedDateKey: undefined },
    ],
    settings,
    todayKey: today,
  });

  assert.equal(afterUncomplete.dailyProgress.completedTodayCount, 1);
  assert.equal(afterUncomplete.dailyProgress.goalReached, false);
  assert.equal(afterUncomplete.streakStats.currentStreak, 0);
  assert.equal(afterUncomplete.levelProgress.totalXp, 30);
});

test('3. Streak calculation handles consecutive days and preserves streak before today qualifies', () => {
  const today = '2026-10-29';
  const d1 = addDaysToKey(today, -3); // 2026-10-26
  const d2 = addDaysToKey(today, -2); // 2026-10-27
  const d3 = addDaysToKey(today, -1); // 2026-10-28 (yesterday)

  const settings = { ...DEFAULT_SETTINGS, dailyGoalType: 'tasks', dailyGoalTarget: 1 };
  const tasks = [
    { id: '1', title: 'D1', priority: 'LOW', completed: true, completedDateKey: d1 },
    { id: '2', title: 'D2', priority: 'LOW', completed: true, completedDateKey: d2 },
    { id: '3', title: 'D3', priority: 'LOW', completed: true, completedDateKey: d3 },
  ];

  // Today not yet completed -> streak is still 3 because yesterday qualified
  const metricsBeforeToday = computeApplicationMetrics({ tasks, settings, todayKey: today });
  assert.equal(metricsBeforeToday.streakStats.currentStreak, 3);
  assert.equal(metricsBeforeToday.streakStats.longestStreak, 3);
  assert.equal(metricsBeforeToday.streakStats.todayQualified, false);

  // Now complete today -> streak becomes 4
  const metricsAfterToday = computeApplicationMetrics({
    tasks: [...tasks, { id: '4', title: 'Today', priority: 'LOW', completed: true, completedDateKey: today }],
    settings,
    todayKey: today,
  });
  assert.equal(metricsAfterToday.streakStats.currentStreak, 4);
  assert.equal(metricsAfterToday.streakStats.longestStreak, 4);
  assert.equal(metricsAfterToday.streakStats.todayQualified, true);
});

test('4. Missing a day resets currentStreak while preserving longestStreak', () => {
  const today = '2026-10-29';
  const settings = { ...DEFAULT_SETTINGS, dailyGoalType: 'tasks', dailyGoalTarget: 1 };
  // 4-day historical streak, then a 1-day gap on 2026-10-28 (yesterday)
  const tasks = [
    { id: '1', title: '1', priority: 'LOW', completed: true, completedDateKey: '2026-10-23' },
    { id: '2', title: '2', priority: 'LOW', completed: true, completedDateKey: '2026-10-24' },
    { id: '3', title: '3', priority: 'LOW', completed: true, completedDateKey: '2026-10-25' },
    { id: '4', title: '4', priority: 'LOW', completed: true, completedDateKey: '2026-10-26' },
  ];

  const metrics = computeApplicationMetrics({ tasks, settings, todayKey: today });
  assert.equal(metrics.streakStats.currentStreak, 0);
  assert.equal(metrics.streakStats.longestStreak, 4);
  assert.equal(metrics.streakStats.totalProductiveDays, 4);
});

test('5. Future dates are never counted as productive days or streak extenders', () => {
  const today = '2026-10-29';
  const tomorrow = '2026-10-30';
  const settings = { ...DEFAULT_SETTINGS, dailyGoalType: 'tasks', dailyGoalTarget: 1 };
  const tasks = [
    { id: '1', title: 'Today', priority: 'HIGH', completed: true, completedDateKey: today },
    { id: '2', title: 'Future', priority: 'HIGH', completed: true, completedDateKey: tomorrow },
  ];

  const metrics = computeApplicationMetrics({ tasks, settings, todayKey: today });
  assert.equal(metrics.streakStats.currentStreak, 1);
  assert.equal(metrics.streakStats.totalProductiveDays, 1);
});

test('6. Deleting a completed task preserves history via archivedCompletions and prevents duplicate IDs', () => {
  const today = '2026-10-29';
  const settings = { ...DEFAULT_SETTINGS, dailyGoalType: 'tasks', dailyGoalTarget: 1 };
  const archivedCompletions = [
    {
      taskId: 'deleted-1',
      title: 'Archived Task',
      priority: 'HIGH',
      category: 'Work',
      completedDateKey: '2026-10-28',
      completedAt: '2026-10-28T10:00:00.000Z',
      xpEarned: 30,
    },
  ];
  const tasks = [
    { id: 'live-1', title: 'Live Task', priority: 'MEDIUM', completed: true, completedDateKey: today },
  ];

  const metrics = computeApplicationMetrics({ tasks, archivedCompletions, settings, todayKey: today });
  assert.equal(metrics.streakStats.currentStreak, 2);
  assert.equal(metrics.streakStats.totalProductiveDays, 2);
  assert.equal(metrics.levelProgress.totalXp, (30 + 25) + (20 + 25));
});

test('7. XP-based daily goal works accurately', () => {
  const today = '2026-10-29';
  const settings = { ...DEFAULT_SETTINGS, dailyGoalType: 'xp', dailyGoalTarget: 50 };
  const tasks = [
    { id: '1', title: 'T1', priority: 'HIGH', completed: true, completedDateKey: today }, // 30 XP
  ];
  const m1 = computeApplicationMetrics({ tasks, settings, todayKey: today });
  assert.equal(m1.dailyProgress.goalReached, false);
  assert.equal(m1.dailyProgress.dailyGoalPercent, 60);

  const m2 = computeApplicationMetrics({
    tasks: [...tasks, { id: '2', title: 'T2', priority: 'MEDIUM', completed: true, completedDateKey: today }], // +20 XP = 50 XP
    settings,
    todayKey: today,
  });
  assert.equal(m2.dailyProgress.goalReached, true);
  assert.equal(m2.dailyProgress.dailyGoalPercent, 100);
});

test('8. Achievements unlock legitimately and preserve original unlock timestamp', () => {
  const today = '2026-10-29';
  const settings = { ...DEFAULT_SETTINGS, dailyGoalType: 'tasks', dailyGoalTarget: 1, earlyBirdCutoffHour: 9, priorityProTarget: 2 };
  // Create a 7-day streak with early morning high priority completions
  const tasks = [];
  for (let i = 0; i < 7; i++) {
    const dk = addDaysToKey(today, -6 + i);
    const earlyLocal = new Date(2026, 9, 23 + i, 7, 30, 0).toISOString();
    tasks.push({
      id: `t-${i}`,
      title: `Task ${i}`,
      priority: 'HIGH',
      completed: true,
      completedDateKey: dk,
      completedAt: earlyLocal,
    });
  }

  const firstRun = computeApplicationMetrics({ tasks, settings, todayKey: today, existingUnlocks: {} });
  const unlockedIds = firstRun.achievements.filter((a) => a.unlocked).map((a) => a.id);
  assert.ok(unlockedIds.includes('FIRST_STEP'));
  assert.ok(unlockedIds.includes('GETTING_STARTED'));
  assert.ok(unlockedIds.includes('CONSISTENT'));
  assert.ok(unlockedIds.includes('WEEK_WARRIOR'));
  assert.ok(unlockedIds.includes('PERFECT_WEEK'));
  assert.ok(unlockedIds.includes('EARLY_BIRD'));
  assert.ok(unlockedIds.includes('PRIORITY_PRO'));
  assert.equal(unlockedIds.includes('TASK_MASTER'), false);

  // Second run with existingUnlocks should report 0 newlyUnlocked
  const secondRun = computeApplicationMetrics({
    tasks,
    settings,
    todayKey: today,
    existingUnlocks: firstRun.updatedUnlocks,
  });
  assert.equal(secondRun.newlyUnlocked.length, 0);
});

test('9. Level progression curve is predictable and accurate', () => {
  const lvl1 = calculateLevelProgress(0);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.nextLevelXpRequired, 100);

  const lvl2 = calculateLevelProgress(100);
  assert.equal(lvl2.level, 2);
  assert.equal(lvl2.currentLevelXp, 0);
  assert.equal(lvl2.nextLevelXpRequired, 150);

  const lvl3 = calculateLevelProgress(250);
  assert.equal(lvl3.level, 3);
  assert.equal(lvl3.currentLevelXp, 0);
  assert.equal(lvl3.nextLevelXpRequired, 200);
});

test('10. Import validation rejects corrupted data and deduplicates task IDs', () => {
  assert.equal(validateAndMigrateState(null).valid, false);
  assert.equal(validateAndMigrateState('invalid').valid, false);
  assert.equal(validateAndMigrateState({ tasks: 'not-an-array' }).valid, false);
  assert.equal(validateAndMigrateState({ tasks: [{ id: '1', title: '' }] }).valid, false);

  const dupResult = validateAndMigrateState({
    tasks: [
      { id: 'dup-1', title: 'First instance', priority: 'HIGH', completed: false },
      { id: 'dup-1', title: 'Duplicate instance', priority: 'LOW', completed: true },
    ],
  });
  assert.equal(dupResult.valid, true);
  assert.equal(dupResult.data.tasks.length, 1);
  assert.equal(dupResult.data.tasks[0].title, 'First instance');
});

test('11. TASK_MASTER achievement unlocks at 100 completed tasks', () => {
  const today = '2026-10-29';
  const tasks = Array.from({ length: 100 }, (_, idx) => ({
    id: `bulk-${idx + 1}`,
    title: `Bulk Task ${idx + 1}`,
    priority: 'LOW',
    category: 'Work',
    completed: true,
    completedDateKey: today,
  }));

  const metrics = computeApplicationMetrics({ tasks, settings: DEFAULT_SETTINGS, todayKey: today });
  const taskMaster = metrics.achievements.find((a) => a.id === 'TASK_MASTER');
  assert.ok(taskMaster);
  assert.equal(taskMaster.unlocked, true);
  assert.equal(taskMaster.progressCurrent, 100);
  assert.equal(taskMaster.progressPercent, 100);
});

test('12. Theme preference and custom settings persist through validateAndMigrateState', () => {
  const result = validateAndMigrateState({
    tasks: [],
    categories: ['Work', 'CustomStudy'],
    settings: {
      theme: 'dark',
      dailyGoalType: 'xp',
      dailyGoalTarget: 80,
      weekStartsOn: 0,
      earlyBirdCutoffHour: 8,
      priorityProTarget: 15,
      reducedMotion: true,
    },
  });

  assert.equal(result.valid, true);
  assert.equal(result.data.settings.theme, 'dark');
  assert.equal(result.data.settings.dailyGoalType, 'xp');
  assert.equal(result.data.settings.dailyGoalTarget, 80);
  assert.equal(result.data.settings.weekStartsOn, 0);
  assert.equal(result.data.settings.earlyBirdCutoffHour, 8);
  assert.equal(result.data.settings.priorityProTarget, 15);
  assert.equal(result.data.settings.reducedMotion, true);
  assert.ok(result.data.categories.includes('CustomStudy'));
});

test('13. Editing a completed task priority recalculates XP without duplicating completion records', () => {
  const today = '2026-10-29';
  const tasksInitial = [
    { id: 'edit-1', title: 'Draft Spec', priority: 'LOW', completed: true, completedDateKey: today },
  ];
  const mLow = computeApplicationMetrics({ tasks: tasksInitial, settings: DEFAULT_SETTINGS, todayKey: today });
  assert.equal(mLow.ledger.length, 1);
  assert.equal(mLow.dailyProgress.taskXpToday, 10);

  const tasksEdited = [
    { id: 'edit-1', title: 'Draft Spec Updated', priority: 'HIGH', completed: true, completedDateKey: today },
  ];
  const mHigh = computeApplicationMetrics({ tasks: tasksEdited, settings: DEFAULT_SETTINGS, todayKey: today });
  assert.equal(mHigh.ledger.length, 1);
  assert.equal(mHigh.dailyProgress.taskXpToday, 30);
});

test('14. Historical calendar aggregation accurately maps multi-month dates', () => {
  const today = '2026-10-29';
  const tasks = [
    { id: 'sep-1', title: 'Sept Task 1', priority: 'HIGH', completed: true, completedDateKey: '2026-09-15' },
    { id: 'sep-2', title: 'Sept Task 2', priority: 'HIGH', completed: true, completedDateKey: '2026-09-15' },
    { id: 'sep-3', title: 'Sept Task 3', priority: 'HIGH', completed: true, completedDateKey: '2026-09-15' },
  ];
  const metrics = computeApplicationMetrics({ tasks, settings: DEFAULT_SETTINGS, todayKey: today });
  const sep15 = metrics.dayMap.get('2026-09-15');
  assert.ok(sep15);
  assert.equal(sep15.completedCount, 3);
  assert.equal(sep15.qualifies, true);
  assert.equal(sep15.totalXp, 30 * 3 + 25);
});

test('15. Local date key formatting handles Date objects and YYYY-MM-DD strings without timezone drift', () => {
  const explicitKey = toLocalDateKey('2026-10-29');
  assert.equal(explicitKey, '2026-10-29');
  const nextDay = addDaysToKey('2026-10-29', 1);
  assert.equal(nextDay, '2026-10-30');
  const prevMonth = addDaysToKey('2026-10-01', -1);
  assert.equal(prevMonth, '2026-09-30');
});
import {
  DEFAULT_REMINDER_PREFERENCES,
  isWithinQuietHours,
  resolveMascotMood,
  generateSmartReminders,
  evaluateCelebrationTrigger,
} from '../src/engine/streakEngine.mjs';

test('16. Quiet hours correctly detect overnight and same-day quiet windows', () => {
  const overnightPrefs = {
    ...DEFAULT_REMINDER_PREFERENCES,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:30',
  };
  assert.equal(isWithinQuietHours('23:15', overnightPrefs), true);
  assert.equal(isWithinQuietHours('06:45', overnightPrefs), true);
  assert.equal(isWithinQuietHours('08:00', overnightPrefs), false);
  assert.equal(isWithinQuietHours('14:30', overnightPrefs), false);

  const disabledPrefs = { ...overnightPrefs, quietHoursEnabled: false };
  assert.equal(isWithinQuietHours('23:15', disabledPrefs), false);
});

test('17. Smart Reminder Engine respects quiet hours, pause state, and daily limits', () => {
  const today = '2026-11-02';
  const tasks = [
    { id: 't1', title: 'High Prio Task', priority: 'HIGH', dueDate: today, completed: false },
  ];
  const dailyProgress = { goalReached: false, completedTodayCount: 1, goalTarget: 3, goalCurrent: 1, goalType: 'tasks' };
  const streakStats = { currentStreak: 4, longestStreak: 4 };

  // During quiet hours (23:00 local)
  const quietDate = new Date(2026, 10, 2, 23, 0, 0);
  const quietResult = generateSmartReminders({
    tasks,
    dailyProgress,
    streakStats,
    reminderPrefs: DEFAULT_REMINDER_PREFERENCES,
    existingNotifications: [],
    now: quietDate,
    todayKey: today,
  });
  assert.equal(quietResult.generated.length, 0);
  assert.equal(quietResult.blockedReason, 'quiet_hours');

  // During active hours (10:00 local) with dailyLimit = 2
  const activeDate = new Date(2026, 10, 2, 10, 0, 0);
  const limitedResult = generateSmartReminders({
    tasks,
    dailyProgress,
    streakStats,
    reminderPrefs: { ...DEFAULT_REMINDER_PREFERENCES, dailyLimit: 2 },
    existingNotifications: [],
    now: activeDate,
    todayKey: today,
  });
  assert.equal(limitedResult.generated.length, 2);
  assert.equal(limitedResult.blockedReason, null);
});

test('18. Smart Reminder Engine prevents duplicate notifications and omits unreached-goal reminders once goal is complete', () => {
  const today = '2026-11-02';
  const activeDate = new Date(2026, 10, 2, 11, 0, 0);
  const tasks = [
    { id: 't1', title: 'Task 1', priority: 'HIGH', dueDate: today, completed: false },
  ];
  const dailyProgress = { goalReached: false, completedTodayCount: 2, goalTarget: 3, goalCurrent: 2, goalType: 'tasks' };
  const streakStats = { currentStreak: 4, longestStreak: 4 };

  const firstPass = generateSmartReminders({
    tasks,
    dailyProgress,
    streakStats,
    reminderPrefs: { ...DEFAULT_REMINDER_PREFERENCES, dailyLimit: 10 },
    existingNotifications: [],
    now: activeDate,
    todayKey: today,
  });
  assert.ok(firstPass.generated.length > 0);

  // Second pass with existingNotifications should produce 0 duplicates
  const secondPass = generateSmartReminders({
    tasks,
    dailyProgress,
    streakStats,
    reminderPrefs: { ...DEFAULT_REMINDER_PREFERENCES, dailyLimit: 10 },
    existingNotifications: firstPass.generated,
    now: activeDate,
    todayKey: today,
  });
  assert.equal(secondPass.generated.length, 0);

  // When daily goal IS reached, never generate "almost at your daily goal" or "streak waiting" reminders
  const goalCompletePass = generateSmartReminders({
    tasks,
    dailyProgress: { goalReached: true, completedTodayCount: 3, goalTarget: 3, goalCurrent: 3, earnedXpToday: 95 },
    streakStats: { currentStreak: 5, longestStreak: 5 },
    reminderPrefs: { ...DEFAULT_REMINDER_PREFERENCES, dailyLimit: 10 },
    existingNotifications: [],
    now: activeDate,
    todayKey: today,
  });
  assert.ok(goalCompletePass.generated.some((n) => n.dedupeKey === `goal_completed:${today}`));
  assert.equal(goalCompletePass.generated.some((n) => n.dedupeKey.startsWith('daily_progress:')), false);
  assert.equal(goalCompletePass.generated.some((n) => n.dedupeKey.startsWith('streak_support:')), false);
});

test('19. Mascot emotional states adapt accurately to progress and missed days', () => {
  assert.equal(
    resolveMascotMood({
      recentEventMood: 'STREAK_INCREASED',
      dailyProgress: { goalReached: true, completedTodayCount: 3 },
      streakStats: { currentStreak: 5, longestStreak: 5 },
    }),
    'STREAK_INCREASED'
  );

  assert.equal(
    resolveMascotMood({
      recentEventMood: null,
      dailyProgress: { goalReached: true, completedTodayCount: 3 },
      streakStats: { currentStreak: 5, longestStreak: 5 },
    }),
    'DAILY_GOAL_REACHED'
  );

  assert.equal(
    resolveMascotMood({
      recentEventMood: null,
      dailyProgress: { goalReached: false, completedTodayCount: 0 },
      streakStats: { currentStreak: 0, longestStreak: 4 },
    }),
    'MISSED_A_DAY'
  );

  assert.equal(
    resolveMascotMood({
      recentEventMood: null,
      dailyProgress: { goalReached: false, completedTodayCount: 0 },
      streakStats: { currentStreak: 3, longestStreak: 3 },
    }),
    'NO_TASKS_COMPLETED'
  );
});

test('20. Celebration deduplication triggers once per qualifying day and never replays on reload', () => {
  const today = '2026-11-02';
  const firstTrigger = evaluateCelebrationTrigger({
    wasGoalReachedBefore: false,
    isGoalReachedAfter: true,
    previousStreak: 4,
    newStreak: 5,
    todayKey: today,
    celebratedGoalDates: {},
    celebratedStreakDates: {},
  });
  assert.equal(firstTrigger.triggerDailyGoalCelebration, true);
  assert.equal(firstTrigger.triggerStreakCelebration, true);

  // Subsequent completion or reload on the same day must NOT re-trigger full celebration
  const secondTrigger = evaluateCelebrationTrigger({
    wasGoalReachedBefore: false,
    isGoalReachedAfter: true,
    previousStreak: 4,
    newStreak: 5,
    todayKey: today,
    celebratedGoalDates: firstTrigger.nextCelebratedGoalDates,
    celebratedStreakDates: firstTrigger.nextCelebratedStreakDates,
  });
  assert.equal(secondTrigger.triggerDailyGoalCelebration, false);
  assert.equal(secondTrigger.triggerStreakCelebration, false);
});
import {
  validateUsername,
  createCleanInitialState,
  migrateAndCleanDemoData,
} from '../src/engine/streakEngine.mjs';

test('21. Username validation enforces length, whitespace trimming, allowed characters, and control-character rejection', () => {
  assert.equal(validateUsername('').valid, false);
  assert.equal(validateUsername('   ').valid, false);
  assert.equal(validateUsername('A').valid, false);
  assert.equal(validateUsername('A'.repeat(25)).valid, false);
  assert.equal(validateUsername('Alex\x00').valid, false);
  assert.equal(validateUsername('Alex@123!').valid, false);

  const validRes = validateUsername('  Alex_Flow-01  ');
  assert.equal(validRes.valid, true);
  assert.equal(validRes.trimmed, 'Alex_Flow-01');
});

test('22. Fresh installation initializes a genuinely empty zero-state workspace before and after username onboarding', () => {
  const preOnboarding = createCleanInitialState('');
  assert.equal(preOnboarding.hasCompletedOnboarding, false);
  assert.equal(preOnboarding.tasks.length, 0);
  assert.equal(preOnboarding.notifications.length, 0);
  assert.equal(preOnboarding.xpActivity.length, 0);
  assert.equal(Object.keys(preOnboarding.unlockedAchievements).length, 0);

  const postOnboarding = createCleanInitialState('Maya');
  assert.equal(postOnboarding.hasCompletedOnboarding, true);
  assert.equal(postOnboarding.settings.userName, 'Maya');
  assert.equal(postOnboarding.tasks.length, 0);

  const metrics = computeApplicationMetrics({
    tasks: postOnboarding.tasks,
    archivedCompletions: postOnboarding.archivedCompletions,
    settings: postOnboarding.settings,
    existingUnlocks: postOnboarding.unlockedAchievements,
    todayKey: '2026-11-02',
  });
  assert.equal(metrics.streakStats.currentStreak, 0);
  assert.equal(metrics.streakStats.longestStreak, 0);
  assert.equal(metrics.streakStats.totalProductiveDays, 0);
  assert.equal(metrics.levelProgress.totalXp, 0);
  assert.equal(metrics.levelProgress.level, 1);
  assert.equal(metrics.dailyProgress.completedTodayCount, 0);
  assert.equal(metrics.dailyProgress.dailyGoalPercent, 0);
  assert.equal(metrics.achievements.filter((a) => a.unlocked).length, 0);
});

test('23. Safe migration strips hardcoded seed-* demo records while preserving legitimate user-created tasks', () => {
  const mixedState = {
    schemaVersion: 2,
    tasks: [
      { id: 'seed-t1', title: 'Demo Task', priority: 'HIGH', completed: true, completedDateKey: '2026-11-02' },
      { id: 'task-real-1', title: 'My Real Task', priority: 'HIGH', completed: true, completedDateKey: '2026-11-02' },
    ],
    settings: { userName: 'Jordan', theme: 'dark' },
    unlockedAchievements: { FIRST_STEP: '2026-11-02T10:00:00.000Z' },
  };

  const migrated = migrateAndCleanDemoData(mixedState);
  assert.equal(migrated.valid, true);
  assert.equal(migrated.data.tasks.length, 1);
  assert.equal(migrated.data.tasks[0].id, 'task-real-1');
  assert.equal(migrated.data.hasCompletedOnboarding, true);
  assert.equal(migrated.data.settings.userName, 'Jordan');
  assert.ok(migrated.data.unlockedAchievements.FIRST_STEP);
});

test('24. Pure legacy demo seed state resets to clean pre-onboarding state', () => {
  const pureDemoState = {
    schemaVersion: 2,
    tasks: [
      { id: 'seed-t1', title: 'Demo Task 1', priority: 'HIGH', completed: true, completedDateKey: '2026-11-02' },
      { id: 'seed-t2', title: 'Demo Task 2', priority: 'MEDIUM', completed: false },
    ],
    settings: { userName: 'Alex', theme: 'dark' },
    unlockedAchievements: { FIRST_STEP: '2026-11-02T10:00:00.000Z' },
  };

  const migrated = migrateAndCleanDemoData(pureDemoState);
  assert.equal(migrated.valid, true);
  assert.equal(migrated.data.hasCompletedOnboarding, false);
  assert.equal(migrated.data.tasks.length, 0);
  assert.equal(Object.keys(migrated.data.unlockedAchievements).length, 0);
});
