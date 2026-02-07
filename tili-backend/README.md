# TILI Backend - API de Gestion Interne

API RESTful pour le système de gestion interne TILI, développée lors d'un hackathon de 42h pour une association tunisienne.

## 🚀 Stack Technique

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Base de données**: MySQL
- **ORM**: Sequelize 6.x
- **Authentification**: JWT (JSON Web Tokens)
- **Upload de fichiers**: Multer
- **Validation**: Express Validator
- **Sécurité**: bcryptjs (hachage des mots de passe)

## 📋 Prérequis

- Node.js >= 18.x
- MySQL >= 8.0
- npm ou yarn

## 🔧 Installation

1. **Cloner le projet**
```bash
cd tili-backend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```
Modifier le fichier `.env` avec vos configurations.

4. **Créer la base de données MySQL**
```sql
CREATE DATABASE tili_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. **Démarrer le serveur**
```bash
# Mode développement (avec nodemon)
npm run dev

# Mode production
npm start
```

Le serveur démarre sur `http://localhost:5000`

## 📁 Structure du Projet

```
tili-backend/
├── controllers/          # Logique métier des endpoints
│   ├── authController.js       # Authentification (register, login, etc.)
│   ├── userController.js       # Gestion des utilisateurs
│   ├── projectController.js    # Gestion des projets
│   ├── taskController.js       # Gestion des tâches
│   ├── documentController.js   # Upload/gestion documents
│   ├── meetingController.js    # Gestion des réunions
│   └── commentController.js    # Système de commentaires
│
├── models/               # Modèles Sequelize (base de données)
│   ├── index.js               # Configuration Sequelize & associations
│   ├── User.js                # Modèle utilisateur
│   ├── Project.js             # Modèle projet
│   ├── ProjectMember.js       # Table pivot projet-membres
│   ├── Task.js                # Modèle tâche
│   ├── Document.js            # Modèle document
│   ├── Meeting.js             # Modèle réunion
│   ├── Comment.js             # Modèle commentaire
│   └── Log.js                 # Logs d'activité
│
├── routes/               # Définition des routes API
│   ├── auth.routes.js         # Routes authentification
│   ├── users.routes.js        # Routes utilisateurs
│   ├── projects.routes.js     # Routes projets
│   ├── tasks.routes.js        # Routes tâches (à créer)
│   ├── documents.routes.js    # Routes documents (à créer)
│   ├── meetings.routes.js     # Routes réunions (à créer)
│   └── comments.routes.js     # Routes commentaires (à créer)
│
├── middleware/           # Middlewares Express
│   ├── auth.js               # Protection JWT & autorisation
│   └── upload.js             # Configuration Multer
│
├── utils/                # Utilitaires
│   └── logger.js             # Fonction centralisée de logging
│
├── uploads/              # Dossier de stockage des fichiers uploadés
│   └── documents/
│
├── .env                  # Variables d'environnement (ne pas commiter)
├── .env.example          # Template des variables
├── package.json          # Dépendances npm
└── server.js             # Point d'entrée de l'application
```

## 🔐 Authentification

L'API utilise JWT pour l'authentification. Après connexion, un token est retourné et doit être inclus dans les requêtes protégées :

```
Authorization: Bearer <votre_token_jwt>
```

### Rôles utilisateur
- **consultant** : Rôle par défaut, accès limité
- **lead** : Chef de projet, peut gérer ses projets
- **admin** : Accès complet à toutes les ressources

## 📡 Endpoints API

### 🔑 Authentification (`/api/auth`)

| Méthode | Endpoint | Description | Auth | Body |
|---------|----------|-------------|------|------|
| POST | `/register` | Inscription | Public | `firstName, lastName, username, email, password, phoneNumber?` |
| POST | `/login` | Connexion | Public | `email, password` |
| GET | `/me` | Profil utilisateur | Private | - |
| POST | `/logout` | Déconnexion | Private | - |
| PUT | `/profile` | Modifier profil | Private | `firstName?, lastName?, phoneNumber?, bio?` |
| PUT | `/change-password` | Changer mot de passe | Private | `currentPassword, newPassword` |

