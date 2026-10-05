// Renders the blocks lib/design-system.ts reads from docs/design-system/. No hooks, so it works on both sides.
import Link from "next/link";
import type { Block, Inline } from "@/lib/design-system";

function Text({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.t === "code") return <code key={i}>{p.v}</code>;
        if (p.t === "strong") return <strong key={i}>{p.v}</strong>;
        if (p.t === "link") {
          return p.href.startsWith("/")
            ? <Link key={i} href={p.href}>{p.v}</Link>
            : <a key={i} href={p.href} target="_blank" rel="noreferrer">{p.v}</a>;
        }
        return <span key={i}>{p.v}</span>;
      })}
    </>
  );
}

export default function DsMarkdown({ blocks }: { blocks: Block[] }) {
  return (
    <div className="ds-md">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h":
            return b.level === 2
              ? <h2 key={i} id={b.id}><Text parts={b.text} /></h2>
              : <h3 key={i} id={b.id}><Text parts={b.text} /></h3>;
          case "p":
            return <p key={i}><Text parts={b.text} /></p>;
          case "ul":
            return <ul key={i}>{b.items.map((it, j) => <li key={j}><Text parts={it} /></li>)}</ul>;
          case "ol":
            return <ol key={i}>{b.items.map((it, j) => <li key={j}><Text parts={it} /></li>)}</ol>;
          case "code":
            return <pre key={i}><code>{b.v}</code></pre>;
          case "table":
            return (
              <div key={i} className="ds-md__table">
                <table>
                  <thead><tr>{b.head.map((c, j) => <th key={j}><Text parts={c} /></th>)}</tr></thead>
                  <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}><Text parts={c} /></td>)}</tr>)}</tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
