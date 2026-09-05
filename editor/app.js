const CHORD_BANKS = {
  C: ["C", "Dm", "Em", "F", "G", "Am", "Bdim", "G7"],
  G: ["C", "D", "Em", "F#dim", "G", "Am", "Bm", "D7"],
};

const PRESET_CHORDS = globalThis.D15_PRESET_CHORDS || [];
const PRESET_CHORD_SET = new Set(PRESET_CHORDS);

const DEFAULT_TICKS_PER_BEAT = 480;
const DEFAULT_GRID_FRACTION = 2; // 2 = half-beat grid.
const DRAFT_STORAGE_KEY = "d15.timeline.user-editor.draft";
const PREF_STORAGE_KEY = "d15.timeline.user-editor.pref";
const MAX_HISTORY = 80;

const exampleChart = {
  format: "d15.timeline.v1",
  title: "小星星",
  artist: "儿歌",
  bpm: 96,
  key: "C",
  originalKey: "",
  capo: 0,
  capoSource: "default",
  beatsPerBar: 2,
  beatUnit: 4,
  ticksPerBeat: 480,
  chordBank: "C",
  displayLines: [
    { startBar: 0, barCount: 2 },
    { startBar: 2, barCount: 2 },
  ],
  sections: [
    {
      name: "converted",
      bars: [
        {
          chords: [{ tick: 0, name: "C", durationTicks: 960 }],
          lyrics: [
            { tick: 0, text: "一" },
            { tick: 480, text: "闪" },
          ],
        },
        {
          chords: [{ tick: 0, name: "G", durationTicks: 960 }],
          lyrics: [
            { tick: 0, text: "亮" },
            { tick: 720, text: "晶" },
          ],
        },
        {
          chords: [{ tick: 0, name: "F", durationTicks: 480 }, { tick: 480, name: "G", durationTicks: 480 }],
          lyrics: [
            { tick: 0, text: "满" },
            { tick: 240, text: "天" },
            { tick: 480, text: "都" },
          ],
        },
        {
          chords: [{ tick: 0, name: "C", durationTicks: 960 }],
          lyrics: [
            { tick: 0, text: "是" },
            { tick: 240, text: "小" },
            { tick: 480, text: "星" },
          ],
        },
      ],
    },
  ],
};

const state = {
  chart: null,
  selection: null,
  workingBar: null,
  chordRange: null,
  lyricRange: null,
  barRange: null,
  lastChordSelectionPoint: null,
  lastLyricSelectionPoint: null,
  lastBarSelectionPoint: null,
  pendingChordRangeAnchor: null,
  pendingLyricRangeAnchor: null,
  chordClipboard: null,
  pxPerBeat: 72,
  gridFraction: DEFAULT_GRID_FRACTION,
  defaultChordDurationTicks: DEFAULT_TICKS_PER_BEAT * 2,
  selectedChordName: "C",
  quickChordPalette: [],
  drag: null,
  resize: null,
  timelinePan: null,
  suppressNextItemClick: false,
  history: [],
  redoStack: [],
  isRestoring: false,
  quickChord: {
    element: null,
    anchor: null,
    hideTimer: null,
    selectOpen: false,
  },
  chordEdit: {
    element: null,
    anchor: null,
  },
  laneChord: {
    element: null,
    anchor: null,
    hideTimer: null,
  },
  overviewMode: "bars",
  overviewLineRule: "auto",
  lastLyricsPasteText: "",
  lastChordsSequenceText: "",
  lastExportUrl: null,
};

const els = {
  fileInput: document.getElementById("fileInput"),
  exportButton: document.getElementById("exportButton"),
  undoButton: document.getElementById("undoButton"),
  redoButton: document.getElementById("redoButton"),
  saveDraftButton: document.getElementById("saveDraftButton"),
  restoreDraftButton: document.getElementById("restoreDraftButton"),
  loadExampleButton: document.getElementById("loadExampleButton"),
  newChartButton: document.getElementById("newChartButton"),
  helpButton: document.getElementById("helpButton"),
  titleInput: document.getElementById("titleInput"),
  artistInput: document.getElementById("artistInput"),
  bpmInput: document.getElementById("bpmInput"),
  keyInput: document.getElementById("keyInput"),
  beatsPerBarInput: document.getElementById("beatsPerBarInput"),
  gridFractionInput: document.getElementById("gridFractionInput"),
  chordBankInput: document.getElementById("chordBankInput"),
  originalKeyInput: document.getElementById("originalKeyInput"),
  capoInput: document.getElementById("capoInput"),
  capoSourceTag: document.getElementById("capoSourceTag"),
  beatUnitInput: document.getElementById("beatUnitInput"),
  songHeading: document.getElementById("songHeading"),
  chartSummary: document.getElementById("chartSummary"),
  zoomOutButton: document.getElementById("zoomOutButton"),
  zoomInButton: document.getElementById("zoomInButton"),
  zoomLabel: document.getElementById("zoomLabel"),
  prevPageButton: document.getElementById("prevPageButton"),
  nextPageButton: document.getElementById("nextPageButton"),
  quickChordNameInput: document.getElementById("quickChordNameInput"),
  paletteChordInput: document.getElementById("paletteChordInput"),
  allChordNames: document.getElementById("allChordNames"),
  addPaletteChordButton: document.getElementById("addPaletteChordButton"),
  resetPaletteCButton: document.getElementById("resetPaletteCButton"),
  resetPaletteGButton: document.getElementById("resetPaletteGButton"),
  quickChordPalette: document.getElementById("quickChordPalette"),
  copyChordsButton: document.getElementById("copyChordsButton"),
  copyLyricsButton: document.getElementById("copyLyricsButton"),
  copySegmentButton: document.getElementById("copySegmentButton"),
  pasteChordsButton: document.getElementById("pasteChordsButton"),
  addChordButton: document.getElementById("addChordButton"),
  addBarButton: document.getElementById("addBarButton"),
  chordsBedButton: document.getElementById("chordsBedButton"),
  lyricsBedButton: document.getElementById("lyricsBedButton"),
  overviewButton: document.getElementById("overviewButton"),
  messageArea: document.getElementById("messageArea"),
  timelineCanvas: document.getElementById("timelineCanvas"),
  selectionPanel: document.getElementById("selectionPanel"),
  validationList: document.getElementById("validationList"),
  chordMoveMode: document.getElementById("chordMoveMode"),
  lyricMoveMode: document.getElementById("lyricMoveMode"),
  clearLyricsFromHereButton: document.getElementById("clearLyricsFromHereButton"),
  clearAllLyricsButton: document.getElementById("clearAllLyricsButton"),
  importDialog: document.getElementById("importDialog"),
  importDialogClose: document.getElementById("importDialogClose"),
  importDialogSummary: document.getElementById("importDialogSummary"),
  importDialogList: document.getElementById("importDialogList"),
  helpDialog: document.getElementById("helpDialog"),
  helpDialogClose: document.getElementById("helpDialogClose"),
  lyricsBedDialog: document.getElementById("lyricsBedDialog"),
  lyricsBedDialogClose: document.getElementById("lyricsBedDialogClose"),
  lyricsBedCancelButton: document.getElementById("lyricsBedCancelButton"),
  lyricsBedApplyButton: document.getElementById("lyricsBedApplyButton"),
  lyricsPasteInput: document.getElementById("lyricsPasteInput"),
  lyricsReplaceInput: document.getElementById("lyricsReplaceInput"),
  chordsBedDialog: document.getElementById("chordsBedDialog"),
  chordsBedDialogClose: document.getElementById("chordsBedDialogClose"),
  chordsBedCancelButton: document.getElementById("chordsBedCancelButton"),
  chordsBedApplyButton: document.getElementById("chordsBedApplyButton"),
  chordsSequenceInput: document.getElementById("chordsSequenceInput"),
  overviewDialog: document.getElementById("overviewDialog"),
  overviewDialogClose: document.getElementById("overviewDialogClose"),
  overviewSummary: document.getElementById("overviewSummary"),
  overviewContent: document.getElementById("overviewContent"),
  overviewLineRuleInput: document.getElementById("overviewLineRuleInput"),
  applyOverviewLineRuleButton: document.getElementById("applyOverviewLineRuleButton"),
};

function init() {
  loadPreferences();
  Object.keys(CHORD_BANKS).forEach((bank) => {
    const option = document.createElement("option");
    option.value = bank;
    option.textContent = `${bank}: ${CHORD_BANKS[bank].join(" / ")}`;
    els.chordBankInput.append(option);
  });
  PRESET_CHORDS.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    els.allChordNames.append(option);
  });
  syncQuickChordOptions();

  els.fileInput.addEventListener("change", importFile);
  els.exportButton.addEventListener("click", exportChart);
  els.undoButton.addEventListener("click", undoLastAction);
  els.redoButton.addEventListener("click", redoLastAction);
  els.saveDraftButton.addEventListener("click", () => saveDraft("草稿已保存。", true));
  els.restoreDraftButton.addEventListener("click", restoreDraft);
  els.loadExampleButton.addEventListener("click", () => {
    pushHistory("载入示例");
    loadChart(structuredClone(exampleChart), "已载入内置示例。");
  });
  els.newChartButton.addEventListener("click", newBlankChart);
  els.helpButton.addEventListener("click", showHelpDialog);
  els.importDialogClose.addEventListener("click", hideImportDialog);
  els.importDialog.addEventListener("click", (event) => {
    if (event.target === els.importDialog) hideImportDialog();
  });
  els.helpDialogClose.addEventListener("click", hideHelpDialog);
  els.helpDialog.addEventListener("click", (event) => {
    if (event.target === els.helpDialog) hideHelpDialog();
  });
  els.zoomOutButton.addEventListener("click", () => setZoom(state.pxPerBeat - 12));
  els.zoomInButton.addEventListener("click", () => setZoom(state.pxPerBeat + 12));
  els.prevPageButton.addEventListener("click", () => scrollTimelinePage(-1));
  els.nextPageButton.addEventListener("click", () => scrollTimelinePage(1));
  els.quickChordNameInput.addEventListener("change", () => {
    state.selectedChordName = els.quickChordNameInput.value || defaultChordName();
    savePreferences();
    renderQuickChordPalette();
  });
  els.paletteChordInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addPaletteChordFromInput();
  });
  els.addPaletteChordButton.addEventListener("click", addPaletteChordFromInput);
  els.resetPaletteCButton.addEventListener("click", () => resetQuickChordPalette("C"));
  els.resetPaletteGButton.addEventListener("click", () => resetQuickChordPalette("G"));
  els.copyChordsButton.addEventListener("click", copySelectedChords);
  els.copyLyricsButton.addEventListener("click", copySelectedLyrics);
  els.copySegmentButton.addEventListener("click", copySelectedSegment);
  els.pasteChordsButton.addEventListener("click", pasteCopiedChords);
  els.addChordButton.addEventListener("click", addChord);
  els.addBarButton.addEventListener("click", appendBar);
  els.chordsBedButton.addEventListener("click", showChordsBedDialog);
  els.lyricsBedButton.addEventListener("click", showLyricsBedDialog);
  els.overviewButton.addEventListener("click", showOverviewDialog);
  els.overviewDialogClose.addEventListener("click", hideOverviewDialog);
  els.overviewDialog.addEventListener("click", (event) => {
    if (event.target === els.overviewDialog) hideOverviewDialog();
  });
  els.overviewDialog.querySelectorAll("[data-overview-mode]").forEach((button) => {
    button.addEventListener("click", () => setOverviewMode(button.dataset.overviewMode));
  });
  els.overviewLineRuleInput.addEventListener("change", () => {
    state.overviewLineRule = els.overviewLineRuleInput.value;
    renderOverviewSafely();
  });
  els.applyOverviewLineRuleButton.addEventListener("click", applyOverviewLineRule);
  els.lyricsBedDialogClose.addEventListener("click", hideLyricsBedDialog);
  els.lyricsBedCancelButton.addEventListener("click", hideLyricsBedDialog);
  els.lyricsBedApplyButton.addEventListener("click", applyLyricsBed);
  els.clearLyricsFromHereButton.addEventListener("click", clearLyricsFromCurrentBar);
  els.clearAllLyricsButton.addEventListener("click", clearAllLyrics);
  els.lyricsBedDialog.addEventListener("click", (event) => {
    if (event.target === els.lyricsBedDialog) hideLyricsBedDialog();
  });
  els.chordsBedDialogClose.addEventListener("click", hideChordsBedDialog);
  els.chordsBedCancelButton.addEventListener("click", hideChordsBedDialog);
  els.chordsBedApplyButton.addEventListener("click", applyChordsBed);
  els.chordsBedDialog.addEventListener("click", (event) => {
    if (event.target === els.chordsBedDialog) hideChordsBedDialog();
  });

  [els.titleInput, els.artistInput, els.keyInput, els.originalKeyInput].forEach((input) => {
    input.addEventListener("input", updateMetaFromInputs);
  });
  [els.bpmInput, els.beatsPerBarInput, els.chordBankInput, els.capoInput, els.beatUnitInput].forEach((input) => {
    input.addEventListener("change", updateMetaFromInputs);
  });
  els.gridFractionInput.addEventListener("change", updateGridFromInput);

  document.addEventListener("keydown", (event) => {
    if (handleLaneChordShortcut(event)) {
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c" && !isEditingText()) {
      event.preventDefault();
      copyCurrentSelection();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v" && !isEditingText()) {
      event.preventDefault();
      pasteCopiedChords();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && event.shiftKey && !isEditingText()) {
      event.preventDefault();
      redoLastAction();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y" && !isEditingText()) {
      event.preventDefault();
      redoLastAction();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !isEditingText()) {
      event.preventDefault();
      undoLastAction();
    } else if ((event.key === "Delete" || event.key === "Backspace") && hasDeletableSelection() && !isEditingText()) {
      deleteSelection();
    } else if (event.key === "PageDown" && !isEditingText()) {
      event.preventDefault();
      scrollTimelinePage(1);
    } else if (event.key === "PageUp" && !isEditingText()) {
      event.preventDefault();
      scrollTimelinePage(-1);
    }
  });
  document.addEventListener("pointermove", handleDocumentPointerMove);
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);
  els.timelineCanvas.addEventListener("pointerdown", startTimelinePan);
  els.timelineCanvas.addEventListener("click", suppressClickAfterTimelinePan, true);

  if (!restoreDraft({ silent: true })) {
    loadChart(structuredClone(exampleChart), "可直接导入 JSON，或先试用内置示例。");
  }
}

function structuredClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function bindOptional(element, eventName, handler) {
  if (element) element.addEventListener(eventName, handler);
}

function loadPreferences() {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREF_STORAGE_KEY) || "{}");
    if (Number.isInteger(prefs.defaultChordDurationTicks) && prefs.defaultChordDurationTicks > 0) {
      state.defaultChordDurationTicks = prefs.defaultChordDurationTicks;
    }
    if ([2, 4, 8].includes(prefs.gridFraction)) state.gridFraction = prefs.gridFraction;
    if (typeof prefs.selectedChordName === "string" && prefs.selectedChordName) state.selectedChordName = prefs.selectedChordName;
  } catch {
    // Ignore bad local preferences.
  }
}

function savePreferences() {
  localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify({
    defaultChordDurationTicks: state.defaultChordDurationTicks,
    gridFraction: state.gridFraction,
    selectedChordName: state.selectedChordName,
  }));
}

function pushHistory(label = "编辑") {
  if (!state.chart || state.isRestoring) return;
  state.history.push(createEditorSnapshot(label));
  if (state.history.length > MAX_HISTORY) state.history.shift();
  state.redoStack = [];
}

function undoLastAction() {
  const snapshot = state.history.pop();
  if (!snapshot) {
    showMessage("没有可撤销的操作。", "warning");
    return;
  }

  state.redoStack.push(createEditorSnapshot(snapshot.label));
  restoreEditorSnapshot(snapshot);
  showMessage(`已撤销：${snapshot.label}`);
}

function redoLastAction() {
  const snapshot = state.redoStack.pop();
  if (!snapshot) {
    showMessage("没有可重做的操作。", "warning");
    return;
  }

  state.history.push(createEditorSnapshot(snapshot.label));
  restoreEditorSnapshot(snapshot);
  showMessage(`已重做：${snapshot.label}`);
}

function createEditorSnapshot(label = "编辑") {
  return {
    label,
    chart: structuredClone(state.chart),
    selection: state.selection ? { ...state.selection } : null,
    workingBar: state.workingBar ? { ...state.workingBar } : null,
    chordRange: state.chordRange ? structuredClone(state.chordRange) : null,
    lyricRange: state.lyricRange ? structuredClone(state.lyricRange) : null,
    barRange: state.barRange ? structuredClone(state.barRange) : null,
    gridFraction: state.gridFraction,
    defaultChordDurationTicks: state.defaultChordDurationTicks,
    selectedChordName: state.selectedChordName,
    quickChordPalette: [...state.quickChordPalette],
    lastLyricsPasteText: state.lastLyricsPasteText,
    lastChordsSequenceText: state.lastChordsSequenceText,
  };
}

function restoreEditorSnapshot(snapshot) {
  state.isRestoring = true;
  state.chart = structuredClone(snapshot.chart);
  state.selection = snapshot.selection;
  state.workingBar = snapshot.workingBar;
  state.chordRange = snapshot.chordRange || null;
  state.lyricRange = snapshot.lyricRange || null;
  state.barRange = snapshot.barRange || null;
  state.gridFraction = snapshot.gridFraction || DEFAULT_GRID_FRACTION;
  state.defaultChordDurationTicks = snapshot.defaultChordDurationTicks || DEFAULT_TICKS_PER_BEAT * 2;
  initializeQuickChordPalette(state.chart, snapshot.quickChordPalette);
  state.selectedChordName = snapshot.selectedChordName || defaultChordName();
  state.lastLyricsPasteText = snapshot.lastLyricsPasteText || "";
  state.lastChordsSequenceText = snapshot.lastChordsSequenceText || "";
  normalizeChart(state.chart);
  syncMetaInputs();
  state.isRestoring = false;
  render();
}

function saveDraft(message = "草稿已保存。", manual = false) {
  if (!state.chart) return false;
  const publicChart = structuredClone(state.chart);
  delete publicChart.source;
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
    chart: publicChart,
    selection: state.selection,
    workingBar: state.workingBar,
    chordRange: state.chordRange,
    lyricRange: state.lyricRange,
    barRange: state.barRange,
    gridFraction: state.gridFraction,
    defaultChordDurationTicks: state.defaultChordDurationTicks,
    selectedChordName: state.selectedChordName,
    quickChordPalette: state.quickChordPalette,
    lastLyricsPasteText: state.lastLyricsPasteText,
    lastChordsSequenceText: state.lastChordsSequenceText,
    savedAt: new Date().toISOString(),
  }));
  savePreferences();
  if (manual) showMessage(message);
  return true;
}

