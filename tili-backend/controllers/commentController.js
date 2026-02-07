const { Comment, User, Project, Document, Task, Meeting } = require('../models');
const { createLog } = require('../utils/logger');

/**
 * @desc    Créer un commentaire
 * @route   POST /api/comments
 * @access  Private
 */
const createComment = async (req, res) => {
  try {
    const { entityType, entityId, comment, parentId } = req.body;

    // Validation des champs requis
    if (!entityType || !entityId || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Les champs entityType, entityId et comment sont requis',
        errors: {
          entityType: !entityType ? 'Le type d\'entité est requis' : undefined,
          entityId: !entityId ? 'L\'ID de l\'entité est requis' : undefined,
          comment: !comment ? 'Le commentaire est requis' : undefined
        }
      });
    }

    // Valider que entityType est valide
    const validEntityTypes = ['project', 'document', 'task', 'meeting'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: `Le type d'entité doit être: ${validEntityTypes.join(', ')}`
      });
    }

    // Vérifier que l'entité existe dans la table correspondante
    let entity;
    switch (entityType) {
      case 'project':
        entity = await Project.findByPk(entityId);
        break;
      case 'document':
        entity = await Document.findByPk(entityId);
        break;
      case 'task':
        entity = await Task.findByPk(entityId);
        break;
      case 'meeting':
        entity = await Meeting.findByPk(entityId);
        break;
    }

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} non trouvé(e)`
      });
    }

    // Si parentId est fourni, vérifier que le commentaire parent existe
    if (parentId) {
      const parentComment = await Comment.findByPk(parentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Commentaire parent non trouvé'
        });
      }

      // Vérifier que le parent est sur la même entité
      if (parentComment.entityType !== entityType || parentComment.entityId !== entityId) {
        return res.status(400).json({
          success: false,
          message: 'Le commentaire parent doit être sur la même entité'
        });
      }
    }

    // Créer le commentaire
    const newComment = await Comment.create({
      entityType,
      entityId,
      userId: req.user.id,
      comment,
      parentId: parentId || null
    });

    // Logger l'action
    await createLog(
      'CREATE_COMMENT',
      `Commentaire créé sur ${entityType} #${entityId}${parentId ? ' (réponse)' : ''}`,
      'comment',
      newComment.id,
      null,
      {
        entityType: newComment.entityType,
        entityId: newComment.entityId,
        parentId: newComment.parentId
      },
      req.user.id,
      req
    );

    // Récupérer le commentaire complet avec les relations
    const createdComment = await Comment.findByPk(newComment.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Commentaire créé avec succès',
      data: { comment: createdComment }
    });

  } catch (error) {
    console.error('Erreur lors de la création du commentaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du commentaire'
    });
  }
};

/**
 * @desc    Récupérer tous les commentaires d'une entité
 * @route   GET /api/comments/:entityType/:entityId
 * @access  Private
 */
const getEntityComments = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    // Valider que entityType est valide
    const validEntityTypes = ['project', 'document', 'task', 'meeting'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: `Le type d'entité doit être: ${validEntityTypes.join(', ')}`
      });
    }

    // Vérifier que l'entité existe
    let entity;
    switch (entityType) {
      case 'project':
        entity = await Project.findByPk(entityId);
        break;
      case 'document':
        entity = await Document.findByPk(entityId);
        break;
      case 'task':
        entity = await Task.findByPk(entityId);
        break;
      case 'meeting':
        entity = await Meeting.findByPk(entityId);
        break;
    }

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} non trouvé(e)`
      });
    }

    // Récupérer tous les commentaires de niveau supérieur (parentId = null)
    // avec leurs réponses (replies)
    const comments = await Comment.findAll({
      where: {
        entityType,
        entityId: parseInt(entityId),
        parentId: null // Seulement les commentaires parents
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Comment,
          as: 'replies',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email']
            }
          ],
          order: [['createdAt', 'ASC']] // Réponses du plus ancien au plus récent
        }
      ],
      order: [['createdAt', 'DESC']] // Commentaires parents du plus récent au plus ancien
    });

    // Compter le total de commentaires (parents + réponses)
    const totalComments = await Comment.count({
      where: { entityType, entityId: parseInt(entityId) }
    });

    res.status(200).json({
      success: true,
      data: {
        comments,
        total: totalComments,
        topLevel: comments.length
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des commentaires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commentaires'
    });
  }
};

/**
 * @desc    Mettre à jour un commentaire
 * @route   PUT /api/comments/:id
 * @access  Private
 */
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    // Validation du champ requis
    if (!comment) {
      return res.status(400).json({
        success: false,
        message: 'Le commentaire est requis'
      });
    }

    // Récupérer le commentaire existant
    const existingComment = await Comment.findByPk(id);

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        message: 'Commentaire non trouvé'
      });
    }

    // Vérifier que l'utilisateur est l'auteur du commentaire
    if (existingComment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier ce commentaire'
      });
    }

    // Sauvegarder l'ancienne valeur pour le log
    const oldValue = {
      comment: existingComment.comment
    };

    // Mettre à jour le commentaire
    await existingComment.update({ comment });

    // Nouvelles valeurs pour le log
    const newValue = {
      comment: existingComment.comment
    };

    // Logger l'action
    await createLog(
      'UPDATE_COMMENT',
      `Commentaire modifié sur ${existingComment.entityType} #${existingComment.entityId}`,
      'comment',
      existingComment.id,
      oldValue,
      newValue,
      req.user.id,
      req
    );

    // Récupérer le commentaire mis à jour avec les relations
    const updatedComment = await Comment.findByPk(existingComment.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Commentaire mis à jour avec succès',
      data: { comment: updatedComment }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du commentaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du commentaire'
    });
  }
};

/**
 * @desc    Supprimer un commentaire
 * @route   DELETE /api/comments/:id
 * @access  Private
 */
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le commentaire existant
    const comment = await Comment.findByPk(id, {
      include: [
        {
          model: Comment,
          as: 'replies',
          attributes: ['id']
        }
      ]
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Commentaire non trouvé'
      });
    }

    // Vérifier que l'utilisateur est l'auteur ou admin
    if (comment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à supprimer ce commentaire'
      });
    }

    // Sauvegarder les informations avant suppression pour le log
    const commentData = {
      id: comment.id,
      entityType: comment.entityType,
      entityId: comment.entityId,
      comment: comment.comment,
      repliesCount: comment.replies ? comment.replies.length : 0
    };

    // Logger l'action avant la suppression
    await createLog(
      'DELETE_COMMENT',
      `Commentaire supprimé sur ${comment.entityType} #${comment.entityId}${commentData.repliesCount > 0 ? ` (avec ${commentData.repliesCount} réponse(s))` : ''}`,
      'comment',
      comment.id,
      commentData,
      null,
      req.user.id,
      req
    );

    // Supprimer le commentaire (CASCADE supprimera automatiquement les réponses)
    await comment.destroy();

    res.status(200).json({
      success: true,
      message: 'Commentaire supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du commentaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du commentaire'
    });
  }
};

module.exports = {
  createComment,
  getEntityComments,
  updateComment,
  deleteComment
};

