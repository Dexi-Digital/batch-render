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
  body { font-family: 'Segoe UI', sans-serif; background:#f4f4f4; margin:0; overflow:hidden; }
  #app { display:flex; flex-direction:column; height:100vh; }

  /* ── Header ── */
  header { background:#161616; border-bottom:1px solid #e0e0e0; padding:8px 16px;
           display:flex; align-items:center; gap:12px; flex-wrap:wrap; flex-shrink:0; }
  .logo  { width:34px; height:34px; background:linear-gradient(135deg,#3b82f6,#1d4ed8);
           border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:16px; }
  .stat-card { background:#ffffff; border:1px solid #e0e0e0; border-radius:8px;
               padding:6px 14px; text-align:center; min-width:64px; }
  .stat-val  { font-size:18px; font-weight:700; line-height:1.1; color:#161616; }
  .stat-lbl  { font-size:10px; color:#525252; }

  /* ── Toolbar ── */
  .toolbar { background:#ffffff; border-bottom:1px solid #e0e0e0; padding:6px 16px;
             display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex-shrink:0; }
  .filter-btn { padding:4px 13px; border-radius:20px; font-size:12px; font-weight:600;
                border:2px solid transparent; cursor:pointer; transition:all .15s; }
  .filter-btn.active { border-color:#161616; }
  .f-all  { background:#e0e0e0; color:#161616; }
  .f-disp { background:#a7f0ba; color:#198038; }
  .f-vend { background:#ffd7d9; color:#da1e28; }
  .f-bloq { background:#fdefb2; color:#b28600; }
  .ctrl-btn { background:#ffffff; border:1px solid #e0e0e0; color:#161616;
              width:28px; height:28px; border-radius:6px; cursor:pointer; font-size:15px;
              display:flex; align-items:center; justify-content:center; }
  .ctrl-btn:hover { background:#f4f4f4; }
  select, input[type=text] { background:#ffffff; border:1px solid #8d8d8d; color:#161616;
    border-radius:7px; padding:5px 10px; font-size:12px; }
  select:focus, input:focus { outline:none; border-color:#0043ce; }

  /* ── Map viewport ── */
  #viewport { flex:1; overflow:hidden; position:relative; background:#f4f4f4; }
  #scene    { position:absolute; transform-origin:0 0; cursor:grab; }
  #scene:active { cursor:grabbing; }

  /* ── SVG lots ── */
  .lot { cursor:pointer; transition:filter .12s; }
  .lot:hover { filter:brightness(0.95) drop-shadow(0 0 4px rgba(0,0,0,.3)); }
  .lot.selected { filter:brightness(0.9) drop-shadow(0 0 6px rgba(0,0,0,.5)); }
  .lot-disp { fill:#a7f0ba; stroke:#198038; stroke-width:0.8; }
  .lot-vend { fill:#ffd7d9; stroke:#da1e28; stroke-width:0.8; }
  .lot-bloq { fill:#fdefb2; stroke:#b28600; stroke-width:0.8; }
  .lot-dimmed { opacity:.15; }
  .lot-label { font-size:8px; font-weight:700; fill:#161616;
               text-anchor:middle; dominant-baseline:central; pointer-events:none; }
  .street-label { font-size:7px; fill:#525252; text-anchor:middle; pointer-events:none; font-weight:600; }
  .quadra-label { font-size:9px; fill:#0043ce; font-weight:800; text-anchor:middle;
                  dominant-baseline:central; pointer-events:none; font-family:monospace; }
  .road-fill  { fill:#c6c6c6; }
  .road-dash  { fill:#ffffff; }
  .block-bg   { fill:#ffffff; stroke:#e0e0e0; stroke-width:1; rx:4; }

  /* ── Detail Panel ── */
  #panel { position:absolute; top:0; right:0; bottom:0; width:300px;
           background:#ffffff; border-left:1px solid #e0e0e0;
           transform:translateX(100%); transition:transform .25s; z-index:10;
           display:flex; flex-direction:column; overflow-y:auto; }
  #panel.open { transform:translateX(0); }
  .panel-close { position:sticky; top:0; background:#ffffff; padding:10px 14px;
                 display:flex; justify-content:space-between; align-items:center;
                 border-bottom:1px solid #e0e0e0; z-index:1; color:#161616; }
  .badge { padding:3px 10px; border-radius:12px; font-size:12px; font-weight:700; }
  .badge-disp { background:#a7f0ba; color:#198038; }
  .badge-vend { background:#ffd7d9; color:#da1e28; }
  .badge-bloq { background:#fdefb2; color:#b28600; }
  .detail-section { background:#f4f4f4; border-radius:8px; padding:12px; margin:0 12px 10px; }
  .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .detail-item label { display:block; font-size:10px; color:#525252; margin-bottom:2px; }
  .detail-item span  { font-size:14px; font-weight:700; color:#161616; }

  /* ── Tooltip ── */
  #tip { position:fixed; background:#ffffff; border:1px solid #e0e0e0;
         border-radius:8px; padding:8px 12px; font-size:12px; color:#161616;
         pointer-events:none; z-index:999; display:none;
         box-shadow:0 4px 20px rgba(0,0,0,.15); max-width:220px; }

  /* ── Export btn ── */
  .exp-btn { padding:5px 13px; border-radius:7px; font-size:12px; font-weight:600;
             cursor:pointer; border:none; transition:opacity .15s; }
  .exp-btn:hover { opacity:.85; }

  /* ── Legend ── */
  .leg-dot { width:12px; height:12px; border-radius:2px; display:inline-block; vertical-align:middle; }

  /* Quadra selector highlight */
  .q-btn { padding:3px 9px; border-radius:12px; font-size:11px; font-weight:700;
           background:#ffffff; border:1px solid #e0e0e0; color:#525252; cursor:pointer; transition:all .15s; }
  .q-btn:hover { border-color:#0043ce; color:#0043ce; }
  .q-btn.active { background:#0043ce; border-color:#0043ce; color:#ffffff; }
</style>
</head>
<body>
<div id="app">

  <!-- ═══ HEADER ═══ -->
  <header>
    <div class="logo"><i class="fas fa-map-marked-alt"></i></div>
    <div>
      <div style="font-size:14px;font-weight:700;color:#ffffff">Jardim das Acácias II</div>
      <div style="font-size:11px;color:#a8a8a8">Jardim das Acácias II</div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <div class="stat-card"><div class="stat-val" id="s-total">—</div><div class="stat-lbl">Total</div></div>
      <div class="stat-card"><div class="stat-val" id="s-disp" style="color:#198038">—</div><div class="stat-lbl">Disponíveis</div></div>
      <div class="stat-card"><div class="stat-val" id="s-vend" style="color:#da1e28">—</div><div class="stat-lbl">Vendidas</div></div>
      <div class="stat-card"><div class="stat-val" id="s-bloq" style="color:#b28600">—</div><div class="stat-lbl">Bloqueadas</div></div>
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
    <span style="font-size:11px;color:#525252">Status:</span>
    <button class="filter-btn f-all active" onclick="setFilter('all',this)">Todos</button>
    <button class="filter-btn f-disp" onclick="setFilter('Disponível',this)">
      <span class="leg-dot" style="background:#198038;margin-right:4px"></span>Disponíveis</button>
    <button class="filter-btn f-vend" onclick="setFilter('Vendida',this)">
      <span class="leg-dot" style="background:#da1e28;margin-right:4px"></span>Vendidas</button>
    <button class="filter-btn f-bloq" onclick="setFilter('Bloqueada',this)">
      <span class="leg-dot" style="background:#b28600;margin-right:4px"></span>Bloqueadas</button>

    <div style="width:1px;background:#e0e0e0;height:20px;margin:0 4px"></div>
    <span style="font-size:11px;color:#525252">Quadra:</span>
    <div id="quadra-btns" style="display:flex;gap:4px;flex-wrap:wrap"></div>

    <div style="margin-left:auto;display:flex;align-items:center;gap:4px">
      <button class="ctrl-btn" onclick="zoom(-0.15)">−</button>
      <span id="zoom-lbl" style="font-size:11px;color:#525252;width:38px;text-align:center">100%</span>
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
const CLR = { 'Disponível':'#198038', 'Vendida':'#da1e28', 'Bloqueada':'#b28600' };
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
//  BUILD MAP SVG — Direct SVG coordinates (no blueprint transform)
// ═══════════════════════════════════════════════════════
function buildMap() {
  const svg = document.getElementById('map-svg');
  svg.setAttribute('width',  SVG_W);
  svg.setAttribute('height', SVG_H);
  svg.innerHTML = '';

  // ── Background ──
  mkEl(svg,'rect',{x:0,y:0,width:SVG_W,height:SVG_H,fill:'#ffffff'});

  // ── Terrain / Ground fill ──
  const outerPath = [
    [60,40],   [890,40],   [890,220],  [870,330],  [850,480],  [770,605],  [670,715],
    [530,760], [470,760],  [330,715],  [265,605],  [185,480],  [120,330],  [80,215],   [60,40]
  ];
  const outerD = 'M ' + outerPath.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' L ') + ' Z';
  mkEl(svg,'path',{d:outerD, fill:'#f4f4f4', stroke:'#c6c6c6','stroke-width':'1.5'});

  // ── Roads ── SVG direct coordinates
  // Left internal road: x = 248–278 (30px)
  drawRoad(svg, 248, 40, 30, 730, false);

  // Central avenue: x = 470–530 (60px) — main road
  drawRoad(svg, 470, 40, 60, 730, true);

  // Right internal road: x = 710–740 (30px)
  drawRoad(svg, 710, 40, 30, 730, false);

  // Horizontal cross-streets at y = 40, 95, 150, 205, 260, 315, 370, 425, 480, 535, 590, 730
  const crossStreets = [40, 95, 150, 205, 260, 315, 370, 425, 480, 535, 590, 730];
  const streetNames = [
    'AV. JOÃO COSTA MOURA',      // y=40 (entrance/top)
    'R. ALONSO LOPES VALADÃO',   // y=95
    'R. DIMAS NEVES MARTINS',    // y=150
    'R. DR. PAULO BATISTA DE OLIVEIRA', // y=205
    'R. JOAQUIM DE PAULO MARQUES', // y=260
    'R. JOSÉ QUIRINO FILHO',     // y=315
    'R. JOÃO JOSÉ DA COSTA',     // y=370
    'R. MANOEL PEREIRA DA SILVA', // y=425
    'R. MÁRIO DOMINGOS FERREIRA', // y=480
    'R. OVÍDIO FERREIRA BORGES', // y=535
    'R. VINICIUS DA SILVA',      // y=590
    ''                            // y=730 (bottom)
  ];
  
  crossStreets.forEach((y, idx) => {
    mkEl(svg,'line',{x1:60, y1:y, x2:890, y2:y, stroke:'#c6c6c6','stroke-width':'1'});
    // Add street name if available
    if (streetNames[idx] && streetNames[idx].length > 0) {
      svgText(svg, 100, y - 6, streetNames[idx], '#525252', 7);
    }
  });

  // ── Entrance marker ──
  mkEl(svg,'circle',{cx:500, cy:760, r:6, fill:'#198038', stroke:'#ffffff','stroke-width':'1'});
  svgText(svg, 500, 780, 'ENTRADA', '#198038', 7);

  // ── BlockBlocks definition: direct SVG coordinates ──
  const BLOCKS = [
    { q:'002', x1:60,  y1:40,  x2:248, y2:185 },
    { q:'003', x1:278, y1:40,  x2:470, y2:185 },
    { q:'004', x1:530, y1:40,  x2:710, y2:185 },
    { q:'005', x1:740, y1:40,  x2:890, y2:185 },

    { q:'006', x1:80,  y1:215, x2:248, y2:330 },
    { q:'007', x1:278, y1:215, x2:470, y2:330 },
    { q:'008', x1:530, y1:215, x2:710, y2:330 },
    { q:'009', x1:740, y1:215, x2:870, y2:330 },

    { q:'010', x1:120, y1:360, x2:248, y2:480 },
    { q:'011', x1:278, y1:360, x2:470, y2:480 },
    { q:'012', x1:530, y1:360, x2:710, y2:480 },
    { q:'013', x1:740, y1:360, x2:850, y2:480 },

    { q:'014', x1:185, y1:510, x2:470, y2:605 },
    { q:'015', x1:530, y1:510, x2:770, y2:605 },

    { q:'017', x1:265, y1:635, x2:470, y2:715 },
    { q:'018', x1:530, y1:635, x2:670, y2:715 },
  ];

  // Group lots by quadra
  const byQuadra = {};
  allLots.forEach(l => {
    if (!byQuadra[l.quadra]) byQuadra[l.quadra] = [];
    byQuadra[l.quadra].push(l);
  });

  BLOCKS.forEach(blk => {
    const lots = byQuadra[blk.q] || [];
    if (lots.length === 0) return;
    drawBlock(svg, blk, lots);
  });

  // ── Q019 (single lot near entrance) ──
  const q19 = byQuadra['019'] || [];
  if (q19.length > 0) {
    drawLot(svg, q19[0], 470, 715, 60, 45);
  }

  // ── Legend overlay ──
  drawLegend(svg);
}

// ─────────────────────────────────────────────
//  DRAW BLOCK: fill a rectangular region with lots
// ─────────────────────────────────────────────
function drawBlock(svg, blk, lots) {
  const x1 = blk.x1, y1 = blk.y1;
  const x2 = blk.x2, y2 = blk.y2;
  const w = x2 - x1, h = y2 - y1;
  const n = lots.length;

  // Block background
  mkEl(svg,'rect',{x:x1, y:y1, width:w, height:h, fill:'#ffffff', stroke:'#e0e0e0','stroke-width':'1', rx:'2'});

  // Quadra label (center of block)
  svgText(svg, x1+w/2, y1+h/2, 'Q'+blk.q, '#0043ce', 10, 'bold', 0.15);

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

  // Check if lot is on municipal boundary (confrontFundos or confrontDir contains "MUNICÍPIO")
  const isMunicipal = (lot.confrontFundos && lot.confrontFundos.includes('MUNICÍPIO')) ||
                      (lot.confrontDir && lot.confrontDir.includes('MUNICÍPIO'));

  const rect = mkEl(svg,'rect',{
    x:rx, y:ry, width:rw, height:rh, rx:'2',
    class: 'lot ' + cls + (visible ? '' : ' lot-dimmed'),
    'data-q': lot.quadra, 'data-l': lot.lote,
  });
  
  // Add dashed border for municipal boundary lots
  if (isMunicipal) {
    rect.setAttribute('stroke-dasharray', '3,2');
  }

  rect.addEventListener('mouseenter', e => showTip(e, lot));
  rect.addEventListener('mousemove',  e => moveTip(e));
  rect.addEventListener('mouseleave', hideTip);
  rect.addEventListener('click', e => { e.stopPropagation(); selectLot(lot, rect); });

  // Lot number label + area (only if lot is large enough)
  if (rw > 10 && rh > 12) {
    // Lot number
    const lbl = mkEl(svg,'text',{
      x: rx+rw/2, y: ry+rh/2 - (rh > 18 ? 3 : 0),
      class:'lot-label',
      'data-q': lot.quadra, 'data-l': lot.lote,
      'font-size': (rw > 18 && rh > 18) ? '8' : '6',
      'font-weight': 'bold'
    });
    lbl.textContent = parseInt(lot.lote).toString();
    if (!visible) lbl.style.opacity = '0.15';

    // Area label (only if space available)
    if (rw > 18 && rh > 18 && lot.area) {
      const areaLbl = mkEl(svg,'text',{
        x: rx+rw/2, y: ry+rh/2 + 5,
        class:'lot-label',
        'data-q': lot.quadra, 'data-l': lot.lote,
        'font-size': '6',
      });
      areaLbl.textContent = lot.area + ' m²';
      if (!visible) areaLbl.style.opacity = '0.15';
    }
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
  if (central) {
    mkEl(svg,'rect',{x, y, width:w, height:h, fill: '#a8a8a8'});
    // dashes
    for (let dy=y+10; dy<y+h-10; dy+=18) {
      mkEl(svg,'rect',{x:x+w/2-1.5, y:dy, width:3, height:9, fill:'#ffffff', rx:'1'});
    }
  } else {
    mkEl(svg,'rect',{x, y, width:w, height:h, fill: '#c6c6c6'});
  }
}

// ─────────────────────────────────────────────
//  DRAW LEGEND
// ─────────────────────────────────────────────
function drawLegend(svg) {
  const lx = 20, ly = SVG_H - 100;
  mkEl(svg,'rect',{x:lx-8, y:ly-8, width:200, height:95, rx:'8', fill:'rgba(255,255,255,0.95)', stroke:'#e0e0e0'});
  svgText(svg, lx, ly+4, 'LEGENDA', '#525252', 9, 'bold');
  
  const items = [
    [16,'#a7f0ba','Disponível'],
    [30,'#ffd7d9','Vendida'],
    [44,'#fdefb2','Bloqueada'],
    [58,'#ffffff','Limite Municipal']
  ];
  
  items.forEach(([dy,c,lb])=>{
    if (lb === 'Limite Municipal') {
      // Draw dashed border instead of filled rect
      const rect = mkEl(svg,'rect',{x:lx, y:ly+dy-6, width:10, height:10, fill:'none', stroke:c, 'stroke-width':'0.8', 'stroke-dasharray':'2,1'});
    } else {
      mkEl(svg,'rect',{x:lx, y:ly+dy-6, width:10, height:10, fill:c, rx:'1'});
    }
    svgText(svg, lx+16, ly+dy+1, lb, '#161616', 10);
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
  const c = CLR[lot.situacao]||'#525252';
  tip.innerHTML = \`
    <b style="color:#161616">Q\${lot.quadra} · Lote \${lot.lote}</b><br>
    <span style="background:\${c};color:#ffffff;padding:1px 7px;border-radius:10px;font-size:11px">\${lot.situacao}</span><br>
    <span style="color:#525252">Área:</span> <b style="color:#161616">\${fmt(lot.area)} m²</b>
    \${lot.situacao==='Disponível'?'<br><span style="color:#525252">Valor:</span> <b style="color:#198038">'+fmtR(lot.valor)+'</b>':''}
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
      <div style="font-size:11px;color:#525252">Quadra \${lot.quadra}</div>
      <div style="font-size:22px;font-weight:800;color:#161616">Lote \${lot.lote}</div>
      <span class="badge \${bdg}">\${lot.situacao}</span>
    </div>
    <div class="detail-section">
      <div style="font-size:10px;color:#525252;font-weight:700;letter-spacing:.06em;margin-bottom:8px">DIMENSÕES</div>
      <div class="detail-grid">
        <div class="detail-item"><label>Frente</label><span>\${lot.frente||'—'}m</span></div>
        <div class="detail-item"><label>Fundos</label><span>\${lot.fundos||'—'}m</span></div>
        <div class="detail-item"><label>Esquerda</label><span>\${lot.esquerda||'—'}m</span></div>
        <div class="detail-item"><label>Direita</label><span>\${lot.direita||'—'}m</span></div>
      </div>
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e0e0e0;text-align:center">
        <div style="font-size:11px;color:#525252">Área Total</div>
        <div style="font-size:20px;font-weight:800;color:#0043ce">\${fmt(lot.area)} m²</div>
      </div>
    </div>
    <div class="detail-section">
      <div style="font-size:10px;color:#525252;font-weight:700;letter-spacing:.06em;margin-bottom:8px">VALOR</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:10px;color:#525252">Valor do Lote</div>
          <div style="font-size:18px;font-weight:700;color:#198038">\${fmtR(lot.valor)}</div></div>
        <div style="text-align:right"><div style="font-size:10px;color:#525252">Valor/m²</div>
          <div style="font-size:14px;font-weight:700;color:#161616">\${fmtR(lot.valorM2)}</div></div>
      </div>
    </div>
    \${(lot.confrontFrente||lot.confrontFundos)?
    \`<div class="detail-section">
      <div style="font-size:10px;color:#525252;font-weight:700;letter-spacing:.06em;margin-bottom:8px">CONFRONTAÇÕES</div>
      \${lot.confrontFrente?'<div style="display:flex;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:#525252;width:52px;flex-shrink:0">Frente</span><span style="font-size:11px;color:#161616">'+lot.confrontFrente+'</span></div>':''}
      \${lot.confrontFundos?'<div style="display:flex;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:#525252;width:52px;flex-shrink:0">Fundos</span><span style="font-size:11px;color:#161616">'+lot.confrontFundos+'</span></div>':''}
      \${lot.confrontEsq?'<div style="display:flex;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:#525252;width:52px;flex-shrink:0">Esquerda</span><span style="font-size:11px;color:#161616">'+lot.confrontEsq+'</span></div>':''}
      \${lot.confrontDir?'<div style="display:flex;gap:6px"><span style="font-size:10px;color:#525252;width:52px;flex-shrink:0">Direita</span><span style="font-size:11px;color:#161616">'+lot.confrontDir+'</span></div>':''}
      \${(lot.confrontFundos && lot.confrontFundos.includes('MUNICÍPIO')) || (lot.confrontDir && lot.confrontDir.includes('MUNICÍPIO')) ? '<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e0e0e0"><span style="display:inline-block;background:#fdefb2;color:#b28600;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">⚠ Limite Municipal</span></div>' : ''}
    </div>\`:''}
    <div class="detail-section">
      <div style="font-size:10px;color:#525252;font-weight:700;letter-spacing:.06em;margin-bottom:8px">MATRÍCULA</div>
      <div style="display:flex;justify-content:space-between">
        <div><div style="font-size:10px;color:#525252">Número</div><div style="font-weight:700;color:#161616">\${lot.matricula||'—'}</div></div>
        <div style="text-align:right"><div style="font-size:10px;color:#525252">Data</div><div style="font-weight:700;color:#161616">\${lot.dataMatricula||'—'}</div></div>
      </div>
    </div>
    \${lot.descricao?'<div class="detail-section"><div style="font-size:10px;color:#525252;font-weight:700;letter-spacing:.06em;margin-bottom:4px">DESCRIÇÃO</div><div style="font-size:12px;color:#161616">'+lot.descricao+'</div></div>':''}
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