function restoreDraft(options = {}) {
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) {
    if (!options.silent) showMessage("没有找到本地草稿。", "warning");
    return false;
  }

  try {
    const draft = JSON.parse(raw);
    if (!draft.chart) throw new Error("草稿内容为空");
    if (!options.silent) pushHistory("恢复草稿");
    state.isRestoring = true;
    state.chart = structuredClone(draft.chart);
    delete state.chart.source;
    normalizeChart(state.chart);
    state.selection = draft.selection || null;
    state.workingBar = draft.workingBar || null;
    state.chordRange = draft.chordRange || null;
    state.lyricRange = draft.lyricRange || null;
    state.barRange = draft.barRange || null;
    state.gridFraction = [2, 4, 8].includes(draft.gridFraction) ? draft.gridFraction : DEFAULT_GRID_FRACTION;
    state.defaultChordDurationTicks = positiveInteger(draft.defaultChordDurationTicks, DEFAULT_TICKS_PER_BEAT * 2);
    initializeQuickChordPalette(state.chart, draft.quickChordPalette);
    state.selectedChordName = draft.selectedChordName || defaultChordName();
    state.lastLyricsPasteText = draft.lastLyricsPasteText || "";
    state.lastChordsSequenceText = draft.lastChordsSequenceText || "";
    syncMetaInputs();
    state.isRestoring = false;
    render();
    if (!options.silent) showMessage("已恢复本地草稿。");
    return true;
  } catch (error) {
    state.isRestoring = false;
    if (!options.silent) showMessage(`草稿恢复失败：${error.message}`, "error");
    return false;
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("浏览器没有允许复制，请通过 localhost 打开编辑器后重试。");
}

async function importFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const chart = JSON.parse(text);
    pushHistory("导入 JSON");
    const result = loadChart(chart, `已导入 ${file.name}`, { fileName: file.name });
    if (!result.ok) {
      showImportDialog(file.name, result.errors);
    }
  } catch (error) {
    showImportDialog(file.name, [`JSON 读取失败：${error.message}`]);
  } finally {
    event.target.value = "";
  }
}

function loadChart(chart, message, options = {}) {
  const errors = basicLoadErrors(chart);
  if (errors.length > 0) {
    if (!options.fileName) showMessage(errors.join("；"), "warning");
    return { ok: false, errors };
  }

  const candidate = structuredClone(chart);
  delete candidate.source;
  normalizeChart(candidate);
  const issues = validateChartData(candidate);
  const blocking = issues.filter((issue) => issue.level === "bad").map((issue) => issue.text);
  if (blocking.length > 0) {
    if (!options.fileName) showMessage(blocking.join("；"), "warning");
    return { ok: false, errors: blocking };
  }

  state.chart = candidate;
  state.selection = null;
  state.workingBar = null;
  state.chordRange = null;
  state.lyricRange = null;
  state.barRange = null;
  initializeQuickChordPalette(candidate);
  syncMetaInputs();
  render();
  showMessage(message || "JSON 已载入。");
  return { ok: true, errors: [] };
}

function basicLoadErrors(chart) {
  const errors = [];
  if (!chart || typeof chart !== "object") errors.push("JSON 顶层必须是对象");
  if (chart?.format !== "d15.timeline.v1") errors.push("format 必须是 d15.timeline.v1");
  if (!Array.isArray(chart?.sections)) errors.push("sections 必须是数组");
  if (chart?.displayLines != null && !Array.isArray(chart.displayLines)) errors.push("displayLines 必须是数组");
  if (chart && typeof chart === "object") {
    if (!Number.isInteger(Number(chart.ticksPerBeat)) || Number(chart.ticksPerBeat) <= 0) {
      errors.push("缺少有效的 ticksPerBeat。当前编辑器只接受 tick 版 v1 JSON。");
    }
    collectTickShapeErrors(chart, errors);
  }
  return errors;
}

function collectTickShapeErrors(chart, errors) {
  let oldBeatFieldCount = 0;
  let missingTickCount = 0;
  let missingDurationTicksCount = 0;

  asArray(chart.sections).forEach((section) => {
    if (!Array.isArray(section?.bars)) {
      errors.push("section.bars 必须是数组。");
      return;
    }
    section.bars.forEach((bar) => {
      if (!Array.isArray(bar?.chords)) {
        errors.push("bar.chords 必须是数组。");
        return;
      }
      bar.chords.forEach((chord) => {
        if ("beat" in chord || "duration" in chord) oldBeatFieldCount += 1;
        if (!Number.isInteger(Number(chord.tick))) missingTickCount += 1;
        if (!Number.isInteger(Number(chord.durationTicks))) missingDurationTicksCount += 1;
      });
      asArray(bar.lyrics).forEach((lyric) => {
        if ("beat" in lyric) oldBeatFieldCount += 1;
        if (!Number.isInteger(Number(lyric.tick))) missingTickCount += 1;
      });
    });
  });

  if (oldBeatFieldCount > 0) {
    errors.push("检测到旧 beat/duration 字段。新版 v1 需要 tick/durationTicks。");
  }
  if (missingTickCount > 0) {
    errors.push(`有 ${missingTickCount} 个和弦或歌词缺少整数 tick。`);
  }
  if (missingDurationTicksCount > 0) {
    errors.push(`有 ${missingDurationTicksCount} 个和弦缺少整数 durationTicks。`);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeChart(chart) {
  chart.title = chart.title || "Untitled";
  chart.artist = chart.artist || "";
  chart.bpm = Number(chart.bpm) || 96;
  chart.key = chart.key || "C";
  chart.originalKey = chart.originalKey || "";
  chart.capo = Math.max(0, Math.min(12, Number(chart.capo) || 0));
  chart.capoSource = chart.capoSource || "default";
  chart.beatsPerBar = Number(chart.beatsPerBar) || 4;
  chart.beatUnit = Number(chart.beatUnit) || 4;
  chart.ticksPerBeat = positiveInteger(chart.ticksPerBeat, DEFAULT_TICKS_PER_BEAT);
  chart.chordBank = CHORD_BANKS[chart.chordBank] ? chart.chordBank : "C";
  if (typeof chart.chartId === "string" && chart.chartId.trim()) chart.chartId = chart.chartId.trim();
  else delete chart.chartId;
  delete chart.source;

  chart.sections.forEach((section) => {
    section.name = section.name || "section";
    section.bars = Array.isArray(section.bars) ? section.bars : [];
    section.bars.forEach((bar) => {
      bar.chords = Array.isArray(bar.chords) ? bar.chords : [];
      bar.lyrics = Array.isArray(bar.lyrics) ? bar.lyrics : [];
      delete bar.line;
      bar.chords.forEach((chord) => {
        chord.tick = clampPreciseTickForChart(chart, chord.tick);
        chord.name = chord.name || "C";
        chord.durationTicks = Math.max(1, positiveInteger(chord.durationTicks, ticksPerBeatForChart(chart)));
        chord.durationTicks = Math.min(chord.durationTicks, barLengthTicksForChart(chart) - chord.tick);
      });
      bar.lyrics.forEach((lyric) => {
        lyric.tick = clampPreciseTickForChart(chart, lyric.tick);
        lyric.text = lyric.text ?? "";
        if (lyric.order == null) delete lyric.order;
      });
    });
  });
  chart.displayLines = normalizeDisplayLinesForChart(chart);
  sortChartEvents(chart);
}

function normalizeDisplayLinesForChart(chart) {
  const totalBars = flattenBarsForChart(chart).length;
  if (totalBars === 0) return [];
  const source = Array.isArray(chart.displayLines) ? chart.displayLines : [];
  const requestedLines = source
    .map((line) => ({
      startBar: positiveInteger(line?.startBar, 0),
      barCount: positiveInteger(line?.barCount, 1) || 1,
    }))
    .filter((line) => line.startBar < totalBars)
    .sort((a, b) => a.startBar - b.startBar);

  if (requestedLines.length > 0) {
    const lines = [];
    let cursor = 0;
    requestedLines.forEach((line) => {
      const requestedStart = clamp(line.startBar, 0, Math.max(0, totalBars - 1));
      if (requestedStart > cursor) appendFixedDisplayLines(lines, cursor, requestedStart, 4);
      const start = Math.max(requestedStart, cursor);
      if (start >= totalBars) return;
      const end = Math.min(totalBars, start + Math.max(1, line.barCount));
      lines.push({ startBar: start, barCount: end - start });
      cursor = end;
    });
    if (cursor < totalBars) appendFixedDisplayLines(lines, cursor, totalBars, 4);
    return lines;
  }

  return fixedDisplayLines(totalBars, 4);
}

function syncMetaInputs() {
  const chart = state.chart;
  els.titleInput.value = chart.title || "";
  els.artistInput.value = chart.artist || "";
  els.bpmInput.value = chart.bpm || "";
  els.keyInput.value = chart.key || "";
  els.originalKeyInput.value = chart.originalKey || "";
  els.capoInput.value = chart.capo ?? 0;
  els.capoSourceTag.textContent = capoSourceLabel(chart.capoSource);
  els.beatsPerBarInput.value = chart.beatsPerBar || 4;
  els.beatUnitInput.value = chart.beatUnit || 4;
  els.gridFractionInput.value = String(state.gridFraction);
  els.chordBankInput.value = chart.chordBank || "C";
  syncQuickChordOptions();
}

function capoSourceLabel(source) {
  const labels = { dom: "DOM", calculated: "推测", manual: "手动", default: "默认" };
  return labels[source] || "默认";
}

function initializeQuickChordPalette(chart, preferredPalette = null) {
  const preferred = uniqueChordNames((preferredPalette || []).map(normalizeChordName));
  const used = usedChordNamesForChart(chart);
  const seed = CHORD_BANKS[chart?.chordBank] || CHORD_BANKS.C;
  const palette = uniqueChordNames([...preferred, ...used]);
  state.quickChordPalette = palette.length > 0 ? palette : [...seed];
}

function syncQuickChordOptions() {
  if (!state.quickChordPalette.length) initializeQuickChordPalette(state.chart);
  if (!state.quickChordPalette.includes(state.selectedChordName)) {
    state.selectedChordName = state.quickChordPalette[0] || "C";
  }
  els.quickChordNameInput.replaceChildren();
  state.quickChordPalette.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    els.quickChordNameInput.append(option);
  });
  els.quickChordNameInput.value = state.selectedChordName;
  renderQuickChordPalette();
}

function renderQuickChordPalette() {
  els.quickChordPalette.replaceChildren();
  state.quickChordPalette.forEach((name) => {
    const chip = document.createElement("span");
    chip.className = "quick-chord-chip";
    if (name === state.selectedChordName) chip.classList.add("active");

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "quick-chord-chip-name";
    selectButton.textContent = name;
    selectButton.title = `选中 ${name}`;
    selectButton.addEventListener("click", () => selectQuickChord(name));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "quick-chord-chip-remove";
    removeButton.textContent = "×";
    removeButton.title = `从工作组移除 ${name}`;
    removeButton.disabled = state.quickChordPalette.length <= 1;
    removeButton.addEventListener("click", () => removeQuickChord(name));

    chip.append(selectButton);
    chip.append(removeButton);
    els.quickChordPalette.append(chip);
  });
}

function selectQuickChord(name) {
  state.selectedChordName = name;
  syncQuickChordOptions();
  savePreferences();
}

function addPaletteChordFromInput() {
  const name = normalizeChordName(els.paletteChordInput.value);
  if (!name) return;
  rememberQuickChord(name);
  els.paletteChordInput.value = "";
  const support = chordSupportStatus(name);
  showMessage(
    support === "preset"
      ? `${name} 已加入工作和弦组。`
      : support === "generated"
        ? `${name} 已加入工作和弦组；App 会按和弦名生成指法。`
        : `${name} 已加入工作和弦组；当前 App 可能无法解析。`,
    support === "unsupported" ? "warning" : "notice",
  );
}

function resetQuickChordPalette(bankName) {
  const bank = CHORD_BANKS[bankName] || CHORD_BANKS.C;
  state.quickChordPalette = [...bank];
  state.selectedChordName = state.quickChordPalette[0] || "C";
  syncQuickChordOptions();
  saveDraft("", false);
  showMessage(`工作和弦组已重置为 ${bankName} 组。`);
}

function removeQuickChord(name) {
  if (state.quickChordPalette.length <= 1) return;
  state.quickChordPalette = state.quickChordPalette.filter((candidate) => candidate !== name);
  if (state.selectedChordName === name) state.selectedChordName = state.quickChordPalette[0] || "C";
  syncQuickChordOptions();
  saveDraft("", false);
  showMessage(`${name} 已从工作和弦组移除。`);
}

function rememberQuickChord(name) {
  const normalized = normalizeChordName(name);
  if (!normalized) return;
  if (!state.quickChordPalette.includes(normalized)) state.quickChordPalette.push(normalized);
  state.selectedChordName = normalized;
  syncQuickChordOptions();
  savePreferences();
}

function uniqueSupportedChordNames(names) {
  return uniqueChordNames(names.map(normalizeChordName).filter(isSupportedChord));
}

function uniqueChordNames(names) {
  const seen = new Set();
  const result = [];
  names.forEach((name) => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    result.push(name);
  });
  return result;
}

function usedChordNamesForChart(chart) {
  if (!chart?.sections) return [];
  return uniqueChordNames(flattenBarsForChart(chart)
    .flatMap((barRef) => asArray(barRef.bar.chords).map((chord) => normalizeChordName(chord.name))));
}

function normalizeChordName(name) {
  return String(name || "").trim();
}

function isSupportedChord(name) {
  return PRESET_CHORD_SET.has(normalizeChordName(name));
}

function chordSupportStatus(name) {
  const normalized = normalizeChordName(name);
  if (!normalized) return "unsupported";
  if (isSupportedChord(normalized)) return "preset";
  return parseGeneratableChordName(normalized) ? "generated" : "unsupported";
}

function isPlayableChord(name) {
  return chordSupportStatus(name) !== "unsupported";
}

function parseGeneratableChordName(name) {
  return globalThis.D15ChordSymbol?.parse(normalizeChordName(name)) || null;
}

function chordRootLetter(name) {
  const parentName = normalizeChordName(name).split("/")[0];
  const match = parentName.match(/^[A-G]/i);
  return match ? match[0].toUpperCase() : "";
}

function fillChordSelect(select, names) {
  select.replaceChildren();
  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.append(option);
  });
}

function chordOptionsHtml(names) {
  return names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
}

function updateMetaFromInputs() {
  if (!state.chart) return;
  pushHistory("编辑元数据");

  state.chart.title = els.titleInput.value.trim() || "Untitled";
  state.chart.artist = els.artistInput.value.trim();
  state.chart.bpm = Number(els.bpmInput.value) || 96;
  state.chart.key = els.keyInput.value.trim() || "C";
  state.chart.originalKey = els.originalKeyInput.value.trim();
  state.chart.capo = Math.max(0, Math.min(12, Number(els.capoInput.value) || 0));
  state.chart.capoSource = "manual";
  state.chart.beatsPerBar = Math.max(0.5, Number(els.beatsPerBarInput.value) || 4);
  state.chart.beatUnit = Number(els.beatUnitInput.value) || 4;
  state.chart.chordBank = els.chordBankInput.value;
  els.capoSourceTag.textContent = capoSourceLabel(state.chart.capoSource);
  syncQuickChordOptions();
  savePreferences();
  clampAllEvents();
  render();
}

function updateGridFromInput() {
  pushHistory("修改细分");
  const nextGridFraction = positiveInteger(els.gridFractionInput.value, DEFAULT_GRID_FRACTION);
  state.gridFraction = [2, 4, 8].includes(nextGridFraction) ? nextGridFraction : DEFAULT_GRID_FRACTION;
  savePreferences();
  render();
}

function render() {
  if (!state.chart) return;

  hideQuickChordPopover(true);
  hideChordEditPopover();
  hideLaneChordPopover();
  els.undoButton.disabled = state.history.length === 0;
  els.redoButton.disabled = state.redoStack.length === 0;
  els.pasteChordsButton.disabled = !state.chordClipboard;
  document.documentElement.style.setProperty("--beat-width", `${state.pxPerBeat}px`);
  document.documentElement.style.setProperty("--grid-width", `${state.pxPerBeat / state.gridFraction}px`);
  els.zoomLabel.textContent = `${state.pxPerBeat} px/beat`;
  els.songHeading.textContent = state.chart.title || "Untitled";

  const bars = flattenBars();
  const totalBeats = Math.max(1, bars.length * state.chart.beatsPerBar);
  const capoText = state.chart.capo ? ` · Capo ${state.chart.capo}` : "";
  const summary = `${state.chart.artist || "未知艺术家"} · ${state.chart.bpm} BPM · ${state.chart.key} · ${state.chart.beatsPerBar}/${state.chart.beatUnit || 4}${capoText} · ${gridFractionLabel()}编辑 · ${bars.length} 小节`;
  els.chartSummary.replaceChildren(document.createTextNode(summary));
  els.timelineCanvas.innerHTML = "";
  els.timelineCanvas.style.width = `${totalBeats * state.pxPerBeat + 96}px`;
  els.timelineCanvas.style.height = `${Math.max(520, bars.length > 0 ? 420 : 520)}px`;

  addLaneTitle("和弦", "chord-lane-title");
  addLaneTitle("歌词", "lyric-lane-title");
  renderBars(bars);
  renderEvents(bars);
  renderInspector();
  renderValidation();
  saveDraft("", false);
}

function addLaneTitle(text, className) {
  const el = document.createElement("div");
  el.className = `lane-title ${className}`;
  el.textContent = text;
  els.timelineCanvas.append(el);
}

function renderBars(bars) {
  let lastSection = -1;
  bars.forEach((barRef, index) => {
    const barEl = document.createElement("div");
    barEl.className = "bar";
    if (isWorkingBar(barRef.sectionIndex, barRef.barIndex)) barEl.classList.add("active");
    if (isBarInSelectedRange(barRef.sectionIndex, barRef.barIndex)) barEl.classList.add("range-selected");
    barEl.dataset.sectionIndex = barRef.sectionIndex;
    barEl.dataset.barIndex = barRef.barIndex;
    barEl.style.left = `${barRef.startBeat * state.pxPerBeat}px`;
    barEl.style.width = `${state.chart.beatsPerBar * state.pxPerBeat}px`;
    barEl.title = "点击小节背景选中小节；Shift 点击多选小节";
    barEl.addEventListener("click", selectBarFromElement);

    const label = document.createElement("div");
    label.className = "bar-label";
    label.textContent = `${index + 1}`;
    label.title = "点击小节编号选中小节；Shift 点击另一个编号多选小节";
    barEl.append(label);
    barEl.append(createChordAddRow(barRef));

    const actions = document.createElement("div");
    actions.className = "bar-actions";
    actions.innerHTML = `
      <button type="button" data-bar-action="insert-before" title="在前面插入小节">←+</button>
      <button type="button" data-bar-action="insert-after" title="在后面插入小节">+→</button>
      <button type="button" data-bar-action="delete" title="删除小节">×</button>
    `;
    actions.querySelectorAll("button").forEach((button) => {
      button.dataset.sectionIndex = barRef.sectionIndex;
      button.dataset.barIndex = barRef.barIndex;
      button.addEventListener("click", handleBarAction);
    });
    barEl.append(actions);

    if (barRef.sectionIndex !== lastSection) {
      const sectionLabel = document.createElement("div");
      sectionLabel.className = "section-label";
      sectionLabel.textContent = state.chart.sections[barRef.sectionIndex].name || `Section ${barRef.sectionIndex + 1}`;
      barEl.append(sectionLabel);
      lastSection = barRef.sectionIndex;
    }

    els.timelineCanvas.append(barEl);
  });
  renderDisplayLineTexts(bars);
}

