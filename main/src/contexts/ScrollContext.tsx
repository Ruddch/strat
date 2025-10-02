"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface ScrollContextType {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export function ScrollProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState('live');

  return (
    <ScrollContext.Provider value={{ activeSection, setActiveSection }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScroll() {
  const context = useContext(ScrollContext);
  if (context === undefined) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return context;
}
