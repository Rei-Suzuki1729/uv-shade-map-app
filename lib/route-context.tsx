/**
 * ルートデータのグローバルコンテキスト
 * ルート画面とマップ画面間でルートデータを共有
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { RouteAnalysis } from './shade-route-analyzer';

interface RouteContextType {
  currentRoute: RouteAnalysis | null;
  setCurrentRoute: (route: RouteAnalysis | null) => void;
  isRouteVisible: boolean;
  setIsRouteVisible: (visible: boolean) => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export function RouteProvider({ children }: { children: ReactNode }) {
  const [currentRoute, setCurrentRoute] = useState<RouteAnalysis | null>(null);
  const [isRouteVisible, setIsRouteVisible] = useState(false);

  return (
    <RouteContext.Provider
      value={{
        currentRoute,
        setCurrentRoute,
        isRouteVisible,
        setIsRouteVisible,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute() {
  const context = useContext(RouteContext);
  if (context === undefined) {
    throw new Error('useRoute must be used within a RouteProvider');
  }
  return context;
}
