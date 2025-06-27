# RapGame Backend Standalone

Backend API complètement autonome pour RapGame.

## Déploiement Railway

1. Railway → "Deploy from GitHub repo"
2. Root Directory: backend-standalone
3. Configurer SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET
4. Déploiement automatique !

## Endpoints

- GET /health - Health check
- GET /api/search?q=artist - Recherche d'artistes
- POST /api/validate - Validation de collaborations
