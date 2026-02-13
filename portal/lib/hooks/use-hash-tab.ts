/**
 * useHashTab Hook
 *
 * Syncs tab state with URL hash for browser history support.
 * Replaces duplicated logic in:
 * - feature-map/feature-map-client.tsx
 * - details/[type]/[module]/[item]/item-tabs-client.tsx
 * - components/tabs-with-hash.tsx
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export interface UseHashTabOptions {
  /** Prefix for hash (e.g., "tab-" results in #tab-overview) */
  hashPrefix?: string;
  /** Use replaceState instead of pushState */
  replaceState?: boolean;
}

export interface UseHashTabResult<T extends string> {
  /** Currently active tab */
  activeTab: T;
  /** Whether component is mounted (for SSR hydration) */
  mounted: boolean;
  /** Handler for tab change */
  handleTabChange: (value: string) => void;
  /** Set tab without updating URL */
  setActiveTabSilent: (value: T) => void;
}

/**
 * Hook for syncing tab state with URL hash
 *
 * @param defaultTab - Default tab value when no hash is present
 * @param validTabs - Array of valid tab values
 * @param options - Optional configuration
 * @returns Tab state and handlers
 *
 * @example
 * const TABS = ["overview", "code", "tests"] as const;
 * type TabType = typeof TABS[number];
 *
 * const { activeTab, mounted, handleTabChange } = useHashTab<TabType>(
 *   "overview",
 *   TABS
 * );
 *
 * // Use with Tabs component
 * <Tabs value={activeTab} onValueChange={handleTabChange}>
 *   ...
 * </Tabs>
 */
export function useHashTab<T extends string>(
  defaultTab: T,
  validTabs: readonly T[],
  options: UseHashTabOptions = {}
): UseHashTabResult<T> {
  const { hashPrefix = "", replaceState = false } = options;
  const [activeTab, setActiveTab] = useState<T>(defaultTab);
  const [mounted, setMounted] = useState(false);

  // Parse hash value to tab
  const parseHash = useCallback(
    (hash: string): T | null => {
      // Remove # and prefix
      let value = hash.slice(1);
      if (hashPrefix && value.startsWith(hashPrefix)) {
        value = value.slice(hashPrefix.length);
      }
      // Validate
      if (validTabs.includes(value as T)) {
        return value as T;
      }
      return null;
    },
    [hashPrefix, validTabs]
  );

  // Format tab to hash
  const formatHash = useCallback(
    (tab: T): string => {
      return `#${hashPrefix}${tab}`;
    },
    [hashPrefix]
  );

  // Handle hash change event
  useEffect(() => {
    setMounted(true);

    const handleHashChange = () => {
      const hash = window.location.hash;
      const tab = parseHash(hash);
      if (tab) {
        setActiveTab(tab);
      }
    };

    // Set initial tab from hash
    handleHashChange();

    // Listen for hash changes (back/forward navigation)
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [parseHash]);

  // Handle tab change with URL update
  const handleTabChange = useCallback(
    (value: string) => {
      if (!validTabs.includes(value as T)) return;

      const tab = value as T;
      setActiveTab(tab);

      // Update URL hash
      const hash = formatHash(tab);
      if (replaceState) {
        window.history.replaceState(null, "", hash);
      } else {
        window.history.pushState(null, "", hash);
      }
    },
    [validTabs, formatHash, replaceState]
  );

  // Set tab without URL update (for programmatic control)
  const setActiveTabSilent = useCallback(
    (value: T) => {
      if (validTabs.includes(value)) {
        setActiveTab(value);
      }
    },
    [validTabs]
  );

  return {
    activeTab,
    mounted,
    handleTabChange,
    setActiveTabSilent,
  };
}
