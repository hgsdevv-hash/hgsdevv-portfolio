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

// ---------- Easter egg: código Konami ----------
const konami = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
let konamiStep = 0;

document.addEventListener("keydown", (event) => {
  konamiStep = event.key === konami[konamiStep] ? konamiStep + 1 : 0;
  if (konamiStep === konami.length) {
    konamiStep = 0;
    document.body.animate(
      [{ filter: "hue-rotate(0deg)" }, { filter: "hue-rotate(360deg)" }],
      { duration: 1500 }
    );
    console.log("🎮 +30 vidas! Obrigado por visitar a hgsDevv.");
  }
});
