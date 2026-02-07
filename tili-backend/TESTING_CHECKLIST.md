# ✅ CHECKLIST DE VÉRIFICATION BACKEND TILI

## 📦 Architecture & Structure

- [x] **Modèles Sequelize**
  - [x] User.js - Modèle utilisateur avec rôles
  - [x] Project.js - Modèle projet
  - [x] ProjectMember.js - Table pivot projet-membres
  - [x] Task.js - Modèle tâche avec hook completedAt
  - [x] Document.js - Modèle document avec archivage
  - [x] Meeting.js - Modèle réunion avec attendees
  - [x] Comment.js - Modèle commentaire hiérarchique
  - [x] Log.js - Modèle de logs d'activité

- [x] **Associations Sequelize**
  - [x] User ↔ Project (many-to-many via ProjectMember)
  - [x] Project → Tasks (one-to-many)
  - [x] Project → Documents (one-to-many)
  - [x] Project → Meetings (one-to-many)
  - [x] Task → User (assignedTo, createdBy)
  - [x] Document → User (uploadedBy)
  - [x] Meeting → User (createdBy)
  - [x] Comment → Comment (self-referencing pour replies)

- [x] **Controllers**
  - [x] authController.js - Authentification complète
  - [x] userController.js - Gestion utilisateurs
  - [x] projectController.js - Gestion projets & membres
  - [x] taskController.js - Gestion tâches (8 fonctions)
  - [x] documentController.js - Upload & gestion docs (7 fonctions)
  - [x] meetingController.js - Gestion réunions (6 fonctions)
  - [x] commentController.js - Système commentaires (4 fonctions)

- [x] **Middlewares**
  - [x] auth.js - Protection JWT & autorisation par rôle
  - [x] upload.js - Configuration Multer pour fichiers

- [x] **Routes**
  - [x] auth.routes.js - Routes authentification
  - [x] users.routes.js - Routes utilisateurs
  - [x] projects.routes.js - Routes projets
  - [ ] tasks.routes.js - **À CRÉER**
  - [ ] documents.routes.js - **À CRÉER**
  - [ ] meetings.routes.js - **À CRÉER**
  - [ ] comments.routes.js - **À CRÉER**

- [x] **Utilitaires**
  - [x] logger.js - Fonction centralisée de logging

## 🔒 Sécurité & Authentification

- [x] Hachage des mots de passe (bcrypt)
- [x] JWT avec expiration configurable
- [x] Middleware de protection des routes
- [x] Middleware d'autorisation par rôle
- [x] Validation des entrées utilisateur
- [x] Gestion des erreurs complète

## 📤 Upload de Fichiers

- [x] Configuration Multer
- [x] Filtrage des types de fichiers autorisés
- [x] Limitation de la taille des fichiers
- [x] Nommage unique des fichiers
- [x] Suppression des fichiers en cas d'erreur

## 📝 Logging

- [x] Fonction createLog centralisée
- [x] Capture IP et User-Agent
- [x] Logging de toutes les actions CRUD
- [x] OldValue/NewValue pour les updates
- [x] Gestion d'erreurs silencieuse (non-bloquante)

## 📚 Documentation

- [x] README.md complet avec exemples
- [x] .env.example avec commentaires
- [x] postman_collection.json avec tous les endpoints
- [x] Liste complète des endpoints API
- [x] Exemples de requêtes cURL

---

# 🧪 PLAN DE TESTS CRITIQUES

## Phase 1️⃣ : Tests d'Authentification

### Test 1: Inscription d'un utilisateur
```bash
POST /api/auth/register
Body: {
  "firstName": "Test",
  "lastName": "User",
  "username": "testuser",
  "email": "test@example.com",
  "password": "Test123456",
  "phoneNumber": "+216 12 345 678"
}
```
**Résultat attendu:** 
- Status 201
- Utilisateur créé avec role="consultant"
- Log d'action créé

---

### Test 2: Connexion avec l'utilisateur créé
```bash
POST /api/auth/login
Body: {
  "email": "test@example.com",
  "password": "Test123456"
}
```
**Résultat attendu:**
- Status 200
- Token JWT retourné
- Données utilisateur dans la réponse

---

### Test 3: Récupérer le profil connecté
```bash
GET /api/auth/me
Headers: Authorization: Bearer {token}
```
**Résultat attendu:**
- Status 200
- Informations complètes de l'utilisateur

---

## Phase 2️⃣ : Tests Projets

