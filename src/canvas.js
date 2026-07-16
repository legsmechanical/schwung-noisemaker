/* ---- Noisemaker on-device Editor overlay (canvas.js#noisemaker_editor) ----
 *
 * A page-based 128x64 parameter editor. Each page maps 8 params to the 8
 * hardware knobs (CC 71-78); the jog wheel (CC 14) pages through the sections;
 * a capacitive knob-touch (Notes 0-7) highlights the touched cell. Values are
 * read/written through ctx.getParam/ctx.setParam in DISPLAY units (the same
 * ints the plugin's get_param/set_param speak: 0..100 %, -100..100 bipolar,
 * 0/1 toggles, enum indices), so this file needs no knowledge of engine
 * scaling.
 *
 * Registered on the DSP side via a chain_params entry of type "canvas" with
 * canvas_script "canvas.js#noisemaker_editor" (see noisemaker_plugin.cpp).
 *
 * Perf model mirrors Echidna's bank editor: each ctx.getParam is a ~2.6ms
 * blocking SHM round-trip, and draw() reads one per visible cell every frame,
 * so we install a per-ctx read cache with write-through on setParam and a
 * periodic full refresh. Knob turns accumulate KNOB_SENS detents per write to
 * cut the blocking-write rate while keeping full resolution.
 *
 * GPL-2.0 (engine: Patrick Kunz / TAL)
 */
