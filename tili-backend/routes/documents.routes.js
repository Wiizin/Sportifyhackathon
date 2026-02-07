const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getAllDocuments,
  getDocumentById,
  downloadDocument,
  updateDocument,
  deleteDocument,
  getProjectDocuments
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * @route   GET /api/documents
 * @desc    Récupérer tous les documents
 * @access  Private
 */
router.get('/', protect, getAllDocuments);

/**
 * @route   GET /api/documents/:id
 * @desc    Récupérer un document par ID
 * @access  Private
 */
router.get('/:id', protect, getDocumentById);

/**
 * @route   POST /api/documents
 * @desc    Upload un document
 * @access  Private
 */
router.post('/', protect, upload.single('file'), uploadDocument);

/**
 * @route   GET /api/documents/:id/download
 * @desc    Télécharger un document
 * @access  Private
 */
router.get('/:id/download', protect, downloadDocument);

/**
 * @route   PUT /api/documents/:id
 * @desc    Mettre à jour les métadonnées d'un document
 * @access  Private
 */
router.put('/:id', protect, updateDocument);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Archiver ou supprimer définitivement un document
 * @access  Private
 * @query   permanent=true (optionnel pour suppression physique)
 */
router.delete('/:id', protect, deleteDocument);

/**
 * @route   GET /api/documents/project/:projectId
 * @desc    Récupérer tous les documents d'un projet
 * @access  Private
 */
router.get('/project/:projectId', protect, getProjectDocuments);

module.exports = router;
