const { Project, ProjectMember, User, Task, Document, Meeting, Log } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Récupérer tous les projets
 * @route   GET /api/projects
 * @access  Private
 */
const getAllProjects = async (req, res) => {
  try {
    const {
      status,
      category,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'DESC',
      search
    } = req.query;

    // Construire les conditions de filtrage
    const where = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = { [Op.like]: `%${category}%` };
    }

    // Recherche par nom ou description
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Calculer l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les projets avec pagination
    const { count, rows: projects } = await Project.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, order.toUpperCase()]],
      include: [
        {
          association: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          association: 'projectMembers',
          attributes: ['id', 'role'],
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName']
          }]
        }
      ]
    });

    // Ajouter le nombre de membres à chaque projet
    const projectsWithCounts = projects.map(project => {
      const projectData = project.toJSON();
      projectData.memberCount = projectData.projectMembers ? projectData.projectMembers.length : 0;
      // Ensure chefProjet and teamId are included
      projectData.chefProjet = project.chefProjet;
      projectData.teamId = project.teamId;
      projectData.createdBy = project.createdBy;
      return projectData;
    });

    // Calculer le nombre total de pages
    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        projects: projectsWithCounts,
        total: count,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des projets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des projets'
    });
  }
};

/**
 * @desc    Récupérer un projet par ID
 * @route   GET /api/projects/:id
 * @access  Private
 */
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le projet avec toutes ses relations
    const project = await Project.findByPk(id, {
      include: [
        {
          association: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'profilePicture']
        },
        {
          association: 'projectMembers',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture', 'role']
          }]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Compter les tâches par statut
    const tasksByStatus = await Task.findAll({
      where: { projectId: id },
      attributes: [
        'status',
        [Task.sequelize.fn('COUNT', Task.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const tasksCount = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      total: 0
    };

    tasksByStatus.forEach(task => {
      tasksCount[task.status] = parseInt(task.count);
      tasksCount.total += parseInt(task.count);
    });

    // Compter les documents
    const documentsCount = await Document.count({
      where: { projectId: id }
    });

    // Compter les réunions
    const meetingsCount = await Meeting.count({
      where: { projectId: id }
    });

    // Préparer les données
    const projectData = project.toJSON();
    projectData.stats = {
      tasks: tasksCount,
      documents: documentsCount,
      meetings: meetingsCount
    };

    res.status(200).json({
      success: true,
      data: {
        project: projectData
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du projet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du projet'
    });
  }
};

/**
 * @desc    Créer un nouveau projet
 * @route   POST /api/projects
 * @access  Private
 */
const createProject = async (req, res) => {
  try {
    const { name, description, category, targetGroup, startDate, endDate, budget, status, teamId, chefProjet } = req.body;

    // Validation des champs requis
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du projet est requis'
      });
    }

    // Créer le projet
    const project = await Project.create({
      name,
      description,
      category,
      targetGroup,
      startDate,
      endDate,
      budget,
      status: status || 'planning',
      teamId: teamId || null,
      chefProjet: chefProjet || req.user.id,
      createdBy: req.user.id
    });

    // Ajouter automatiquement le créateur comme membre avec rôle 'lead'
    await ProjectMember.create({
      projectId: project.id,
      userId: req.user.id,
      role: 'lead',
      joinedAt: new Date()
    });

    // Logger l'action
    await Log.createLog({
      action: 'CREATE_PROJECT',
      description: `Nouveau projet créé: ${project.name}`,
      entityType: 'project',
      entityId: project.id,
      oldValue: null,
      newValue: {
        name: project.name,
        status: project.status,
        createdBy: req.user.id
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Récupérer le projet avec le créateur
    const projectWithCreator = await Project.findByPk(project.id, {
      include: [{
        association: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Projet créé avec succès',
      data: {
        project: projectWithCreator
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création du projet:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du projet'
    });
  }
};

/**
 * @desc    Mettre à jour un projet
 * @route   PUT /api/projects/:id
 * @access  Private (Lead ou Admin)
 */
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, category, targetGroup, startDate, endDate, budget } = req.body;

    // Récupérer le projet
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Vérifier les permissions (Admin ou Lead du projet)
    const isAdmin = req.user.role === 'admin';
    const memberRole = await ProjectMember.findOne({
      where: {
        projectId: id,
        userId: req.user.id
      }
    });

    const isLead = memberRole && memberRole.role === 'lead';

    if (!isAdmin && !isLead) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier ce projet. Seuls le lead du projet ou un admin peuvent le modifier.'
      });
    }

    // Sauvegarder les anciennes valeurs pour le log
    const oldValues = {
      name: project.name,
      description: project.description,
      status: project.status,
      category: project.category,
      targetGroup: project.targetGroup,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget
    };

    // Mettre à jour les champs
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;
    if (category !== undefined) project.category = category;
    if (targetGroup !== undefined) project.targetGroup = targetGroup;
    if (startDate !== undefined) project.startDate = startDate;
    if (endDate !== undefined) project.endDate = endDate;
    if (budget !== undefined) project.budget = budget;

    await project.save();

    // Logger l'action
    await Log.createLog({
      action: 'UPDATE_PROJECT',
      description: `Projet mis à jour: ${project.name}`,
      entityType: 'project',
      entityId: project.id,
      oldValue: oldValues,
      newValue: {
        name: project.name,
        description: project.description,
        status: project.status,
        category: project.category,
        targetGroup: project.targetGroup,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: project.budget
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Projet mis à jour avec succès',
      data: {
        project
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du projet:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du projet'
    });
  }
};

/**
 * @desc    Supprimer un projet (soft delete)
 * @route   DELETE /api/projects/:id
 * @access  Private (Admin ou Lead)
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le projet
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Vérifier les permissions (Admin ou Lead du projet)
    const isAdmin = req.user.role === 'admin';
    const memberRole = await ProjectMember.findOne({
      where: {
        projectId: id,
        userId: req.user.id
      }
    });

    const isLead = memberRole && memberRole.role === 'lead';

    if (!isAdmin && !isLead) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à supprimer ce projet'
      });
    }

    // Soft delete : changer le statut à 'cancelled'
    project.status = 'cancelled';
    await project.save();

    // Logger l'action
    await Log.createLog({
      action: 'DELETE_PROJECT',
      description: `Projet annulé (supprimé): ${project.name}`,
      entityType: 'project',
      entityId: project.id,
      oldValue: { status: 'active' },
      newValue: { status: 'cancelled' },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Projet supprimé (annulé) avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du projet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du projet'
    });
  }
};

/**
 * @desc    Ajouter un membre au projet
 * @route   POST /api/projects/:id/members
 * @access  Private (Lead ou Admin)
 */
const addProjectMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    // Validation
    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        message: 'userId et role sont requis'
      });
    }

    // Vérifier que le projet existe
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Vérifier les permissions (Admin ou Lead du projet)
    const isAdmin = req.user.role === 'admin';
    const memberRole = await ProjectMember.findOne({
      where: {
        projectId: id,
        userId: req.user.id
      }
    });

    const isLead = memberRole && memberRole.role === 'lead';

    if (!isAdmin && !isLead) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à ajouter des membres à ce projet'
      });
    }

    // Vérifier que l'utilisateur à ajouter existe
    const userToAdd = await User.findByPk(userId);
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier que l'utilisateur n'est pas déjà membre
    const existingMember = await ProjectMember.findOne({
      where: {
        projectId: id,
        userId
      }
    });

    if (existingMember) {
      return res.status(409).json({
        success: false,
        message: 'Cet utilisateur est déjà membre du projet'
      });
    }

    // Ajouter le membre
    const member = await ProjectMember.create({
      projectId: id,
      userId,
      role,
      joinedAt: new Date()
    });

    // Récupérer le membre avec les infos utilisateur
    const memberWithUser = await ProjectMember.findByPk(member.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture', 'role']
      }]
    });

    // Logger l'action
    await Log.createLog({
      action: 'ADD_PROJECT_MEMBER',
      description: `Membre ajouté au projet ${project.name}: ${userToAdd.firstName} ${userToAdd.lastName}`,
      entityType: 'project',
      entityId: project.id,
      oldValue: null,
      newValue: {
        userId,
        role,
        userName: `${userToAdd.firstName} ${userToAdd.lastName}`
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Membre ajouté avec succès',
      data: {
        member: memberWithUser
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du membre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du membre'
    });
  }
};

