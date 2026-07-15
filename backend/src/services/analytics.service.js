'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { InternalError } = require('../utils/errors');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthLabel(isoDate) {
  return new Date(isoDate + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function last6MonthKeys() {
  const keys = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

// Derive 0–100 wellness score from the three columns that actually exist in health_logs.
// fatigue/soreness: 1=good, 5=bad → invert.  sleep_quality: 1=bad, 5=good → direct.
function computeWellnessScore(row) {
  const fat = (5 - row.fatigue)       / 4;  // 1→1.0, 5→0.0
  const sor = (5 - row.soreness)      / 4;
  const slp = (row.sleep_quality - 1) / 4;  // 1→0.0, 5→1.0
  return Math.round(((fat + sor + slp) / 3) * 100);
}

// ─── Fee Analytics (Admin) ────────────────────────────────────────────────────

async function getFeesAnalytics({ academyId, startDate, endDate }) {
  let query = supabaseAdmin
    .from('fee_ledger')
    .select(`
      amount_owed, amount_paid, payment_method, created_at, player_id,
      player:users!fee_ledger_player_id_fkey (id, first_name, last_name)
    `)
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false });

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate)   query = query.lte('created_at', endDate);

  const { data: fees, error } = await query;

  if (error) throw new InternalError('Failed to fetch fee analytics.');

  const rows = fees || [];

  // KPIs
  const totalOwed       = rows.reduce((s, f) => s + f.amount_owed, 0);
  const totalCollected  = rows.reduce((s, f) => s + f.amount_paid, 0);
  const outstanding     = totalOwed - totalCollected;
  const collectionRate  = totalOwed > 0 ? Math.round((totalCollected / totalOwed) * 100) : 0;
  const overdueCount    = rows.filter(f => f.amount_owed - f.amount_paid > 0).length;

  // Monthly collection trend (last 6 months)
  const monthlyMap = {};
  last6MonthKeys().forEach(k => {
    monthlyMap[k] = { month: monthLabel(k), key: k, collected: 0, owed: 0 };
  });
  rows.forEach(f => {
    const d = new Date(f.created_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyMap[k]) {
      monthlyMap[k].collected += f.amount_paid;
      monthlyMap[k].owed      += f.amount_owed;
    }
  });
  const monthlyTrend = Object.values(monthlyMap).map(m => ({
    month:        m.month,
    collected:    +(m.collected / 100).toFixed(2),
    owed:         +(m.owed / 100).toFixed(2),
    outstanding:  +((m.owed - m.collected) / 100).toFixed(2),
  }));

  // Sparkline (last 6 months collected)
  const sparkline = monthlyTrend.map(m => ({ v: m.collected }));

  // Payment method breakdown
  const methodMap = {};
  rows.forEach(f => {
    const m = f.payment_method || 'Unpaid';
    methodMap[m] = (methodMap[m] || 0) + f.amount_paid;
  });
  const methodBreakdown = Object.entries(methodMap)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value: +(value / 100).toFixed(2) }));

  // Top outstanding players (worst 8)
  const playerMap = {};
  rows.forEach(f => {
    const balance = f.amount_owed - f.amount_paid;
    if (balance <= 0 || !f.player) return;
    if (!playerMap[f.player_id]) playerMap[f.player_id] = { player: f.player, balance: 0 };
    playerMap[f.player_id].balance += balance;
  });
  const topOutstanding = Object.entries(playerMap)
    .sort(([, a], [, b]) => b.balance - a.balance)
    .slice(0, 8)
    .map(([pid, p]) => ({
      id:      pid,
      name:    `${p.player.first_name} ${p.player.last_name}`,
      balance: +(p.balance / 100).toFixed(2),
    }));

  // Recent payments (last 10 paid records)
  const recentPayments = rows
    .filter(f => f.amount_paid > 0)
    .slice(0, 10)
    .map(f => ({
      player: f.player ? `${f.player.first_name} ${f.player.last_name}` : '—',
      amount: +(f.amount_paid / 100).toFixed(2),
      method: f.payment_method ?? 'Cash',
      date:   f.created_at,
      status: (f.amount_owed - f.amount_paid) <= 0 ? 'paid' : 'partial',
    }));

  return {
    kpis: {
      totalCollected: +(totalCollected / 100).toFixed(2),
      totalOwed:      +(totalOwed / 100).toFixed(2),
      outstanding:    +(outstanding / 100).toFixed(2),
      collectionRate,
      overdueCount,
      sparkline,
    },
    monthlyTrend,
    methodBreakdown,
    topOutstanding,
    recentPayments,
  };
}

