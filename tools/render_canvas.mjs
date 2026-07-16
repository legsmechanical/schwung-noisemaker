// Off-device renderer for src/canvas.js (the noisemaker_editor overlay).
// Builds a real 128x64 1-bit framebuffer ctx with a small bitmap font, evals
// canvas.js, and renders every page (plus one page with a selected knob) into
// one stacked PNG so the layout can be eyeballed without a device.
//   node tools/render_canvas.mjs [outfile.png]
// Node-only, no deps (uses zlib). The on-device host uses its own native font;
// this 5x5 uppercase font is a layout approximation, not pixel-exact.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import zlib from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "src", "canvas.js"), "utf8");
(0, eval)(src);
const ed = globalThis.noisemaker_editor, T = ed._test;

const W = 128, H = 64;

/* ---- 5x5 uppercase bitmap font (from Echidna's PF_FONT + "%") ---- */
const F = {
  "A":["01110","10001","11111","10001","10001"],"B":["11110","10001","11110","10001","11110"],
  "C":["01111","10000","10000","10000","01111"],"D":["11110","10001","10001","10001","11110"],
  "E":["11111","10000","11100","10000","11111"],"F":["11111","10000","11100","10000","10000"],
  "G":["01111","10000","10011","10001","01111"],"H":["10001","10001","11111","10001","10001"],
  "I":["11111","00100","00100","00100","11111"],"J":["11111","00010","00010","10010","01100"],
  "K":["10010","10100","11000","10100","10010"],"L":["10000","10000","10000","10000","11111"],
  "M":["11111","10101","10101","10001","10001"],"N":["10001","11001","10101","10011","10001"],
  "O":["01110","10001","10001","10001","01110"],"P":["11110","10001","11110","10000","10000"],
  "Q":["01110","10001","10001","10010","01101"],"R":["11110","10001","11110","10010","10001"],
  "S":["01111","10000","01110","00001","11110"],"T":["11111","00100","00100","00100","00100"],
  "U":["10001","10001","10001","10001","01110"],"V":["10001","10001","01010","01010","00100"],
  "W":["10001","10001","10101","10101","11011"],"X":["10001","01010","00100","01010","10001"],
  "Y":["10001","01010","00100","00100","00100"],"Z":["11111","00010","00100","01000","11111"],
  "0":["01110","10011","10101","11001","01110"],"1":["00100","01100","00100","00100","01110"],
  "2":["01110","10001","00110","01000","11111"],"3":["11110","00001","01110","00001","11110"],
  "4":["00010","00110","01010","11111","00010"],"5":["11111","10000","11110","00001","11110"],
  "6":["01110","10000","11110","10001","01110"],"7":["11111","00010","00100","01000","01000"],
  "8":["01110","10001","01110","10001","01110"],"9":["01110","10001","01111","00001","01110"],
  " ":["00000","00000","00000","00000","00000"],"-":["00000","00000","01110","00000","00000"],
  "+":["00000","00100","01110","00100","00000"],".":["00000","00000","00000","00000","01000"],
  "/":["00001","00010","00100","01000","10000"],"&":["01100","10010","01100","10011","01101"],
  "%":["11001","11010","00100","01011","10011"],
};
const ADV = 6, GH = 5;

function makeCtx() {
  const fb = new Uint8Array(W * H);
  const px = (x, y, v) => { x |= 0; y |= 0; if (x >= 0 && x < W && y >= 0 && y < H) fb[y * W + x] = v ? 1 : 0; };
  const store = SEED();
  return {
    fb, width: W, height: H,
    state: {},
    clear: () => fb.fill(0),
    setPixel: (x, y, v) => px(x, y, v),
    fillRect: (x, y, w, h, v) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, v); },
    drawRect: (x, y, w, h, v) => { for (let i = 0; i < w; i++) { px(x + i, y, v); px(x + i, y + h - 1, v); } for (let j = 0; j < h; j++) { px(x, y + j, v); px(x + w - 1, y + j, v); } },
    drawLine: (x1, y1, x2, y2, v) => { if (y1 === y2) for (let x = x1; x <= x2; x++) px(x, y1, v); else if (x1 === x2) for (let y = y1; y <= y2; y++) px(x1, y, v); },
    print: (x, y, text, color) => {
      const s = String(text).toUpperCase(); const c = color ? 1 : 0;
      for (let i = 0; i < s.length; i++) { const g = F[s[i]] || F[" "]; const ox = (x | 0) + i * ADV;
        for (let r = 0; r < GH; r++) for (let col = 0; col < 5; col++) if (g[r][col] === "1") px(ox + col, (y | 0) + r, c); } },
    measureText: (s) => Math.max(0, String(s).length * ADV - 1),
    getParam: (k) => (k in store ? String(store[k]) : "0"),
    setParam: (k, v) => { store[k] = parseInt(v, 10); },
    getValue: () => "0", setValue: () => {},
  };
}

