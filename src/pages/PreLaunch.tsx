import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'sleeping' | 'yellow' | 'green' | 'awake' | 'chatting' | 'email_capture' | 'waitlisted';
type MsgType = 'text' | 'use-cases';
type Msg = { role: 'user' | 'assistant'; content: string; rich?: MsgType };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callBrainoChat(messages: Omit<Msg, 'rich'>[], messageCount: number) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/braino-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ messages, messageCount }),
  });
  if (!res.ok) throw new Error(`Chat API ${res.status}`);
  return res.json() as Promise<{ reply: string; suggestEmail: boolean }>;
}

async function callWaitlistSignup(email: string, context?: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ email, context }),
  });
  return res.json() as Promise<{ success?: boolean; error?: string; position?: number }>;
}

// ─── Feature graphics (mirrored from UseCases.tsx) ────────────────────────────

function ChatGraphic() {
  return (
    <svg viewBox="0 0 380 260" width="100%" style={{ maxWidth: 380, display: 'block', borderRadius: 12 }}>
      <rect width="380" height="260" rx="16" fill="var(--sb-panel-2)" stroke="var(--sb-line)" strokeWidth="1"/>
      <rect width="380" height="38" rx="16" fill="var(--sb-panel)"/>
      <rect y="26" width="380" height="12" fill="var(--sb-panel)"/>
      <circle cx="16" cy="19" r="5" fill="#FF5F57" opacity=".8"/>
      <circle cx="29" cy="19" r="5" fill="#FEBC2E" opacity=".8"/>
      <circle cx="42" cy="19" r="5" fill="#28C840" opacity=".8"/>
      <rect x="58" y="11" width="210" height="16" rx="8" fill="var(--sb-bg-2)"/>
      <rect x="12" y="50" width="212" height="11" rx="3" fill="var(--sb-ink)" opacity=".14"/>
      {[68,82,95,108,122,135,148].map((y,i) => (
        <rect key={y} x="12" y={y} width={[165,182,152,170,162,175,140][i]} height="7" rx="3" fill="var(--sb-line)"/>
      ))}
      <rect x="244" y="46" width="1" height="208" fill="var(--sb-line)"/>
      <rect x="245" y="46" width="131" height="209" fill="var(--sb-accent-soft)"/>
      <rect x="253" y="57" width="56" height="8" rx="3" fill="var(--sb-accent)" opacity=".75"/>
      <rect x="290" y="76" width="74" height="24" rx="12" fill="var(--sb-accent)"/>
      <rect x="297" y="83" width="60" height="5" rx="2" fill="rgba(255,255,255,.75)"/>
      <rect x="297" y="91" width="44" height="4" rx="2" fill="rgba(255,255,255,.5)"/>
      <rect x="253" y="109" width="88" height="34" rx="12" fill="var(--sb-panel)"/>
      <rect x="260" y="118" width="74" height="5" rx="2" fill="var(--sb-line)"/>
      <rect x="260" y="126" width="66" height="5" rx="2" fill="var(--sb-line-2)"/>
      <rect x="260" y="134" width="70" height="5" rx="2" fill="var(--sb-line-2)"/>
      <rect x="296" y="153" width="68" height="20" rx="10" fill="var(--sb-accent)" opacity=".8"/>
      <rect x="303" y="160" width="54" height="5" rx="2" fill="rgba(255,255,255,.65)"/>
      <rect x="253" y="182" width="92" height="38" rx="12" fill="var(--sb-panel)"/>
      <rect x="260" y="191" width="78" height="5" rx="2" fill="var(--sb-line)"/>
      <rect x="260" y="199" width="70" height="5" rx="2" fill="var(--sb-line-2)"/>
      <rect x="260" y="207" width="74" height="5" rx="2" fill="var(--sb-line-2)"/>
      <rect x="249" y="230" width="120" height="20" rx="10" fill="var(--sb-panel)" stroke="var(--sb-accent)" strokeWidth="1.2"/>
      <rect x="257" y="237" width="72" height="5" rx="2" fill="var(--sb-line-2)"/>
    </svg>
  );
}

