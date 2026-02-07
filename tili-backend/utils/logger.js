const { Log } = require('../models');

/**
 * Créer une entrée de log
 * @param {string} action - Action effectuée (CREATE, UPDATE, DELETE, LOGIN, etc.)
 * @param {string} description - Description détaillée de l'action
 * @param {string} entityType - Type d'entité (user, project, document, task, meeting, comment, etc.)
 * @param {number} entityId - ID de l'entité affectée
 * @param {object|null} oldValue - Ancienne valeur (pour UPDATE)
 * @param {object|null} newValue - Nouvelle valeur (pour CREATE et UPDATE)
 * @param {number} performedBy - ID de l'utilisateur qui effectue l'action
 * @param {object} req - Objet Express request (pour récupérer IP et userAgent)
 * @returns {Promise<Log|null>} - Log créé ou null en cas d'erreur
 */
const createLog = async (action, description, entityType, entityId, oldValue, newValue, performedBy, req) => {
  try {
    // Récupérer l'adresse IP
    const ipAddress = req.ip ||
                      req.connection?.remoteAddress ||
                      req.socket?.remoteAddress ||
                      req.connection?.socket?.remoteAddress ||
                      null;

    // Récupérer le user agent
    const userAgent = req.get('user-agent') || null;

    // Créer l'entrée de log
    const log = await Log.create({
      action,
      description,
      entityType,
      entityId,
      oldValue: oldValue || null,
      newValue: newValue || null,
      performedBy,
      ipAddress,
      userAgent,
      timestamp: new Date() // Timestamp automatique
    });

    return log;

  } catch (error) {
    // Gérer les erreurs silencieusement pour ne pas bloquer l'action principale
    console.error('Erreur lors de la création du log:', error.message);
    return null;
  }
};

module.exports = { createLog };

