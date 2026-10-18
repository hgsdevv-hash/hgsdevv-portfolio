// =========================================================
// hgsDevv | interações do portfólio
// =========================================================

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Ano automático no rodapé
document.getElementById("year").textContent = new Date().getFullYear();

// ---------- Tema claro/escuro (botão SELECT) ----------
const root = document.documentElement;

try {
  const saved = localStorage.getItem("theme");
  if (saved) root.dataset.theme = saved;
} catch (e) { /* localStorage indisponível */ }

document.getElementById("themeToggle").addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
  try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
});

// ---------- Entrada dos elementos ao rolar (com efeito cascata) ----------
const revealEls = document.querySelectorAll("[data-reveal]");

// irmãos aparecem um depois do outro
revealEls.forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute("data-reveal"));
  const gap = el.dataset.reveal === "pop" ? 0.06 : 0.12;
  el.style.setProperty("--d", `${siblings.indexOf(el) * gap}s`);
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("visible");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

revealEls.forEach((el) => revealObserver.observe(el));

// ---------- Texto que acende palavra por palavra ----------
const scrubParagraphs = [...document.querySelectorAll(".scrub p")];

scrubParagraphs.forEach((p) => {
  p.innerHTML = p.textContent
    .trim()
    .split(/\s+/)
    .map((word) => `<span class="w">${word}</span>`)
    .join(" ");
});

// quantas palavras cada parágrafo deve ter acesas (alvo) e quantas tem agora
const scrubState = scrubParagraphs.map((p) => ({ words: p.querySelectorAll(".w"), target: 0, current: 0 }));
let scrubAnimating = false;

function updateScrub() {
  const vh = window.innerHeight;
  scrubParagraphs.forEach((p, i) => {
    const rect = p.getBoundingClientRect();
    // 0 quando o parágrafo entra por baixo da tela, 1 quando chega perto do topo
    const progress = Math.min(Math.max((vh * 0.95 - rect.top) / (vh * 0.55), 0), 1);
    scrubState[i].target = Math.round(progress * scrubState[i].words.length);
  });
  if (!scrubAnimating) animateScrub();
}

// acende/apaga as palavras aos poucos até chegar no alvo
function animateScrub() {
  scrubAnimating = false;
  scrubState.forEach((s, i) => {
    if (s.current === s.target) return;
    // parágrafos seguintes esperam o anterior terminar
    if (s.target > s.current && i > 0 && scrubState[i - 1].current < scrubState[i - 1].target) {
      scrubAnimating = true;
      return;
    }
    const step = s.target > s.current ? 1 : -1;
    s.current += step;
    s.words[step > 0 ? s.current - 1 : s.current].classList.toggle("on", step > 0);
    scrubAnimating = true;
  });
  if (scrubAnimating) setTimeout(animateScrub, 22);
}

// ---------- Divisória: progresso da rolagem ----------
const dividerFill = document.getElementById("dividerFill");

function updateDivider() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max > 0 ? window.scrollY / max : 0;
  dividerFill.style.setProperty("--progress", progress.toFixed(4));
}

// ---------- Uma única função de rolagem, otimizada ----------
// (no máximo uma atualização a cada ~30ms; funções leves, sem depender de requestAnimationFrame)
let lastScrollUpdate = 0;
let pendingScroll = null;
function onScroll() {
  const now = performance.now();
  clearTimeout(pendingScroll);
  if (now - lastScrollUpdate > 30) {
    lastScrollUpdate = now;
    updateScrub();
    updateDivider();
  }
  pendingScroll = setTimeout(() => { updateScrub(); updateDivider(); }, 60);  // garante o estado final
}
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
updateScrub();
updateDivider();

