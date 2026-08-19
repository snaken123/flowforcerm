import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

// Renders admin-authored legal document content. rehype-sanitize strips anything
// not on its default allowlist (scripts, event handlers, iframes, style/dangerous
// URLs) before it ever reaches the DOM -- never render this content as raw HTML.
export function SanitizedMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
    </div>
  );
}
