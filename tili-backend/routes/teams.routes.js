const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ============================================
// TEAM MANAGEMENT (Project Manager routes)
// ============================================

// Get all my teams (project manager) - supports multiple teams
router.get('/my-teams', authorize('project_manager', 'admin'), teamController.getMyTeams);

// Get my team (project manager) - backward compatibility, returns first team
router.get('/my-team', authorize('project_manager', 'admin'), teamController.getMyTeam);

// Create a new team
router.post('/', authorize('project_manager', 'admin'), teamController.createTeam);

// Update team
router.put('/:teamId', authorize('project_manager', 'admin'), teamController.updateTeam);

// Get available members to invite
router.get('/available-members', authorize('project_manager', 'admin'), teamController.getAvailableMembers);

// Get team members (for task assignment)
router.get('/members', authorize('project_manager', 'admin'), teamController.getTeamMembers);

// Remove member from team
router.delete('/members/:memberId', authorize('project_manager', 'admin'), teamController.removeMember);

// Remove member from specific team
router.delete('/:teamId/members/:memberId', authorize('project_manager', 'admin'), teamController.removeTeamMember);

// ============================================
// INVITATION ROUTES
// ============================================

// Send invitation (project manager)
router.post('/invitations', authorize('project_manager', 'admin'), teamController.sendInvitation);

// Get sent invitations (project manager)
router.get('/invitations/sent', authorize('project_manager', 'admin'), teamController.getSentInvitations);

// Cancel invitation (project manager)
router.delete('/invitations/:invitationId', authorize('project_manager', 'admin'), teamController.cancelInvitation);

// Get received invitations (consultant/member)
router.get('/invitations/received', teamController.getReceivedInvitations);

// Respond to invitation (consultant/member)
router.put('/invitations/:invitationId/respond', teamController.respondToInvitation);

// ============================================
// MEMBER ROUTES (for consultants)
// ============================================

// Get teams where user is a member
router.get('/member-teams', teamController.getMemberTeams);

module.exports = router;
