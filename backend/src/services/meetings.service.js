'use strict';

const { supabaseAdmin }  = require('../config/supabase');
const env                = require('../config/env');
const emailService       = require('./email.service');
const { NotFoundError, BadRequestError, InternalError } = require('../utils/errors');

// ─── Daily.co API ─────────────────────────────────────────────────────────────

const DAILY_API = 'https://api.daily.co/v1';

function isDailyConfigured() {
  return Boolean(env.DAILY_API_KEY) && env.DAILY_API_KEY.length > 10;
}

async function dailyRequest(path, method = 'GET', body = null) {
  if (!isDailyConfigured()) {
    console.warn('[meetings] DAILY_API_KEY not set — returning mock room for development');
    const name = `mock-${Date.now()}`;
    return { name, url: `https://demo.daily.co/${name}` };
  }

  const opts = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${env.DAILY_API_KEY}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(`${DAILY_API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) {
    throw new InternalError(`Daily.co: ${data.error || res.status}`);
  }
  return data;
}

async function createDailyRoom({ roomName, expiresAt }) {
  const exp = Math.floor(new Date(expiresAt).getTime() / 1000);
  return dailyRequest('/rooms', 'POST', {
    name:       roomName,
    privacy:    'public',
    properties: {
      exp,
      enable_screenshare:  true,
      enable_chat:         false,
      start_video_off:     false,
      start_audio_off:     false,
      max_participants:    50,
    },
  });
}

async function deleteDailyRoom(roomName) {
  try {
    await dailyRequest(`/rooms/${roomName}`, 'DELETE');
  } catch (err) {
    console.warn('[meetings] Could not delete Daily room:', err.message);
  }
}

// ─── ICS calendar file generator ─────────────────────────────────────────────

function formatIcsDate(date) {
  return new Date(date)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function generateIcs({ title, agenda, scheduledAt, durationMinutes, roomUrl, organizerEmail, attendees }) {
  const start = formatIcsDate(scheduledAt);
  const end   = formatIcsDate(new Date(new Date(scheduledAt).getTime() + durationMinutes * 60000));
  const uid   = `sams-${Date.now()}@playsams.com`;

  const attendeeLines = attendees
    .map(a => `ATTENDEE;RSVP=TRUE;CN=${a.name}:mailto:${a.email}`)
    .join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SAMS Platform//SAMS//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    agenda ? `DESCRIPTION:${agenda.replace(/\n/g, '\\n')}` : '',
    `URL:${roomUrl}`,
    `ORGANIZER;CN=SAMS Platform:mailto:${organizerEmail || 'noreply@playsams.com'}`,
    attendeeLines,
    `UID:${uid}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

// ─── Scheduled meetings ───────────────────────────────────────────────────────

async function createMeeting({ title, agenda, scheduledAt, durationMinutes, attendeeIds, createdBy, academyId }) {
  if (!title?.trim())   throw new BadRequestError('Meeting title is required');
  if (!scheduledAt)     throw new BadRequestError('Scheduled time is required');
  if (!attendeeIds?.length) throw new BadRequestError('At least one attendee is required');

  const roomName  = `sams-${academyId.slice(0, 8)}-${Date.now()}`;
  const expiresAt = new Date(new Date(scheduledAt).getTime() + (durationMinutes + 30) * 60000);

  const room = await createDailyRoom({ roomName, expiresAt });

  const { data: meeting, error: mErr } = await supabaseAdmin
    .from('meetings')
    .insert({
      academy_id:       academyId,
      title:            title.trim(),
      agenda:           agenda?.trim() || null,
      scheduled_at:     scheduledAt,
      duration_minutes: durationMinutes || 60,
      daily_room_name:  room.name,
      daily_room_url:   room.url,
      created_by:       createdBy,
    })
    .select()
    .single();

  if (mErr) throw new InternalError(mErr.message);

  const attendeeRows = [...new Set([...attendeeIds, createdBy])]
    .map(id => ({ meeting_id: meeting.id, user_id: id, status: 'invited' }));

  const { error: aErr } = await supabaseAdmin
    .from('meeting_attendees')
    .insert(attendeeRows);

  if (aErr) throw new InternalError(aErr.message);

  // Fetch attendee profiles for email
  const uniqueIds = [...new Set([...attendeeIds, createdBy])];
  const { data: profiles } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, email')
    .in('id', uniqueIds);

  const { data: academy } = await supabaseAdmin
    .from('academies')
    .select('name')
    .eq('id', academyId)
    .single();

  if (profiles?.length) {
    const icsContent = generateIcs({
      title,
      agenda,
      scheduledAt,
      durationMinutes: durationMinutes || 60,
      roomUrl:         room.url,
      organizerEmail:  env.EMAIL_FROM?.match(/<(.+)>/)?.[1] || 'noreply@playsams.com',
      attendees:       profiles.map(p => ({ name: `${p.first_name} ${p.last_name}`, email: p.email })),
    });

    for (const profile of profiles) {
      await emailService.sendMeetingInvitationEmail({
        to:              profile.email,
        firstName:       profile.first_name,
        meetingTitle:    title,
        agenda:          agenda || '',
        scheduledAt,
        durationMinutes: durationMinutes || 60,
        roomUrl:         room.url,
        academyName:     academy?.name || 'Your Academy',
        icsContent,
      }).catch(err => console.error('[meetings] email error:', err.message));
    }
  }

  return { ...meeting, daily_room_url: room.url };
}

async function getMeetings({ academyId, userId }) {
  const { data, error } = await supabaseAdmin
    .from('meetings')
    .select(`
      *,
      meeting_attendees!inner(user_id, status),
      users!meetings_created_by_fkey(first_name, last_name)
    `)
    .eq('academy_id', academyId)
    .eq('meeting_attendees.user_id', userId)
    .gte('scheduled_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) throw new InternalError(error.message);
  return data || [];
}

async function getMeetingById({ meetingId, academyId }) {
  const { data, error } = await supabaseAdmin
    .from('meetings')
    .select(`
      *,
      meeting_attendees(user_id, status, users(first_name, last_name, email, role))
    `)
    .eq('id', meetingId)
    .eq('academy_id', academyId)
    .single();

  if (error || !data) throw new NotFoundError('Meeting not found');
  return data;
}

async function cancelMeeting({ meetingId, academyId }) {
  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('daily_room_name')
    .eq('id', meetingId)
    .eq('academy_id', academyId)
    .single();

  if (!meeting) throw new NotFoundError('Meeting not found');

  await deleteDailyRoom(meeting.daily_room_name);

  const { error } = await supabaseAdmin
    .from('meetings')
    .delete()
    .eq('id', meetingId)
    .eq('academy_id', academyId);

  if (error) throw new InternalError(error.message);
}

async function getAcademyMembers(academyId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, email, role')
    .eq('academy_id', academyId)
    .order('first_name');

  if (error) throw new InternalError(error.message);
  return data || [];
}

// ─── Instant call sessions ────────────────────────────────────────────────────

async function startCall({ callerId, teamId, recipientId, academyId }) {
  const roomName  = `sams-call-${Date.now()}`;
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4-hour max

  const room = await createDailyRoom({ roomName, expiresAt });

  const { data: session, error } = await supabaseAdmin
    .from('call_sessions')
    .insert({
      academy_id:      academyId,
      caller_id:       callerId,
      team_id:         teamId   || null,
      recipient_id:    recipientId || null,
      daily_room_name: room.name,
      daily_room_url:  room.url,
      status:          'ringing',
    })
    .select()
    .single();

  if (error) throw new InternalError(error.message);
  return session;
}

async function getPendingCalls({ userId, academyId }) {
  // Direct calls addressed to this user that are still ringing (< 60s old)
  const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('call_sessions')
    .select('*, users!call_sessions_caller_id_fkey(first_name, last_name, role)')
    .eq('academy_id', academyId)
    .eq('recipient_id', userId)
    .eq('status', 'ringing')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new InternalError(error.message);
  return data || [];
}

async function getActiveTeamCall({ teamId, academyId }) {
  const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from('call_sessions')
    .select('*')
    .eq('academy_id', academyId)
    .eq('team_id', teamId)
    .in('status', ['ringing', 'active'])
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1);

  return data?.[0] || null;
}

async function updateCallStatus({ sessionId, status }) {
  const update = { status };
  if (status === 'ended') update.ended_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('call_sessions')
    .update(update)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new InternalError(error.message);

  if (status === 'ended' && data?.daily_room_name) {
    await deleteDailyRoom(data.daily_room_name);
  }

  return data;
}

module.exports = {
  createMeeting,
  getMeetings,
  getMeetingById,
  cancelMeeting,
  getAcademyMembers,
  startCall,
  getPendingCalls,
  getActiveTeamCall,
  updateCallStatus,
};
