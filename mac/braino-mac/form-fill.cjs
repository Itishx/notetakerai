// Fill this form for me, and log me in.
//
// Forms: one script reads every visible field on the page (its label, name,
// placeholder and autocomplete hint), matchField() decides what Braino knows
// for it, and one more script writes the answers in. No model, so it takes
// about a second. Anything he doesn't know is left empty and named.
//
// Logins: Braino never sees a password. main.cjs clicks the username box for
// real, so Chrome shows its own saved-login list, and picks it with the keys.
// Chrome fills both boxes itself.
//
// Pure: the page scripts and the matching. main.cjs runs them.

/* Never filled, whatever he knows. */
const NEVER = /pass(?:word|code)|\bpin\b|card|cvv|cvc|expir|iban|account\s*(?:no|number)|routing|\bssn\b|social security|aadhaa?r|\bpan\b|otp|one[-\s]?time|verification code|security (?:code|question)|captcha/i;

/* In order: the first rule that matches a field wins. `ac` are autocomplete
   values, `re` is tested against the field's label, name, id and placeholder. */
const RULES = [
  { key: "firstName", ac: ["given-name"], re: /\bfirst[\s_-]*name\b|\bgiven[\s_-]*name\b|\bfname\b/i },
  { key: "lastName", ac: ["family-name"], re: /\blast[\s_-]*name\b|\bsurname\b|\bfamily[\s_-]*name\b|\blname\b/i },
  { key: "email", ac: ["email", "username"], type: "email", re: /e-?mail/i },
  { key: "phone", ac: ["tel", "tel-national", "mobile"], type: "tel", re: /phone|mobile|\bcontact\s*(?:no|number)\b|whats\s*app\s*(?:no|number)/i },
  { key: "linkedin", re: /linked\s*in/i },
  { key: "github", re: /git\s*hub/i },
  { key: "website", ac: ["url"], type: "url", re: /website|portfolio|personal (?:site|url)/i },
  { key: "org", ac: ["organization"], re: /college|university|school|institut|company|organi[sz]ation|employer|startup name/i },
  { key: "program", re: /\bprogram(?:me)?\b|\bcourse\b|\bdegree\b|\bmajor\b|\bbatch\b/i },
  { key: "role", ac: ["organization-title"], re: /\brole\b|designation|occupation|profession|job title|you are an?\b|current position|are you (?:currently )?an? (?:student|founder|professional)/i },
  { key: "city", ac: ["address-level2"], re: /\bcity\b|\btown\b|\blocation\b|where are you based|current location/i },
  { key: "country", ac: ["country", "country-name"], re: /\bcountry\b|nationality/i },
  { key: "fullName", ac: ["name"], re: /\b(?:full[\s_-]*)?name\b|\byour name\b/i, not: /company|school|college|user|team|file|startup|org|brand|project|event|parent|father|mother|emergency|referr/i },
];

function fieldText(f) {
  return [f.label, f.name, f.id, f.placeholder].filter(Boolean).join(" ");
}

/* What Braino would put in this field, or null. */
function matchField(field, profile) {
  if (!field || !profile) return null;
  const text = fieldText(field);
  if (field.type === "password" || NEVER.test(text) || NEVER.test(String(field.autocomplete || ""))) return null;
  /* A big box or a question is an answer in your words ("Why this role?"),
     never a one-word fact, even when it happens to say "role". */
  if (field.type === "textarea" || /^\s*(?:why|how|what (?:are|is|do|would)|describe|tell us|explain)\b|\(\d+\s*words?\)/i.test(String(field.label || ""))) return null;
  const ac = String(field.autocomplete || "").toLowerCase().split(/\s+/).pop();
  for (const rule of RULES) {
    const byAc = ac && rule.ac && rule.ac.includes(ac);
    const byType = rule.type && field.type === rule.type;
    const byText = rule.re.test(text) && !(rule.not && rule.not.test(text));
    if (!(byAc || byType || byText)) continue;
    const value = profile[rule.key];
    if (value == null || value === "") return null;
    return { key: rule.key, value: String(value) };
  }
  return null;
}

/* For a dropdown or a set of choices: the option that means the same thing. */
function pickOption(options, value) {
  const want = String(value || "").toLowerCase().trim();
  if (!want || !Array.isArray(options)) return null;
  const clean = (s) => String(s || "").toLowerCase().trim();
  return options.find((o) => clean(o) === want)
    || options.find((o) => clean(o).includes(want) || (clean(o).length > 2 && want.includes(clean(o))))
    || null;
}