/**
 * @desc    Retirer un membre du projet
 * @route   DELETE /api/projects/:id/members/:userId
 * @access  Private (Lead ou Admin)
 */
const removeProjectMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Vérifier que le projet existe
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Vérifier les permissions (Admin ou Lead du projet)
    const isAdmin = req.user.role === 'admin';
    const currentUserRole = await ProjectMember.findOne({
      where: {
        projectId: id,
        userId: req.user.id
      }
    });

    const isLead = currentUserRole && currentUserRole.role === 'lead';

    if (!isAdmin && !isLead) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à retirer des membres de ce projet'
      });
    }

    // Trouver le membre à retirer
    const member = await ProjectMember.findOne({
      where: {
        projectId: id,
        userId
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName']
      }]
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé dans ce projet'
      });
    }

    // Ne pas permettre de retirer le lead
    if (member.role === 'lead') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de retirer le lead du projet. Transférez d\'abord le rôle de lead à un autre membre.'
      });
    }

    // Retirer le membre
    await member.destroy();

    // Logger l'action
    await Log.createLog({
      action: 'REMOVE_PROJECT_MEMBER',
      description: `Membre retiré du projet ${project.name}: ${member.user.firstName} ${member.user.lastName}`,
      entityType: 'project',
      entityId: project.id,
      oldValue: {
        userId,
        role: member.role,
        userName: `${member.user.firstName} ${member.user.lastName}`
      },
      newValue: null,
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Membre retiré avec succès'
    });

  } catch (error) {
    console.error('Erreur lors du retrait du membre:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du retrait du membre'
    });
  }
};

/**
 * @desc    Récupérer tous les membres d'un projet
 * @route   GET /api/projects/:id/members
 * @access  Private
 */
const getProjectMembers = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le projet existe
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Récupérer tous les membres
    const members = await ProjectMember.findAll({
      where: { projectId: id },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'profilePicture', 'role', 'isActive']
      }],
      order: [
        ['role', 'ASC'], // Lead en premier
        ['joinedAt', 'ASC']
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        members,
        total: members.length
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des membres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des membres'
    });
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectMembers
};
