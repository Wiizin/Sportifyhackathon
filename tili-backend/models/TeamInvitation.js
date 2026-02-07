module.exports = (sequelize, DataTypes) => {
  const TeamInvitation = sequelize.define('TeamInvitation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'teams',
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
    invitedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'member'
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'declined', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'team_invitations',
    timestamps: true,
    indexes: [
      {
        fields: ['teamId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      }
    ]
  });

  return TeamInvitation;
};
