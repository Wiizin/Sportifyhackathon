const { Task, Project, User, Log, Team } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Récupérer toutes les tâches
 * @route   GET /api/tasks
 * @access  Private
 */
const getAllTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      projectId,
      teamId,
      assignedTo,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'DESC'
    } = req.query;

    // Construire les conditions de filtrage
    const where = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // Calculer l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les tâches avec pagination
    const { count, rows: tasks } = await Task.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, order.toUpperCase()]],
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status', 'category'],
          required: false
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    // Calculer le nombre total de pages
    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        tasks,
        total: count,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des tâches:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tâches'
    });
  }
};

/**
 * @desc    Récupérer une tâche par ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'description', 'status', 'category', 'startDate', 'endDate']
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    res.status(200).json({
      success: true,
      data: { task }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la tâche'
    });
  }
};

/**
 * @desc    Créer une nouvelle tâche
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = async (req, res) => {
  try {
    const {
      projectId,
      teamId,
      taskName,
      description,
      priority,
      assignedTo,
      dueDate
    } = req.body;

    // Validation des champs requis - soit projectId soit teamId doit être fourni
    if (!taskName) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de la tâche est requis'
      });
    }

    if (!projectId && !teamId) {
      return res.status(400).json({
        success: false,
        message: 'Un projet ou une équipe est requis'
      });
    }

    // Vérifier que le projet existe si fourni
    if (projectId) {
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Projet non trouvé'
        });
      }
    }

    // Vérifier que l'équipe existe si fournie
    if (teamId) {
      const team = await Team.findByPk(teamId);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Équipe non trouvée'
        });
      }
    }

    // Vérifier que l'utilisateur assigné existe si fourni
    if (assignedTo) {
      const user = await User.findByPk(assignedTo);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur assigné non trouvé'
        });
      }
    }

    // Créer la tâche
    const task = await Task.create({
      projectId: projectId || null,
      teamId: teamId || null,
      taskName,
      description: description || null,
      priority: priority || 'medium',
      assignedTo: assignedTo || null,
      dueDate: dueDate || null,
      status: 'not_started',
      createdBy: req.user.id
    });

    // Logger l'action
    await Log.createLog({
      action: 'CREATE_TASK',
      description: `Tâche créée: ${task.taskName}`,
      entityType: 'task',
      entityId: task.id,
      oldValue: null,
      newValue: {
        taskName: task.taskName,
        projectId: task.projectId,
        teamId: task.teamId,
        assignedTo: task.assignedTo,
        priority: task.priority,
        status: task.status
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Récupérer la tâche complète avec les relations
    const createdTask = await Task.findByPk(task.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status'],
          required: false
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Tâche créée avec succès',
      data: { task: createdTask }
    });

  } catch (error) {
    console.error('Erreur lors de la création de la tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la tâche'
    });
  }
};

/**
 * @desc    Mettre à jour une tâche
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      taskName,
      description,
      status,
      priority,
      assignedTo,
      dueDate
    } = req.body;

    // Récupérer la tâche existante
    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    // Sauvegarder les anciennes valeurs pour le log
    const oldValue = {
      taskName: task.taskName,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate
    };

    // Vérifier que l'utilisateur assigné existe si fourni
    if (assignedTo !== undefined && assignedTo !== null) {
      const user = await User.findByPk(assignedTo);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur assigné non trouvé'
        });
      }
    }

    // Mettre à jour la tâche
    // Le hook beforeUpdate gérera automatiquement completedAt si status = 'completed'
    await task.update({
      taskName: taskName !== undefined ? taskName : task.taskName,
      description: description !== undefined ? description : task.description,
      status: status !== undefined ? status : task.status,
      priority: priority !== undefined ? priority : task.priority,
      assignedTo: assignedTo !== undefined ? assignedTo : task.assignedTo,
      dueDate: dueDate !== undefined ? dueDate : task.dueDate
    });

    // Nouvelles valeurs pour le log
    const newValue = {
      taskName: task.taskName,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      completedAt: task.completedAt
    };

    // Logger l'action
    await Log.create({
      action: 'UPDATE_TASK',
      description: `Tâche mise à jour: ${task.taskName}`,
      entityType: 'task',
      entityId: task.id,
      oldValue,
      newValue,
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Récupérer la tâche mise à jour avec les relations
    const updatedTask = await Task.findByPk(task.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Tâche mise à jour avec succès',
      data: { task: updatedTask }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la tâche'
    });
  }
};

/**
 * @desc    Supprimer une tâche (suppression réelle)
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    // Sauvegarder les informations avant suppression pour le log
    const taskData = {
      id: task.id,
      taskName: task.taskName,
      projectId: task.projectId,
      status: task.status
    };

    // Logger l'action avant la suppression
    await Log.create({
      action: 'DELETE_TASK',
      description: `Tâche supprimée: ${task.taskName}`,
      entityType: 'task',
      entityId: task.id,
      oldValue: taskData,
      newValue: null,
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Suppression réelle
    await task.destroy();

    res.status(200).json({
      success: true,
      message: 'Tâche supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la tâche'
    });
  }
};

/**
 * @desc    Récupérer toutes les tâches d'un projet
 * @route   GET /api/tasks/project/:projectId
 * @access  Private
 */
