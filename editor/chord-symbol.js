(function attachD15ChordSymbol(global) {
  function normalizeName(value) {
    return String(value || "").trim().replaceAll("♯", "#").replaceAll("♭", "b");
  }

  function stripSourceLabel(value) {
    let result = normalizeName(value);
    while (true) {
      const stripped = result.replace(/(?:@|<\d+>|\(\d+\))$/u, "").trim();
      if (stripped === result) return result;
      result = stripped;
    }
  }

  function parseNoteName(value) {
    let normalized = stripSourceLabel(value);
    if (/^#[A-Ga-g]$/u.test(normalized)) normalized = `${normalized[1].toUpperCase()}#`;
    const match = normalized.match(/^([A-Ga-g])([#b]?)$/u);
    return match ? `${match[1].toUpperCase()}${match[2]}` : null;
  }

  function parse(value) {
    const displayName = String(value || "").trim();
    const normalizedName = normalizeName(displayName);
    if (!normalizedName) return null;
    const parts = normalizedName.split("/");
    if (parts.length > 2) return null;

    const chordBody = stripSourceLabel(parts[0]);
    const match = chordBody.match(/^([A-Ga-g])([#b]?)(.*)$/u);
    if (!match) return null;
    const root = `${match[1].toUpperCase()}${match[2]}`;
    let suffix = match[3].trim()
      .replaceAll("7M", "maj7")
      .replaceAll("-5", "b5")
      .toLowerCase()
      .replaceAll("major", "maj");

    const modifiers = {
      flatFive: /(?:\(b5\)|b5)/u.test(suffix),
      sharpFive: /(?:\(#5\)|#5)/u.test(suffix),
      flatNine: /(?:\(b9\)|b9)/u.test(suffix),
      sharpNine: /(?:\(#9\)|#9)/u.test(suffix),
      omitFive: /(?:\(no5\)|no5)/u.test(suffix),
    };
    suffix = suffix.replace(/\((?:b5|#5|b9|#9|no5)\)|b5|#5|b9|#9|no5/gu, "");
    if ((modifiers.flatFive && modifiers.sharpFive)
      || (modifiers.omitFive && (modifiers.flatFive || modifiers.sharpFive))
      || (modifiers.flatNine && modifiers.sharpNine)) return null;

    let quality = "major";
    if (suffix.startsWith("min")) {
      quality = "minor";
      suffix = suffix.slice(3);
    } else if (suffix.startsWith("m") && !suffix.startsWith("maj")) {
      quality = "minor";
      suffix = suffix.slice(1);
    } else if (suffix.startsWith("dim")) {
      quality = "diminished";
      suffix = suffix.slice(3);
    } else if (suffix.startsWith("aug")) {
      quality = "augmented";
      suffix = suffix.slice(3);
    } else if (suffix.startsWith("sus2")) {
      quality = "suspended2";
      suffix = suffix.slice(4);
    } else if (suffix.startsWith("sus4")) {
      quality = "suspended4";
      suffix = suffix.slice(4);
    } else if (suffix === "5") {
      quality = "power";
      suffix = "";
    } else if (suffix === "maj") {
      suffix = "";
    }

    const hasSus2 = suffix.includes("sus2");
    const hasSus4 = suffix.includes("sus4");
    if (hasSus2 && hasSus4) return null;
    if (hasSus2) {
      quality = "suspended2";
      suffix = suffix.replaceAll("sus2", "");
    } else if (hasSus4) {
      quality = "suspended4";
      suffix = suffix.replaceAll("sus4", "");
    }

    const knownExtensions = new Set(["", "6", "7", "maj7", "add9", "add11", "9", "maj9", "11", "13"]);
    if (!knownExtensions.has(suffix)) return null;
    const bass = parts.length === 2 ? parseNoteName(parts[1]) : null;
    if (parts.length === 2 && !bass) return null;

    return {
      displayName,
      root,
      quality,
      extension: suffix || null,
      bass,
      modifiers,
    };
  }

  const api = { parse, parseNoteName, stripSourceLabel };
  global.D15ChordSymbol = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}(globalThis));
