const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuration de la connexion à la base de données
const sequelize = new Sequelize(
  process.env.DB_NAME || 'tili_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  }
);

// Objet contenant tous les modèles et la connexion
const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import des modèles
db.User = require('./User')(sequelize, Sequelize);
db.Project = require('./Project')(sequelize, Sequelize);
db.ProjectMember = require('./ProjectMember')(sequelize, Sequelize);
db.Task = require('./Task')(sequelize, Sequelize);
db.Document = require('./Document')(sequelize, Sequelize);
db.Meeting = require('./Meeting')(sequelize, Sequelize);
db.Comment = require('./Comment')(sequelize, Sequelize);
db.Log = require('./Log')(sequelize, Sequelize);
db.Team = require('./Team')(sequelize, Sequelize);
db.TeamMember = require('./TeamMember')(sequelize, Sequelize);
db.TeamInvitation = require('./TeamInvitation')(sequelize, Sequelize);

// ============================================
// DÉFINITION DES ASSOCIATIONS
// ============================================

// User ↔ Projects (many-to-many via ProjectMember)
db.User.belongsToMany(db.Project, {
  through: db.ProjectMember,
  foreignKey: 'userId',
  otherKey: 'projectId',
  as: 'projects'
});

db.Project.belongsToMany(db.User, {
  through: db.ProjectMember,
  foreignKey: 'projectId',
  otherKey: 'userId',
  as: 'members'
});

// User → Projects (créateur)
db.User.hasMany(db.Project, {
  foreignKey: 'createdBy',
  as: 'createdProjects'
});

