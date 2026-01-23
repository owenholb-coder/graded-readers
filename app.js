const elLang = document.getElementById("lang");
const elLevel = document.getElementById("level");
const elGenre = document.getElementById("genre");
const elSort = document.getElementById("sort");
const elQ = document.getElementById("q");
const elBooks = document.getElementById("books");
const elSummary = document.getElementById("summary");

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d) {
  return new Date(d.getFullYear(), 0, 1);
}

function sumActivitySince(events, sinceDate) {
  const since = sinceDate.getTime();
  let words = 0;
  let secs = 0;

  for (const e of events) {
    const t = Date.parse(e.ts);
    if (!Number.isFinite(t) || t < since) continue;
    words += Number(e.words) || 0;
    secs += Number(e.listened_seconds) || 0;
  }
  return { words, secs };
}

function fmtDuration(secs) {
  const mins = Math.round(secs / 60);
  if (mins < 90) return `${mins} min`;
  return `${(mins / 60).toFixed(1)} h`;
}

function renderProgressSummary(container) {
  if (!container || typeof loadActivity !== "function") return;

  const events = loadActivity();
  if (!events.length) return;

  const now = new Date();

  const rows = [
    ["Today", startOfDay(now)],
    ["This week", startOfWeek(now)],
    ["This month", startOfMonth(now)],
    ["This year", startOfYear(now)],
    ["All time", new Date(0)],
  ];

  const html = rows.map(([label, since]) => {
    const { words, secs } = sumActivitySince(events, since);
    if (!words && !secs) return null;
    return `
      <div class="small">
        <strong>${label}:</strong>
        ${words.toLocaleString()} words · ${fmtDuration(secs)}
      </div>`;
  }).filter(Boolean).join("");

  if (!html) return;

  container.insertAdjacentHTML(
    "beforeend",
    `<div style="margin-top:10px">${html}</div>`
  );
}


function uniq(arr) {
  return [...new Set(arr)].filter(Boolean);
}

function normalize(s) {
  return (s || "").toString().trim().toLowerCase();
}

function getUserKey(bookId) {
  return `ratings:${bookId}`;
}

function loadUserRatings(bookId) {
  try {
    return JSON.parse(localStorage.getItem(getUserKey(bookId)) || "{}");
  } catch {
    return {};
  }
}

function saveUserRatings(bookId, obj) {
  localStorage.setItem(getUserKey(bookId), JSON.stringify(obj));
}

function stars(n) {
  const x = Math.max(0, Math.min(5, Number(n) || 0));
  return "★".repeat(x) + "☆".repeat(5 - x);
}

function buildSelect(el, values, allLabel) {
  el.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = allLabel;
  el.appendChild(optAll);

  values.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v.toUpperCase ? v.toUpperCase() : v;
    el.appendChild(o);
  });
}

function getTtsRatePref() {
  const r = parseFloat(localStorage.getItem("ttsRate") || "0.85");
  return Number.isFinite(r) ? Math.max(0.3, Math.min(1.2, r)) : 0.85;
}

function fmtInt(n) {
  const x = Number(n) || 0;
  return x.toLocaleString();
}

function fmtMins(mins) {
  const m = Math.max(0, Math.round(mins));
  if (m < 90) return `${m} min`;
  return `${Math.round(m / 60)} h`;
}

function estListenMinutes(wordCount, rate) {
  // Baseline listening speed at rate=1.0
  const baselineWpm = 150;
  const wc = Number(wordCount) || 0;
  if (!wc) return null;
  return wc / (baselineWpm * rate);
}


function sortBooks(list, mode) {
  const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  const byDiff = (a, b) => (a.difficulty || 0) - (b.difficulty || 0);
  const byEnjDesc = (a, b) => (b.enjoyment || 0) - (a.enjoyment || 0);

  if (mode === "enj_desc_diff_asc") return [...list].sort((a,b) => byEnjDesc(a,b) || byDiff(a,b) || byTitle(a,b));
  if (mode === "title_asc") return [...list].sort(byTitle);
  return [...list].sort((a,b) => byDiff(a,b) || byEnjDesc(a,b) || byTitle(a,b));
}

