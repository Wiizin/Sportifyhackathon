module.exports = (sequelize, DataTypes) => {
  const ProjectMember = sequelize.define('ProjectMember', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      },
      onDelete: 'CASCADE'
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
    role: {
      type: DataTypes.ENUM('lead', 'member', 'consultant', 'observer'),
      allowNull: false,
      defaultValue: 'member',
      validate: {
        isIn: {
          args: [['lead', 'member', 'consultant', 'observer']],
          msg: 'Le rôle doit être lead, member, consultant ou observer'
        }
      }
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'project_members',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['projectId', 'userId']
      },
      {
        fields: ['role']
      }
    ]
  });

  // Méthodes d'instance
  ProjectMember.prototype.isLead = function() {
    return this.role === 'lead';
  };

  ProjectMember.prototype.canEdit = function() {
    return ['lead', 'member'].includes(this.role);
  };

  return ProjectMember;
};

