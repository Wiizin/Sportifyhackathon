const express = require('express');
const router = express.Router();
const {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectMembers
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/projects
 * @desc    Récupérer tous les projets
 * @access  Private
 */
router.get('/', protect, getAllProjects);

/**
 * @route   GET /api/projects/:id
 * @desc    Récupérer un projet par ID
 * @access  Private
 */
router.get('/:id', protect, getProjectById);

/**
 * @route   POST /api/projects
 * @desc    Créer un nouveau projet
 * @access  Private
 */
router.post('/', protect, createProject);

/**
 * @route   PUT /api/projects/:id
 * @desc    Mettre à jour un projet
 * @access  Private (Lead ou Admin)
 */
router.put('/:id', protect, updateProject);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Supprimer (annuler) un projet
 * @access  Private (Lead ou Admin)
 */
router.delete('/:id', protect, deleteProject);

/**
 * @route   GET /api/projects/:id/members
 * @desc    Récupérer tous les membres d'un projet
 * @access  Private
 */
router.get('/:id/members', protect, getProjectMembers);

/**
 * @route   POST /api/projects/:id/members
 * @desc    Ajouter un membre au projet
 * @access  Private (Lead ou Admin)
 */
router.post('/:id/members', protect, addProjectMember);

/**
 * @route   DELETE /api/projects/:id/members/:userId
 * @desc    Retirer un membre du projet
 * @access  Private (Lead ou Admin)
 */
router.delete('/:id/members/:userId', protect, removeProjectMember);

module.exports = router;