function RecordGraphic() {
  const bars = [10,20,30,22,36,16,26,40,20,32,14,34,22,28,18,12];
  return (
    <svg viewBox="0 0 380 260" width="100%" style={{ maxWidth: 380, display: 'block', borderRadius: 12 }}>
      <rect width="380" height="260" rx="16" fill="var(--sb-panel-2)" stroke="var(--sb-line)" strokeWidth="1"/>
      <rect width="380" height="38" rx="16" fill="var(--sb-panel)"/>
      <rect y="26" width="380" height="12" fill="var(--sb-panel)"/>
      <circle cx="16" cy="19" r="5" fill="#FF5F57" opacity=".8"/>
      <circle cx="29" cy="19" r="5" fill="#FEBC2E" opacity=".8"/>
      <circle cx="42" cy="19" r="5" fill="#28C840" opacity=".8"/>
      <rect x="58" y="11" width="210" height="16" rx="8" fill="var(--sb-bg-2)"/>
      <rect x="12" y="48" width="356" height="50" rx="10" fill="var(--sb-accent-soft)"/>
      <circle cx="34" cy="73" r="10" fill="var(--sb-accent)"/>
      <circle cx="34" cy="73" r="5" fill="white"/>
      {bars.map((h,i) => (
        <rect key={i} x={56+i*18} y={73-h/2} width={11} height={h} rx="5"
          fill={i<9 ? "var(--sb-accent)" : "var(--sb-line)"} opacity={i<9 ? 1 : 0.45}/>
      ))}
      <rect x="12" y="108" width="356" height="140" rx="10" fill="var(--sb-panel)" stroke="var(--sb-line-2)" strokeWidth="1"/>
      <rect x="22" y="120" width="104" height="9" rx="3" fill="var(--sb-ink)" opacity=".82"/>
      <rect x="22" y="135" width="310" height="6" rx="2" fill="var(--sb-line-2)"/>
      <rect x="22" y="145" width="290" height="6" rx="2" fill="var(--sb-line-2)"/>
      <rect x="22" y="155" width="300" height="6" rx="2" fill="var(--sb-line-2)"/>
      <rect x="22" y="170" width="60" height="8" rx="3" fill="var(--sb-accent)" opacity=".55"/>
      {[0,1,2,3].map(i => (
        <rect key={i} x={22+i*80} y="183" width={72} height="22" rx="7"
          fill="var(--sb-accent-soft)" stroke="var(--sb-line)" strokeWidth="1"/>
      ))}
      <rect x="22" y="215" width="50" height="7" rx="3" fill="var(--sb-ink)" opacity=".6"/>
      <rect x="22" y="228" width="318" height="5" rx="2" fill="var(--sb-line-2)"/>
      <rect x="22" y="237" width="280" height="5" rx="2" fill="var(--sb-line-2)"/>
    </svg>
  );
}

function MeetingsGraphic() {
  const tiles = [
    { x:12,  y:48,  w:174, h:108, avatarX:99,  avatarY:102, color:"#3A2F2A", ac:"var(--sb-accent)" },
    { x:194, y:48,  w:174, h:108, avatarX:281, avatarY:102, color:"#232B35", ac:"#6C8EBF" },
    { x:12,  y:162, w:174, h:86,  avatarX:99,  avatarY:205, color:"#1F2C25", ac:"#4CAF7D" },
    { x:194, y:162, w:174, h:86,  avatarX:281, avatarY:205, color:"#2C1F25", ac:"#CF6679" },
  ];
  return (
    <svg viewBox="0 0 380 260" width="100%" style={{ maxWidth: 380, display: 'block', borderRadius: 12 }}>
      <rect width="380" height="260" rx="16" fill="#1A1614" stroke="var(--sb-line)" strokeWidth="1"/>
      <rect width="380" height="38" rx="16" fill="#111"/>
      <rect y="26" width="380" height="12" fill="#111"/>
      <circle cx="16" cy="19" r="5" fill="#FF5F57" opacity=".8"/>
      <circle cx="29" cy="19" r="5" fill="#FEBC2E" opacity=".8"/>
      <circle cx="42" cy="19" r="5" fill="#28C840" opacity=".8"/>
      <rect x="58" y="11" width="180" height="16" rx="8" fill="#2A2522"/>
      {tiles.map((t,i) => (
        <g key={i}>
          <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="8" fill={t.color}/>
          <circle cx={t.avatarX} cy={t.avatarY} r={i===0?22:18} fill={t.ac} opacity=".65"/>
          {i===0 && <rect x={t.x+6} y={t.y+t.h-20} width={t.w-12} height="16" rx="4" fill="rgba(226,125,57,0.55)"/>}
        </g>
      ))}
      <circle cx="356" cy="56" r="6" fill="var(--sb-accent)"/>
      <circle cx="356" cy="56" r="3" fill="white" opacity=".8"/>
      <rect x="22" y="213" width="336" height="40" rx="10" fill="rgba(30,22,16,0.85)" stroke="rgba(226,125,57,0.4)" strokeWidth="1"/>
      <circle cx="38" cy="233" r="6" fill="var(--sb-accent)"/>
      <circle cx="38" cy="233" r="3" fill="white" opacity=".6"/>
      <rect x="52" y="226" width="90" height="7" rx="3" fill="rgba(251,247,241,0.85)"/>
      <rect x="52" y="237" width="180" height="5" rx="2" fill="rgba(251,247,241,0.35)"/>
      <rect x="288" y="224" width="60" height="18" rx="6" fill="rgba(226,125,57,0.35)" stroke="rgba(226,125,57,0.5)" strokeWidth="1"/>
      <rect x="296" y="230" width="44" height="5" rx="2" fill="rgba(226,125,57,0.8)"/>
    </svg>
  );
}