### 👥 Utilisateurs (`/api/users`)

| Méthode | Endpoint | Description | Auth | Body/Params |
|---------|----------|-------------|------|-------------|
| GET | `/` | Liste utilisateurs | Private | Query: `role, isActive, page, limit` |
| GET | `/:id` | Détails utilisateur | Private | - |
| GET | `/:id/stats` | Statistiques utilisateur | Private | - |
| POST | `/` | Créer utilisateur | Admin | `firstName, lastName, username, email, password, role, phoneNumber?` |
| PUT | `/:id` | Modifier utilisateur | Private | `firstName?, lastName?, role?, phoneNumber?, bio?` |
| DELETE | `/:id` | Désactiver utilisateur | Admin | - |
| PATCH | `/:id/activate` | Activer utilisateur | Admin | `isActive: boolean` |

### 📊 Projets (`/api/projects`)

| Méthode | Endpoint | Description | Auth | Body/Params |
|---------|----------|-------------|------|-------------|
| GET | `/` | Liste projets | Private | Query: `status, category, search, page, limit` |
| GET | `/:id` | Détails projet | Private | - |
| POST | `/` | Créer projet | Private | `name, description, category, status, startDate?, endDate?, budget?` |
| PUT | `/:id` | Modifier projet | Private | `name?, description?, status?, category?, budget?` |
| DELETE | `/:id` | Annuler projet | Private | - |
| GET | `/:id/members` | Membres du projet | Private | - |
| POST | `/:id/members` | Ajouter membre | Private | `userId, role` |
| DELETE | `/:id/members/:userId` | Retirer membre | Private | - |

### ✅ Tâches (`/api/tasks`)

| Méthode | Endpoint | Description | Auth | Body/Params |
|---------|----------|-------------|------|-------------|
| GET | `/` | Liste tâches | Private | Query: `status, priority, projectId, assignedTo` |
| GET | `/:id` | Détails tâche | Private | - |
| POST | `/` | Créer tâche | Private | `projectId, taskName, description?, priority?, assignedTo?, dueDate?` |
| PUT | `/:id` | Modifier tâche | Private | `taskName?, description?, status?, priority?, assignedTo?, dueDate?` |
| PATCH | `/:id/status` | Changer statut | Private | `status` |
| DELETE | `/:id` | Supprimer tâche | Private | - |
| GET | `/project/:projectId` | Tâches d'un projet | Private | Query: `status, priority` |
| GET | `/user/:userId?` | Tâches d'un user | Private | Query: `status, priority` |

### 📄 Documents (`/api/documents`)

| Méthode | Endpoint | Description | Auth | Body/Params |
|---------|----------|-------------|------|-------------|
| GET | `/` | Liste documents | Private | Query: `type, projectId, meetingId, isArchived` |
| GET | `/:id` | Détails document | Private | - |
| POST | `/` | Upload document | Private | FormData: `file, title, description?, type?, projectId?, meetingId?` |
| GET | `/:id/download` | Télécharger document | Private | - |
| PUT | `/:id` | Modifier métadonnées | Private | `title?, description?, type?` |
| DELETE | `/:id` | Archiver document | Private | Query: `permanent=true` (optionnel) |
| GET | `/project/:projectId` | Docs d'un projet | Private | Query: `isArchived` |

### 🤝 Réunions (`/api/meetings`)

| Méthode | Endpoint | Description | Auth | Body/Params |
|---------|----------|-------------|------|-------------|
| GET | `/` | Liste réunions | Private | Query: `status, projectId, startDate, endDate` |
| GET | `/:id` | Détails réunion | Private | - |
| POST | `/` | Créer réunion | Private | `title, meetingDate, description?, projectId?, duration?, location?, agenda?, attendees[]?` |
| PUT | `/:id` | Modifier réunion | Private | `title?, meetingDate?, status?, notes?, attendees[]?` |
| DELETE | `/:id` | Annuler réunion | Private | - |
| GET | `/:id/documents` | Docs d'une réunion | Private | - |

### 💬 Commentaires (`/api/comments`)

