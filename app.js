// Entrypoint for cPanel (Phusion Passenger) & PM2
const path = require('path');
const fs = require('fs');

// Charger les variables d'environnement depuis server/.env ou .env racine
const serverEnv = path.join(__dirname, 'server/.env');
const rootEnv = path.join(__dirname, '.env');

if (fs.existsSync(serverEnv)) {
  require('dotenv').config({ path: serverEnv });
} else if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else {
  require('dotenv').config();
}

// Démarrer le serveur Express / WebSocket RoyalBot
require('./server/src/index.js');
