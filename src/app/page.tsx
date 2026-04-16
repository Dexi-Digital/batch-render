'use client';

import { useEffect } from 'react';

const SVG_W = 980, SVG_H = 900;

const BLOCKS = [
  // Banco esquerdo (Q002–Q008, sul→norte) | Banco direito (Q009–Q015)
  // Fileira 7 (norte, mais larga)
  { q:'008', x1:55,  y1:80,  x2:450, y2:170 },
  { q:'015', x1:530, y1:80,  x2:925, y2:170 },
  // Fileira 6
  { q:'007', x1:90,  y1:185, x2:450, y2:275 },
  { q:'014', x1:530, y1:185, x2:890, y2:275 },
  // Fileira 5
  { q:'006', x1:125, y1:290, x2:450, y2:375 },
  { q:'013', x1:530, y1:290, x2:855, y2:375 },
  // Fileira 4
  { q:'005', x1:160, y1:390, x2:450, y2:475 },
  { q:'012', x1:530, y1:390, x2:820, y2:475 },
  // Fileira 3
  { q:'004', x1:190, y1:490, x2:450, y2:575 },
  { q:'011', x1:530, y1:490, x2:790, y2:575 },
  // Fileira 2
  { q:'003', x1:220, y1:590, x2:450, y2:675 },
  { q:'010', x1:530, y1:590, x2:760, y2:675 },
  // Fileira 1 (sul, mais estreita)
  { q:'002', x1:255, y1:690, x2:450, y2:775 },
  { q:'009', x1:530, y1:690, x2:725, y2:775 },
  // Seção inferior (perto da entrada)
  { q:'017', x1:305, y1:790, x2:450, y2:840 },
  { q:'018', x1:530, y1:790, x2:700, y2:840 },
  // Quadras vazias (placeholder)
  { q:'016', x1:530, y1:40,  x2:700, y2:75 },
  { q:'020', x1:55,  y1:40,  x2:220, y2:75 },
  { q:'021', x1:230, y1:40,  x2:450, y2:75 },
  // Entrada
  { q:'001', x1:455, y1:850, x2:525, y2:880 },
];

const crossStreets = [
  { y: 780, name: 'R. JOAQUIM DE PAULO MARQUES' },
  { y: 680, name: 'R. JOSÉ QUIRINO FILHO' },
  { y: 580, name: 'R. OVÍDIO FERREIRA BORGES' },
  { y: 480, name: 'R. MÁRIO DOMINGOS FERREIRA' },
  { y: 380, name: 'R. ALONSO LOPES VALADÃO' },
  { y: 280, name: 'R. DIMAS NEVES MARTINS' },
  { y: 180, name: 'R. VINÍCIUS NEVES DA SILVA' },
];

