'use strict';
const svc = require('../services/notifications.service');

async function list(req, res) {
  const data = await svc.getForUser(req.user.id);
  res.json({ success: true, data });
}

async function unreadCount(req, res) {
  const count = await svc.countUnread(req.user.id);
  res.json({ success: true, data: { count } });
}

async function read(req, res) {
  await svc.markRead(req.params.id, req.user.id);
  res.json({ success: true });
}

async function readAll(req, res) {
  await svc.markAllRead(req.user.id);
  res.json({ success: true });
}

async function remove(req, res) {
  await svc.remove(req.params.id, req.user.id);
  res.json({ success: true });
}

module.exports = { list, unreadCount, read, readAll, remove };
