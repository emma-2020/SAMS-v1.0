'use strict';

const crypto         = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const { NotFoundError, ForbiddenError, InternalError } = require('../utils/errors');
const emailService   = require('./email.service');
const paystackService = require('./paystack.service');

const DASHBOARD_URL = process.env.FRONTEND_URL || 'https://app.playsams.com';

async function listFees({ academyId, userId, role, playerId }) {
  let query = supabaseAdmin
    .from('fee_ledger')
    .select(`
      id, description, amount_owed, amount_paid, payment_method,
      payment_date, notes, paystack_reference, payment_url, created_at, updated_at,
      player:users!fee_ledger_player_id_fkey (id, first_name, last_name, email)
    `)
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false });

  if (role === 'Player') {
    query = query.eq('player_id', userId);
  } else if (role === 'Parent') {
    const { data: rosterRows } = await supabaseAdmin
      .from('rosters')
      .select('player_id')
      .eq('parent_id', userId)
      .eq('academy_id', academyId);
    const childIds = (rosterRows || []).map(r => r.player_id);
    if (childIds.length === 0) return [];
    query = query.in('player_id', childIds);
  } else if (playerId) {
    query = query.eq('player_id', playerId);
  }

  const { data, error } = await query;
  if (error) throw new InternalError('Failed to fetch fee records.');
  return data || [];
}

async function createFee({ academyId, adminId, playerId, description, amountOwed, paymentMethod, paymentDate, notes }) {
  const { data: player } = await supabaseAdmin
    .from('users')
    .select('id, role, first_name, last_name, email')
    .eq('id', playerId)
    .eq('academy_id', academyId)
    .single();

  if (!player) throw new NotFoundError('Player not found.');
  if (player.role !== 'Player') throw new ForbiddenError('Fee records can only be created for Players.');

  const { data, error } = await supabaseAdmin
    .from('fee_ledger')
    .insert({
      academy_id:     academyId,
      player_id:      playerId,
      description:    description.trim(),
      amount_owed:    amountOwed,
      amount_paid:    0,
      payment_method: paymentMethod || null,
      payment_date:   paymentDate   || null,
      notes:          notes         || null,
      created_by:     adminId,
    })
    .select(`
      id, description, amount_owed, amount_paid, payment_method,
      payment_date, notes, paystack_reference, payment_url, created_at,
      player:users!fee_ledger_player_id_fkey (id, first_name, last_name, email)
    `)
    .single();

  if (error) throw new InternalError('Failed to create fee record.');

  // Fire-and-forget: generate Paystack link + send emails
  _initPaystackAndNotify({ fee: data, academyId, player, description, amountOwed, paymentDate, notes }).catch(() => {});

  return data;
}

