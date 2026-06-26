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

// ─── Fee Analytics (Admin) ────────────────────────────────────────────────────

async function getFeesAnalytics({ academyId }) {
  const { data: fees, error } = await supabaseAdmin
    .from('fee_ledger')
    .select(`
      amount_owed, amount_paid, payment_method, created_at, player_id,
      player:users!fee_ledger_player_id_fkey (id, first_name, last_name)
    `)
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false });

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
  const topOutstanding = Object.values(playerMap)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 8)
    .map(p => ({
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
  const playerStats = {};
  rows.forEach(r => {
    const pid = r.player_id;
    if (!playerStats[pid]) {
      playerStats[pid] = {
        name:    r.player ? `${r.player.first_name} ${r.player.last_name}` : '—',
        present: 0, absent: 0, late: 0, total: 0,
      };
    }
    playerStats[pid].total++;
    if (r.status === 'present')      playerStats[pid].present++;
    else if (r.status === 'absent')  playerStats[pid].absent++;
    else if (r.status === 'late')    playerStats[pid].late++;
  });

  const playerRates = Object.values(playerStats).map(p => ({
    ...p,
    rate:        p.total > 0 ? Math.round(((p.present + p.late * 0.5) / p.total) * 100) : 0,
    gfaEligible: p.total > 0 ? ((p.present + p.late) / p.total) >= 0.7 : null,
  })).sort((a, b) => b.rate - a.rate);

  // Monthly trend (last 6 months)
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
      player_id, overall_score, fatigue, soreness, sleep_quality,
      logged_at, is_flagged,
      player:users!health_logs_player_id_fkey (id, first_name, last_name)
    `)
    .eq('academy_id', academyId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: true });

  if (error) throw new InternalError('Failed to fetch wellness analytics.');

  const rows = logs || [];

  // Per-player stats
  const playerMap = {};
  rows.forEach(r => {
    const pid = r.player_id;
    if (!playerMap[pid]) {
      playerMap[pid] = {
        name:       r.player ? `${r.player.first_name} ${r.player.last_name}` : '—',
        scores:     [],
        alertCount: 0,
      };
    }
    playerMap[pid].scores.push(r.overall_score);
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
    dailyMap[day].scores.push(r.overall_score);
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
    .select('overall_score, fatigue, soreness, sleep_quality, stress, logged_at, notes')
    .eq('academy_id', academyId)
    .eq('player_id', userId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: true });

  if (error) throw new InternalError('Failed to fetch personal wellness data.');

  const rows   = logs || [];
  const latest = rows[rows.length - 1];
  const avgScore = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.overall_score, 0) / rows.length) : 0;

  const trend = rows.map(r => ({
    date:  new Date(r.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    score: r.overall_score,
  }));

  const sparkline = trend.map(t => ({ v: t.score }));

  const recentLogs = rows.slice(-5).reverse().map(r => ({
    date:     r.logged_at,
    score:    r.overall_score,
    fatigue:  r.fatigue,
    soreness: r.soreness,
    sleep:    r.sleep_quality,
    stress:   r.stress,
    notes:    r.notes,
  }));

  const heatmap = {};
  rows.forEach(r => { heatmap[r.logged_at.slice(0, 10)] = r.overall_score; });

  return {
    kpis: {
      latestScore: latest?.overall_score ?? 0,
      avgScore,
      totalLogs:   rows.length,
      sparkline,
    },
    trend,
    recentLogs,
    heatmap,
  };
}

module.exports = {
  getFeesAnalytics,
  getAttendanceAnalytics,
  getWellnessAnalytics,
  getMyWellnessAnalytics,
};
