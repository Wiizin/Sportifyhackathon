const { Meeting, User, Project, Document, Log } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Récupérer toutes les réunions
 * @route   GET /api/meetings
 * @access  Private
 */
const getAllMeetings = async (req, res) => {
  try {
    const {
      status,
      projectId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'meetingDate',
      order = 'ASC'
    } = req.query;

    // Construire les conditions de filtrage
    const where = {};

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    // Filtrage par plage de dates
    if (startDate || endDate) {
      where.meetingDate = {};
      if (startDate) {
        where.meetingDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.meetingDate[Op.lte] = new Date(endDate);
      }
    }

    // Calculer l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les réunions avec pagination
    const { count, rows: meetings } = await Meeting.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, order.toUpperCase()]],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        }
      ]
    });

    // Enrichir les données avec les informations des attendees
    const enrichedMeetings = await Promise.all(
      meetings.map(async (meeting) => {
        const meetingData = meeting.toJSON();

        // Récupérer les informations complètes des attendees
        if (meetingData.attendees && meetingData.attendees.length > 0) {
          const attendeesInfo = await User.findAll({
            where: { id: { [Op.in]: meetingData.attendees } },
            attributes: ['id', 'firstName', 'lastName', 'email']
          });
          meetingData.attendeesInfo = attendeesInfo;
        } else {
          meetingData.attendeesInfo = [];
        }

        return meetingData;
      })
    );

    // Calculer le nombre total de pages
    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        meetings: enrichedMeetings,
        total: count,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des réunions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réunions'
    });
  }
};

/**
 * @desc    Récupérer une réunion par ID
 * @route   GET /api/meetings/:id
 * @access  Private
 */
const getMeetingById = async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await Meeting.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'description', 'status', 'category']
        },
        {
          model: Document,
          as: 'documents',
          attributes: ['id', 'title', 'type', 'filePath', 'fileSize', 'createdAt']
        }
      ]
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Réunion non trouvée'
      });
    }

    const meetingData = meeting.toJSON();

    // Récupérer les informations complètes des attendees
    if (meetingData.attendees && meetingData.attendees.length > 0) {
      const attendeesInfo = await User.findAll({
        where: { id: { [Op.in]: meetingData.attendees } },
        attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
      });
      meetingData.attendeesInfo = attendeesInfo;
    } else {
      meetingData.attendeesInfo = [];
    }

    res.status(200).json({
      success: true,
      data: { meeting: meetingData }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la réunion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la réunion'
    });
  }
};

/**
 * @desc    Créer une nouvelle réunion
 * @route   POST /api/meetings
 * @access  Private
 */
const createMeeting = async (req, res) => {
  try {
    const {
      title,
      description,
      projectId,
      meetingDate,
      duration,
      location,
      agenda,
      attendees
    } = req.body;

    // Validation des champs requis
    if (!title || !meetingDate) {
      return res.status(400).json({
        success: false,
        message: 'Le titre et la date de la réunion sont requis',
        errors: {
          title: !title ? 'Le titre est requis' : undefined,
          meetingDate: !meetingDate ? 'La date de la réunion est requise' : undefined
        }
      });
    }

    // Vérifier que le projet existe si projectId est fourni
    if (projectId) {
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Projet non trouvé'
        });
      }
    }

    // Valider que les attendees sont des users valides
    let validatedAttendees = [];
    if (attendees && Array.isArray(attendees) && attendees.length > 0) {
      const users = await User.findAll({
        where: { id: { [Op.in]: attendees } },
        attributes: ['id']
      });

      if (users.length !== attendees.length) {
        return res.status(400).json({
          success: false,
          message: 'Certains participants sont invalides'
        });
      }

      validatedAttendees = users.map(u => u.id);
    }

    // Créer la réunion
    const meeting = await Meeting.create({
      title,
      description: description || null,
      projectId: projectId || null,
      meetingDate,
      duration: duration || null,
      location: location || null,
      agenda: agenda || null,
      attendees: validatedAttendees,
      status: 'scheduled',
      createdBy: req.user.id
    });

    // Logger l'action
    await Log.create({
      action: 'CREATE_MEETING',
      description: `Réunion créée: ${meeting.title}`,
      entityType: 'meeting',
      entityId: meeting.id,
      oldValue: null,
      newValue: {
        title: meeting.title,
        projectId: meeting.projectId,
        meetingDate: meeting.meetingDate,
        status: meeting.status
      },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    });

    // Récupérer la réunion complète avec les relations
    const createdMeeting = await Meeting.findByPk(meeting.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Réunion créée avec succès',
      data: { meeting: createdMeeting }
    });

  } catch (error) {
    console.error('Erreur lors de la création de la réunion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la réunion'
    });
  }
};

