"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Code, Zap, Database, TestTube2, Table2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchItems, getCategoryInfo, type SearchIndex, type SearchItem } from "@/lib/search";
import { cn } from "@/lib/utils";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchIndex: SearchIndex;
}

const categoryIcons: Record<SearchItem["category"], React.ComponentType<{ className?: string }>> = {
  screen: FileText,
  component: Code,
  action: Zap,
  table: Table2,
  test: TestTube2,
  db: Database,
};

export function SearchDialog({ open, onOpenChange, searchIndex }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update results when query changes
  useEffect(() => {
    if (query.trim()) {
      const items = searchItems(searchIndex, query, 15);
      setResults(items);
      setSelectedIndex(0);
    } else {
      setResults([]);
      setSelectedIndex(0);
    }
  }, [query, searchIndex]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            router.push(results[selectedIndex].path);
            onOpenChange(false);
          }
          break;
        case "Escape":
          onOpenChange(false);
          break;
      }
    },
    [results, selectedIndex, router, onOpenChange]
  );

  const handleSelect = (item: SearchItem) => {
    router.push(item.path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden">
        <DialogTitle className="sr-only">ドキュメント検索</DialogTitle>
        <DialogDescription className="sr-only">
          画面、コンポーネント、アクション、テーブル、テストを検索
        </DialogDescription>

        {/* Search Input */}
        <div className="flex items-center border-b px-4 py-3">
          <Search className="mr-3 h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="検索... (画面、コンポーネント、アクション、テーブル、テスト)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="ml-2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[400px]">
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((item, index) => {
                const Icon = categoryIcons[item.category];
                const info = getCategoryInfo(item.category);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className={cn("rounded-md p-1.5", info.bgColor)}>
                      <Icon className={cn("h-4 w-4", info.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{item.title}</span>
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 text-xs", info.bgColor, info.color)}
                        >
                          {info.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {item.description}
                      </p>
                      {item.module && (
                        <span className="text-xs text-muted-foreground">
                          {item.module}
                        </span>
                      )}
                    </div>
                    {index === selectedIndex && (
                      <kbd className="hidden sm:flex shrink-0 h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        Enter
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ) : query.trim() ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                &quot;{query}&quot; に一致する結果がありません
              </p>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                キーワードを入力して検索
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 px-4">
                {["画面", "コンポーネント", "アクション", "テスト"].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => setQuery(hint)}
                    className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1.5 py-0.5">↑</kbd>
              <kbd className="rounded border bg-muted px-1.5 py-0.5">↓</kbd>
              <span>移動</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1.5 py-0.5">Enter</kbd>
              <span>選択</span>
            </span>
          </div>
          <span>{searchIndex.items.length} 件のドキュメント</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SearchButtonProps {
  searchIndex: SearchIndex | null;
}

export function SearchButton({ searchIndex }: SearchButtonProps) {
  const [open, setOpen] = useState(false);

  // Global keyboard shortcut (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (searchIndex) {
          setOpen(true);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchIndex]);

  // Don't render if no search index
  if (!searchIndex || !searchIndex.items) {
    return (
      <button
        disabled
        className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
        type="button"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">検索</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
        type="button"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">検索</span>
        <kbd className="hidden sm:inline ml-2 rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
          ⌘K
        </kbd>
      </button>
      <SearchDialog open={open} onOpenChange={setOpen} searchIndex={searchIndex} />
    </>
  );
}
