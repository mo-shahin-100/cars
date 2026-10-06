import http from 'http';
import dotenv from 'dotenv';
import app from './app';
import { initDatabase } from './database/db';
import { setupWebSocket } from './websocket/socketServer';
import { seedDatabase } from './database/seed';

dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);

import { testPostgresConnection } from './database/pg';
import { seedPostgresDatabase } from './database/seed.postgres';

// Initialize database schema and ensure default records
(async () => {
  try {
    const isPgConnected = await testPostgresConnection();
    if (isPgConnected) {
      console.log('🐘 [Database] PostgreSQL connected successfully! Initializing tables...');
      await seedPostgresDatabase();
      console.log('✅ [Database] PostgreSQL schema and seeds ready.');
    } else {
      console.log('ℹ️ [Database] PostgreSQL not detected at DATABASE_URL. Using local SQLite engine as active fallback.');
      seedDatabase();
    }
  } catch (err) {
    console.error('Failed to initialize database during startup, falling back to SQLite:', err);
    try { seedDatabase(); } catch {}
  }
})();

const server = http.createServer(app);

// Attach WebSocket Real-Time Sync Server
setupWebSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(`🚀 Workshop Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket Real-time Sync Server available at ws://localhost:${PORT}/ws`);
  console.log(`📁 File uploads directory served at http://localhost:${PORT}/uploads`);
  console.log(`================================================================`);
});

export default server;
