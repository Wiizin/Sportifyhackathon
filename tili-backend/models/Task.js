module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,  // Changed to nullable since we can have team-based tasks
      references: {
        model: 'projects',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'teams',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    taskName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le nom de la tâche est requis'
        },
        len: {
          args: [1, 255],
          msg: 'Le nom de la tâche doit contenir entre 1 et 255 caractères'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('not_started', 'in_progress', 'completed', 'blocked'),
      allowNull: false,
      defaultValue: 'not_started',
      validate: {
        isIn: {
          args: [['not_started', 'in_progress', 'completed', 'blocked']],
          msg: 'Le statut doit être not_started, in_progress, completed ou blocked'
        }
      }
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
      validate: {
        isIn: {
          args: [['low', 'medium', 'high', 'urgent']],
          msg: 'La priorité doit être low, medium, high ou urgent'
        }
      }
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'tasks',
    timestamps: true,
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['teamId']
      },
      {
        fields: ['assignedTo']
      },
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['dueDate']
      }
    ]
  });

  // ============================================
  // HOOKS
  // ============================================

  /**
   * Hook beforeUpdate - Définir completedAt quand status devient completed
   */
  Task.beforeUpdate(async (task) => {
    if (task.changed('status')) {
      if (task.status === 'completed' && !task.completedAt) {
        task.completedAt = new Date();
      } else if (task.status !== 'completed') {
        task.completedAt = null;
      }
    }
  });

  // ============================================
  // MÉTHODES D'INSTANCE
  // ============================================

  /**
   * Vérifier si la tâche est terminée
   * @returns {boolean}
   */
  Task.prototype.isCompleted = function() {
    return this.status === 'completed';
  };

  /**
   * Vérifier si la tâche est en retard
   * @returns {boolean}
   */
  Task.prototype.isOverdue = function() {
    if (!this.dueDate || this.isCompleted()) return false;
    return new Date() > new Date(this.dueDate);
  };

  /**
   * Vérifier si la tâche est haute priorité
   * @returns {boolean}
   */
  Task.prototype.isHighPriority = function() {
    return ['high', 'urgent'].includes(this.priority);
  };

  /**
   * Marquer comme terminée
   * @returns {Promise<Task>}
   */
  Task.prototype.markAsCompleted = async function() {
    this.status = 'completed';
    this.completedAt = new Date();
    return await this.save();
  };

  /**
   * Assigner à un utilisateur
   * @param {number} userId
   * @returns {Promise<Task>}
   */
  Task.prototype.assignTo = async function(userId) {
    this.assignedTo = userId;
    return await this.save();
  };

  // ============================================
  // MÉTHODES STATIQUES
  // ============================================

  /**
   * Obtenir les tâches par statut
   * @param {string} status
   * @returns {Promise<Task[]>}
   */
  Task.getByStatus = async function(status) {
    return await Task.findAll({
      where: { status }
    });
  };

  /**
   * Obtenir les tâches en retard
   * @returns {Promise<Task[]>}
   */
  Task.getOverdue = async function() {
    return await Task.findAll({
      where: {
        status: {
          [sequelize.Sequelize.Op.ne]: 'completed'
        },
        dueDate: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
  };

  /**
   * Obtenir les tâches par priorité
   * @param {string} priority
   * @returns {Promise<Task[]>}
   */
  Task.getByPriority = async function(priority) {
    return await Task.findAll({
      where: { priority }
    });
  };

  /**
   * Compter les tâches par statut
   * @returns {Promise<Object>}
   */
  Task.countByStatus = async function() {
    const notStarted = await Task.count({ where: { status: 'not_started' } });
    const inProgress = await Task.count({ where: { status: 'in_progress' } });
    const completed = await Task.count({ where: { status: 'completed' } });
    const blocked = await Task.count({ where: { status: 'blocked' } });

    return {
      not_started: notStarted,
      in_progress: inProgress,
      completed,
      blocked,
      total: notStarted + inProgress + completed + blocked
    };
  };

  return Task;
};
