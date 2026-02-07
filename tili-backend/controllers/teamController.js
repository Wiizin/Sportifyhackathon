const db = require('../models');
const { Op } = require('sequelize');

const Team = db.Team;
const TeamMember = db.TeamMember;
const TeamInvitation = db.TeamInvitation;
const User = db.User;
const Project = db.Project;

// ============================================
// GET ALL MY TEAMS (for project manager - supports multiple teams)
// ============================================
exports.getMyTeams = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all teams where user is manager
    const teams = await Team.findAll({
      where: { managerId: userId },
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'profilePicture']
        },
        {
          model: TeamMember,
          as: 'teamMembers',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'profilePicture', 'role']
            }
          ]
        },
        {
          model: Project,
          as: 'projects',
          attributes: ['id', 'name', 'description', 'status', 'category', 'startDate', 'endDate'],
          limit: 1
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Format the response to include project info for each team
    const teamsData = teams.map(team => {
      const teamJson = team.toJSON();
      return {
        ...teamJson,
        project: teamJson.projects && teamJson.projects.length > 0 ? teamJson.projects[0] : null
      };
    });

    res.json({
      success: true,
      data: {
        teams: teamsData,
        total: teamsData.length
      }
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teams',
      error: error.message
    });
  }
};

// ============================================
// GET MY TEAM (for project manager - backward compatibility, returns first team)
// ============================================
exports.getMyTeam = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find first team where user is manager
    const team = await Team.findOne({
      where: { managerId: userId },
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'profilePicture']
        },
        {
          model: TeamMember,
          as: 'teamMembers',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'profilePicture', 'role']
            }
          ]
        },
        {
          model: Project,
          as: 'projects',
          attributes: ['id', 'name', 'description', 'status', 'category', 'startDate', 'endDate'],
          limit: 1
        }
      ]
    });

    // Format the response to include project info
    let teamData = null;
    if (team) {
      teamData = {
        ...team.toJSON(),
        project: team.projects && team.projects.length > 0 ? team.projects[0] : null
      };
      delete teamData.projects; // Remove the array, keep single project
    }

    res.json({
      success: true,
      data: {
        team: teamData,
        hasTeam: !!team
      }
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team',
      error: error.message
    });
  }
};

// ============================================
// CREATE TEAM (now allows multiple teams)
// ============================================
exports.createTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    // Create the team (no longer checking for existing team - allow multiple)
    const team = await Team.create({
      name,
      description,
      managerId: userId,
      status: 'active'
    });

    // Fetch the created team with associations
    const createdTeam = await Team.findByPk(team.id, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'profilePicture']
        },
        {
          model: TeamMember,
          as: 'teamMembers',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'profilePicture', 'role']
            }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: { team: createdTeam }
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating team',
      error: error.message
    });
  }
};

// ============================================
// UPDATE TEAM
// ============================================
exports.updateTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;
    const { name, description, status } = req.body;

    const team = await Team.findOne({
      where: { id: teamId, managerId: userId }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found or you are not the manager'
      });
    }

    await team.update({
      name: name || team.name,
      description: description !== undefined ? description : team.description,
      status: status || team.status
    });

    res.json({
      success: true,
      message: 'Team updated successfully',
      data: { team }
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating team',
      error: error.message
    });
  }
};

// ============================================
// GET AVAILABLE MEMBERS (consultants to invite)
// ============================================
exports.getAvailableMembers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, teamId } = req.query;

    // Start with excluding the current user
    let excludeUserIds = [userId];

    // Get ALL users who are already members of ANY team
    const allTeamMembers = await TeamMember.findAll({
      attributes: ['userId']
    });

    // Get ALL users with pending invitations in ANY team
    const allPendingInvitations = await TeamInvitation.findAll({
      where: { status: 'pending' },
      attributes: ['userId']
    });

    excludeUserIds = [
      ...excludeUserIds,
      ...allTeamMembers.map(m => m.userId),
      ...allPendingInvitations.map(i => i.userId)
    ];

    // Remove duplicates
    excludeUserIds = [...new Set(excludeUserIds)];

    // Build search condition
    const whereCondition = {
      id: { [Op.notIn]: excludeUserIds },
      role: 'consultant', // Only consultants can be team members
      isActive: true // Only active users
    };

    if (search) {
      whereCondition[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } }
      ];
    }

    const availableUsers = await User.findAll({
      where: whereCondition,
      attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'profilePicture'],
      limit: 20
    });

    res.json({
      success: true,
      data: { users: availableUsers }
    });
  } catch (error) {
    console.error('Error fetching available members:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available members',
      error: error.message
    });
  }
};

