import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db';

const JWT_SECRET = process.env.JWT_SECRET || 'workshop_super_secret_jwt_key_2026';

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  workshopId: string;
  deviceType: 'windows' | 'android' | 'web';
  connectedAt: Date;
}

const clients = new Map<string, ConnectedClient>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    let clientId = uuidv4();
    let authUser: { id: string; workshop_id: string } | null = null;

    // Extract token from query or URL
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token');
    const deviceType = (url.searchParams.get('device') || 'web') as 'windows' | 'android' | 'web';

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        authUser = { id: decoded.id, workshop_id: decoded.workshop_id };
      } catch (e) {
        // Invalid token
      }
    }

    const workshopId = authUser ? authUser.workshop_id : 'ws_default_01';
    const userId = authUser ? authUser.id : 'anonymous';

    clients.set(clientId, {
      ws,
      userId,
      workshopId,
      deviceType,
      connectedAt: new Date()
    });

    // Send connection greeting
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      clientId,
      timestamp: Date.now(),
      message: 'تم الاتصال بخادم المزامنة اللحظي بنجاح'
    }));

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (err) {
        // Ignore malformed JSON
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
    });

    ws.on('error', () => {
      clients.delete(clientId);
    });
  });

  console.log('WebSocket Real-time Sync Server listening on /ws');
  return wss;
}

export function broadcastEvent(event: {
  workshopId?: string;
  entity: string;
  entityId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  payload?: any;
  originUserId?: string;
}) {
  const targetWorkshopId = event.workshopId || 'ws_default_01';
  const eventId = uuidv4();

  // Record in sync_events table for offline replay
  try {
    db.prepare(`
      INSERT INTO sync_events (id, workshop_id, entity_name, entity_id, action, payload_json, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      targetWorkshopId,
      event.entity,
      event.entityId,
      event.action,
      JSON.stringify(event.payload || {}),
      event.originUserId || null
    );
  } catch (err) {
    console.error('Failed to log sync event:', err);
  }

  const broadcastPayload = JSON.stringify({
    type: 'EVENT_BROADCAST',
    id: eventId,
    entity: event.entity,
    entityId: event.entityId,
    action: event.action,
    payload: event.payload,
    timestamp: Date.now(),
    originUserId: event.originUserId
  });

  for (const [, client] of clients) {
    if (client.ws.readyState === WebSocket.OPEN && client.workshopId === targetWorkshopId) {
      client.ws.send(broadcastPayload);
    }
  }
}

export function getActiveConnectionsCount(): number {
  return clients.size;
}
