'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { NotFoundError, ForbiddenError, InternalError } = require('../utils/errors');

async function listFees({ academyId, userId, role, playerId }) {
  let query = supabaseAdmin
    .from('fee_ledger')
    .select(`
      id, description, amount_owed, amount_paid, payment_method,
      payment_date, notes, created_at, updated_at,
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
    .select('id, role')
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
      payment_date, notes, created_at,
      player:users!fee_ledger_player_id_fkey (id, first_name, last_name, email)
    `)
    .single();

  if (error) throw new InternalError('Failed to create fee record.');
  return data;
}

async function updateFee({ academyId, feeId, amountPaid, paymentMethod, paymentDate, notes, description }) {
  const { data: existing } = await supabaseAdmin
    .from('fee_ledger')
    .select('id, amount_owed')
    .eq('id', feeId)
    .eq('academy_id', academyId)
    .single();

  if (!existing) throw new NotFoundError('Fee record not found.');

  const updates = {};
  if (description  !== undefined) updates.description    = description.trim();
  if (amountPaid   !== undefined) updates.amount_paid    = amountPaid;
  if (paymentMethod !== undefined) updates.payment_method = paymentMethod;
  if (paymentDate  !== undefined) updates.payment_date   = paymentDate;
  if (notes        !== undefined) updates.notes          = notes;

  const { data, error } = await supabaseAdmin
    .from('fee_ledger')
    .update(updates)
    .eq('id', feeId)
    .eq('academy_id', academyId)
    .select(`
      id, description, amount_owed, amount_paid, payment_method,
      payment_date, notes, created_at, updated_at,
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

module.exports = { listFees, createFee, updateFee, deleteFee };
