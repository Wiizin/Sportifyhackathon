module.exports = (sequelize, DataTypes) => {
  const Team = sequelize.define('Team', {
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
          msg: 'Team name is required'
        },
        len: {
          args: [2, 200],
          msg: 'Team name must be between 2 and 200 characters'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    managerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'archived'),
      allowNull: false,
      defaultValue: 'active'
    }
  }, {
    tableName: 'teams',
    timestamps: true,
    indexes: [
      {
        fields: ['managerId']
      },
      {
        fields: ['status']
      }
    ]
  });

  return Team;
};

