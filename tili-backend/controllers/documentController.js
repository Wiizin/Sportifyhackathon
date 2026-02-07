const { Document, User, Project, Meeting, Log } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Upload un document
 * @route   POST /api/documents
 * @access  Private
 */
const uploadDocument = async (req, res) => {
  try {
    // Vérifier qu'un fichier a été uploadé
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier n\'a été uploadé'
      });
    }

    const { title, description, type, projectId, meetingId } = req.body;

    // Validation des champs requis
    if (!title) {
      // Supprimer le fichier uploadé si validation échoue
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Le titre du document est requis'
      });
    }

    // Vérifier que le projet existe si projectId est fourni
    if (projectId) {
      const project = await Project.findByPk(projectId);
      if (!project) {
        // Supprimer le fichier uploadé si validation échoue
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
          success: false,
          message: 'Projet non trouvé'
        });
      }
    }

    // Vérifier que la réunion existe si meetingId est fourni
    if (meetingId) {
      const meeting = await Meeting.findByPk(meetingId);
      if (!meeting) {
        // Supprimer le fichier uploadé si validation échoue
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
          success: false,
          message: 'Réunion non trouvée'
        });
      }
    }

    // Créer le document
    const document = await Document.create({
      title,
      description: description || null,
      type: type || 'other',
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      projectId: projectId || null,
      meetingId: meetingId || null,
      uploadedBy: req.user.id,
      isArchived: false
    });

    // Logger l'action
    await Log.create({
      action: 'UPLOAD_DOCUMENT',
      description: `Document uploadé: ${document.title}`,
      entityType: 'document',
      entityId: document.id,
      oldValue: null,
      newValue: {
        title: document.title,
        type: document.type,
        fileSize: document.fileSize,
        projectId: document.projectId,
        meetingId: document.meetingId
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    });

    // Récupérer le document complet avec les relations
    const uploadedDocument = await Document.findByPk(document.id, {
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        },
        {
          model: Meeting,
          as: 'meeting',
          attributes: ['id', 'title', 'meetingDate']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Document uploadé avec succès',
      data: { document: uploadedDocument }
    });

  } catch (error) {
    // Supprimer le fichier si erreur lors de la création
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Erreur lors de l\'upload du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload du document'
    });
  }
};

/**
 * @desc    Récupérer tous les documents
 * @route   GET /api/documents
 * @access  Private
 */
const getAllDocuments = async (req, res) => {
  try {
    const {
      type,
      projectId,
      meetingId,
      isArchived = 'false',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'DESC'
    } = req.query;

    // Construire les conditions de filtrage
    const where = {};

    if (type) {
      where.type = type;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (meetingId) {
      where.meetingId = meetingId;
    }

    // Filtrer par isArchived
    where.isArchived = isArchived === 'true';

    // Calculer l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les documents avec pagination
    const { count, rows: documents } = await Document.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, order.toUpperCase()]],
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        },
        {
          model: Meeting,
          as: 'meeting',
          attributes: ['id', 'title', 'meetingDate']
        }
      ]
    });

    // Calculer le nombre total de pages
    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        documents,
        total: count,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents'
    });
  }
};

/**
 * @desc    Récupérer un document par ID
 * @route   GET /api/documents/:id
 * @access  Private
 */
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id, {
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'description', 'status', 'category']
        },
        {
          model: Meeting,
          as: 'meeting',
          attributes: ['id', 'title', 'description', 'meetingDate', 'status']
        }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: { document }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du document'
    });
  }
};

/**
 * @desc    Télécharger un document
 * @route   GET /api/documents/:id/download
 * @access  Private
 */
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le document
    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier que le fichier existe
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé sur le serveur'
      });
    }

    // Logger l'action de téléchargement
    await Log.create({
      action: 'DOWNLOAD_DOCUMENT',
      description: `Document téléchargé: ${document.title}`,
      entityType: 'document',
      entityId: document.id,
      oldValue: null,
      newValue: {
        title: document.title,
        downloadedBy: req.user.id
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    });

    // Extraire le nom original du fichier
    const originalName = path.basename(document.filePath);

    // Télécharger le fichier
    res.download(document.filePath, originalName, (err) => {
      if (err) {
        console.error('Erreur lors du téléchargement:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Erreur lors du téléchargement du fichier'
          });
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors du téléchargement du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du téléchargement du document'
    });
  }
};