/**
 * @desc    Mettre à jour une réunion
 * @route   PUT /api/meetings/:id
 * @access  Private
 */
const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      projectId,
      meetingDate,
      duration,
      location,
      status,
      agenda,
      notes,
      attendees
    } = req.body;

    // Récupérer la réunion existante
    const meeting = await Meeting.findByPk(id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Réunion non trouvée'
      });
    }

    // Sauvegarder les anciennes valeurs pour le log
    const oldValue = {
      title: meeting.title,
      status: meeting.status,
      meetingDate: meeting.meetingDate,
      projectId: meeting.projectId,
      attendees: meeting.attendees
    };

    // Vérifier si le statut passe à 'completed' et que notes existe
    if (status === 'completed' && !notes && !meeting.notes) {
      return res.status(400).json({
        success: false,
        message: 'Les notes sont requises pour marquer une réunion comme terminée'
      });
    }

    // Vérifier que le projet existe si projectId est fourni
    if (projectId && projectId !== meeting.projectId) {
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Projet non trouvé'
        });
      }
    }

    // Valider que les attendees sont des users valides
    let validatedAttendees = meeting.attendees;
    if (attendees && Array.isArray(attendees)) {
      if (attendees.length > 0) {
        const users = await User.findAll({
          where: { id: { [Op.in]: attendees } },
          attributes: ['id']
        });

        if (users.length !== attendees.length) {
          return res.status(400).json({
            success: false,
            message: 'Certains participants sont invalides'
          });
        }

        validatedAttendees = users.map(u => u.id);
      } else {
        validatedAttendees = [];
      }
    }

    // Mettre à jour la réunion (tous les champs sauf createdBy)
    await meeting.update({
      title: title !== undefined ? title : meeting.title,
      description: description !== undefined ? description : meeting.description,
      projectId: projectId !== undefined ? projectId : meeting.projectId,
      meetingDate: meetingDate !== undefined ? meetingDate : meeting.meetingDate,
      duration: duration !== undefined ? duration : meeting.duration,
      location: location !== undefined ? location : meeting.location,
      status: status !== undefined ? status : meeting.status,
      agenda: agenda !== undefined ? agenda : meeting.agenda,
      notes: notes !== undefined ? notes : meeting.notes,
      attendees: validatedAttendees
    });

    // Nouvelles valeurs pour le log
    const newValue = {
      title: meeting.title,
      status: meeting.status,
      meetingDate: meeting.meetingDate,
      projectId: meeting.projectId,
      attendees: meeting.attendees
    };

    // Logger l'action
    await Log.create({
      action: 'UPDATE_MEETING',
      description: `Réunion mise à jour: ${meeting.title}`,
      entityType: 'meeting',
      entityId: meeting.id,
      oldValue,
      newValue,
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    });

    // Récupérer la réunion mise à jour avec les relations
    const updatedMeeting = await Meeting.findByPk(meeting.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Réunion mise à jour avec succès',
      data: { meeting: updatedMeeting }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la réunion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la réunion'
    });
  }
};

/**
 * @desc    Supprimer une réunion (soft delete)
 * @route   DELETE /api/meetings/:id
 * @access  Private
 */
const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await Meeting.findByPk(id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Réunion non trouvée'
      });
    }

    // Soft delete - changer le status à 'cancelled'
    const oldValue = {
      status: meeting.status
    };

    await meeting.update({ status: 'cancelled' });

    // Logger l'action
    await Log.create({
      action: 'DELETE_MEETING',
      description: `Réunion annulée: ${meeting.title}`,
      entityType: 'meeting',
      entityId: meeting.id,
      oldValue,
      newValue: { status: 'cancelled' },
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Réunion annulée avec succès',
      data: { meeting }
    });

  } catch (error) {
    console.error('Erreur lors de l\'annulation de la réunion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la réunion'
    });
  }
};

/**
 * @desc    Récupérer tous les documents liés à une réunion
 * @route   GET /api/meetings/:id/documents
 * @access  Private
 */
const getMeetingDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que la réunion existe
    const meeting = await Meeting.findByPk(id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Réunion non trouvée'
      });
    }

    // Récupérer tous les documents liés à cette réunion
    const documents = await Document.findAll({
      where: { meetingId: id },
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        documents,
        total: documents.length,
        meeting: {
          id: meeting.id,
          title: meeting.title
        }
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

module.exports = {
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingDocuments
};

