const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  getUserStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/users
 * @desc    Récupérer tous les utilisateurs
 * @access  Private
 */
router.get('/', protect, getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Récupérer un utilisateur par ID
 * @access  Private
 */
router.get('/:id', protect, getUserById);

/**
 * @route   GET /api/users/:id/stats
 * @desc    Récupérer les statistiques d'un utilisateur
 * @access  Private
 */
router.get('/:id/stats', protect, getUserStats);

/**
 * @route   POST /api/users
 * @desc    Créer un nouvel utilisateur
 * @access  Private/Admin
 */
router.post('/', protect, authorize('admin'), createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Mettre à jour un utilisateur
 * @access  Private (Admin ou utilisateur lui-même)
 */
router.put('/:id', protect, updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Supprimer (désactiver) un utilisateur
 * @access  Private/Admin
 */
router.delete('/:id', protect, authorize('admin'), deleteUser);

/**
 * @route   PATCH /api/users/:id/activate
 * @desc    Activer/Réactiver un utilisateur
 * @access  Private/Admin
 */
router.patch('/:id/activate', protect, authorize('admin'), activateUser);

module.exports = router;

