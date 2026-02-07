const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config();

// Importer les modèles
const db = require('./models');

// Créer l'application Express
const app = express();

// ============================================
// MIDDLEWARES
// ============================================

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:3039', 'http://localhost:3040', 'http://localhost:3000'],
  credentials: true
}));

// Parser JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging des requêtes (développement)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// ROUTES
// ============================================

// Route de test
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenue sur l\'API TILI',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/projects', require('./routes/projects.routes'));
app.use('/api/tasks', require('./routes/tasks.routes'));
app.use('/api/documents', require('./routes/documents.routes'));
app.use('/api/meetings', require('./routes/meetings.routes'));
app.use('/api/comments', require('./routes/comments.routes'));
app.use('/api/teams', require('./routes/teams.routes'));
// app.use('/api/dashboard', require('./routes/dashboard.routes'));

// ============================================
// GESTION DES ERREURS 404
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// ============================================
// GESTION DES ERREURS GLOBALES
// ============================================

app.use((err, req, res, next) => {
  console.error('Erreur:', err);

  // Erreur de validation Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Erreur de contrainte unique Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Cette valeur existe déjà',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expiré'
    });
  }

  // Erreur générique
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Tester la connexion à la base de données
    console.log('🔄 Tentative de connexion à la base de données...');
    const connected = await db.testConnection();

    if (!connected) {
      console.error('❌ Impossible de démarrer sans connexion à la base de données');
      process.exit(1);
    }

    // Synchroniser les modèles avec la base de données
    console.log('🔄 Synchronisation de la base de données...');

    // Ne pas supprimer les tables à chaque redémarrage
    // ATTENTION: force: true SUPPRIME TOUTES LES DONNÉES!
    const forceSync = false;
    const syncResult = await db.syncDatabase(forceSync);

    if (!syncResult) {
      console.warn('⚠️ La synchronisation a échoué, le serveur démarre quand même...');
    }





    // Démarrer le serveur
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('✅ ========================================');
      console.log(`✅ Serveur TILI démarré avec succès !`);
      console.log(`✅ Environnement: ${process.env.NODE_ENV}`);
      console.log(`✅ Port: ${PORT}`);
      console.log(`✅ URL: http://localhost:${PORT}`);
      console.log('✅ ========================================');
      console.log('');
    });

    // Garder le serveur en vie
    server.on('error', (err) => {
      console.error('❌ Erreur du serveur:', err);
    });

  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gérer les erreurs non gérées
process.on('unhandledRejection', (err) => {
  console.error('❌ Erreur non gérée:', err);
  process.exit(1);
});

// Démarrer le serveur
startServer();

module.exports = app;