### Test 4: Créer un projet
```bash
POST /api/projects
Headers: Authorization: Bearer {token}
Body: {
  "name": "Projet Test API",
  "description": "Description du projet de test",
  "category": "technology",
  "status": "active",
  "startDate": "2024-02-01",
  "budget": 10000
}
```
**Résultat attendu:**
- Status 201
- Projet créé avec createdBy = userId
- Log d'action créé

---

### Test 5: Récupérer tous les projets
```bash
GET /api/projects?page=1&limit=10
Headers: Authorization: Bearer {token}
```
**Résultat attendu:**
- Status 200
- Liste paginée des projets
- Membres inclus

---

### Test 6: Ajouter un membre au projet
```bash
POST /api/projects/1/members
Headers: Authorization: Bearer {token}
Body: {
  "userId": 2,
  "role": "member"
}
```
**Résultat attendu:**
- Status 201
- Membre ajouté au projet
- Log d'action créé

---

## Phase 3️⃣ : Tests Tâches

### Test 7: Créer une tâche dans le projet
```bash
POST /api/tasks
Headers: Authorization: Bearer {token}
Body: {
  "projectId": 1,
  "taskName": "Tâche de test",
  "description": "Description de la tâche",
  "priority": "high",
  "assignedTo": 1,
  "dueDate": "2024-03-15"
}
```
**Résultat attendu:**
- Status 201
- Tâche créée avec status="not_started"
- Log d'action créé

---

### Test 8: Mettre à jour le statut de la tâche
```bash
PATCH /api/tasks/1/status
Headers: Authorization: Bearer {token}
Body: {
  "status": "completed"
}
```
**Résultat attendu:**
- Status 200
- Statut mis à jour
- completedAt automatiquement défini
- Log d'action créé

---

### Test 9: Récupérer les tâches d'un projet
```bash
GET /api/tasks/project/1
Headers: Authorization: Bearer {token}
```
**Résultat attendu:**
- Status 200
- Liste des tâches du projet
- Statistiques incluses

---

## Phase 4️⃣ : Tests Documents

### Test 10: Upload d'un document
```bash
POST /api/documents
Headers: Authorization: Bearer {token}
Body: FormData {
  file: [fichier PDF/Word],
  title: "Document de test",
  description: "Description du document",
  type: "report",
  projectId: 1
}
```
**Résultat attendu:**
- Status 201
- Document uploadé avec filePath, fileSize, mimeType
- Log d'action créé

---

### Test 11: Télécharger le document
```bash
GET /api/documents/1/download
Headers: Authorization: Bearer {token}
```
**Résultat attendu:**
- Status 200
- Fichier téléchargé
- Log DOWNLOAD_DOCUMENT créé

---

### Test 12: Archiver le document
```bash
DELETE /api/documents/1
Headers: Authorization: Bearer {token}
```
**Résultat attendu:**
- Status 200
- isArchived = true (soft delete)
- Fichier physique conservé
- Log d'action créé

---

## Phase 5️⃣ : Tests Réunions

### Test 13: Créer une réunion
```bash
POST /api/meetings
Headers: Authorization: Bearer {token}
Body: {
  "title": "Réunion de test",
  "meetingDate": "2024-02-25T10:00:00Z",
  "duration": 60,
  "projectId": 1,
  "location": "Salle A",
  "attendees": [1, 2]
}
```
**Résultat attendu:**
- Status 201
- Réunion créée avec status="scheduled"
- Attendees validés
- Log d'action créé

---

### Test 14: Mettre à jour la réunion en "completed"
```bash
PUT /api/meetings/1
Headers: Authorization: Bearer {token}
Body: {
  "status": "completed",
  "notes": "Notes de la réunion: ..."
}
```
**Résultat attendu:**
- Status 200
- Statut mis à jour
- Notes requises présentes
- Log d'action créé

---

## Phase 6️⃣ : Tests Commentaires

### Test 15: Ajouter un commentaire sur un projet
```bash
POST /api/comments
Headers: Authorization: Bearer {token}
Body: {
  "entityType": "project",
  "entityId": 1,
  "comment": "Excellent travail sur ce projet!"
}
```
**Résultat attendu:**
- Status 201
- Commentaire créé
- userId = utilisateur connecté
- Log d'action créé

---

### Test 16: Répondre au commentaire
```bash
POST /api/comments
Headers: Authorization: Bearer {token}
Body: {
  "entityType": "project",
  "entityId": 1,
  "comment": "Merci beaucoup!",
  "parentId": 1
}
```
**Résultat attendu:**
- Status 201
- Réponse créée avec parentId
- Log d'action créé

---