/**
 * @desc    Mettre à jour un document
 * @route   PUT /api/documents/:id
 * @access  Private
 */
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type } = req.body;

    // Récupérer le document existant
    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Sauvegarder les anciennes valeurs pour le log
    const oldValue = {
      title: document.title,
      description: document.description,
      type: document.type
    };

    // Mettre à jour le document (pas le fichier, seulement les métadonnées)
    await document.update({
      title: title !== undefined ? title : document.title,
      description: description !== undefined ? description : document.description,
      type: type !== undefined ? type : document.type
    });

    // Nouvelles valeurs pour le log
    const newValue = {
      title: document.title,
      description: document.description,
      type: document.type
    };

    // Logger l'action
    await Log.create({
      action: 'UPDATE_DOCUMENT',
      description: `Document mis à jour: ${document.title}`,
      entityType: 'document',
      entityId: document.id,
      oldValue,
      newValue,
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    });

    // Récupérer le document mis à jour avec les relations
    const updatedDocument = await Document.findByPk(document.id, {
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        },
        {
          model: Meeting,
          as: 'meeting',
          attributes: ['id', 'title', 'meetingDate']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Document mis à jour avec succès',
      data: { document: updatedDocument }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du document'
    });
  }
};

/**
 * @desc    Supprimer un document (soft delete)
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query; // ?permanent=true pour suppression physique

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Sauvegarder les informations avant suppression pour le log
    const documentData = {
      id: document.id,
      title: document.title,
      type: document.type,
      filePath: document.filePath
    };

    if (permanent === 'true') {
      // Suppression physique du fichier
      if (fs.existsSync(document.filePath)) {
        try {
          fs.unlinkSync(document.filePath);
        } catch (err) {
          console.error('Erreur lors de la suppression du fichier:', err);
        }
      }

      // Logger l'action avant la suppression
      await Log.create({
        action: 'DELETE_DOCUMENT_PERMANENT',
        description: `Document supprimé définitivement: ${document.title}`,
        entityType: 'document',
        entityId: document.id,
        oldValue: documentData,
        newValue: null,
        performedBy: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date()
      });

      // Suppression en base de données
      await document.destroy();

      return res.status(200).json({
        success: true,
        message: 'Document supprimé définitivement avec succès'
      });
    } else {
      // Soft delete - archiver le document
      await document.update({ isArchived: true });

      // Logger l'action
      await Log.create({
        action: 'ARCHIVE_DOCUMENT',
        description: `Document archivé: ${document.title}`,
        entityType: 'document',
        entityId: document.id,
        oldValue: { isArchived: false },
        newValue: { isArchived: true },
        performedBy: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date()
      });

      res.status(200).json({
        success: true,
        message: 'Document archivé avec succès',
        data: { document }
      });
    }

  } catch (error) {
    console.error('Erreur lors de la suppression du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du document'
    });
  }
};

/**
 * @desc    Récupérer tous les documents d'un projet
 * @route   GET /api/documents/project/:projectId
 * @access  Private
 */
const getProjectDocuments = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { isArchived = 'false', sortBy = 'createdAt', order = 'DESC' } = req.query;

    // Vérifier que le projet existe
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé'
      });
    }

    // Construire les conditions de filtrage
    const where = {
      projectId,
      isArchived: isArchived === 'true'
    };

    // Récupérer tous les documents du projet
    const documents = await Document.findAll({
      where,
      order: [[sortBy, order.toUpperCase()]],
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Meeting,
          as: 'meeting',
          attributes: ['id', 'title', 'meetingDate']
        }
      ]
    });

    // Statistiques sur les documents
    const stats = {
      total: documents.length,
      byType: {
        report: documents.filter(d => d.type === 'report').length,
        admin_doc: documents.filter(d => d.type === 'admin_doc').length,
        meeting_minutes: documents.filter(d => d.type === 'meeting_minutes').length,
        project_doc: documents.filter(d => d.type === 'project_doc').length,
        research: documents.filter(d => d.type === 'research').length,
        other: documents.filter(d => d.type === 'other').length
      },
      totalSize: documents.reduce((sum, d) => sum + (d.fileSize || 0), 0)
    };

    res.status(200).json({
      success: true,
      data: {
        documents,
        stats,
        project: {
          id: project.id,
          name: project.name
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des documents du projet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents du projet'
    });
  }
};

module.exports = {
  uploadDocument,
  getAllDocuments,
  getDocumentById,
  downloadDocument,
  updateDocument,
  deleteDocument,
  getProjectDocuments
};
