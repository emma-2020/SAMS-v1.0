// src/controllers/admin.controller.js
'use strict';

const adminService = require('../services/admin.service');

async function createInvitation(req, res, next) {
  try {
    const { email, role, first_name, last_name } = req.body;

    const invitation = await adminService.createInvitation({
      adminId:    req.user.id,
      academyId:  req.academyId,
      email,
      role,
      firstName:  first_name,
      lastName:   last_name,
    });

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${invitation.email}.`,
      data:    { invitation },
    });
  } catch (err) { next(err); }
}

async function listInvitations(req, res, next) {
  try {
    const { status } = req.query;
    const invitations = await adminService.listInvitations({
      academyId: req.academyId,
      status,
    });

    return res.status(200).json({
      success: true,
      count:   invitations.length,
      data:    { invitations },
    });
  } catch (err) { next(err); }
}

async function revokeInvitation(req, res, next) {
  try {
    const result = await adminService.revokeInvitation({
      invitationId: req.params.id,
      academyId:    req.academyId,
    });

    return res.status(200).json({
      success: true,
      message: `Invitation for ${result.email} revoked.`,
      data:    { invitation: result },
    });
  } catch (err) { next(err); }
}

module.exports = { createInvitation, listInvitations, revokeInvitation };
