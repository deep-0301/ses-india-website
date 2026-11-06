/*
 * DK Solutions AI chat widget. One file, no dependencies.
 *
 * Add to any page:
 *   <script src="/chatbot/widget/ai-chat.js" defer
 *     data-endpoint="https://your-worker.workers.dev"
 *     data-name="Company assistant"
 *     data-greeting="Hi! Ask me anything."
 *     data-suggestions="Question one|Question two"
 *     data-accent="#013289" data-accent-ink="#ffffff"
 *     data-fallback="Email us at hello@example.com"
 *     data-bottom="20" data-right="20"></script>
 *
 * data-bottom / data-right move the button (in px), for example to sit above
 * an existing WhatsApp button. The widget stays hidden while data-endpoint is empty.
 *
 * The widget renders inside a shadow root so the site's CSS cannot break it
 * and its CSS cannot leak into the site.
 */
(function () {
  'use strict';

  var script = document.currentScript || document.querySelector('script[data-endpoint][src*="ai-chat"]');
  // No endpoint yet means the server is not deployed: show nothing rather than a broken chat.
  if (!script || window.__dkAiChat || !script.getAttribute('data-endpoint')) return;
  window.__dkAiChat = true;

  var cfg = {
    endpoint: script.getAttribute('data-endpoint') || '',
    name: script.getAttribute('data-name') || 'Assistant',
    greeting: script.getAttribute('data-greeting') || 'Hi! How can I help you today?',
    suggestions: (script.getAttribute('data-suggestions') || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean),
    accent: script.getAttribute('data-accent') || '#013289',
    accentInk: script.getAttribute('data-accent-ink') || '#ffffff',
    fallback: script.getAttribute('data-fallback') || 'Please use the contact page to reach the team.',
    bottom: parseInt(script.getAttribute('data-bottom'), 10) || 20,
    right: parseInt(script.getAttribute('data-right'), 10) || 20
  };

  var STORE_KEY = 'dk-ai-chat:' + location.hostname;
  var MAX_INPUT = 2000;

  function load() {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || { open: false, messages: [] }; }
    catch (e) { return { open: false, messages: [] }; }
  }
  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  }
  var state = load();
  if (!Array.isArray(state.messages)) state.messages = [];
  var busy = false;

  // ---------- Markup ----------
  var host = document.createElement('div');
  host.id = 'dk-ai-chat';
  var root = host.attachShadow({ mode: 'open' });

  var css = '' +
    ':host{all:initial}' +
    '*{box-sizing:border-box}' +
    '.w{--a:' + cfg.accent + ';--ai:' + cfg.accentInk + ';--bg:#ffffff;--ink:#14233f;--muted:#5a6886;--line:#d6dff0;--bot:#eef3fb;' +
      'font:15px/1.5 "Barlow","Segoe UI",system-ui,-apple-system,sans-serif;color:var(--ink);position:fixed;right:' + cfg.right + 'px;bottom:' + cfg.bottom + 'px;z-index:2147483000}' +
    '@media (prefers-color-scheme:dark){.w{--bg:#11234a;--ink:#e8eef8;--muted:#a9b8d2;--line:#2c4069;--bot:#1a3160}}' +
    '.fab{width:60px;height:60px;border-radius:50%;border:0;background:var(--a);color:var(--ai);cursor:pointer;display:grid;place-items:center;box-shadow:0 8px 24px rgba(7,28,76,.35);transition:transform .15s}' +
    '.fab:hover{transform:scale(1.06)}.fab:focus-visible,.x:focus-visible,.send:focus-visible,.chip:focus-visible,textarea:focus-visible{outline:3px solid #e0ae4a;outline-offset:2px}' +
    '.fab svg{width:28px;height:28px}' +
    '.dot{position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#5be08f;border:2px solid var(--bg)}' +
    '.p{position:absolute;right:0;bottom:76px;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - ' + (cfg.bottom + 100) + 'px);background:var(--bg);border:1px solid var(--line);border-radius:16px;box-shadow:0 18px 48px rgba(7,28,76,.3);display:flex;flex-direction:column;overflow:hidden}' +
    '.p[hidden]{display:none}' +
    '.h{background:var(--a);color:var(--ai);padding:14px 16px;display:flex;align-items:center;gap:10px}' +
    '.h b{font-size:16px;display:block}.h small{opacity:.85;font-size:12px;display:block}' +
    '.h .t{flex:1;min-width:0}' +
    '.x{background:transparent;border:0;color:inherit;cursor:pointer;width:34px;height:34px;border-radius:8px;display:grid;place-items:center}' +
    '.x:hover{background:rgba(255,255,255,.15)}.x svg{width:18px;height:18px}' +
    '.log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}' +
    '.m{max-width:85%;padding:9px 13px;border-radius:14px;white-space:normal;word-wrap:break-word;overflow-wrap:anywhere}' +
    '.m p{margin:0 0 6px}.m p:last-child{margin:0}.m ul,.m ol{margin:4px 0 6px;padding-left:20px}' +
    '.m a{color:inherit;text-decoration:underline}' +
    '.bot{background:var(--bot);align-self:flex-start;border-bottom-left-radius:4px}' +
    '.me{background:var(--a);color:var(--ai);align-self:flex-end;border-bottom-right-radius:4px}' +
    '.err{background:transparent;border:1px solid var(--line);color:var(--muted);font-size:14px}' +
    '.typing{display:inline-flex;gap:4px;padding:4px 0}.typing i{width:7px;height:7px;border-radius:50%;background:var(--muted);animation:b 1.2s infinite ease-in-out}' +
    '.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}' +
    '@keyframes b{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}' +
    '@media (prefers-reduced-motion:reduce){.typing i{animation:none}.fab{transition:none}}' +
    '.chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px}' +
    '.chip{border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer;text-align:left}' +
    '.chip:hover{border-color:var(--a)}' +
    '.f{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--line);align-items:flex-end}' +
    'textarea{flex:1;resize:none;border:1px solid var(--line);border-radius:10px;padding:9px 11px;font:inherit;color:var(--ink);background:var(--bg);max-height:120px;min-height:42px;font-size:16px}' +
    '.send{border:0;background:var(--a);color:var(--ai);border-radius:10px;width:42px;height:42px;cursor:pointer;display:grid;place-items:center;flex:none}' +
    '.send:disabled{opacity:.5;cursor:default}.send svg{width:18px;height:18px}' +
    '.note{font-size:11px;color:var(--muted);text-align:center;padding:0 12px 8px}' +
    '@media (max-width:480px){.w{right:16px}.w.open .fab{display:none}.p{position:fixed;inset:0;width:auto;max-width:none;height:auto;max-height:none;border-radius:0;border:0}}';

  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  root.innerHTML = '<style>' + css + '</style>' +
    '<div class="w">' +
      '<section class="p" role="dialog" aria-label="' + esc(cfg.name) + '" hidden>' +
        '<header class="h"><div class="t"><b>' + esc(cfg.name) + '</b><small>AI assistant · replies instantly</small></div>' +
          '<button class="x" type="button" aria-label="Close chat">' + ICON_X + '</button></header>' +
        '<div class="log" aria-live="polite"></div>' +
        '<div class="chips"></div>' +
        '<form class="f"><textarea rows="1" maxlength="' + MAX_INPUT + '" placeholder="Type your question…" aria-label="Your message"></textarea>' +
          '<button class="send" type="submit" aria-label="Send">' + ICON_SEND + '</button></form>' +
        '<div class="note">AI answers can be wrong. For quotes and orders, contact the team.</div>' +
      '</section>' +
      '<button class="fab" type="button" aria-label="Ask our AI assistant" aria-expanded="false">' + ICON_CHAT + '<span class="dot"></span></button>' +
    '</div>';

  var panel = root.querySelector('.p');
  var fab = root.querySelector('.fab');
  var log = root.querySelector('.log');
  var chips = root.querySelector('.chips');
  var form = root.querySelector('.f');
  var input = root.querySelector('textarea');
  var sendBtn = root.querySelector('.send');

  // ---------- Rendering ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Small, safe Markdown: escape first, then add bold, links, line breaks and lists.
  function md(text) {
    var lines = esc(text).split('\n');
    var html = '', list = null, para = [];
    function inline(s) {
      return s
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/(^|[\s(])(https?:\/\/[^\s<)]*[^\s<).,!?;:])/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    }
    function flushPara() { if (para.length) { html += '<p>' + inline(para.join('<br>')) + '</p>'; para = []; } }
    function flushList() { if (list) { html += '</' + list + '>'; list = null; } }
    lines.forEach(function (line) {
      var ul = line.match(/^\s*[-*•]\s+(.*)$/), ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ul || ol) {
        flushPara();
        var type = ul ? 'ul' : 'ol';
        if (list !== type) { flushList(); html += '<' + type + '>'; list = type; }
        html += '<li>' + inline((ul || ol)[1]) + '</li>';
      } else if (!line.trim()) {
        flushPara(); flushList();
      } else {
        flushList(); para.push(line.replace(/^#+\s*/, ''));
      }
    });
    flushPara(); flushList();
    return html;
  }

  function bubble(role, text, extraClass) {
    var el = document.createElement('div');
    el.className = 'm ' + (role === 'user' ? 'me' : 'bot') + (extraClass ? ' ' + extraClass : '');
    if (role === 'user') el.textContent = text; else el.innerHTML = md(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function renderAll() {
    log.innerHTML = '';
    bubble('assistant', cfg.greeting);
    state.messages.forEach(function (m) { bubble(m.role, m.content); });
    renderChips();
  }

  function renderChips() {
    chips.innerHTML = '';
    if (state.messages.length || !cfg.suggestions.length) return;
    cfg.suggestions.forEach(function (q) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = q;
      b.addEventListener('click', function () { ask(q); });
      chips.appendChild(b);
    });
  }

  function setOpen(open) {
    state.open = open; save();
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    fab.setAttribute('aria-label', open ? 'Close chat' : 'Ask our AI assistant');
    root.querySelector('.w').classList.toggle('open', open);
    fab.innerHTML = open ? ICON_X : ICON_CHAT + (state.messages.length ? '' : '<span class="dot"></span>');
    if (open) { log.scrollTop = log.scrollHeight; setTimeout(function () { input.focus(); }, 30); }
  }

  // ---------- Talking to the server ----------
  function ask(text) {
    text = (text || '').trim().slice(0, MAX_INPUT);
    if (!text || busy) return;

    busy = true; sendBtn.disabled = true;
    state.messages.push({ role: 'user', content: text }); save();
    bubble('user', text);
    chips.innerHTML = '';
    input.value = ''; autosize();

    var el = bubble('assistant', '');
    el.innerHTML = '<span class="typing" aria-label="Typing"><i></i><i></i><i></i></span>';
    var answer = '';

    function finish(errorText) {
      if (errorText) {
        el.className = 'm bot err';
        el.innerHTML = md(errorText);
        if (!answer) state.messages.pop(); // let the visitor resend the same question
      } else if (answer) {
        state.messages.push({ role: 'assistant', content: answer });
      }
      save();
      busy = false; sendBtn.disabled = false;
      log.scrollTop = log.scrollHeight;
    }

    fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: state.messages.slice(-20) })
    }).then(function (res) {
      var type = res.headers.get('Content-Type') || '';
      if (!res.ok || type.indexOf('text/event-stream') === -1) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          finish((j && j.error ? j.error + ' ' : 'Sorry, the assistant is unavailable right now. ') + cfg.fallback);
        });
      }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buf = '', ended = false;

      function handle(event, data) {
        if (event === 'delta') {
          answer += data.text || '';
          el.innerHTML = md(answer);
          log.scrollTop = log.scrollHeight;
        } else if (event === 'refusal') {
          answer = '';
          ended = true;
          finish("I can't help with that here. " + cfg.fallback);
        } else if (event === 'error') {
          ended = true;
          finish((data.error || 'Sorry, something went wrong.') + ' ' + cfg.fallback);
        } else if (event === 'done' && !ended) {
          ended = true;
          finish(answer ? null : 'Sorry, I did not get an answer. ' + cfg.fallback);
        }
      }

      function pump() {
        return reader.read().then(function (r) {
          if (r.done) { if (!ended) finish(answer ? null : 'The connection closed early. ' + cfg.fallback); return; }
          buf += decoder.decode(r.value, { stream: true });
          var parts = buf.split('\n\n');
          buf = parts.pop();
          parts.forEach(function (chunk) {
            var ev = 'message', data = '';
            chunk.split('\n').forEach(function (line) {
              if (line.indexOf('event:') === 0) ev = line.slice(6).trim();
              else if (line.indexOf('data:') === 0) data += line.slice(5).trim();
            });
            try { handle(ev, data ? JSON.parse(data) : {}); } catch (e) { /* skip a bad chunk */ }
          });
          return pump();
        });
      }
      return pump();
    }).catch(function () {
      finish('I could not reach the assistant. Check your connection and try again. ' + cfg.fallback);
    });
  }

  // ---------- Events ----------
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; }
  fab.addEventListener('click', function () { setOpen(panel.hidden); });
  root.querySelector('.x').addEventListener('click', function () { setOpen(false); fab.focus(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); }
  });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); fab.focus(); }
  });

  function mount() {
    document.body.appendChild(host);
    renderAll();
    setOpen(!!state.open);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