(function () {

/* ---- pure helpers (shared shape with Echidna's canvas) ---- */
function dirFromCC(d2) {
  if (d2 >= 1 && d2 <= 63) return 1;
  if (d2 >= 65 && d2 <= 127) return -1;
  return 0;
}
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function wrapInc(cur, dir, n) {
  if (n <= 0) return 0;
  var v = (cur + dir) % n;
  if (v < 0) v += n;
  return v;
}
function accumStep(accum, dir, sens) {
  if ((accum > 0 && dir < 0) || (accum < 0 && dir > 0)) accum = 0;
  accum += dir;
  if (Math.abs(accum) >= sens) return { accum: 0, fire: true };
  return { accum: accum, fire: false };
}

/* Detents per unit change for continuous params (slower feel + fewer writes). */
var KNOB_SENS = 3;

/* ---- param kinds ----
 * pct    : 0..100  (shown as N%)
 * bip    : -100..100 (shown as +N / -N; center 0)
 * toggle : Off/On  (opts index)
 * int    : imin..imax integer
 * enum   : opts[] index (labels MUST match the plugin's chain_params order) */
function P(key, label, kind, extra) {
  var p = { key: key, label: label, kind: kind };
  if (extra) for (var k in extra) p[k] = extra[k];
  return p;
}

var WAVE1 = ["Saw", "Pulse", "Noise"];
var WAVE2 = ["Saw", "Pulse", "Tri", "Sine"];
var FILT  = ["Off", "LP24", "LP18", "LP12", "LP6", "HP24", "BP24", "Notch"];
var LDST1 = ["None", "Filter", "Osc1", "Osc2", "PW", "FM", "LFO2"];
var LDST2 = ["None", "Filter", "Osc1", "Osc2", "PW", "FM", "LFO1"];
var FDST  = ["None", "Filter", "Osc1&2", "Osc2", "PW"];
var ONOFF = ["Off", "On"];

/* 9 pages x 8 knob slots. Order within a page = knob 1..8. */
var PAGES = [
  { name: "OSC A", cells: [
    P("osc1_wave", "Wave1", "enum", { opts: WAVE1 }),
    P("osc1_vol",  "Lvl1",  "pct"),
    P("osc1_tune", "Tune1", "bip"),
    P("osc1_fine", "Fine1", "bip"),
    P("osc1_pw",   "PW",    "pct"),
    P("osc1_phase","Phase1","pct"),
    P("osc_sync",  "Sync",  "toggle", { opts: ONOFF }),
    P("detune",    "Detune","pct"),
  ]},
  { name: "OSC B", cells: [
    P("osc2_wave", "Wave2", "enum", { opts: WAVE2 }),
    P("osc2_vol",  "Lvl2",  "pct"),
    P("osc2_tune", "Tune2", "bip"),
    P("osc2_fine", "Fine2", "bip"),
    P("osc2_fm",   "FM",    "pct"),
    P("osc3_vol",  "Sub",   "pct"),
    P("ringmod",   "Ring",  "pct"),
    P("osc_tune",  "MTune", "bip"),
  ]},
  { name: "FILTER", cells: [
    P("filter_type","Type",  "enum", { opts: FILT }),
    P("cutoff",     "Cutoff","pct"),
    P("resonance",  "Reso",  "pct"),
    P("keyfollow",  "KeyFol","pct"),
    P("filter_env", "EnvAmt","pct"),
    P("highpass",   "HP",    "pct"),
    P("vel_cut",    "VelCut","pct"),
    P("pw_cutoff",  "WhCut", "pct"),
  ]},
  { name: "F.ENV", cells: [
    P("fenv_a",    "Atk",   "pct"),
    P("fenv_d",    "Dec",   "pct"),
    P("fenv_s",    "Sus",   "pct"),
    P("fenv_r",    "Rel",   "pct"),
    P("filter_env","Amt",   "pct"),
    P("vel_env",   "VelEnv","pct"),
    P("cutoff",    "Cutoff","pct"),
    P("resonance", "Reso",  "pct"),
  ]},
  { name: "A.ENV", cells: [
    P("aenv_a",    "Atk",   "pct"),
    P("aenv_d",    "Dec",   "pct"),
    P("aenv_s",    "Sus",   "pct"),
    P("aenv_r",    "Rel",   "pct"),
    P("vel_vol",   "VelVol","pct"),
    P("volume",    "Vol",   "pct"),
    P("portamento","Porta", "pct"),
    P("voices",    "Voices","int", { min: 1, max: 6 }),
  ]},
  { name: "LFO 1", cells: [
    P("lfo1_wave",   "Wave",  "pct"),
    P("lfo1_rate",   "Rate",  "pct"),
    P("lfo1_amount", "Amt",   "pct"),
    P("lfo1_dest",   "Dest",  "enum", { opts: LDST1 }),
    P("lfo1_sync",   "Sync",  "toggle", { opts: ONOFF }),
    P("lfo1_keytrig","KeyTrg","toggle", { opts: ONOFF }),
    P("lfo1_phase",  "Phase", "pct"),
    P("bitcrush",    "Crush", "pct"),
  ]},
  { name: "LFO 2", cells: [
    P("lfo2_wave",   "Wave",  "pct"),
    P("lfo2_rate",   "Rate",  "pct"),
    P("lfo2_amount", "Amt",   "pct"),
    P("lfo2_dest",   "Dest",  "enum", { opts: LDST2 }),
    P("lfo2_sync",   "Sync",  "toggle", { opts: ONOFF }),
    P("lfo2_keytrig","KeyTrg","toggle", { opts: ONOFF }),
    P("lfo2_phase",  "Phase", "pct"),
    P("free_amt",    "E3Amt", "bip"),
  ]},
  { name: "ENV 3", cells: [
    P("free_a",    "Atk",   "pct"),
    P("free_d",    "Dec",   "pct"),
    P("free_amt",  "Amt",   "bip"),
    P("free_dest", "Dest",  "enum", { opts: FDST }),
    P("pw_pitch",  "Bend",  "pct"),
    P("porta_mode","PMode", "toggle", { opts: ONOFF }),
    P("vel_cut",   "VelCut","pct"),
    P("vel_env",   "VelEnv","pct"),
  ]},
  { name: "FX", cells: [
    P("chorus1",     "Chr I", "toggle", { opts: ONOFF }),
    P("chorus2",     "Chr II","toggle", { opts: ONOFF }),
    P("reverb_wet",  "RvWet", "pct"),
    P("reverb_decay","RvDec", "pct"),
    P("reverb_pre",  "RvPre", "pct"),
    P("reverb_hi",   "RvHi",  "pct"),
    P("reverb_lo",   "RvLo",  "pct"),
    P("volume",      "Vol",   "pct"),
  ]},
];

function optsLen(cell) { return cell.opts ? cell.opts.length : 0; }

/* Read current value (int) from cache. */
function getInt(ctx, cell, dflt) {
  var raw = ctx.getParam(cell.key);
  var v = parseInt(raw, 10);
  return isNaN(v) ? dflt : v;
}

/* Format a cell's value for display. */
function fmtValue(ctx, cell) {
  if (cell.kind === "enum" || cell.kind === "toggle") {
    var i = clamp(getInt(ctx, cell, 0), 0, optsLen(cell) - 1);
    return cell.opts[i] || String(i);
  }
  if (cell.kind === "bip") {
    var b = getInt(ctx, cell, 0);
    return (b > 0 ? "+" : "") + b;
  }
  if (cell.kind === "int") return String(getInt(ctx, cell, cell.min || 0));
  return getInt(ctx, cell, 0) + "%"; // pct
}

/* Normalized 0..1 fill for the value bar. */
function fillFrac(ctx, cell) {
  var v = getInt(ctx, cell, 0);
  if (cell.kind === "pct")   return clamp(v / 100, 0, 1);
  if (cell.kind === "bip")   return clamp((v + 100) / 200, 0, 1);
  if (cell.kind === "int")   { var mn = cell.min || 0, mx = cell.max || 1; return clamp((v - mn) / (mx - mn || 1), 0, 1); }
  var n = optsLen(cell);
  return n > 1 ? clamp(v / (n - 1), 0, 1) : 0; // enum/toggle
}

function readState(ctx) {
  var s = ctx.state;
  if (!s.init) {
    s.init = true;
    s.page = clamp(parseInt(ctx.getValue(), 10) || 0, 0, PAGES.length - 1);
    s.lastKnob = -1;
    s.accum = [0, 0, 0, 0, 0, 0, 0, 0];
  }
  return s;
}

/* ---- layout: header + 4x2 grid of cells ---- */
var GX = 0, GY = 10, COLS = 4, ROWS = 2, CW = 32, CH = 27;

function drawCell(ctx, col, row, cell, hi) {
  var x = GX + col * CW, y = GY + row * CH;
  if (hi) ctx.fillRect(x, y, CW - 1, CH - 1, 1);
  var fg = hi ? 0 : 1;
  ctx.print(x + 2, y + 1, cell.label, fg);
  ctx.print(x + 2, y + 10, fmtValue(ctx, cell), fg);
  // value bar
  var bw = CW - 5, bx = x + 2, by = y + CH - 5;
  ctx.drawRect(bx, by, bw, 3, fg);
  var f = Math.round(fillFrac(ctx, cell) * (bw - 2));
  if (f > 0) ctx.fillRect(bx + 1, by + 1, f, 1, fg);
}

var noisemaker_editor = {
  onOpen: function (ctx) {
    ctx.state.init = false; // re-seed page from the persisted editor value
    readState(ctx);
  },

  onMidi: function (ctx, payload) {
    var d = payload && payload.data;
    if (!d || d.length < 3) return;
    var s = readState(ctx);
    var status = d[0] & 0xF0;

    if (status === 0x90 || status === 0x80) { // capacitive touch: notes 0-7 = knobs
      var note = d[1];
      if (note <= 7) s.lastKnob = (status === 0x90 && d[2] >= 64) ? note : -1;
      return;
    }
    if (status !== 0xB0) return;
    var cc = d[1], val = d[2];

    if (cc === 14) { // jog: page through sections (wrapping)
      var jd = dirFromCC(val);
      if (jd) {
        s.page = wrapInc(s.page, jd, PAGES.length);
        ctx.setValue(String(s.page));
        s.lastKnob = -1;
      }
      return;
    }
    if (cc < 71 || cc > 78) return;

    var k = cc - 71;
    var dir = dirFromCC(val);
    if (!dir) return;
    var cell = PAGES[s.page].cells[k];
    if (!cell) return;
    s.lastKnob = k;

    if (cell.kind === "enum" || cell.kind === "toggle") {
      var r = accumStep(s.accum[k], dir, 2);
      s.accum[k] = r.accum;
      if (!r.fire) return;
      var n = optsLen(cell);
      var cur = clamp(getInt(ctx, cell, 0), 0, n - 1);
      var nv = wrapInc(cur, dir, n);
      if (nv !== cur) ctx.setParam(cell.key, String(nv));
      return;
    }

    // continuous: pct/bip/int
    var cr = accumStep(s.accum[k], dir, KNOB_SENS);
    s.accum[k] = cr.accum;
    if (!cr.fire) return;
    var lo, hi;
    if (cell.kind === "bip") { lo = -100; hi = 100; }
    else if (cell.kind === "int") { lo = cell.min || 0; hi = cell.max || 1; }
    else { lo = 0; hi = 100; } // pct
    var c = getInt(ctx, cell, lo);
    var v = clamp(c + dir, lo, hi);
    if (v !== c) ctx.setParam(cell.key, String(v));
  },

  draw: function (ctx) {
    // One-time per-ctx getParam/setParam cache (blocking-round-trip mitigation).
    if (!ctx._nmInstalled) {
      var rawGet = ctx.getParam, rawSet = ctx.setParam;
      ctx._pcache = {};
      ctx.getParam = function (k) {
        if (Object.prototype.hasOwnProperty.call(ctx._pcache, k)) return ctx._pcache[k];
        var v = rawGet.call(ctx, k);
        ctx._pcache[k] = v;
        return v;
      };
      ctx.setParam = function (k, v) {
        var r = rawSet.call(ctx, k, v);
        ctx._pcache[k] = String(v); // reflect write immediately
        return r;
      };
      ctx._cacheTick = 0;
      ctx._nmInstalled = true;
    }
    // Periodic full refresh (~2x/sec) so external changes (preset load) surface.
    if ((ctx._cacheTick = (ctx._cacheTick + 1) % 24) === 0) ctx._pcache = {};

    var s = readState(ctx);
    var page = PAGES[s.page];
    ctx.clear();

    // header: page name + n/N
    ctx.print(1, 1, page.name, 1);
    var tag = (s.page + 1) + "/" + PAGES.length;
    ctx.print(128 - tag.length * 6 - 1, 1, tag, 1);
    ctx.drawLine(0, 9, 127, 9, 1);

    for (var i = 0; i < page.cells.length; i++) {
      var col = i % COLS, row = (i / COLS) | 0;
      drawCell(ctx, col, row, page.cells[i], i === s.lastKnob);
    }
    return true; // suppress the host's fallback "no overlay" message
  },

  _test: { PAGES, dirFromCC, accumStep, wrapInc, clamp, fillFrac, fmtValue },
};

globalThis.noisemaker_editor = noisemaker_editor;
})();
