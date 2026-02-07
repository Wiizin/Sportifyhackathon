const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getProjectTasks,
  getUserTasks,
  updateTaskStatus,
  assignTask
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/tasks
 * @desc    Récupérer toutes les tâches
 * @access  Private
 */
router.get('/', protect, getAllTasks);

/**
 * @route   GET /api/tasks/project/:projectId
 * @desc    Récupérer toutes les tâches d'un projet
 * @access  Private
 */
router.get('/project/:projectId', protect, getProjectTasks);

/**
 * @route   GET /api/tasks/user
 * @desc    Récupérer les tâches de l'utilisateur connecté
 * @access  Private
 */
router.get('/user', protect, getUserTasks);

/**
 * @route   GET /api/tasks/user/:userId
 * @desc    Récupérer les tâches assignées à un utilisateur spécifique
 * @access  Private
 */
router.get('/user/:userId', protect, getUserTasks);

/**
 * @route   GET /api/tasks/:id
 * @desc    Récupérer une tâche par ID
 * @access  Private
 */
router.get('/:id', protect, getTaskById);

/**
 * @route   POST /api/tasks
 * @desc    Créer une nouvelle tâche
 * @access  Private
 */
router.post('/', protect, createTask);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Mettre à jour une tâche
 * @access  Private
 */
router.put('/:id', protect, updateTask);

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Mettre à jour uniquement le statut d'une tâche
 * @access  Private
 */
router.patch('/:id/status', protect, updateTaskStatus);

/**
 * @route   PATCH /api/tasks/:id/assign
 * @desc    Assigner une tâche à un membre de l'équipe
 * @access  Private (Chef de projet)
 */
router.patch('/:id/assign', protect, assignTask);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Supprimer une tâche
 * @access  Private
 */
router.delete('/:id', protect, deleteTask);

module.exports = router;