### Test 17: Récupérer tous les commentaires du projet
```bash
GET /api/comments/project/1
Headers: Authorization: Bearer {token}
```
**Résultat attendu:**
- Status 200
- Structure hiérarchique (parents avec replies)
- Tri: plus récents en premier

---

## Phase 7️⃣ : Tests Utilisateurs (Admin)

### Test 18: Créer un utilisateur (Admin uniquement)
```bash
POST /api/users
Headers: Authorization: Bearer {admin_token}
Body: {
  "firstName": "New",
  "lastName": "Admin",
  "username": "newadmin",
  "email": "admin@example.com",
  "password": "Admin123456",
  "role": "admin"
}
```
**Résultat attendu:**
- Status 201 (si admin)
- Status 403 (si non-admin)
- Utilisateur créé avec le rôle spécifié

---

### Test 19: Récupérer les statistiques d'un utilisateur
```bash
GET /api/users/1/stats
Headers: Authorization: Bearer {token}
```
**Résultat attendu:**
- Status 200
- Statistiques: projets, tâches, documents

---

## Phase 8️⃣ : Tests de Sécurité

### Test 20: Accès sans token
```bash
GET /api/projects
(Sans header Authorization)
```
**Résultat attendu:**
- Status 401
- Message: Token manquant ou invalide

---

### Test 21: Accès avec token expiré/invalide
```bash
GET /api/projects
Headers: Authorization: Bearer invalid_token
```
**Résultat attendu:**
- Status 401
- Message: Token invalide

---

### Test 22: Tentative d'accès non autorisé (rôle)
```bash
POST /api/users
Headers: Authorization: Bearer {consultant_token}
Body: {...}
```
**Résultat attendu:**
- Status 403
- Message: Accès refusé (rôle admin requis)

---

### Test 23: Modification d'un commentaire par un autre user
```bash
PUT /api/comments/1
Headers: Authorization: Bearer {autre_user_token}
Body: {
  "comment": "Tentative de modification"
}
```
**Résultat attendu:**
- Status 403
- Message: Non autorisé à modifier ce commentaire

---

## 🔍 Tests de Validation

### Test 24: Créer un projet sans champs requis
```bash
POST /api/projects
Headers: Authorization: Bearer {token}
Body: {
  "description": "Sans nom"
}
```
**Résultat attendu:**
- Status 400
- Erreurs de validation détaillées

---

### Test 25: Upload d'un fichier non autorisé
```bash
POST /api/documents
Headers: Authorization: Bearer {token}
Body: FormData {
  file: [fichier .exe],
  title: "Test"
}
```
**Résultat attendu:**
- Status 400
- Message: Type de fichier non autorisé

---

## 📊 Tests de Pagination & Filtrage

### Test 26: Liste avec pagination
```bash
GET /api/projects?page=2&limit=5
Headers: Authorization: Bearer {token}
```
**Résultat attendu:**
- Status 200
- 5 projets max
- Métadonnées: total, totalPages, page

---

### Test 27: Liste avec filtres
```bash
GET /api/tasks?status=in_progress&priority=high&projectId=1
Headers: Authorization: Bearer {token}
```
**Résultat attendu:**
- Status 200
- Résultats filtrés selon les critères

---

## ✅ Checklist Finale

- [ ] Tous les tests passent avec succès
- [ ] Les logs sont créés pour chaque action
- [ ] Les relations Sequelize fonctionnent correctement
- [ ] L'authentification JWT fonctionne
- [ ] Les autorisations par rôle fonctionnent
- [ ] L'upload de fichiers fonctionne
- [ ] Les soft deletes fonctionnent
- [ ] Les validations empêchent les données invalides
- [ ] Les erreurs sont gérées proprement
- [ ] La pagination fonctionne
- [ ] Les filtres fonctionnent
- [ ] La base de données se synchronise correctement

---

## 📝 Notes Importantes

1. **Créer les routes manquantes** avant de tester :
   - routes/tasks.routes.js
   - routes/documents.routes.js
   - routes/meetings.routes.js
   - routes/comments.routes.js

2. **Décommenter les routes** dans server.js :
   ```javascript
   app.use('/api/tasks', require('./routes/tasks.routes'));
   app.use('/api/documents', require('./routes/documents.routes'));
   app.use('/api/meetings', require('./routes/meetings.routes'));
   app.use('/api/comments', require('./routes/comments.routes'));
   ```

3. **Vérifier que le dossier uploads existe** :
   ```bash
   mkdir -p uploads/documents
   ```

4. **Tester la connexion à la base de données** avant tout :
   ```bash
   npm run dev
   ```
   Vérifier les messages de console pour la connexion MySQL.

---

**Bon testing! 🚀**