/* Every visible field, with a label a person would read. */
const SCAN_JS = `(function(){
  function vis(e){ var r=e.getBoundingClientRect(); var s=getComputedStyle(e); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'; }
  function txt(e){ return (e&&e.innerText||e&&e.textContent||'').replace(/\\s+/g,' ').trim(); }
  function labelOf(e){
    var t='';
    if(e.labels&&e.labels.length) t=txt(e.labels[0]);
    if(!t&&e.getAttribute('aria-labelledby')) t=e.getAttribute('aria-labelledby').split(' ').map(function(id){return txt(document.getElementById(id));}).join(' ');
    if(!t) t=e.getAttribute('aria-label')||'';
    if(!t){ var ps=e.previousElementSibling; if(ps&&!/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(ps.tagName)) t=txt(ps); }
    if(!t){ var p=e.closest('[role="listitem"],.form-group,.field,fieldset,label,li,div'); for(var i=0;p&&i<3&&!t;i++){ var h=p.querySelector('legend,label,[role="heading"],h1,h2,h3,h4,.label'); if(h&&!h.contains(e)) t=txt(h); p=p.parentElement&&p.parentElement.closest('div,fieldset,li'); } }
    return String(t).slice(0,140);
  }
  var chromeH=window.outerHeight-window.innerHeight, out=[], seen={}, n=0;
  document.querySelectorAll('[data-braino-f]').forEach(function(e){e.removeAttribute('data-braino-f');});
  var els=document.querySelectorAll('input,textarea,select');
  for(var i=0;i<els.length&&n<80;i++){
    var e=els[i], type=(e.getAttribute('type')||e.tagName).toLowerCase();
    if(/^(hidden|submit|button|reset|image|file)$/.test(type)||e.disabled||e.readOnly||!vis(e)) continue;
    if(type==='radio'){ if(seen[e.name]) continue; seen[e.name]=1; }
    e.setAttribute('data-braino-f', String(n));
    var r=e.getBoundingClientRect();
    var f={i:n, tag:e.tagName.toLowerCase(), type:type==='textarea'||type==='select'?type:type, name:e.name||'', id:e.id||'', placeholder:e.placeholder||'', autocomplete:e.getAttribute('autocomplete')||'', label:labelOf(e), required:!!e.required||e.getAttribute('aria-required')==='true', value:type==='radio'||type==='checkbox'?(e.checked?'on':''):(e.value||''),
      x:Math.round(window.screenX+r.left+r.width/2), y:Math.round(window.screenY+chromeH+r.top+r.height/2)};
    if(e.tagName==='SELECT') f.options=[].map.call(e.options,function(o){return o.text.trim();}).filter(Boolean);
    if(type==='radio'){ var g=document.querySelectorAll('input[type="radio"][name="'+CSS.escape(e.name)+'"]'); f.options=[].map.call(g,function(x){return labelOf(x)||x.value;}); f.label=txt(e.closest('fieldset')&&e.closest('fieldset').querySelector('legend'))||f.label; f.value=[].some.call(g,function(x){return x.checked;})?'on':''; }
    out.push(f); n++;
  }
  return JSON.stringify({url:location.href, title:document.title, fields:out});
})()`;

/* Write answers in the way a person typing would, so React and Vue pages
   notice: the native setter, then input and change events. Never submits. */
function fillJs(assignments) {
  return `(function(){
  var a=${JSON.stringify(assignments)}, done=0;
  function setVal(e,v){ var proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; var d=Object.getOwnPropertyDescriptor(proto,'value'); d&&d.set?d.set.call(e,v):(e.value=v); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); e.dispatchEvent(new Event('blur',{bubbles:true})); }
  a.forEach(function(x){
    var e=document.querySelector('[data-braino-f="'+x.i+'"]'); if(!e) return;
    try{
      if(e.tagName==='SELECT'){ for(var k=0;k<e.options.length;k++){ if(e.options[k].text.trim()===x.value){ setVal(e,e.options[k].value); done++; return; } } return; }
      if(e.type==='radio'){ var g=document.querySelectorAll('input[type="radio"][name="'+CSS.escape(e.name)+'"]'); for(var j=0;j<g.length;j++){ var l=(g[j].labels&&g[j].labels[0]&&g[j].labels[0].innerText||g[j].getAttribute('aria-label')||g[j].value||'').trim(); if(l===x.value){ g[j].click(); done++; return; } } return; }
      e.focus(); setVal(e,x.value); done++;
    }catch(_){}
  });
  if(document.activeElement&&document.activeElement.blur) document.activeElement.blur();
  return String(done);
})()`;
}

/* The login boxes on this page: the username box, the password box, or both. */
const LOGIN_JS = `(function(){
  function vis(e){ var r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'; }
  var chromeH=window.outerHeight-window.innerHeight;
  function pt(e){ if(!e) return null; e.scrollIntoView({block:'center'}); var r=e.getBoundingClientRect(); return {x:Math.round(window.screenX+r.left+Math.min(r.width/2,60)), y:Math.round(window.screenY+chromeH+r.top+r.height/2), filled:(e.value||'').length>0}; }
  var pw=[].filter.call(document.querySelectorAll('input[type="password"]'),vis)[0]||null;
  var cands=[].filter.call(document.querySelectorAll('input'),function(e){ var t=(e.type||'text').toLowerCase(); return vis(e)&&/^(text|email|tel)$/.test(t)&&(/user|email|login|phone|account|identifier/i.test(e.name+' '+e.id+' '+e.autocomplete+' '+(e.getAttribute('aria-label')||'')+' '+e.placeholder)||e.autocomplete==='username'); });
  var user=cands[0]||null;
  if(pw&&user&&(user.compareDocumentPosition(pw)&Node.DOCUMENT_POSITION_FOLLOWING)===0) user=null;
  var otp=[].some.call(document.querySelectorAll('input'),function(e){ return vis(e)&&(e.autocomplete==='one-time-code'||/otp|verification|2fa|one.?time|code/i.test(e.name+' '+e.id+' '+(e.getAttribute('aria-label')||'')+' '+e.placeholder)); });
  if(pw) pw.setAttribute('data-braino-pw','1'); if(user) user.setAttribute('data-braino-user','1');
  return JSON.stringify({url:location.href, host:location.hostname, user:pt(user), password:pt(pw), otp:otp});
})()`;