function createChordAddRow(barRef) {
  const row = document.createElement("div");
  row.className = "chord-add-row";
  for (let tick = 0; tick <= barLengthTicks() - gridTicks(); tick += gridTicks()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chord-add-button";
    button.title = `${positionLabel(tick)} 添加和弦`;
    button.textContent = "+";
    button.style.left = `${ticksToBeats(tick) * state.pxPerBeat + 10}px`;
    button.dataset.sectionIndex = barRef.sectionIndex;
    button.dataset.barIndex = barRef.barIndex;
    button.dataset.tick = tick;
    button.addEventListener("click", addLaneChordFromSlot);
    button.addEventListener("pointerenter", showLaneChordPopover);
    button.addEventListener("pointerleave", scheduleLaneChordHide);
    row.append(button);
  }
  return row;
}

function renderDisplayLineTexts(bars) {
  displayLineGroups(bars).forEach((group) => {
    const first = group.bars[0];
    if (!first) return;
    const line = document.createElement("div");
    line.className = "line-text";
    line.style.left = `${first.startBeat * state.pxPerBeat + 6}px`;
    line.style.width = `${group.bars.length * state.chart.beatsPerBar * state.pxPerBeat - 12}px`;
    line.textContent = group.line;
    els.timelineCanvas.append(line);
  });
}

function renderEvents(bars) {
  bars.forEach((barRef) => {
    barRef.bar.chords.forEach((chord, itemIndex) => {
      const el = document.createElement("div");
      el.className = "chord-block";
      if (!isPlayableChord(chord.name)) el.classList.add("unsupported");
      if (isSelected("chord", barRef.sectionIndex, barRef.barIndex, itemIndex)) el.classList.add("selected");
      if (isChordInSelectedRange(barRef.sectionIndex, barRef.barIndex, itemIndex)) el.classList.add("range-selected");
      el.dataset.kind = "chord";
      el.dataset.sectionIndex = barRef.sectionIndex;
      el.dataset.barIndex = barRef.barIndex;
      el.dataset.itemIndex = itemIndex;
      el.style.left = `${globalBeatFor(barRef, chord.tick) * state.pxPerBeat}px`;
      el.style.width = `${Math.max(34, ticksToBeats(chord.durationTicks) * state.pxPerBeat - 6)}px`;
      const label = document.createElement("span");
      label.className = "chord-block-label";
      label.textContent = chord.name;
      const resizeHandle = document.createElement("span");
      resizeHandle.className = "chord-resize-handle";
      resizeHandle.title = "拖动改变和弦时值";
      resizeHandle.addEventListener("pointerdown", startChordResize);
      el.append(label);
      el.append(resizeHandle);
      el.title = "拖动调整位置，双击直接改和弦";
      attachDrag(el);
      el.addEventListener("click", selectChordBlock);
      el.addEventListener("dblclick", showChordEditPopover);
      els.timelineCanvas.append(el);
    });

    barRef.bar.lyrics.forEach((lyric, itemIndex) => {
      const el = document.createElement("div");
      el.className = "lyric-token";
      if (Array.from(lyric.text || " ").length === 1) el.classList.add("single-glyph");
      if (isSelected("lyric", barRef.sectionIndex, barRef.barIndex, itemIndex)) el.classList.add("selected");
      if (isLyricInSelectedRange(barRef.sectionIndex, barRef.barIndex, itemIndex)) el.classList.add("range-selected");
      el.dataset.kind = "lyric";
      el.dataset.sectionIndex = barRef.sectionIndex;
      el.dataset.barIndex = barRef.barIndex;
      el.dataset.itemIndex = itemIndex;
      const idealLeft = globalBeatFor(barRef, lyric.tick) * state.pxPerBeat;
      el.style.left = `${idealLeft}px`;
      el.dataset.idealLeft = String(idealLeft);
      const text = document.createElement("span");
      text.className = "lyric-token-text";
      text.textContent = lyric.text || " ";
      el.append(text);
      el.title = "拖动调整位置；默认会用格子推挤歌词";
      attachDrag(el);
      el.addEventListener("pointerenter", () => showQuickChordForLyric(el));
      el.addEventListener("pointerleave", scheduleQuickChordHide);
      el.addEventListener("click", selectLyricToken);
      el.addEventListener("dblclick", () => focusInspectorField("lyricTextInput"));
      els.timelineCanvas.append(el);
    });
  });
  layoutLyricTokenCollisions();
}

function layoutLyricTokenCollisions() {
  const tokens = [...els.timelineCanvas.querySelectorAll(".lyric-token")]
    .map((element) => ({
      element,
      idealLeft: Number(element.dataset.idealLeft) || 0,
    }))
    .sort((lhs, rhs) => lhs.idealLeft - rhs.idealLeft);
  let occupiedRight = -Infinity;
  const gap = 1;
  tokens.forEach(({ element, idealLeft }) => {
    const width = element.getBoundingClientRect().width;
    const displayLeft = Math.max(idealLeft, occupiedRight + gap);
    const displacement = displayLeft - idealLeft;
    element.style.left = `${displayLeft}px`;
    element.classList.toggle("visually-shifted", displacement > 0.5);
    element.style.setProperty("--lyric-anchor-offset", `${-displacement}px`);
    occupiedRight = displayLeft + width;
  });
  const last = tokens.at(-1)?.element;
  if (last) {
    const requiredWidth = Number.parseFloat(last.style.left) + last.getBoundingClientRect().width + 96;
    els.timelineCanvas.style.width = `${Math.max(Number.parseFloat(els.timelineCanvas.style.width) || 0, requiredWidth)}px`;
  }
}

function ensureQuickChordPopover() {
  if (state.quickChord.element) return state.quickChord.element;

  const control = document.createElement("div");
  control.className = "lyric-quick-chord";
  control.hidden = true;
  control.addEventListener("pointerenter", cancelQuickChordHide);
  control.addEventListener("pointerleave", scheduleQuickChordHide);
  control.addEventListener("pointerdown", stopTimelineEvent);
  control.addEventListener("click", stopTimelineEvent);

  const select = document.createElement("select");
  select.className = "lyric-quick-chord-select";
  select.title = "选择和弦";
  select.addEventListener("pointerdown", () => {
    state.quickChord.selectOpen = true;
    cancelQuickChordHide();
  });
  select.addEventListener("focus", () => {
    state.quickChord.selectOpen = true;
    cancelQuickChordHide();
  });
  select.addEventListener("change", () => {
    state.quickChord.selectOpen = false;
    cancelQuickChordHide();
    addQuickChordFromSelect(select);
  });
  select.addEventListener("blur", () => {
    state.quickChord.selectOpen = false;
    scheduleQuickChordHide();
  });

  const button = document.createElement("button");
  button.type = "button";
  button.title = "添加当前选中的和弦";
  button.textContent = "+";
  button.addEventListener("click", (event) => {
    stopTimelineEvent(event);
    addQuickChordFromSelect(select);
  });

  control.append(select);
  control.append(button);
  document.body.append(control);
  state.quickChord.element = control;
  return control;
}

function addQuickChordFromSelect(select) {
  const anchor = state.quickChord.anchor;
  if (!anchor) return;
  addChordAtLyric(
    Number(anchor.dataset.sectionIndex),
    Number(anchor.dataset.barIndex),
    Number(anchor.dataset.itemIndex),
    select.value,
  );
  hideQuickChordPopover(true);
}

function showQuickChordForLyric(anchor) {
  const control = ensureQuickChordPopover();
  if (!control.hidden && state.quickChord.anchor && state.quickChord.anchor !== anchor) return;
  cancelQuickChordHide();
  state.quickChord.anchor?.classList.remove("quick-chord-anchor");
  state.quickChord.anchor = anchor;
  anchor.classList.add("quick-chord-anchor");

  const select = control.querySelector(".lyric-quick-chord-select");
  const previousValue = select.value;
  fillChordSelect(select, state.quickChordPalette);
  if ([...select.options].some((option) => option.value === previousValue)) select.value = previousValue;

  const rect = anchor.getBoundingClientRect();
  control.hidden = false;
  const width = control.offsetWidth || 116;
  const left = clamp(rect.left + rect.width / 2 - width / 2, 8, window.innerWidth - width - 8);
  const top = Math.max(8, rect.top - control.offsetHeight - 8);
  control.style.left = `${left}px`;
  control.style.top = `${top}px`;
}

function scheduleQuickChordHide() {
  if (state.quickChord.selectOpen) return;
  cancelQuickChordHide();
  state.quickChord.hideTimer = window.setTimeout(() => hideQuickChordPopover(), 260);
}

function cancelQuickChordHide() {
  if (!state.quickChord.hideTimer) return;
  window.clearTimeout(state.quickChord.hideTimer);
  state.quickChord.hideTimer = null;
}

function hideQuickChordPopover(immediate = false) {
  cancelQuickChordHide();
  state.quickChord.selectOpen = false;
  state.quickChord.anchor?.classList.remove("quick-chord-anchor");
  state.quickChord.anchor = null;
  if (!state.quickChord.element) return;
  if (immediate) {
    state.quickChord.element.hidden = true;
    return;
  }
  state.quickChord.element.hidden = true;
}

function ensureLaneChordPopover() {
  if (state.laneChord.element) return state.laneChord.element;

  const control = document.createElement("div");
  control.className = "lane-quick-chord";
  control.hidden = true;
  control.addEventListener("pointerenter", cancelLaneChordHide);
  control.addEventListener("pointerleave", scheduleLaneChordHide);
  control.addEventListener("pointerdown", stopTimelineEvent);
  control.addEventListener("click", stopTimelineEvent);

  const select = document.createElement("select");
  select.title = "选择和弦";
  select.addEventListener("change", () => addLaneChordFromPopover(select.value));

  const button = document.createElement("button");
  button.type = "button";
  button.title = "添加当前选中的和弦";
  button.textContent = "+";
  button.addEventListener("click", () => addLaneChordFromPopover(select.value));

  control.append(select);
  control.append(button);
  document.body.append(control);
  state.laneChord.element = control;
  return control;
}

function showLaneChordPopover(event) {
  event.preventDefault();
  event.stopPropagation();
  cancelLaneChordHide();
  const anchor = event.currentTarget;
  state.laneChord.anchor = anchor;

  const control = ensureLaneChordPopover();
  const select = control.querySelector("select");
  fillChordSelect(select, state.quickChordPalette);
  select.value = defaultChordName();

  const rect = anchor.getBoundingClientRect();
  control.hidden = false;
  const width = control.offsetWidth || 116;
  const left = clamp(rect.left + rect.width / 2 - width / 2, 8, window.innerWidth - width - 8);
  const top = Math.max(8, rect.top - control.offsetHeight - 8);
  control.style.left = `${left}px`;
  control.style.top = `${top}px`;
}

function addLaneChordFromPopover(chordName) {
  const anchor = state.laneChord.anchor;
  if (!anchor) return;
  addLaneChordFromAnchor(anchor, chordName);
  hideLaneChordPopover();
}

function addLaneChordFromSlot(event) {
  event.preventDefault();
  event.stopPropagation();
  addLaneChordFromAnchor(event.currentTarget, defaultChordName());
  hideLaneChordPopover();
}

function addLaneChordFromAnchor(anchor, chordName) {
  const barRef = flattenBars().find((candidate) => (
    candidate.sectionIndex === Number(anchor.dataset.sectionIndex)
    && candidate.barIndex === Number(anchor.dataset.barIndex)
  ));
  if (!barRef) return;

  const name = chordName || defaultChordName();
  pushHistory("和弦轨道添加和弦");
  rememberQuickChord(name);
  createChordAt(barRef, Number(anchor.dataset.tick), name);
}

function hideLaneChordPopover() {
  cancelLaneChordHide();
  state.laneChord.anchor = null;
  if (state.laneChord.element) state.laneChord.element.hidden = true;
}

function handleLaneChordShortcut(event) {
  if (isEditingText()) return false;
  if (!state.laneChord.anchor || state.laneChord.element?.hidden) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.key === "Enter") {
    const select = state.laneChord.element?.querySelector("select");
    if (!select?.value) return false;
    event.preventDefault();
    addLaneChordFromAnchor(state.laneChord.anchor, select.value);
    hideLaneChordPopover();
    return true;
  }
  const key = event.key.toUpperCase();
  if (!/^[A-G]$/.test(key)) return false;

  const matches = chordNamesForShortcut(key);
  if (matches.length === 0) return false;
  event.preventDefault();
  const chordName = preferredShortcutChordName(key, matches);
  addLaneChordFromAnchor(state.laneChord.anchor, chordName);
  hideLaneChordPopover();
  return true;
}

function chordNamesForShortcut(letter) {
  return state.quickChordPalette.filter((name) => chordRootLetter(name) === letter);
}

function preferredShortcutChordName(letter, matches) {
  return matches.includes(state.selectedChordName)
    ? state.selectedChordName
    : (matches.find((name) => name.toUpperCase() === letter) || matches[0]);
}

function scheduleLaneChordHide() {
  cancelLaneChordHide();
  state.laneChord.hideTimer = window.setTimeout(() => hideLaneChordPopover(), 260);
}

function cancelLaneChordHide() {
  if (!state.laneChord.hideTimer) return;
  window.clearTimeout(state.laneChord.hideTimer);
  state.laneChord.hideTimer = null;
}

function ensureChordEditPopover() {
  if (state.chordEdit.element) return state.chordEdit.element;

  const control = document.createElement("div");
  control.className = "chord-edit-popover";
  control.hidden = true;
  control.addEventListener("pointerdown", stopTimelineEvent);
  control.addEventListener("click", stopTimelineEvent);

  const select = document.createElement("select");
  select.title = "修改和弦";
  select.addEventListener("change", () => {
    const ref = selectionRef();
    if (!ref || ref.kind !== "chord") return;
    pushHistory("修改和弦");
    ref.item.name = select.value;
    state.selectedChordName = select.value;
    savePreferences();
    sortAllEvents();
    restoreSelectionByItem("chord", ref.item);
    render();
    showMessage(`已改为 ${select.value}。`);
  });
  select.addEventListener("blur", () => hideChordEditPopover());

  control.append(select);
  document.body.append(control);
  state.chordEdit.element = control;
  return control;
}

function showChordEditPopover(event) {
  event.preventDefault();
  event.stopPropagation();
  const block = event.currentTarget;
  setSelectionFromElement(block);

  const ref = selectionRef();
  if (!ref || ref.kind !== "chord") return;

  const label = block.querySelector(".chord-block-label");
  if (!label || label.querySelector("input")) return;

  const originalName = ref.item.name;
  const input = document.createElement("input");
  input.className = "chord-inline-input";
  input.value = originalName;
  input.setAttribute("list", "inlineChordNames");
  input.addEventListener("pointerdown", stopTimelineEvent);
  input.addEventListener("click", stopTimelineEvent);

  const datalist = document.createElement("datalist");
  datalist.id = "inlineChordNames";
  PRESET_CHORDS.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    datalist.append(option);
  });

  let finished = false;
  const commit = () => {
    if (finished) return;
    finished = true;
    const nextName = input.value.trim() || originalName;
    if (nextName !== originalName) {
      pushHistory("原地修改和弦");
      ref.item.name = nextName;
      rememberQuickChord(nextName);
    }
    sortAllEvents();
    restoreSelectionByItem("chord", ref.item);
    render();
  };
  const cancel = () => {
    if (finished) return;
    finished = true;
    restoreSelectionByItem("chord", ref.item);
    render();
  };

  input.addEventListener("keydown", (keyEvent) => {
    if (keyEvent.key === "Enter") {
      keyEvent.preventDefault();
      commit();
    } else if (keyEvent.key === "Escape") {
      keyEvent.preventDefault();
      cancel();
    }
  });
  input.addEventListener("blur", commit, { once: true });

  label.replaceChildren(input, datalist);
  block.classList.add("editing");
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function hideChordEditPopover() {
  state.chordEdit.anchor = null;
  if (state.chordEdit.element) state.chordEdit.element.hidden = true;
}

function stopTimelineEvent(event) {
  event.stopPropagation();
}

function startTimelinePan(event) {
  if (event.button !== 0) return;
  if (!isTimelinePanTarget(event.target)) return;
  const scroller = els.timelineCanvas.closest(".timeline-scroll");
  if (!scroller) return;

  state.timelinePan = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startScrollLeft: scroller.scrollLeft,
    startScrollTop: scroller.scrollTop,
    scroller,
    hasMoved: false,
    suppressNextClick: false,
  };
  els.timelineCanvas.setPointerCapture(event.pointerId);
  els.timelineCanvas.classList.add("panning");
}

function isTimelinePanTarget(target) {
  return !target.closest(
    "button, input, select, textarea, .bar, .chord-block, .lyric-token, .chord-resize-handle, .bar-actions, .lyric-quick-chord, .lane-quick-chord, .chord-edit-popover",
  );
}

function applyTimelinePan(event) {
  const pan = state.timelinePan;
  if (!pan || event.pointerId !== pan.pointerId) return false;

  const deltaX = event.clientX - pan.startX;
  const deltaY = event.clientY - pan.startY;
  if (!pan.hasMoved && Math.hypot(deltaX, deltaY) < 3) return true;

  pan.hasMoved = true;
  pan.suppressNextClick = true;
  pan.scroller.scrollLeft = pan.startScrollLeft - deltaX;
  pan.scroller.scrollTop = pan.startScrollTop - deltaY;
  event.preventDefault();
  return true;
}

function endTimelinePan(event) {
  const pan = state.timelinePan;
  if (!pan || event.pointerId !== pan.pointerId) return false;
  if (els.timelineCanvas.hasPointerCapture(event.pointerId)) {
    els.timelineCanvas.releasePointerCapture(event.pointerId);
  }
  els.timelineCanvas.classList.remove("panning");
  state.timelinePan = pan.suppressNextClick ? { suppressNextClick: true } : null;
  return true;
}

function suppressClickAfterTimelinePan(event) {
  if (!state.timelinePan?.suppressNextClick) return;
  event.preventDefault();
  event.stopPropagation();
  state.timelinePan = null;
}

function attachDrag(el) {
  el.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const kind = event.currentTarget.dataset.kind;
    if (event.shiftKey && kind === "chord") {
      state.pendingChordRangeAnchor = state.lastChordSelectionPoint
        || (state.selection?.kind === "chord" ? chordPointFromSelection(state.selection) : null);
      state.pendingLyricRangeAnchor = null;
    } else if (event.shiftKey && kind === "lyric") {
      state.pendingLyricRangeAnchor = state.lastLyricSelectionPoint
        || (state.selection?.kind === "lyric" ? pointFromSelection(state.selection) : null);
      state.pendingChordRangeAnchor = null;
    } else {
      state.pendingChordRangeAnchor = null;
      state.pendingLyricRangeAnchor = null;
    }
    setSelectionFromElement(event.currentTarget);
    const ref = selectionRef();
    if (!ref) return;

    el.setPointerCapture(event.pointerId);
    state.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startTick: ref.item.tick,
      startGlobalTick: ref.globalTick,
      startDurationTicks: ref.kind === "chord" ? ref.item.durationTicks : null,
      kind: ref.kind,
      item: ref.item,
      original: snapshotMovableItems(ref),
      hasMoved: false,
      historyLabel: ref.kind === "chord" ? "拖动和弦" : "拖动歌词",
      element: el,
      shiftKey: event.shiftKey,
    };
    el.classList.add("dragging");
  });
}

