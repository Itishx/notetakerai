import "./braino-peek.css";

export function LaunchPill({ lead, text, href }: { lead: string; text: string; href: string }) {
  return (
    <a className="lpill" href={href}>
      <b>{lead}</b>
      <i className="lpill-dot" aria-hidden="true" />
      <span className="lpill-txt">{text}</span>
      <span className="lpill-go" aria-hidden="true">↗</span>
    </a>
  );
}
