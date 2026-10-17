(() => {
  "use strict";

  const root = document.documentElement;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const frozen = new URLSearchParams(location.search).has("static");
  const calm = () => still.matches || frozen;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const typing = (el) => el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

  clearTimeout(window.__rv);
  if (frozen) root.classList.add("reveal-all", "static");

  function watch(el, enter, leave, threshold = 0.35) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { enter(); return; }
    new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? enter() : leave && leave()));
    }, { threshold }).observe(el);
  }

  $$(".reveal").forEach((el) => {
    if (el.classList.contains("hero")) {
      if (frozen) { el.classList.add("in"); return; }
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
      setTimeout(() => el.classList.add("in"), 120);
      return;
    }
    if (frozen) { el.classList.add("in"); return; }
    watch(el, () => el.classList.add("in"), null, 0.12);
  });
  const onScreen = new Set();
  $$("[data-live]").forEach((el) => {
    if (frozen) return;
    watch(el, () => { el.classList.add("live"); onScreen.add(el); }, () => { el.classList.remove("live"); onScreen.delete(el); }, 0);
  });
  const isLive = (el) => !frozen && !document.hidden && onScreen.has(el);

  const status = (v) => (v < 60 ? "good" : v < 80 ? "caution" : v < 90 ? "warning" : "over");
  const LABEL = { good: "Good", caution: "Caution", warning: "Warning", over: "Over" };
  const pct = (v) => (Math.round(v * 10) / 10).toFixed(v % 1 && v < 100 ? 1 : 0).replace(/\.0$/, "") + "%";

  const PROVIDERS = {
    claude: { name: "Claude", img: "img/claude.webp" },
    chatgpt: { name: "ChatGPT", img: "img/chatgpt.webp" },
    codex: { name: "Codex", img: "img/codex.webp" },
    cursor: { name: "Cursor", img: "img/cursor.webp" },
    copilot: { name: "GitHub Copilot", glyph: "g-copilot", color: "#6E40C9" },
    gemini: { name: "Gemini", img: "img/gemini.webp" },
    openrouter: { name: "OpenRouter", glyph: "g-openrouter", color: "#14B8A6" }
  };
  function logo(id) {
    const p = PROVIDERS[id];
    const span = document.createElement("span");
    span.className = "mb-logo";
    if (p.img) span.innerHTML = `<img src="${p.img}" alt="" width="24" height="24" />`;
    else {
      span.style.background = `linear-gradient(160deg, color-mix(in srgb, ${p.color} 80%, white), ${p.color})`;
      span.style.color = "#fff";
      span.innerHTML = `<svg viewBox="0 0 24 24" style="padding:18%"><use href="#${p.glyph}"/></svg>`;
    }
    return span;
  }
  function roving(group, items, pick, { keys = true } = {}) {
    if (!keys) return;
    group.addEventListener("keydown", (e) => {
      const i = items().indexOf(document.activeElement);
      if (i < 0) return;
      const n = items().length;
      let j = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % n;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + n) % n;
      if (e.key === "Home") j = 0;
      if (e.key === "End") j = n - 1;
      if (j === null) return;
      e.preventDefault();
      pick(j);
      items()[j].focus();
    });
  }

  const bar = $(".js-bar");
  if (bar) {
    const onScroll = () => bar.classList.toggle("scrolled", scrollY > 12);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const btn = $(".js-bar-menu", bar);
    const sheet = $(".js-bar-sheet", bar);
    const close = () => { bar.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); sheet.hidden = true; };
    btn.addEventListener("click", () => {
      const open = sheet.hidden;
      sheet.hidden = !open;
      bar.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
    $$("a", sheet).forEach((a) => a.addEventListener("click", close));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) { close(); btn.focus(); } });
    const links = $$(".bar-nav a");
    const targets = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
    if ("IntersectionObserver" in window && !frozen) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      targets.forEach((t) => io.observe(t));
    }
  }

  const board = $(".js-lb");
  if (board) {
    const header = board.closest("[data-live]");
    const rows = $$(".lb-row", board).map((el) => ({ el, v: +el.dataset.v, reset: +el.dataset.reset }));
    const short = (s) => {
      s = Math.max(0, Math.round(s));
      const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      const p = (x) => String(x).padStart(2, "0");
      return d ? `${d}d ${h}h` : h ? `${h}h ${p(m)}m ${p(sec)}s` : `${m}m ${p(sec)}s`;
    };
    const hm = (s) => {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
      return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
    };
    const pill = $(".js-bar-live");
    const nextEl = $(".js-lb-next");
    const upd = $(".js-lb-upd");
    let age = 12;
    function paint() {
      rows.forEach((r) => {
        const st = status(r.v);
        r.el.dataset.s = st;
        r.el.style.setProperty("--v", r.v);
        $(".lb-pct", r.el).textContent = Math.round(r.v) + "%";
        $(".js-cd", r.el).textContent = short(r.reset);
      });
      const c = rows[0];
      nextEl.textContent = hm(c.reset);
      upd.textContent = age + "s";
      if (pill) {
        const st = status(c.v);
        const b = $(".js-bl-pct", pill);
        b.textContent = Math.round(c.v) + "%";
        b.dataset.s = st;
        pill.style.setProperty("--bl-v", Math.min(c.v, 100));
        pill.style.setProperty("--bl-c", `var(--st-${st === "over" ? "over" : st})`);
        $(".js-bl-reset", pill).textContent = hm(c.reset);
        pill.setAttribute("aria-label", `Demo: Claude 5-hour limit at ${Math.round(c.v)}%, resets in ${hm(c.reset)}`);
      }
    }
    paint();
    const horizon = $(".js-horizon");
    let bars = [];
    if (horizon) {
      const n = innerWidth < 720 ? 48 : 120;
      for (let i = 0; i < n; i++) {
        const b = document.createElement("i");
        const h = 18 + 46 * Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.11)) + (i % 7) * 3;
        b.style.setProperty("--h", h.toFixed(1));
        const v = (h - 18) / 64 * 100;
        if (i % 9 === 0) b.dataset.s = status(55 + v * 0.45);
        horizon.appendChild(b);
        bars.push(b);
      }
    }
    setTimeout(() => header.classList.add("settled"), 2600);
    if (!frozen) {
      let t = 0;
      setInterval(() => {
        if (document.hidden) return;
        t++;
        rows.forEach((r) => {
          r.reset -= 1;
          if (r.reset <= 0) { r.reset = 5 * 3600; r.v = 3; }
        });
        if (t % 4 === 0 && rows[0].v < 99) rows[0].v = Math.round((rows[0].v + 0.3) * 10) / 10;
        age = age >= 59 ? 1 : age + 1;
        paint();
        if (t % 3 === 0 && bars.length && isLive(header) && !still.matches) {
          for (let k = 0; k < 6; k++) {
            const b = bars[(t * 7 + k * 19) % bars.length];
            b.style.setProperty("--h", (16 + ((t * 13 + k * 29) % 62)).toFixed(1));
          }
        }
      }, 1000);
    }
  }

  const ACCOUNTS = [
    {
      id: "claude", provider: "claude", tab: "Claude Max", name: "Claude Max", plan: "Max 20x", tag: "Work",
      mb: ["5H", "7D"],
      cards: [
        { title: "Current session", icon: "#E8A838", rows: [{ name: "5-Hour Usage", v: 62, reset: 2 * 3600 + 14 * 60 + 9, creep: true }] },
        { title: "Weekly limits", icon: "#2ECC71", rows: [
          { name: "7-Day Usage", v: 88, reset: 3 * 86400 + 6 * 3600 + 12 * 60 },
          { name: "Sonnet (7-Day)", v: 41, reset: 3 * 86400 + 6 * 3600 + 12 * 60 },
          { name: "Opus (7-Day)", v: 72, reset: 3 * 86400 + 6 * 3600 + 12 * 60 }
        ] }
      ]
    },
    {
      id: "codex", provider: "codex", tab: "Codex", name: "Codex", plan: "Pro", tag: "Development",
      mb: ["5H", "WK"],
      cards: [
        { title: "Current session", icon: "#E8A838", rows: [{ name: "5-Hour Usage", v: 23, reset: 4 * 3600 + 2 * 60 + 41, creep: true }] },
        { title: "Weekly limits", icon: "#2ECC71", rows: [{ name: "Weekly Usage", v: 73, reset: 2 * 86400 + 11 * 3600 + 5 * 60 }] }
      ]
    },
    {
      id: "cursor", provider: "cursor", tab: "Cursor Ultra", name: "Cursor Ultra", plan: "Ultra", tag: "Personal",
      mb: ["PRM", "AUTO"],
      cards: [
        { title: "Monthly usage", icon: "#00B4D8", rows: [
          { name: "Premium", v: 92, reset: 12 * 86400 + 4 * 3600 + 30 * 60, creep: true },
          { name: "Auto", v: 38, reset: 12 * 86400 + 4 * 3600 + 30 * 60 },
          { name: "API", v: 15, reset: 12 * 86400 + 4 * 3600 + 30 * 60 }
        ] }
      ]
    }
  ];
  const clock = (s) => {
    s = Math.max(0, Math.round(s));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = (x) => String(x).padStart(2, "0");
    return d ? `${d}d ${h}h ${p(m)}m` : `${h}h ${p(m)}m ${p(sec)}s`;
  };

  const pop = $(".js-pop");
  if (pop) {
    const section = pop.closest("section");
    const tabs = $(".js-pop-tabs", pop);
    const cards = $(".js-pop-cards", pop);
    const mbLogo = $(".js-mb-logo", pop);
    let cur = 0;
    ACCOUNTS.forEach((a, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pop-tab";
      b.setAttribute("role", "tab");
      b.appendChild(logo(a.provider));
      const t = document.createElement("span");
      t.textContent = a.tab;
      b.appendChild(t);
      b.addEventListener("click", () => select(i));
      tabs.appendChild(b);
    });
    const tabEls = () => $$(".pop-tab", tabs);
    roving(tabs, tabEls, (j) => select(j));

    function paintRows() {
      const a = ACCOUNTS[cur];
      $$(".pm", cards).forEach((el) => {
        const r = a.cards[+el.dataset.c].rows[+el.dataset.r];
        const s = status(r.v);
        el.dataset.s = s;
        $("em", el).textContent = pct(r.v);
        $(".status-pill", el).textContent = LABEL[s];
        $(".status-pill", el).dataset.s = s;
        $("s", el).style.setProperty("--v", r.v);
        $(".js-reset", el).textContent = clock(r.reset);
      });
      const [m1, m2] = [a.cards[0].rows[0], (a.cards[1] || a.cards[0]).rows[a.cards[1] ? 0 : 1]];
      const A = $(".js-mb-a", pop), B = $(".js-mb-b", pop);
      A.textContent = Math.round(m1.v) + "%"; A.dataset.s = status(m1.v);
      B.textContent = Math.round(m2.v) + "%"; B.dataset.s = status(m2.v);
    }
    function build() {
      const a = ACCOUNTS[cur];
      cards.innerHTML = "";
      a.cards.forEach((c, ci) => {
        const card = document.createElement("div");
        card.className = "pop-card";
        card.innerHTML = `<h4><i style="--ic:${c.icon}"></i></h4>`;
        $("h4", card).append(c.title);
        c.rows.forEach((r, ri) => {
          const row = document.createElement("div");
          row.className = "pm";
          row.dataset.c = ci;
          row.dataset.r = ri;
          row.innerHTML = `<div class="pm-top"><b></b><span class="status-pill"></span><em></em></div><div class="pm-bar"><s></s></div><div class="pm-reset"><svg aria-hidden="true"><use href="#g-clock"/></svg>Resets in <span class="js-reset"></span></div>`;
          $("b", row).textContent = r.name;
          card.appendChild(row);
        });
        cards.appendChild(card);
      });
      $(".js-pop-name", pop).textContent = a.name;
      $(".js-pop-plan", pop).textContent = a.plan;
      $(".js-pop-tag", pop).textContent = a.tag;
      const pl = $(".js-pop-logo", pop);
      pl.innerHTML = "";
      pl.appendChild(logo(a.provider).firstChild);
      if (!PROVIDERS[a.provider].img) pl.style.cssText = logo(a.provider).style.cssText;
      else pl.removeAttribute("style");
      mbLogo.innerHTML = "";
      mbLogo.appendChild(logo(a.provider).firstChild);
      $(".js-mb-la", pop).textContent = a.mb[0];
      $(".js-mb-lb", pop).textContent = a.mb[1];
      tabEls().forEach((t, i) => {
        t.setAttribute("aria-selected", String(i === cur));
        t.tabIndex = i === cur ? 0 : -1;
      });
      paintRows();
    }
    function select(i) {
      if (i === cur && cards.childElementCount) return;
      cur = i;
      if (calm()) { build(); return; }
      cards.classList.add("swap");
      setTimeout(() => { build(); requestAnimationFrame(() => cards.classList.remove("swap")); }, 140);
    }
    build();

    addEventListener("keydown", (e) => {
      if (!onScreen.has(section) && !frozen) return;
      if (e.metaKey || e.ctrlKey || e.altKey || typing(document.activeElement)) return;
      if (tabs.contains(document.activeElement)) return;
      if (document.activeElement && document.activeElement.closest(".js-pick, .js-swatches, .materials, .js-dev-seg")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); select((cur + 1) % ACCOUNTS.length); }
      if (e.key === "ArrowLeft") { e.preventDefault(); select((cur - 1 + ACCOUNTS.length) % ACCOUNTS.length); }
    });

    let refresh = 34, tick = 0;
    const refreshEl = $(".js-pop-refresh", pop);
    if (!frozen) setInterval(() => {
      if (document.hidden) return;
      tick++;
      ACCOUNTS.forEach((a) => a.cards.forEach((c) => c.rows.forEach((r) => {
        r.reset -= 1;
        if (r.reset <= 0) { r.reset = 5 * 3600; r.v = 0; }
        if (r.creep && tick % 5 === 0 && r.v < 99.5) r.v = Math.round((r.v + 0.1 + (tick % 3) * 0.1) * 10) / 10;
      })));
      refresh = refresh <= 1 ? 60 : refresh - 1;
      if (onScreen.has(section)) { paintRows(); refreshEl.textContent = refresh + "s"; }
    }, 1000);
  }

  const meter = $(".js-meter");
  if (meter) {
    const section = meter.closest("section");
    const range = $(".js-meter-range", meter);
    const num = $(".js-meter-num", meter);
    const pill = $(".js-meter-pill", meter);
    const fill = $(".js-meter-fill", meter);
    const toast = $(".js-toast", meter);
    const body = $(".js-toast-body", meter);
    const alerts = $$(".js-alert", meter);
    const MSG = { 50: "Halfway through your usage.", 75: "Getting close to your limit.", 90: "Almost at your limit!" };
    let last = +range.value, hideT = 0, demoT = 0, touched = false, demoed = false;
    function paint(v) {
      const s = status(v);
      meter.dataset.s = s;
      num.textContent = v + "%";
      num.dataset.s = s;
      pill.textContent = LABEL[s];
      pill.dataset.s = s;
      fill.style.setProperty("--v", Math.min(v, 110));
      fill.dataset.s = s;
      alerts.forEach((a) => a.classList.toggle("hit", v >= +a.dataset.at));
    }
    function notify(at, v) {
      body.textContent = `Usage at ${v}% — ${MSG[at]}`;
      toast.classList.add("on");
      clearTimeout(hideT);
      hideT = setTimeout(() => toast.classList.remove("on"), 3400);
    }
    function set(v, fromUser) {
      const crossed = [50, 75, 90].filter((t) => last < t && v >= t).pop();
      if (crossed) notify(crossed, v);
      if (v < last && v < 50) toast.classList.remove("on");
      last = v;
      range.value = v;
      paint(v);
      if (fromUser) { touched = true; clearInterval(demoT); }
    }
    range.addEventListener("input", () => set(+range.value, true));
    if (frozen) {
      last = 84;
      range.value = 84;
      paint(84);
      body.textContent = `Usage at 76% — ${MSG[75]}`;
      toast.classList.add("on");
    } else {
      paint(last);
      watch(meter, () => {
        if (demoed || touched || calm()) return;
        demoed = true;
        let v = 12;
        set(v);
        demoT = setInterval(() => {
          if (touched) return clearInterval(demoT);
          v += v < 70 ? 2 : 1;
          if (v >= 93) { clearInterval(demoT); v = 93; }
          set(v);
        }, 55);
      }, null, 0.6);
    }
  }

  const WIDGETS = [
    { id: "claude", label: "5-Hour", v: 62, reset: "2h 4m" },
    { id: "chatgpt", label: "Premium", v: 85, reset: "4h 51m" },
    { id: "codex", label: "5-Hour", v: 73, reset: "3h 12m" },
    { id: "cursor", label: "Premium", v: 92, reset: "12d 4h" },
    { id: "copilot", label: "Premium requests", v: 87, reset: "9d 2h" },
    { id: "gemini", label: "Daily requests", v: 7, reset: "14h 20m" },
    { id: "openrouter", label: "Key quota", v: 63, reset: null }
  ];
  const wd = $(".js-wd");
  const pick = $(".js-pick");
  if (wd && pick) {
    let cur = 0;
    const small = (w) => {
      const s = status(w.v);
      const el = document.createElement("div");
      el.className = "w-in";
      el.style.display = "contents";
      el.innerHTML = `<div class="w-head"><span><b></b><small></small></span></div><div class="w-label"></div><div class="w-num" data-s="${s}"></div><div class="w-bar" data-s="${s}"><s style="--v:${w.v}"></s></div>`;
      $(".w-head", el).prepend(logo(w.id));
      $(".w-head b", el).textContent = PROVIDERS[w.id].name;
      $(".w-head small", el).textContent = PROVIDERS[w.id].name;
      $(".w-head small", el).dataset.s = s;
      $(".w-label", el).textContent = w.label;
      $(".w-num", el).textContent = w.v + "%";
      if (w.reset) {
        const r = document.createElement("span");
        r.className = "w-reset";
        r.innerHTML = `<svg aria-hidden="true"><use href="#g-clock"/></svg>`;
        r.append(w.reset);
        el.appendChild(r);
      }
      return el;
    };
    const rows = (list, on) => {
      const box = document.createElement("div");
      box.className = "w-rows";
      list.forEach((w) => {
        const s = status(w.v);
        const r = document.createElement("div");
        r.className = "w-row" + (w.id === on ? " on" : "");
        r.dataset.s = s;
        r.appendChild(logo(w.id));
        r.insertAdjacentHTML("beforeend", `<b></b><em></em><div class="w-bar"><s style="--v:${w.v}"></s></div>`);
        $("b", r).textContent = PROVIDERS[w.id].name;
        $("em", r).textContent = w.v + "%";
        box.appendChild(r);
      });
      return box;
    };
    const fillW = (sel, node) => { const el = $(sel, wd); el.innerHTML = ""; el.appendChild(node); };
    function render() {
      const w = WIDGETS[cur];
      const nxt = WIDGETS[(cur + 1) % WIDGETS.length];
      fillW(".js-w-hero", small(w));
      fillW(".js-w-second", small(nxt));
      fillW(".js-w-mac", small(w));
      fillW(".js-w-medium", rows([0, 1, 2].map((k) => WIDGETS[(cur + k) % WIDGETS.length]), w.id));
      fillW(".js-w-large", rows(WIDGETS, w.id));
      $$("button", pick).forEach((b, i) => {
        b.setAttribute("aria-checked", String(i === cur));
        b.tabIndex = i === cur ? 0 : -1;
      });
    }
    WIDGETS.forEach((w, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.appendChild(logo(w.id));
      b.append(PROVIDERS[w.id].name);
      b.addEventListener("click", () => { cur = i; render(); });
      pick.appendChild(b);
    });
    roving(pick, () => $$("button", pick), (j) => { cur = j; render(); });
    render();
  }

  const seg = $(".js-dev-seg");
  const dev = $(".js-dev");
  if (seg && dev) {
    const btns = $$("button", seg);
    const set = (i) => {
      btns.forEach((b, k) => { b.setAttribute("aria-selected", String(k === i)); b.tabIndex = k === i ? 0 : -1; });
      dev.dataset.dev = btns[i].dataset.dev;
      dev.setAttribute("aria-labelledby", btns[i].id);
    };
    btns.forEach((b, i) => b.addEventListener("click", () => set(i)));
    roving(seg, () => btns, set);
    $$(".dev", dev).forEach((f) => f.addEventListener("click", () => {
      const i = btns.findIndex((b) => f.classList.contains("dev-" + b.dataset.dev));
      if (i >= 0) set(i);
    }));
  }

  const ACCENTS = [
    { id: "violet", name: "Violet", accent: "#A78BFA", second: "#6D28D9", pro: false },
    { id: "gold", name: "Gold", accent: "#E8A838", second: "#9A4A0B", pro: true },
    { id: "emerald", name: "Emerald", accent: "#34D399", second: "#04694B", pro: true },
    { id: "blue", name: "Blue", accent: "#5B9BFA", second: "#1E3A8A", pro: true },
    { id: "rose", name: "Rose", accent: "#F43F5E", second: "#881337", pro: true },
    { id: "slate", name: "Slate", accent: "#94A3B8", second: "#334155", pro: true }
  ];
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lum = (hex) => {
    const c = rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const onAccent = (hex) => (1.05 / (lum(hex) + 0.05) >= (lum(hex) + 0.05) / 0.0533 ? "#FFFFFF" : "#120D1D");
  const look = { accent: ACCENTS[0], style: "glossy" };
  function applyLook() {
    const a = look.accent;
    const [r, g, b] = rgb(a.accent);
    const [r2, g2, b2] = rgb(a.second);
    root.style.setProperty("--pal-accent", a.accent);
    root.style.setProperty("--pal-second", a.second);
    root.style.setProperty("--pal-s1", `rgb(${r} ${g} ${b} / 0.26)`);
    root.style.setProperty("--pal-s2", `rgb(${r2} ${g2} ${b2} / 0.16)`);
    root.style.setProperty("--on-accent", onAccent(a.accent));
    root.dataset.style = look.style;
    root.dataset.accent = a.id;
  }
  const qs = new URLSearchParams(location.search);
  const preset = ACCENTS.find((a) => a.id === qs.get("accent"));
  if (preset) look.accent = preset;
  if (qs.get("style") === "clean") look.style = "clean";
  applyLook();

  const sw = $(".js-swatches");
  if (sw) {
    const name = $(".js-swatch-name");
    const say = () => {
      name.innerHTML = "";
      const b = document.createElement("b");
      b.textContent = look.accent.name;
      const t = document.createElement("span");
      t.className = "tag " + (look.accent.pro ? "pro" : "free");
      t.textContent = look.accent.pro ? "Pro" : "Free";
      name.append(b, " ", t, look.style === "clean" ? " · Clean" : " · Glossy");
    };
    ACCENTS.forEach((a, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-label", a.name + (a.pro ? ", Pro" : ", free"));
      b.style.setProperty("--a", a.accent);
      b.style.setProperty("--b", `color-mix(in srgb, ${a.second} 70%, #120D1D)`);
      if (a.pro) b.innerHTML = '<span class="pro" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="m12 3.5 2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8L8 13.5l-4.3-4 5.8-.7z"/></svg></span>';
      b.addEventListener("click", () => pickAccent(i));
      sw.appendChild(b);
    });
    const swEls = () => $$(".swatch", sw);
    function pickAccent(i) {
      look.accent = ACCENTS[i];
      applyLook();
      swEls().forEach((b, k) => { b.setAttribute("aria-checked", String(k === i)); b.tabIndex = k === i ? 0 : -1; });
      say();
    }
    roving(sw, swEls, pickAccent);
    const mats = $$(".mat");
    const pickStyle = (i) => {
      look.style = mats[i].dataset.style;
      applyLook();
      mats.forEach((m, k) => { m.setAttribute("aria-checked", String(k === i)); m.tabIndex = k === i ? 0 : -1; });
      say();
    };
    mats.forEach((m, i) => m.addEventListener("click", () => pickStyle(i)));
    if (mats[0]) roving(mats[0].parentElement, () => mats, pickStyle);
    pickAccent(ACCENTS.indexOf(look.accent));
    pickStyle(Math.max(0, mats.findIndex((m) => m.dataset.style === look.style)));
  }

  const flow = $(".flow-lines");
  if (flow && flow.pauseAnimations) {
    const sec = flow.closest("section");
    if (calm()) { flow.pauseAnimations(); flow.setCurrentTime(1.1); }
    else watch(sec, () => flow.unpauseAnimations(), () => flow.pauseAnimations(), 0);
    still.addEventListener && still.addEventListener("change", () => (still.matches ? flow.pauseAnimations() : flow.unpauseAnimations()));
  }
})();
