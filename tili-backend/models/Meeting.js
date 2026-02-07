module.exports = (sequelize, DataTypes) => {
  const Meeting = sequelize.define('Meeting', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le titre de la réunion est requis'
        },
        len: {
          args: [1, 255],
          msg: 'Le titre doit contenir entre 1 et 255 caractères'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    meetingDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La date de la réunion est requise'
        },
        isDate: {
          msg: 'La date n\'est pas valide'
        }
      }
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Durée en minutes',
      validate: {
        min: {
          args: [1],
          msg: 'La durée doit être d\'au moins 1 minute'
        },
        max: {
          args: [1440],
          msg: 'La durée ne peut pas dépasser 1440 minutes (24h)'
        }
      }
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'scheduled',
      validate: {
        isIn: {
          args: [['scheduled', 'in_progress', 'completed', 'cancelled']],
          msg: 'Le statut doit être scheduled, in_progress, completed ou cancelled'
        }
      }
    },
    agenda: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attendees: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array d\'IDs utilisateurs'
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
    tableName: 'meetings',
    timestamps: true,
    indexes: [
      {
        fields: ['meetingDate']
      },
      {
        fields: ['status']
      },
      {
        fields: ['projectId']
      },
      {
        fields: ['createdBy']
      }
    ]
  });

  // ============================================
  // MÉTHODES D'INSTANCE
  // ============================================

  /**
   * Vérifier si la réunion est à venir
   * @returns {boolean}
   */
  Meeting.prototype.isUpcoming = function() {
    return this.status === 'scheduled' && new Date(this.meetingDate) > new Date();
  };

  /**
   * Vérifier si la réunion est passée
   * @returns {boolean}
   */
  Meeting.prototype.isPast = function() {
    return new Date(this.meetingDate) < new Date();
  };

  /**
   * Vérifier si la réunion est aujourd'hui
   * @returns {boolean}
   */
  Meeting.prototype.isToday = function() {
    const today = new Date();
    const meetingDate = new Date(this.meetingDate);
    return today.toDateString() === meetingDate.toDateString();
  };

  /**
   * Ajouter un participant
   * @param {number} userId
   * @returns {Promise<Meeting>}
   */
  Meeting.prototype.addAttendee = async function(userId) {
    if (!this.attendees) {
      this.attendees = [];
    }
    if (!this.attendees.includes(userId)) {
      this.attendees.push(userId);
      return await this.save();
    }
    return this;
  };

  /**
   * Retirer un participant
   * @param {number} userId
   * @returns {Promise<Meeting>}
   */
  Meeting.prototype.removeAttendee = async function(userId) {
    if (this.attendees && this.attendees.includes(userId)) {
      this.attendees = this.attendees.filter(id => id !== userId);
      return await this.save();
    }
    return this;
  };

  /**
   * Obtenir le nombre de participants
   * @returns {number}
   */
  Meeting.prototype.getAttendeesCount = function() {
    return this.attendees ? this.attendees.length : 0;
  };

  /**
   * Marquer comme terminée
   * @returns {Promise<Meeting>}
   */
  Meeting.prototype.markAsCompleted = async function() {
    this.status = 'completed';
    return await this.save();
  };

  /**
   * Marquer comme en cours
   * @returns {Promise<Meeting>}
   */
  Meeting.prototype.start = async function() {
    this.status = 'in_progress';
    return await this.save();
  };

  /**
   * Annuler la réunion
   * @returns {Promise<Meeting>}
   */
  Meeting.prototype.cancel = async function() {
    this.status = 'cancelled';
    return await this.save();
  };

  // ============================================
  // MÉTHODES STATIQUES
  // ============================================

  /**
   * Obtenir les réunions à venir
   * @returns {Promise<Meeting[]>}
   */
  Meeting.getUpcoming = async function() {
    return await Meeting.findAll({
      where: {
        status: 'scheduled',
        meetingDate: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      },
      order: [['meetingDate', 'ASC']]
    });
  };

  /**
   * Obtenir les réunions du jour
   * @returns {Promise<Meeting[]>}
   */
  Meeting.getToday = async function() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await Meeting.findAll({
      where: {
        meetingDate: {
          [sequelize.Sequelize.Op.between]: [startOfDay, endOfDay]
        }
      },
      order: [['meetingDate', 'ASC']]
    });
  };

  /**
   * Obtenir les réunions par statut
   * @param {string} status
   * @returns {Promise<Meeting[]>}
   */
  Meeting.getByStatus = async function(status) {
    return await Meeting.findAll({
      where: { status },
      order: [['meetingDate', 'DESC']]
    });
  };

  /**
   * Compter les réunions par statut
   * @returns {Promise<Object>}
   */
  Meeting.countByStatus = async function() {
    const scheduled = await Meeting.count({ where: { status: 'scheduled' } });
    const inProgress = await Meeting.count({ where: { status: 'in_progress' } });
    const completed = await Meeting.count({ where: { status: 'completed' } });
    const cancelled = await Meeting.count({ where: { status: 'cancelled' } });

    return {
      scheduled,
      in_progress: inProgress,
      completed,
      cancelled,
      total: scheduled + inProgress + completed + cancelled
    };
  };

  return Meeting;
};