// ---------- Destacar a seção atual no menu ----------
const navLinks = document.querySelectorAll(".nav a");

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) =>
      link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`)
    );
  });
}, { rootMargin: "-40% 0px -55% 0px" });

document.querySelectorAll(".section").forEach((s) => navObserver.observe(s));

// ---------- Editor que digita um código em Java sobre mim ----------
// (inspirado no banner de código do meu LinkedIn)
const editor = document.getElementById("editor");

// cada linha é uma lista de pedaços: [classe de cor, texto]
const code = [
  [["cm", "// Higor.java"]],
  [["kw", "public class "], ["ty", "Higor "], ["kw", "extends "], ["ty", "Estudante"], ["", " {"]],
  [],
  [["ty", "    String "], ["", "curso = "], ["str", "\"Ciência da Computação\""], ["", ";"]],
  [["ty", "    String"], ["", "[] stack = { "], ["str", "\"Java\""], ["", ", "], ["str", "\"Python\""], ["", ", "], ["str", "\"JS\""], ["", " };"]],
  [["ty", "    String "], ["", "projeto = "], ["str", "\"hgsDevv\""], ["", "; "], ["cm", "// projeto pessoal"]],
  [],
  [["kw", "    public static void "], ["fn", "main"], ["", "("], ["ty", "String"], ["", "[] args) {"]],
  [["ty", "        Higor "], ["", "eu = "], ["kw", "new "], ["fn", "Higor"], ["", "();"]],
  [["kw", "        while "], ["", "(!eu."], ["fn", "sabeTudo"], ["", "()) {"]],
  [["", "            eu."], ["fn", "aprender"], ["", "();"]],
  [["", "        }"]],
  [["", "    }"]],
  [["", "}"]],
];

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// monta o HTML de uma linha mostrando só os primeiros "limit" caracteres
function lineHtml(parts, limit = Infinity) {
  let left = limit;
  return parts.map(([cls, text]) => {
    if (left <= 0) return "";
    const piece = text.slice(0, left);
    left -= piece.length;
    return `<span class="${cls}">${escapeHtml(piece)}</span>`;
  }).join("");
}

const lineLength = (parts) => parts.reduce((n, [, t]) => n + t.length, 0);

function renderEditor(done, current = null, chars = 0) {
  let html = done.map((p) => `<span class="ln">${lineHtml(p) || " "}</span>`).join("");
  if (current) html += `<span class="ln">${lineHtml(current, chars)}<span class="caret"></span></span>`;
  editor.innerHTML = html;
}

function typeEditor() {
  if (reduceMotion) { renderEditor(code); return; }

  let line = 0, chars = 0;
  const tick = () => {
    if (line >= code.length) {
      renderEditor(code.slice(0, -1), code[code.length - 1], Infinity);   // cursor piscando no fim
      return;
    }
    const len = lineLength(code[line]);
    chars = Math.min(chars + 2, len);
    renderEditor(code.slice(0, line), code[line], chars);
    if (chars >= len) {
      line++;
      chars = 0;
      setTimeout(tick, len === 0 ? 60 : 160);
    } else {
      setTimeout(tick, 22);
    }
  };
  tick();
}

new IntersectionObserver((entries, obs) => {
  if (entries[0].isIntersecting) {
    typeEditor();
    obs.disconnect();
  }
}, { threshold: 0.35 }).observe(editor);

// ---------- Brilho que segue o mouse nos cards ----------
document.querySelectorAll(".glow").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

// ---------- Easter egg: código Konami (↑ ↑ ↓ ↓ ← → ← → B A) ----------
// O site treme e a tela "quebra" por alguns segundos.
const konami = ["arrowup","arrowup","arrowdown","arrowdown","arrowleft","arrowright","arrowleft","arrowright","b","a"];
let konamiStep = 0;
let screenBroken = false;

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();                 // aceita B/A com Caps Lock
  if (key === konami[konamiStep]) konamiStep++;
  else konamiStep = key === konami[0] ? 1 : 0;

  if (konamiStep === konami.length) {
    konamiStep = 0;
    breakScreen();
  }
});

const rand = (min, max) => min + Math.random() * (max - min);

// gera o desenho das rachaduras: linhas que saem do ponto de impacto + anéis de teia
function buildCracks(w, h) {
  const cx = w * rand(0.35, 0.65);
  const cy = h * rand(0.3, 0.6);
  const reach = Math.hypot(w, h);
  const rays = Math.round(rand(13, 18));
  const paths = [];
  const rayPoints = [];

  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + rand(-0.15, 0.15);
    const points = [[cx, cy]];
    let dist = 0;
    let a = angle;
    while (dist < reach) {
      dist += rand(30, 90);
      a += rand(-0.12, 0.12);                           // rachadura em zigue-zague
      points.push([cx + Math.cos(a) * dist, cy + Math.sin(a) * dist]);
    }
    rayPoints.push(points);
    paths.push({ d: "M" + points.map((p) => p.map(Math.round).join(" ")).join(" L"), width: rand(1, 2.2), delay: 0 });
  }

  // anéis que ligam rachaduras vizinhas (efeito de teia de aranha)
  [2, 4, 7, 11].forEach((ring, r) => {
    for (let i = 0; i < rays; i++) {
      if (Math.random() < 0.25) continue;               // nem todo anel fecha
      const a = rayPoints[i][Math.min(ring, rayPoints[i].length - 1)];
      const b = rayPoints[(i + 1) % rays][Math.min(ring + (Math.random() < 0.5 ? 1 : 0), rayPoints[(i + 1) % rays].length - 1)];
      const mx = (a[0] + b[0]) / 2 + rand(-12, 12);
      const my = (a[1] + b[1]) / 2 + rand(-12, 12);
      paths.push({
        d: `M${Math.round(a[0])} ${Math.round(a[1])} Q${Math.round(mx)} ${Math.round(my)} ${Math.round(b[0])} ${Math.round(b[1])}`,
        width: rand(0.6, 1.4),
        delay: 0.08 + r * 0.06,
      });
    }
  });

  return { cx, cy, paths };
}

function breakScreen() {
  if (screenBroken) return;
  screenBroken = true;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const { cx, cy, paths } = buildCracks(w, h);

  const lines = paths.map((p) =>
    `<path d="${p.d}" pathLength="1" class="crack-shadow" stroke-width="${(p.width + 1.5).toFixed(1)}" style="animation-delay:${p.delay}s"/>` +
    `<path d="${p.d}" pathLength="1" class="crack-line" stroke-width="${p.width.toFixed(1)}" style="animation-delay:${p.delay}s"/>`
  ).join("");

  const overlay = document.createElement("div");
  overlay.className = "crack-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="crack-flash" style="--x:${cx}px; --y:${cy}px"></div>
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <radialGradient id="impact">
          <stop offset="0" stop-color="#fff" stop-opacity=".9"/>
          <stop offset=".35" stop-color="#fff" stop-opacity=".25"/>
          <stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="70" fill="url(#impact)" class="crack-impact"/>
      ${lines}
    </svg>`;
  document.body.appendChild(overlay);

  // site treme (e o celular vibra, se suportar)
  if (!reduceMotion) document.querySelector(".layout").classList.add("shake");
  if (navigator.vibrate) navigator.vibrate([80, 40, 120]);

  setTimeout(() => document.querySelector(".layout").classList.remove("shake"), 700);
  setTimeout(() => overlay.classList.add("fade"), 3200);
  setTimeout(() => {
    overlay.remove();
    screenBroken = false;
  }, 4000);

  console.log("🎮 Você quebrou a tela! Brincadeira, tá tudo bem. Obrigado por visitar a hgsDevv.");
}
