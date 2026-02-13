"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

interface SidebarContextValue {
  isCollapsed: boolean;
  hideExpandButton: boolean;
  /** Whether to skip animation (for programmatic state changes) */
  skipAnimation: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
  setHideExpandButton: (hide: boolean) => void;
  /** Temporarily collapse without saving to localStorage */
  collapseTemporarily: () => void;
  /** Restore to the persisted state */
  restorePersistedState: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

const STORAGE_KEY = "sidebar-collapsed";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Read initial state synchronously from localStorage to avoid flash
  const getInitialState = () => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  };

  const [isCollapsed, setIsCollapsed] = useState(getInitialState);
  const [hideExpandButton, setHideExpandButton] = useState(false);
  const [isTemporary, setIsTemporary] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const persistedStateRef = useRef<boolean>(getInitialState());

  // Update persisted state ref when localStorage changes
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      persistedStateRef.current = stored === "true";
    }
  }, []);

  // Save to localStorage when changed (only if not temporary)
  useEffect(() => {
    if (!isTemporary) {
      localStorage.setItem(STORAGE_KEY, String(isCollapsed));
      persistedStateRef.current = isCollapsed;
    }
  }, [isCollapsed, isTemporary]);

  // User actions - with animation
  const toggle = useCallback(() => {
    setSkipAnimation(false);
    setIsTemporary(false);
    setIsCollapsed((prev) => !prev);
  }, []);

  const collapse = useCallback(() => {
    setSkipAnimation(false);
    setIsTemporary(false);
    setIsCollapsed(true);
  }, []);

  const expand = useCallback(() => {
    setSkipAnimation(false);
    setIsTemporary(false);
    setIsCollapsed(false);
  }, []);

  // Programmatic actions - without animation
  const collapseTemporarily = useCallback(() => {
    setSkipAnimation(true);
    setIsTemporary(true);
    setIsCollapsed(true);
  }, []);

  const restorePersistedState = useCallback(() => {
    setSkipAnimation(true);
    setIsTemporary(false);
    setIsCollapsed(persistedStateRef.current);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        hideExpandButton,
        skipAnimation,
        toggle,
        collapse,
        expand,
        setHideExpandButton,
        collapseTemporarily,
        restorePersistedState,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