function DelegateGraphic() {
  const steps = [
    { done:true,  w1:96,  w2:72, active:false },
    { done:true,  w1:120, w2:84, active:false },
    { done:false, w1:106, w2:0,  active:true  },
    { done:false, w1:84,  w2:0,  active:false },
  ];
  return (
    <svg viewBox="0 0 380 260" width="100%" style={{ maxWidth: 380, display: 'block', borderRadius: 12 }}>
      <rect width="380" height="260" rx="16" fill="var(--sb-panel-2)" stroke="var(--sb-line)" strokeWidth="1"/>
      <rect width="380" height="38" rx="16" fill="var(--sb-panel)"/>
      <rect y="26" width="380" height="12" fill="var(--sb-panel)"/>
      <circle cx="16" cy="19" r="5" fill="#FF5F57" opacity=".8"/>
      <circle cx="29" cy="19" r="5" fill="#FEBC2E" opacity=".8"/>
      <circle cx="42" cy="19" r="5" fill="#28C840" opacity=".8"/>
      <rect x="58" y="11" width="210" height="16" rx="8" fill="var(--sb-bg-2)"/>
      <rect x="12" y="48" width="356" height="44" rx="10" fill="var(--sb-panel)" stroke="var(--sb-line-2)" strokeWidth="1"/>
      <rect x="22" y="60" width="220" height="7" rx="3" fill="var(--sb-accent)" opacity=".65"/>
      <rect x="22" y="72" width="170" height="5" rx="2" fill="var(--sb-line-2)"/>
      {steps.map((s,i) => (
        <g key={i}>
          {i>0 && <rect x="33" y={100+(i-1)*42+16} width="2" height="26" rx="1"
            fill={i<=2?"var(--sb-accent)":"var(--sb-line)"} opacity={i<=2?0.55:0.3}/>}
          <circle cx="34" cy={100+i*42} r="12"
            fill={s.done?"var(--sb-accent)":s.active?"var(--sb-accent-soft)":"var(--sb-bg-2)"}
            stroke={s.active?"var(--sb-accent)":"none"} strokeWidth="2"/>
          {s.done && <path d={`M${28} ${100+i*42} l5 5 9-9`} stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
          {s.active && <circle cx="34" cy={100+i*42} r="5" fill="var(--sb-accent)"/>}
          <rect x="54" y={95+i*42} width={s.w1} height="8" rx="3"
            fill={s.done?"var(--sb-ink)":s.active?"var(--sb-accent)":"var(--sb-line)"}
            opacity={s.done?0.8:s.active?1:0.42}/>
          {s.w2>0 && <rect x="54" y={107+i*42} width={s.w2} height="5" rx="2" fill="var(--sb-line-2)"/>}
        </g>
      ))}
    </svg>
  );
}

// ─── Use cases data (first-person, matches use-cases page) ───────────────────
const USE_CASES = [
  {
    num: '01',
    name: 'Chat with Page',
    tagline: 'Ask anything about what\'s on screen',
    chips: ['Summarise', 'Explain docs', 'LeetCode', 'Code review', 'Research synthesis', 'Extract data'],
    heading: 'Read anything.\nUnderstand everything.',
    description: 'Open me on any URL — article, PDF, GitHub diff, research paper, product page — and talk to it. Ask questions, get summaries, extract data, or get a second opinion. No copying, no switching tabs.',
    useCases: [
      { label: 'I summarise long articles & research papers instantly', who: 'Researchers · analysts' },
      { label: 'I explain complex documentation step by step', who: 'Developers · students' },
      { label: 'I give LeetCode hints without leaving the problem', who: 'Engineers · students' },
      { label: 'I explain code review changes on GitHub diffs', who: 'Developers' },
      { label: 'I synthesise insights across multiple open tabs', who: 'Academics · writers' },
      { label: 'I extract key data points from reports & PDFs', who: 'Finance · ops teams' },
    ],
    Graphic: ChatGraphic,
  },
  {
    num: '02',
    name: 'Record & Capture',
    tagline: 'Turn any audio into structured notes',
    chips: ['Lectures', 'Podcasts', 'Language learning', 'Training videos', 'Content repurposing'],
    heading: 'Listen once.\nRemember forever.',
    description: 'I record audio from any browser tab — lectures, podcasts, training videos — and give you clean, structured notes back. Headings, key terms, summaries. Ready to sync to Notion.',
    useCases: [
      { label: 'I build course notes with headings & glossary', who: 'Students · self-learners' },
      { label: 'I summarise podcast key takeaways', who: 'Professionals · curious minds' },
      { label: 'I transcribe language learning content + vocab notes', who: 'Language learners' },
      { label: 'I transcribe press conferences & academic lectures', who: 'Journalists · researchers' },
      { label: 'I generate show notes & blog drafts from your content', who: 'Podcasters · YouTubers' },
      { label: 'I convert training videos into SOPs & onboarding docs', who: 'L&D teams · HR' },
    ],
    Graphic: RecordGraphic,
  },
  {
    num: '03',
    name: 'Meetings',
    tagline: 'Auto-notes for every call you join',
    chips: ['Zoom', 'Google Meet', 'Teams', 'Action items', 'Follow-up emails', 'Decision log'],
    heading: 'Every meeting.\nPerfectly captured.',
    description: 'Join any video call and I quietly record, transcribe, and structure everything. Action items, decisions, and follow-up emails are drafted the moment the call ends — without you lifting a finger.',
    useCases: [
      { label: 'I auto-transcribe Zoom, Meet & Teams calls in real time', who: 'Everyone' },
      { label: 'I extract action items and decisions automatically', who: 'Managers · teams' },
      { label: 'I draft follow-up emails right after the call', who: 'Sales · account managers' },
      { label: 'I build a searchable meeting history across all calls', who: 'Teams · project managers' },
      { label: 'I generate meeting prep summaries from past notes', who: 'Professionals' },
      { label: 'I share clean structured notes with your team', who: 'Remote teams' },
    ],
    Graphic: MeetingsGraphic,
  },
  {
    num: '04',
    name: 'Delegate Tasks',
    tagline: 'Describe it. I do it.',
    chips: ['Email drafts', 'Form filling', 'Job applications', 'Product research', 'Calendar events'],
    heading: 'Say what you want.\nWatch it happen.',
    description: 'I can operate your browser for you. Email drafts, form filling, job applications, product research, calendar events — describe the task in plain English and I handle all the clicking.',
    useCases: [
      { label: 'I draft & send Gmail replies in a single sentence', who: 'Everyone' },
      { label: 'I auto-fill repetitive job application forms', who: 'Job seekers' },
      { label: 'I research & compare products across multiple pages', who: 'Shoppers · buyers' },
      { label: 'I create calendar events from natural language', who: 'Professionals' },
      { label: 'I fill any web form with your saved details', who: 'Everyone' },
      { label: 'I search, open, and shortlist job listings in bulk', who: 'Job seekers · recruiters' },
    ],
    Graphic: DelegateGraphic,
  },
];

// ─── Rich use-cases response — mirrors use-cases page layout, dark version ────
function UseCasesResponse({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(0);
  const doneFired = useRef(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    USE_CASES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisible(i + 1), i * 2800 + 600));
    });
    timers.push(setTimeout(() => {
      if (!doneFired.current) { doneFired.current = true; onDone(); }
    }, USE_CASES.length * 2800 + 1200));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: '#FBF7F1' }}>
        Four features — each unlocking a different set of workflows:
      </p>

      {USE_CASES.slice(0, visible).map((uc) => (
        <div key={uc.num} style={{
          border: '1.5px solid rgba(255,255,255,0.1)',
          borderRadius: 22,
          overflow: 'hidden',
          animation: 'plFadeUp 0.5s ease both',
        }}>
          {/* Header */}
          <div style={{ padding: '28px 32px 24px' }}>
            {/* Number badge */}
            <div style={{ marginBottom: 10 }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, letterSpacing: '0.1em',
                color: 'var(--sb-accent)',
                background: 'rgba(226,125,57,0.12)',
                padding: '3px 8px', borderRadius: 4,
              }}>{uc.num}</span>
            </div>

            {/* Name */}
            <div style={{
              fontFamily: "'Instrument Serif', 'TNR', Georgia, serif",
              fontSize: 'clamp(22px, 2.6vw, 34px)',
              lineHeight: 1.08, color: '#FBF7F1', marginBottom: 6,
            }}>{uc.name}</div>

            {/* Tagline */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: 'rgba(251,247,241,0.4)',
              letterSpacing: '0.04em', marginBottom: 18,
            }}>{uc.tagline}</div>

            {/* Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {uc.chips.map(chip => (
                <span key={chip} style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, letterSpacing: '0.02em',
                  padding: '5px 12px', borderRadius: 999,
                  background: 'rgba(226,125,57,0.08)',
                  color: 'rgba(196,96,42,0.9)',
                  border: '1px solid rgba(226,125,57,0.25)',
                }}>{chip}</span>
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{ borderTop: '1.5px solid rgba(255,255,255,0.07)', margin: '0 32px' }} />
          <div style={{ padding: '36px 32px 44px' }}>

            {/* Big heading + graphic */}
            <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 40 }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <h2 style={{
                  fontFamily: "'Instrument Serif', 'TNR', Georgia, serif",
                  fontWeight: 400,
                  fontSize: 'clamp(36px, 4.5vw, 58px)',
                  lineHeight: 1.02, color: '#FBF7F1',
                  margin: '0 0 20px', whiteSpace: 'pre-line', letterSpacing: '-0.02em',
                }}>{uc.heading}</h2>
                <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'rgba(251,247,241,0.65)', margin: 0 }}>
                  {uc.description}
                </p>
              </div>
              <div style={{ flexShrink: 0, width: 'min(340px, 100%)' }}>
                <uc.Graphic />
              </div>
            </div>

            {/* "What I can use it for" label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                color: 'rgba(251,247,241,0.35)',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--sb-accent)', display: 'inline-block' }} />
                What I can do for you
              </span>
            </div>

            {/* Use case table */}
            <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
              {uc.useCases.map((row, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '20px 1fr auto',
                  alignItems: 'center', gap: 14, padding: '14px 20px',
                  borderBottom: i < uc.useCases.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}>
                  <span style={{ color: 'var(--sb-accent)', fontSize: 14, fontWeight: 700, lineHeight: 1 }}>→</span>
                  <span style={{ fontSize: 14, color: 'rgba(251,247,241,0.8)', lineHeight: 1.45 }}>{row.label}</span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, color: 'rgba(251,247,241,0.3)',
                    letterSpacing: '0.03em', whiteSpace: 'nowrap',
                  }}>{row.who}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Brain SVG ────────────────────────────────────────────────────────────────
