import ReactMarkdown, { type Components } from 'react-markdown';

const components: Components = {
  p: ({ children }) => <p className="mb-2 [overflow-wrap:anywhere] last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h4>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[0.85em] [overflow-wrap:anywhere]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-md bg-black/40 p-3 text-xs last:mb-0">{children}</pre>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-emerald-300 underline [overflow-wrap:anywhere]">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-slate-500 pl-3 text-slate-300 last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2 border-slate-600" />,
};

type Props = {
  text: string;
  className?: string;
};

export const MarkdownMessage = ({ text, className }: Props) => (
  <div className={className}>
    <ReactMarkdown components={components}>{text}</ReactMarkdown>
  </div>
);