// ============================================
// SEND INVITATION
// ============================================
exports.sendInvitation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId, role, message, teamId } = req.body;

    let team;

    if (teamId) {
      // If teamId is provided, use that specific team
      team = await Team.findOne({
        where: { id: teamId, managerId: userId }
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found or you are not the manager'
        });
      }
    } else {
      // Fallback: Get the first team (backward compatibility)
      team = await Team.findOne({
        where: { managerId: userId }
      });

      if (!team) {
        return res.status(400).json({
          success: false,
          message: 'You need to create a team first'
        });
      }
    }

    // Check if user exists and is a consultant
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (targetUser.role !== 'consultant') {
      return res.status(400).json({
        success: false,
        message: 'Only consultants can be invited to teams'
      });
    }

    // Check if already a member of THIS SPECIFIC team
    const existingMember = await TeamMember.findOne({
      where: { teamId: team.id, userId: targetUserId }
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this team'
      });
    }

    // Check for pending invitation for THIS SPECIFIC team
    const existingPendingInvitation = await TeamInvitation.findOne({
      where: { teamId: team.id, userId: targetUserId, status: 'pending' }
    });

    if (existingPendingInvitation) {
      return res.status(400).json({
        success: false,
        message: 'An invitation is already pending for this user in this team'
      });
    }

    // Delete any old declined/cancelled invitations for this user in this team
    // This allows re-inviting users who previously declined or were cancelled
    await TeamInvitation.destroy({
      where: {
        teamId: team.id,
        userId: targetUserId,
        status: { [Op.in]: ['declined', 'cancelled', 'accepted'] }
      }
    });

    // Create invitation
    const invitation = await TeamInvitation.create({
      teamId: team.id,
      userId: targetUserId,
      invitedBy: userId,
      role: role || 'member',
      message,
      status: 'pending'
    });

    // Fetch with associations
    const createdInvitation = await TeamInvitation.findByPk(invitation.id, {
      include: [
        {
          model: User,
          as: 'invitedUser',
          attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'profilePicture']
        },
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: { invitation: createdInvitation }
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending invitation',
      error: error.message
    });
  }
};

// ============================================
// GET SENT INVITATIONS (for manager)
// ============================================
exports.getSentInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.query;

    let whereCondition = {};

    if (teamId) {
      // If teamId is provided, verify the user is the manager of that team
      const team = await Team.findOne({
        where: { id: teamId, managerId: userId }
      });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found or you are not the manager'
        });
      }

      whereCondition.teamId = teamId;
    } else {
      // If no teamId, get invitations from all teams managed by the user
      const teams = await Team.findAll({
        where: { managerId: userId },
        attributes: ['id']
      });

      if (teams.length === 0) {
        return res.json({
          success: true,
          data: { invitations: [] }
        });
      }

      whereCondition.teamId = { [Op.in]: teams.map(t => t.id) };
    }

    const invitations = await TeamInvitation.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'invitedUser',
          attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'profilePicture']
        },
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { invitations }
    });
  } catch (error) {
    console.error('Error fetching sent invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sent invitations',
      error: error.message
    });
  }
};

// ============================================
// GET RECEIVED INVITATIONS (for member/consultant)
// ============================================
exports.getReceivedInvitations = async (req, res) => {
  try {
    const userId = req.user.id;

    const invitations = await TeamInvitation.findAll({
      where: { userId, status: 'pending' },
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name', 'description'],
          include: [
            {
              model: User,
              as: 'manager',
              attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture']
            }
          ]
        },
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { invitations }
    });
  } catch (error) {
    console.error('Error fetching received invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching received invitations',
      error: error.message
    });
  }
};