function BrainPaths({ eyesOpen }: { eyesOpen: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id="bp-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6A8A2"/><stop offset="0.55" stopColor="#E8786E"/><stop offset="1" stopColor="#C9544A"/>
        </linearGradient>
        <linearGradient id="bp-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9645A"/><stop offset="1" stopColor="#9C3E36"/>
        </linearGradient>
        <radialGradient id="bp-glow" cx="35%" cy="30%" r="50%">
          <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7"/><stop offset="1" stopColor="#FFD0CB" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white"/>
      <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white"/>
      <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round"/>
      <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round"/>
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="white" transform="scale(1.08) translate(-3.7,-3.7)"/>
      <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#bp-dark)"/>
      <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#bp-dark)"/>
      <path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7"/>
      <path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7"/>
      <path d="M 64 77 Q 70 79 76 77" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.5"/>
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#bp-fill)"/>
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#bp-glow)"/>
      <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55"/>
      <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6"/>
      <path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
      <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6"/>
      <path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
      <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#bp-fill)" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="6" cy="63" r="5.5" fill="url(#bp-fill)"/>
      <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#bp-fill)" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="94" cy="63" r="5.5" fill="url(#bp-fill)"/>
      <circle cx="38" cy="48" r="6.5" fill="white"/>
      <circle cx="62" cy="48" r="6.5" fill="white"/>
      {!eyesOpen ? (
        <>
          <path d="M 31.5 48 Q 38 54 44.5 48" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M 55.5 48 Q 62 54 68.5 48" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <circle cx="38" cy="48" r="3.2" fill="#1B1713" className="bp-pupil"/>
          <circle cx="39" cy="46.6" r="1.1" fill="white"/>
          <circle cx="62" cy="48" r="3.2" fill="#1B1713" className="bp-pupil bp-pupil-r"/>
          <circle cx="63" cy="46.6" r="1.1" fill="white"/>
        </>
      )}
      <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>
      <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>
      {!eyesOpen
        ? <path d="M 46 63 Q 50 61 54 63" fill="none" stroke="#1B1713" strokeWidth="1.5" strokeLinecap="round"/>
        : <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round"/>
      }
    </>
  );
}