function handleDocumentPointerMove(event) {
  if (applyTimelinePan(event)) return;
  if (state.resize && event.pointerId === state.resize.pointerId) {
    applyChordResize(event);
    return;
  }
  if (!state.drag || event.pointerId !== state.drag.pointerId) return;
  const ref = refForDraggedItem();
  if (!ref) return;
  const deltaTicks = snapTick(beatsToTicks((event.clientX - state.drag.startX) / state.pxPerBeat));
  if (!state.drag.hasMoved && deltaTicks !== 0) {
    pushHistory(state.drag.historyLabel);
    state.drag.hasMoved = true;
  }
  applyDragDelta(ref, deltaTicks);
}

function endDrag(event) {
  if (endTimelinePan(event)) return;
  if (state.resize && event.pointerId === state.resize.pointerId) {
    endChordResize();
    return;
  }
  if (!state.drag || event.pointerId !== state.drag.pointerId) return;
  const didMove = state.drag.hasMoved;
  const draggedElement = state.drag.element;
  const shiftKey = state.drag.shiftKey;
  sortAllEvents();
  restoreSelectionByItem(state.drag.kind, state.drag.item);
  state.drag = null;
  if (!didMove) {
    draggedElement?.classList.remove("dragging");
    selectItemElement(draggedElement, shiftKey);
    state.suppressNextItemClick = true;
    return;
  }
  render();
}

function startChordResize(event) {
  event.preventDefault();
  event.stopPropagation();
  const block = event.currentTarget.closest(".chord-block");
  if (!block) return;
  setSelectionFromElement(block);
  const ref = selectionRef();
  if (!ref || ref.kind !== "chord") return;

  event.currentTarget.setPointerCapture(event.pointerId);
  state.resize = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startDurationTicks: ref.item.durationTicks,
    item: ref.item,
    hasMoved: false,
  };
  block.classList.add("resizing");
}

function applyChordResize(event) {
  const ref = refForResizeItem();
  if (!ref) return;
  const deltaTicks = snapTick(beatsToTicks((event.clientX - state.resize.startX) / state.pxPerBeat));
  if (!state.resize.hasMoved && deltaTicks !== 0) {
    pushHistory("调整和弦时值");
    state.resize.hasMoved = true;
  }
  const nextStart = nextChordStart(ref);
  const maxDuration = (nextStart ?? barLengthTicks()) - ref.item.tick;
  ref.item.durationTicks = clamp(
    snapTick(state.resize.startDurationTicks + deltaTicks),
    gridTicks(),
    Math.max(gridTicks(), maxDuration),
  );
  state.defaultChordDurationTicks = ref.item.durationTicks;
  savePreferences();
  restoreSelectionByItem("chord", ref.item);
  render();
}

function endChordResize() {
  const item = state.resize.item;
  sortAllEvents();
  restoreSelectionByItem("chord", item);
  state.resize = null;
  render();
}

function refForResizeItem() {
  if (!state.resize) return null;
  const location = findItemLocation("chord", state.resize.item);
  if (!location) return null;
  state.selection = {
    kind: "chord",
    sectionIndex: location.sectionIndex,
    barIndex: location.barIndex,
    itemIndex: location.itemIndex,
  };
  return selectionRef();
}

function snapshotMovableItems(ref) {
  if (ref.kind === "chord") {
    return flattenChords().map((candidate) => ({
      item: candidate.item,
      itemIndex: candidate.itemIndex,
      tick: candidate.item.tick,
      globalTick: candidate.globalTick,
      durationTicks: candidate.item.durationTicks,
      barStartTick: candidate.barStartTick,
      sectionIndex: candidate.sectionIndex,
      barIndex: candidate.barIndex,
    }));
  }

  return flattenLyrics().map((candidate) => ({
    item: candidate.item,
    tick: candidate.item.tick,
    globalTick: candidate.globalTick,
    barStartTick: candidate.barStartTick,
    sectionIndex: candidate.sectionIndex,
    barIndex: candidate.barIndex,
  }));
}

function applyDragDelta(ref, deltaTicks) {
  if (!state.drag) return;

  if (ref.kind === "chord") {
    applyChordDrag(deltaTicks);
    return;
  }

  applyLyricDrag(deltaTicks);
}

function applyChordDrag(deltaTicks) {
  if (els.chordMoveMode?.value === "follow") {
    applyFollowChordDrag(deltaTicks);
    return;
  }

  let bars = flattenBars();
  if (!bars.length) return;

  const desiredGlobalTick = snapTick(state.drag.startGlobalTick + deltaTicks);
  const lastBar = bars[bars.length - 1];
  if (desiredGlobalTick > lastBar.startTick + barLengthTicks() - gridTicks()) {
    ensureBarCount(Math.floor(desiredGlobalTick / barLengthTicks()) + 1);
    bars = flattenBars();
  }

  const lastStart = bars[bars.length - 1].startTick + barLengthTicks() - gridTicks();
  const globalTick = clampTick(desiredGlobalTick, lastStart);
  const targetBar = bars.find((barRef) => (
    globalTick >= barRef.startTick && globalTick < barRef.startTick + barLengthTicks()
  )) || bars[bars.length - 1];
  const sourceBar = findBarRefForItem(state.drag.item);
  if (!sourceBar || !targetBar) return;

  const localTick = clampTick(globalTick - targetBar.startTick, barLengthTicks() - gridTicks());
  if (sourceBar.bar !== targetBar.bar) {
    sourceBar.bar.chords = sourceBar.bar.chords.filter((chord) => chord !== state.drag.item);
    targetBar.bar.chords.push(state.drag.item);
  }

  const nextStart = nextChordStartInBar(targetBar.bar, state.drag.item, localTick);
  const maxDuration = Math.max(gridTicks(), (nextStart ?? barLengthTicks()) - localTick);
  state.drag.item.tick = localTick;
  state.drag.item.durationTicks = Math.min(state.drag.startDurationTicks || state.drag.item.durationTicks, maxDuration);
  state.workingBar = { sectionIndex: targetBar.sectionIndex, barIndex: targetBar.barIndex };
  sortAllEvents();
  restoreSelectionByItem("chord", state.drag.item);
  render();
}

function applyFollowChordDrag(deltaTicks) {
  let bars = flattenBars();
  if (!bars.length) return;

  let originalEntries = state.drag.original
    .filter((entry) => entry.item)
    .sort((a, b) => a.globalTick - b.globalTick || a.itemIndex - b.itemIndex);
  const selectedIndex = originalEntries.findIndex((entry) => entry.item === state.drag.item);
  if (selectedIndex < 0) return;

  const selectedEntry = originalEntries[selectedIndex];
  const previousEntry = originalEntries[selectedIndex - 1] || null;
  const trailingEntries = originalEntries.slice(selectedIndex);
  const requestedDelta = snapTick(deltaTicks);
  const minDelta = previousEntry
    ? previousEntry.globalTick + previousEntry.durationTicks - selectedEntry.globalTick
    : -selectedEntry.globalTick;
  const appliedDelta = Math.max(requestedDelta, minDelta);
  const trailingEnd = Math.max(...trailingEntries.map((entry) => entry.globalTick + appliedDelta + entry.durationTicks));

  if (trailingEnd > bars[bars.length - 1].startTick + barLengthTicks()) {
    ensureBarCount(Math.ceil(trailingEnd / barLengthTicks()));
    bars = flattenBars();
  }

  trailingEntries.forEach((entry) => {
    moveChordToGlobalTick(entry.item, entry.globalTick + appliedDelta, entry.durationTicks);
  });

  const draggedBarRef = findBarRefForItem(state.drag.item);
  state.workingBar = draggedBarRef
    ? { sectionIndex: draggedBarRef.sectionIndex, barIndex: draggedBarRef.barIndex }
    : state.workingBar;

  if (appliedDelta !== requestedDelta) {
    showMessage("前面没有足够空间，已限制和弦移动距离。", "warning");
  } else {
    clearDragWarning();
  }
  sortAllEvents();
  restoreSelectionByItem("chord", state.drag.item);
  render();
}

function moveChordToGlobalTick(chord, globalTick, durationTicks) {
  let bars = flattenBars();
  if (!bars.length) return;
  if (globalTick > bars[bars.length - 1].startTick + barLengthTicks() - gridTicks()) {
    ensureBarCount(Math.floor(globalTick / barLengthTicks()) + 1);
    bars = flattenBars();
  }

  const clampedGlobalTick = clamp(snapTick(globalTick), 0, bars[bars.length - 1].startTick + barLengthTicks() - gridTicks());
  const targetBar = bars.find((barRef) => (
    clampedGlobalTick >= barRef.startTick && clampedGlobalTick < barRef.startTick + barLengthTicks()
  )) || bars[bars.length - 1];
  const sourceBar = findBarRefForItem(chord);
  if (!sourceBar || !targetBar) return;

  if (sourceBar.bar !== targetBar.bar) {
    sourceBar.bar.chords = sourceBar.bar.chords.filter((item) => item !== chord);
    targetBar.bar.chords.push(chord);
  }

  const localTick = clampTick(clampedGlobalTick - targetBar.startTick, barLengthTicks() - gridTicks());
  chord.tick = localTick;
  chord.durationTicks = Math.min(durationTicks, Math.max(gridTicks(), barLengthTicks() - localTick));
}

function nextChordStartInBar(bar, item, tick) {
  return bar.chords
    .filter((chord) => chord !== item && chord.tick > tick)
    .sort((a, b) => a.tick - b.tick)[0]?.tick ?? null;
}

function applyLyricDrag(deltaTicks) {
  let slots = buildLyricEditSlots();
  if (slots.length === 0) return;

  const slotDelta = Math.round(deltaTicks / gridTicks());
  let originalEntries = state.drag.original
    .map((entry) => ({ ...entry, slot: editSlotForGlobalTick(slots, entry.globalTick) }))
    .sort((a, b) => a.slot - b.slot);
  const selectedIndex = originalEntries.findIndex((entry) => entry.item === state.drag.item);
  if (selectedIndex < 0) return;

  const originalSlot = originalEntries[selectedIndex].slot;
  const desiredSlot = originalSlot + slotDelta;

  const moveMode = els.lyricMoveMode.value;
  if (moveMode === "single") {
    if (desiredSlot > slots.length - 1) {
      ensureLyricSlotCapacity(desiredSlot + 1);
      slots = buildLyricEditSlots();
      originalEntries = state.drag.original
        .map((entry) => ({ ...entry, slot: editSlotForGlobalTick(slots, entry.globalTick) }))
        .sort((a, b) => a.slot - b.slot);
    }
    const targetSlot = clamp(desiredSlot, 0, slots.length - 1);
    moveLyricToGlobalTick(state.drag.item, slots[targetSlot].globalTick, originalEntries[selectedIndex]);
    rebuildLyricLines();
    sortAllEvents();
    restoreSelectionByItem("lyric", state.drag.item);
    clearDragWarning();
    render();
    return;
  }

  if (moveMode === "bar-follow" || moveMode === "bar-compact") {
    applyBarLyricDrag(slots, originalEntries, selectedIndex, desiredSlot, moveMode);
    return;
  }

  const trailingEntries = originalEntries.slice(selectedIndex);
  const trailingLastSlot = trailingEntries[trailingEntries.length - 1].slot;
  if (desiredSlot > originalSlot) {
    ensureLyricSlotCapacity(trailingLastSlot + slotDelta + 1);
    slots = buildLyricEditSlots();
    originalEntries = state.drag.original
      .map((entry) => ({ ...entry, slot: editSlotForGlobalTick(slots, entry.globalTick) }))
      .sort((a, b) => a.slot - b.slot);
  }

  const maxShiftRight = slots.length - 1 - originalEntries[originalEntries.length - 1].slot;
  const appliedSlotDelta = clamp(slotDelta, -selectedIndex, maxShiftRight);
  const assignedSlots = originalEntries.map((entry) => entry.slot);
  for (let index = selectedIndex; index < assignedSlots.length; index += 1) {
    assignedSlots[index] = originalEntries[index].slot + appliedSlotDelta;
  }

  const normalizedSlots = assignedSlots.map((slot) => clamp(slot, 0, slots.length - 1));
  if (appliedSlotDelta !== slotDelta) {
    showMessage("前面没有足够空格，已限制移动距离。", "warning");
  } else {
    clearDragWarning();
  }

  originalEntries.forEach((entry, index) => {
    moveLyricToGlobalTick(entry.item, slots[normalizedSlots[index]].globalTick, entry);
  });
  rebuildLyricLines();
  sortAllEvents();
  restoreSelectionByItem("lyric", state.drag.item);
  render();
}

function applyBarLyricDrag(slots, originalEntries, selectedIndex, desiredSlot, moveMode) {
  const selectedEntry = originalEntries[selectedIndex];
  const barEntries = originalEntries
    .filter((entry) => entry.sectionIndex === selectedEntry.sectionIndex && entry.barIndex === selectedEntry.barIndex)
    .sort((a, b) => a.slot - b.slot);
  const barSelectedIndex = barEntries.findIndex((entry) => entry.item === state.drag.item);
  if (barSelectedIndex < 0) return;

  const barRef = findBarRefForItem(state.drag.item);
  if (!barRef) return;
  const barStartSlot = editSlotForGlobalTick(slots, barRef.startTick);
  const barEndSlot = editSlotForGlobalTick(slots, barRef.startTick + barLengthTicks() - gridTicks());
  const previousSlot = barEntries[barSelectedIndex - 1]?.slot ?? (barStartSlot - 1);
  const minSelectedSlot = previousSlot + 1;
  const targetSlot = clamp(desiredSlot, minSelectedSlot, barEndSlot);
  const trailingEntries = barEntries.slice(barSelectedIndex);
  const assigned = new Map();

  if (moveMode === "bar-compact") {
    const compactStart = clamp(targetSlot, minSelectedSlot, Math.max(minSelectedSlot, barEndSlot - trailingEntries.length + 1));
    trailingEntries.forEach((entry, offset) => {
      assigned.set(entry.item, compactStart + offset);
    });
    if (compactStart !== targetSlot) showMessage("本小节剩余格子不够，已限制紧凑起点。", "warning");
    else clearDragWarning();
  } else {
    const appliedSlotDelta = clamp(targetSlot - selectedEntry.slot, minSelectedSlot - selectedEntry.slot, barEndSlot - trailingEntries[trailingEntries.length - 1].slot);
    trailingEntries.forEach((entry) => {
      assigned.set(entry.item, entry.slot + appliedSlotDelta);
    });
    if (appliedSlotDelta !== targetSlot - selectedEntry.slot) {
      showMessage("本小节没有足够空格，已限制移动距离。", "warning");
    } else {
      clearDragWarning();
    }
  }

  barEntries.forEach((entry) => {
    const nextSlot = assigned.get(entry.item) ?? entry.slot;
    moveLyricToGlobalTick(entry.item, slots[nextSlot].globalTick, entry);
  });
  rebuildLyricLines();
  sortAllEvents();
  restoreSelectionByItem("lyric", state.drag.item);
  render();
}

function clearDragWarning() {
  if (els.messageArea.classList.contains("warning")) {
    showMessage("拖动已应用。");
  }
}

function selectFromElement(event) {
  setSelectionFromElement(event.currentTarget);
  state.chordRange = null;
  state.lyricRange = null;
  state.barRange = null;
  render();
}

function selectChordBlock(event) {
  if (state.suppressNextItemClick) {
    state.suppressNextItemClick = false;
    return;
  }
  selectChordElement(event.currentTarget, event.shiftKey);
}

function selectChordElement(element, shiftKey = false) {
  if (!element) return;
  const anchorPoint = state.pendingChordRangeAnchor
    || state.lastChordSelectionPoint
    || (state.selection?.kind === "chord" ? chordPointFromSelection(state.selection) : null);
  const focusPoint = chordPointFromElement(element);
  if (shiftKey && anchorPoint) {
    state.chordRange = {
      anchor: anchorPoint,
      focus: focusPoint,
    };
    state.lyricRange = null;
    state.barRange = null;
  } else {
    state.chordRange = null;
    state.lyricRange = null;
    state.barRange = null;
    state.lastChordSelectionPoint = focusPoint;
  }
  state.pendingChordRangeAnchor = null;
  setSelectionFromElement(element);
  render();
  const rangeCount = selectedChordEntries().length;
  if (state.chordRange && rangeCount > 0) {
    showMessage(`已选中 ${rangeCount} 个和弦。`);
  }
}

function selectLyricToken(event) {
  if (state.suppressNextItemClick) {
    state.suppressNextItemClick = false;
    return;
  }
  selectLyricElement(event.currentTarget, event.shiftKey);
}

function selectLyricElement(element, shiftKey = false) {
  if (!element) return;
  const anchorPoint = state.pendingLyricRangeAnchor
    || state.lastLyricSelectionPoint
    || (state.selection?.kind === "lyric" ? pointFromSelection(state.selection) : null);
  const focusPoint = pointFromElement(element);
  if (shiftKey && anchorPoint) {
    state.lyricRange = {
      anchor: anchorPoint,
      focus: focusPoint,
    };
    state.chordRange = null;
    state.barRange = null;
  } else {
    state.lyricRange = null;
    state.chordRange = null;
    state.barRange = null;
    state.lastLyricSelectionPoint = focusPoint;
  }
  state.pendingLyricRangeAnchor = null;
  setSelectionFromElement(element);
  render();
  const rangeCount = selectedLyricEntries().length;
  if (state.lyricRange && rangeCount > 0) {
    showMessage(`已选中 ${rangeCount} 个歌词。`);
  }
}

function selectItemElement(element, shiftKey = false) {
  if (element?.dataset.kind === "chord") {
    selectChordElement(element, shiftKey);
  } else if (element?.dataset.kind === "lyric") {
    selectLyricElement(element, shiftKey);
  }
}

function chordPointFromSelection(selection) {
  return pointFromSelection(selection);
}

function pointFromSelection(selection) {
  return {
    sectionIndex: selection.sectionIndex,
    barIndex: selection.barIndex,
    itemIndex: selection.itemIndex,
  };
}

function chordPointFromElement(element) {
  return pointFromElement(element);
}

function pointFromElement(element) {
  return {
    sectionIndex: Number(element.dataset.sectionIndex),
    barIndex: Number(element.dataset.barIndex),
    itemIndex: Number(element.dataset.itemIndex),
  };
}

function markChordRangeSelection() {
  selectedChordEntries().forEach((entry) => {
    const selector = `.chord-block[data-section-index="${entry.sectionIndex}"][data-bar-index="${entry.barIndex}"][data-item-index="${entry.itemIndex}"]`;
    els.timelineCanvas.querySelector(selector)?.classList.add("range-selected");
  });
}

function isChordInSelectedRange(sectionIndex, barIndex, itemIndex) {
  if (!state.chordRange) return false;
  return selectedChordEntries().some((entry) => (
    entry.sectionIndex === sectionIndex
    && entry.barIndex === barIndex
    && entry.itemIndex === itemIndex
  ));
}

function isLyricInSelectedRange(sectionIndex, barIndex, itemIndex) {
  if (!state.lyricRange) return false;
  return selectedLyricEntries().some((entry) => (
    entry.sectionIndex === sectionIndex
    && entry.barIndex === barIndex
    && entry.itemIndex === itemIndex
  ));
}

