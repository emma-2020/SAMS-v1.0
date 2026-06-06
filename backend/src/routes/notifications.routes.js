'use strict';
const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/notifications.controller');

router.use(authenticate);

router.get('/',               ctrl.list);
router.get('/unread-count',   ctrl.unreadCount);
router.patch('/read-all',     ctrl.readAll);
router.patch('/:id/read',     ctrl.read);
router.delete('/:id',         ctrl.remove);

module.exports = router;
