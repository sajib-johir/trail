(() => {
  const groupsIndex = window.GROUPS_INDEX || [];
  const groupDataMap = window.GROUP_DATA || {};

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const page = document.body.dataset.page;

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  }
  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function cleanText(value) {
    return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  function extractMarkdownInfo(raw, matcher) {
    const lines = String(raw || "").split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\*\*([^*:\n]+):\*\*\s*(.*)$/);
      if (!m) continue;
      const label = cleanText(m[1]).trim().toLowerCase();
      if (matcher(label)) return String(m[2] || "").trim();
    }
    return "";
  }
  function renderPreviewLine(label, value, extraClass = "") {
    if (!value) return "";
    return `<p class="word-summary preview-line ${extraClass}"><span>${escapeHTML(label)}</span><b>${inlineMarkdown(escapeHTML(value))}</b></p>`;
  }
  function slugWord(word) { return String(word || "word").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function getGroupKey(groupNumber, suffix) { return `gregmat_group_${String(groupNumber).padStart(2,"0")}_${suffix}`; }

  function getLearnedSet(groupNumber) {
    try { return new Set(JSON.parse(localStorage.getItem(getGroupKey(groupNumber, "learned_words")) || "[]")); }
    catch { return new Set(); }
  }
  function saveLearnedSet(groupNumber, set) {
    localStorage.setItem(getGroupKey(groupNumber, "learned_words"), JSON.stringify([...set]));
    localStorage.setItem("gregmat_last_opened_group", String(groupNumber));
  }
  function getMiniScore(groupNumber) {
    try { return JSON.parse(localStorage.getItem(getGroupKey(groupNumber, "mini_exam_score")) || "null"); }
    catch { return null; }
  }

  function statusPill(label, status) {
    const cls = status === "available" ? "available" : "coming";
    const text = status === "available" ? "Available" : "Coming Soon";
    return `<span class="status-pill ${cls}">${escapeHTML(label)}: ${text}</span>`;
  }
  function makeGroupUrl(n, hash = "") { return `group.html?group=${n}${hash}`; }

  function renderHomePage() {
    const grid = $("#groupGrid");
    if (!grid) return;
    const available = groupsIndex.filter(g => g.lessonStatus === "available").length;
    $("#availableGroups").textContent = available;
    updateOverallProgress();
    grid.innerHTML = groupsIndex.map(group => renderGroupCard(group)).join("");
    $("#groupSearch")?.addEventListener("input", filterGroupCards);
    $("#continueBtn")?.addEventListener("click", () => {
      const last = localStorage.getItem("gregmat_last_opened_group") || "1";
      location.href = makeGroupUrl(last);
    });
    $("#resetProgressBtn")?.addEventListener("click", () => {
      if (!confirm("Reset all saved vocabulary progress in this browser?")) return;
      Object.keys(localStorage).filter(k => k.startsWith("gregmat_")).forEach(k => localStorage.removeItem(k));
      updateOverallProgress();
      renderHomePage();
    });
    $$("[data-coming]").forEach(btn => btn.addEventListener("click", e => {
      e.preventDefault();
      const groupNo = btn.getAttribute("data-coming");
      alert(`Group ${groupNo} is not ready yet. This group will be added after the vocabulary lesson data is completed.`);
    }));
  }

  function renderGroupCard(group) {
    const available = group.lessonStatus === "available";
    const learned = getLearnedSet(group.groupNumber).size;
    const miniScore = getMiniScore(group.groupNumber);
    const progress = available ? Math.round((learned / 30) * 100) : 0;
    const lessonBtn = available
      ? `<a class="btn primary-btn" href="${makeGroupUrl(group.groupNumber)}">Open Lesson</a>`
      : `<button class="btn disabled-btn" data-coming="${group.groupNumber}" type="button">Coming Soon</button>`;
    const miniBtn = available
      ? `<a class="btn secondary-btn" href="${makeGroupUrl(group.groupNumber, "#mini-exam")}">Mini Exam</a>`
      : `<button class="btn disabled-btn" data-coming="${group.groupNumber}" type="button">Mini Exam Soon</button>`;
    const fullBtn = group.fullExamStatus === "available" && group.fullExamLink
      ? `<a class="btn secondary-btn" href="${escapeHTML(group.fullExamLink)}" target="_blank" rel="noopener">Full Exam</a>`
      : `<button class="btn disabled-btn" data-coming="${group.groupNumber}" type="button">Full Exam Soon</button>`;
    return `<article class="group-card" data-search="${escapeHTML([group.title, group.wordRange, group.lessonStatus, group.fullExamStatus].join(" ").toLowerCase())}">
      <div class="group-card-head"><div><span class="group-kicker">Group ${group.groupNumber}</span><h3>${escapeHTML(group.title)}</h3></div><span class="word-number">${group.groupNumber}</span></div>
      <p class="muted">${escapeHTML(group.wordRange)}</p>
      <div class="status-stack">${statusPill("Lesson", group.lessonStatus)}${statusPill("Mini Exam", group.miniExamStatus)}${statusPill("Full Exam", group.fullExamStatus)}</div>
      ${available ? `<div class="progress-shell"><div class="progress-bar" style="width:${progress}%"></div></div><p class="muted">${learned}/30 learned${miniScore ? ` • Mini exam: ${miniScore.score}/${miniScore.total}` : ""}</p>` : `<p class="muted">${escapeHTML(group.notes || "This group will be added later.")}</p>`}
      <div class="group-actions">${lessonBtn}${miniBtn}${fullBtn}</div>
    </article>`;
  }

  function filterGroupCards() {
    const q = $("#groupSearch").value.trim().toLowerCase();
    $$(".group-card").forEach(card => card.hidden = q && !card.dataset.search.includes(q));
  }

  function updateOverallProgress() {
    const availableGroups = groupsIndex.filter(g => g.lessonStatus === "available");
    const total = availableGroups.length * 30;
    const learned = availableGroups.reduce((sum, g) => sum + getLearnedSet(g.groupNumber).size, 0);
    const pct = total ? Math.round((learned / total) * 100) : 0;
    const bar = $("#overallProgressBar");
    const text = $("#overallProgressText");
    if (bar) bar.style.width = pct + "%";
    if (text) text.textContent = `${learned}/${total} available words learned in this browser (${pct}%).`;
  }

  function getGroupNumberFromUrl() {
    return Number(new URLSearchParams(location.search).get("group") || "1");
  }

  function renderGroupPage() {
    const groupNumber = getGroupNumberFromUrl();
    const meta = groupsIndex.find(g => g.groupNumber === groupNumber);
    const data = groupDataMap[groupNumber];
    if (!meta || meta.lessonStatus !== "available" || !data) {
      showNotReady(groupNumber);
      return;
    }
    document.title = `${data.title} | GRE Vocabulary Portal`;
    $("#groupEyebrow").textContent = `Group ${data.groupNumber}`;
    $("#groupTitle").textContent = data.title;
    $("#groupSubTitle").textContent = `${data.wordRange} • ${data.totalWords} complete word lessons`;
    ["#groupControls", "#wordNav", "#revisionSection", "#mini-exam", "#fullExamSection", "#groupFooterNav"].forEach(id => $(id)?.classList.remove("hidden"));
    renderWordNav(data);
    renderWordCards(data);
    renderRevision(data);
    renderMiniExam(data);
    setupFullExamButton(meta);
    setupGroupControls(data);
    updateGroupProgress(data);
    setupFooterNav(groupNumber);
    if (location.hash === "#mini-exam") setTimeout(() => $("#mini-exam")?.scrollIntoView({behavior:"smooth", block:"start"}), 120);
  }

  function showNotReady(groupNumber) {
    const box = $("#notReadyMessage");
    box.classList.remove("hidden");
    box.innerHTML = `<h2>Group ${escapeHTML(groupNumber)} is not ready yet.</h2><p class="muted">This group will be added after the vocabulary lesson data is completed.</p><p><a class="btn primary-btn" href="index.html">Back to Home</a></p>`;
    $("#groupTitle").textContent = `Group ${groupNumber}`;
    $("#groupSubTitle").textContent = "Coming Soon";
  }

  function renderWordNav(data) {
    const nav = $("#wordNav");
    nav.innerHTML = data.words.map(w => `<a href="#word-${w.number}-${slugWord(w.word)}">${w.number}. ${escapeHTML(w.word)}</a>`).join("");
  }

  function renderWordCards(data) {
    const learned = getLearnedSet(data.groupNumber);
    $("#wordCards").innerHTML = data.words.map(w => {
      const isLearned = learned.has(String(w.number));
      const synonyms = (w.greSynonyms || []).slice(0,5).map(s => `<span class="tag gre">${escapeHTML(s)}</span>`).join("");
      const antonyms = (w.antonyms || []).slice(0,6).map(s => `<span class="tag antonym">${escapeHTML(s)}</span>`).join("");
      const basic = (w.basicSynonyms || []).slice(0,6).map(s => `<span class="tag basic">${escapeHTML(s)}</span>`).join("");
      return `<article class="word-card" id="word-${w.number}-${slugWord(w.word)}" data-word-card data-search="${escapeHTML(searchBlob(w))}">
        <div class="word-card-header">
          <span class="word-number">${w.number}</span>
          <div>
            <h2 class="word-title">${escapeHTML(w.word)}</h2>
            <span class="part-of-speech">${escapeHTML(w.partOfSpeech || "Part of speech")}</span>
            <div class="word-preview-stack">
              ${renderPreviewLine("Core meaning", w.coreMeaning || "", "preview-core")}
              ${renderPreviewLine("Root story", extractMarkdownInfo(w.rawMarkdown, label => label.includes("root story")), "preview-root")}
              ${renderPreviewLine("Simple explanation", extractMarkdownInfo(w.rawMarkdown, label => label.includes("simple explanation")), "preview-simple")}
            </div>
            ${synonyms ? `<div class="tag-row premium-tag-row" aria-label="GRE synonyms"><span class="tag-label">GRE synonyms:</span>${synonyms}</div>` : ""}
          </div>
          <div class="learn-row">
            <button class="btn secondary-btn learn-btn ${isLearned ? "selected" : ""}" type="button" data-learn-word="${w.number}">${isLearned ? "Learned ✓" : "Mark Learned"}</button>
            <button class="btn primary-btn toggle-word" type="button">Open</button>
          </div>
        </div>
        <div class="word-detail">
          <div class="detail-tag-section detail-tag-section-top">
            <div class="tag-section-title"><span>Word relationship map</span><small>Synonyms and opposites for fast recall</small></div>
            ${synonyms ? `<div class="detail-tag-group"><span class="tag-label">GRE synonyms:</span><div class="tag-row">${synonyms}</div></div>` : ""}
            ${basic ? `<div class="detail-tag-group"><span class="tag-label basic-label">Basic synonyms:</span><div class="tag-row">${basic}</div></div>` : ""}
            ${antonyms ? `<div class="detail-tag-group"><span class="tag-label antonym-label">Antonyms:</span><div class="tag-row">${antonyms}</div></div>` : ""}
          </div>
          <div class="lesson-body"><div class="lesson-body-title"><span>Complete study notes</span><small>Read slowly, then revise examples</small></div>${renderMarkdown(w.rawMarkdown, w)}</div>
          ${w.finalMemory && !/final\s+memory/i.test(w.rawMarkdown || "") ? `<div class="memory-box"><strong>Final Memory:</strong> ${escapeHTML(w.finalMemory)}</div>` : ""}
        </div>
      </article>`;
    }).join("");

    $$(".toggle-word").forEach(btn => btn.addEventListener("click", () => {
      const card = btn.closest(".word-card");
      card.classList.toggle("open");
      btn.textContent = card.classList.contains("open") ? "Close" : "Open";
    }));
    $$("[data-learn-word]").forEach(btn => btn.addEventListener("click", () => {
      const set = getLearnedSet(data.groupNumber);
      const id = btn.dataset.learnWord;
      if (set.has(id)) set.delete(id); else set.add(id);
      saveLearnedSet(data.groupNumber, set);
      renderWordCards(data);
      updateGroupProgress(data);
    }));
  }

  function searchBlob(w) {
    return [w.word, w.coreMeaning, w.banglaMeaning, w.partOfSpeech, ...(w.greSynonyms||[]), ...(w.basicSynonyms||[]), ...(w.antonyms||[]), ...(w.commonUsage||[]), w.rawMarkdown].join(" ").toLowerCase();
  }

  function setupGroupControls(data) {
    $("#expandAllBtn")?.addEventListener("click", () => {
      $$(".word-card").forEach(c => c.classList.add("open"));
      $$(".toggle-word").forEach(b => b.textContent = "Close");
    });
    $("#collapseAllBtn")?.addEventListener("click", () => {
      $$(".word-card").forEach(c => c.classList.remove("open"));
      $$(".toggle-word").forEach(b => b.textContent = "Open");
    });
    $("#wordSearch")?.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      let shown = 0;
      $$("[data-word-card]").forEach(card => {
        const match = !q || card.dataset.search.includes(q);
        card.hidden = !match;
        if (match) shown += 1;
      });
      let msg = $("#noWordMatch");
      if (!msg) {
        msg = document.createElement("div"); msg.id = "noWordMatch"; msg.className = "card"; $("#wordCards").after(msg);
      }
      msg.classList.toggle("hidden", shown !== 0);
      msg.innerHTML = shown ? "" : `<h3>No matching word found.</h3><p class="muted">Try searching by word, Bangla meaning, synonym, antonym, or usage.</p>`;
    });
  }

  function updateGroupProgress(data) {
    const learned = getLearnedSet(data.groupNumber).size;
    const pct = Math.round((learned / data.totalWords) * 100);
    $("#learnedCounter").textContent = `${learned}/${data.totalWords} learned`;
    $("#groupProgressBar").style.width = pct + "%";
    const score = getMiniScore(data.groupNumber);
    $("#miniScoreText").textContent = score ? `Mini exam: ${score.score}/${score.total} (${score.percent}%). Weak words: ${score.weakWords.join(", ") || "None"}` : "Mini exam not taken yet.";
  }

  function renderRevision(data) {
    const items = data.revisionSummary || [];
    $("#revisionSection").innerHTML = `<h2>Quick Revision Table</h2><p class="muted">Use this table after studying the full cards.</p><div class="revision-grid">${items.map(item => `<div class="revision-item"><strong>${escapeHTML(item.word)}</strong><p>${escapeHTML(item.meaning || "")}</p><p class="bangla" lang="bn">${escapeHTML(item.bangla || "")}</p><div class="tag-row">${(item.keySynonyms||[]).map(s => `<span class="tag">${escapeHTML(s)}</span>`).join("")}${item.antonym ? `<span class="tag antonym">${escapeHTML(item.antonym)}</span>` : ""}</div></div>`).join("")}</div>`;
  }

  function setupFullExamButton(group) {
    const section = $("#fullExamSection");
    const active = group.fullExamStatus === "available" && group.fullExamLink;
    section.innerHTML = `<h2>Full Group Exam</h2><p class="muted">Take the complete EPort-style exam for this group after finishing the lesson and mini exam.</p><div class="hero-actions">${active ? `<a class="btn primary-btn" href="${escapeHTML(group.fullExamLink)}" target="_blank" rel="noopener">Take Full Group ${group.groupNumber} Exam</a>` : `<button class="btn disabled-btn" id="fullExamDisabled" type="button">Full Exam Coming Soon</button>`}</div>`;
    $("#fullExamDisabled")?.addEventListener("click", () => alert("The full EPort-style exam for this group is not added yet."));
  }

  function setupFooterNav(groupNumber) {
    const prev = $("#prevGroupBtn"), next = $("#nextGroupBtn");
    const prevMeta = groupsIndex.find(g => g.groupNumber === groupNumber - 1 && g.lessonStatus === "available");
    const nextMeta = groupsIndex.find(g => g.groupNumber === groupNumber + 1 && g.lessonStatus === "available");
    if (prevMeta) { prev.href = makeGroupUrl(prevMeta.groupNumber); prev.classList.remove("disabled-btn"); } else { prev.href = "index.html"; prev.textContent = "Back Home"; }
    if (nextMeta) { next.href = makeGroupUrl(nextMeta.groupNumber); next.textContent = `Next: Group ${nextMeta.groupNumber}`; }
    else { next.href = "index.html"; next.textContent = "Back to Home"; }
  }

  function renderMiniExam(data) {
    const box = $("#mini-exam");
    const qs = data.miniExam || [];
    box.innerHTML = `<h2>Built-in Mini Exam</h2><p class="muted">Quick revision exam for ${escapeHTML(data.title)}. Related words are shown after submission only.</p><div class="hero-actions"><button class="btn primary-btn" id="startMiniBtn" type="button">Start Mini Exam</button><button class="btn secondary-btn" id="resetMiniBtn" type="button">Clear Mini Exam</button></div><div id="miniExamArea"></div>`;
    $("#startMiniBtn").addEventListener("click", () => startMiniExam(data, qs));
    $("#resetMiniBtn").addEventListener("click", () => { localStorage.removeItem(getGroupKey(data.groupNumber,"mini_exam_score")); updateGroupProgress(data); $("#miniExamArea").innerHTML = ""; });
  }

  function startMiniExam(data, qs) {
    const area = $("#miniExamArea");
    const answers = {};
    area.innerHTML = `<div class="quiz-list">${qs.map((q,i) => `<div class="quiz-question" data-q="${i}"><h4>Question ${i+1}</h4><p>${escapeHTML(q.question)}</p><div class="option-grid">${q.options.map((op,idx) => `<button class="btn option-btn" type="button" data-q="${i}" data-option="${escapeHTML(op)}"><strong>${String.fromCharCode(65+idx)}.</strong>&nbsp; ${escapeHTML(op)}</button>`).join("")}</div></div>`).join("")}</div><div class="hero-actions"><button class="btn primary-btn" id="submitMiniBtn" type="button">Submit Mini Exam</button></div><div id="miniResult"></div>`;
    $$(".option-btn", area).forEach(btn => btn.addEventListener("click", () => {
      const qid = btn.dataset.q;
      answers[qid] = btn.dataset.option;
      $$(`.option-btn[data-q="${qid}"]`, area).forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    }));
    $("#submitMiniBtn").addEventListener("click", () => submitMiniExam(data, qs, answers));
  }

  function submitMiniExam(data, qs, answers) {
    let score = 0;
    const wordStats = {};
    const results = qs.map((q,i) => {
      const student = answers[i] || "Not answered";
      const correct = String(student).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
      if (correct) score++;
      const w = q.relatedWord || "Unknown";
      wordStats[w] = wordStats[w] || {right:0,total:0};
      wordStats[w].total++;
      if (correct) wordStats[w].right++;
      return {q, student, correct};
    });
    const total = qs.length;
    const percent = Math.round((score / total) * 100);
    const strongWords = Object.entries(wordStats).filter(([,v]) => v.right === v.total).map(([w]) => w);
    const weakWords = Object.entries(wordStats).filter(([,v]) => v.right < v.total).map(([w]) => w);
    localStorage.setItem(getGroupKey(data.groupNumber, "mini_exam_score"), JSON.stringify({score,total,percent,strongWords,weakWords,date:new Date().toISOString()}));
    updateGroupProgress(data);
    $("#miniResult").innerHTML = `<div class="card section-gap"><h3>Mini Exam Result: ${score}/${total} (${percent}%)</h3><p class="muted">Performance: ${percent >= 85 ? "Excellent" : percent >= 70 ? "Good" : percent >= 50 ? "Needs Revision" : "Review Again"}</p><h4>Question Review</h4>${results.map((r,i) => `<div class="result-line ${r.correct ? "correct" : "wrong"}"><strong>Q${i+1}: ${r.correct ? "Correct" : "Not Correct"}</strong><p>${escapeHTML(r.q.question)}</p><p><strong>Your answer:</strong> ${escapeHTML(r.student)}</p><p><strong>Correct answer:</strong> ${escapeHTML(r.q.answer)}</p><p><strong>Related word:</strong> ${escapeHTML(r.q.relatedWord)}</p></div>`).join("")}<h4>Strong Words</h4><div class="word-bucket">${strongWords.map(w => `<span class="tag">${escapeHTML(w)}</span>`).join("") || '<span class="muted">None yet</span>'}</div><h4>Weak Words</h4><div class="word-bucket">${weakWords.map(w => `<span class="tag antonym">${escapeHTML(w)}</span>`).join("") || '<span class="muted">None</span>'}</div></div>`;
  }

  function renderMarkdown(raw, word) {
    raw = String(raw || "").replace(/^#{1,3}\s+\d+\.\s+.+\n?/, "").trim();
    const lines = raw.split(/\r?\n/);
    let html = "";
    let listItems = [];
    let listClass = "";
    let currentSection = "";
    function flushList() {
      if (!listItems.length) return;
      const cls = listClass ? ` class="${listClass}"` : "";
      html += `<ol${cls}>${listItems.join("")}</ol>`;
      listItems = []; listClass = "";
    }
    for (let rawLine of lines) {
      const line = rawLine.trimEnd();
      if (!line.trim()) { flushList(); continue; }
      if (/^---+$/.test(line.trim())) { flushList(); html += "<hr />"; continue; }
      const labelLine = line.match(/^\*\*([^*:\n]+):\*\*\s*(.*)$/);
      if (labelLine) {
        flushList();
        const label = cleanText(labelLine[1]).trim();
        const labelKey = label.toLowerCase();
        if (labelKey.includes("gre synonyms") || labelKey.includes("basic synonyms") || labelKey === "antonyms") {
          continue;
        }
        let value = inlineMarkdown(escapeHTML(labelLine[2] || ""));
        const rowClass = getInfoLineClass(labelKey);
        const valueAttrs = labelKey.includes("bangla") ? ' lang="bn"' : "";
        if (labelKey.includes("final memory")) {
          html += `<div class="memory-box"><span class="box-label">Final memory</span><div>${value}</div></div>`;
        } else if (labelKey.includes("common mistake")) {
          html += `<div class="common-mistake-box"><span class="box-label">Common mistake</span><div>${value}</div></div>`;
        } else {
          html += `<div class="info-line ${rowClass}"><span class="info-label">${escapeHTML(label)}</span><span class="info-value"${valueAttrs}>${value}</span></div>`;
        }
        continue;
      }
      const h = line.match(/^(#{1,4})\s+(.+)$/);
      if (h) {
        flushList();
        currentSection = cleanText(h[2]).toLowerCase();
        const tag = h[1].length <= 2 ? "h3" : "h4";
        html += `<${tag}>${inlineMarkdown(escapeHTML(h[2]))}</${tag}>`;
        continue;
      }
      const li = line.match(/^\s*\d+\.\s+(.+)$/);
      if (li) {
        let cls = "";
        if (currentSection.includes("synonym")) cls = "synonym-example-list";
        else if (currentSection.includes("example")) cls = "example-list";
        if (!listClass) listClass = cls;
        let item = inlineMarkdown(escapeHTML(li[1]));
        if (cls === "example-list") item = highlightFocusTerms(item, getWordVariants(word.word), "focus-word");
        if (cls === "synonym-example-list") item = highlightFocusTerms(item, [...(word.greSynonyms||[]), ...(word.basicSynonyms||[])], "focus-word synonym-focus");
        listItems.push(`<li>${item}</li>`);
        continue;
      }
      if (/^\s+/.test(rawLine) && listItems.length) {
        let continuation = inlineMarkdown(escapeHTML(line.trim()));
        if (listClass === "example-list") continuation = highlightFocusTerms(continuation, getWordVariants(word.word), "focus-word");
        if (listClass === "synonym-example-list") continuation = highlightFocusTerms(continuation, [...(word.greSynonyms||[]), ...(word.basicSynonyms||[])], "focus-word synonym-focus");
        listItems[listItems.length - 1] = listItems[listItems.length - 1].replace(/<\/li>$/, `<br>${continuation}</li>`);
        continue;
      }
      flushList();
      const isFinal = /final memory/i.test(line);
      const isMistake = /common mistake/i.test(line);
      let paragraph = inlineMarkdown(escapeHTML(line));
      if (isFinal) html += `<div class="memory-box">${paragraph}</div>`;
      else if (isMistake) html += `<div class="common-mistake-box">${paragraph}</div>`;
      else html += `<p>${paragraph}</p>`;
    }
    flushList();
    return html;
  }

  function getInfoLineClass(labelKey) {
    if (labelKey.includes("pronunciation")) return "info-pronunciation";
    if (labelKey.includes("part of speech")) return "info-pos";
    if (labelKey.includes("core meaning")) return "info-core";
    if (labelKey.includes("bangla")) return "info-bangla info-line-bangla";
    if (labelKey.includes("root story") || labelKey.includes("etymology")) return "info-root";
    if (labelKey.includes("simple explanation")) return "info-simple";
    if (labelKey.includes("memory hook")) return "info-hook";
    if (labelKey.includes("common usage")) return "info-usage";
    if (labelKey.includes("confusing")) return "info-confusing";
    return "info-general";
  }

  function inlineMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  function getWordVariants(word) {
    const w = String(word || "").trim();
    if (!w) return [];
    const lower = w.toLowerCase();
    const variants = new Set([w, lower]);
    variants.add(lower + "s");
    variants.add(lower + "es");
    variants.add(lower + "ed");
    variants.add(lower + "ing");
    variants.add(lower + "ly");
    variants.add(lower + "ness");
    if (lower.endsWith("e")) { variants.add(lower + "d"); variants.add(lower.slice(0,-1) + "ing"); }
    if (lower.endsWith("y")) { variants.add(lower.slice(0,-1) + "ies"); }
    return [...variants].filter(Boolean).sort((a,b) => b.length - a.length);
  }

  function highlightFocusTerms(html, terms, className = "focus-word") {
    const cleanTerms = [...new Set((terms || []).filter(Boolean).map(String))]
      .filter(t => t.length > 2)
      .sort((a,b) => b.length - a.length);
    if (!html || !cleanTerms.length) return html;
    const pattern = new RegExp(`\\b(${cleanTerms.map(escapeRegExp).join("|")})\\b`, "gi");
    return html.split(/(<[^>]+>)/g).map(part => part.startsWith("<") ? part : part.replace(pattern, `<strong class="${className}">$1</strong>`)).join("");
  }



  function setupScrollTopButton() {
    if (document.getElementById("scrollTopBtn")) return;
    const btn = document.createElement("button");
    btn.id = "scrollTopBtn";
    btn.className = "scroll-top-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Move to top");
    btn.title = "Move to top";
    btn.textContent = "↑";
    document.body.appendChild(btn);
    const update = () => {
      btn.classList.toggle("visible", window.scrollY > 420);
    };
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  setupScrollTopButton();
  if (page === "home") renderHomePage();
  if (page === "group") renderGroupPage();
})();