function isBarInSelectedRange(sectionIndex, barIndex) {
  if (!state.barRange) return false;
  return selectedBarEntries().some((entry) => entry.sectionIndex === sectionIndex && entry.barIndex === barIndex);
}

function selectedChordEntries() {
  const chords = flattenChords();
  if (state.chordRange) {
    const anchor = chordEntryForPoint(state.chordRange.anchor, chords);
    const focus = chordEntryForPoint(state.chordRange.focus, chords);
    if (!anchor || !focus) return [];
    const start = Math.min(anchor.globalTick, focus.globalTick);
    const end = Math.max(anchor.globalTick, focus.globalTick);
    return chords.filter((entry) => entry.globalTick >= start && entry.globalTick <= end);
  }

  const ref = selectionRef();
  if (!ref || ref.kind !== "chord") return [];
  const entry = chordEntryForPoint(chordPointFromSelection(ref), chords);
  return entry ? [entry] : [];
}

function selectedLyricEntries() {
  const lyrics = flattenLyrics();
  if (state.lyricRange) {
    const anchor = lyricEntryForPoint(state.lyricRange.anchor, lyrics);
    const focus = lyricEntryForPoint(state.lyricRange.focus, lyrics);
    if (!anchor || !focus) return [];
    const start = Math.min(anchor.globalTick, focus.globalTick);
    const end = Math.max(anchor.globalTick, focus.globalTick);
    return lyrics.filter((entry) => entry.globalTick >= start && entry.globalTick <= end)
      .sort((a, b) => a.globalTick - b.globalTick || a.itemIndex - b.itemIndex);
  }

  const ref = selectionRef();
  if (!ref || ref.kind !== "lyric") return [];
  const entry = lyricEntryForPoint(pointFromSelection(ref), lyrics);
  return entry ? [entry] : [];
}

function selectedChordTimeWindow() {
  const entries = selectedChordEntries();
  if (entries.length === 0) return null;
  return {
    start: Math.min(...entries.map((entry) => entry.globalTick)),
    end: Math.max(...entries.map((entry) => entry.globalTick + entry.item.durationTicks)),
  };
}

function selectedLyricTimeWindow() {
  const entries = selectedLyricEntries();
  if (entries.length === 0) return null;
  return {
    start: Math.min(...entries.map((entry) => entry.globalTick)),
    end: Math.max(...entries.map((entry) => entry.globalTick + gridTicks())),
  };
}

function selectedTimelineTimeWindow() {
  if (state.chordRange || selectionRef()?.kind === "chord") return selectedChordTimeWindow();
  if (state.lyricRange || selectionRef()?.kind === "lyric") return selectedLyricTimeWindow();
  return null;
}

function chordEntriesInWindow(window) {
  if (!window) return [];
  return flattenChords()
    .filter((entry) => eventOverlapsWindow(entry.globalTick, entry.globalTick + entry.item.durationTicks, window))
    .sort((a, b) => a.globalTick - b.globalTick || a.itemIndex - b.itemIndex);
}

function lyricEntriesInWindow(window) {
  if (!window) return [];
  return flattenLyrics()
    .filter((entry) => eventOverlapsWindow(entry.globalTick, entry.globalTick + gridTicks(), window))
    .sort((a, b) => a.globalTick - b.globalTick || a.itemIndex - b.itemIndex);
}

function eventOverlapsWindow(startTick, endTick, window) {
  return startTick < window.end && endTick > window.start;
}

function chordEntryForPoint(point, chords = flattenChords()) {
  return chords.find((entry) => (
    entry.sectionIndex === point.sectionIndex
    && entry.barIndex === point.barIndex
    && entry.itemIndex === point.itemIndex
  ));
}

function lyricEntryForPoint(point, lyrics = flattenLyrics()) {
  return lyrics.find((entry) => (
    entry.sectionIndex === point.sectionIndex
    && entry.barIndex === point.barIndex
    && entry.itemIndex === point.itemIndex
  ));
}

function selectedBarEntries() {
  if (!state.barRange) return [];
  const bars = flattenBars();
  const anchor = barEntryForPoint(state.barRange.anchor, bars);
  const focus = barEntryForPoint(state.barRange.focus, bars);
  if (!anchor || !focus) return [];
  const start = Math.min(anchor.flatBarIndex, focus.flatBarIndex);
  const end = Math.max(anchor.flatBarIndex, focus.flatBarIndex);
  return bars.filter((entry) => entry.flatBarIndex >= start && entry.flatBarIndex <= end);
}

function barEntryForPoint(point, bars = flattenBars()) {
  return bars.find((entry) => entry.sectionIndex === point.sectionIndex && entry.barIndex === point.barIndex);
}

function barPointFromElement(element) {
  return {
    sectionIndex: Number(element.dataset.sectionIndex),
    barIndex: Number(element.dataset.barIndex),
  };
}

function barPointFromWorkingBar() {
  if (!state.workingBar) return null;
  return {
    sectionIndex: state.workingBar.sectionIndex,
    barIndex: state.workingBar.barIndex,
  };
}

function flattenChords() {
  return flattenBars().flatMap((barRef) => {
    return barRef.bar.chords.map((item, itemIndex) => ({
      ...barRef,
      item,
      itemIndex,
      globalTick: barRef.startTick + item.tick,
    }));
  }).sort((a, b) => a.globalTick - b.globalTick || a.itemIndex - b.itemIndex);
}

function copySelectedChords() {
  const ref = selectionRef();
  if (selectedChordEntries().length === 0) {
    if (state.lyricRange || ref?.kind === "lyric") {
      copySelectedLyrics();
      return;
    }
    if (state.barRange || (!ref && state.workingBar)) {
      copySelectedBars();
      return;
    }
  }
  copySelectedTimelineRange({ includeLyrics: false });
}

function copyCurrentSelection() {
  const ref = selectionRef();
  if (state.barRange || (!ref && state.workingBar)) {
    copySelectedBars();
  } else if (state.lyricRange || ref?.kind === "lyric") {
    copySelectedLyrics();
  } else if (state.chordRange || ref?.kind === "chord") {
    copySelectedChords();
  } else {
    showMessage("先选中和弦、歌词或小节再复制。", "warning");
  }
}

function copySelectedLyrics() {
  const lyricEntries = selectedLyricEntriesForCopy();
  if (lyricEntries.length === 0) {
    showMessage("先选中一个歌词，或 Shift 选一段歌词/和弦范围来复制其中歌词。", "warning");
    return;
  }

  const startTick = lyricEntries[0].globalTick;
  state.chordClipboard = {
    chords: [],
    lyrics: lyricEntries.map((entry) => ({
      offsetTicks: entry.globalTick - startTick,
      text: entry.item.text,
    })),
  };
  render();
  showMessage(`已复制 ${lyricEntries.length} 个歌词。`);
}

function copySelectedSegment() {
  if (state.barRange || (!selectionRef() && state.workingBar)) {
    copySelectedBars();
    return;
  }
  copySelectedTimelineRange({ includeLyrics: true });
}

function copySelectedBars() {
  const barEntries = selectedBarEntriesForCopy();
  if (barEntries.length === 0) {
    showMessage("先选中一个小节，或 Shift 选一段小节。", "warning");
    return;
  }

  state.chordClipboard = {
    bars: barEntries.map((entry) => structuredClone(entry.bar)),
  };
  render();
  showMessage(`已复制 ${barEntries.length} 个小节。`);
}

function selectedBarEntriesForCopy() {
  if (state.barRange) return selectedBarEntries();
  if (!selectionRef() && state.workingBar) return [workingBarRef()].filter(Boolean);
  return [];
}

function selectedLyricEntriesForCopy() {
  if (state.lyricRange) {
    return selectedLyricEntries();
  }

  if (state.chordRange) {
    return lyricEntriesInWindow(selectedChordTimeWindow());
  }

  const ref = selectionRef();
  return ref?.kind === "lyric" ? [ref] : [];
}

function copySelectedTimelineRange({ includeLyrics }) {
  if (!includeLyrics) {
    const entries = selectedChordEntries();
    if (entries.length === 0) {
      showMessage("先选中一个和弦，或 Shift 点选一个和弦范围。", "warning");
      return;
    }
    copyTimelineItems(entries, [], entries[0].globalTick, false);
    return;
  }

  const window = selectedTimelineTimeWindow();
  if (!window) {
    showMessage("先选中一个和弦/歌词，或 Shift 点选一个范围。", "warning");
    return;
  }
  const entries = chordEntriesInWindow(window);
  const lyricEntries = lyricEntriesInWindow(window);
  if (entries.length === 0 && lyricEntries.length === 0) {
    showMessage("当前范围里没有可复制的和弦或歌词。", "warning");
    return;
  }
  copyTimelineItems(entries, lyricEntries, window.start, true);
}

function copyTimelineItems(entries, lyricEntries, startTick, includeLyrics) {
  state.chordClipboard = {
    chords: entries.map((entry) => ({
      offsetTicks: entry.globalTick - startTick,
      name: entry.item.name,
      durationTicks: entry.item.durationTicks,
    })),
    lyrics: lyricEntries.map((entry) => ({
      offsetTicks: entry.globalTick - startTick,
      text: entry.item.text,
    })),
  };
  render();
  const lyricText = lyricEntries.length > 0 ? ` 和 ${lyricEntries.length} 个歌词` : "";
  showMessage(includeLyrics
    ? `已复制片段：${entries.length} 个和弦${lyricText}。`
    : `已复制 ${entries.length} 个和弦。`);
}

function pasteCopiedChords() {
  const clipboardBars = state.chordClipboard?.bars || [];
  const clipboardChords = state.chordClipboard?.chords || state.chordClipboard?.items || [];
  const clipboardLyrics = state.chordClipboard?.lyrics || [];
  if (clipboardBars.length > 0) {
    pasteCopiedBars(clipboardBars);
    return;
  }

  if (!clipboardChords.length && !clipboardLyrics.length) {
    showMessage("还没有复制和弦或歌词片段。", "warning");
    return;
  }

  const targetGlobalTick = pasteTargetGlobalTick();
  if (targetGlobalTick == null) {
    showMessage("先选中目标小节，或 hover 到目标和弦槽位。", "warning");
    return;
  }

  const chordEnd = clipboardChords.map((item) => item.offsetTicks + item.durationTicks);
  const lyricEnd = clipboardLyrics.map((item) => item.offsetTicks + gridTicks());
  const lastOffset = Math.max(0, ...chordEnd, ...lyricEnd);
  pushHistory(clipboardLyrics.length > 0 ? "粘贴和弦歌词片段" : "粘贴和弦");
  ensureBarCount(Math.floor((targetGlobalTick + lastOffset) / barLengthTicks()) + 1);
  const bars = flattenBars();
  const pasted = [];
  const pastedLyrics = [];

  clipboardChords.forEach((item) => {
    const globalTick = targetGlobalTick + item.offsetTicks;
    const barRef = bars.find((candidate) => globalTick >= candidate.startTick && globalTick < candidate.startTick + barLengthTicks());
    if (!barRef) return;
    const localTick = clampTick(globalTick - barRef.startTick, barLengthTicks() - gridTicks());
    const chord = {
      tick: localTick,
      name: item.name,
      durationTicks: Math.max(gridTicks(), Math.min(item.durationTicks, barLengthTicks() - localTick)),
    };
    barRef.bar.chords.push(chord);
    pasted.push({ barRef, chord });
  });

  clipboardLyrics.forEach((item) => {
    const globalTick = targetGlobalTick + item.offsetTicks;
    const barRef = bars.find((candidate) => globalTick >= candidate.startTick && globalTick < candidate.startTick + barLengthTicks());
    if (!barRef) return;
    const lyric = {
      tick: clampTick(globalTick - barRef.startTick, barLengthTicks() - gridTicks()),
      text: item.text ?? "",
    };
    barRef.bar.lyrics.push(lyric);
    pastedLyrics.push({ barRef, lyric });
  });

  sortAllEvents();
  if (pasted.length > 0) {
    const first = pasted[0];
    uniqueChordNames(pasted.map((entry) => entry.chord.name)).forEach((name) => rememberQuickChord(name));
    restoreSelectionByItem("chord", first.chord);
    state.workingBar = { sectionIndex: first.barRef.sectionIndex, barIndex: first.barRef.barIndex };
  } else if (pastedLyrics.length > 0) {
    const first = pastedLyrics[0];
    restoreSelectionByItem("lyric", first.lyric);
    state.workingBar = { sectionIndex: first.barRef.sectionIndex, barIndex: first.barRef.barIndex };
  }
  state.chordRange = null;
  state.lyricRange = null;
  state.barRange = null;
  rebuildLyricLines();
  render();
  showMessage(pasteResultMessage(pasted.length, pastedLyrics.length));
}

function pasteResultMessage(chordCount, lyricCount) {
  if (chordCount > 0 && lyricCount > 0) return `已粘贴 ${chordCount} 个和弦 和 ${lyricCount} 个歌词。`;
  if (chordCount > 0) return `已粘贴 ${chordCount} 个和弦。`;
  if (lyricCount > 0) return `已粘贴 ${lyricCount} 个歌词。`;
  return "没有可粘贴的内容。";
}

function pasteCopiedBars(clipboardBars) {
  if (!clipboardBars.length) return;
  const insertIndex = pasteTargetBarIndex();
  pushHistory(clipboardBars.length > 1 ? "粘贴多个小节" : "粘贴小节");
  const copiedBars = clipboardBars.map((bar) => structuredClone(bar));
  insertBarsAtFlatIndex(insertIndex, copiedBars);
  syncDisplayLinesToBars();
  sortAllEvents();

  const bars = flattenBars();
  const first = bars[insertIndex] || bars[bars.length - copiedBars.length] || bars[0];
  const last = bars[insertIndex + copiedBars.length - 1] || first;
  state.selection = null;
  state.workingBar = first ? { sectionIndex: first.sectionIndex, barIndex: first.barIndex } : null;
  state.chordRange = null;
  state.lyricRange = null;
  if (first && last && copiedBars.length > 1) {
    state.barRange = {
      anchor: { sectionIndex: first.sectionIndex, barIndex: first.barIndex },
      focus: { sectionIndex: last.sectionIndex, barIndex: last.barIndex },
    };
  } else {
    state.barRange = null;
  }
  state.lastBarSelectionPoint = first ? { sectionIndex: first.sectionIndex, barIndex: first.barIndex } : null;
  render();
  showMessage(`已粘贴 ${copiedBars.length} 个小节。`);
}

function pasteTargetBarIndex() {
  const selectedBars = selectedBarEntries();
  if (selectedBars.length > 0) return selectedBars[0].flatBarIndex;
  const ref = selectionRef();
  if (ref) return ref.flatBarIndex;
  const workingBar = workingBarRef();
  if (workingBar) return workingBar.flatBarIndex;
  return flattenBars().length;
}

function insertBarsAtFlatIndex(flatIndex, barsToInsert) {
  const bars = flattenBars();
  if (bars.length === 0) {
    const section = state.chart.sections[0] || createSection();
    if (!state.chart.sections.includes(section)) state.chart.sections.push(section);
    section.bars.push(...barsToInsert);
    return;
  }

  if (flatIndex >= bars.length) {
    const last = bars[bars.length - 1];
    state.chart.sections[last.sectionIndex].bars.push(...barsToInsert);
    return;
  }

  const target = bars[Math.max(0, flatIndex)];
  state.chart.sections[target.sectionIndex].bars.splice(target.barIndex, 0, ...barsToInsert);
}

function pasteTargetGlobalTick() {
  if (state.laneChord.anchor) {
    const barRef = flattenBars().find((candidate) => (
      candidate.sectionIndex === Number(state.laneChord.anchor.dataset.sectionIndex)
      && candidate.barIndex === Number(state.laneChord.anchor.dataset.barIndex)
    ));
    if (barRef) return barRef.startTick + Number(state.laneChord.anchor.dataset.tick);
  }

  const ref = selectionRef();
  if (ref?.kind === "chord" || ref?.kind === "lyric") return ref.globalTick;
  const workingBar = workingBarRef();
  if (workingBar) return workingBar.startTick;
  return flattenBars()[0]?.startTick ?? null;
}

function pasteTargetGlobalTickLabel() {
  const globalTick = pasteTargetGlobalTick();
  if (globalTick == null) return "第 1 小节";
  const bars = flattenBars();
  const barRef = bars.find((candidate) => globalTick >= candidate.startTick && globalTick < candidate.startTick + barLengthTicks()) || bars[0];
  if (!barRef) return "第 1 小节";
  return `第 ${barRef.flatBarIndex + 1} 小节 ${positionLabel(globalTick - barRef.startTick)}`;
}

function setSelectionFromElement(target) {
  state.selection = {
    kind: target.dataset.kind,
    sectionIndex: Number(target.dataset.sectionIndex),
    barIndex: Number(target.dataset.barIndex),
    itemIndex: Number(target.dataset.itemIndex),
  };
  state.workingBar = {
    sectionIndex: state.selection.sectionIndex,
    barIndex: state.selection.barIndex,
  };
}

function selectBarFromElement(event) {
  if (event.target.closest(".bar-actions")) return;
  const focusPoint = barPointFromElement(event.currentTarget);
  const anchorPoint = state.lastBarSelectionPoint || barPointFromWorkingBar();
  state.selection = null;
  state.chordRange = null;
  state.lyricRange = null;
  if (event.shiftKey && anchorPoint) {
    state.barRange = {
      anchor: anchorPoint,
      focus: focusPoint,
    };
  } else {
    state.barRange = null;
    state.lastBarSelectionPoint = focusPoint;
  }
  state.workingBar = {
    sectionIndex: Number(event.currentTarget.dataset.sectionIndex),
    barIndex: Number(event.currentTarget.dataset.barIndex),
  };
  render();
  const count = selectedBarEntries().length;
  if (state.barRange && count > 0) showMessage(`已选中 ${count} 个小节。`);
}