db.Project.belongsTo(db.User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

// User → Projects (chef de projet)
db.User.hasMany(db.Project, {
  foreignKey: 'chefProjet',
  as: 'managedProjects'
});

db.Project.belongsTo(db.User, {
  foreignKey: 'chefProjet',
  as: 'projectManager'
});

// Team → Projects
db.Team.hasMany(db.Project, {
  foreignKey: 'teamId',
  as: 'projects',
  onDelete: 'SET NULL'
});

db.Project.belongsTo(db.Team, {
  foreignKey: 'teamId',
  as: 'team'
});

// Project → ProjectMembers
db.Project.hasMany(db.ProjectMember, {
  foreignKey: 'projectId',
  as: 'projectMembers',
  onDelete: 'CASCADE'
});

db.ProjectMember.belongsTo(db.Project, {
  foreignKey: 'projectId'
});

// User → ProjectMembers
db.User.hasMany(db.ProjectMember, {
  foreignKey: 'userId',
  as: 'projectMemberships',
  onDelete: 'CASCADE'
});

db.ProjectMember.belongsTo(db.User, {
  foreignKey: 'userId',
  as: 'user'
});

// Project → Tasks
db.Project.hasMany(db.Task, {
  foreignKey: 'projectId',
  as: 'tasks',
  onDelete: 'CASCADE'
});

db.Task.belongsTo(db.Project, {
  foreignKey: 'projectId',
  as: 'project'
});

// Team → Tasks
db.Team.hasMany(db.Task, {
  foreignKey: 'teamId',
  as: 'tasks',
  onDelete: 'CASCADE'
});

db.Task.belongsTo(db.Team, {
  foreignKey: 'teamId',
  as: 'team'
});

// User → Tasks (assigné)
db.User.hasMany(db.Task, {
  foreignKey: 'assignedTo',
  as: 'assignedTasks'
});

db.Task.belongsTo(db.User, {
  foreignKey: 'assignedTo',
  as: 'assignedUser'
});

// User → Tasks (créateur)
db.User.hasMany(db.Task, {
  foreignKey: 'createdBy',
  as: 'createdTasks'
});

db.Task.belongsTo(db.User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

// Project → Documents
db.Project.hasMany(db.Document, {
  foreignKey: 'projectId',
  as: 'documents',
  onDelete: 'SET NULL'
});

db.Document.belongsTo(db.Project, {
  foreignKey: 'projectId',
  as: 'project'
});

// Meeting → Documents
db.Meeting.hasMany(db.Document, {
  foreignKey: 'meetingId',
  as: 'documents',
  onDelete: 'SET NULL'
});

db.Document.belongsTo(db.Meeting, {
  foreignKey: 'meetingId',
  as: 'meeting'
});

// User → Documents (uploader)
db.User.hasMany(db.Document, {
  foreignKey: 'uploadedBy',
  as: 'uploadedDocuments'
});

db.Document.belongsTo(db.User, {
  foreignKey: 'uploadedBy',
  as: 'uploader'
});

// Project → Meetings
db.Project.hasMany(db.Meeting, {
  foreignKey: 'projectId',
  as: 'meetings',
  onDelete: 'CASCADE'
});

db.Meeting.belongsTo(db.Project, {
  foreignKey: 'projectId',
  as: 'project'
});

// User → Meetings (créateur)
db.User.hasMany(db.Meeting, {
  foreignKey: 'createdBy',
  as: 'createdMeetings'
});

db.Meeting.belongsTo(db.User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

// User → Comments
db.User.hasMany(db.Comment, {
  foreignKey: 'userId',
  as: 'comments',
  onDelete: 'CASCADE'
});

db.Comment.belongsTo(db.User, {
  foreignKey: 'userId',
  as: 'user'
});

// Comments → Comments (relations parent/enfant)
db.Comment.hasMany(db.Comment, {
  foreignKey: 'parentId',
  as: 'replies',
  onDelete: 'CASCADE'
});

db.Comment.belongsTo(db.Comment, {
  foreignKey: 'parentId',
  as: 'parent'
});

// User → Logs (performedBy)
db.User.hasMany(db.Log, {
  foreignKey: 'performedBy',
  as: 'logs'
});

db.Log.belongsTo(db.User, {
  foreignKey: 'performedBy',
  as: 'user'
});

// ============================================
// TEAM ASSOCIATIONS
// ============================================

// User → Team (manager)
db.User.hasMany(db.Team, {
  foreignKey: 'managerId',
  as: 'managedTeams'
});

db.Team.belongsTo(db.User, {
  foreignKey: 'managerId',
  as: 'manager'
});

// Team ↔ User (many-to-many via TeamMember)
db.Team.belongsToMany(db.User, {
  through: db.TeamMember,
  foreignKey: 'teamId',
  otherKey: 'userId',
  as: 'members'
});

db.User.belongsToMany(db.Team, {
  through: db.TeamMember,
  foreignKey: 'userId',
  otherKey: 'teamId',
  as: 'teams'
});

// Team → TeamMembers
db.Team.hasMany(db.TeamMember, {
  foreignKey: 'teamId',
  as: 'teamMembers',
  onDelete: 'CASCADE'
});

db.TeamMember.belongsTo(db.Team, {
  foreignKey: 'teamId',
  as: 'team'
});

// User → TeamMembers
db.User.hasMany(db.TeamMember, {
  foreignKey: 'userId',
  as: 'teamMemberships',
  onDelete: 'CASCADE'
});

db.TeamMember.belongsTo(db.User, {
  foreignKey: 'userId',
  as: 'user'
});

// Team → TeamInvitations
db.Team.hasMany(db.TeamInvitation, {
  foreignKey: 'teamId',
  as: 'invitations',
  onDelete: 'CASCADE'
});

db.TeamInvitation.belongsTo(db.Team, {
  foreignKey: 'teamId',
  as: 'team'
});

// User → TeamInvitations (invited user)
db.User.hasMany(db.TeamInvitation, {
  foreignKey: 'userId',
  as: 'receivedInvitations',
  onDelete: 'CASCADE'
});

db.TeamInvitation.belongsTo(db.User, {
  foreignKey: 'userId',
  as: 'invitedUser'
});

// User → TeamInvitations (inviter)
db.User.hasMany(db.TeamInvitation, {
  foreignKey: 'invitedBy',
  as: 'sentInvitations'
});

db.TeamInvitation.belongsTo(db.User, {
  foreignKey: 'invitedBy',
  as: 'inviter'
});

// ============================================
// TEST DE CONNEXION
// ============================================

/**
 * Tester la connexion à la base de données
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données MySQL réussie !');
    return true;
  } catch (error) {
    console.error('❌ Impossible de se connecter à la base de données:', error.message);
    return false;
  }
};

/**
 * Synchroniser tous les modèles avec la base de données
 * @param {boolean} force - Si true, supprime et recrée toutes les tables
 */
const syncDatabase = async (force = false) => {
  try {
    // En développement, utiliser alter: true pour mettre à jour les tables
    // En production, ne pas utiliser alter pour éviter les modifications accidentelles
    const isDev = process.env.NODE_ENV === 'development';

    if (force) {
      // ATTENTION: Ceci supprime toutes les données!
      await sequelize.sync({ force: true });
      console.log('✅ Base de données synchronisée (tables recréées) !');
    } else if (isDev) {
      // En dev, on peut utiliser alter pour ajouter de nouvelles colonnes
      await sequelize.sync({ alter: true });
      console.log('✅ Base de données synchronisée (mise à jour) !');
    } else {
      // En production, juste vérifier que les tables existent
      await sequelize.sync();
      console.log('✅ Base de données synchronisée !');
    }
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error.message);
    console.error('Détails:', error);
    // Ne pas faire crasher le serveur, juste logger l'erreur
    return false;
  }
};

// Export
db.testConnection = testConnection;
db.syncDatabase = syncDatabase;

module.exports = db;
