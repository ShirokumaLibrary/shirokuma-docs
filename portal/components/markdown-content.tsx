"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./mermaid-diagram";
import { CodeBlock } from "./code-block";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <article className={`prose prose-neutral dark:prose-invert max-w-none ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom table styling
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-border px-4 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-4 py-2">{children}</td>
          ),
          // Custom code block styling with Mermaid and syntax highlighting
          pre: ({ children }) => {
            // Just pass through - the code component handles the rendering
            return <>{children}</>;
          },
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : undefined;
            const codeString = String(children).replace(/\n$/, "");

            // Check if this is an inline code block (no language specified and short)
            const isInline = !className && !codeString.includes("\n");

            if (isInline) {
              return (
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }

            // Handle Mermaid diagrams
            if (language === "mermaid") {
              return <MermaidDiagram chart={codeString} />;
            }

            // Handle other code blocks with syntax highlighting
            return <CodeBlock code={codeString} language={language} />;
          },
          // Custom heading styling with anchors
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold tracking-tight mt-8 mb-4 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold tracking-tight mt-8 mb-4 border-b border-border pb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mt-6 mb-3">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold mt-4 mb-2">{children}</h4>
          ),
          // Custom link styling
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary hover:underline"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {children}
            </a>
          ),
          // Custom list styling
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-4">{children}</ol>
          ),
          // Horizontal rule
          hr: () => <hr className="my-8 border-border" />,
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 italic my-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          // Paragraph
          p: ({ children }) => (
            <p className="my-4 leading-7">{children}</p>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