function renderInspector() {
  const ref = selectionRef();
  if (!ref) {
    const workingBar = workingBarRef();
    const selectedBars = selectedBarEntries();
    if (selectedBars.length > 1) {
      els.selectionPanel.innerHTML = `
        <p class="empty-state">已选中 ${selectedBars.length} 个小节。可整体删除这些小节。</p>
        <button id="deleteSelectionButton" class="button danger">删除 ${selectedBars.length} 个小节</button>
      `;
      document.getElementById("deleteSelectionButton").addEventListener("click", deleteSelection);
    } else {
      els.selectionPanel.innerHTML = workingBar
        ? `<p class="empty-state">当前小节：第 ${workingBar.flatBarIndex + 1} 小节。可添加和弦，或从这里开始铺歌词。按 Delete 可删除当前小节。</p>`
        : `<p class="empty-state">选择一个小节、和弦或歌词 token。</p>`;
    }
    return;
  }

  if (ref.kind === "chord") {
    const options = chordOptionsHtml(PRESET_CHORDS);
    const selectedChordCount = state.chordRange ? selectedChordEntries().length : 1;
    const deleteLabel = selectedChordCount > 1 ? `删除 ${selectedChordCount} 个和弦` : "删除和弦";
    els.selectionPanel.innerHTML = `
      <h3>和弦 · 第 ${ref.flatBarIndex + 1} 小节</h3>
      <label>名称
        <input id="chordNameInput" list="chordNames" type="text" value="${escapeHtml(ref.item.name)}">
        <datalist id="chordNames">${options}</datalist>
      </label>
      <div class="form-row">
        <label>起始拍<input id="chordBeatInput" type="number" min="1" max="${state.chart.beatsPerBar}" step="1" value="${localBeatNumberValue(ref.item.tick)}"></label>
        <label>拍内位置<select id="chordBeatPartInput">${beatPartOptions(ref.item.tick)}</select></label>
        <label>时值（拍）<input id="chordDurationInput" type="number" min="${beatInputStep()}" step="${beatInputStep()}" value="${ticksToBeats(ref.item.durationTicks)}"></label>
      </div>
      <p class="position-hint">${positionLabel(ref.item.tick)} · 时值 ${ticksToBeats(ref.item.durationTicks)} 拍</p>
      <button id="deleteSelectionButton" class="button danger">${deleteLabel}</button>
    `;
    bindLiveTextInput("chordNameInput", (value, currentRef) => {
      currentRef.item.name = value.trim() || "C";
    });
    bindPositionInputs("chordBeatInput", "chordBeatPartInput", (currentRef, tick) => {
      currentRef.item.tick = clampTick(tick, barLengthTicks() - currentRef.item.durationTicks);
    });
    bindInspectorInput("chordDurationInput", "change", (value) => {
      ref.item.durationTicks = clampDurationTicks(ref, beatsToTicks(value));
      state.defaultChordDurationTicks = ref.item.durationTicks;
      savePreferences();
    });
  } else {
    const selectedLyricCount = state.lyricRange ? selectedLyricEntries().length : 1;
    const deleteLabel = selectedLyricCount > 1 ? `删除 ${selectedLyricCount} 个歌词` : "删除歌词";
    els.selectionPanel.innerHTML = `
      <h3>歌词 · 第 ${ref.flatBarIndex + 1} 小节</h3>
      <label>文本<input id="lyricTextInput" type="text" value="${escapeHtml(ref.item.text)}"></label>
      <div class="form-row">
        <label>所在拍<input id="lyricBeatInput" type="number" min="1" max="${state.chart.beatsPerBar}" step="1" value="${localBeatNumberValue(ref.item.tick)}"></label>
        <label>拍内位置<select id="lyricBeatPartInput">${beatPartOptions(ref.item.tick)}</select></label>
      </div>
      <p class="position-hint">${positionLabel(ref.item.tick)}${selectedLyricCount > 1 ? ` · 已选 ${selectedLyricCount} 个歌词` : ""}</p>
      <div class="form-row">
        <button id="insertLyricBeforeButton" class="button" type="button">前插歌词</button>
        <button id="insertLyricAfterButton" class="button" type="button">后插歌词</button>
      </div>
      <button id="mergeNextLyricButton" class="button" type="button">合并后一个歌词</button>
      <button id="deleteSelectionButton" class="button danger">${deleteLabel}</button>
    `;
    bindLiveTextInput("lyricTextInput", (value, currentRef) => {
      currentRef.item.text = value;
    });
    bindPositionInputs("lyricBeatInput", "lyricBeatPartInput", (currentRef, tick) => {
      currentRef.item.tick = clampTick(tick, barLengthTicks() - gridTicks());
    });
    document.getElementById("insertLyricBeforeButton").addEventListener("click", () => insertLyricNearSelection("before"));
    document.getElementById("insertLyricAfterButton").addEventListener("click", () => insertLyricNearSelection("after"));
    document.getElementById("mergeNextLyricButton").addEventListener("click", mergeNextLyric);
  }

  document.getElementById("deleteSelectionButton").addEventListener("click", deleteSelection);
}

function bindInspectorInput(id, eventName, apply) {
  const input = document.getElementById(id);
  const handler = () => {
    const ref = selectionRef();
    if (!ref) return;
    if (!input.dataset.historyStarted) {
      pushHistory("编辑检查器");
      input.dataset.historyStarted = "1";
    }
    apply(input.value, ref);
    if (ref.kind === "lyric") rebuildLyricLines();
    sortAllEvents();
    restoreSelection(ref);
    render();
  };
  input.addEventListener(eventName, handler);
  if (eventName === "change") input.addEventListener("input", handler);
}

function bindLiveTextInput(id, apply) {
  const input = document.getElementById(id);
  input.addEventListener("focus", () => {
    if (!input.dataset.historyStarted && selectionRef()) {
      pushHistory("编辑文本");
      input.dataset.historyStarted = "1";
    }
  });
  input.addEventListener("input", () => {
    const ref = selectionRef();
    if (!ref) return;
    apply(input.value, ref);
    if (ref.kind === "lyric") rebuildLyricLines();
    updateSelectedElementText(ref);
    renderValidation();
  });
  input.addEventListener("change", () => {
    const ref = selectionRef();
    if (!ref) return;
    if (ref.kind === "chord") rememberQuickChord(ref.item.name);
    sortAllEvents();
    restoreSelection(ref);
    render();
  });
}

function updateSelectedElementText(ref) {
  const selector = `[data-kind="${ref.kind}"][data-section-index="${ref.sectionIndex}"][data-bar-index="${ref.barIndex}"][data-item-index="${ref.itemIndex}"]`;
  const el = els.timelineCanvas.querySelector(selector);
  if (!el) return;
  if (ref.kind === "lyric") {
    const text = el.querySelector(".lyric-token-text");
    if (text) text.textContent = ref.item.text || " ";
  } else {
    const label = el.querySelector(".chord-block-label");
    if (label) label.textContent = ref.item.name || "C";
    el.classList.toggle("unsupported", !isPlayableChord(ref.item.name));
  }
}

function bindPositionInputs(beatInputId, partInputId, apply) {
  const beatInput = document.getElementById(beatInputId);
  const partInput = document.getElementById(partInputId);
  const handler = () => {
    const ref = selectionRef();
    if (!ref) return;
    if (!beatInput.dataset.historyStarted) {
      pushHistory("调整位置");
      beatInput.dataset.historyStarted = "1";
    }
    apply(ref, positionInputsToTick(beatInput, partInput));
    sortAllEvents();
    restoreSelection(ref);
    render();
  };
  beatInput.addEventListener("change", handler);
  beatInput.addEventListener("input", handler);
  partInput.addEventListener("change", handler);
}

function focusInspectorField(id) {
  requestAnimationFrame(() => {
    const input = document.getElementById(id);
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function addChord() {
  if (!state.chart) return;
  const ref = selectionRef();
  const bars = flattenBars();
  const targetBar = ref
    ? bars.find((bar) => bar.sectionIndex === ref.sectionIndex && bar.barIndex === ref.barIndex)
    : workingBarRef() || bars[0];
  if (!targetBar) return;
  const tick = ref?.kind === "lyric" ? ref.item.tick : 0;
  pushHistory("添加和弦");
  createChordAt(targetBar, tick, defaultChordName());
  focusInspectorField("chordNameInput");
}

function addChordAtLyric(sectionIndex, barIndex, lyricIndex, chordName) {
  const section = state.chart?.sections?.[sectionIndex];
  const bar = section?.bars?.[barIndex];
  const lyric = bar?.lyrics?.[lyricIndex];
  if (!bar || !lyric) return;

  const name = chordName || defaultChordName();
  pushHistory("歌词上添加和弦");
  rememberQuickChord(name);
  let chord = bar.chords.find((candidate) => candidate.tick === lyric.tick);
  if (chord) {
    chord.name = name;
  } else {
    const durationTicks = defaultChordDurationForTick(lyric.tick);
    chord = { tick: lyric.tick, name, durationTicks };
    bar.chords.push(chord);
  }

  bar.chords.sort((a, b) => a.tick - b.tick);
  state.selection = {
    kind: "chord",
    sectionIndex,
    barIndex,
    itemIndex: bar.chords.indexOf(chord),
  };
  state.workingBar = { sectionIndex, barIndex };
  render();
  showMessage(`已在歌词“${lyric.text || " "}”上添加 ${name}。`);
}

function createChordAt(barRef, tick, name) {
  const chord = {
    tick: clampTick(tick, barLengthTicks() - gridTicks()),
    name,
    durationTicks: defaultChordDurationForTick(tick),
  };
  barRef.bar.chords.push(chord);
  barRef.bar.chords.sort((a, b) => a.tick - b.tick);
  state.selection = {
    kind: "chord",
    sectionIndex: barRef.sectionIndex,
    barIndex: barRef.barIndex,
    itemIndex: barRef.bar.chords.indexOf(chord),
  };
  state.workingBar = {
    sectionIndex: barRef.sectionIndex,
    barIndex: barRef.barIndex,
  };
  render();
  showMessage(`${positionLabel(chord.tick)} 已添加 ${name}。`);
  return chord;
}

function defaultChordName() {
  if (!state.quickChordPalette.length) initializeQuickChordPalette(state.chart);
  return state.quickChordPalette.includes(state.selectedChordName)
    ? state.selectedChordName
    : (state.quickChordPalette[0] || "C");
}

function defaultChordDurationForTick(tick) {
  return Math.max(gridTicks(), Math.min(state.defaultChordDurationTicks, barLengthTicks() - tick));
}

function insertLyricNearSelection(position) {
  const ref = selectionRef();
  if (!ref || ref.kind !== "lyric") return;
  pushHistory(position === "before" ? "前插歌词" : "后插歌词");

  let slots = buildLyricEditSlots();
  let entries = flattenLyrics()
    .map((entry) => ({ ...entry, slot: editSlotForGlobalTick(slots, entry.globalTick) }))
    .sort((a, b) => a.slot - b.slot);
  const selectedIndex = entries.findIndex((entry) => entry.item === ref.item);
  if (selectedIndex < 0) return;

  const selectedSlot = entries[selectedIndex].slot;
  const insertSlot = position === "before" ? selectedSlot : selectedSlot + 1;
  const lastSlot = entries[entries.length - 1]?.slot ?? selectedSlot;
  ensureLyricSlotCapacity(Math.max(insertSlot, lastSlot) + 2);

  slots = buildLyricEditSlots();
  entries = flattenLyrics()
    .map((entry) => ({ ...entry, slot: editSlotForGlobalTick(slots, entry.globalTick) }))
    .sort((a, b) => b.slot - a.slot);

  entries
    .filter((entry) => entry.slot >= insertSlot)
    .forEach((entry) => {
      moveLyricToGlobalTick(entry.item, slots[entry.slot + 1].globalTick, entry);
    });

  const targetSlot = slots[insertSlot];
  const lyric = { tick: targetSlot.localTick, text: "" };
  targetSlot.barRef.bar.lyrics.push(lyric);
  rebuildLyricLines();
  sortAllEvents();
  restoreSelectionByItem("lyric", lyric);
  render();
  focusInspectorField("lyricTextInput");
  showMessage(position === "before" ? "已在前面插入歌词。" : "已在后面插入歌词。");
}

function mergeNextLyric() {
  const ref = selectionRef();
  if (!ref || ref.kind !== "lyric") return;

  const entries = flattenLyrics().sort((a, b) => a.globalTick - b.globalTick || a.itemIndex - b.itemIndex);
  const currentIndex = entries.findIndex((entry) => entry.item === ref.item);
  const next = entries[currentIndex + 1];
  if (!next) {
    showMessage("后面没有可合并的歌词。", "warning");
    return;
  }

  pushHistory("合并歌词");
  ref.item.text = `${ref.item.text || ""}${next.item.text || ""}`;
  next.bar.lyrics.splice(next.itemIndex, 1);
  rebuildLyricLines();
  sortAllEvents();
  restoreSelectionByItem("lyric", ref.item);
  render();
  showMessage("已合并后一个歌词。");
}

function appendBar() {
  if (!state.chart) return;
  pushHistory("添加小节");
  const sectionIndex = Math.max(0, state.chart.sections.length - 1);
  const section = state.chart.sections[sectionIndex] || createSection();
  if (!state.chart.sections.length) state.chart.sections.push(section);
  section.bars.push(createEmptyBar());
  state.selection = null;
  state.chordRange = null;
  state.lyricRange = null;
  state.barRange = null;
  state.workingBar = {
    sectionIndex,
    barIndex: section.bars.length - 1,
  };
  syncDisplayLinesToBars();
  render();
  showMessage(`已添加第 ${flattenBars().length} 小节。`);
}

function handleBarAction(event) {
  event.stopPropagation();
  const button = event.currentTarget;
  const sectionIndex = Number(button.dataset.sectionIndex);
  const barIndex = Number(button.dataset.barIndex);
  const action = button.dataset.barAction;
  if (action === "insert-before") {
    insertBar(sectionIndex, barIndex);
  } else if (action === "insert-after") {
    insertBar(sectionIndex, barIndex + 1);
  } else if (action === "delete") {
    deleteBar(sectionIndex, barIndex);
  }
}

function insertBar(sectionIndex, barIndex) {
  const section = state.chart?.sections?.[sectionIndex];
  if (!section) return;
  pushHistory("插入小节");
  const insertionIndex = clamp(barIndex, 0, section.bars.length);
  section.bars.splice(insertionIndex, 0, createEmptyBar());
  shiftSelectionAfterBarInsert(sectionIndex, insertionIndex);
  shiftWorkingBarAfterBarInsert(sectionIndex, insertionIndex);
  syncDisplayLinesToBars();
  render();
  showMessage(`已插入小节。`);
}

function deleteBar(sectionIndex, barIndex) {
  const section = state.chart?.sections?.[sectionIndex];
  if (!section || !section.bars[barIndex]) return;
  if (flattenBars().length <= 1) {
    showMessage("至少保留 1 个小节。", "warning");
    return;
  }
  pushHistory("删除小节");
  section.bars.splice(barIndex, 1);
  if (section.bars.length === 0 && state.chart.sections.length > 1) {
    state.chart.sections.splice(sectionIndex, 1);
  }
  state.selection = null;
  state.chordRange = null;
  state.lyricRange = null;
  state.barRange = null;
  state.workingBar = null;
  syncDisplayLinesToBars();
  render();
  showMessage("已删除小节。");
}

function createSection() {
  return { name: "Section 1", bars: [] };
}

function createEmptyBar() {
  return { chords: [], lyrics: [] };
}

function newBlankChart() {
  if (state.chart && !window.confirm("清空当前编辑内容并新建空谱？")) return;
  pushHistory("新建空谱");
  const chart = {
    format: "d15.timeline.v1",
    title: "Untitled",
    artist: "",
    bpm: 96,
    key: "C",
    originalKey: "",
    capo: 0,
    capoSource: "default",
    beatsPerBar: 4,
    beatUnit: 4,
    ticksPerBeat: DEFAULT_TICKS_PER_BEAT,
    chordBank: "C",
    displayLines: fixedDisplayLines(4, 4),
    sections: [
      {
        name: "main",
        bars: Array.from({ length: 4 }, createEmptyBar),
      },
    ],
  };
  state.gridFraction = DEFAULT_GRID_FRACTION;
  loadChart(chart, "已新建空白谱。");
}

function showLyricsBedDialog() {
  if (!state.chart) return;
  const workingBar = workingBarRef();
  const startLabel = workingBar ? `第 ${workingBar.flatBarIndex + 1} 小节` : "第 1 小节";
  els.lyricsPasteInput.value = state.lastLyricsPasteText || els.lyricsPasteInput.value || "";
  els.lyricsReplaceInput.value = "replace";
  els.lyricsBedDialog.hidden = false;
  showMessage(`铺歌词将从 ${startLabel} 开始。`);
  requestAnimationFrame(() => els.lyricsPasteInput.focus());
}

function hideLyricsBedDialog() {
  els.lyricsBedDialog.hidden = true;
}

function showChordsBedDialog() {
  if (!state.chart) return;
  const startLabel = pasteTargetGlobalTickLabel();
  els.chordsSequenceInput.value = state.lastChordsSequenceText || els.chordsSequenceInput.value || "";
  els.chordsBedDialog.hidden = false;
  showMessage(`铺和弦将从 ${startLabel} 开始。`);
  requestAnimationFrame(() => els.chordsSequenceInput.focus());
}

function hideChordsBedDialog() {
  els.chordsBedDialog.hidden = true;
}

function showOverviewDialog() {
  if (!state.chart) return;
  els.overviewDialog.hidden = false;
  renderOverviewSafely();
}

function hideOverviewDialog() {
  els.overviewDialog.hidden = true;
}

function renderOverview() {
  const bars = flattenBars();
  const overviewCapo = state.chart.capo ? ` · Capo ${state.chart.capo}` : "";
  els.overviewSummary.textContent = `${state.chart.title || "Untitled"} · ${state.chart.bpm} BPM · ${state.chart.key}${overviewCapo} · ${bars.length} 小节`;
  clearElement(els.overviewContent);
  updateOverviewTabs();
  updateOverviewLineControls();

  if (state.overviewMode === "lines") {
    renderLineOverview(bars);
    return;
  }

  const barsPerRow = 4;
  for (let start = 0; start < bars.length; start += barsPerRow) {
    const row = document.createElement("div");
    row.className = "overview-row";
    bars.slice(start, start + barsPerRow).forEach((barRef) => {
      row.append(createOverviewBar(barRef));
    });
    els.overviewContent.append(row);
  }
}

function renderOverviewSafely() {
  try {
    renderOverview();
  } catch (error) {
    console.error("Overview render failed", error);
    els.overviewSummary.textContent = "总览渲染失败";
    clearElement(els.overviewContent);
    const errorBox = document.createElement("div");
    errorBox.className = "overview-error";
    errorBox.textContent = `总览打开失败：${error?.message || error}`;
    els.overviewContent.append(errorBox);
  }
}

function setOverviewMode(mode) {
  state.overviewMode = ["bars", "lines"].includes(mode) ? mode : "bars";
  renderOverviewSafely();
}

function updateOverviewTabs() {
  els.overviewDialog.querySelectorAll("[data-overview-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.overviewMode === state.overviewMode);
  });
}

function updateOverviewLineControls() {
  els.overviewLineRuleInput.value = state.overviewLineRule;
  const isLineMode = state.overviewMode === "lines";
  els.overviewLineRuleInput.disabled = !isLineMode;
  els.applyOverviewLineRuleButton.disabled = !isLineMode;
}

function renderLineOverview(bars) {
  overviewLineGroups(bars).forEach((group) => {
    const block = document.createElement("button");
    block.type = "button";
    block.className = "overview-line-text";
    block.addEventListener("click", () => {
      jumpToBar(group.bars[0]);
      hideOverviewDialog();
    });
    const range = document.createElement("span");
    range.className = "overview-line-range";
    range.textContent = `${group.bars[0].flatBarIndex + 1}-${group.bars[group.bars.length - 1].flatBarIndex + 1}`;
    const text = document.createElement("span");
    text.className = "overview-line-title";
    text.textContent = group.line;
    block.append(range);
    block.append(text);
    els.overviewContent.append(block);
  });
}

function overviewLineGroups(bars) {
  if (state.overviewLineRule === "auto") return displayLineGroups(bars);
  const size = positiveInteger(state.overviewLineRule, 4) || 4;
  return fixedBarLineGroups(bars, size);
}

function fixedBarLineGroups(bars, size) {
  return groupsFromDisplayLines(bars, fixedDisplayLines(bars.length, size));
}

function displayLineGroups(bars) {
  return groupsFromDisplayLines(bars, state.chart.displayLines?.length ? state.chart.displayLines : fixedDisplayLines(bars.length, 4));
}

function groupsFromDisplayLines(bars, displayLines) {
  return displayLines
    .slice()
    .sort((a, b) => a.startBar - b.startBar)
    .map((line, index) => {
      const start = clamp(positiveInteger(line.startBar, 0), 0, Math.max(0, bars.length - 1));
      const count = clamp(positiveInteger(line.barCount, 1), 1, Math.max(1, bars.length - start));
      const groupBars = bars.slice(start, start + count);
      return {
        key: `display_${index}_${start}`,
        startBar: start,
        barCount: count,
        line: groupBars.map((barRef) => lyricTextForBar(barRef.bar)).join(""),
        bars: groupBars,
      };
    })
    .filter((group) => group.bars.length > 0);
}

function fixedDisplayLines(totalBars, size) {
  const lines = [];
  const safeSize = Math.max(1, positiveInteger(size, 4) || 4);
  for (let index = 0; index < totalBars; index += safeSize) {
    const count = Math.min(safeSize, totalBars - index);
    lines.push({
      startBar: index,
      barCount: count,
    });
  }
  return lines;
}

function appendFixedDisplayLines(lines, start, end, size) {
  fixedDisplayLines(Math.max(0, end - start), size).forEach((line) => {
    lines.push({
      startBar: start + line.startBar,
      barCount: line.barCount,
    });
  });
}

function syncDisplayLinesToBars() {
  if (!state.chart) return;
  state.chart.displayLines = normalizeDisplayLinesForChart(state.chart);
}

function applyOverviewLineRule() {
  const bars = flattenBars();
  pushHistory("应用换行");
  state.chart.displayLines = overviewLineGroups(bars).map((group) => ({
    startBar: group.startBar,
    barCount: group.barCount,
  }));
  render();
  renderOverviewSafely();
  showMessage("已应用换行规则。");
}

function createOverviewBar(barRef) {
  const bar = document.createElement("button");
  bar.type = "button";
  bar.className = "overview-bar";
  bar.dataset.sectionIndex = barRef.sectionIndex;
  bar.dataset.barIndex = barRef.barIndex;
  bar.title = `跳到第 ${barRef.flatBarIndex + 1} 小节`;
  bar.addEventListener("click", () => {
    jumpToBar(barRef);
    hideOverviewDialog();
  });

  const number = document.createElement("div");
  number.className = "overview-bar-number";
  number.textContent = String(barRef.flatBarIndex + 1);

  const chordLine = document.createElement("div");
  chordLine.className = "overview-chords";
  if (barRef.bar.chords.length === 0) {
    chordLine.textContent = "·";
  } else {
    barRef.bar.chords
      .slice()
      .sort((a, b) => a.tick - b.tick)
      .forEach((chord) => {
        const chordEl = document.createElement("span");
        chordEl.textContent = chord.name;
        chordEl.style.left = `${overviewPercent(chord.tick)}%`;
        chordLine.append(chordEl);
      });
  }

  const lyricLine = document.createElement("div");
  lyricLine.className = "overview-lyrics";
  if (barRef.bar.lyrics.length === 0) {
    lyricLine.textContent = "";
  } else {
    barRef.bar.lyrics
      .slice()
      .sort((a, b) => a.tick - b.tick || (a.order ?? 0) - (b.order ?? 0))
      .forEach((lyric) => {
        const lyricEl = document.createElement("span");
        const itemIndex = barRef.bar.lyrics.indexOf(lyric);
        lyricEl.textContent = lyric.text || " ";
        lyricEl.draggable = true;
        lyricEl.dataset.sectionIndex = barRef.sectionIndex;
        lyricEl.dataset.barIndex = barRef.barIndex;
        lyricEl.dataset.itemIndex = itemIndex;
        lyricEl.style.left = `${overviewPercent(lyric.tick)}%`;
        lyricEl.addEventListener("click", stopTimelineEvent);
        lyricEl.addEventListener("dragstart", handleOverviewLyricDragStart);
        lyricEl.addEventListener("dragend", handleOverviewLyricDragEnd);
        lyricLine.append(lyricEl);
      });
  }

  bar.addEventListener("dragover", handleOverviewBarDragOver);
  bar.addEventListener("drop", handleOverviewBarDrop);

  bar.append(number);
  bar.append(chordLine);
  bar.append(lyricLine);
  return bar;
}

function overviewPercent(tick) {
  return clamp((Number(tick) / Math.max(1, barLengthTicks())) * 100, 0, 96);
}

function overviewGroupPercent(barOffset, tick, totalTicks) {
  return clamp(((barOffset * barLengthTicks() + Number(tick)) / Math.max(1, totalTicks)) * 100, 0, 98);
}

function lyricTextForBar(bar) {
  return (bar.lyrics || [])
    .slice()
    .sort((a, b) => a.tick - b.tick || (a.order ?? 0) - (b.order ?? 0))
    .map((lyric) => lyric.text || "")
    .join("");
}

function handleOverviewLyricDragStart(event) {
  event.stopPropagation();
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/json", JSON.stringify({
    sectionIndex: Number(event.currentTarget.dataset.sectionIndex),
    barIndex: Number(event.currentTarget.dataset.barIndex),
    itemIndex: Number(event.currentTarget.dataset.itemIndex),
  }));
  event.currentTarget.classList.add("overview-dragging");
}