// ─── Attendance Analytics (Admin + Coach) ─────────────────────────────────────

async function getAttendanceAnalytics({ academyId }) {
  // Fetch past events
  const { data: events, error: evError } = await supabaseAdmin
    .from('events')
    .select('id, title, type, start_time, team_id')
    .eq('academy_id', academyId)
    .lt('start_time', new Date().toISOString())
    .order('start_time', { ascending: false })
    .limit(300);

  if (evError) throw new InternalError('Failed to fetch events for attendance analytics.');

  const eventIds = (events || []).map(e => e.id);
  if (!eventIds.length) return emptyAttendance();

  // Fetch all attendance records for those events
  const { data: attRows, error: attError } = await supabaseAdmin
    .from('attendance')
    .select(`
      event_id, player_id, status,
      player:users!attendance_player_id_fkey (id, first_name, last_name)
    `)
    .eq('academy_id', academyId)
    .in('event_id', eventIds);

  if (attError) throw new InternalError('Failed to fetch attendance records for analytics.');

  const eventMap = Object.fromEntries((events || []).map(e => [e.id, e]));
  const rows = attRows || [];

  // Per-player rates
  // NOTE: attendance.status is stored as 'Present' | 'Absent' | 'Injured' (see
  // database/migrations/002_v1_schema.sql CHECK constraint and
  // attendance.service.js buildSummary()) — there is no 'Late' status in this
  // app. Compare against the real, case-sensitive enum values here.
  const playerStats = {};
  rows.forEach(r => {
    const pid = r.player_id;
    if (!playerStats[pid]) {
      playerStats[pid] = {
        id:      pid,
        name:    r.player ? `${r.player.first_name} ${r.player.last_name}` : '—',
        present: 0, absent: 0, injured: 0, total: 0,
      };
    }
    playerStats[pid].total++;
    if (r.status === 'Present')       playerStats[pid].present++;
    else if (r.status === 'Absent')   playerStats[pid].absent++;
    else if (r.status === 'Injured')  playerStats[pid].injured++;
  });

  const playerRates = Object.values(playerStats).map(p => ({
    ...p,
    rate:        p.total > 0 ? Math.round(((p.present + p.injured * 0.5) / p.total) * 100) : 0,
    gfaEligible: p.total > 0 ? ((p.present + p.injured) / p.total) >= 0.7 : null,
  })).sort((a, b) => b.rate - a.rate);

  // Monthly trend (last 6 months)
  const monthlyMap = {};
  last6MonthKeys().forEach(k => {
    monthlyMap[k] = { month: monthLabel(k), present: 0, absent: 0, injured: 0, total: 0 };
  });
  rows.forEach(r => {
    const ev = eventMap[r.event_id];
    if (!ev) return;
    const d = new Date(ev.start_time);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyMap[k]) {
      monthlyMap[k].total++;
      if (r.status === 'Present')      monthlyMap[k].present++;
      else if (r.status === 'Absent')  monthlyMap[k].absent++;
      else if (r.status === 'Injured') monthlyMap[k].injured++;
    }
  });
  const monthlyTrend = Object.values(monthlyMap).map(m => ({
    month:   m.month,
    present: m.present,
    absent:  m.absent,
    injured: m.injured,
    rate:    m.total > 0 ? Math.round(((m.present + m.injured * 0.5) / m.total) * 100) : 0,
  }));

  // KPIs
  const avgRate        = playerRates.length > 0
    ? Math.round(playerRates.reduce((s, p) => s + p.rate, 0) / playerRates.length) : 0;
  const perfectCount   = playerRates.filter(p => p.rate >= 90).length;
  const belowThreshold = playerRates.filter(p => p.rate < 70 && p.total > 0).length;
  const gfaEligible    = playerRates.filter(p => p.gfaEligible === true).length;
  const gfaAtRisk      = playerRates.filter(p => p.gfaEligible === false).length;

  // Squad availability donut
  const squadAvailability = [
    { name: 'Consistent (≥80%)', value: playerRates.filter(p => p.rate >= 80).length,                           color: '#10B981' },
    { name: 'Irregular (60–79%)', value: playerRates.filter(p => p.rate >= 60 && p.rate < 80).length,          color: '#F59E0B' },
    { name: 'At Risk (<60%)',     value: playerRates.filter(p => p.rate < 60 && p.total > 0).length,            color: '#EF4444' },
  ].filter(s => s.value > 0);

  return {
    kpis: {
      totalSessions: eventIds.length,
      avgRate,
      perfectCount,
      belowThreshold,
      gfaEligible,
      gfaAtRisk,
    },
    monthlyTrend,
    playerRates: playerRates.slice(0, 20),
    squadAvailability,
  };
}