export default function Home() {
  useEffect(() => {
    // Bloqueada é tratada visualmente como Vendida
    const CLR: Record<string, string> = { 'Disponível':'#198038', 'Vendida':'#da1e28', 'Bloqueada':'#da1e28' };
    const CLS: Record<string, string> = { 'Disponível':'lot-disp', 'Vendida':'lot-vend', 'Bloqueada':'lot-vend' };
    const BDGCLS: Record<string, string> = { 'Disponível':'badge-disp', 'Vendida':'badge-vend', 'Bloqueada':'badge-vend' };
    function displaySituacao(s: string) { return s === 'Bloqueada' ? 'Vendida' : s; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allLots: any[] = [];
    let filter = 'all';
    let activeQuadra: string | null = null;
    let searchTerm = '';
    let scale = 1, tx = 0, ty = 0;
    let dragging = false, lastX = 0, lastY = 0;
    let selectedEl: Element | null = null;
    let lastTouch: { x: number; y: number } | null = null;
    let panelOpen = false;

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
      el('s-vend')!.textContent = String(data.filter((l: any) => l.situacao === 'Vendida' || l.situacao === 'Bloqueada').length);
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
      if (filter !== 'all') {
        if (filter === 'Vendida') {
          if (lot.situacao !== 'Vendida' && lot.situacao !== 'Bloqueada') return false;
        } else if (lot.situacao !== filter) return false;
      }
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
        <span style="background:${c};color:#ffffff;padding:1px 7px;border-radius:10px;font-size:11px">${displaySituacao(lot.situacao)}</span><br>
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

      // Zoom no lote clicado e depois abre o painel
      const rect = (el as SVGElement).getBBox();
      const vp = document.getElementById('viewport')!.getBoundingClientRect();
      const panelW = 300;
      const visibleW = vp.width - panelW;
      const targetScale = Math.min(visibleW / (rect.width * 6), vp.height / (rect.height * 6), 3);
      const ns = Math.max(1.5, targetScale);
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      const newTx = visibleW / 2 - cx * ns;
      const newTy = vp.height / 2 - cy * ns;

      // Anima o zoom com transition
      const scene = document.getElementById('scene')!;
      scene.style.transition = 'transform 0.4s ease';
      scale = ns;
      tx = newTx;
      ty = newTy;
      applyTransform();

      setTimeout(() => {
        scene.style.transition = '';
        showPanel(lot);
      }, 420);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function showPanel(lot: any) {
      const c = CLR[lot.situacao] || '#64748b';
      const bdg = BDGCLS[lot.situacao] || '';
      document.getElementById('panel-body')!.innerHTML = `
        <div style="margin:0 12px 10px;background:${c}22;border:1px solid ${c}44;border-radius:10px;padding:12px">
          <div style="font-size:11px;color:#525252">Quadra ${lot.quadra}</div>
          <div style="font-size:22px;font-weight:800;color:#161616">Lote ${lot.lote}</div>
          <span class="badge ${bdg}">${displaySituacao(lot.situacao)}</span>
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
      panelOpen = true;
    }

    function closePanel() {
      document.getElementById('panel')!.classList.remove('open');
      if (selectedEl) { selectedEl.classList.remove('selected'); selectedEl = null; }
      panelOpen = false;
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
      const pad = 0.5;
      const rx = x + pad, ry = y + pad, rw = w - pad * 2, rh = h - pad * 2;
      if (rw < 1 || rh < 1) return;

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

      if (rw > 4 && rh > 4) {
        const fontSize = rw > 18 && rh > 18 ? 8 : rw > 10 && rh > 10 ? 6 : 4;
        const lbl = mkEl(svg, 'text', {
          x: rx + rw / 2, y: ry + rh / 2 - (rh > 18 ? 3 : 0),
          class: 'lot-label',
          'data-q': lot.quadra, 'data-l': lot.lote,
          'font-size': String(fontSize),
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

      // Faixa do header para o label da quadra
      const headerH = 12;
      mkEl(svg, 'rect', { x: x1, y: y1, width: w, height: h, fill: '#ffffff', 'fill-opacity': '0.5', stroke: '#e0e0e0', 'stroke-width': '1', rx: '2' });
      mkEl(svg, 'rect', { x: x1, y: y1, width: w, height: headerH, fill: '#0043ce', 'fill-opacity': '0.9', rx: '2' });
      svgText(svg, x1 + w / 2, y1 + headerH / 2, 'Q' + q, '#ffffff', 8, 'bold');

      // Lotes começam abaixo do header
      const lotY = y1 + headerH;
      const lotAreaH = h - headerH;

      const isWide = w >= lotAreaH;
      if (isWide) {
        const cols = Math.ceil(n / 2);
        const lotW = w / cols;
        const lotH = lotAreaH / 2;
        lots.forEach((lot, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          drawLot(svg, lot, x1 + col * lotW, lotY + row * lotH, lotW, lotH);
        });
      } else {
        const rows = Math.ceil(n / 2);
        const lotW = w / 2;
        const lotH = lotAreaH / rows;
        lots.forEach((lot, i) => {
          const col = Math.floor(i / rows);
          const row = i % rows;
          drawLot(svg, lot, x1 + col * lotW, lotY + row * lotH, lotW, lotH);
        });
      }
    }

    function buildMap() {
      const svg = document.getElementById('map-svg')!;
      svg.setAttribute('width', String(SVG_W));
      svg.setAttribute('height', String(SVG_H));
      svg.innerHTML = '';

      mkEl(svg, 'rect', { x: 0, y: 0, width: SVG_W, height: SVG_H, fill: '#ffffff' });

      // Contorno trapezoidal (mais largo no topo, estreito embaixo, entrada no centro)
      const outerPath = [
        [255,785],[220,680],[190,580],[160,480],[125,380],[90,280],[55,170],[40,70],[40,30],
        [940,30],[940,70],[925,170],[890,280],[855,380],[820,480],[790,580],[760,680],[725,785],
        [530,785],[530,885],[450,885],[450,785],[255,785]
      ];
      const outerD = 'M ' + outerPath.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L ') + ' Z';
      mkEl(svg, 'path', { d: outerD, fill: '#f4f4f4', stroke: '#c6c6c6', 'stroke-width': '1.5' });

      // Background removido — imagem do espelho não alinhava bem com os lotes

      // Avenida central vertical
      drawRoad(svg, 455, 30, 70, 855, true);

      // Ruas transversais (largura ajustada ao trapézio)
      crossStreets.forEach(({ y, name }) => {
        const t = (y - 30) / (785 - 30);
        const leftX = 40 + (255 - 40) * t;
        const rightX = 940 - (940 - 725) * t;
        mkEl(svg, 'line', { x1: leftX, y1: y, x2: 455, y2: y, stroke: '#c6c6c6', 'stroke-width': '1' });
        mkEl(svg, 'line', { x1: 525, y1: y, x2: rightX, y2: y, stroke: '#c6c6c6', 'stroke-width': '1' });
        // Nome da rua nos dois lados da avenida com fundo branco (centralizado no gap)
        const nameW = name.length * 4.2;
        [[leftX, 455], [525, rightX]].forEach(([xa, xb]) => {
          const cx = (xa + xb) / 2;
          mkEl(svg, 'rect', { x: cx - nameW / 2 - 4, y: y - 7, width: nameW + 8, height: 14, fill: '#ffffff', rx: 3 });
          svgText(svg, cx, y, name, '#525252', 7, '600');
        });
      });

      // Label da avenida central (vertical)
      const avLabel = svgText(svg, 0, 0, 'AV. JOÃO COSTA MOURA', '#161616', 8, 'bold');
      avLabel.setAttribute('transform', 'translate(490, 500) rotate(-90)');

      // Labels das ruas periféricas (rotacionadas)
      const leftLabel = svgText(svg, 0, 0, 'R. MANOEL PEREIRA DA SILVA', '#161616', 8, 'bold');
      leftLabel.setAttribute('transform', 'translate(35, 450) rotate(-80)');
      const rightLabel = svgText(svg, 0, 0, 'R. DR. PAULO BATISTA DE OLIVEIRA', '#161616', 8, 'bold');
      rightLabel.setAttribute('transform', 'translate(945, 450) rotate(80)');

      // Entrada
      mkEl(svg, 'circle', { cx: 490, cy: 895, r: 6, fill: '#198038', stroke: '#ffffff', 'stroke-width': '1' });
      svgText(svg, 490, 870, 'ENTRADA', '#198038', 7);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byQuadra: Record<string, any[]> = {};
      allLots.forEach(l => {
        if (!byQuadra[l.quadra]) byQuadra[l.quadra] = [];
        byQuadra[l.quadra].push(l);
      });

      BLOCKS.forEach(blk => {
        const lots = byQuadra[blk.q] || [];
        if (lots.length === 0) {
          // Bloco vazio — desenha contorno tracejado com label
          const { x1, y1, x2, y2, q } = blk;
          const w = x2 - x1, h = y2 - y1;
          mkEl(svg, 'rect', { x: x1, y: y1, width: w, height: h, fill: '#f4f4f4', stroke: '#c6c6c6', 'stroke-width': '1', rx: '2', 'stroke-dasharray': '4,4' });
          svgText(svg, x1 + w / 2, y1 + h / 2, 'Q' + q, '#a8a8a8', 10, 'bold');
          return;
        }
        drawBlock(svg, blk, lots);
      });

      // Q019 — lote único na área da entrada
      const q19 = byQuadra['019'] || [];
      if (q19.length > 0) drawLot(svg, q19[0], 460, 845, 60, 30);

      // (badges das quadras agora são desenhados dentro do drawBlock como header)
    }

    async function init() {
      const data = await fetch('/lots_data.json?t=' + Date.now()).then(r => r.json());
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
      if (panelOpen) return;
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
      if (panelOpen) return;
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
      if (panelOpen) return;
      if (e.touches.length === 1) lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (panelOpen) return;
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
