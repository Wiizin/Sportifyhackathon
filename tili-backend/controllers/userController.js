const { User, Project, Task, Document, Log } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Récupérer tous les utilisateurs
 * @route   GET /api/users
 * @access  Private (tous les utilisateurs connectés)
 */
const getAllUsers = async (req, res) => {
  try {
    // Récupérer les paramètres de query
    const {
      role,
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'DESC',
      search
    } = req.query;

    // Construire les conditions de filtrage
    const where = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Recherche par nom, email ou username
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } }
      ];
    }

    // Calculer l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les utilisateurs avec pagination
    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, order.toUpperCase()]],
      attributes: { exclude: ['password'] }
    });

    // Calculer le nombre total de pages
    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        users,
        total: count,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs'
    });
  }
};

/**
 * @desc    Récupérer un utilisateur par ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer l'utilisateur avec ses relations
    const user = await User.findByPk(id, {
      include: [
        {
          association: 'projects',
          attributes: ['id', 'name', 'status'],
          through: { attributes: ['role'] }
        },
        {
          association: 'assignedTasks',
          attributes: ['id', 'taskName', 'status', 'priority']
        },
        {
          association: 'uploadedDocuments',
          attributes: ['id', 'title', 'type']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Compter les statistiques
    const projectCount = user.projects ? user.projects.length : 0;
    const taskCount = user.assignedTasks ? user.assignedTasks.length : 0;
    const documentCount = user.uploadedDocuments ? user.uploadedDocuments.length : 0;

    // Préparer les données
    const userData = user.toJSON();
    userData.stats = {
      projectCount,
      taskCount,
      documentCount
    };

    res.status(200).json({
      success: true,
      data: {
        user: userData
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur'
    });
  }
};

/**
 * @desc    Créer un nouvel utilisateur (Admin only)
 * @route   POST /api/users
 * @access  Private/Admin
 */
const createUser = async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, phoneNumber, role } = req.body;

    // Validation des champs requis
    if (!firstName || !lastName || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs requis doivent être renseignés',
        errors: {
          firstName: !firstName ? 'Le prénom est requis' : undefined,
          lastName: !lastName ? 'Le nom est requis' : undefined,
          username: !username ? 'Le nom d\'utilisateur est requis' : undefined,
          email: !email ? 'L\'email est requis' : undefined,
          password: !password ? 'Le mot de passe est requis' : undefined
        }
      });
    }

    // Vérifier si l'email existe déjà
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Vérifier si le username existe déjà
    const usernameExists = await User.findOne({ where: { username } });
    if (usernameExists) {
      return res.status(409).json({
        success: false,
        message: 'Ce nom d\'utilisateur est déjà utilisé'
      });
    }

    // Créer l'utilisateur
    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      password,
      phoneNumber: phoneNumber || null,
      role: role || 'consultant',
      isActive: true
    });

    // Logger l'action
    await Log.createLog({
      action: 'CREATE_USER',
      description: `Nouvel utilisateur créé par admin: ${user.email}`,
      entityType: 'user',
      entityId: user.id,
      oldValue: null,
      newValue: {
        email: user.email,
        username: user.username,
        role: user.role
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        user: user.toSafeJSON()
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);

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
      message: 'Erreur lors de la création de l\'utilisateur'
    });
  }
};

/**
 * @desc    Mettre à jour un utilisateur
 * @route   PUT /api/users/:id
 * @access  Private
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phoneNumber, profilePicture, role, isActive, password } = req.body;

    // Récupérer l'utilisateur
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier les permissions
    // Un utilisateur peut modifier son propre profil
    // Un admin peut modifier n'importe quel profil
    if (req.user.id !== parseInt(id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier cet utilisateur'
      });
    }

    // Sauvegarder les anciennes valeurs pour le log
    const oldValues = {
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      role: user.role,
      isActive: user.isActive
    };

    // Mettre à jour les champs de base (tous les utilisateurs)
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    // Mettre à jour le password si fourni
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Le mot de passe doit contenir au moins 8 caractères'
        });
      }
      user.password = password; // Sera hashé par le hook
    }

    // Seuls les admins peuvent modifier le rôle et le statut
    if (req.user.role === 'admin') {
      if (role !== undefined) user.role = role;
      if (isActive !== undefined) user.isActive = isActive;
    }

    await user.save();

    // Logger l'action
    await Log.createLog({
      action: 'UPDATE_USER',
      description: `Utilisateur mis à jour: ${user.email}`,
      entityType: 'user',
      entityId: user.id,
      oldValue: oldValues,
      newValue: {
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        role: user.role,
        isActive: user.isActive
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      data: {
        user: user.toSafeJSON()
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);

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
      message: 'Erreur lors de la mise à jour de l\'utilisateur'
    });
  }
};

/**
 * @desc    Supprimer un utilisateur (soft delete)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Empêcher la suppression de son propre compte
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas désactiver votre propre compte'
      });
    }

    // Récupérer l'utilisateur
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Soft delete : désactiver le compte
    user.isActive = false;
    await user.save();

    // Logger l'action
    await Log.createLog({
      action: 'DELETE_USER',
      description: `Utilisateur désactivé: ${user.email}`,
      entityType: 'user',
      entityId: user.id,
      oldValue: { isActive: true },
      newValue: { isActive: false },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Utilisateur désactivé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'utilisateur'
    });
  }
};

/**
 * @desc    Activer/Réactiver un utilisateur
 * @route   PATCH /api/users/:id/activate
 * @access  Private/Admin
 */
const activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer l'utilisateur
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Si déjà actif
    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cet utilisateur est déjà actif'
      });
    }

    // Activer le compte
    user.isActive = true;
    await user.save();

    // Logger l'action
    await Log.createLog({
      action: 'ACTIVATE_USER',
      description: `Utilisateur réactivé: ${user.email}`,
      entityType: 'user',
      entityId: user.id,
      oldValue: { isActive: false },
      newValue: { isActive: true },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Utilisateur activé avec succès',
      data: {
        user: user.toSafeJSON()
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'activation de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'activation de l\'utilisateur'
    });
  }
};

/**
 * @desc    Obtenir les statistiques d'un utilisateur
 * @route   GET /api/users/:id/stats
 * @access  Private
 */
const getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur existe
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Compter les projets
    const projectCount = await Project.count({
      include: [{
        association: 'members',
        where: { id }
      }]
    });

    // Compter les tâches assignées
    const assignedTaskCount = await Task.count({
      where: { assignedTo: id }
    });

    // Compter les tâches créées
    const createdTaskCount = await Task.count({
      where: { createdBy: id }
    });

    // Compter les documents uploadés
    const documentCount = await Document.count({
      where: { uploadedBy: id }
    });

    // Compter les projets créés
    const createdProjectCount = await Project.count({
      where: { createdBy: id }
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          projects: projectCount,
          assignedTasks: assignedTaskCount,
          createdTasks: createdTaskCount,
          documents: documentCount,
          createdProjects: createdProjectCount
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  getUserStats
};