/* Representative display values (display units the plugin's get_param speaks).
 * Mirrors the wrapper's audible default patch so bars/values look realistic. */
function SEED() {
  const s = {
    osc1_wave: 0, osc1_vol: 80, osc1_tune: 0, osc1_fine: 0, osc1_pw: 0, osc1_phase: 0, osc_sync: 0, detune: 20,
    osc2_wave: 1, osc2_vol: 35, osc2_tune: -12, osc2_fine: 4, osc2_fm: 0, osc3_vol: 0, ringmod: 0, osc_tune: 0,
    filter_type: 1, cutoff: 55, resonance: 12, keyfollow: 30, filter_env: 35, highpass: 0, vel_cut: 0, pw_cutoff: 10,
    fenv_a: 0, fenv_d: 45, fenv_s: 30, fenv_r: 30, vel_env: 0,
    aenv_a: 0, aenv_d: 50, aenv_s: 85, aenv_r: 28, vel_vol: 0, volume: 50, portamento: 0, voices: 6,
    lfo1_wave: 0, lfo1_rate: 30, lfo1_amount: 0, lfo1_dest: 0, lfo1_sync: 0, lfo1_keytrig: 0, lfo1_phase: 0, bitcrush: 0,
    lfo2_wave: 0, lfo2_rate: 30, lfo2_amount: 0, lfo2_dest: 0, lfo2_sync: 0, lfo2_keytrig: 0, lfo2_phase: 0,
    free_a: 0, free_d: 40, free_amt: 0, free_dest: 0, pw_pitch: 20, porta_mode: 0,
    chorus1: 1, chorus2: 0, reverb_wet: 25, reverb_decay: 40, reverb_pre: 10, reverb_hi: 60, reverb_lo: 15,
  };
  return s;
}

function renderPage(pageIdx, lastKnob = -1) {
  const ctx = makeCtx();
  ed.draw(ctx);                 // first frame installs cache
  ctx.state.init = true; ctx.state.page = pageIdx; ctx.state.lastKnob = lastKnob; ctx.state.accum = [0,0,0,0,0,0,0,0];
  ctx._pcache = {};
  ctx.fb.fill(0);
  ed.draw(ctx);
  return ctx.fb;
}

const frames = [];
for (let p = 0; p < T.PAGES.length; p++) frames.push({ fb: renderPage(p), name: T.PAGES[p].name });
frames.push({ fb: renderPage(2, 1), name: "FILTER (knob 2 = Cutoff selected)" });

/* ---- compose stacked, scaled ---- */
const SCALE = 3, GAP = 6;
const cellW = W * SCALE, cellH = H * SCALE;
const imgW = cellW + 2 * GAP;
const imgH = frames.length * (cellH + GAP) + GAP;
const img = Buffer.alloc(imgW * imgH * 4);
for (let i = 0; i < imgW * imgH; i++) { img[i*4]=30; img[i*4+1]=30; img[i*4+2]=34; img[i*4+3]=255; }
frames.forEach((f, idx) => {
  const oy = GAP + idx * (cellH + GAP), ox = GAP;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const on = f.fb[y * W + x];
    const r = on ? 235 : 10, g = on ? 235 : 12, b = on ? 240 : 16;
    for (let sy = 0; sy < SCALE; sy++) for (let sx = 0; sx < SCALE; sx++) {
      const o = ((oy + y*SCALE + sy) * imgW + (ox + x*SCALE + sx)) * 4;
      img[o]=r; img[o+1]=g; img[o+2]=b; img[o+3]=255;
    }
  }
});

/* ---- minimal PNG encoder ---- */
function crc32(buf){let c=~0;for(let i=0;i<buf.length;i++){c^=buf[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1));}return ~c>>>0;}
function chunk(type,data){const t=Buffer.from(type,"ascii");const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const body=Buffer.concat([t,data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(body));return Buffer.concat([len,body,crc]);}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(imgW,0);ihdr.writeUInt32BE(imgH,4);ihdr[8]=8;ihdr[9]=6;
const rawb=Buffer.alloc(imgH*(1+imgW*4));
for(let y=0;y<imgH;y++){rawb[y*(1+imgW*4)]=0;img.copy(rawb,y*(1+imgW*4)+1,y*imgW*4,(y+1)*imgW*4);}
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ihdr),chunk("IDAT",zlib.deflateSync(rawb)),chunk("IEND",Buffer.alloc(0))]);
const out=process.argv[2]||join(here,"..","canvas_preview.png");
writeFileSync(out,png);
console.log("wrote",out,`(${imgW}x${imgH}, ${frames.length} frames)`);
frames.forEach((f,i)=>console.log(`  frame ${i}: ${f.name}`));