/* While Braino picks the saved login, Enter on an EMPTY box must not send the
   form: with no saved login there is no list, and Enter would submit blank. */
const GUARD_JS = `(function(){
  if(window.__brainoGuard) return 'ok';
  window.__brainoGuard=function(e){ var t=e.target; if(e.key==='Enter'&&t&&t.tagName==='INPUT'&&!(t.value||'').length){ e.preventDefault(); e.stopImmediatePropagation(); } };
  document.addEventListener('keydown',window.__brainoGuard,true);
  setTimeout(function(){ document.removeEventListener('keydown',window.__brainoGuard,true); window.__brainoGuard=null; },6000);
  return 'ok';
})()`;

/* Sign in: the button inside the password's form, or Enter on the password. */
const SUBMIT_JS = `(function(){
  var pw=document.querySelector('[data-braino-pw]')||document.querySelector('[data-braino-user]');
  if(!pw) return 'none';
  if(window.__brainoGuard){ document.removeEventListener('keydown',window.__brainoGuard,true); window.__brainoGuard=null; }
  var form=pw.form||pw.closest('form');
  var btn=form&&form.querySelector('button[type="submit"],input[type="submit"],button:not([type])');
  if(btn){ btn.click(); return 'clicked'; }
  if(form&&form.requestSubmit){ form.requestSubmit(); return 'submitted'; }
  return 'enter';
})()`;

/* "Fill this form for me", "log me in", "my phone number is ...". */
function parseFormIntent(raw) {
  const text = String(raw || "").trim().replace(/^(?:(?:hey\s+)?brain(?:o|elle)[\s,.!]*)/i, "").replace(/[.!?]+$/, "");
  if (/^(?:(?:can|could|would) you\s+|please\s+)*(?:log|sign)\s*(?:me\s+)?(?:in|into|on)\b(?:\s+(?:here|to (?:this|it|the site|github|[\w.]+)))?(?:\s+please)?$/i.test(text)
    || /^(?:(?:can|could|would) you\s+|please\s+)*(?:use my saved (?:password|login|details)|fill (?:in )?my (?:saved )?(?:password|login))\b/i.test(text)) {
    return { action: "sign_in" };
  }
  if (/\bfill\b.{0,20}\b(?:form|this|it|the details|my details|details)\b|\bform\b.{0,15}\bfill\b|\bfill (?:it|this) (?:in|out|up)\b/i.test(text)
    && !/\bdon'?t\b|\bnot\b/i.test(text)) {
    return { action: "fill_form" };
  }
  const remember = text.match(/^(?:(?:please\s+)?remember(?: that)?\s+)?my\s+(phone(?:\s*number)?|mobile(?:\s*number)?|number|city|linkedin(?:\s*(?:url|profile))?|github(?:\s*(?:url|profile|username))?|website|portfolio|country|role|college|university|company)\s+(?:is|=)\s+(.{2,120})$/i);
  if (remember) {
    const k = remember[1].toLowerCase();
    const key = /phone|mobile|number/.test(k) ? "phone" : /linkedin/.test(k) ? "linkedin" : /github/.test(k) ? "github"
      : /website|portfolio/.test(k) ? "website" : /college|university|company/.test(k) ? "org" : k;
    return { action: "remember", key, value: remember[2].trim() };
  }
  return null;
}

/* What to fill, and what he couldn't. */
function planFill(fields, profile) {
  const assign = [];
  const unknown = [];
  for (const f of fields || []) {
    if (f.value) continue; // never overwrite what's already there
    const m = matchField(f, profile);
    if (m) {
      if (f.options && f.options.length) {
        const opt = pickOption(f.options, m.value);
        if (opt) { assign.push({ i: f.i, value: opt, key: m.key }); continue; }
      } else { assign.push({ i: f.i, value: m.value, key: m.key }); continue; }
    }
    // Card numbers and the like are never his, so they are not "left for you" either.
    if (f.type !== "checkbox" && !NEVER.test(fieldText(f))) unknown.push(f.label || f.placeholder || f.name || "one field");
  }
  return { assign, unknown };
}

module.exports = { matchField, pickOption, planFill, parseFormIntent, fillJs, SCAN_JS, LOGIN_JS, GUARD_JS, SUBMIT_JS, NEVER };
