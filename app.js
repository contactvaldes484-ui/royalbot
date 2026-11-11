// Entrypoint for cPanel (Phusion Passenger / LiteSpeed lsnode) & PM2
const path = require('path');
const fs = require('fs');

// Charger les variables d'environnement via dotenv (installé dans server/node_modules)
try {
  const dotenvPath = require.resolve('dotenv', {
    paths: [__dirname, path.join(__dirname, 'server')],
  });
  const dotenv = require(dotenvPath);
  const serverEnv = path.join(__dirname, 'server/.env');
  const rootEnv = path.join(__dirname, '.env');

  if (fs.existsSync(serverEnv)) {
    dotenv.config({ path: serverEnv });
  } else if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  }
} catch (err) {
  console.warn('Notice: dotenv non chargé depuis app.js:', err.message);
}

// Démarrer le serveur Express / WebSocket RoyalBot
require('./server/src/index.js');
