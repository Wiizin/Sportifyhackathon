const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le prénom est requis'
        },
        len: {
          args: [2, 100],
          msg: 'Le prénom doit contenir entre 2 et 100 caractères'
        }
      }
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le nom est requis'
        },
        len: {
          args: [2, 100],
          msg: 'Le nom doit contenir entre 2 et 100 caractères'
        }
      }
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        msg: 'Ce nom d\'utilisateur est déjà utilisé'
      },
      validate: {
        notEmpty: {
          msg: 'Le nom d\'utilisateur est requis'
        },
        len: {
          args: [3, 50],
          msg: 'Le nom d\'utilisateur doit contenir entre 3 et 50 caractères'
        },
        isAlphanumeric: {
          msg: 'Le nom d\'utilisateur ne peut contenir que des lettres et des chiffres'
        }
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: {
        msg: 'Cet email est déjà utilisé'
      },
      validate: {
        notEmpty: {
          msg: 'L\'email est requis'
        },
        isEmail: {
          msg: 'L\'email n\'est pas valide'
        }
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le mot de passe est requis'
        },
        len: {
          args: [8, 255],
          msg: 'Le mot de passe doit contenir au moins 8 caractères'
        }
      }
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
          msg: 'Le numéro de téléphone n\'est pas valide'
        }
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'project_manager', 'consultant'),
      allowNull: false,
      defaultValue: 'consultant',
      validate: {
        isIn: {
          args: [['admin', 'project_manager', 'consultant']],
          msg: 'Le rôle doit être admin, project_manager ou consultant'
        }
      }
    },
    profilePicture: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: {
          msg: 'L\'URL de la photo de profil n\'est pas valide'
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        unique: true,
        fields: ['username']
      },
      {
        fields: ['role']
      },
      {
        fields: ['isActive']
      }
    ],
    // Exclure le password par défaut dans les queries
    defaultScope: {
      attributes: {
        exclude: ['password']
      }
    },
    // Scope pour inclure le password quand nécessaire
    scopes: {
      withPassword: {
        attributes: {
          include: ['password']
        }
      }
    }
  });

  // ============================================
  // HOOKS
  // ============================================

  /**
   * Hook beforeCreate - Hasher le mot de passe avant la création
   */
  User.beforeCreate(async (user) => {
    if (user.password) {
      try {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      } catch (error) {
        throw new Error('Erreur lors du hashage du mot de passe');
      }
    }
  });

  /**
   * Hook beforeUpdate - Hasher le mot de passe s'il a été modifié
   */
  User.beforeUpdate(async (user) => {
    // Vérifier si le mot de passe a été modifié
    if (user.changed('password')) {
      try {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      } catch (error) {
        throw new Error('Erreur lors du hashage du mot de passe');
      }
    }
  });

  // ============================================
  // MÉTHODES D'INSTANCE
  // ============================================

  /**
   * Comparer un mot de passe avec le hash stocké
   * @param {string} password - Le mot de passe en clair à vérifier
   * @returns {Promise<boolean>} - True si le mot de passe correspond
   */
  User.prototype.comparePassword = async function(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      throw new Error('Erreur lors de la vérification du mot de passe');
    }
  };

  /**
   * Obtenir le nom complet de l'utilisateur
   * @returns {string} - Prénom et nom
   */
  User.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  /**
   * Vérifier si l'utilisateur est admin
   * @returns {boolean}
   */
  User.prototype.isAdmin = function() {
    return this.role === 'admin';
  };

  /**
   * Vérifier si l'utilisateur est chef de projet
   * @returns {boolean}
   */
  User.prototype.isProjectManager = function() {
    return this.role === 'project_manager';
  };

  /**
   * Vérifier si l'utilisateur est consultant
   * @returns {boolean}
   */
  User.prototype.isConsultant = function() {
    return this.role === 'consultant';
  };

  /**
   * Mettre à jour la date de dernière connexion
   * @returns {Promise<User>}
   */
  User.prototype.updateLastLogin = async function() {
    this.lastLogin = new Date();
    return await this.save();
  };

  /**
   * Retourner un objet JSON sécurisé (sans password)
   * @returns {Object}
   */
  User.prototype.toSafeJSON = function() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  // ============================================
  // MÉTHODES STATIQUES (de classe)
  // ============================================

  /**
   * Trouver un utilisateur par email (avec le password)
   * @param {string} email
   * @returns {Promise<User|null>}
   */
  User.findByEmail = async function(email) {
    return await User.scope('withPassword').findOne({
      where: { email }
    });
  };

  /**
   * Trouver un utilisateur par username (avec le password)
   * @param {string} username
   * @returns {Promise<User|null>}
   */
  User.findByUsername = async function(username) {
    return await User.scope('withPassword').findOne({
      where: { username }
    });
  };

  /**
   * Obtenir tous les utilisateurs actifs
   * @returns {Promise<User[]>}
   */
  User.getActiveUsers = async function() {
    return await User.findAll({
      where: { isActive: true }
    });
  };

  /**
   * Obtenir les utilisateurs par rôle
   * @param {string} role
   * @returns {Promise<User[]>}
   */
  User.getUsersByRole = async function(role) {
    return await User.findAll({
      where: { role }
    });
  };

  /**
   * Compter les utilisateurs par rôle
   * @returns {Promise<Object>}
   */
  User.countByRole = async function() {
    const admins = await User.count({ where: { role: 'admin' } });
    const projectManagers = await User.count({ where: { role: 'project_manager' } });
    const consultants = await User.count({ where: { role: 'consultant' } });

    return {
      admin: admins,
      project_manager: projectManagers,
      consultant: consultants,
      total: admins + projectManagers + consultants
    };
  };

  return User;
};