function BrainoHero({ phase }: { phase: Phase }) {
  const eyesOpen = phase === 'green' || phase === 'awake' || phase === 'chatting' || phase === 'email_capture' || phase === 'waitlisted';
  const pulsing = phase === 'yellow' || phase === 'green';
  const floating = eyesOpen;
  const glowFilter = phase === 'yellow'
    ? 'drop-shadow(0 0 28px rgba(255,210,50,1)) drop-shadow(0 0 56px rgba(255,175,0,0.65))'
    : phase === 'green'
    ? 'drop-shadow(0 0 28px rgba(80,230,110,1)) drop-shadow(0 0 56px rgba(40,180,70,0.65))'
    : 'drop-shadow(0 4px 18px rgba(200,84,74,0.6)) drop-shadow(0 0 32px rgba(200,84,74,0.3))';
  return (
    <div style={{ filter: glowFilter, animation: pulsing ? 'plGlowPulse 0.85s ease-in-out infinite' : floating ? 'plFloat 3s ease-in-out infinite' : 'none', transition: 'filter 0.6s ease', width: '100%', height: '100%' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}>
        <BrainPaths eyesOpen={eyesOpen}/>
      </svg>
    </div>
  );
}

function BrainoIcon({ glowing }: { glowing: boolean }) {
  return (
    <div style={{ width: 30, height: 30, flexShrink: 0, marginTop: 3, filter: glowing ? 'drop-shadow(0 0 8px rgba(226,125,57,1)) drop-shadow(0 0 18px rgba(226,125,57,0.6))' : 'drop-shadow(0 2px 6px rgba(200,84,74,0.45))', animation: glowing ? 'plGlowPulse 0.85s ease-in-out infinite' : 'plFloat 3s ease-in-out infinite', transition: 'filter 0.4s ease' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}>
        <BrainPaths eyesOpen={true}/>
      </svg>
    </div>
  );
}


// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PreLaunch() {
  const [phase, setPhase] = useState<Phase>('sleeping');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailDone, setEmailDone] = useState(false);
  const [emailConfirm, setEmailConfirm] = useState('');
  const [userMsgCount, setUserMsgCount] = useState(0);
  const [lastContext, setLastContext] = useState('');
  const [showChip, setShowChip] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const line1 = "Hey. You found me. I'm Braino — a browser AI, still being built.";
  const line2 = "Let me show you what I will eventually be able to help you out with.";
  const [showLine2, setShowLine2] = useState(false);
  const openingLine = `${line1} ${line2}`;

  useEffect(() => {
    document.body.classList.add('sb-prelaunch');
    return () => document.body.classList.remove('sb-prelaunch');
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('yellow'), 900);
    const t2 = setTimeout(() => setPhase('green'),  2500);
    const t3 = setTimeout(() => setPhase('awake'),  3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Line 1 fades in on awake (0.9s), visible ~1s, then line 2, then chip
  useEffect(() => {
    if (phase !== 'awake') return;
    const t1 = setTimeout(() => setShowLine2(true), 2400);
    const t2 = setTimeout(() => setShowChip(true), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  // Only auto-scroll for regular text messages — not during progressive use-cases loading
  useEffect(() => {
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg?.rich === 'use-cases') return;
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, loading]);

  useEffect(() => {
    if (phase === 'chatting') setTimeout(() => inputRef.current?.focus(), 100);
    if (phase === 'email_capture') setTimeout(() => emailRef.current?.focus(), 100);
  }, [phase]);

  const handleUseCasesDone = useCallback(() => {
    setTimeout(() => {
      setMsgs(prev => [...prev, { role: 'assistant', content: "That's everything I can do — and I'm still growing. Want to be the first to know when I launch?" }]);
      setPhase('email_capture');
    }, 700);
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setUserMsgCount(c => c + 1);
    setLastContext(content);
    setInput('');
    setShowChip(false);
    setMsgs(prev => [...prev, { role: 'user', content }]);
    setPhase('chatting');

    if (content === 'Show me') {
      setMsgs(prev => [...prev, { role: 'assistant', content: '', rich: 'use-cases' }]);
      return;
    }

    setLoading(true);
    try {
      const history = msgs.length === 0
        ? [{ role: 'assistant' as const, content: openingLine }, { role: 'user' as const, content }]
        : [...msgs.map(m => ({ role: m.role, content: m.content })), { role: 'user' as const, content }];
      const { reply, suggestEmail } = await callBrainoChat(history, userMsgCount + 1);
      setMsgs(prev => [...prev, { role: 'assistant', content: reply }]);
      if (suggestEmail) setTimeout(() => setPhase('email_capture'), 800);
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: "My neurons glitched. Try again?" }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, msgs, userMsgCount, openingLine]);

  const submitEmail = useCallback(async () => {
    const email = emailInput.trim();
    if (!email || emailLoading) return;
    if (!email.includes('@')) { setEmailError("That doesn't look like an email."); return; }
    setEmailError('');
    setEmailLoading(true);
    try {
      const result = await callWaitlistSignup(email, lastContext);
      const confirm = result.error === 'already_on_waitlist'
        ? "You're already on the list. I'll remember you."
        : `Done. You're #${result.position} on the waitlist. I'll see you soon.`;
      setEmailConfirm(confirm);
      setEmailDone(true);
      setPhase('waitlisted');
    } catch {
      setEmailError('Something went wrong. Try again.');
    } finally {
      setEmailLoading(false);
    }
  }, [emailInput, emailLoading, lastContext]);

  const chatActive = phase === 'chatting' || phase === 'email_capture' || phase === 'waitlisted';

  return (
    <>
      <style>{`
        body.sb-prelaunch #sb-brain-mascot-wrapper { display: none !important; }
        @keyframes plGlowPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes plFloat     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes plMsgIn     { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes plFadeUp    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes plDot       { 0%,100%{opacity:0.25;transform:translateY(0)} 50%{opacity:1;transform:translateY(-3px)} }
        @keyframes plShake     { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        .bp-pupil   { animation: plBlink 4s ease-in-out infinite; transform-origin: 38px 48px; }
        .bp-pupil-r { transform-origin: 62px 48px; animation-delay: 0.1s; }
        @keyframes plBlink { 0%,88%,100%{transform:scaleY(1)} 93%{transform:scaleY(0.07)} }
        .pl-dot { animation: plDot 1.1s ease-in-out infinite; }
        .pl-dot:nth-child(2) { animation-delay: 0.18s; }
        .pl-dot:nth-child(3) { animation-delay: 0.36s; }
        .pl-chip:hover { color: rgba(251,247,241,0.9) !important; }
        .pl-show-btn:hover {
          filter: drop-shadow(0 0 14px rgba(226,125,57,0.75));
          border-color: rgba(226,125,57,0.75) !important;
          color: #FBF7F1 !important;
          background: rgba(226,125,57,0.13) !important;
        }
        .pl-show-btn:active {
          filter: drop-shadow(0 0 20px rgba(226,125,57,1));
          transform: scale(0.97);
        }
        .pl-iamin-btn:hover {
          background: rgba(226,125,57,0.28) !important;
          border-color: rgba(226,125,57,0.8) !important;
          filter: drop-shadow(0 0 10px rgba(226,125,57,0.5));
        }
        .pl-scroll::-webkit-scrollbar { display: none; }
        .pl-scroll { scrollbar-width: none; }
      `}</style>

      <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'NeueHaas', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#FBF7F1', overflow: 'hidden' }}>

        {/* Pre-chat */}
        {!chatActive && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', width: '100%', maxWidth: 520, padding: '0 24px 60px' }}>
            <div style={{ width: 172, height: 172 }}>
              <BrainoHero phase={phase}/>
            </div>
            {phase === 'awake' && (
              <div style={{ marginTop: 32, textAlign: 'center', maxWidth: 420 }}>
                {!showLine2 ? (
                  <p style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.4, color: '#FBF7F1', letterSpacing: '-0.01em', margin: 0, animation: 'plFadeUp 0.9s ease both' }}>
                    {line1}
                  </p>
                ) : (
                  <p style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.4, color: '#FBF7F1', letterSpacing: '-0.01em', margin: 0, animation: 'plFadeUp 0.9s ease both' }}>
                    {line2}
                  </p>
                )}
              </div>
            )}
            {showChip && (
              <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', animation: 'plFadeUp 0.35s ease' }}>
                <button
                  className="pl-show-btn"
                  onClick={() => sendMessage('Show me')}
                  style={{
                    padding: '14px 36px', borderRadius: 40,
                    border: '1px solid rgba(226,125,57,0.35)',
                    background: 'rgba(226,125,57,0.07)',
                    color: 'rgba(251,247,241,0.75)', fontSize: 15, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em',
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <span>⚡</span> Show me
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chat */}
        {chatActive && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 900, flex: 1, padding: '0 32px', paddingBottom: phase === 'chatting' ? 100 : 60 }}>
            <div ref={scrollRef} className="pl-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 32, paddingTop: 52 }}>

              {msgs.map((m, i) => m.role === 'assistant' ? (
                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', animation: 'plMsgIn 0.3s ease' }}>
                  <BrainoIcon glowing={loading && i === msgs.length - 1}/>
                  <div style={{ flex: 1, paddingTop: 2 }}>
                    {m.rich === 'use-cases'
                      ? <UseCasesResponse onDone={handleUseCasesDone}/>
                      : <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: '#FBF7F1' }}>{m.content}</p>
                    }
                  </div>
                </div>
              ) : (
                <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', animation: 'plMsgIn 0.2s ease' }}>
                  <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'rgba(251,247,241,0.45)', maxWidth: '75%', textAlign: 'right' }}>{m.content}</p>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', animation: 'plMsgIn 0.2s ease' }}>
                  <BrainoIcon glowing={true}/>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', paddingTop: 10 }}>
                    {[0,1,2].map(i => <span key={i} className="pl-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(251,247,241,0.4)', display: 'inline-block' }}/>)}
                  </div>
                </div>
              )}

              {(phase === 'email_capture' || phase === 'waitlisted') && !loading && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', animation: 'plMsgIn 0.3s ease' }}>
                  <BrainoIcon glowing={false}/>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    {emailDone ? (
                      // Confirmation — replaces the form in-place
                      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: '#FBF7F1', animation: 'plFadeUp 0.4s ease' }}>
                        {emailConfirm}
                      </p>
                    ) : (
                      // Email form
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 10, maxWidth: 440, animation: 'plFadeUp 0.3s ease', alignItems: 'center' }}>
                          <input ref={emailRef} type="email" value={emailInput}
                            onChange={e => { setEmailInput(e.target.value); setEmailError(''); }}
                            onKeyDown={e => { if (e.key === 'Enter') submitEmail(); }}
                            placeholder="your@email.com"
                            style={{ flex: 1, padding: '12px 18px', borderRadius: 40, border: emailError ? '1px solid rgba(226,80,80,0.7)' : '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#FBF7F1', fontSize: 15, outline: 'none', fontFamily: 'inherit', animation: emailError ? 'plShake 0.3s ease' : 'none' }}
                          />
                          <button
                            onClick={submitEmail}
                            disabled={emailLoading}
                            className="pl-iamin-btn"
                            style={{
                              padding: '12px 24px', borderRadius: 40,
                              border: '1px solid rgba(226,125,57,0.5)',
                              background: 'rgba(226,125,57,0.15)',
                              color: '#FBF7F1', fontSize: 15, fontWeight: 600,
                              cursor: emailLoading ? 'not-allowed' : 'pointer',
                              opacity: emailLoading ? 0.5 : 1,
                              fontFamily: 'inherit', whiteSpace: 'nowrap',
                              transition: 'all 0.2s ease', flexShrink: 0,
                              display: 'flex', alignItems: 'center', gap: 7,
                            }}
                          >
                            {emailLoading ? '…' : <>I'm in <span style={{ fontSize: 14 }}>→</span></>}
                          </button>
                        </div>
                        {emailError && <p style={{ fontSize: 13, color: 'rgba(226,80,80,0.9)', margin: 0, paddingLeft: 4 }}>{emailError}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'chatting' && msgs[msgs.length - 1]?.rich !== 'use-cases' && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px 28px', background: 'linear-gradient(to top, #000 65%, transparent)', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 900, alignItems: 'center' }}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask me anything…" disabled={loading}
                style={{ flex: 1, padding: '13px 20px', borderRadius: 40, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#FBF7F1', fontSize: 15, outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', background: input.trim() ? '#E27D39' : 'rgba(255,255,255,0.07)', color: '#FBF7F1', display: 'grid', placeItems: 'center', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', transition: 'background 0.15s', flexShrink: 0 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        <a href="/home" style={{ position: 'fixed', bottom: 10, right: 16, fontSize: 11, color: 'rgba(251,247,241,0.12)', zIndex: 5, textDecoration: 'none', fontFamily: 'inherit' }}>
          trybraino.com
        </a>
      </div>
    </>
  );
}