async function _initPaystackAndNotify({ fee, academyId, player, description, amountOwed, paymentDate, notes }) {
  // Look up academy name + Paystack key
  const { data: academy } = await supabaseAdmin
    .from('academies')
    .select('name, paystack_secret_key')
    .eq('id', academyId)
    .single();
  const academyName      = academy?.name || 'Your Academy';
  const paystackSecretKey = academy?.paystack_secret_key || null;

  let paymentUrl = null;

  // Generate Paystack payment link if this academy has configured their key
  if (paystackService.isConfigured(paystackSecretKey)) {
    try {
      const reference = crypto.randomUUID();
      const ps = await paystackService.initializeTransaction({
        secretKey:       paystackSecretKey,
        email:           player.email,
        amountInPesewas: amountOwed,
        reference,
        metadata: { fee_id: fee.id, academy_id: academyId, player_id: player.id },
        // Paystack appends ?trxref=...&reference=... to this URL on redirect.
        // Points at a standalone, auth-optional confirmation page (not a
        // /dashboard/* route) since whoever completes checkout — player,
        // parent, or admin — may be doing so in a browser session with no
        // live app login at all.
        callbackUrl: `${DASHBOARD_URL}/fees/confirm`,
      });

      paymentUrl = ps.authorization_url;

      // Persist reference + url on the fee record
      await supabaseAdmin
        .from('fee_ledger')
        .update({ paystack_reference: reference, payment_url: paymentUrl })
        .eq('id', fee.id);
    } catch (err) {
      console.error('[fee.service] Paystack init failed:', err.message);
    }
  }

  const emailBase = {
    description,
    amountOwed,
    paymentDate: paymentDate || null,
    notes:       notes       || null,
    academyName,
    paymentUrl,
  };

  // Email player
  await emailService.sendFeeNotificationEmail({
    to:           player.email,
    firstName:    player.first_name,
    dashboardUrl: `${DASHBOARD_URL}/dashboard/player`,
    ...emailBase,
  });

  // Email any linked parents
  const { data: rosterRows } = await supabaseAdmin
    .from('rosters')
    .select('parent:users!rosters_parent_id_fkey (first_name, email)')
    .eq('player_id', player.id)
    .eq('academy_id', academyId);

  for (const row of rosterRows || []) {
    if (row.parent?.email) {
      await emailService.sendFeeNotificationEmail({
        to:           row.parent.email,
        firstName:    row.parent.first_name,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/parent`,
        ...emailBase,
      });
    }
  }
}

async function handlePaystackWebhook({ rawBody, signature }) {
  // Parse first (unverified) to get reference → look up academy key → verify
  let event;
  try { event = JSON.parse(rawBody.toString()); } catch { throw new Error('Invalid webhook body.'); }
  if (event.event !== 'charge.success') return { handled: false };

  const charge    = event.data;
  const reference = charge.reference;
  const metadata  = charge.metadata || {};
  const feeId     = metadata.fee_id;
  if (!feeId && !reference) return { handled: false };

  // Look up the fee to find the academy's Paystack key
  const { data: feeForKey } = await supabaseAdmin
    .from('fee_ledger')
    .select('id, academy_id')
    .eq(feeId ? 'id' : 'paystack_reference', feeId ?? reference)
    .single();

  let paystackSecretKey = null;
  if (feeForKey?.academy_id) {
    const { data: acad } = await supabaseAdmin
      .from('academies')
      .select('paystack_secret_key')
      .eq('id', feeForKey.academy_id)
      .single();
    paystackSecretKey = acad?.paystack_secret_key || null;
  }

  if (!paystackService.verifyWebhookSignature(rawBody, signature, paystackSecretKey)) {
    throw new Error('Invalid Paystack webhook signature.');
  }

  const resolvedFeeId = feeId ?? feeForKey?.id;
  if (!resolvedFeeId) return { handled: false };

  // Look up fee
  const { data: fee } = await supabaseAdmin
    .from('fee_ledger')
    .select(`
      id, academy_id, player_id, description, amount_owed, amount_paid,
      player:users!fee_ledger_player_id_fkey (first_name, email)
    `)
    .eq('id', resolvedFeeId)
    .single();

  if (!fee) return { handled: false };

  const chargedAmount = charge.amount; // already in pesewas
  const channel       = charge.channel; // 'mobile_money' | 'card' | 'bank' | etc.
  const newPaid       = Math.min(fee.amount_paid + chargedAmount, fee.amount_owed);
  const paymentMethod = channel === 'mobile_money' ? 'MoMo' : 'Online';

  await supabaseAdmin
    .from('fee_ledger')
    .update({
      amount_paid:    newPaid,
      payment_method: paymentMethod,
      payment_date:   new Date().toISOString().slice(0, 10),
    })
    .eq('id', feeId);

  // Send receipt — fire-and-forget
  _sendReceipt({ fee, chargedAmount, newPaid, channel }).catch(() => {});

  return { handled: true };
}

async function _sendReceipt({ fee, chargedAmount, newPaid, channel }) {
  const { data: academy } = await supabaseAdmin
    .from('academies')
    .select('name')
    .eq('id', fee.academy_id)
    .single();

  const academyName = academy?.name || 'Your Academy';
  const fullyPaid   = newPaid >= fee.amount_owed;

  if (fee.player?.email) {
    await emailService.sendFeeReceiptEmail({
      to:           fee.player.email,
      firstName:    fee.player.first_name,
      academyName,
      description:  fee.description,
      amountPaid:   chargedAmount,
      totalOwed:    fee.amount_owed,
      totalPaid:    newPaid,
      fullyPaid,
      channel,
      dashboardUrl: `${DASHBOARD_URL}/dashboard/player`,
    });
  }

  // Receipt to parents
  const { data: rosterRows } = await supabaseAdmin
    .from('rosters')
    .select('parent:users!rosters_parent_id_fkey (first_name, email)')
    .eq('player_id', fee.player_id)
    .eq('academy_id', fee.academy_id);

  for (const row of rosterRows || []) {
    if (row.parent?.email) {
      await emailService.sendFeeReceiptEmail({
        to:           row.parent.email,
        firstName:    row.parent.first_name,
        academyName,
        description:  fee.description,
        amountPaid:   chargedAmount,
        totalOwed:    fee.amount_owed,
        totalPaid:    newPaid,
        fullyPaid,
        channel,
        dashboardUrl: `${DASHBOARD_URL}/dashboard/parent`,
      });
    }
  }
}

async function updateFee({ academyId, feeId, amountOwed, amountPaid, paymentMethod, paymentDate, notes, description }) {
  const { data: existing } = await supabaseAdmin
    .from('fee_ledger')
    .select('id, amount_owed')
    .eq('id', feeId)
    .eq('academy_id', academyId)
    .single();

  if (!existing) throw new NotFoundError('Fee record not found.');

  const updates = {};
  if (description   !== undefined) updates.description    = description.trim();
  if (amountOwed    !== undefined) updates.amount_owed    = amountOwed;
  if (amountPaid    !== undefined) updates.amount_paid    = amountPaid;
  if (paymentMethod !== undefined) updates.payment_method = paymentMethod;
  if (paymentDate   !== undefined) updates.payment_date   = paymentDate;
  if (notes         !== undefined) updates.notes          = notes;

  const { data, error } = await supabaseAdmin
    .from('fee_ledger')
    .update(updates)
    .eq('id', feeId)
    .eq('academy_id', academyId)
    .select(`
      id, description, amount_owed, amount_paid, payment_method,
      payment_date, notes, paystack_reference, payment_url, created_at, updated_at,
      player:users!fee_ledger_player_id_fkey (id, first_name, last_name, email)
    `)
    .single();

  if (error) throw new InternalError('Failed to update fee record.');
  return data;
}

async function deleteFee({ academyId, feeId }) {
  const { data: existing } = await supabaseAdmin
    .from('fee_ledger')
    .select('id')
    .eq('id', feeId)
    .eq('academy_id', academyId)
    .single();

  if (!existing) throw new NotFoundError('Fee record not found.');

  const { error } = await supabaseAdmin
    .from('fee_ledger')
    .delete()
    .eq('id', feeId)
    .eq('academy_id', academyId);

  if (error) throw new InternalError('Failed to delete fee record.');
}

// ─────────────────────────────────────────────────────────────────
// SEND FEE REMINDER EMAILS
// Reads each parent's fee_reminder_days preference and emails them
// (plus the player) when a fee's payment_date falls within that window.
// ─────────────────────────────────────────────────────────────────

async function sendFeeReminderEmails({ academyId }) {
  const { data: academy } = await supabaseAdmin
    .from('academies').select('name').eq('id', academyId).single();
  const academyName = academy?.name || 'Your Academy';

  const { data: parents } = await supabaseAdmin
    .from('users')
    .select('id, first_name, email, preferences')
    .eq('academy_id', academyId)
    .eq('role', 'Parent');

  let sent = 0;

  for (const parent of parents || []) {
    const reminderDays = parent.preferences?.fee_reminder_days ?? 3;
    if (!reminderDays || reminderDays <= 0) continue;

    const { data: rosterLinks } = await supabaseAdmin
      .from('rosters')
      .select('player_id')
      .eq('parent_id', parent.id)
      .eq('academy_id', academyId);
    const childIds = (rosterLinks || []).map(r => r.player_id);
    if (!childIds.length) continue;

    const today  = new Date().toISOString().slice(0, 10);
    const cutoff = new Date(Date.now() + reminderDays * 86_400_000).toISOString().slice(0, 10);

    const { data: fees } = await supabaseAdmin
      .from('fee_ledger')
      .select(`
        id, description, amount_owed, amount_paid, payment_date, payment_url,
        player:users!fee_ledger_player_id_fkey (id, first_name, last_name, email)
      `)
      .eq('academy_id', academyId)
      .in('player_id', childIds)
      .gte('payment_date', today)
      .lte('payment_date', cutoff);

    for (const fee of fees || []) {
      if (fee.amount_paid >= fee.amount_owed) continue; // already settled
      const amountDue = fee.amount_owed - fee.amount_paid;

      if (parent.email) {
        await emailService.sendFeeReminderEmail({
          to:          parent.email,
          firstName:   parent.first_name,
          playerName:  `${fee.player?.first_name} ${fee.player?.last_name}`.trim(),
          description: fee.description,
          amountDue,
          paymentDate: fee.payment_date,
          academyName,
          paymentUrl:  fee.payment_url,
          dashboardUrl: `${DASHBOARD_URL}/dashboard/parent`,
        }).catch(err => console.error('[fee.service] reminder email to parent failed:', err.message));
        sent++;
      }

      if (fee.player?.email) {
        await emailService.sendFeeReminderEmail({
          to:          fee.player.email,
          firstName:   fee.player.first_name,
          playerName:  null,
          description: fee.description,
          amountDue,
          paymentDate: fee.payment_date,
          academyName,
          paymentUrl:  fee.payment_url,
          dashboardUrl: `${DASHBOARD_URL}/dashboard/player`,
        }).catch(err => console.error('[fee.service] reminder email to player failed:', err.message));
        sent++;
      }
    }
  }

  return { sent };
}

module.exports = { listFees, createFee, updateFee, deleteFee, handlePaystackWebhook, sendFeeReminderEmails };
