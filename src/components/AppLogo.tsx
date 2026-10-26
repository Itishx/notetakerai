/* The six app marks, drawn as small app icons. */
export function AppLogo({ name }: { name: "WhatsApp" | "Spotify" | "Chrome" | "Mail" | "Finder" | "Calendar" | "Gmail" | "Slack" | "Notes" }) {
  const box = { width: 34, height: 34, viewBox: "0 0 40 40", "aria-hidden": true } as const;
  if (name === "WhatsApp") return (
    <svg {...box}><rect width="40" height="40" rx="9" fill="#25D366" /><path d="M20 9.5a10.3 10.3 0 0 0-8.9 15.6L9.7 30.4l5.5-1.4A10.3 10.3 0 1 0 20 9.5z" fill="none" stroke="#fff" strokeWidth="2" /><path d="M16.3 15.4c.3-.6.6-.6.9-.6h.7c.2 0 .5 0 .7.6l1 2.3c.1.3 0 .6-.2.8l-.6.7c-.2.2-.2.4 0 .7a7 7 0 0 0 3.4 3c.3.1.5.1.7-.1l.8-1c.2-.2.5-.3.8-.2l2.2 1.1c.3.1.5.3.5.5 0 .9-.6 2.1-1.9 2.4-1 .2-2.4.1-4.9-1.2a10.6 10.6 0 0 1-4.3-4.6c-.8-1.6-.6-3 .2-4.4z" fill="#fff" /></svg>
  );
  if (name === "Spotify") return (
    <svg {...box}><rect width="40" height="40" rx="9" fill="#121212" /><circle cx="20" cy="20" r="11" fill="#1DB954" /><path d="M13.5 16.6c4.4-1.3 9.4-.9 13.2 1.2M14.3 20.2c3.6-1 7.6-.7 10.8 1M15 23.6c2.9-.7 5.9-.5 8.4.8" stroke="#121212" strokeWidth="1.7" strokeLinecap="round" fill="none" /></svg>
  );
  if (name === "Chrome") return (
    <svg {...box}><rect width="40" height="40" rx="9" fill="#fff" stroke="#e3e0d8" /><path d="M20 9a11 11 0 0 1 9.5 5.5H20a5.5 5.5 0 0 0-4.8 2.8l-4.7-8.1A11 11 0 0 1 20 9z" fill="#EA4335" /><path d="M29.5 14.5A11 11 0 0 1 20 31l4.8-8.2a5.5 5.5 0 0 0 0-5.6z" fill="#FBBC04" /><path d="M20 31a11 11 0 0 1-9.5-21.8l4.7 8.1a5.5 5.5 0 0 0 4.8 8.2h.1z" fill="#34A853" /><circle cx="20" cy="20" r="5.2" fill="#fff" /><circle cx="20" cy="20" r="4.1" fill="#4285F4" /></svg>
  );
  if (name === "Gmail") return (
    <svg {...box}><rect width="40" height="40" rx="9" fill="#fff" stroke="#e5e5e5" /><path d="M8 13.5v13.2c0 .9.7 1.6 1.6 1.6h3.6V18.4l6.8 5.1 6.8-5.1v9.9h3.6c.9 0 1.6-.7 1.6-1.6V13.5c0-1.7-1.9-2.6-3.2-1.6L20 17.6l-6.8-5.1-1.2-.6c-1.4-.6-4 0-4 1.6z" fill="#ea4335" /><path d="M8 13.5v13.2c0 .9.7 1.6 1.6 1.6h3.6V18.4L8 14.5z" fill="#4285f4" /><path d="M26.8 18.4v9.9h3.6c.9 0 1.6-.7 1.6-1.6V14.5z" fill="#34a853" /><path d="M26.8 13.5v4.9L32 14.5v-1c0-1.7-1.9-2.6-3.2-1.6z" fill="#fbbc04" /></svg>
  );
  if (name === "Slack") return (
    <svg {...box}><rect width="40" height="40" rx="9" fill="#fff" stroke="#e5e5e5" /><rect x="17.5" y="8" width="5" height="12" rx="2.5" fill="#36c5f0" /><rect x="20" y="17.5" width="12" height="5" rx="2.5" fill="#2eb67d" /><rect x="17.5" y="20" width="5" height="12" rx="2.5" fill="#ecb22e" /><rect x="8" y="17.5" width="12" height="5" rx="2.5" fill="#e01e5a" /></svg>
  );
  if (name === "Notes") return (
    <svg {...box}><rect width="40" height="40" rx="9" fill="#fff" stroke="#e5e5e5" /><rect width="40" height="11" rx="9" fill="#f7c948" /><rect y="6" width="40" height="5" fill="#f7c948" /><path d="M9 18h22M9 23.5h22M9 29h14" stroke="#c9c9c9" strokeWidth="1.6" /></svg>
  );
  if (name === "Mail") return (
    <svg {...box}><defs><linearGradient id="lgMail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3fb5ff" /><stop offset="1" stopColor="#1677f2" /></linearGradient></defs><rect width="40" height="40" rx="9" fill="url(#lgMail)" /><rect x="9" y="12.5" width="22" height="15" rx="2" fill="#fff" /><path d="M9.6 13.4 20 21l10.4-7.6" stroke="#1677f2" strokeWidth="1.6" fill="none" /></svg>
  );
  if (name === "Finder") return (
    <svg {...box}><rect width="40" height="40" rx="9" fill="#8fd0ff" /><path d="M0 9a9 9 0 0 1 9-9h12c-2 6-3 12-2.6 20.5H17c-.3 6.6.6 13 1.6 19.5H9a9 9 0 0 1-9-9z" fill="#1a8cff" /><path d="M13 13v4M27 13v4" stroke="#0b2c4d" strokeWidth="2" strokeLinecap="round" /><path d="M11 25c5.5 4 12.5 4 18 0" stroke="#0b2c4d" strokeWidth="1.8" strokeLinecap="round" fill="none" /></svg>
  );
  return (
    <svg {...box}><rect width="40" height="40" rx="9" fill="#fff" stroke="#e3e0d8" /><text x="20" y="13.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#ff3b30" fontFamily="-apple-system, sans-serif">OCT</text><text x="20" y="31" textAnchor="middle" fontSize="17" fontWeight="300" fill="#111" fontFamily="-apple-system, sans-serif">2</text></svg>
  );
}
