-- =============================================================
-- SAMS v1.0 — Development Seed Data
-- Run AFTER 001_initial_schema.sql
-- Creates: 2 academies, sample users per role, teams, venues
-- =============================================================

-- Note: Real auth users must be created via Supabase Auth API.
-- These seeds assume you insert matching auth.users UUIDs first.
-- Replace the placeholder UUIDs below with real auth.users IDs.

-- -------------------------------------------------------
-- ACADEMIES
-- -------------------------------------------------------
INSERT INTO academies (id, name, slug, contact_email) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Riverside FC Academy',    'riverside-fc',    'admin@riversidefc.com'),
  ('a2000000-0000-0000-0000-000000000002', 'Northgate Sports Academy', 'northgate-sports', 'admin@northgate.com');

-- -------------------------------------------------------
-- USER PROFILES  (academy 1 — Riverside FC)
-- -------------------------------------------------------
-- Admin
INSERT INTO user_profiles (id, academy_id, role, first_name, last_name) VALUES
  ('u1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'admin',  'Sarah',  'Mitchell'),
-- Coach
  ('u1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'coach',  'Marcus', 'Reyes'),
-- Players
  ('u1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'player', 'Jordan', 'Ellis'),
  ('u1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'player', 'Priya',  'Nair'),
-- Parent
  ('u1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'parent', 'Karen',  'Ellis');

-- Player extended details
INSERT INTO player_details (academy_id, user_id, date_of_birth, emergency_contact_name, emergency_contact_phone) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000003', '2008-03-14', 'Karen Ellis', '+44 7700 900001'),
  ('a1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000004', '2007-11-22', 'Raj Nair',    '+44 7700 900002');

-- Parent–player link
INSERT INTO parent_player_links (academy_id, parent_id, player_id, relationship) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000005', 'u1000000-0000-0000-0000-000000000003', 'mother');

-- -------------------------------------------------------
-- TEAMS
-- -------------------------------------------------------
INSERT INTO teams (id, academy_id, name, division, sport, head_coach_id) VALUES
  ('t1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Riverside U16', 'U16', 'Football', 'u1000000-0000-0000-0000-000000000002');

-- Team members
INSERT INTO team_members (academy_id, team_id, user_id, member_role, position, jersey_number) VALUES
  ('a1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000002', 'coach', NULL, NULL),
  ('a1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000003', 'player', 'Midfielder', '8'),
  ('a1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000004', 'player', 'Goalkeeper', '1');

-- -------------------------------------------------------
-- VENUES
-- -------------------------------------------------------
INSERT INTO venues (id, academy_id, name, type, location_notes, capacity) VALUES
  ('v1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Pitch A',       'field', 'Main grass pitch, east entrance', 80),
  ('v1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Indoor Gym',    'gym',   'Building 2, ground floor',       40),
  ('v1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Weights Room',  'gym',   'Building 2, first floor',        15);

-- -------------------------------------------------------
-- SESSIONS
-- -------------------------------------------------------
INSERT INTO sessions (id, academy_id, team_id, venue_id, created_by, title, session_type, starts_at, ends_at) VALUES
  ('s1000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000001',
   't1000000-0000-0000-0000-000000000001',
   'v1000000-0000-0000-0000-000000000001',
   'u1000000-0000-0000-0000-000000000002',
   'Tuesday Tactical Session',
   'practice',
   NOW() + INTERVAL '1 day',
   NOW() + INTERVAL '1 day 2 hours');

-- -------------------------------------------------------
-- TEAM CHAT CHANNEL
-- -------------------------------------------------------
INSERT INTO chat_channels (id, academy_id, channel_type, team_id, name) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'team', 't1000000-0000-0000-0000-000000000001', 'Riverside U16 Team Chat');

INSERT INTO channel_members (academy_id, channel_id, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000002'),
  ('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000003'),
  ('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000004');

-- Parent–Coach direct channel
INSERT INTO chat_channels (id, academy_id, channel_type, name) VALUES
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'direct', 'Karen Ellis ↔ Marcus Reyes');

INSERT INTO channel_members (academy_id, channel_id, user_id) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'u1000000-0000-0000-0000-000000000005'),
  ('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'u1000000-0000-0000-0000-000000000002');
