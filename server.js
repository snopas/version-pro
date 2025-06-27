const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration CORS
const corsOptions = {
  origin: '*', // Accepter toutes les origines pour mobile
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`📱 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusEmoji = res.statusCode < 400 ? '✅' : '❌';
    console.log(`${statusEmoji} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// ========================================
// SPOTIFY API FUNCTIONS
// ========================================

let spotifyToken = null;
let tokenExpiry = null;

async function getSpotifyToken() {
  // Vérifier si le token est encore valide
  if (spotifyToken && tokenExpiry && Date.now() < tokenExpiry) {
    return spotifyToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Variables Spotify manquantes: SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET requis');
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    
    if (!data.access_token) {
      throw new Error('Impossible d\'obtenir le token Spotify');
    }

    spotifyToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // -1 minute de marge
    
    console.log('✅ Token Spotify obtenu, expire dans', data.expires_in, 'secondes');
    return spotifyToken;
  } catch (error) {
    console.error('❌ Erreur token Spotify:', error);
    throw error;
  }
}

async function searchSpotifyArtists(query) {
  try {
    const token = await getSpotifyToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.artists) {
      return [];
    }

    return data.artists.items.map(artist => ({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images[0]?.url || null,
      followers: artist.followers.total,
      genres: artist.genres || [],
      popularity: artist.popularity || 0
    }));
  } catch (error) {
    console.error('❌ Erreur recherche Spotify:', error);
    throw error;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RapGame Backend Standalone',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      search: '/api/search',
      validate: '/api/validate'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'RapGame Backend Standalone',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre q requis avec au moins 2 caractères',
        example: '/api/search?q=Drake'
      });
    }

    console.log(`🔍 Recherche: "${query}"`);
    const results = await searchSpotifyArtists(query.trim());
    
    res.json({
      success: true,
      artists: results,
      count: results.length,
      query: query.trim(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur recherche:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche d\'artistes',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Validate collaboration endpoint
app.post('/api/validate', async (req, res) => {
  try {
    const { artist1, artist2 } = req.body;
    
    if (!artist1 || !artist2) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres artist1 et artist2 requis'
      });
    }

    console.log(`🤝 Validation: "${artist1}" x "${artist2}"`);
    
    // Mock validation pour simplicité
    const result = {
      artist1: artist1.trim(),
      artist2: artist2.trim(),
      isValid: Math.random() > 0.5,
      confidence: Math.random() * 100,
      source: 'mock'
    };
    
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur validation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la validation',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 RapGame Backend Standalone démarré sur le port', PORT);
  console.log('❤️ Health check:', `http://localhost:${PORT}/health`);
  console.log('🔍 Recherche:', `http://localhost:${PORT}/api/search?q=Drake`);
});