// ============================================
// RESPOND TO INVITATION (accept/decline)
// ============================================
exports.respondToInvitation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { invitationId } = req.params;
    const { response } = req.body; // 'accepted' or 'declined'

    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Response must be "accepted" or "declined"'
      });
    }

    const invitation = await TeamInvitation.findOne({
      where: { id: invitationId, userId, status: 'pending' }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or already responded'
      });
    }

    // Update invitation status
    await invitation.update({
      status: response,
      respondedAt: new Date()
    });

    // If accepted, add user to team
    if (response === 'accepted') {
      await TeamMember.create({
        teamId: invitation.teamId,
        userId,
        role: invitation.role,
        joinedAt: new Date()
      });
    }

    res.json({
      success: true,
      message: response === 'accepted' ? 'You have joined the team!' : 'Invitation declined',
      data: { invitation }
    });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Error responding to invitation',
      error: error.message
    });
  }
};

// ============================================
// CANCEL INVITATION (for manager)
// ============================================
exports.cancelInvitation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { invitationId } = req.params;

    // Get all teams managed by this user
    const teams = await Team.findAll({
      where: { managerId: userId },
      attributes: ['id']
    });

    if (teams.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No teams found'
      });
    }

    const teamIds = teams.map(t => t.id);

    // Find the invitation in any of the user's teams
    const invitation = await TeamInvitation.findOne({
      where: {
        id: invitationId,
        teamId: { [Op.in]: teamIds },
        status: 'pending'
      }
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found or already responded'
      });
    }

    await invitation.update({ status: 'cancelled' });

    res.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling invitation',
      error: error.message
    });
  }
};

// ============================================
// REMOVE MEMBER FROM TEAM
// ============================================
exports.removeMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const { memberId } = req.params;

    const team = await Team.findOne({
      where: { managerId: userId }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const member = await TeamMember.findOne({
      where: { teamId: team.id, userId: memberId }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in your team'
      });
    }

    await member.destroy();

    res.json({
      success: true,
      message: 'Member removed from team successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing member',
      error: error.message
    });
  }
};

// ============================================
// GET TEAM MEMBERS (for task assignment)
// ============================================
exports.getTeamMembers = async (req, res) => {
  try {
    const userId = req.user.id;

    const team = await Team.findOne({
      where: { managerId: userId },
      include: [
        {
          model: TeamMember,
          as: 'teamMembers',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'profilePicture']
            }
          ]
        }
      ]
    });

    if (!team) {
      return res.json({
        success: true,
        data: { members: [] }
      });
    }

    const members = team.teamMembers.map(tm => ({
      id: tm.user.id,
      firstName: tm.user.firstName,
      lastName: tm.user.lastName,
      email: tm.user.email,
      username: tm.user.username,
      profilePicture: tm.user.profilePicture,
      role: tm.role,
      joinedAt: tm.joinedAt
    }));

    res.json({
      success: true,
      data: { members }
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team members',
      error: error.message
    });
  }
};

// ============================================
// REMOVE MEMBER FROM SPECIFIC TEAM
// ============================================
exports.removeTeamMember = async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId, memberId } = req.params;

    // Verify the user is the manager of this team
    const team = await Team.findOne({
      where: { id: teamId, managerId: userId }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found or you are not the manager'
      });
    }

    const member = await TeamMember.findOne({
      where: { teamId, userId: memberId }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this team'
      });
    }

    await member.destroy();

    res.json({
      success: true,
      message: 'Member removed from team successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing member',
      error: error.message
    });
  }
};

// ============================================
// GET MEMBER TEAMS (for consultants - teams they belong to)
// ============================================
exports.getMemberTeams = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all teams where user is a member
    const teamMemberships = await TeamMember.findAll({
      where: { userId },
      include: [
        {
          model: Team,
          as: 'team',
          include: [
            {
              model: User,
              as: 'manager',
              attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'profilePicture']
            },
            {
              model: TeamMember,
              as: 'teamMembers',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'profilePicture', 'role']
                }
              ]
            },
            {
              model: Project,
              as: 'projects',
              attributes: ['id', 'name', 'description', 'status', 'category', 'startDate', 'endDate'],
              limit: 1
            }
          ]
        }
      ]
    });

    // Format the response
    const teams = teamMemberships.map(tm => {
      const teamJson = tm.team.toJSON();
      return {
        ...teamJson,
        project: teamJson.projects && teamJson.projects.length > 0 ? teamJson.projects[0] : null,
        myRole: tm.role
      };
    });

    res.json({
      success: true,
      data: {
        teams,
        total: teams.length
      }
    });
  } catch (error) {
    console.error('Error fetching member teams:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teams',
      error: error.message
    });
  }
};