function emptyAttendance() {
  return {
    kpis: { totalSessions: 0, avgRate: 0, perfectCount: 0, belowThreshold: 0, gfaEligible: 0, gfaAtRisk: 0 },
    monthlyTrend:       [],
    playerRates:        [],
    squadAvailability:  [],
  };
}

// ─── Wellness Analytics (Admin + Coach) ───────────────────────────────────────

async function getWellnessAnalytics({ academyId, days = 30 }) {
  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  const { data: logs, error } = await supabaseAdmin
    .from('health_logs')
    .select(`
      player_id, fatigue, soreness, sleep_quality,
      logged_at, is_flagged,
      player:users!health_logs_player_id_fkey (id, first_name, last_name)
    `)
    .eq('academy_id', academyId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: true });

  if (error) throw new InternalError('Failed to fetch wellness analytics.');

  const rows = logs || [];

  // Per-player stats — derive score from existing columns
  const playerMap = {};
  rows.forEach(r => {
    const pid   = r.player_id;
    const score = computeWellnessScore(r);
    if (!playerMap[pid]) {
      playerMap[pid] = {
        id:         pid,
        name:       r.player ? `${r.player.first_name} ${r.player.last_name}` : '—',
        scores:     [],
        alertCount: 0,
      };
    }
    playerMap[pid].scores.push(score);
    if (r.is_flagged) playerMap[pid].alertCount++;
  });

  const playerWellness = Object.values(playerMap).map(p => {
    const avg    = p.scores.length > 0
      ? Math.round(p.scores.reduce((s, x) => s + x, 0) / p.scores.length) : 0;
    const latest = p.scores[p.scores.length - 1] ?? 0;
    return { ...p, avg, latest, total: p.scores.length };
  }).sort((a, b) => b.avg - a.avg);

  // Daily team wellness trend
  const dailyMap = {};
  rows.forEach(r => {
    const day = r.logged_at.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { date: day, scores: [] };
    dailyMap[day].scores.push(computeWellnessScore(r));
  });
  const wellnessTrend = Object.values(dailyMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      date: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      avg:  Math.round(d.scores.reduce((s, x) => s + x, 0) / d.scores.length),
    }));

  // KPIs
  const squadAvg   = playerWellness.length > 0
    ? Math.round(playerWellness.reduce((s, p) => s + p.avg, 0) / playerWellness.length) : 0;
  const fullyFit   = playerWellness.filter(p => p.avg >= 70).length;
  const moderate   = playerWellness.filter(p => p.avg >= 45 && p.avg < 70).length;
  const highRisk   = playerWellness.filter(p => p.avg < 45 && p.total > 0).length;
  const totalAlerts = rows.filter(r => r.is_flagged).length;

  const squadAvailability = [
    { name: 'Fully Fit',   value: fullyFit, color: '#10B981' },
    { name: 'Moderate',    value: moderate, color: '#F59E0B' },
    { name: 'High Risk',   value: highRisk, color: '#EF4444' },
  ].filter(s => s.value > 0);

  const playerRanking = playerWellness.slice(0, 15).map(p => ({
    id:     p.id,
    name:   p.name,
    value:  p.avg,
    color:  p.avg >= 70 ? '#10B981' : p.avg >= 45 ? '#F59E0B' : '#EF4444',
    alerts: p.alertCount,
  }));

  return {
    kpis: { squadAvg, fullyFit, moderate, highRisk, totalAlerts },
    wellnessTrend,
    squadAvailability,
    playerRanking,
  };
}

// ─── Player's Own Wellness ────────────────────────────────────────────────────

