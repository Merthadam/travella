import React, { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './ChatMarkdown.module.css';

const plugins = [remarkGfm];

function safeUrl(value) {
  // GFM footnotes stay within this document; other links must be web URLs.
  if (value.startsWith('#user-content-')) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

const components = {
  a: ({ href, children, title, id }) => href
    ? <a href={href} title={title} id={id} target={href.startsWith('#') ? undefined : '_blank'} rel="noopener noreferrer">{children}</a>
    : <span>{children}</span>,
  img: ({ alt }) => alt ? <span>{alt}</span> : null,
  table: ({ children }) => <div className={styles.tableScroll} role="region" aria-label="Message table" tabIndex={0}><table>{children}</table></div>,
};

// Reparse the accumulated text as chunks arrive; restored messages use this same
// renderer. Raw HTML is never executed and Markdown images never fetch remotely.
export const ChatMarkdown = memo(function ChatMarkdown({ content }) {
  return <div className={styles.markdown}>
    <Markdown remarkPlugins={plugins} components={components} urlTransform={safeUrl} skipHtml>
      {String(content || '')}
    </Markdown>
  </div>;
});
