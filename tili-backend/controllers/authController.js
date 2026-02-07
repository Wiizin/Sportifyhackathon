const jwt = require('jsonwebtoken');
const { User, Log } = require('../models');

/**
 * Générer un token JWT
 * @param {Object} user - Utilisateur
 * @returns {string} - Token JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * @desc    Inscription d'un nouvel utilisateur
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, phoneNumber } = req.body;

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
          password: !password ? 'Le mot de passe est requis' : undefined,
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

    // Créer l'utilisateur (le password sera hashé automatiquement par le hook)
    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      password,
      phoneNumber: phoneNumber || null,
      role: 'consultant', // Rôle par défaut
      isActive: true
    });

    // Logger l'action
    await Log.createLog({
      action: 'REGISTER',
      description: `Nouvel utilisateur inscrit: ${user.email}`,
      entityType: 'user',
      entityId: user.id,
      oldValue: null,
      newValue: {
        email: user.email,
        username: user.username,
        role: user.role
      },
      performedBy: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Retourner l'utilisateur sans le password
    const userWithoutPassword = user.toSafeJSON();

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        user: userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);

    // Gérer les erreurs de validation Sequelize
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
      message: 'Erreur lors de l\'inscription'
    });
  }
};

/**
 * @desc    Connexion d'un utilisateur
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validation des champs requis
    if ((!email && !username) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Username et mot de passe requis'
      });
    }

    // Trouver l'utilisateur par email OU username (avec le password)
    let user;
    if (email) {
      user = await User.findByEmail(email);
    } else if (username) {
      user = await User.findByUsername(username);
    }

    // Vérifier si l'utilisateur existe
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est désactivé. Contactez l\'administrateur.'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // Mettre à jour la dernière connexion
    await user.updateLastLogin();

    // Générer le token JWT
    const token = generateToken(user);

    // Logger l'action
    await Log.createLog({
      action: 'LOGIN',
      description: `Connexion réussie: ${user.email}`,
      entityType: 'user',
      entityId: user.id,
      oldValue: null,
      newValue: { lastLogin: new Date() },
      performedBy: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Retourner le token et l'utilisateur sans password
    const userWithoutPassword = user.toSafeJSON();

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        user: userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    });
  }
};

/**
 * @desc    Obtenir les informations de l'utilisateur connecté
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    // L'utilisateur est déjà disponible via req.user (mis par authMiddleware)
    const userId = req.user.id;

    // Récupérer l'utilisateur avec ses projets
    const user = await User.findByPk(userId, {
      include: [
        {
          association: 'projects',
          attributes: ['id', 'name', 'status'],
          through: { attributes: ['role'] }
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Compter le nombre de projets
    const projectCount = user.projects ? user.projects.length : 0;

    // Préparer les données utilisateur
    const userData = user.toJSON();
    userData.projectCount = projectCount;

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
      message: 'Erreur lors de la récupération des informations'
    });
  }
};

/**
 * @desc    Déconnexion d'un utilisateur
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    // Logger l'action
    if (req.user) {
      await Log.createLog({
        action: 'LOGOUT',
        description: `Déconnexion: ${req.user.email}`,
        entityType: 'user',
        entityId: req.user.id,
        oldValue: null,
        newValue: null,
        performedBy: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion'
    });
  }
};

/**
 * @desc    Mettre à jour le profil de l'utilisateur connecté
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phoneNumber, profilePicture } = req.body;

    // Récupérer l'utilisateur
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Sauvegarder les anciennes valeurs pour le log
    const oldValues = {
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture
    };

    // Mettre à jour les champs
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    // Logger l'action
    await Log.createLog({
      action: 'UPDATE_PROFILE',
      description: `Mise à jour du profil: ${user.email}`,
      entityType: 'user',
      entityId: user.id,
      oldValue: oldValues,
      newValue: {
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture
      },
      performedBy: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        user: user.toSafeJSON()
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);

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
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
};

/**
 * @desc    Changer le mot de passe de l'utilisateur connecté
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
      });
    }

    // Récupérer l'utilisateur avec le password
    const user = await User.scope('withPassword').findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le mot de passe actuel
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Mettre à jour le mot de passe (sera hashé par le hook)
    user.password = newPassword;
    await user.save();

    // Logger l'action
    await Log.createLog({
      action: 'CHANGE_PASSWORD',
      description: `Changement de mot de passe: ${user.email}`,
      entityType: 'user',
      entityId: user.id,
      oldValue: null,
      newValue: null,
      performedBy: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  updateProfile,
  changePassword
};