const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, priority, sortBy = 'createdAt', order = 'ASC' } = req.query;

    // Vérifier que le projet existe
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Construire les conditions de filtrage
    const where = { projectId };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    // Récupérer toutes les tâches du projet
    const tasks = await Task.findAll({
      where,
      order: [[sortBy, order.toUpperCase()]],
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    // Statistiques sur les tâches
    const stats = {
      total: tasks.length,
      notStarted: tasks.filter(t => t.status === 'not_started').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      blocked: tasks.filter(t => t.status === 'blocked').length
    };

    res.status(200).json({
      success: true,
      data: {
        tasks,
        stats,
        project: {
          id: project.id,
          name: project.name
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des tâches du projet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tâches du projet'
    });
  }
};

/**
 * @desc    Récupérer les tâches assignées à un utilisateur
 * @route   GET /api/tasks/user/:userId?
 * @access  Private
 */
const getUserTasks = async (req, res) => {
  try {
    // Si userId fourni dans params, l'utiliser, sinon utiliser req.user.id
    const userId = req.params.userId || req.user.id;
    const { status, priority, sortBy = 'dueDate', order = 'ASC' } = req.query;

    // Vérifier que l'utilisateur existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Construire les conditions de filtrage
    const where = { assignedTo: userId };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    // Récupérer toutes les tâches de l'utilisateur
    const tasks = await Task.findAll({
      where,
      order: [[sortBy, order.toUpperCase()]],
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status', 'category']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    // Statistiques sur les tâches
    const stats = {
      total: tasks.length,
      notStarted: tasks.filter(t => t.status === 'not_started').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length
    };

    res.status(200).json({
      success: true,
      data: {
        tasks,
        stats,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des tâches de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tâches de l\'utilisateur'
    });
  }
};

/**
 * @desc    Mettre à jour uniquement le statut d'une tâche
 * @route   PATCH /api/tasks/:id/status
 * @access  Private
 */
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validation du champ requis
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Le statut est requis'
      });
    }

    // Valider que le statut est valide
    const validStatuses = ['not_started', 'in_progress', 'completed', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Le statut doit être: ${validStatuses.join(', ')}`
      });
    }

    // Récupérer la tâche existante
    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    // Sauvegarder l'ancien statut
    const oldStatus = task.status;

    // Mettre à jour uniquement le statut
    // Le hook beforeUpdate gérera automatiquement completedAt
    await task.update({ status });

    // Logger l'action
    await Log.create({
      action: 'UPDATE_TASK_STATUS',
      description: `Statut de tâche modifié: ${task.taskName} (${oldStatus} → ${status})`,
      entityType: 'task',
      entityId: task.id,
      oldValue: { status: oldStatus },
      newValue: { status: task.status, completedAt: task.completedAt },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Récupérer la tâche mise à jour avec les relations
    const updatedTask = await Task.findByPk(task.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Statut de la tâche mis à jour avec succès',
      data: { task: updatedTask }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut'
    });
  }
};

/**
 * @desc    Assigner une tâche à un membre de l'équipe
 * @route   PATCH /api/tasks/:id/assign
 * @access  Private (Chef de projet)
 */
const assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    // Validation du champ requis
    if (assignedTo === undefined) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID de l\'utilisateur à assigner est requis'
      });
    }

    // Récupérer la tâche existante
    const task = await Task.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'createdBy']
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche non trouvée'
      });
    }

    // Vérifier que l'utilisateur connecté est le chef de projet (créateur du projet)
    // ou un admin
    if (task.project.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Seul le chef de projet peut assigner des tâches'
      });
    }

    // Sauvegarder l'ancien assigné pour le log
    const oldAssignedTo = task.assignedTo;

    // Si assignedTo est null, on désassigne la tâche
    if (assignedTo === null) {
      await task.update({ assignedTo: null });

      // Logger l'action
      await Log.create({
        action: 'UNASSIGN_TASK',
        description: `Tâche désassignée: ${task.taskName}`,
        entityType: 'task',
        entityId: task.id,
        oldValue: { assignedTo: oldAssignedTo },
        newValue: { assignedTo: null },
        performedBy: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } else {
      // Vérifier que l'utilisateur à assigner existe
      const userToAssign = await User.findByPk(assignedTo);
      if (!userToAssign) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur à assigner non trouvé'
        });
      }

      // Mettre à jour l'assignation
      await task.update({ assignedTo });

      // Logger l'action
      await Log.create({
        action: 'ASSIGN_TASK',
        description: `Tâche assignée: ${task.taskName} à ${userToAssign.firstName} ${userToAssign.lastName}`,
        entityType: 'task',
        entityId: task.id,
        oldValue: { assignedTo: oldAssignedTo },
        newValue: { assignedTo: assignedTo },
        performedBy: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    // Récupérer la tâche mise à jour avec les relations
    const updatedTask = await Task.findByPk(task.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: assignedTo === null ? 'Tâche désassignée avec succès' : 'Tâche assignée avec succès',
      data: { task: updatedTask }
    });

  } catch (error) {
    console.error('Erreur lors de l\'assignation de la tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'assignation de la tâche'
    });
  }
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getProjectTasks,
  getUserTasks,
  updateTaskStatus,
  assignTask
};