function handleOverviewLyricDragEnd(event) {
  event.currentTarget.classList.remove("overview-dragging");
}

function handleOverviewBarDragOver(event) {
  if (!Array.from(event.dataTransfer.types).includes("application/json")) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleOverviewBarDrop(event) {
  if (!Array.from(event.dataTransfer.types).includes("application/json")) return;
  event.preventDefault();
  event.stopPropagation();
  const payload = JSON.parse(event.dataTransfer.getData("application/json") || "{}");
  moveOverviewLyric(payload, event.currentTarget, event.clientX);
}

function moveOverviewLyric(payload, targetBarEl, clientX) {
  const sourceSection = state.chart.sections[payload.sectionIndex];
  const sourceBar = sourceSection?.bars?.[payload.barIndex];
  const lyric = sourceBar?.lyrics?.[payload.itemIndex];
  if (!sourceBar || !lyric) return;

  const targetSectionIndex = Number(targetBarEl.dataset.sectionIndex);
  const targetBarIndex = Number(targetBarEl.dataset.barIndex);
  const targetBar = state.chart.sections[targetSectionIndex]?.bars?.[targetBarIndex];
  if (!targetBar) return;
  pushHistory("总览拖动歌词");

  const lyricLane = targetBarEl.querySelector(".overview-lyrics");
  const rect = lyricLane.getBoundingClientRect();
  const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 0.98);
  const targetTick = clampTick(ratio * barLengthTicks(), barLengthTicks() - gridTicks());

  if (sourceBar !== targetBar) {
    sourceBar.lyrics.splice(payload.itemIndex, 1);
    targetBar.lyrics.push(lyric);
  }
  lyric.tick = targetTick;
  rebuildLyricLines();
  sortAllEvents();
  restoreSelectionByItem("lyric", lyric);
  render();
  renderOverviewSafely();
}

function jumpToBar(barRef) {
  const scroller = els.timelineCanvas.closest(".timeline-scroll");
  if (!scroller) return;
  const left = Math.max(0, barRef.startBeat * state.pxPerBeat - 24);
  scroller.scrollTo({ left, behavior: "smooth" });
  state.selection = null;
  state.chordRange = null;
  state.lyricRange = null;
  state.barRange = null;
  state.workingBar = { sectionIndex: barRef.sectionIndex, barIndex: barRef.barIndex };
  render();
}

function applyLyricsBed() {
  if (!state.chart) return;
  state.lastLyricsPasteText = els.lyricsPasteInput.value;
  const tokens = tokenizeLyricText(state.lastLyricsPasteText);
  if (tokens.length === 0) {
    showMessage("请先粘贴歌词文本。", "warning");
    return;
  }

  const startIndex = workingBarRef()?.flatBarIndex ?? selectionRef()?.flatBarIndex ?? 0;
  pushHistory("铺歌词");
  const slotsPerBar = lyricSlotsPerBar();
  const neededBars = startIndex + Math.ceil(tokens.length / slotsPerBar);
  ensureBarCount(neededBars);

  const bars = flattenBars();
  for (let barOffset = 0; barOffset < neededBars - startIndex; barOffset += 1) {
    const barRef = bars[startIndex + barOffset];
    if (!barRef) continue;
    const chunk = tokens.slice(barOffset * slotsPerBar, (barOffset + 1) * slotsPerBar);
    barRef.bar.lyrics = lyricsForSequentialTokens(chunk);
  }

  syncDisplayLinesToBars();
  sortAllEvents();
  state.selection = null;
  state.chordRange = null;
  state.lyricRange = null;
  state.barRange = null;
  const firstBar = bars[startIndex] || flattenBars()[0];
  state.workingBar = firstBar ? { sectionIndex: firstBar.sectionIndex, barIndex: firstBar.barIndex } : null;
  hideLyricsBedDialog();
  render();
  showMessage(`已从第 ${startIndex + 1} 小节连续铺入 ${tokens.length} 个歌词 token。`);
}

function applyChordsBed() {
  if (!state.chart) return;
  state.lastChordsSequenceText = els.chordsSequenceInput.value;
  const parsed = parseChordSequence(state.lastChordsSequenceText);
  if (parsed.errors.length > 0) {
    showMessage(parsed.errors[0], "warning");
    return;
  }
  if (parsed.items.length === 0) {
    showMessage("请先输入和弦序列。", "warning");
    return;
  }

  const startGlobalTick = pasteTargetGlobalTick() ?? 0;
  const totalTicks = parsed.items.reduce((sum, item) => sum + item.durationTicks, 0);
  pushHistory("铺和弦");
  ensureBarCount(Math.floor((startGlobalTick + totalTicks) / barLengthTicks()) + 1);
  removeChordsInGlobalRange(startGlobalTick, startGlobalTick + totalTicks);

  const added = [];
  let cursor = startGlobalTick;
  parsed.items.forEach((item) => {
    added.push(...appendChordAcrossBars(cursor, item.name, item.durationTicks));
    rememberQuickChord(item.name);
    cursor += item.durationTicks;
  });

  sortAllEvents();
  if (added.length > 0) {
    const first = added[0];
    restoreSelectionByItem("chord", first.chord);
    state.workingBar = { sectionIndex: first.barRef.sectionIndex, barIndex: first.barRef.barIndex };
  }
  state.chordRange = null;
  state.lyricRange = null;
  state.barRange = null;
  hideChordsBedDialog();
  render();
  const generated = uniqueChordNames(parsed.items.map((item) => item.name).filter((name) => chordSupportStatus(name) === "generated"));
  const unsupported = uniqueChordNames(parsed.items.map((item) => item.name).filter((name) => chordSupportStatus(name) === "unsupported"));
  if (unsupported.length > 0) {
    showMessage(`已铺入 ${added.length} 个和弦事件；${unsupported.join(" / ")} 当前 App 可能无法解析。`, "warning");
  } else if (generated.length > 0) {
    showMessage(`已铺入 ${added.length} 个和弦事件；${generated.join(" / ")} 将由 App 生成指法。`);
  } else {
    showMessage(`已按序列铺入 ${added.length} 个和弦事件。`);
  }
}

function parseChordSequence(text) {
  const errors = [];
  const items = [];
  String(text || "")
    .split(/[;；\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const parts = entry.split(/[,，]/).map((part) => part.trim()).filter(Boolean);
      if (parts.length !== 2) {
        errors.push(`格式不正确：${entry}，请使用“和弦,拍数;”。`);
        return;
      }
      const [name, beatsText] = parts;
      const beats = Number(beatsText);
      if (!name) errors.push(`缺少和弦名：${entry}`);
      if (!Number.isFinite(beats) || beats <= 0) errors.push(`拍数需要是正数：${entry}`);
      if (errors.length > 0) return;
      items.push({
        name,
        durationTicks: Math.max(gridTicks(), snapTick(beatsToTicks(beats))),
      });
    });
  return { items, errors };
}

function removeChordsInGlobalRange(startGlobalTick, endGlobalTick) {
  flattenBars().forEach((barRef) => {
    barRef.bar.chords = barRef.bar.chords.filter((chord) => {
      const globalTick = barRef.startTick + chord.tick;
      return globalTick < startGlobalTick || globalTick >= endGlobalTick;
    });
  });
}

function appendChordAcrossBars(startGlobalTick, name, durationTicks) {
  const added = [];
  let cursor = startGlobalTick;
  let remaining = durationTicks;
  while (remaining > 0) {
    const bars = flattenBars();
    const barRef = bars.find((candidate) => cursor >= candidate.startTick && cursor < candidate.startTick + barLengthTicks()) || bars[bars.length - 1];
    if (!barRef) break;
    const localTick = clampTick(cursor - barRef.startTick, barLengthTicks() - gridTicks());
    const segmentTicks = Math.max(gridTicks(), Math.min(remaining, barLengthTicks() - localTick));
    const chord = { tick: localTick, name, durationTicks: segmentTicks };
    barRef.bar.chords.push(chord);
    added.push({ barRef, chord });
    cursor += segmentTicks;
    remaining -= segmentTicks;
  }
  return added;
}

function clearLyricsFromCurrentBar() {
  if (!state.chart) return;
  const bars = flattenBars();
  if (bars.length === 0) return;
  const startIndex = workingBarRef()?.flatBarIndex ?? selectionRef()?.flatBarIndex ?? 0;
  const count = bars
    .slice(startIndex)
    .reduce((total, barRef) => total + barRef.bar.lyrics.length, 0);
  if (count === 0) {
    showMessage("当前小节之后没有歌词可清空。", "warning");
    return;
  }
  if (!window.confirm(`清空第 ${startIndex + 1} 小节及之后的 ${count} 个歌词 token？`)) return;

  pushHistory("清空后续歌词");
  bars.slice(startIndex).forEach((barRef) => {
    barRef.bar.lyrics = [];
  });
  state.selection = null;
  state.workingBar = bars[startIndex]
    ? { sectionIndex: bars[startIndex].sectionIndex, barIndex: bars[startIndex].barIndex }
    : null;
  rebuildLyricLines();
  render();
  showMessage(`已清空第 ${startIndex + 1} 小节及之后的 ${count} 个歌词 token。`);
}

function clearAllLyrics() {
  if (!state.chart) return;
  const bars = flattenBars();
  const count = bars.reduce((total, barRef) => total + barRef.bar.lyrics.length, 0);
  if (count === 0) {
    showMessage("没有歌词可清空。", "warning");
    return;
  }
  if (!window.confirm(`清空整首歌的 ${count} 个歌词 token？`)) return;

  pushHistory("清空全部歌词");
  bars.forEach((barRef) => {
    barRef.bar.lyrics = [];
  });
  state.selection = null;
  rebuildLyricLines();
  render();
  showMessage(`已清空全部 ${count} 个歌词 token。`);
}

function tokenizeLyricText(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap(tokenizeLyricLine);
}

function tokenizeLyricLine(line) {
  const tokens = [];
  let latinBuffer = "";
  const flushLatin = () => {
    if (!latinBuffer) return;
    tokens.push(latinBuffer);
    latinBuffer = "";
  };

  for (const char of line) {
    if (/\s/u.test(char)) {
      flushLatin();
    } else if (/[A-Za-z0-9]/u.test(char)) {
      latinBuffer += char;
    } else {
      flushLatin();
      tokens.push(char);
    }
  }
  flushLatin();
  return tokens;
}

function lyricsForSequentialTokens(tokens) {
  if (tokens.length === 0) return [];
  const slots = availableLyricTicks();
  return tokens.map((token, index) => ({
    tick: slots[index] ?? slots[slots.length - 1] ?? 0,
    text: token,
  }));
}

function availableLyricTicks() {
  const ticks = [];
  for (let tick = 0; tick <= barLengthTicks() - gridTicks(); tick += gridTicks()) {
    ticks.push(tick);
  }
  return ticks;
}

function lyricSlotsPerBar() {
  return Math.max(1, availableLyricTicks().length);
}

function ensureBarCount(count) {
  if (!state.chart.sections.length) state.chart.sections.push(createSection());
  let bars = flattenBars();
  while (bars.length < count) {
    const section = state.chart.sections[state.chart.sections.length - 1] || createSection();
    if (!state.chart.sections.includes(section)) state.chart.sections.push(section);
    section.bars.push(createEmptyBar());
    bars = flattenBars();
  }
  syncDisplayLinesToBars();
}

function ensureLyricSlotCapacity(requiredSlotCount) {
  const slotsPerBar = lyricSlotsPerBar();
  const requiredBars = Math.ceil(Math.max(1, requiredSlotCount) / slotsPerBar);
  ensureBarCount(requiredBars);
}

function rebuildLyricLines() {
  syncDisplayLinesToBars();
}

function shiftSelectionAfterBarInsert(sectionIndex, insertedBarIndex) {
  const sel = state.selection;
  if (!sel || sel.sectionIndex !== sectionIndex || sel.barIndex < insertedBarIndex) return;
  state.selection = { ...sel, barIndex: sel.barIndex + 1 };
}

function shiftWorkingBarAfterBarInsert(sectionIndex, insertedBarIndex) {
  const workingBar = state.workingBar;
  if (!workingBar || workingBar.sectionIndex !== sectionIndex || workingBar.barIndex < insertedBarIndex) return;
  state.workingBar = { ...workingBar, barIndex: workingBar.barIndex + 1 };
}

function hasDeletableSelection() {
  return Boolean(
    state.selection
    || state.chordRange
    || state.lyricRange
    || state.barRange
    || (!state.selection && state.workingBar),
  );
}

function deleteSelection() {
  const barEntries = state.barRange ? selectedBarEntries() : (!state.selection && state.workingBar ? [workingBarRef()].filter(Boolean) : []);
  if (barEntries.length > 0) {
    deleteBarEntries(barEntries);
    return;
  }

  const chordEntries = state.chordRange ? selectedChordEntries() : [];
  if (chordEntries.length > 0) {
    pushHistory(`删除 ${chordEntries.length} 个和弦`);
    const itemsByBar = new Map();
    chordEntries.forEach((entry) => {
      if (!itemsByBar.has(entry.bar)) itemsByBar.set(entry.bar, new Set());
      itemsByBar.get(entry.bar).add(entry.item);
    });
    itemsByBar.forEach((items, bar) => {
      bar.chords = bar.chords.filter((chord) => !items.has(chord));
    });
    state.selection = null;
    state.chordRange = null;
    state.barRange = null;
    state.lastChordSelectionPoint = null;
    render();
    showMessage(`已删除 ${chordEntries.length} 个和弦。`);
    return;
  }

  const lyricEntries = state.lyricRange ? selectedLyricEntries() : [];
  if (lyricEntries.length > 0) {
    pushHistory(`删除 ${lyricEntries.length} 个歌词`);
    const itemsByBar = new Map();
    lyricEntries.forEach((entry) => {
      if (!itemsByBar.has(entry.bar)) itemsByBar.set(entry.bar, new Set());
      itemsByBar.get(entry.bar).add(entry.item);
    });
    itemsByBar.forEach((items, bar) => {
      bar.lyrics = bar.lyrics.filter((lyric) => !items.has(lyric));
    });
    rebuildLyricLines();
    state.selection = null;
    state.lyricRange = null;
    state.barRange = null;
    state.lastLyricSelectionPoint = null;
    render();
    showMessage(`已删除 ${lyricEntries.length} 个歌词。`);
    return;
  }

  const ref = selectionRef();
  if (!ref) return;
  pushHistory(ref.kind === "chord" ? "删除和弦" : "删除歌词");
  const list = ref.kind === "chord" ? ref.bar.chords : ref.bar.lyrics;
  list.splice(ref.itemIndex, 1);
  if (ref.kind === "lyric") rebuildLyricLines();
  state.selection = null;
  if (ref.kind === "chord") {
    state.chordRange = null;
    state.barRange = null;
    state.lastChordSelectionPoint = null;
  } else {
    state.lyricRange = null;
    state.barRange = null;
    state.lastLyricSelectionPoint = null;
  }
  render();
}

