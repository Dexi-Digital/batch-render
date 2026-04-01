'use client';

import { useEffect } from 'react';

const SVG_W = 980, SVG_H = 900;

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

const crossStreets = [40, 95, 150, 205, 260, 315, 370, 425, 480, 535, 590, 730];
const streetNames = [
  'AV. JOÃO COSTA MOURA',
  'R. ALONSO LOPES VALADÃO',
  'R. DIMAS NEVES MARTINS',
  'R. DR. PAULO BATISTA DE OLIVEIRA',
  'R. JOAQUIM DE PAULO MARQUES',
  'R. JOSÉ QUIRINO FILHO',
  'R. JOÃO JOSÉ DA COSTA',
  'R. MANOEL PEREIRA DA SILVA',
  'R. MÁRIO DOMINGOS FERREIRA',
  'R. OVÍDIO FERREIRA BORGES',
  'R. VINICIUS DA SILVA',
  '',
];

export default function Home() {
  useEffect(() => {
    const CLR: Record<string, string> = { 'Disponível':'#198038', 'Vendida':'#da1e28', 'Bloqueada':'#b28600' };
    const CLS: Record<string, string> = { 'Disponível':'lot-disp', 'Vendida':'lot-vend', 'Bloqueada':'lot-bloq' };
    const BDGCLS: Record<string, string> = { 'Disponível':'badge-disp', 'Vendida':'badge-vend', 'Bloqueada':'badge-bloq' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allLots: any[] = [];
    let filter = 'all';
    let activeQuadra: string | null = null;
    let searchTerm = '';
    let scale = 1, tx = 0, ty = 0;
    let dragging = false, lastX = 0, lastY = 0;
    let selectedEl: Element | null = null;
    let lastTouch: { x: number; y: number } | null = null;

    function mkEl(parent: Element, tag: string, attrs: Record<string, string | number>) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
      parent.appendChild(el);
      return el;
    }

    function svgText(
      parent: Element, x: number, y: number, txt: string,
      fill: string, size: number, weight?: string, opacity?: number
    ) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      el.setAttribute('x', String(x));
      el.setAttribute('y', String(y));
      el.setAttribute('fill', fill);
      el.setAttribute('font-size', String(size || 10));
      el.setAttribute('text-anchor', 'middle');
      el.setAttribute('dominant-baseline', 'central');
      el.setAttribute('font-weight', weight || 'normal');
      el.setAttribute('pointer-events', 'none');
      if (opacity !== undefined) el.setAttribute('opacity', String(opacity));
      el.textContent = txt;
      parent.appendChild(el);
      return el;
    }

    function fmt(v: string) {
      const n = parseFloat((v || '').replace(',', '.'));
      return isNaN(n) ? (v || '—') : n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    }

    function fmtR(v: string) {
      const n = parseFloat((v || '').replace(',', '.'));
      return isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function updateStats(src?: any[]) {
      const data = src || allLots;
      const el = (id: string) => document.getElementById(id);
      el('s-total')!.textContent = String(data.length);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      el('s-disp')!.textContent = String(data.filter((l: any) => l.situacao === 'Disponível').length);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      el('s-vend')!.textContent = String(data.filter((l: any) => l.situacao === 'Vendida').length);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      el('s-bloq')!.textContent = String(data.filter((l: any) => l.situacao === 'Bloqueada').length);
    }

    function buildQuadraBtns() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qs = ([...new Set(allLots.map((l: any) => l.quadra))] as string[]).sort();
      const container = document.getElementById('quadra-btns')!;
      container.innerHTML = '';
      qs.forEach(q => {
        const b = document.createElement('button');
        b.className = 'q-btn';
        b.textContent = 'Q' + q;
        b.dataset.q = q;
        b.onclick = () => toggleQuadra(q, b);
        container.appendChild(b);
      });
    }

    function toggleQuadra(q: string, btn: HTMLButtonElement) {
      if (activeQuadra === q) {
        activeQuadra = null;
        btn.classList.remove('active');
      } else {
        activeQuadra = q;
        document.querySelectorAll('.q-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      applyFilters();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function isVisible(lot: any) {
      if (filter !== 'all' && lot.situacao !== filter) return false;
      if (activeQuadra && lot.quadra !== activeQuadra) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!('q' + lot.quadra).includes(s) && !lot.lote.includes(s) &&
            !('lote ' + lot.lote).includes(s) && !('quadra ' + lot.quadra).includes(s)) return false;
      }
      return true;
    }

    function applyFilters() {
      allLots.forEach(lot => {
        const rect = document.querySelector(`.lot[data-q="${lot.quadra}"][data-l="${lot.lote}"]`);
        const lbl = document.querySelector(`text[data-q="${lot.quadra}"][data-l="${lot.lote}"]`);
        if (!rect) return;
        const vis = isVisible(lot);
        if (vis) {
          rect.classList.remove('lot-dimmed');
          if (lbl) (lbl as HTMLElement).style.opacity = '1';
        } else {
          rect.classList.add('lot-dimmed');
          if (lbl) (lbl as HTMLElement).style.opacity = '0.1';
        }
      });
      const vis = allLots.filter(isVisible);
      updateStats(vis);
    }

    function setFilter(f: string, btn: Element) {
      filter = f;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function showTip(e: MouseEvent, lot: any) {
      const tip = document.getElementById('tip')!;
      const c = CLR[lot.situacao] || '#525252';
      tip.innerHTML = `
        <b style="color:#161616">Q${lot.quadra} · Lote ${lot.lote}</b><br>
        <span style="background:${c};color:#ffffff;padding:1px 7px;border-radius:10px;font-size:11px">${lot.situacao}</span><br>
        <span style="color:#525252">Área:</span> <b style="color:#161616">${fmt(lot.area)} m²</b>
        ${lot.situacao === 'Disponível' ? '<br><span style="color:#525252">Valor:</span> <b style="color:#198038">' + fmtR(lot.valor) + '</b>' : ''}
      `;
      tip.style.display = 'block';
      moveTip(e);
    }

    function moveTip(e: MouseEvent) {
      const tip = document.getElementById('tip')!;
      tip.style.left = (e.clientX + 14) + 'px';
      tip.style.top = (e.clientY - 10) + 'px';
    }

    function hideTip() {
      document.getElementById('tip')!.style.display = 'none';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function selectLot(lot: any, el: Element) {
      if (selectedEl) selectedEl.classList.remove('selected');
      el.classList.add('selected');
      selectedEl = el;
      showPanel(lot);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function showPanel(lot: any) {
      const c = CLR[lot.situacao] || '#64748b';
      const bdg = BDGCLS[lot.situacao] || '';
      document.getElementById('panel-body')!.innerHTML = `
        <div style="margin:0 12px 10px;background:${c}22;border:1px solid ${c}44;border-radius:10px;padding:12px">
          <div style="font-size:11px;color:#525252">Quadra ${lot.quadra}</div>
          <div style="font-size:22px;font-weight:800;color:#161616">Lote ${lot.lote}</div>
          <span class="badge ${bdg}">${lot.situacao}</span>
        </div>
        <div class="detail-section">
          <div style="font-size:10px;color:#525252;font-weight:700;letter-spacing:.06em;margin-bottom:8px">DIMENSÕES</div>
          <div class="detail-grid">
            <div class="detail-item"><label>Frente</label><span>${lot.frente || '—'}m</span></div>
            <div class="detail-item"><label>Fundos</label><span>${lot.fundos || '—'}m</span></div>
            <div class="detail-item"><label>Esquerda</label><span>${lot.esquerda || '—'}m</span></div>
            <div class="detail-item"><label>Direita</label><span>${lot.direita || '—'}m</span></div>
          </div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e0e0e0;text-align:center">
            <div style="font-size:11px;color:#525252">Área Total</div>
            <div style="font-size:20px;font-weight:800;color:#0043ce">${fmt(lot.area)} m²</div>
          </div>
        </div>
        <div class="detail-section">
          <div style="font-size:10px;color:#525252;font-weight:700;letter-spacing:.06em;margin-bottom:8px">VALOR</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:10px;color:#525252">Valor do Lote</div>
              <div style="font-size:18px;font-weight:700;color:#198038">${fmtR(lot.valor)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:10px;color:#525252">Valor/m²</div>
              <div style="font-size:14px;font-weight:700;color:#161616">${fmtR(lot.valorM2)}</div>
            </div>
          </div>
        </div>
        ${(lot.confrontFrente || lot.confrontFundos) ? `
        <div class="detail-section">
          <div style="font-size:10px;color:#525252;font-weight:700;letter-spacing:.06em;margin-bottom:8px">CONFRONTAÇÕES</div>
          ${lot.confrontFrente ? '<div style="display:flex;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:#525252;width:52px;flex-shrink:0">Frente</span><span style="font-size:11px;color:#161616">' + lot.confrontFrente + '</span></div>' : ''}
          ${lot.confrontFundos ? '<div style="display:flex;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:#525252;width:52px;flex-shrink:0">Fundos</span><span style="font-size:11px;color:#161616">' + lot.confrontFundos + '</span></div>' : ''}
          ${lot.confrontEsq ? '<div style="display:flex;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:#525252;width:52px;flex-shrink:0">Esquerda</span><span style="font-size:11px;color:#161616">' + lot.confrontEsq + '</span></div>' : ''}
          ${lot.confrontDir ? '<div style="display:flex;gap:6px"><span style="font-size:10px;color:#525252;width:52px;flex-shrink:0">Direita</span><span style="font-size:11px;color:#161616">' + lot.confrontDir + '</span></div>' : ''}
          ${(lot.confrontFundos && lot.confrontFundos.includes('MUNICÍPIO')) || (lot.confrontDir && lot.confrontDir.includes('MUNICÍPIO'))
            ? '<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e0e0e0"><span style="display:inline-block;background:#fdefb2;color:#b28600;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">⚠ Limite Municipal</span></div>'
            : ''}
        </div>` : ''}
        <div class="detail-section">
          <div style="font-size:10px;color:#525252;font-weight:700;letter-spacing:.06em;margin-bottom:8px">MATRÍCULA</div>
          <div style="display:flex;justify-content:space-between">
            <div>
              <div style="font-size:10px;color:#525252">Número</div>
              <div style="font-weight:700;color:#161616">${lot.matricula || '—'}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:10px;color:#525252">Data</div>
              <div style="font-weight:700;color:#161616">${lot.dataMatricula || '—'}</div>
            </div>
          </div>
        </div>
        ${lot.descricao ? `<div class="detail-section"><div style="font-size:10px;color:#525252;font-weight:700;letter-spacing:.06em;margin-bottom:4px">DESCRIÇÃO</div><div style="font-size:12px;color:#161616">${lot.descricao}</div></div>` : ''}
      `;
      document.getElementById('panel')!.classList.add('open');
    }

    function closePanel() {
      document.getElementById('panel')!.classList.remove('open');
      if (selectedEl) { selectedEl.classList.remove('selected'); selectedEl = null; }
    }

    function applyTransform() {
      const scene = document.getElementById('scene')!;
      scene.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
      document.getElementById('zoom-lbl')!.textContent = Math.round(scale * 100) + '%';
    }

    function zoom(d: number) {
      const vp = document.getElementById('viewport')!.getBoundingClientRect();
      const cx = vp.width / 2, cy = vp.height / 2;
      const ns = Math.max(0.2, Math.min(4, scale + d));
      tx = cx - (cx - tx) * (ns / scale);
      ty = cy - (cy - ty) * (ns / scale);
      scale = ns;
      applyTransform();
    }

    function resetView() { scale = 1; tx = 0; ty = 0; applyTransform(); }

    function fitView() {
      const vp = document.getElementById('viewport')!.getBoundingClientRect();
      const scX = vp.width / SVG_W;
      const scY = vp.height / SVG_H;
      scale = Math.min(scX, scY) * 0.92;
      tx = (vp.width - SVG_W * scale) / 2;
      ty = (vp.height - SVG_H * scale) / 2;
      applyTransform();
    }

    function exportSVG() {
      const svg = document.getElementById('map-svg')!;
      const blob = new Blob(
        ['<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg)],
        { type: 'image/svg+xml;charset=utf-8' }
      );
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'jardim-acacias-II.svg' });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }

    function exportPNG() {
      const svg = document.getElementById('map-svg')!;
      const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = SVG_W * 2; c.height = SVG_H * 2;
        const ctx = c.getContext('2d')!; ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        c.toBlob(pb => {
          const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(pb!), download: 'jardim-acacias-II.png' });
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }, 'image/png');
      };
      img.src = url;
    }

    function drawRoad(svg: Element, x: number, y: number, w: number, h: number, central = false) {
      if (central) {
        mkEl(svg, 'rect', { x, y, width: w, height: h, fill: '#a8a8a8' });
        for (let dy = y + 10; dy < y + h - 10; dy += 18) {
          mkEl(svg, 'rect', { x: x + w / 2 - 1.5, y: dy, width: 3, height: 9, fill: '#ffffff', rx: '1' });
        }
      } else {
        mkEl(svg, 'rect', { x, y, width: w, height: h, fill: '#c6c6c6' });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function drawLot(svg: Element, lot: any, x: number, y: number, w: number, h: number) {
      const pad = 1;
      const rx = x + pad, ry = y + pad, rw = w - pad * 2, rh = h - pad * 2;
      if (rw < 2 || rh < 2) return;

      const visible = isVisible(lot);
      const cls = CLS[lot.situacao] || 'lot-bloq';
      const isMunicipal = (lot.confrontFundos && lot.confrontFundos.includes('MUNICÍPIO')) ||
                          (lot.confrontDir && lot.confrontDir.includes('MUNICÍPIO'));

      const rect = mkEl(svg, 'rect', {
        x: rx, y: ry, width: rw, height: rh, rx: '2',
        class: 'lot ' + cls + (visible ? '' : ' lot-dimmed'),
        'data-q': lot.quadra, 'data-l': lot.lote,
      });

      if (isMunicipal) rect.setAttribute('stroke-dasharray', '3,2');

      rect.addEventListener('mouseenter', e => showTip(e as MouseEvent, lot));
      rect.addEventListener('mousemove', e => moveTip(e as MouseEvent));
      rect.addEventListener('mouseleave', hideTip);
      rect.addEventListener('click', e => { e.stopPropagation(); selectLot(lot, rect); });

      if (rw > 10 && rh > 12) {
        const lbl = mkEl(svg, 'text', {
          x: rx + rw / 2, y: ry + rh / 2 - (rh > 18 ? 3 : 0),
          class: 'lot-label',
          'data-q': lot.quadra, 'data-l': lot.lote,
          'font-size': (rw > 18 && rh > 18) ? '8' : '6',
          'font-weight': 'bold',
        });
        lbl.textContent = parseInt(lot.lote).toString();
        if (!visible) (lbl as SVGElement).style.opacity = '0.15';

        if (rw > 18 && rh > 18 && lot.area) {
          const areaLbl = mkEl(svg, 'text', {
            x: rx + rw / 2, y: ry + rh / 2 + 5,
            class: 'lot-label',
            'data-q': lot.quadra, 'data-l': lot.lote,
            'font-size': '6',
          });
          areaLbl.textContent = lot.area + ' m²';
          if (!visible) (areaLbl as SVGElement).style.opacity = '0.15';
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function drawBlock(svg: Element, blk: typeof BLOCKS[0], lots: any[]) {
      const { x1, y1, x2, y2, q } = blk;
      const w = x2 - x1, h = y2 - y1;
      const n = lots.length;

      mkEl(svg, 'rect', { x: x1, y: y1, width: w, height: h, fill: '#ffffff', stroke: '#e0e0e0', 'stroke-width': '1', rx: '2' });
      svgText(svg, x1 + w / 2, y1 + h / 2, 'Q' + q, '#0043ce', 10, 'bold', 0.15);

      const isWide = w >= h;
      if (isWide) {
        const cols = Math.ceil(n / 2);
        const lotW = w / cols;
        const lotH = h / 2;
        lots.forEach((lot, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          drawLot(svg, lot, x1 + col * lotW, y1 + row * lotH, lotW, lotH);
        });
      } else {
        const rows = Math.ceil(n / 2);
        const lotW = w / 2;
        const lotH = h / rows;
        lots.forEach((lot, i) => {
          const col = Math.floor(i / rows);
          const row = i % rows;
          drawLot(svg, lot, x1 + col * lotW, y1 + row * lotH, lotW, lotH);
        });
      }
    }

    function buildMap() {
      const svg = document.getElementById('map-svg')!;
      svg.setAttribute('width', String(SVG_W));
      svg.setAttribute('height', String(SVG_H));
      svg.innerHTML = '';

      mkEl(svg, 'rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: '#ffffff' });

      const outerPath = [
        [60,40],[890,40],[890,220],[870,330],[850,480],[770,605],[670,715],
        [530,760],[470,760],[330,715],[265,605],[185,480],[120,330],[80,215],[60,40]
      ];
      const outerD = 'M ' + outerPath.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L ') + ' Z';
      mkEl(svg, 'path', { d: outerD, fill: '#f4f4f4', stroke: '#c6c6c6', 'stroke-width': '1.5' });

      drawRoad(svg, 248, 40, 30, 730, false);
      drawRoad(svg, 470, 40, 60, 730, true);
      drawRoad(svg, 710, 40, 30, 730, false);

      crossStreets.forEach((y, idx) => {
        mkEl(svg, 'line', { x1: 60, y1: y, x2: 890, y2: y, stroke: '#c6c6c6', 'stroke-width': '1' });
        if (streetNames[idx] && streetNames[idx].length > 0) {
          svgText(svg, 100, y - 6, streetNames[idx], '#525252', 7);
        }
      });

      mkEl(svg, 'circle', { cx: 500, cy: 760, r: 6, fill: '#198038', stroke: '#ffffff', 'stroke-width': '1' });
      svgText(svg, 500, 780, 'ENTRADA', '#198038', 7);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byQuadra: Record<string, any[]> = {};
      allLots.forEach(l => {
        if (!byQuadra[l.quadra]) byQuadra[l.quadra] = [];
        byQuadra[l.quadra].push(l);
      });

      BLOCKS.forEach(blk => {
        const lots = byQuadra[blk.q] || [];
        if (lots.length === 0) return;
        drawBlock(svg, blk, lots);
      });

      const q19 = byQuadra['019'] || [];
      if (q19.length > 0) drawLot(svg, q19[0], 470, 715, 60, 45);
    }

    async function init() {
      const data = await fetch('/lots_data.json').then(r => r.json());
      allLots = data;
      buildQuadraBtns();
      updateStats();
      buildMap();
      fitView();
    }

    // ── Button handlers ──
    const btnFilterAll  = document.getElementById('btn-filter-all')!;
    const btnFilterDisp = document.getElementById('btn-filter-disp')!;
    const btnFilterVend = document.getElementById('btn-filter-vend')!;
    const btnFilterBloq = document.getElementById('btn-filter-bloq')!;
    const btnZoomOut    = document.getElementById('btn-zoom-out')!;
    const btnZoomIn     = document.getElementById('btn-zoom-in')!;
    const btnReset      = document.getElementById('btn-reset')!;
    const btnFit        = document.getElementById('btn-fit')!;
    const btnExportSvg  = document.getElementById('btn-export-svg')!;
    const btnExportPng  = document.getElementById('btn-export-png')!;
    const btnClosePanel = document.getElementById('btn-close-panel')!;
    const searchInput   = document.getElementById('search')! as HTMLInputElement;
    const scene         = document.getElementById('scene')!;
    const viewport      = document.getElementById('viewport')!;

    btnFilterAll.onclick  = () => setFilter('all', btnFilterAll);
    btnFilterDisp.onclick = () => setFilter('Disponível', btnFilterDisp);
    btnFilterVend.onclick = () => setFilter('Vendida', btnFilterVend);
    btnFilterBloq.onclick = () => setFilter('Bloqueada', btnFilterBloq);
    btnZoomOut.onclick    = () => zoom(-0.15);
    btnZoomIn.onclick     = () => zoom(0.15);
    btnReset.onclick      = () => resetView();
    btnFit.onclick        = () => fitView();
    btnExportSvg.onclick  = () => exportSVG();
    btnExportPng.onclick  = () => exportPNG();
    btnClosePanel.onclick = () => closePanel();

    // ── Event listeners ──
    const handleSearch = (e: Event) => {
      searchTerm = (e.target as HTMLInputElement).value.trim();
      applyFilters();
    };
    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as Element).classList.contains('lot')) return;
      dragging = true; lastX = e.clientX; lastY = e.clientY; e.preventDefault();
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      tx += e.clientX - lastX; ty += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      applyTransform();
    };
    const handleMouseUp = () => { dragging = false; };
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = e.deltaY < 0 ? 0.1 : -0.1;
      const vp = (e.currentTarget as Element).getBoundingClientRect();
      const mx = e.clientX - vp.left;
      const my = e.clientY - vp.top;
      const ns = Math.max(0.2, Math.min(4, scale + d));
      tx = mx - (mx - tx) * (ns / scale);
      ty = my - (my - ty) * (ns / scale);
      scale = ns;
      applyTransform();
    };
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && lastTouch) {
        tx += e.touches[0].clientX - lastTouch.x;
        ty += e.touches[0].clientY - lastTouch.y;
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        applyTransform(); e.preventDefault();
      }
    };
    const handleViewportClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.id === 'viewport' || t.id === 'scene' || t.id === 'map-svg') closePanel();
    };

    searchInput.addEventListener('input', handleSearch);
    scene.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    viewport.addEventListener('wheel', handleWheel as EventListener, { passive: false });
    scene.addEventListener('touchstart', handleTouchStart as EventListener);
    scene.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false } as AddEventListenerOptions);
    viewport.addEventListener('click', handleViewportClick);

    init();

    return () => {
      searchInput.removeEventListener('input', handleSearch);
      scene.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      viewport.removeEventListener('wheel', handleWheel as EventListener);
      scene.removeEventListener('touchstart', handleTouchStart as EventListener);
      scene.removeEventListener('touchmove', handleTouchMove as EventListener);
      viewport.removeEventListener('click', handleViewportClick);
    };
  }, []);

  return (
    <>
      <div id="app">
        {/* ═══ HEADER ═══ */}
        <header>
          <div className="logo"><i className="fas fa-map-marked-alt"></i></div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Jardim das Acácias II</div>
            <div style={{ fontSize: '11px', color: '#a8a8a8' }}>Jardim das Acácias II</div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <div className="stat-card">
              <div className="stat-val" id="s-total">—</div>
              <div className="stat-lbl">Total</div>
            </div>
            <div className="stat-card">
              <div className="stat-val" id="s-disp" style={{ color: '#198038' }}>—</div>
              <div className="stat-lbl">Disponíveis</div>
            </div>
            <div className="stat-card">
              <div className="stat-val" id="s-vend" style={{ color: '#da1e28' }}>—</div>
              <div className="stat-lbl">Vendidas</div>
            </div>
            <div className="stat-card">
              <div className="stat-val" id="s-bloq" style={{ color: '#b28600' }}>—</div>
              <div className="stat-lbl">Bloqueadas</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="text" id="search" placeholder="🔍 Buscar lote..." style={{ width: '140px' }} />
            <button className="exp-btn" id="btn-export-svg"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff' }}>
              <i className="fas fa-download"></i> SVG
            </button>
            <button className="exp-btn" id="btn-export-png"
              style={{ background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff' }}>
              <i className="fas fa-image"></i> PNG
            </button>
          </div>
        </header>

        {/* ═══ TOOLBAR ═══ */}
        <div className="toolbar">
          <span style={{ fontSize: '11px', color: '#525252' }}>Status:</span>
          <button className="filter-btn f-all active" id="btn-filter-all">Todos</button>
          <button className="filter-btn f-disp" id="btn-filter-disp">
            <span className="leg-dot" style={{ background: '#198038', marginRight: '4px' }}></span>Disponíveis
          </button>
          <button className="filter-btn f-vend" id="btn-filter-vend">
            <span className="leg-dot" style={{ background: '#da1e28', marginRight: '4px' }}></span>Vendidas
          </button>
          <button className="filter-btn f-bloq" id="btn-filter-bloq">
            <span className="leg-dot" style={{ background: '#b28600', marginRight: '4px' }}></span>Bloqueadas
          </button>

          <div style={{ width: '1px', background: '#e0e0e0', height: '20px', margin: '0 4px' }}></div>
          <span style={{ fontSize: '11px', color: '#525252' }}>Quadra:</span>
          <div id="quadra-btns" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}></div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button className="ctrl-btn" id="btn-zoom-out">−</button>
            <span id="zoom-lbl" style={{ fontSize: '11px', color: '#525252', width: '38px', textAlign: 'center' }}>100%</span>
            <button className="ctrl-btn" id="btn-zoom-in">+</button>
            <button className="ctrl-btn" id="btn-reset" title="Reset" style={{ fontSize: '11px' }}>⟳</button>
            <button className="ctrl-btn" id="btn-fit" title="Encaixar" style={{ fontSize: '11px' }}>⊡</button>
          </div>
        </div>

        {/* ═══ MAP VIEWPORT ═══ */}
        <div id="viewport">
          <div id="scene">
            <svg id="map-svg" xmlns="http://www.w3.org/2000/svg"></svg>
          </div>

          {/* Legenda */}
          <div style={{
            position: 'absolute', top: '12px', left: '12px', zIndex: 5,
            background: 'rgba(255,255,255,0.95)', border: '1px solid #e0e0e0',
            borderRadius: '8px', padding: '10px 14px', pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,.08)',
          }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#525252', letterSpacing: '.06em', marginBottom: '8px' }}>LEGENDA</div>
            {[
              { color: '#a7f0ba', label: 'Disponível' },
              { color: '#ffd7d9', label: 'Vendida' },
              { color: '#fdefb2', label: 'Bloqueada' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, display: 'inline-block', flexShrink: 0 }}></span>
                <span style={{ fontSize: '11px', color: '#161616' }}>{label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', border: '1px dashed #b28600', display: 'inline-block', flexShrink: 0 }}></span>
              <span style={{ fontSize: '11px', color: '#161616' }}>Limite Municipal</span>
            </div>
          </div>

          {/* Detail Panel */}
          <div id="panel">
            <div className="panel-close">
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Detalhes do Lote</span>
              <button id="btn-close-panel"
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', lineHeight: '1' }}>
                ×
              </button>
            </div>
            <div id="panel-body" style={{ padding: '12px 0 20px' }}></div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <div id="tip"></div>
    </>
  );
}
