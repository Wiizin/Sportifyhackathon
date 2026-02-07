const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware pour protéger les routes (vérifier JWT)
 * @desc Vérifie le token JWT et ajoute l'utilisateur à req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Vérifier si le header Authorization existe et commence par Bearer
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extraire le token
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier si le token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Non autorisé - Token manquant'
      });
    }

    try {
      // Vérifier et décoder le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Récupérer l'utilisateur depuis la base de données (sans le password)
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Vérifier si le compte est actif
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Compte désactivé'
        });
      }

      // Ajouter l'utilisateur à la requête
      req.user = user;
      next();

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expiré'
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token invalide'
        });
      }

      throw error;
    }

  } catch (error) {
    console.error('Erreur dans le middleware protect:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification'
    });
  }
};

/**
 * Middleware pour vérifier le rôle de l'utilisateur
 * @param {...string} roles - Rôles autorisés
 * @returns {Function} Middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé - Rôle ${req.user.role} non autorisé pour cette action`
      });
    }

    next();
  };
};

/**
 * Middleware optionnel - ajoute l'utilisateur si token présent, sinon continue
 * Utile pour les routes publiques qui peuvent bénéficier d'infos utilisateur
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Ignorer les erreurs de token pour optionalAuth
        console.log('Token invalide ou expiré (optionalAuth)');
      }
    }

    next();
  } catch (error) {
    console.error('Erreur dans optionalAuth:', error);
    next();
  }
};

module.exports = {
  protect,
  authorize,
  optionalAuth
};

