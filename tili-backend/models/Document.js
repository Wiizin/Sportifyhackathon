module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
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
          msg: 'Le titre du document est requis'
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
    type: {
      type: DataTypes.ENUM('report', 'admin_doc', 'meeting_minutes', 'project_doc', 'research', 'other'),
      allowNull: false,
      defaultValue: 'other',
      validate: {
        isIn: {
          args: [['report', 'admin_doc', 'meeting_minutes', 'project_doc', 'research', 'other']],
          msg: 'Le type doit être report, admin_doc, meeting_minutes, project_doc, research ou other'
        }
      }
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le chemin du fichier est requis'
        }
      }
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: [0],
          msg: 'La taille du fichier ne peut pas être négative'
        }
      }
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    meetingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'meetings',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'documents',
    timestamps: true,
    indexes: [
      {
        fields: ['type']
      },
      {
        fields: ['projectId']
      },
      {
        fields: ['meetingId']
      },
      {
        fields: ['uploadedBy']
      },
      {
        fields: ['isArchived']
      }
    ]
  });

  // ============================================
  // MÉTHODES D'INSTANCE
  // ============================================

  /**
   * Obtenir la taille du fichier en MB
   * @returns {string}
   */
  Document.prototype.getFileSizeInMB = function() {
    if (!this.fileSize) return '0.00';
    return (this.fileSize / (1024 * 1024)).toFixed(2);
  };

  /**
   * Obtenir la taille du fichier en KB
   * @returns {string}
   */
  Document.prototype.getFileSizeInKB = function() {
    if (!this.fileSize) return '0';
    return (this.fileSize / 1024).toFixed(2);
  };

  /**
   * Vérifier si c'est une image
   * @returns {boolean}
   */
  Document.prototype.isImage = function() {
    if (!this.mimeType) return false;
    return this.mimeType.startsWith('image/');
  };

  /**
   * Vérifier si c'est un PDF
   * @returns {boolean}
   */
  Document.prototype.isPDF = function() {
    return this.mimeType === 'application/pdf';
  };

  /**
   * Vérifier si c'est un document Office
   * @returns {boolean}
   */
  Document.prototype.isOfficeDocument = function() {
    if (!this.mimeType) return false;
    const officeMimes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    return officeMimes.includes(this.mimeType);
  };

  /**
   * Archiver le document
   * @returns {Promise<Document>}
   */
  Document.prototype.archive = async function() {
    this.isArchived = true;
    return await this.save();
  };

  /**
   * Désarchiver le document
   * @returns {Promise<Document>}
   */
  Document.prototype.unarchive = async function() {
    this.isArchived = false;
    return await this.save();
  };

  // ============================================
  // MÉTHODES STATIQUES
  // ============================================

  /**
   * Obtenir les documents par type
   * @param {string} type
   * @returns {Promise<Document[]>}
   */
  Document.getByType = async function(type) {
    return await Document.findAll({
      where: { type, isArchived: false }
    });
  };

  /**
   * Obtenir les documents non archivés
   * @returns {Promise<Document[]>}
   */
  Document.getActive = async function() {
    return await Document.findAll({
      where: { isArchived: false }
    });
  };

  /**
   * Obtenir les documents archivés
   * @returns {Promise<Document[]>}
   */
  Document.getArchived = async function() {
    return await Document.findAll({
      where: { isArchived: true }
    });
  };

  /**
   * Calculer la taille totale des documents
   * @returns {Promise<number>}
   */
  Document.getTotalSize = async function() {
    const result = await Document.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('fileSize')), 'totalSize']
      ]
    });
    return result[0]?.dataValues?.totalSize || 0;
  };

  return Document;
};