function render(booksAll) {
  const lang = normalize(elLang.value);
  const level = normalize(elLevel.value);
  const genre = normalize(elGenre.value);
  const q = normalize(elQ.value);

  let list = booksAll.filter(b => {
    if (lang && normalize(b.language) !== lang) return false;
    if (level && normalize(b.level) !== level) return false;
    if (genre) {
      const gs = (b.genre || []).map(normalize);
      if (!gs.includes(genre)) return false;
    }
    if (q && !normalize(b.title).includes(q)) return false;
    return true;
  });

  list = sortBooks(list, elSort.value);

  elSummary.textContent = `${list.length} book(s) shown`;

  elBooks.innerHTML = "";
  for (const b of list) {
    const card = document.createElement("div");
    card.className = "card";

    const t = document.createElement("div");
    t.className = "title";
    const a = document.createElement("a");
    a.href = `reader.html?path=${encodeURIComponent(b.path)}`;
    a.textContent = b.title;
    t.appendChild(a);

    const meta = document.createElement("div");
    meta.className = "meta";

    const g = (b.genre || []).join(", ") || "—";
    const rate = getTtsRatePref();
    const wc = Number(b.word_count) || 0;
    const mins = estListenMinutes(wc, rate);

    const wcPart = wc ? `Words: ${fmtInt(wc)}` : `Words: —`;
    const timePart = mins ? `~${fmtMins(mins)} @ ${rate}×` : `Time: —`;

    meta.textContent =
        `${(b.language || "").toUpperCase()} · ${(b.level || "").toUpperCase()} · ${g} · ` +
        `${wcPart} · ${timePart}`;

    const row = document.createElement("div");
    row.className = "row";

    const pill1 = document.createElement("span");
    pill1.className = "pill";
    pill1.textContent = `Difficulty: ${stars(b.difficulty)}`;

    const pill2 = document.createElement("span");
    pill2.className = "pill";
    pill2.textContent = `Enjoyment: ${stars(b.enjoyment)}`;

    row.appendChild(pill1);
    row.appendChild(pill2);

    // Local user ratings (free; per-device)
    const user = loadUserRatings(b.id);
    const userDiff = document.createElement("button");
    userDiff.textContent = `Your difficulty: ${stars(user.difficulty || 0)}`;
    userDiff.title = "Click to cycle 0→5 (saved on this device)";
    userDiff.addEventListener("click", () => {
      const next = ((user.difficulty || 0) + 1) % 6;
      user.difficulty = next;
      saveUserRatings(b.id, user);
      render(booksAll);
    });

    const userEnj = document.createElement("button");
    userEnj.textContent = `Your enjoyment: ${stars(user.enjoyment || 0)}`;
    userEnj.title = "Click to cycle 0→5 (saved on this device)";
    userEnj.addEventListener("click", () => {
      const next = ((user.enjoyment || 0) + 1) % 6;
      user.enjoyment = next;
      saveUserRatings(b.id, user);
      render(booksAll);
    });

    row.appendChild(userDiff);
    row.appendChild(userEnj);

    card.appendChild(t);
    card.appendChild(meta);
    card.appendChild(row);

    elBooks.appendChild(card);
  }
}

function clearSupabaseAuthStorage() {
  // Project-specific key (your project ref is ookytzrplwzpqpqujhrk)
  try { localStorage.removeItem("sb-ookytzrplwzpqpqujhrk-auth-token"); } catch {}
  // Older/common keys (harmless if absent)
  try { localStorage.removeItem("supabase.auth.token"); } catch {}
  try { localStorage.removeItem("sb-auth-token"); } catch {}
}

function withTimeout(promise, ms = 2500) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("getSession timeout")), ms)),
  ]);
}

async function renderAuth() {
  const box = document.getElementById("authBox");
  if (!box) return;

  if (!window.sb?.auth) {
    box.innerHTML = `<div class="small">Auth unavailable: Supabase client not initialized.</div>`;
    return;
  }

  let authWasReset = false;

  // 1) Always render logged-out UI immediately (never leave the user “stuck”)
  box.innerHTML = `
    <input id="email" placeholder="Email for magic link"
      style="padding:10px;border:1px solid #ccc;border-radius:10px;min-width:260px;" />
    <button id="loginBtn">Send login link</button>
  `;

  document.getElementById("loginBtn").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    if (!email) return alert("Enter an email.");

    const redirectTo = window.location.origin + "/graded-readers/";
    const { error } = await window.sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) alert(error.message);
    else alert("Check your email for the sign-in link.");
  };

  

  // 2) Then try to upgrade to logged-in UI if a session exists
  let session = null;
  try {
    const res = await withTimeout(window.sb.auth.getSession(), 2500);
    session = res?.data?.session ?? null;
  } catch (err) {
    // If session storage is corrupted, self-heal
    const msg = String(err?.message || err || "");
    console.warn("Supabase getSession failed:", err);

    // Broad match: if it smells like token/session trouble, clear and stay logged out
    if (err?.name === "AbortError" || /refresh|jwt|token|session|invalid/i.test(msg)) {
      clearSupabaseAuthStorage();
      authWasReset = true;
    }
    session = null;
  }

  if (authWasReset) {
    box.insertAdjacentHTML(
      "beforeend",
      `<div class="small" style="margin-top:6px;color:#666">
        Your session expired — please sign in again.
       </div>`
    );
  }

  if (session) {
    box.innerHTML = `
      <div class="small">Signed in as ${session.user.email}</div>
      <button id="logoutBtn">Log out</button>
    `;
    document.getElementById("logoutBtn").onclick = () => window.sb.auth.signOut();
  }
  renderProgressSummary(box);

}



document.addEventListener("DOMContentLoaded", () => {
  window.sb?.auth?.onAuthStateChange(() => renderAuth());
  renderAuth();
});




async function main() {
  const res = await fetch("./catalog.json", { cache: "no-store" });
  if (!res.ok) {
    elSummary.textContent = "Could not load catalog.json";
    return;
  }
  const catalog = await res.json();
  const books = catalog.books || [];

  // Build filter options from catalog
  buildSelect(elLang, uniq(books.map(b => (b.language || "").toLowerCase())).sort(), "All languages");
  buildSelect(elLevel, uniq(books.map(b => (b.level || "").toLowerCase())).sort(), "All levels");
  buildSelect(elGenre, uniq(books.flatMap(b => (b.genre || []).map(g => g.toLowerCase()))).sort(), "All genres");

  const rerender = () => render(books);
  elLang.addEventListener("change", rerender);
  elLevel.addEventListener("change", rerender);
  elGenre.addEventListener("change", rerender);
  elSort.addEventListener("change", rerender);
  elQ.addEventListener("input", rerender);

  render(books);
}

main().catch(err => {
  console.error(err);
  elSummary.textContent = "Error loading library.";
});
