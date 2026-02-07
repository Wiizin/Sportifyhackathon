module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define('Comment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    entityType: {
      type: DataTypes.ENUM('project', 'document', 'task', 'meeting'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['project', 'document', 'task', 'meeting']],
          msg: 'Le type d\'entité doit être project, document, task ou meeting'
        }
      }
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'L\'ID de l\'entité doit être positif'
        }
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le commentaire ne peut pas être vide'
        },
        len: {
          args: [1, 5000],
          msg: 'Le commentaire doit contenir entre 1 et 5000 caractères'
        }
      }
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'comments',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'comments',
    timestamps: true,
    indexes: [
      {
        fields: ['entityType', 'entityId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['parentId']
      }
    ]
  });

  // ============================================
  // MÉTHODES D'INSTANCE
  // ============================================

  /**
   * Vérifier si c'est une réponse à un autre commentaire
   * @returns {boolean}
   */
  Comment.prototype.isReply = function() {
    return this.parentId !== null;
  };

  /**
   * Vérifier si c'est un commentaire de niveau supérieur
   * @returns {boolean}
   */
  Comment.prototype.isTopLevel = function() {
    return this.parentId === null;
  };

  // ============================================
  // MÉTHODES STATIQUES
  // ============================================

  /**
   * Obtenir les commentaires d'une entité avec leurs réponses
   * @param {string} entityType
   * @param {number} entityId
   * @returns {Promise<Comment[]>}
   */
  Comment.getCommentsByEntity = async function(entityType, entityId) {
    return await Comment.findAll({
      where: {
        entityType,
        entityId,
        parentId: null // Seulement les commentaires de niveau supérieur
      },
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'profilePicture']
        },
        {
          model: Comment,
          as: 'replies',
          include: [
            {
              model: sequelize.models.User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'profilePicture']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  };

  /**
   * Compter les commentaires d'une entité
   * @param {string} entityType
   * @param {number} entityId
   * @returns {Promise<number>}
   */
  Comment.countByEntity = async function(entityType, entityId) {
    return await Comment.count({
      where: { entityType, entityId }
    });
  };

  /**
   * Obtenir les commentaires récents d'un utilisateur
   * @param {number} userId
   * @param {number} limit
   * @returns {Promise<Comment[]>}
   */
  Comment.getRecentByUser = async function(userId, limit = 10) {
    return await Comment.findAll({
      where: { userId },
      limit,
      order: [['createdAt', 'DESC']]
    });
  };

  return Comment;
};