| Méthode | Endpoint | Description | Auth | Body/Params |
|---------|----------|-------------|------|-------------|
| POST | `/` | Créer commentaire | Private | `entityType, entityId, comment, parentId?` |
| GET | `/:entityType/:entityId` | Commentaires d'une entité | Private | - |
| PUT | `/:id` | Modifier commentaire | Private | `comment` |
| DELETE | `/:id` | Supprimer commentaire | Private | - |

**entityType** peut être : `project`, `document`, `task`, `meeting`

## 📝 Exemples de Requêtes

### 1. Inscription
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "phoneNumber": "+216 12 345 678"
  }'
```

### 2. Connexion
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### 3. Créer un projet
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <votre_token>" \
  -d '{
    "name": "Nouveau Projet",
    "description": "Description du projet",
    "category": "technology",
    "status": "active",
    "startDate": "2024-01-01"
  }'
```

### 4. Upload un document
```bash
curl -X POST http://localhost:5000/api/documents \
  -H "Authorization: Bearer <votre_token>" \
  -F "file=@/path/to/document.pdf" \
  -F "title=Rapport Q1" \
  -F "description=Rapport du premier trimestre" \
  -F "type=report" \
  -F "projectId=1"
```

### 5. Créer une tâche
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <votre_token>" \
  -d '{
    "projectId": 1,
    "taskName": "Développer la fonctionnalité X",
    "description": "Description de la tâche",
    "priority": "high",
    "assignedTo": 2,
    "dueDate": "2024-12-31"
  }'
```

### 6. Créer une réunion
```bash
curl -X POST http://localhost:5000/api/meetings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <votre_token>" \
  -d '{
    "title": "Réunion de planification",
    "meetingDate": "2024-02-15T10:00:00Z",
    "duration": 60,
    "projectId": 1,
    "location": "Salle de conférence A",
    "agenda": "Points à discuter...",
    "attendees": [1, 2, 3]
  }'
```

### 7. Ajouter un commentaire
```bash
curl -X POST http://localhost:5000/api/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <votre_token>" \
  -d '{
    "entityType": "project",
    "entityId": 1,
    "comment": "Excellent travail sur ce projet!"
  }'
```

## 🔒 Gestion des Erreurs

L'API retourne des réponses JSON standardisées :

**Succès:**
```json
{
  "success": true,
  "message": "Action réussie",
  "data": { ... }
}
```

**Erreur:**
```json
{
  "success": false,
  "message": "Description de l'erreur",
  "errors": { ... }
}
```

### Codes HTTP
- `200` - OK
- `201` - Créé avec succès
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Non autorisé
- `404` - Ressource non trouvée
- `409` - Conflit (ex: email déjà utilisé)
- `500` - Erreur serveur

## 📊 Logging

Toutes les actions importantes sont loggées dans la table `logs` :
- Création/modification/suppression d'entités
- Authentification (login/logout)
- Téléchargement de documents
- Changements de statut

Les logs incluent :
- Action effectuée
- Utilisateur qui a effectué l'action
- Timestamp
- IP et User-Agent
- Anciennes et nouvelles valeurs (pour les mises à jour)

## 🚀 Déploiement

### Variables d'environnement de production

Assurez-vous de modifier ces valeurs en production :
- `JWT_SECRET` : Générer un secret fort et unique
- `DB_PASSWORD` : Mot de passe MySQL sécurisé
- `NODE_ENV=production`
- `CORS_ORIGIN` : URL du frontend en production

### Sécurité

- Les mots de passe sont hashés avec bcrypt (salt rounds: 10)
- JWT avec expiration configurable
- Validation des entrées utilisateur
- Protection CORS
- Limitation de taille des fichiers uploadés

## 🧪 Tests

Pour tester l'API, utilisez :
- **Postman** : Importez la collection (postman_collection.json)
- **Thunder Client** (VS Code)
- **cURL** : Voir exemples ci-dessus

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur le repository
- Contacter l'équipe de développement

## 📄 Licence

Ce projet a été développé dans le cadre d'un hackathon de 42h.

---

**Développé avec ❤️ pour l'association TILI**

