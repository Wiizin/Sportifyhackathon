module.exports = (sequelize, DataTypes) => {
  const Log = sequelize.define('Log', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'L\'action est requise'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le type d\'entité est requis'
        }
      },
      comment: 'Type d\'entité affectée (project, task, user, etc.)'
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'L\'ID de l\'entité doit être positif'
        }
      },
      comment: 'ID de l\'entité affectée'
    },
    oldValue: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Ancienne valeur (pour les mises à jour)'
    },
    newValue: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Nouvelle valeur (pour les mises à jour)'
    },
    performedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      validate: {
        notEmpty: {
          msg: 'L\'utilisateur est requis'
        }
      }
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'Support IPv4 et IPv6'
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'logs',
    timestamps: false,
    indexes: [
      {
        fields: ['entityType']
      },
      {
        fields: ['entityId']
      },
      {
        fields: ['performedBy']
      },
      {
        fields: ['timestamp']
      }
    ]
  });

  // ============================================
  // MÉTHODES STATIQUES
  // ============================================

  /**
   * Créer un nouveau log
   * @param {Object} logData
   * @returns {Promise<Log>}
   */
  Log.createLog = async function({ action, description, entityType, entityId, oldValue, newValue, performedBy, ipAddress, userAgent }) {
    return await Log.create({
      action,
      description,
      entityType,
      entityId,
      oldValue,
      newValue,
      performedBy,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });
  };

  /**
   * Obtenir les logs récents
   * @param {number} limit
   * @returns {Promise<Log[]>}
   */
  Log.getRecentLogs = async function(limit = 50) {
    return await Log.findAll({
      limit,
      order: [['timestamp', 'DESC']],
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
  };

  /**
   * Obtenir les logs d'un utilisateur
   * @param {number} userId
   * @param {number} limit
   * @returns {Promise<Log[]>}
   */
  Log.getLogsByUser = async function(userId, limit = 50) {
    return await Log.findAll({
      where: { performedBy: userId },
      limit,
      order: [['timestamp', 'DESC']]
    });
  };

  /**
   * Obtenir les logs d'une entité
   * @param {string} entityType
   * @param {number} entityId
   * @returns {Promise<Log[]>}
   */
  Log.getLogsByEntity = async function(entityType, entityId) {
    return await Log.findAll({
      where: { entityType, entityId },
      order: [['timestamp', 'DESC']],
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
  };

  /**
   * Obtenir les logs par action
   * @param {string} action
   * @param {number} limit
   * @returns {Promise<Log[]>}
   */
  Log.getLogsByAction = async function(action, limit = 100) {
    return await Log.findAll({
      where: { action },
      limit,
      order: [['timestamp', 'DESC']]
    });
  };

  /**
   * Obtenir les logs dans une période
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Promise<Log[]>}
   */
  Log.getLogsByPeriod = async function(startDate, endDate) {
    return await Log.findAll({
      where: {
        timestamp: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        }
      },
      order: [['timestamp', 'DESC']]
    });
  };

  return Log;
};
