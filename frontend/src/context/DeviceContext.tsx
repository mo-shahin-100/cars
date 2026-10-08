import React, { createContext, useContext, useState, useEffect } from 'react';

export type DeviceMode = 'desktop' | 'mobile';

interface DeviceContextType {
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  toggleDeviceMode: () => void;
  isMobile: boolean;
  scale: number;
  setScale: (scale: number) => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceMode, setDeviceModeState] = useState<DeviceMode>(() => {
    const saved = localStorage.getItem('workshop_device_mode');
    if (saved === 'desktop' || saved === 'mobile') return saved;
    return 'desktop';
  });

  const [windowWidth, setWindowWidth] = useState<number>(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1200;
  });

  const [scale, setScale] = useState<number>(() => {
    const saved = localStorage.getItem('workshop_device_scale');
    return saved ? parseFloat(saved) : 1;
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setDeviceMode = (mode: DeviceMode) => {
    setDeviceModeState(mode);
    localStorage.setItem('workshop_device_mode', mode);
  };

  const toggleDeviceMode = () => {
    setDeviceMode(deviceMode === 'desktop' ? 'mobile' : 'desktop');
  };

  const handleSetScale = (newScale: number) => {
    setScale(newScale);
    localStorage.setItem('workshop_device_scale', String(newScale));
  };

  // isMobile is true if user explicitly toggled mobile simulation OR if they are actually on a mobile device screen (< 768px)
  const isMobile = deviceMode === 'mobile' || windowWidth < 768;

  return (
    <DeviceContext.Provider
      value={{
        deviceMode,
        setDeviceMode,
        toggleDeviceMode,
        isMobile,
        scale,
        setScale: handleSetScale
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};
