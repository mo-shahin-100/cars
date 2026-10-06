import { getAuthToken } from './api';

export type SyncStatus = 'online' | 'syncing' | 'offline';

type EventListener = (event: any) => void;

class SyncEngine {
  private ws: WebSocket | null = null;
  private status: SyncStatus = 'offline';
  private listeners: Set<EventListener> = new Set();
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private reconnectTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.setStatus('syncing');
        this.connectWebSocket();
        this.flushOfflineQueue();
      });

      window.addEventListener('offline', () => {
        this.setStatus('offline');
      });
    }
  }

  public init() {
    this.connectWebSocket();
    if (navigator.onLine) {
      this.flushOfflineQueue();
    } else {
      this.setStatus('offline');
    }
  }

  public subscribe(listener: EventListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeStatus(listener: (status: SyncStatus) => void) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(newStatus: SyncStatus) {
    this.status = newStatus;
    this.statusListeners.forEach(fn => fn(newStatus));
  }

  private connectWebSocket() {
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
      this.setStatus('online');
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = getAuthToken();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${token || ''}&device=web`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('online');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.listeners.forEach(fn => fn(data));
        } catch (e) {
          // Ignore
        }
      };

      this.ws.onclose = () => {
        if (navigator.onLine) {
          this.setStatus('syncing');
          this.scheduleReconnect();
        } else {
          this.setStatus('offline');
        }
      };

      this.ws.onerror = () => {
        this.setStatus('offline');
      };
    } catch (e) {
      this.setStatus('offline');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket();
    }, 4000);
  }

  /**
   * Enqueue a mutation for offline replay
   */
  public enqueueMutation(mutation: {
    entity: string;
    action: string;
    payload: any;
    idempotency_key?: string;
  }) {
    const queue = this.getQueue();
    const item = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
      ...mutation
    };
    queue.push(item);
    localStorage.setItem('workshop_sync_queue', JSON.stringify(queue));

    if (navigator.onLine) {
      this.flushOfflineQueue();
    }
  }

  public getQueue(): any[] {
    try {
      const raw = localStorage.getItem('workshop_sync_queue');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async flushOfflineQueue() {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.setStatus('syncing');
    try {
      const token = getAuthToken();
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ queue })
      });

      if (res.ok) {
        localStorage.removeItem('workshop_sync_queue');
        this.setStatus('online');
      }
    } catch (err) {
      console.warn('Could not flush sync queue, will retry on next connection:', err);
      this.setStatus('offline');
    }
  }
}

export const syncEngine = new SyncEngine();
