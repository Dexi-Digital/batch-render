import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

app.use('/static/*', serveStatic({ root: './public' }))
app.use('/lots_data.json', serveStatic({ root: './public' }))

app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Jardim das Acácias II — Mapa de Lotes</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<style>
  body { font-family: 'Segoe UI', sans-serif; background:#0f172a; margin:0; overflow:hidden; }
  #app { display:flex; flex-direction:column; height:100vh; }

  /* ── Header ── */
  header { background:#1e293b; border-bottom:1px solid #334155; padding:8px 16px;
           display:flex; align-items:center; gap:12px; flex-wrap:wrap; flex-shrink:0; }
  .logo  { width:34px; height:34px; background:linear-gradient(135deg,#3b82f6,#1d4ed8);
           border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:16px; }
  .stat-card { background:#0f172a; border:1px solid #334155; border-radius:8px;
               padding:6px 14px; text-align:center; min-width:64px; }
  .stat-val  { font-size:18px; font-weight:700; line-height:1.1; }
  .stat-lbl  { font-size:10px; color:#64748b; }

  /* ── Toolbar ── */
  .toolbar { background:#1e293b; border-bottom:1px solid #334155; padding:6px 16px;
             display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex-shrink:0; }
  .filter-btn { padding:4px 13px; border-radius:20px; font-size:12px; font-weight:600;
                border:2px solid transparent; cursor:pointer; transition:all .15s; }
  .filter-btn.active { border-color:#fff; }
  .f-all  { background:#334155; color:#e2e8f0; }
  .f-disp { background:#14532d; color:#86efac; }
  .f-vend { background:#7f1d1d; color:#fca5a5; }
  .f-bloq { background:#78350f; color:#fcd34d; }
  .ctrl-btn { background:#0f172a; border:1px solid #334155; color:#e2e8f0;
              width:28px; height:28px; border-radius:6px; cursor:pointer; font-size:15px;
              display:flex; align-items:center; justify-content:center; }
  .ctrl-btn:hover { background:#334155; }
  select, input[type=text] { background:#0f172a; border:1px solid #334155; color:#e2e8f0;
    border-radius:7px; padding:5px 10px; font-size:12px; }
  select:focus, input:focus { outline:none; border-color:#3b82f6; }

  /* ── Map viewport ── */
  #viewport { flex:1; overflow:hidden; position:relative; background:#0a1120; }
  #scene    { position:absolute; transform-origin:0 0; cursor:grab; }
  #scene:active { cursor:grabbing; }

  /* ── SVG lots ── */
  .lot { cursor:pointer; transition:filter .12s; }
  .lot:hover { filter:brightness(1.25) drop-shadow(0 0 4px rgba(255,255,255,.5)); }
  .lot.selected { filter:brightness(1.1) drop-shadow(0 0 6px #fff); }
  .lot-disp { fill:#22c55e; stroke:#15803d; stroke-width:0.8; }
  .lot-vend { fill:#ef4444; stroke:#b91c1c; stroke-width:0.8; }
  .lot-bloq { fill:#f59e0b; stroke:#b45309; stroke-width:0.8; }
  .lot-dimmed { opacity:.15; }
  .lot-label { font-size:6px; font-weight:700; fill:rgba(255,255,255,.9);
               text-anchor:middle; dominant-baseline:central; pointer-events:none; }
  .street-label { font-size:7px; fill:#94a3b8; text-anchor:middle; pointer-events:none; font-weight:600; }
  .quadra-label { font-size:9px; fill:#60a5fa; font-weight:800; text-anchor:middle;
                  dominant-baseline:central; pointer-events:none; font-family:monospace; }
  .road-fill  { fill:#1e293b; }
  .road-dash  { fill:#334155; }
  .block-bg   { fill:#0f172a; stroke:#1e3a5f; stroke-width:1; rx:4; }

  /* ── Detail Panel ── */
  #panel { position:absolute; top:0; right:0; bottom:0; width:300px;
           background:#1e293b; border-left:1px solid #334155;
           transform:translateX(100%); transition:transform .25s; z-index:10;
           display:flex; flex-direction:column; overflow-y:auto; }
  #panel.open { transform:translateX(0); }
  .panel-close { position:sticky; top:0; background:#1e293b; padding:10px 14px;
                 display:flex; justify-content:space-between; align-items:center;
                 border-bottom:1px solid #334155; z-index:1; }
  .badge { padding:3px 10px; border-radius:12px; font-size:12px; font-weight:700; }
  .badge-disp { background:#14532d; color:#86efac; }
  .badge-vend { background:#7f1d1d; color:#fca5a5; }
  .badge-bloq { background:#78350f; color:#fcd34d; }
  .detail-section { background:#0f172a; border-radius:8px; padding:12px; margin:0 12px 10px; }
  .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .detail-item label { display:block; font-size:10px; color:#64748b; margin-bottom:2px; }
  .detail-item span  { font-size:14px; font-weight:700; color:#f1f5f9; }

  /* ── Tooltip ── */
  #tip { position:fixed; background:#1e293b; border:1px solid #475569;
         border-radius:8px; padding:8px 12px; font-size:12px; color:#e2e8f0;
         pointer-events:none; z-index:999; display:none;
         box-shadow:0 4px 20px rgba(0,0,0,.5); max-width:220px; }

  /* ── Export btn ── */
  .exp-btn { padding:5px 13px; border-radius:7px; font-size:12px; font-weight:600;
             cursor:pointer; border:none; transition:opacity .15s; }
  .exp-btn:hover { opacity:.85; }

  /* ── Legend ── */
  .leg-dot { width:12px; height:12px; border-radius:2px; display:inline-block; vertical-align:middle; }

  /* Quadra selector highlight */
  .q-btn { padding:3px 9px; border-radius:12px; font-size:11px; font-weight:700;
           background:#0f172a; border:1px solid #334155; color:#94a3b8; cursor:pointer; transition:all .15s; }
  .q-btn:hover { border-color:#3b82f6; color:#93c5fd; }
  .q-btn.active { background:#1e3a5f; border-color:#3b82f6; color:#60a5fa; }
</style>
</head>
<body>
<div id="app">

  <!-- ═══ HEADER ═══ -->
  <header>
    <div class="logo"><i class="fas fa-map-marked-alt"></i></div>
    <div>
      <div style="font-size:14px;font-weight:700;color:#f1f5f9">Sistema SGL</div>
      <div style="font-size:11px;color:#64748b">Jardim das Acácias II</div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <div class="stat-card"><div class="stat-val" id="s-total" style="color:#f1f5f9">—</div><div class="stat-lbl">Total</div></div>
      <div class="stat-card"><div class="stat-val" id="s-disp" style="color:#22c55e">—</div><div class="stat-lbl">Disponíveis</div></div>
      <div class="stat-card"><div class="stat-val" id="s-vend" style="color:#ef4444">—</div><div class="stat-lbl">Vendidas</div></div>
      <div class="stat-card"><div class="stat-val" id="s-bloq" style="color:#f59e0b">—</div><div class="stat-lbl">Bloqueadas</div></div>
    </div>
    <div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <input type="text" id="search" placeholder="🔍 Buscar lote..." style="width:140px">
      <button class="exp-btn" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff" onclick="exportSVG()">
        <i class="fas fa-download"></i> SVG</button>
      <button class="exp-btn" style="background:linear-gradient(135deg,#059669,#047857);color:#fff" onclick="exportPNG()">
        <i class="fas fa-image"></i> PNG</button>
    </div>
  </header>

  <!-- ═══ TOOLBAR ═══ -->
  <div class="toolbar">
    <span style="font-size:11px;color:#64748b">Status:</span>
    <button class="filter-btn f-all active" onclick="setFilter('all',this)">Todos</button>
    <button class="filter-btn f-disp" onclick="setFilter('Disponível',this)">
      <span class="leg-dot" style="background:#22c55e;margin-right:4px"></span>Disponíveis</button>
    <button class="filter-btn f-vend" onclick="setFilter('Vendida',this)">
      <span class="leg-dot" style="background:#ef4444;margin-right:4px"></span>Vendidas</button>
    <button class="filter-btn f-bloq" onclick="setFilter('Bloqueada',this)">
      <span class="leg-dot" style="background:#f59e0b;margin-right:4px"></span>Bloqueadas</button>

    <div style="width:1px;background:#334155;height:20px;margin:0 4px"></div>
    <span style="font-size:11px;color:#64748b">Quadra:</span>
    <div id="quadra-btns" style="display:flex;gap:4px;flex-wrap:wrap"></div>

    <div style="margin-left:auto;display:flex;align-items:center;gap:4px">
      <button class="ctrl-btn" onclick="zoom(-0.15)">−</button>
      <span id="zoom-lbl" style="font-size:11px;color:#94a3b8;width:38px;text-align:center">100%</span>
      <button class="ctrl-btn" onclick="zoom(0.15)">+</button>
      <button class="ctrl-btn" onclick="resetView()" title="Reset" style="font-size:11px">⟳</button>
      <button class="ctrl-btn" onclick="fitView()" title="Encaixar" style="font-size:11px">⊡</button>
    </div>
  </div>

  <!-- ═══ MAP VIEWPORT ═══ -->
  <div id="viewport">
    <div id="scene">
      <svg id="map-svg" xmlns="http://www.w3.org/2000/svg"></svg>
    </div>
    <!-- Detail Panel -->
    <div id="panel">
      <div class="panel-close">
        <span style="font-weight:700;font-size:14px">Detalhes do Lote</span>
        <button onclick="closePanel()" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1">×</button>
      </div>
      <div id="panel-body" style="padding:12px 0 20px"></div>
    </div>
  </div>
</div>

<!-- Tooltip -->
<div id="tip"></div>

<script>
// ═══════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════
let allLots = [];
let lotMap  = {};          // "Q002-001" → lot
let filter  = 'all';
let activeQuadra = null;
let searchTerm   = '';
let scale = 1, tx = 0, ty = 0;
let dragging = false, lastX = 0, lastY = 0;
let selectedEl = null;

const SVG_W = 980, SVG_H = 900;   // canvas size

// ── Status helpers ──
const CLR = { 'Disponível':'#22c55e', 'Vendida':'#ef4444', 'Bloqueada':'#f59e0b' };
const CLS = { 'Disponível':'lot-disp', 'Vendida':'lot-vend', 'Bloqueada':'lot-bloq' };
const BDGCLS = { 'Disponível':'badge-disp','Vendida':'badge-vend','Bloqueada':'badge-bloq' };

// ═══════════════════════════════════════════════════════
//  LOAD DATA
// ═══════════════════════════════════════════════════════
async function init() {
  const data = await fetch('/lots_data.json').then(r=>r.json());
  allLots = data;
  allLots.forEach(l => { lotMap['Q'+l.quadra+'-'+l.lote] = l; });
  buildQuadraBtns();
  updateStats();
  buildMap();
  fitView();
}

// ═══════════════════════════════════════════════════════
//  STATS
// ═══════════════════════════════════════════════════════
function updateStats(src) {
  src = src || allLots;
  document.getElementById('s-total').textContent = src.length;
  document.getElementById('s-disp').textContent  = src.filter(l=>l.situacao==='Disponível').length;
  document.getElementById('s-vend').textContent  = src.filter(l=>l.situacao==='Vendida').length;
  document.getElementById('s-bloq').textContent  = src.filter(l=>l.situacao==='Bloqueada').length;
}

// ═══════════════════════════════════════════════════════
//  QUADRA BUTTONS
// ═══════════════════════════════════════════════════════
function buildQuadraBtns() {
  const qs = [...new Set(allLots.map(l=>l.quadra))].sort();
  const container = document.getElementById('quadra-btns');
  qs.forEach(q => {
    const b = document.createElement('button');
    b.className = 'q-btn';
    b.textContent = 'Q'+q;
    b.dataset.q = q;
    b.onclick = () => toggleQuadra(q, b);
    container.appendChild(b);
  });
}
function toggleQuadra(q, btn) {
  if (activeQuadra === q) {
    activeQuadra = null;
    btn.classList.remove('active');
  } else {
    activeQuadra = q;
    document.querySelectorAll('.q-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  }
  applyFilters();
}

// ═══════════════════════════════════════════════════════
//  BUILD MAP SVG  (faithful to blueprint layout)
// ═══════════════════════════════════════════════════════
function buildMap() {
  const svg = document.getElementById('map-svg');
  svg.setAttribute('width',  SVG_W);
  svg.setAttribute('height', SVG_H);
  svg.innerHTML = '';

  // ── Background ──
  mkEl(svg,'rect',{x:0,y:0,width:SVG_W,height:SVG_H,fill:'#0a1120'});

  // ── The real layout extracted from blueprint ──
  // The loteamento has:
  //   • A central vertical avenue (spine) running top→bottom
  //   • LEFT half:  lots face right (toward center road) and left (toward outer boundary)
  //     with a shared back-to-back arrangement inside each block
  //   • RIGHT half: mirror image
  //   • Outer left boundary is diagonal/curved (the land shape)
  //   • Bottom narrows and curves, with green dot = entrance
  //
  // We'll build it as:
  //   ROAD_CENTER_X = 490  (central avenue)
  //   Each half is split by an internal road midway
  //   Rows correspond to cross streets
  //
  // ── Measurements (scaled from 1024×724 blueprint) ──
  // Scale factor: SVG_W(980) / blueprint_content_width(580) ≈ 1.69
  // blueprint_content_height(650) * 1.38 ≈ SVG_H(900)

  const SX = 980 / 580;   // ≈ 1.69 horizontal
  const SY = 900 / 650;   // ≈ 1.38 vertical
  const OX = 149;         // blueprint content start x
  const OY = 56;          // blueprint content start y

  // Convert blueprint pixel → SVG coord
  function bpx(x) { return (x - OX) * SX; }
  function bpy(y) { return (y - OY) * SY; }

  // ── Road definitions from blueprint analysis ──
  // Central vertical road: blueprint x ≈ 430-455, SVG ≈ bpx(430)-bpx(455)
  const RD_CX1 = bpx(430), RD_CX2 = bpx(462);  // central road band

  // Left internal road (between 2 left blocks):  blueprint x ≈ 340-373
  const RD_L1  = bpx(336), RD_L2  = bpx(373);

  // Right internal road (between 2 right blocks): blueprint x ≈ 508-527
  const RD_R1  = bpx(505), RD_R2  = bpx(530);

  // Horizontal row boundaries (from analysis + blueprint rows)
  // Blueprint y values → SVG y
  const ROW_Y = [93,128,163,200,236,269,305,341,381,419,458,500,536,581,633].map(bpy);

  // Outer boundary (approximate from blueprint shape)
  // Left boundary: starts at ~x=286 (top) and curves/diagonals down to ~x=340 (mid) then curves to x=420 (bottom)
  // Right boundary: fairly straight from ~x=629 (top) to ~x=600 (bottom)

  // ── Draw ground / terrain fill ──
  // The overall shape based on blueprint
  const outerPath = [
    [bpx(249), bpy(93)],   // top-left corner of blocks
    [bpx(630), bpy(93)],   // top-right
    [bpx(630), bpy(236)],  // right goes down straight
    [bpx(628), bpy(305)],
    [bpx(614), bpy(381)],
    [bpx(609), bpy(419)],  // right boundary starts narrowing
    [bpx(628), bpy(458)],
    [bpx(658), bpy(500)],
    [bpx(657), bpy(536)],
    [bpx(599), bpy(581)],
    [bpx(510), bpy(633)],  // bottom right
    [bpx(455), bpy(650)],  // entrance green dot area
    [bpx(400), bpy(633)],  // bottom left of entrance
    [bpx(329), bpy(581)],
    [bpx(303), bpy(536)],
    [bpx(303), bpy(500)],
    [bpx(293), bpy(458)],
    [bpx(268), bpy(419)],  // left boundary curves
    [bpx(239), bpy(305)],
    [bpx(195), bpy(269)],
    [bpx(180), bpy(236)],
    [bpx(172), bpy(163)],
    [bpx(162), bpy(128)],
    [bpx(249), bpy(93)],
  ];
  const outerD = 'M ' + outerPath.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' L ') + ' Z';
  mkEl(svg,'path',{d:outerD, fill:'#111827', stroke:'#334155','stroke-width':'1.5'});

  // ── Draw roads ──
  // Central vertical road
  drawRoad(svg, RD_CX1, ROW_Y[0]-10, RD_CX2-RD_CX1, ROW_Y[ROW_Y.length-1]+20, true);
  // Label
  svgText(svg, (RD_CX1+RD_CX2)/2, ROW_Y[0]-20, 'AV. CENTRAL', '#6b7280', 8);

  // Left internal road
  drawRoad(svg, RD_L1, ROW_Y[0]-10, RD_L2-RD_L1, ROW_Y[ROW_Y.length-2]+10);

  // Right internal road
  drawRoad(svg, RD_R1, ROW_Y[0]-10, RD_R2-RD_R1, ROW_Y[ROW_Y.length-2]+10);

  // Horizontal cross-streets (thin lines between row bands)
  for (let i = 0; i < ROW_Y.length; i++) {
    mkEl(svg,'line',{
      x1: bpx(149), y1: ROW_Y[i],
      x2: bpx(730), y2: ROW_Y[i],
      stroke:'#1e3a5f','stroke-width':'1.5'
    });
  }

  // ── Entrance marker ──
  mkEl(svg,'circle',{cx: bpx(455), cy: bpy(607), r:8, fill:'#22c55e', stroke:'#fff','stroke-width':'1.5'});
  svgText(svg, bpx(455), bpy(625), 'ENTRADA', '#22c55e', 7);

  // ── Now draw the LOTS ──
  // Group lots by quadra
  const byQuadra = {};
  allLots.forEach(l => {
    if (!byQuadra[l.quadra]) byQuadra[l.quadra] = [];
    byQuadra[l.quadra].push(l);
  });

  // ── Layout map: each quadra occupies a specific region ──
  // From blueprint, the blocks are arranged in the left and right halves
  // between the horizontal row lines.
  //
  // Blueprint structure (reading the image):
  //
  //  TOP SECTION (rows 1-5, y=93-269):
  //    Left outer (Q002):  x=249-338,  rows 1-5    (lots face outer street left)
  //    Left inner (Q003):  x=375-430,  rows 1-5    (lots face central road)
  //    Right inner (Q004): x=462-507,  rows 1-5    (lots face central road)
  //    Right outer (Q005): x=531-630,  rows 1-5    (lots face outer street right)
  //
  //  MIDDLE SECTION (rows 5-8, y=269-381):
  //    Left outer (Q006):  x=239-338,  rows 5-8
  //    Left inner (Q007):  x=375-430,  rows 5-8
  //    Right inner (Q008): x=462-507,  rows 5-8
  //    Right outer (Q009): x=531-628,  rows 5-8
  //
  //  etc. adapted to the actual quadra numbers from CSV
  //
  // Given 17 quadras and the blueprint shape, let's define each block region:

  const BLOCKS = [
    // { quadra, x1(bp), y1(bp), x2(bp), y2(bp), lotsPerRow, facing }
    // facing: 'H' = lots stacked horizontally (long side is horizontal)
    // facing: 'V' = lots stacked vertically

    // TOP BAND (rows 1-5: y=93-269) — 4 columns
    { q:'002', x1:249, y1:93,  x2:336, y2:269 },  // left outer
    { q:'003', x1:375, y1:93,  x2:428, y2:269 },  // left inner
    { q:'004', x1:462, y1:93,  x2:505, y2:269 },  // right inner
    { q:'005', x1:531, y1:93,  x2:630, y2:269 },  // right outer

    // BAND 2 (rows 5-8: y=269-381)
    { q:'006', x1:239, y1:269, x2:336, y2:381 },
    { q:'007', x1:375, y1:269, x2:428, y2:381 },
    { q:'008', x1:462, y1:269, x2:505, y2:381 },
    { q:'009', x1:531, y1:269, x2:628, y2:381 },

    // BAND 3 (rows 8-11: y=381-500)
    { q:'010', x1:268, y1:381, x2:336, y2:500 },
    { q:'011', x1:375, y1:381, x2:428, y2:500 },
    { q:'012', x1:462, y1:381, x2:505, y2:500 },
    { q:'013', x1:531, y1:381, x2:628, y2:500 },

    // BAND 4 (rows 11-13: y=500-581)
    { q:'014', x1:303, y1:500, x2:428, y2:581 },
    { q:'015', x1:462, y1:500, x2:599, y2:581 },

    // BOTTOM (rows 13-14: y=581-633)
    { q:'017', x1:329, y1:581, x2:428, y2:633 },
    { q:'018', x1:462, y1:581, x2:599, y2:633 },
  ];

  BLOCKS.forEach(blk => {
    const lots = byQuadra[blk.q] || [];
    if (lots.length === 0) return;
    drawBlock(svg, blk, lots, bpx, bpy);
  });

  // ── Q019 (1 lot - special lot near entrance) ──
  const q19 = byQuadra['019'] || [];
  if (q19.length > 0) {
    drawSingleLot(svg, bpx(455), bpy(633), bpx(510)-bpx(455), bpy(660)-bpy(633), q19[0], bpx, bpy);
  }

  // ── Legend overlay ──
  drawLegend(svg);
}

// ─────────────────────────────────────────────
//  DRAW BLOCK: fill a rectangular region with lots
// ─────────────────────────────────────────────
function drawBlock(svg, blk, lots, bpx, bpy) {
  const x1 = bpx(blk.x1), y1 = bpy(blk.y1);
  const x2 = bpx(blk.x2), y2 = bpy(blk.y2);
  const w = x2 - x1, h = y2 - y1;
  const n = lots.length;

  // Block background
  mkEl(svg,'rect',{x:x1, y:y1, width:w, height:h, fill:'#0f172a', stroke:'#1e3a5f','stroke-width':'1', rx:'2'});

  // Quadra label (center of block)
  svgText(svg, x1+w/2, y1+h/2, 'Q'+blk.q, '#1d4ed8', 10, 'bold', 0.15);

  // Decide layout: if block is wider than tall → lots arranged in rows
  // if block is taller than wide → lots arranged in columns
  const isWide = w >= h;

  if (isWide) {
    // Lots are side by side horizontally, stacked in rows
    // Split into 2 rows (back-to-back): top row faces street, bottom row faces other street
    const cols = Math.ceil(n / 2);
    const lotW = w / cols;
    const lotH = h / 2;
    lots.forEach((lot, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      drawLot(svg, lot, x1 + col*lotW, y1 + row*lotH, lotW, lotH);
    });
  } else {
    // Block is taller: lots stacked vertically
    // Split into 2 columns (back-to-back): left col faces left street, right col faces right street
    const rows = Math.ceil(n / 2);
    const lotW = w / 2;
    const lotH = h / rows;
    lots.forEach((lot, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      drawLot(svg, lot, x1 + col*lotW, y1 + row*lotH, lotW, lotH);
    });
  }
}

// ─────────────────────────────────────────────
//  DRAW SINGLE LOT RECTANGLE
// ─────────────────────────────────────────────
function drawLot(svg, lot, x, y, w, h) {
  const pad = 1;
  const rx = x+pad, ry = y+pad, rw = w-pad*2, rh = h-pad*2;
  if (rw < 2 || rh < 2) return;

  const visible = isVisible(lot);
  const cls = CLS[lot.situacao] || 'lot-bloq';

  const rect = mkEl(svg,'rect',{
    x:rx, y:ry, width:rw, height:rh, rx:'2',
    class: 'lot ' + cls + (visible ? '' : ' lot-dimmed'),
    'data-q': lot.quadra, 'data-l': lot.lote,
  });

  rect.addEventListener('mouseenter', e => showTip(e, lot));
  rect.addEventListener('mousemove',  e => moveTip(e));
  rect.addEventListener('mouseleave', hideTip);
  rect.addEventListener('click', e => { e.stopPropagation(); selectLot(lot, rect); });

  // Lot number label (only if lot is large enough)
  if (rw > 10 && rh > 8) {
    const lbl = mkEl(svg,'text',{
      x: rx+rw/2, y: ry+rh/2,
      class:'lot-label',
      'data-q': lot.quadra, 'data-l': lot.lote,
    });
    lbl.textContent = parseInt(lot.lote).toString();
    if (!visible) lbl.style.opacity = '0.15';
  }
}

function drawSingleLot(svg, x, y, w, h, lot) {
  drawLot(svg, lot, x, y, w, h);
}

function isVisible(lot) {
  if (filter !== 'all' && lot.situacao !== filter) return false;
  if (activeQuadra && lot.quadra !== activeQuadra) return false;
  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    if (!('q'+lot.quadra).includes(s) && !lot.lote.includes(s) &&
        !('lote '+lot.lote).includes(s) && !('quadra '+lot.quadra).includes(s)) return false;
  }
  return true;
}

// ─────────────────────────────────────────────
//  DRAW ROAD BAND
// ─────────────────────────────────────────────
function drawRoad(svg, x, y, w, h, central=false) {
  mkEl(svg,'rect',{x, y, width:w, height:h, fill: central ? '#0f2240' : '#111827'});
  if (central) {
    // dashes
    for (let dy=y+10; dy<y+h-10; dy+=18) {
      mkEl(svg,'rect',{x:x+w/2-1.5, y:dy, width:3, height:9, fill:'#1e40af', rx:'1'});
    }
  }
}

// ─────────────────────────────────────────────
//  DRAW LEGEND
// ─────────────────────────────────────────────
function drawLegend(svg) {
  const lx = 20, ly = SVG_H - 80;
  mkEl(svg,'rect',{x:lx-8, y:ly-8, width:170, height:75, rx:'8', fill:'rgba(15,23,42,0.85)', stroke:'#334155'});
  svgText(svg, lx, ly+4, 'LEGENDA', '#94a3b8', 9, 'bold');
  [[16,'#22c55e','Disponível'],[30,'#ef4444','Vendida'],[44,'#f59e0b','Bloqueada']].forEach(([dy,c,lb])=>{
    mkEl(svg,'rect',{x:lx, y:ly+dy-6, width:10, height:10, fill:c, rx:'2'});
    svgText(svg, lx+16, ly+dy+1, lb, '#e2e8f0', 10);
  });
}

// ─────────────────────────────────────────────
//  SVG HELPERS
// ─────────────────────────────────────────────
function mkEl(parent, tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v));
  parent.appendChild(el);
  return el;
}
function svgText(parent, x, y, txt, fill, size, weight, opacity) {
  const el = document.createElementNS('http://www.w3.org/2000/svg','text');
  el.setAttribute('x', x); el.setAttribute('y', y);
  el.setAttribute('fill', fill); el.setAttribute('font-size', size||10);
  el.setAttribute('text-anchor','middle'); el.setAttribute('dominant-baseline','central');
  el.setAttribute('font-weight', weight||'normal');
  el.setAttribute('pointer-events','none');
  if (opacity) el.setAttribute('opacity', opacity);
  el.textContent = txt;
  parent.appendChild(el);
  return el;
}

// ═══════════════════════════════════════════════════════
//  FILTER / SEARCH — update visibility without rebuild
// ═══════════════════════════════════════════════════════
function applyFilters() {
  allLots.forEach(lot => {
    const rect = document.querySelector(\`.lot[data-q="\${lot.quadra}"][data-l="\${lot.lote}"]\`);
    const lbl  = document.querySelector(\`text[data-q="\${lot.quadra}"][data-l="\${lot.lote}"]\`);
    if (!rect) return;
    const vis = isVisible(lot);
    if (vis) {
      rect.classList.remove('lot-dimmed');
      if (lbl) lbl.style.opacity='1';
    } else {
      rect.classList.add('lot-dimmed');
      if (lbl) lbl.style.opacity='0.1';
    }
  });

  // Update stats for filtered view
  const vis = allLots.filter(isVisible);
  updateStats(vis);
}

function setFilter(f, btn) {
  filter = f;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

document.getElementById('search').addEventListener('input', e=>{
  searchTerm = e.target.value.trim();
  applyFilters();
});

// ═══════════════════════════════════════════════════════
//  TOOLTIP
// ═══════════════════════════════════════════════════════
const tip = document.getElementById('tip');
function fmt(v) {
  const n = parseFloat((v||'').replace(',','.'));
  return isNaN(n) ? (v||'—') : n.toLocaleString('pt-BR',{minimumFractionDigits:2});
}
function fmtR(v) {
  const n = parseFloat((v||'').replace(',','.'));
  return isNaN(n) ? '—' : n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}
function showTip(e, lot) {
  const c = CLR[lot.situacao]||'#64748b';
  tip.innerHTML = \`
    <b>Q\${lot.quadra} · Lote \${lot.lote}</b><br>
    <span style="background:\${c};color:#000;padding:1px 7px;border-radius:10px;font-size:11px">\${lot.situacao}</span><br>
    <span style="color:#94a3b8">Área:</span> <b>\${fmt(lot.area)} m²</b>
    \${lot.situacao==='Disponível'?'<br><span style="color:#94a3b8">Valor:</span> <b style="color:#4ade80">'+fmtR(lot.valor)+'</b>':''}
  \`;
  tip.style.display='block'; moveTip(e);
}
function moveTip(e) { tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY-10)+'px'; }
function hideTip()  { tip.style.display='none'; }

// ═══════════════════════════════════════════════════════
//  LOT SELECTION + PANEL
// ═══════════════════════════════════════════════════════
function selectLot(lot, el) {
  if (selectedEl) selectedEl.classList.remove('selected');
  el.classList.add('selected');
  selectedEl = el;
  showPanel(lot);
}
function showPanel(lot) {
  const c = CLR[lot.situacao]||'#64748b';
  const bdg = BDGCLS[lot.situacao]||'';
  document.getElementById('panel-body').innerHTML = \`
    <div style="margin:0 12px 10px;background:\${c}22;border:1px solid \${c}44;border-radius:10px;padding:12px">
      <div style="font-size:11px;color:#94a3b8">Quadra \${lot.quadra}</div>
      <div style="font-size:22px;font-weight:800;color:#f1f5f9">Lote \${lot.lote}</div>
      <span class="badge \${bdg}">\${lot.situacao}</span>
    </div>
    <div class="detail-section">
      <div style="font-size:10px;color:#64748b;font-weight:700;letter-spacing:.06em;margin-bottom:8px">DIMENSÕES</div>
      <div class="detail-grid">
        <div class="detail-item"><label>Frente</label><span>\${lot.frente||'—'}m</span></div>
        <div class="detail-item"><label>Fundos</label><span>\${lot.fundos||'—'}m</span></div>
        <div class="detail-item"><label>Esquerda</label><span>\${lot.esquerda||'—'}m</span></div>
        <div class="detail-item"><label>Direita</label><span>\${lot.direita||'—'}m</span></div>
      </div>
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #1e293b;text-align:center">
        <div style="font-size:11px;color:#64748b">Área Total</div>
        <div style="font-size:20px;font-weight:800;color:#60a5fa">\${fmt(lot.area)} m²</div>
      </div>
    </div>
    <div class="detail-section">
      <div style="font-size:10px;color:#64748b;font-weight:700;letter-spacing:.06em;margin-bottom:8px">VALOR</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:10px;color:#64748b">Valor do Lote</div>
          <div style="font-size:18px;font-weight:700;color:#4ade80">\${fmtR(lot.valor)}</div></div>
        <div style="text-align:right"><div style="font-size:10px;color:#64748b">Valor/m²</div>
          <div style="font-size:14px;font-weight:700;color:#f1f5f9">\${fmtR(lot.valorM2)}</div></div>
      </div>
    </div>
    \${(lot.confrontFrente||lot.confrontFundos)?
    \`<div class="detail-section">
      <div style="font-size:10px;color:#64748b;font-weight:700;letter-spacing:.06em;margin-bottom:8px">CONFRONTAÇÕES</div>
      \${lot.confrontFrente?'<div style="display:flex;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:#64748b;width:52px;flex-shrink:0">Frente</span><span style="font-size:11px;color:#e2e8f0">'+lot.confrontFrente+'</span></div>':''}
      \${lot.confrontFundos?'<div style="display:flex;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:#64748b;width:52px;flex-shrink:0">Fundos</span><span style="font-size:11px;color:#e2e8f0">'+lot.confrontFundos+'</span></div>':''}
      \${lot.confrontEsq?'<div style="display:flex;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:#64748b;width:52px;flex-shrink:0">Esquerda</span><span style="font-size:11px;color:#e2e8f0">'+lot.confrontEsq+'</span></div>':''}
      \${lot.confrontDir?'<div style="display:flex;gap:6px"><span style="font-size:10px;color:#64748b;width:52px;flex-shrink:0">Direita</span><span style="font-size:11px;color:#e2e8f0">'+lot.confrontDir+'</span></div>':''}
    </div>\`:''}
    <div class="detail-section">
      <div style="font-size:10px;color:#64748b;font-weight:700;letter-spacing:.06em;margin-bottom:8px">MATRÍCULA</div>
      <div style="display:flex;justify-content:space-between">
        <div><div style="font-size:10px;color:#64748b">Número</div><div style="font-weight:700;color:#f1f5f9">\${lot.matricula||'—'}</div></div>
        <div style="text-align:right"><div style="font-size:10px;color:#64748b">Data</div><div style="font-weight:700;color:#f1f5f9">\${lot.dataMatricula||'—'}</div></div>
      </div>
    </div>
    \${lot.descricao?'<div class="detail-section"><div style="font-size:10px;color:#64748b;font-weight:700;letter-spacing:.06em;margin-bottom:4px">DESCRIÇÃO</div><div style="font-size:12px;color:#e2e8f0">'+lot.descricao+'</div></div>':''}
  \`;
  document.getElementById('panel').classList.add('open');
}
function closePanel() {
  document.getElementById('panel').classList.remove('open');
  if (selectedEl) { selectedEl.classList.remove('selected'); selectedEl=null; }
}
document.getElementById('viewport').addEventListener('click', e=>{
  if (e.target.id==='viewport'||e.target.id==='scene'||e.target.id==='map-svg') closePanel();
});

// ═══════════════════════════════════════════════════════
//  PAN + ZOOM
// ═══════════════════════════════════════════════════════
const scene = document.getElementById('scene');
function applyTransform() {
  scene.style.transform = \`translate(\${tx}px,\${ty}px) scale(\${scale})\`;
  document.getElementById('zoom-lbl').textContent = Math.round(scale*100)+'%';
}
function zoom(d) {
  const vp = document.getElementById('viewport').getBoundingClientRect();
  const cx = vp.width/2, cy = vp.height/2;
  const ns = Math.max(0.2, Math.min(4, scale+d));
  tx = cx - (cx-tx)*(ns/scale);
  ty = cy - (cy-ty)*(ns/scale);
  scale = ns;
  applyTransform();
}
function resetView() { scale=1; tx=0; ty=0; applyTransform(); }
function fitView() {
  const vp = document.getElementById('viewport').getBoundingClientRect();
  const scX = vp.width  / SVG_W;
  const scY = vp.height / SVG_H;
  scale = Math.min(scX, scY) * 0.92;
  tx = (vp.width  - SVG_W*scale)/2;
  ty = (vp.height - SVG_H*scale)/2;
  applyTransform();
}
scene.addEventListener('mousedown', e=>{
  if (e.target.classList.contains('lot')) return;
  dragging=true; lastX=e.clientX; lastY=e.clientY; e.preventDefault();
});
window.addEventListener('mousemove', e=>{
  if (!dragging) return;
  tx += e.clientX-lastX; ty += e.clientY-lastY;
  lastX=e.clientX; lastY=e.clientY;
  applyTransform();
});
window.addEventListener('mouseup', ()=>dragging=false);
document.getElementById('viewport').addEventListener('wheel', e=>{
  e.preventDefault();
  const d = e.deltaY < 0 ? 0.1 : -0.1;
  const vp = e.currentTarget.getBoundingClientRect();
  const mx = e.clientX - vp.left;
  const my = e.clientY - vp.top;
  const ns = Math.max(0.2, Math.min(4, scale+d));
  tx = mx - (mx-tx)*(ns/scale);
  ty = my - (my-ty)*(ns/scale);
  scale = ns;
  applyTransform();
}, {passive:false});

// Touch support
let lastTouch = null;
scene.addEventListener('touchstart', e=>{
  if (e.touches.length===1) { lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY}; }
});
scene.addEventListener('touchmove', e=>{
  if (e.touches.length===1 && lastTouch) {
    tx += e.touches[0].clientX-lastTouch.x;
    ty += e.touches[0].clientY-lastTouch.y;
    lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY};
    applyTransform(); e.preventDefault();
  }
},{passive:false});

// ═══════════════════════════════════════════════════════
//  EXPORT SVG
// ═══════════════════════════════════════════════════════
function exportSVG() {
  const svg = document.getElementById('map-svg');
  const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\\n'+new XMLSerializer().serializeToString(svg)],
    {type:'image/svg+xml;charset=utf-8'});
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob), download:'jardim-acacias-II.svg'});
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ═══════════════════════════════════════════════════════
//  EXPORT PNG
// ═══════════════════════════════════════════════════════
function exportPNG() {
  const svg = document.getElementById('map-svg');
  const s = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([s],{type:'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = ()=>{
    const c = document.createElement('canvas');
    c.width=SVG_W*2; c.height=SVG_H*2;
    const ctx=c.getContext('2d'); ctx.scale(2,2); ctx.drawImage(img,0,0);
    URL.revokeObjectURL(url);
    c.toBlob(pb=>{
      const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(pb),download:'jardim-acacias-II.png'});
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    },'image/png');
  };
  img.src=url;
}

// ═══════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════
init();
</script>
</body>
</html>`)
})

export default app
