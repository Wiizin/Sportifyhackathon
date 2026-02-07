const express = require('express');
const router = express.Router();
const {
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingDocuments
} = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/meetings
 * @desc    Récupérer toutes les réunions
 * @access  Private
 */
router.get('/', protect, getAllMeetings);

/**
 * @route   GET /api/meetings/:id
 * @desc    Récupérer une réunion par ID
 * @access  Private
 */
router.get('/:id', protect, getMeetingById);

/**
 * @route   POST /api/meetings
 * @desc    Créer une nouvelle réunion
 * @access  Private
 */
router.post('/', protect, createMeeting);

/**
 * @route   PUT /api/meetings/:id
 * @desc    Mettre à jour une réunion
 * @access  Private
 */
router.put('/:id', protect, updateMeeting);

/**
 * @route   DELETE /api/meetings/:id
 * @desc    Annuler une réunion (soft delete)
 * @access  Private
 */
router.delete('/:id', protect, deleteMeeting);

/**
 * @route   GET /api/meetings/:id/documents
 * @desc    Récupérer tous les documents liés à une réunion
 * @access  Private
 */
router.get('/:id/documents', protect, getMeetingDocuments);

module.exports = router;