async function getMyWellnessAnalytics({ academyId, userId, days = 60 }) {
  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  const { data: logs, error } = await supabaseAdmin
    .from('health_logs')
    .select('fatigue, soreness, sleep_quality, logged_at, notes')
    .eq('academy_id', academyId)
    .eq('player_id', userId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: true });

  if (error) throw new InternalError('Failed to fetch personal wellness data.');

  const rows = logs || [];
  const scored = rows.map(r => ({ ...r, score: computeWellnessScore(r) }));

  const latestRow = scored[scored.length - 1];
  const avgScore  = scored.length > 0
    ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length) : 0;

  const trend = scored.map(r => ({
    date:     new Date(r.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    score:    r.score,
    energy:   Math.round(((5 - r.fatigue)       / 4) * 100),
    sleep:    Math.round(((r.sleep_quality - 1)  / 4) * 100),
    recovery: Math.round(((5 - r.soreness)       / 4) * 100),
  }));

  const sparkline = trend.map(t => ({ v: t.score }));

  const recentLogs = scored.slice(-5).reverse().map(r => ({
    date:     r.logged_at,
    score:    r.score,
    fatigue:  r.fatigue,
    soreness: r.soreness,
    sleep:    r.sleep_quality,
    notes:    r.notes,
  }));

  const heatmap = {};
  scored.forEach(r => { heatmap[r.logged_at.slice(0, 10)] = r.score; });

  return {
    kpis: {
      latestScore: latestRow?.score ?? 0,
      avgScore,
      totalLogs:   rows.length,
      sparkline,
    },
    trend,
    recentLogs,
    heatmap,
  };
}

// ─── Parent Analytics ─────────────────────────────────────────────────────────