function deleteBarEntries(barEntries) {
  const entries = barEntries.filter(Boolean).sort((a, b) => b.flatBarIndex - a.flatBarIndex);
  if (entries.length === 0) return;
  const totalBars = flattenBars().length;
  if (entries.length >= totalBars) {
    showMessage("至少保留 1 个小节。", "warning");
    return;
  }

  pushHistory(entries.length > 1 ? `删除 ${entries.length} 个小节` : "删除小节");
  entries.forEach((entry) => {
    const section = state.chart.sections[entry.sectionIndex];
    if (!section?.bars?.[entry.barIndex]) return;
    section.bars.splice(entry.barIndex, 1);
  });
  state.chart.sections = state.chart.sections.filter((section) => section.bars.length > 0);
  if (state.chart.sections.length === 0) {
    state.chart.sections.push(createSection());
    state.chart.sections[0].bars.push(createEmptyBar());
  }
  syncDisplayLinesToBars();
  state.selection = null;
  state.workingBar = null;
  state.chordRange = null;
  state.lyricRange = null;
  state.barRange = null;
  state.lastBarSelectionPoint = null;
  render();
  showMessage(entries.length > 1 ? `已删除 ${entries.length} 个小节。` : "已删除小节。");
}

function exportChart() {
  if (!state.chart) return;
  sortAllEvents();
  const issues = validateChart();
  const blocking = issues.filter((issue) => issue.level === "bad");
  if (blocking.length > 0) {
    showMessage(`导出前请先修复：${blocking[0].text}`, "error");
    return;
  }

  const exportedChart = structuredClone(state.chart);
  downloadChartJson(exportedChart);
}

function downloadChartJson(chart, message = "") {
  const exportedChart = structuredClone(chart);
  delete exportedChart.source;
  const text = JSON.stringify(exportedChart, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  if (state.lastExportUrl) URL.revokeObjectURL(state.lastExportUrl);
  const url = URL.createObjectURL(blob);
  state.lastExportUrl = url;
  const filename = `${slugify(exportedChart.title || "d15-chart")}.timeline.json`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  showExportMessage(filename, url, message);
}

function flattenBars() {
  const bars = [];
  let startTick = 0;
  state.chart.sections.forEach((section, sectionIndex) => {
    section.bars.forEach((bar, barIndex) => {
      bars.push({
        sectionIndex,
        barIndex,
        bar,
        startTick,
        startBeat: ticksToBeats(startTick),
        flatBarIndex: bars.length,
      });
      startTick += barLengthTicks();
    });
  });
  return bars;
}

function flattenLyrics() {
  return flattenBars().flatMap((barRef) => {
    return barRef.bar.lyrics.map((item, itemIndex) => ({
      ...barRef,
      item,
      itemIndex,
      globalTick: barRef.startTick + item.tick,
      barStartTick: barRef.startTick,
    }));
  });
}

function selectionRef() {
  const sel = state.selection;
  if (!sel || !state.chart) return null;
  const section = state.chart.sections[sel.sectionIndex];
  const bar = section?.bars?.[sel.barIndex];
  const list = sel.kind === "chord" ? bar?.chords : bar?.lyrics;
  const item = list?.[sel.itemIndex];
  if (!section || !bar || !item) return null;
  const barRef = flattenBars().find((candidate) => candidate.sectionIndex === sel.sectionIndex && candidate.barIndex === sel.barIndex);
  return {
    ...sel,
    section,
    bar,
    item,
    flatBarIndex: barRef.flatBarIndex,
    globalTick: barRef.startTick + item.tick,
    barStartTick: barRef.startTick,
  };
}

function workingBarRef() {
  const workingBar = state.workingBar;
  if (!workingBar) return null;
  return flattenBars().find((bar) => bar.sectionIndex === workingBar.sectionIndex && bar.barIndex === workingBar.barIndex) || null;
}

function isWorkingBar(sectionIndex, barIndex) {
  return state.workingBar?.sectionIndex === sectionIndex && state.workingBar?.barIndex === barIndex;
}

function restoreSelection(oldRef) {
  const list = oldRef.kind === "chord" ? oldRef.bar.chords : oldRef.bar.lyrics;
  const index = list.indexOf(oldRef.item);
  state.selection = index >= 0
    ? { kind: oldRef.kind, sectionIndex: oldRef.sectionIndex, barIndex: oldRef.barIndex, itemIndex: index }
    : null;
}

function restoreSelectionByItem(kind, item) {
  const location = findItemLocation(kind, item);
  state.selection = location
    ? { kind, sectionIndex: location.sectionIndex, barIndex: location.barIndex, itemIndex: location.itemIndex }
    : null;
}

function refForDraggedItem() {
  if (!state.drag) return null;
  const location = findItemLocation(state.drag.kind, state.drag.item);
  if (!location) return null;
  state.selection = {
    kind: state.drag.kind,
    sectionIndex: location.sectionIndex,
    barIndex: location.barIndex,
    itemIndex: location.itemIndex,
  };
  return selectionRef();
}

function findItemLocation(kind, item) {
  const bars = flattenBars();
  for (const barRef of bars) {
    const list = kind === "chord" ? barRef.bar.chords : barRef.bar.lyrics;
    const itemIndex = list.indexOf(item);
    if (itemIndex >= 0) return { ...barRef, itemIndex };
  }
  return null;
}

function findBarRefForItem(item) {
  return flattenBars().find((barRef) => barRef.bar.chords.includes(item) || barRef.bar.lyrics.includes(item));
}

function moveLyricToGlobalTick(item, globalTick, originalEntry) {
  const bars = flattenBars();
  const lastBar = bars[bars.length - 1];
  if (!lastBar) return;
  const maxGlobalTick = lastBar.startTick + barLengthTicks() - gridTicks();
  const clampedGlobal = clampTick(globalTick, maxGlobalTick);
  const targetBar = bars.find((barRef) => clampedGlobal >= barRef.startTick && clampedGlobal < barRef.startTick + barLengthTicks()) || lastBar;
  const currentBar = findBarRefForItem(item);
  if (!currentBar) return;

  if (currentBar.bar !== targetBar.bar) {
    currentBar.bar.lyrics = currentBar.bar.lyrics.filter((lyric) => lyric !== item);
    targetBar.bar.lyrics.push(item);
  }

  item.tick = clampTick(clampedGlobal - targetBar.startTick, barLengthTicks() - gridTicks());
}

function globalBeatFor(barRef, localTick) {
  return ticksToBeats(barRef.startTick + localTick);
}

function buildLyricEditSlots() {
  const slots = [];
  flattenBars().forEach((barRef) => {
    for (let tick = 0; tick <= barLengthTicks() - gridTicks(); tick += gridTicks()) {
      slots.push({
        barRef,
        localTick: tick,
        globalTick: barRef.startTick + tick,
      });
    }
  });
  return slots;
}

function editSlotForGlobalTick(slots, globalTick) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  slots.forEach((slot, index) => {
    const distance = Math.abs(slot.globalTick - globalTick);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function nextChordStart(ref) {
  const later = ref.bar.chords
    .filter((chord) => chord !== ref.item && chord.tick > ref.item.tick)
    .sort((a, b) => a.tick - b.tick)[0];
  return later?.tick ?? null;
}

function clampAllEvents() {
  state.chart.sections.forEach((section) => {
    section.bars.forEach((bar) => {
      bar.chords.forEach((chord) => {
        chord.tick = clampPreciseTick(chord.tick);
        chord.durationTicks = Math.max(1, Math.min(
          positiveInteger(chord.durationTicks, ticksPerBeat()),
          barLengthTicks() - chord.tick,
        ));
      });
      bar.lyrics.forEach((lyric) => {
        lyric.tick = clampPreciseTick(lyric.tick);
      });
    });
  });
  sortAllEvents();
}

function sortAllEvents() {
  sortChartEvents(state.chart);
}

function sortChartEvents(chart) {
  chart.sections.forEach((section) => {
    section.bars.forEach((bar) => {
      bar.chords.sort((a, b) => a.tick - b.tick);
      bar.lyrics.sort((a, b) => a.tick - b.tick || (a.order ?? 0) - (b.order ?? 0));
    });
  });
}

function renderValidation() {
  const issues = validateChart();
  els.validationList.innerHTML = "";
  if (issues.length === 0) {
    const li = document.createElement("li");
    li.textContent = "当前 JSON 可导出。";
    els.validationList.append(li);
    return;
  }

  issues.forEach((issue) => {
    const li = document.createElement("li");
    li.className = issue.level;
    li.textContent = issue.text;
    els.validationList.append(li);
  });
}

function validateChart() {
  return validateChartData(state.chart);
}

function validateChartData(chart) {
  const issues = [];
  if (chart.format !== "d15.timeline.v1") issues.push({ level: "bad", text: "format 必须是 d15.timeline.v1" });
  if (!chart.title) issues.push({ level: "bad", text: "title 不能为空" });
  if (!Number.isFinite(Number(chart.bpm)) || Number(chart.bpm) < 20 || Number(chart.bpm) > 260) issues.push({ level: "bad", text: "BPM 需要在 20-260 之间" });
  if (!Number.isFinite(Number(chart.beatsPerBar)) || Number(chart.beatsPerBar) <= 0) issues.push({ level: "bad", text: "beatsPerBar 必须为正数" });
  if (!Number.isInteger(Number(chart.ticksPerBeat)) || Number(chart.ticksPerBeat) <= 0) issues.push({ level: "bad", text: "ticksPerBeat 必须为正整数" });
  if (!CHORD_BANKS[chart.chordBank]) issues.push({ level: "bad", text: "chordBank 只支持 C 或 G" });

  flattenBarsForChart(chart).forEach((barRef) => {
    barRef.bar.chords.forEach((chord) => {
      const place = `第 ${barRef.flatBarIndex + 1} 小节`;
      const support = chordSupportStatus(chord.name);
      if (support === "generated") issues.push({ level: "warn", text: `${place} 和弦 ${chord.name} 不在预置 88 和弦库中，App 将尝试生成指法` });
      if (support === "unsupported") issues.push({ level: "warn", text: `${place} 和弦 ${chord.name} 当前 App 可能无法解析` });
      if (!Number.isInteger(Number(chord.tick)) || chord.tick < 0 || chord.tick >= barLengthTicksForChart(chart)) issues.push({ level: "bad", text: `${place} 和弦 ${chord.name} tick 越界` });
      if (!Number.isInteger(Number(chord.durationTicks)) || chord.durationTicks <= 0) issues.push({ level: "bad", text: `${place} 和弦 ${chord.name} durationTicks 必须为正整数` });
      if (chord.tick + chord.durationTicks > barLengthTicksForChart(chart)) issues.push({ level: "bad", text: `${place} 和弦 ${chord.name} durationTicks 超出小节` });
    });
    barRef.bar.lyrics.forEach((lyric) => {
      if (!Number.isInteger(Number(lyric.tick)) || lyric.tick < 0 || lyric.tick >= barLengthTicksForChart(chart)) {
        issues.push({ level: "bad", text: `第 ${barRef.flatBarIndex + 1} 小节歌词 ${lyric.text} tick 越界` });
      }
    });
  });

  return issues;
}

function flattenBarsForChart(chart) {
  const bars = [];
  let startTick = 0;
  const length = barLengthTicksForChart(chart);
  chart.sections.forEach((section, sectionIndex) => {
    section.bars.forEach((bar, barIndex) => {
      bars.push({
        sectionIndex,
        barIndex,
        bar,
        startTick,
        startBeat: startTick / ticksPerBeatForChart(chart),
        flatBarIndex: bars.length,
      });
      startTick += length;
    });
  });
  return bars;
}

function isSelected(kind, sectionIndex, barIndex, itemIndex) {
  const sel = state.selection;
  return sel?.kind === kind && sel.sectionIndex === sectionIndex && sel.barIndex === barIndex && sel.itemIndex === itemIndex;
}

function ticksPerBeat() {
  return positiveInteger(state.chart?.ticksPerBeat, DEFAULT_TICKS_PER_BEAT);
}

function ticksPerBeatForChart(chart) {
  return positiveInteger(chart?.ticksPerBeat, DEFAULT_TICKS_PER_BEAT);
}

function barLengthTicks() {
  return barLengthTicksForChart(state.chart);
}

function barLengthTicksForChart(chart) {
  return Math.round((Number(chart?.beatsPerBar) || 4) * ticksPerBeatForChart(chart));
}

function gridTicks() {
  return gridTicksForChart(state.chart);
}

function gridTicksForChart(chart) {
  return Math.max(1, Math.round(ticksPerBeatForChart(chart) / state.gridFraction));
}

function beatsToTicks(beats) {
  return Math.round(Number(beats) * ticksPerBeat());
}

function ticksToBeats(ticks) {
  return Number((Number(ticks) / ticksPerBeat()).toFixed(4));
}

function snapTick(value) {
  return Math.round(Number(value || 0) / gridTicks()) * gridTicks();
}

function snapTickForChart(chart, value) {
  return Math.round(Number(value || 0) / gridTicksForChart(chart)) * gridTicksForChart(chart);
}

function clampTick(value, maxTick = barLengthTicks() - gridTicks()) {
  return Math.max(0, Math.min(maxTick, snapTick(positiveInteger(value, 0))));
}

function clampTickForChart(chart, value, maxTick = barLengthTicksForChart(chart) - gridTicksForChart(chart)) {
  return Math.max(0, Math.min(maxTick, snapTickForChart(chart, positiveInteger(value, 0))));
}

function clampPreciseTick(value, maxTick = barLengthTicks() - 1) {
  return Math.max(0, Math.min(maxTick, positiveInteger(value, 0)));
}

function clampPreciseTickForChart(chart, value, maxTick = barLengthTicksForChart(chart) - 1) {
  return Math.max(0, Math.min(maxTick, positiveInteger(value, 0)));
}

function clampDurationTicks(ref, value) {
  const duration = Math.max(gridTicks(), snapTick(positiveInteger(value, gridTicks())));
  const maxDuration = barLengthTicks() - ref.item.tick;
  const later = ref.bar.chords
    .filter((chord) => chord !== ref.item && chord.tick > ref.item.tick)
    .sort((a, b) => a.tick - b.tick)[0];
  const nextLimit = later ? later.tick - ref.item.tick : maxDuration;
  return Math.max(gridTicks(), Math.min(duration, maxDuration, nextLimit));
}

function positionLabel(tick) {
  const slot = Math.floor(tick / gridTicks()) + 1;
  const beatNumber = Math.floor(tick / ticksPerBeat()) + 1;
  const tickInBeat = tick % ticksPerBeat();
  const beatPart = readableBeatPart(tickInBeat);
  return `第 ${beatNumber} 拍 ${beatPart} · 第 ${slot} 格`;
}

function readableBeatPart(tickInBeat) {
  if (tickInBeat === 0) return "正拍";
  const fraction = reduceFraction(tickInBeat, ticksPerBeat());
  if (fraction.numerator === 1 && fraction.denominator === 2) return "后半拍";
  return `+${fraction.numerator}/${fraction.denominator} 拍`;
}

function localBeatNumberValue(tick) {
  return Math.floor(tick / ticksPerBeat()) + 1;
}

function beatPartOptions(tick) {
  const selected = tick % ticksPerBeat();
  const parts = [];
  for (let index = 0; index < state.gridFraction; index += 1) {
    const offsetTick = index * gridTicks();
    parts.push({
      value: offsetTick,
      label: readableBeatPart(offsetTick),
      selected: offsetTick === selected,
    });
  }
  if (!parts.some((part) => part.selected)) {
    parts.push({
      value: selected,
      label: `${readableBeatPart(selected)}（当前位置）`,
      selected: true,
    });
    parts.sort((a, b) => a.value - b.value);
  }
  return parts
    .map((part) => `<option value="${part.value}"${part.selected ? " selected" : ""}>${part.label}</option>`)
    .join("");
}

function positionInputsToTick(beatInput, partInput) {
  const beatNumber = Math.max(1, Math.round(Number(beatInput.value) || 1));
  const partTick = positiveInteger(partInput.value, 0);
  return (beatNumber - 1) * ticksPerBeat() + partTick;
}

function beatInputStep() {
  return formatNumber(gridTicks() / ticksPerBeat());
}

function gridFractionLabel() {
  if (state.gridFraction === 2) return "半拍";
  return `1/${state.gridFraction} 拍`;
}

function reduceFraction(numerator, denominator) {
  const divisor = gcd(Math.abs(numerator), Math.abs(denominator));
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

function gcd(a, b) {
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function scrollTimelinePage(direction) {
  const scroller = els.timelineCanvas.closest(".timeline-scroll");
  if (!scroller) return;
  const step = Math.max(160, scroller.clientWidth * 0.85);
  scroller.scrollBy({ left: direction * step, behavior: "smooth" });
}

function formatNumber(value) {
  return Number(Number(value).toFixed(4)).toString();
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.round(number));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setZoom(value) {
  state.pxPerBeat = clamp(value, 42, 144);
  render();
}

function showMessage(text, level = "") {
  els.messageArea.textContent = text;
  els.messageArea.className = `message-area ${level}`;
}

function showImportDialog(fileName, errors) {
  els.importDialogSummary.textContent = `${fileName} 没有导入。当前正在编辑的谱保持不变。`;
  els.importDialogList.replaceChildren();
  errors.slice(0, 8).forEach((error) => {
    const li = document.createElement("li");
    li.textContent = error;
    els.importDialogList.append(li);
  });
  if (errors.length > 8) {
    const li = document.createElement("li");
    li.textContent = `还有 ${errors.length - 8} 个问题未显示。`;
    els.importDialogList.append(li);
  }
  els.importDialog.hidden = false;
  showMessage("导入未完成，当前谱保持不变。", "notice");
}

function hideImportDialog() {
  els.importDialog.hidden = true;
}

function showHelpDialog() {
  els.helpDialog.hidden = false;
}

function hideHelpDialog() {
  els.helpDialog.hidden = true;
}

function showExportMessage(filename, url, message = "") {
  els.messageArea.className = "message-area";
  els.messageArea.replaceChildren();
  els.messageArea.append(message || `已导出 ${filename}。`);
  const link = document.createElement("a");
  link.className = "download-link";
  link.href = url;
  link.download = filename;
  link.textContent = "手动下载";
  els.messageArea.append(" ");
  els.messageArea.append(link);
}

function clearElement(element) {
  if (!element) return;
  element.textContent = "";
}

function isEditingText() {
  const tag = document.activeElement?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(value) {
  return String(value).trim().replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "") || "d15-chart";
}

init();
