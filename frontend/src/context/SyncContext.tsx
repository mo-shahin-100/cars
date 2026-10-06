import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncEngine, SyncStatus } from '../services/syncEngine';

interface SyncContextType {
  status: SyncStatus;
  offlineQueueCount: number;
  lastEvent: any;
}

const SyncContext = createContext<SyncContextType>({
  status: 'offline',
  offlineQueueCount: 0,
  lastEvent: null
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SyncStatus>('offline');
  const [queueCount, setQueueCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<any>(null);

  useEffect(() => {
    const unsubStatus = syncEngine.subscribeStatus((newStatus) => {
      setStatus(newStatus);
      setQueueCount(syncEngine.getQueue().length);
    });

    const unsubEvents = syncEngine.subscribe((event) => {
      setLastEvent(event);
      setQueueCount(syncEngine.getQueue().length);
    });

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, []);

  return (
    <SyncContext.Provider value={{ status, offlineQueueCount: queueCount, lastEvent }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