async function getParentAnalytics({ academyId, userId }) {
  // Find the child linked to this parent in rosters
  const { data: rosterRow, error: rErr } = await supabaseAdmin
    .from('rosters')
    .select(`
      player_id,
      player:users!rosters_player_id_fkey (id, first_name, last_name),
      team:teams (id, name)
    `)
    .eq('academy_id', academyId)
    .eq('parent_id', userId)
    .maybeSingle();

  if (rErr) throw new InternalError('Failed to fetch child roster data.');
  if (!rosterRow) {
    return { linked: false, child: null, attendance: null, wellness: null, fees: null };
  }

  const childId   = rosterRow.player_id;
  const childName = rosterRow.player
    ? `${rosterRow.player.first_name} ${rosterRow.player.last_name}` : '—';
  const teamName  = rosterRow.team?.name ?? '—';

  // ── Attendance ──
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('academy_id', academyId)
    .lt('start_time', new Date().toISOString())
    .limit(200);

  const eventIds = (events || []).map(e => e.id);
  let attRate = 0, gfaEligible = null, attPresent = 0, attTotal = 0;

  if (eventIds.length) {
    const { data: attRows } = await supabaseAdmin
      .from('attendance')
      .select('status')
      .eq('academy_id', academyId)
      .eq('player_id', childId)
      .in('event_id', eventIds);

    const rows = attRows || [];
    attTotal   = rows.length;
    attPresent = rows.filter(r => r.status === 'present' || r.status === 'late').length;
    attRate    = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;
    gfaEligible = attTotal > 0 ? attRate >= 70 : null;
  }

  // ── Wellness (last 60 days) ──
  const since60 = new Date();
  since60.setDate(since60.getDate() - 60);

  const { data: healthRows } = await supabaseAdmin
    .from('health_logs')
    .select('fatigue, soreness, sleep_quality, logged_at, is_flagged')
    .eq('academy_id', academyId)
    .eq('player_id', childId)
    .gte('logged_at', since60.toISOString())
    .order('logged_at', { ascending: true });

  const hRows  = (healthRows || []).map(r => ({ ...r, score: computeWellnessScore(r) }));
  const latestHealth = hRows[hRows.length - 1];
  const avgWellness  = hRows.length > 0
    ? Math.round(hRows.reduce((s, r) => s + r.score, 0) / hRows.length) : 0;
  const flagCount    = hRows.filter(r => r.is_flagged).length;
  const wellnessTrend = hRows.map(r => ({
    date:  new Date(r.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    score: r.score,
  }));

  // ── Fees ──
  const { data: feeRows } = await supabaseAdmin
    .from('fee_ledger')
    .select('amount_owed, amount_paid, payment_method, created_at, description')
    .eq('academy_id', academyId)
    .eq('player_id', childId)
    .order('created_at', { ascending: false });

  const fees = feeRows || [];
  const totalOwed      = fees.reduce((s, f) => s + f.amount_owed, 0);
  const totalPaid      = fees.reduce((s, f) => s + f.amount_paid, 0);
  const outstanding    = totalOwed - totalPaid;
  const collectionRate = totalOwed > 0 ? Math.round((totalPaid / totalOwed) * 100) : 100;

  return {
    linked: true,
    child:  { id: childId, name: childName, team: teamName },
    attendance: {
      rate: attRate, present: attPresent, total: attTotal, gfaEligible,
    },
    wellness: {
      latestScore: latestHealth?.score ?? 0,
      avgScore:    avgWellness,
      totalLogs:   hRows.length,
      flagCount,
      trend:       wellnessTrend,
    },
    fees: {
      totalOwed:      +(totalOwed / 100).toFixed(2),
      totalPaid:      +(totalPaid / 100).toFixed(2),
      outstanding:    +(outstanding / 100).toFixed(2),
      collectionRate,
      recentPayments: fees.slice(0, 5).map(f => ({
        description: f.description,
        amount:      +(f.amount_owed / 100).toFixed(2),
        paid:        +(f.amount_paid / 100).toFixed(2),
        method:      f.payment_method ?? null,
        date:        f.created_at,
        status:      (f.amount_owed - f.amount_paid) <= 0 ? 'paid' : f.amount_paid > 0 ? 'partial' : 'overdue',
      })),
    },
  };
}

// ─── Workout Analytics (Admin + Coach) ───────────────────────────────────────

async function getWorkoutAnalytics({ academyId }) {
  // All assignments for the academy
  const { data: assignments, error: aErr } = await supabaseAdmin
    .from('workout_assignments')
    .select(`
      id, title, due_date, created_at, team_id, player_id,
      team:teams (id, name),
      exercises:workout_exercises (id)
    `)
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false });

  if (aErr) throw new InternalError('Failed to fetch workout assignments.');

  const rows = assignments || [];

  // All completions for the academy
  const { data: completions, error: cErr } = await supabaseAdmin
    .from('workout_completions')
    .select('exercise_id, player_id, is_completed')
    .eq('academy_id', academyId);

  if (cErr) throw new InternalError('Failed to fetch workout completions.');

  const comps = completions || [];

  // Build exercise→assignment map and count completions
  const assignmentMap = {};
  rows.forEach(a => {
    assignmentMap[a.id] = {
      id:          a.id,
      title:       a.title,
      teamName:    a.team?.name ?? (a.player_id ? 'Individual' : '—'),
      exerciseIds: (a.exercises || []).map(e => e.id),
      dueDate:     a.due_date,
      createdAt:   a.created_at,
    };
  });

  // Per-player completion
  const playerMap = {};
  const compByExercise = {};
  comps.forEach(c => {
    const pid = c.player_id;
    if (!playerMap[pid]) playerMap[pid] = { total: 0, completed: 0 };
    playerMap[pid].total++;
    if (c.is_completed) playerMap[pid].completed++;
    if (!compByExercise[c.exercise_id]) compByExercise[c.exercise_id] = 0;
    if (c.is_completed) compByExercise[c.exercise_id]++;
  });

  // Enrich player names
  const playerIds = Object.keys(playerMap);
  let playerNames = {};
  if (playerIds.length) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name')
      .in('id', playerIds)
      .eq('academy_id', academyId);
    (users || []).forEach(u => {
      playerNames[u.id] = `${u.first_name} ${u.last_name}`;
    });
  }

  const playerRanking = Object.entries(playerMap)
    .map(([pid, s]) => ({
      id:    pid,
      name:  playerNames[pid] ?? '—',
      total: s.total,
      done:  s.completed,
      rate:  s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  // Monthly assignment volume (last 6 months)
  const monthlyMap = {};
  last6MonthKeys().forEach(k => {
    monthlyMap[k] = { month: monthLabel(k), assigned: 0, exerciseCount: 0 };
  });
  rows.forEach(a => {
    const d = new Date(a.createdAt);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyMap[k]) {
      monthlyMap[k].assigned++;
      monthlyMap[k].exerciseCount += (a.exercises || []).length;
    }
  });
  const volumeTrend = Object.values(monthlyMap);

  // Per-assignment completion rate (most recent 10)
  // Source from assignmentMap (built above from the joined `exercises` relation),
  // NOT the raw `rows` — raw rows only carry `.exercises` (array of {id}) from the
  // Supabase select, not the flattened `.exerciseIds` / `.teamName` used here, so
  // reading those off `rows` directly always evaluated to undefined → 0 exercises.
  const recentAssignments = Object.values(assignmentMap).slice(0, 10).map(a => {
    const totalExercises = a.exerciseIds.length;
    const doneCount = a.exerciseIds.reduce((s, eid) => s + (compByExercise[eid] ?? 0), 0);
    const rate = totalExercises > 0 ? Math.round((doneCount / totalExercises) * 100) : 0;
    return {
      title:    a.title,
      team:     a.teamName,
      dueDate:  a.dueDate,
      exercises: totalExercises,
      rate,
    };
  });

  // KPIs
  const totalAssigned = rows.length;
  const totalExercises = rows.reduce((s, a) => s + (a.exercises?.length ?? 0), 0);
  const totalDone   = comps.filter(c => c.is_completed).length;
  const overallRate = comps.length > 0 ? Math.round((totalDone / comps.length) * 100) : 0;
  const activeThisMonth = (monthlyMap[last6MonthKeys()[5]] || {}).assigned ?? 0;

  return {
    kpis: { totalAssigned, totalExercises, totalDone, overallRate, activeThisMonth },
    volumeTrend,
    playerRanking: playerRanking.slice(0, 15),
    recentAssignments,
  };
}

// ─── Team Comparison (Admin) ──────────────────────────────────────────────────

async function getTeamComparison({ academyId }) {
  const { data: teams, error: tErr } = await supabaseAdmin
    .from('teams')
    .select('id, name, division, sport')
    .eq('academy_id', academyId)
    .order('name');

  if (tErr) throw new InternalError('Failed to fetch teams for comparison.');
  if (!teams || teams.length === 0) return { teams: [] };

  const teamIds = teams.map(t => t.id);

  // Rosters — player count per team
  const { data: rosterRows } = await supabaseAdmin
    .from('rosters')
    .select('team_id, player_id')
    .eq('academy_id', academyId)
    .in('team_id', teamIds);

  const rosterMap = {};
  (rosterRows || []).forEach(r => {
    if (!rosterMap[r.team_id]) rosterMap[r.team_id] = new Set();
    rosterMap[r.team_id].add(r.player_id);
  });

  // Attendance — per team (via events)
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, team_id')
    .eq('academy_id', academyId)
    .lt('start_time', new Date().toISOString())
    .in('team_id', teamIds)
    .limit(500);

  const teamEventIds = {};
  (events || []).forEach(e => {
    if (!teamEventIds[e.team_id]) teamEventIds[e.team_id] = [];
    teamEventIds[e.team_id].push(e.id);
  });

  const allEventIds = (events || []).map(e => e.id);
  let attMap = {};
  if (allEventIds.length) {
    const { data: attRows } = await supabaseAdmin
      .from('attendance')
      .select('event_id, status')
      .eq('academy_id', academyId)
      .in('event_id', allEventIds);

    // Build event→team lookup
    const eventTeam = Object.fromEntries((events || []).map(e => [e.id, e.team_id]));
    (attRows || []).forEach(r => {
      const tid = eventTeam[r.event_id];
      if (!tid) return;
      if (!attMap[tid]) attMap[tid] = { present: 0, total: 0 };
      attMap[tid].total++;
      if (r.status === 'present' || r.status === 'late') attMap[tid].present++;
    });
  }

  // Wellness — per player in each team (last 30 days)
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const allPlayerIds = [...new Set((rosterRows || []).map(r => r.player_id))];

  let wellnessMap = {};
  if (allPlayerIds.length) {
    const { data: hlRows } = await supabaseAdmin
      .from('health_logs')
      .select('player_id, fatigue, soreness, sleep_quality')
      .eq('academy_id', academyId)
      .gte('logged_at', since30.toISOString())
      .in('player_id', allPlayerIds);

    // Build player→team lookup
    const playerTeam = {};
    (rosterRows || []).forEach(r => { playerTeam[r.player_id] = r.team_id; });

    (hlRows || []).forEach(r => {
      const tid = playerTeam[r.player_id];
      if (!tid) return;
      if (!wellnessMap[tid]) wellnessMap[tid] = [];
      wellnessMap[tid].push(computeWellnessScore(r));
    });
  }

  // Fees — collection rate per team
  const { data: feeRows } = await supabaseAdmin
    .from('fee_ledger')
    .select('player_id, amount_owed, amount_paid')
    .eq('academy_id', academyId);

  const playerTeamFee = {};
  (rosterRows || []).forEach(r => { playerTeamFee[r.player_id] = r.team_id; });
  const feeByTeam = {};
  (feeRows || []).forEach(f => {
    const tid = playerTeamFee[f.player_id];
    if (!tid) return;
    if (!feeByTeam[tid]) feeByTeam[tid] = { owed: 0, paid: 0 };
    feeByTeam[tid].owed += f.amount_owed;
    feeByTeam[tid].paid += f.amount_paid;
  });

  const result = teams.map(t => {
    const squad    = rosterMap[t.id]?.size ?? 0;
    const att      = attMap[t.id];
    const attRate  = att ? Math.round((att.present / att.total) * 100) : 0;
    const wScores  = wellnessMap[t.id] || [];
    const wellness = wScores.length > 0
      ? Math.round(wScores.reduce((s, x) => s + x, 0) / wScores.length) : 0;
    const fee      = feeByTeam[t.id];
    const feeRate  = fee && fee.owed > 0
      ? Math.round((fee.paid / fee.owed) * 100) : 0;

    return {
      id:       t.id,
      name:     t.name,
      division: t.division ?? '—',
      sport:    t.sport ?? '—',
      squad,
      attRate,
      wellness,
      feeRate,
    };
  });

  return { teams: result };
}

// ─── Player Detail (Admin + Coach drill-down) ─────────────────────────────────

async function getPlayerDetail({ academyId, playerId }) {
  const since60 = new Date(); since60.setDate(since60.getDate() - 60);
  const since30 = new Date(); since30.setDate(since30.getDate() - 30);

  const [profileRes, eventsRes, healthRes, compRes] = await Promise.all([
    supabaseAdmin.from('users').select('id, first_name, last_name, avatar_url').eq('id', playerId).eq('academy_id', academyId).single(),
    supabaseAdmin.from('events').select('id, title, start_time').eq('academy_id', academyId).lt('start_time', new Date().toISOString()).order('start_time', { ascending: false }).limit(200),
    supabaseAdmin.from('health_logs').select('fatigue, soreness, sleep_quality, is_flagged, logged_at').eq('academy_id', academyId).eq('player_id', playerId).gte('logged_at', since60.toISOString()).order('logged_at', { ascending: true }),
    supabaseAdmin.from('workout_completions').select('exercise_id, is_completed').eq('academy_id', academyId).eq('player_id', playerId),
  ]);

  const profile = profileRes.data;
  const name    = profile ? `${profile.first_name} ${profile.last_name}` : '—';

  // Attendance
  let attendance = null;
  if (eventsRes.data && eventsRes.data.length > 0) {
    const eventIds = eventsRes.data.map(e => e.id);
    const { data: attRows } = await supabaseAdmin
      .from('attendance').select('event_id, status')
      .eq('academy_id', academyId).eq('player_id', playerId).in('event_id', eventIds);
    const rows   = attRows || [];
    const total   = rows.length;
    const present = rows.filter(r => r.status === 'present').length;
    const late    = rows.filter(r => r.status === 'late').length;
    const rate    = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;
    attendance = { rate, present, total, gfaEligible: total > 0 ? ((present + late) / total) >= 0.7 : null };
  }

  // Wellness
  const healthRows = healthRes.data || [];
  let wellness = null;
  if (healthRows.length > 0) {
    const scored = healthRows.map(r => ({ score: computeWellnessScore(r), date: r.logged_at.slice(0, 10), flagged: r.is_flagged }));
    const scores = scored.map(s => s.score);
    const latestScore = scores[scores.length - 1] ?? 0;
    const avgScore    = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const flagCount   = scored.filter(s => s.flagged).length;
    const trend       = scored.map(s => ({
      date:  new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      score: s.score,
    }));
    wellness = { latestScore, avgScore, totalLogs: scores.length, flagCount, trend };
  }

  // Workouts
  const comps = compRes.data || [];
  const workouts = {
    total: comps.length,
    done:  comps.filter(c => c.is_completed).length,
    rate:  comps.length > 0 ? Math.round((comps.filter(c => c.is_completed).length / comps.length) * 100) : 0,
  };

  return { id: playerId, name, avatar_url: profile?.avatar_url ?? null, attendance, wellness, workouts };
}

// ─── Analytics Summary (Admin dashboard widget) ───────────────────────────────

async function getAnalyticsSummary({ academyId }) {
  const since30 = new Date(); since30.setDate(since30.getDate() - 30);

  const [feesRes, healthRes, playersRes, eventsRes] = await Promise.all([
    supabaseAdmin.from('fee_ledger').select('amount_owed, amount_paid').eq('academy_id', academyId),
    supabaseAdmin.from('health_logs').select('player_id, is_flagged').eq('academy_id', academyId).gte('logged_at', since30.toISOString()),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('academy_id', academyId).eq('role', 'Player').eq('is_active', true),
    supabaseAdmin.from('events').select('id').eq('academy_id', academyId).lt('start_time', new Date().toISOString()).gte('start_time', since30.toISOString()),
  ]);

  const fees = feesRes.data || [];
  const outstandingFees = +(fees.reduce((s, f) => s + Math.max(0, f.amount_owed - f.amount_paid), 0) / 100).toFixed(2);
  const collectionRate  = fees.length > 0
    ? Math.round(fees.reduce((s, f) => s + f.amount_paid, 0) / Math.max(1, fees.reduce((s, f) => s + f.amount_owed, 0)) * 100) : 0;

  const health        = healthRes.data || [];
  const wellnessFlags = health.filter(h => h.is_flagged).length;
  const flaggedPlayers = new Set(health.filter(h => h.is_flagged).map(h => h.player_id)).size;

  const totalPlayers = playersRes.count ?? 0;
  const recentEvents = (eventsRes.data || []).length;

  return { outstandingFees, collectionRate, wellnessFlags, flaggedPlayers, totalPlayers, recentEvents };
}

// ─── Player's Own Attendance ──────────────────────────────────────────────────

async function getMyAttendanceAnalytics({ academyId, userId }) {
  // Past events for this academy
  const { data: events, error: evErr } = await supabaseAdmin
    .from('events')
    .select('id, start_time')
    .eq('academy_id', academyId)
    .lt('start_time', new Date().toISOString())
    .order('start_time', { ascending: false })
    .limit(300);

  if (evErr) throw new InternalError('Failed to fetch events for attendance.');

  const eventIds = (events || []).map(e => e.id);
  if (!eventIds.length) {
    return {
      kpis: { rate: 0, present: 0, absent: 0, late: 0, total: 0, gfaEligible: null },
      monthlyTrend: [],
      breakdown: [],
    };
  }

  const { data: attRows, error: attErr } = await supabaseAdmin
    .from('attendance')
    .select('event_id, status')
    .eq('academy_id', academyId)
    .eq('player_id', userId)
    .in('event_id', eventIds);

  if (attErr) throw new InternalError('Failed to fetch player attendance records.');

  const rows    = attRows || [];
  const total   = rows.length;
  const present = rows.filter(r => r.status === 'present').length;
  const absent  = rows.filter(r => r.status === 'absent').length;
  const late    = rows.filter(r => r.status === 'late').length;
  const rate    = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;
  const gfaEligible = total > 0 ? ((present + late) / total) >= 0.7 : null;

  // Monthly trend (last 6 months)
  const eventMap = Object.fromEntries((events || []).map(e => [e.id, e]));
  const monthlyMap = {};
  last6MonthKeys().forEach(k => {
    monthlyMap[k] = { month: monthLabel(k), present: 0, absent: 0, late: 0, total: 0 };
  });
  rows.forEach(r => {
    const ev = eventMap[r.event_id];
    if (!ev) return;
    const d = new Date(ev.start_time);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyMap[k]) {
      monthlyMap[k].total++;
      if (r.status === 'present')     monthlyMap[k].present++;
      else if (r.status === 'absent') monthlyMap[k].absent++;
      else if (r.status === 'late')   monthlyMap[k].late++;
    }
  });
  const monthlyTrend = Object.values(monthlyMap).map(m => ({
    month:   m.month,
    present: m.present,
    absent:  m.absent,
    late:    m.late,
    rate:    m.total > 0 ? Math.round(((m.present + m.late * 0.5) / m.total) * 100) : 0,
  }));

  const breakdown = [
    { name: 'Present', value: present, color: '#10B981' },
    { name: 'Late',    value: late,    color: '#F59E0B' },
    { name: 'Absent',  value: absent,  color: '#EF4444' },
  ].filter(d => d.value > 0);

  return {
    kpis: { rate, present, absent, late, total, gfaEligible },
    monthlyTrend,
    breakdown,
  };
}

module.exports = {
  getFeesAnalytics,
  getAttendanceAnalytics,
  getWellnessAnalytics,
  getMyWellnessAnalytics,
  getMyAttendanceAnalytics,
  getParentAnalytics,
  getWorkoutAnalytics,
  getTeamComparison,
  getPlayerDetail,
  getAnalyticsSummary,
};
