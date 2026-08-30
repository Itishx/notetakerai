import type React from "react";

/* Braino's replies come back as markdown. This renders the subset he actually
   uses: bold, italic, code, links, headings, quotes, lists, rules.
 *
 * It lived inside BrainoChat until the setup flow needed the same thing. It is
 * moved here unchanged rather than copied, because two markdown parsers drift
 * apart and then one of them is quietly wrong.
 *
 * It returns bare tags on purpose. Whatever renders it supplies the styling. */

export function fmtInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let key = 0;
  let last = 0;
  let match: RegExpExecArray | null;
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;
  while ((match = re.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[2]) out.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3]) out.push(<em key={key++}>{match[3]}</em>);
    else if (match[4]) out.push(<code key={key++}>{match[4]}</code>);
    else if (match[5]) out.push(<a key={key++} href={match[6]} target="_blank" rel="noreferrer">{match[5]}</a>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  const isBlockStart = (line: string) => /^(#{1,4}\s|\s*>|\s*([-*•]|\d+\.)\s|```|\s*(---|___|\*\*\*)\s*$)/.test(line);
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }

    if (/^```/.test(line)) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) { body.push(lines[i]); i += 1; }
      i += 1;
      blocks.push(<pre key={key++}><code>{body.join("\n")}</code></pre>);
      continue;
    }

    if (/^\s*(---|___|\*\*\*)\s*$/.test(line)) {
      blocks.push(<hr key={key++} />);
      i += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const Tag = (`h${Math.min(heading[1].length + 1, 5)}`) as "h2" | "h3" | "h4" | "h5";
      blocks.push(<Tag key={key++}>{fmtInline(heading[2])}</Tag>);
      i += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { body.push(lines[i].replace(/^\s*>\s?/, "")); i += 1; }
      blocks.push(
        <blockquote key={key++}>
          {body.filter((row) => row.trim()).map((row, index) => <p key={index}>{fmtInline(row)}</p>)}
        </blockquote>,
      );
      continue;
    }

    if (/^\s*([-*•]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+\.)\s+/, ""));
        i += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(<List key={key++}>{items.map((item, index) => <li key={index}>{fmtInline(item)}</li>)}</List>);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { para.push(lines[i]); i += 1; }
    blocks.push(
      <p key={key++}>
        {para.map((row, index) => (
          <span key={index}>{fmtInline(row)}{index < para.length - 1 ? <br /> : null}</span>
        ))}
      </p>,
    );
  }

  return <>{blocks}</>;
}
