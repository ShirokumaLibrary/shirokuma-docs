"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabsWithHashProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsWithHash({
  defaultValue,
  children,
  className,
}: TabsWithHashProps) {
  const [value, setValue] = useState(defaultValue);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read hash on mount
    const hash = window.location.hash.slice(1);
    if (hash) {
      setValue(hash);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Update URL hash when tab changes
    const newUrl = `${window.location.pathname}#${value}`;
    window.history.replaceState(null, "", newUrl);
  }, [value, mounted]);

  return (
    <Tabs value={value} onValueChange={setValue} className={className}>
      {children}
    </Tabs>
  );
}

export { TabsContent, TabsList, TabsTrigger };
