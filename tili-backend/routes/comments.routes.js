const express = require('express');
const router = express.Router();
const {
  createComment,
  getEntityComments,
  updateComment,
  deleteComment
} = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/comments
 * @desc    Créer un commentaire
 * @access  Private
 */
router.post('/', protect, createComment);

/**
 * @route   GET /api/comments/:entityType/:entityId
 * @desc    Récupérer tous les commentaires d'une entité
 * @access  Private
 * @params  entityType: project | document | task | meeting
 * @params  entityId: ID de l'entité
 */
router.get('/:entityType/:entityId', protect, getEntityComments);

/**
 * @route   PUT /api/comments/:id
 * @desc    Mettre à jour un commentaire
 * @access  Private (Auteur uniquement)
 */
router.put('/:id', protect, updateComment);

/**
 * @route   DELETE /api/comments/:id
 * @desc    Supprimer un commentaire
 * @access  Private (Auteur ou Admin)
 */
router.delete('/:id', protect, deleteComment);

module.exports = router;

