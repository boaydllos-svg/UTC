(function () {
  const STORAGE_KEY = "simple-diary-entries-v1";

  /** @typedef {{ id: string, date: string, title: string, body: string, updatedAt: string }} DiaryEntry */

  const form = document.getElementById("entry-form");
  const dateInput = document.getElementById("entry-date");
  const titleInput = document.getElementById("entry-title");
  const bodyInput = document.getElementById("entry-body");
  const saveBtn = document.getElementById("save-btn");
  const cancelEditBtn = document.getElementById("cancel-edit");
  const listEl = document.getElementById("entry-list");
  const emptyHint = document.getElementById("empty-hint");
  const searchInput = document.getElementById("search");

  /** @type {string | null} */
  let editingId = null;

  function todayISODate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /** @returns {DiaryEntry[]} */
  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** @param {DiaryEntry[]} entries */
  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function sortEntries(entries) {
    return [...entries].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  /**
   * @param {string} tag
   * @param {string} [className]
   * @param {string} [text]
   */
  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function previewText(body, max) {
    const oneLine = body.replace(/\s+/g, " ").trim();
    if (oneLine.length <= max) return oneLine;
    return oneLine.slice(0, max) + "…";
  }

  /** @param {DiaryEntry} entry */
  function matchesSearch(entry, q) {
    if (!q) return true;
    const hay = `${entry.title} ${entry.body}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function render() {
    const q = searchInput.value.trim();
    const all = sortEntries(loadEntries());
    const filtered = all.filter((e) => matchesSearch(e, q));

    listEl.innerHTML = "";
    emptyHint.hidden = filtered.length > 0;

    for (const entry of filtered) {
      const li = document.createElement("li");
      li.className = "entry-item";
      li.tabIndex = 0;
      if (entry.id === editingId) li.classList.add("active");

      const displayTitle = entry.title.trim() || "（无标题）";
      const meta = el("div", "entry-meta");
      const titleP = el("p", "entry-title", displayTitle);
      const dateSpan = el("span", "entry-date", entry.date);
      meta.append(titleP, dateSpan);

      const preview = el("p", "entry-preview", previewText(entry.body, 120));

      const actions = el("div", "entry-actions");
      const delBtn = el("button", "btn danger", "删除");
      delBtn.type = "button";
      actions.appendChild(delBtn);

      li.append(meta, preview, actions);

      li.addEventListener("click", (ev) => {
        if (ev.target === delBtn || delBtn.contains(/** @type {Node} */ (ev.target)))
          return;
        startEdit(entry.id);
      });

      li.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          startEdit(entry.id);
        }
      });

      delBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (confirm("确定删除这条日记？")) removeEntry(entry.id);
      });

      listEl.appendChild(li);
    }
  }

  function resetForm() {
    editingId = null;
    dateInput.value = todayISODate();
    titleInput.value = "";
    bodyInput.value = "";
    saveBtn.textContent = "保存";
    cancelEditBtn.hidden = true;
    render();
  }

  /** @param {string} id */
  function startEdit(id) {
    const entries = loadEntries();
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    editingId = id;
    dateInput.value = entry.date;
    titleInput.value = entry.title;
    bodyInput.value = entry.body;
    saveBtn.textContent = "更新";
    cancelEditBtn.hidden = false;
    render();
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /** @param {string} id */
  function removeEntry(id) {
    const entries = loadEntries().filter((e) => e.id !== id);
    saveEntries(entries);
    if (editingId === id) resetForm();
    else render();
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const date = dateInput.value;
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    if (!date || !body) return;

    const now = new Date().toISOString();
    let entries = loadEntries();

    if (editingId) {
      entries = entries.map((e) =>
        e.id === editingId
          ? { ...e, date, title, body, updatedAt: now }
          : e
      );
    } else {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `id-${now}-${Math.random().toString(36).slice(2)}`;
      entries.push({ id, date, title, body, updatedAt: now });
    }

    saveEntries(entries);
    resetForm();
  });

  cancelEditBtn.addEventListener("click", () => {
    resetForm();
  });

  searchInput.addEventListener("input", () => {
    render();
  });

  dateInput.value = todayISODate();
  render();
})();
