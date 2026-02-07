module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le nom du projet est requis'
        },
        len: {
          args: [3, 200],
          msg: 'Le nom du projet doit contenir entre 3 et 200 caractères'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'planning',
      validate: {
        isIn: {
          args: [['planning', 'active', 'on_hold', 'completed', 'cancelled']],
          msg: 'Le statut doit être planning, active, on_hold, completed ou cancelled'
        }
      }
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    targetGroup: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isAfterStartDate(value) {
          if (this.startDate && value && new Date(value) < new Date(this.startDate)) {
            throw new Error('La date de fin doit être après la date de début');
          }
        }
      }
    },
    budget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: {
          args: [0],
          msg: 'Le budget ne peut pas être négatif'
        }
      }
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'teams',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    chefProjet: {
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
    }
  }, {
    tableName: 'projects',
    timestamps: true,
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['category']
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['chefProjet']
      },
      {
        fields: ['teamId']
      }
    ]
  });

  // ============================================
  // MÉTHODES D'INSTANCE
  // ============================================

  /**
   * Vérifier si le projet est actif
   * @returns {boolean}
   */
  Project.prototype.isActive = function() {
    return this.status === 'active';
  };

  /**
   * Vérifier si le projet est terminé
   * @returns {boolean}
   */
  Project.prototype.isCompleted = function() {
    return this.status === 'completed';
  };

  /**
   * Calculer la durée du projet en jours
   * @returns {number|null}
   */
  Project.prototype.getDuration = function() {
    if (!this.startDate || !this.endDate) return null;
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  /**
   * Vérifier si le projet est en retard
   * @returns {boolean}
   */
  Project.prototype.isOverdue = function() {
    if (!this.endDate || this.isCompleted()) return false;
    return new Date() > new Date(this.endDate);
  };

  // ============================================
  // MÉTHODES STATIQUES
  // ============================================

  /**
   * Obtenir tous les projets actifs
   * @returns {Promise<Project[]>}
   */
  Project.getActiveProjects = async function() {
    return await Project.findAll({
      where: { status: 'active' }
    });
  };

  /**
   * Obtenir les projets par statut
   * @param {string} status
   * @returns {Promise<Project[]>}
   */
  Project.getProjectsByStatus = async function(status) {
    return await Project.findAll({
      where: { status }
    });
  };

  /**
   * Compter les projets par statut
   * @returns {Promise<Object>}
   */
  Project.countByStatus = async function() {
    const planning = await Project.count({ where: { status: 'planning' } });
    const active = await Project.count({ where: { status: 'active' } });
    const onHold = await Project.count({ where: { status: 'on_hold' } });
    const completed = await Project.count({ where: { status: 'completed' } });
    const cancelled = await Project.count({ where: { status: 'cancelled' } });

    return {
      planning,
      active,
      on_hold: onHold,
      completed,
      cancelled,
      total: planning + active + onHold + completed + cancelled
    };
  };

  return Project;
};
