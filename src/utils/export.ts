import { jsPDF, GState } from 'jspdf';
import { CanvasElement, Page, ProjectState, RadialGradientSpec } from '../types';
import { DEFS, escapeHtml, getBoundingBox, isInside } from './helpers';
import { pointsToLinearSvgPath, pointsToSmoothSvgPath } from './pathSmoothing';

export function wrapText(str: string, maxCharsPerLine: number): string[] {
  return str.split('\n').flatMap((line) => {
    const lines: string[] = [];
    let current = '';
    for (const word of line.split(' ')) {
      if ((current + ' ' + word).trim().length > maxCharsPerLine && current) {
        lines.push(current);
        current = word;
      } else {
        current = (current + ' ' + word).trim();
      }
    }
    lines.push(current);
    return lines;
  });
}

function buildRadialGradientDef(id: string, spec: RadialGradientSpec): string {
  const cx = spec.cx ?? 50;
  const cy = spec.cy ?? 50;
  const r = spec.r ?? 65;
  const stops = (spec.stops || [])
    .map(
      (s) =>
        `<stop offset="${s.offset}%" stop-color="${s.color}"${
          s.opacity !== undefined ? ` stop-opacity="${s.opacity}"` : ''
        } />`
    )
    .join('');
  return `<radialGradient id="${id}" cx="${cx}%" cy="${cy}%" r="${r}%">${stops}</radialGradient>`;
}

export function elementToSvg(item: CanvasElement, isExport = false): string {
  const flipParts: string[] = [];
  if (item.flipX || item.flipY) {
    flipParts.push(
      `translate(${item.w / 2} ${item.h / 2}) scale(${item.flipX ? -1 : 1} ${
        item.flipY ? -1 : 1
      }) translate(${-item.w / 2} ${-item.h / 2})`
    );
  }
  const trans =
    `translate(${item.x} ${item.y})` +
    (item.rot ? ` rotate(${item.rot} ${item.w / 2} ${item.h / 2})` : '') +
    (flipParts.length ? ` ${flipParts.join(' ')}` : '');

  const opacity = item.op !== undefined ? item.op : 1;
  const blendStyle =
    item.blendMode && item.blendMode !== 'normal'
      ? ` style="mix-blend-mode: ${item.blendMode}"`
      : '';

  const shadowEnabled =
    item.sh === true ||
    (item.sh !== false && Boolean(item.shadowStyle) && item.shadowStyle !== 'none');

  let shadowFilterDef = '';
  let shadowFilterAttr = '';
  if (shadowEnabled) {
    const rawIntensity =
      typeof item.shadowIntensity === 'number' && item.shadowIntensity > 0
        ? item.shadowIntensity
        : item.shadowStyle === 'subtle'
        ? 6
        : item.shadowStyle === 'heavy'
        ? 26
        : 14;
    const clamped = Math.max(1, Math.min(40, rawIntensity));
    const dy = Math.max(1, Math.round(clamped * 0.45 * 10) / 10);
    const stdDev = Math.max(1, Math.round(clamped * 0.78 * 10) / 10);
    const floodOp = Math.min(0.45, Math.round((0.08 + clamped * 0.0075) * 1000) / 1000);
    const shId = `dsh_${item.id}`;
    shadowFilterDef = `<filter id="${shId}" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${stdDev}" flood-color="#0f172a" flood-opacity="${floodOp}" /></filter>`;
    shadowFilterAttr = ` filter="url(#${shId})"`;
  }

  let body = '';
  let extraDefs = '';
  let fill = 'none';

  if (item.radialGradient) {
    if (typeof item.radialGradient === 'string') {
      fill = item.radialGradient.startsWith('url(')
        ? item.radialGradient
        : `url(#${item.radialGradient})`;
    } else if (item.radialGradient.stops?.length) {
      const gradId = `rg_${item.id}`;
      extraDefs += buildRadialGradientDef(gradId, item.radialGradient);
      fill = `url(#${gradId})`;
    }
  } else if ('gradientFill' in item && item.gradientFill) {
    fill = item.gradientFill;
  } else if ('fill' in item && item.fill) {
    fill = item.fill;
  }

  const stroke = 'stroke' in item && item.stroke ? item.stroke : 'none';
  const sw = 'sw' in item && item.sw !== undefined ? item.sw : 0;

  let dash = '';
  if ('strokeStyle' in item) {
    if (item.strokeStyle === 'dashed') dash = ' stroke-dasharray="6,4"';
    else if (item.strokeStyle === 'dotted') dash = ' stroke-dasharray="2,3"';
    else if (item.strokeStyle === 'none') dash = ' stroke="none"';
  }

  const commonStyle = `fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}`;

  switch (item.t) {
    case 'artboard':
    case 'rect': {
      const r = 'r' in item && item.r ? Math.min(item.r, Math.min(item.w, item.h) / 2) : 0;
      body = `${
        extraDefs ? `<defs>${extraDefs}</defs>` : ''
      }<rect width="${item.w}" height="${item.h}" rx="${r}" ${commonStyle} />`;
      break;
    }
    case 'oval': {
      body = `${
        extraDefs ? `<defs>${extraDefs}</defs>` : ''
      }<ellipse cx="${item.w / 2}" cy="${item.h / 2}" rx="${item.w / 2}" ry="${
        item.h / 2
      }" ${commonStyle} />`;
      break;
    }
    case 'note': {
      const charsPerLine = Math.max(4, Math.floor((item.w - 24) / (item.fs * 0.55)));
      const wrapped = wrapText(item.text, charsPerLine);
      const tspans = wrapped
        .map(
          (line, idx) =>
            `<tspan x="0" y="${((idx + 1) * 1.25 - 0.2) * item.fs}">${escapeHtml(line)}</tspan>`
        )
        .join('');
      body = `
        <rect width="${item.w}" height="${item.h}" rx="8" fill="${item.fill}" stroke="#e0d592" stroke-width="1" />
        <text transform="translate(12, 20)" font-size="${item.fs}" font-family="system-ui, sans-serif" fill="${item.tc}">
          ${tspans}
        </text>
      `;
      break;
    }
    case 'text': {
      const lines = item.text.split('\n');
      const align = item.align || 'left';
      const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
      const anchorX = align === 'center' ? item.w / 2 : align === 'right' ? item.w : 0;
      const tspans = lines
        .map(
          (line, idx) =>
            `<tspan x="${anchorX}" y="${((idx + 1) * 1.25 - 0.2) * item.fs}">${escapeHtml(
              line
            )}</tspan>`
        )
        .join('');
      const fontWeight = item.fw ? String(item.fw) : item.b ? '700' : '400';
      const fontStyle = item.it ? 'italic' : 'normal';
      const fontFamily = item.ff || 'system-ui, sans-serif';
      const letterSpacingAttr =
        item.ls !== undefined && item.ls !== 0 ? ` letter-spacing="${item.ls}px"` : '';
      body = `<text text-anchor="${anchor}" font-size="${item.fs}" font-weight="${fontWeight}" font-style="${fontStyle}" font-family="${fontFamily}"${letterSpacingAttr} fill="${item.fill}">${tspans}</text>`;
      break;
    }
    case 'line':
    case 'arrow': {
      const angle = Math.atan2(item.h, item.w);
      const headLength = 12 + item.sw * 2;
      const h1X = item.w + Math.cos(angle + 2.6) * headLength;
      const h1Y = item.h + Math.sin(angle + 2.6) * headLength;
      const h2X = item.w + Math.cos(angle - 2.6) * headLength;
      const h2Y = item.h + Math.sin(angle - 2.6) * headLength;

      const pathData = `M 0 0 L ${item.w} ${item.h}${
        item.t === 'arrow' ? ` M ${h1X} ${h1Y} L ${item.w} ${item.h} L ${h2X} ${h2Y}` : ''
      }`;
      body = `<path d="${pathData}" fill="none" stroke="${item.stroke}" stroke-width="${item.sw}" stroke-linecap="round" stroke-linejoin="round"${dash} />`;
      break;
    }
    case 'path': {
      const pathData =
        item.smooth !== false
          ? pointsToSmoothSvgPath(item.pts)
          : pointsToLinearSvgPath(item.pts);
      body = `<path d="${pathData}" fill="none" stroke="${item.stroke}" stroke-width="${item.sw}" stroke-linecap="round" stroke-linejoin="round"${dash} />`;
      break;
    }
    case 'group': {
      body = `<g data-group="${item.id}"></g>`;
      break;
    }
    case 'image': {
      const id = item.id;
      const r = item.r || 0;
      const fm = item.fm || 'xMidYMid slice';
      const filters = `
        <filter id="f_${id}" color-interpolation-filters="sRGB">
          <feColorMatrix type="saturate" values="${item.sa ?? 1}" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="${(item.br ?? 1) * (item.ct ?? 1)}" intercept="${(item.br ?? 1) * (0.5 - 0.5 * (item.ct ?? 1))}" />
            <feFuncG type="linear" slope="${(item.br ?? 1) * (item.ct ?? 1)}" intercept="${(item.br ?? 1) * (0.5 - 0.5 * (item.ct ?? 1))}" />
            <feFuncB type="linear" slope="${(item.br ?? 1) * (item.ct ?? 1)}" intercept="${(item.br ?? 1) * (0.5 - 0.5 * (item.ct ?? 1))}" />
          </feComponentTransfer>
          ${item.bl ? `<feGaussianBlur stdDeviation="${item.bl}" />` : ''}
        </filter>
        <clipPath id="c_${id}">
          <rect width="${item.w}" height="${item.h}" rx="${r}" />
        </clipPath>
      `;
      body = `
        <defs>${filters}</defs>
        <g clip-path="url(#c_${id})">
          <image href="${item.src}" width="${item.w}" height="${item.h}" preserveAspectRatio="${fm}" filter="url(#f_${id})" />
        </g>
        ${item.sw ? `<rect width="${item.w}" height="${item.h}" rx="${r}" fill="none" stroke="${item.stroke || '#000'}" stroke-width="${item.sw}" />` : ''}
      `;
      break;
    }
  }

  // Interactive hit target when editing lines/paths
  if (!isExport && (item.t === 'line' || item.t === 'arrow' || item.t === 'path')) {
    body += body
      .replace(/stroke="[^"]*"/, 'stroke="transparent"')
      .replace(/stroke-width="[^"]*"/, 'stroke-width="32"');
  }

  const wrappedBody = shadowFilterDef
    ? `<defs>${shadowFilterDef}</defs><g${shadowFilterAttr}>${body}</g>`
    : body;

  return `<g data-id="${item.id}" transform="${trans}" opacity="${opacity}"${blendStyle}>${wrappedBody}</g>`;
}

export function generateArtboardSvgs(page: Page) {
  const visibleItems = page.items.filter((i) => !i.hidden);
  const artboards = visibleItems.filter((i) => i.t === 'artboard');

  if (artboards.length > 0) {
    return artboards.map((artboard) => {
      const children = visibleItems.filter(
        (i) => i.t !== 'artboard' && isInside(i, artboard)
      );
      const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${artboard.x} ${artboard.y} ${artboard.w} ${artboard.h}" width="${artboard.w}" height="${artboard.h}" font-family="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  ${DEFS}
  ${elementToSvg(artboard, true)}
  ${children.map((child) => elementToSvg(child, true)).join('\n  ')}
</svg>`.trim();

      return {
        id: artboard.id,
        name: ('n' in artboard && artboard.n) ? artboard.n : 'Artboard',
        w: artboard.w,
        h: artboard.h,
        svg,
      };
    });
  }

  // Fallback: entire page bbox
  const box = getBoundingBox(visibleItems);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x - 20} ${box.y - 20} ${box.w + 40} ${box.h + 40}" width="${box.w + 40}" height="${box.h + 40}" font-family="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  ${DEFS}
  <rect x="${box.x - 20}" y="${box.y - 20}" width="${box.w + 40}" height="${box.h + 40}" fill="#ffffff" />
  ${visibleItems.map((i) => elementToSvg(i, true)).join('\n  ')}
</svg>`.trim();

  return [
    {
      id: 0,
      name: page.n,
      w: box.w + 40,
      h: box.h + 40,
      svg,
    },
  ];
}

function parseHexColor(color?: string): [number, number, number] | null {
  if (!color || color === 'none' || color === 'transparent') return null;
  const clean = color.trim();
  const shortMatch = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(clean);
  if (shortMatch) {
    return [
      parseInt(shortMatch[1] + shortMatch[1], 16),
      parseInt(shortMatch[2] + shortMatch[2], 16),
      parseInt(shortMatch[3] + shortMatch[3], 16),
    ];
  }
  const fullMatch = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(clean);
  if (fullMatch) {
    return [
      parseInt(fullMatch[1], 16),
      parseInt(fullMatch[2], 16),
      parseInt(fullMatch[3], 16),
    ];
  }
  return null;
}

async function renderSvgSliceToPngDataUrl(
  svgMarkup: string,
  w: number,
  h: number,
  scale: number = 3
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup);
  });
}

function resolvePdfFontFamily(ff?: string): 'helvetica' | 'times' | 'courier' {
  if (!ff) return 'helvetica';
  const lower = ff.toLowerCase();
  if (lower.includes('mono') || lower.includes('courier') || lower.includes('menlo')) {
    return 'courier';
  }
  if (lower.includes('serif') || lower.includes('georgia') || lower.includes('times')) {
    return 'times';
  }
  return 'helvetica';
}

export async function exportArtboardToPdf(
  page: Page,
  targetArtboardId?: number,
  projectTitle?: string
): Promise<string> {
  const visibleItems = page.items.filter((i) => !i.hidden);
  const artboards = visibleItems.filter((i) => i.t === 'artboard');

  const artboard =
    (targetArtboardId ? artboards.find((a) => a.id === targetArtboardId) : undefined) ||
    artboards[0];

  let originX = 0;
  let originY = 0;
  let pageW = 380;
  let pageH = 720;
  let exportName = projectTitle || page.n;
  let itemsToRender: CanvasElement[] = [];

  if (artboard) {
    originX = artboard.x;
    originY = artboard.y;
    pageW = Math.max(40, artboard.w);
    pageH = Math.max(40, artboard.h);
    exportName = ('n' in artboard && artboard.n) ? artboard.n : exportName;
    itemsToRender = [
      artboard,
      ...visibleItems.filter((i) => i.t !== 'artboard' && isInside(i, artboard)),
    ];
  } else {
    const box = getBoundingBox(visibleItems);
    originX = box.x - 20;
    originY = box.y - 20;
    pageW = Math.max(40, box.w + 40);
    pageH = Math.max(40, box.h + 40);
    itemsToRender = visibleItems;
  }

  const doc = new jsPDF({
    orientation: pageW > pageH ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [pageW, pageH],
    compress: true,
  });

  // White base page backdrop
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, 'F');

  for (const item of itemsToRender) {
    if (item.t === 'group') continue;
    const rx = item.x - originX;
    const ry = item.y - originY;
    const op = item.op !== undefined ? Math.max(0.01, Math.min(1, item.op)) : 1;

    doc.saveGraphicsState();
    if (op < 1) {
      doc.setGState(new GState({ opacity: op, 'stroke-opacity': op }));
    }

    const hasGradient =
      Boolean(item.radialGradient) || ('gradientFill' in item && Boolean(item.gradientFill));

    if (item.t === 'image' || hasGradient) {
      // Rasterize high-DPI gradient/image slice at 3x so radial/linear gradients and images render with crisp fidelity,
      // while vector borders and text layers remain pure vector!
      const localItem = { ...item, x: 0, y: 0, op: 1 } as CanvasElement;
      const sliceSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${item.w} ${item.h}" width="${item.w}" height="${item.h}">${DEFS}${elementToSvg(localItem, true)}</svg>`;
      const pngUrl = await renderSvgSliceToPngDataUrl(sliceSvg, item.w, item.h, 3);
      if (pngUrl) {
        doc.addImage(pngUrl, 'PNG', rx, ry, item.w, item.h, undefined, 'FAST');
      }
      doc.restoreGraphicsState();
      continue;
    }

    const fillRgb = 'fill' in item ? parseHexColor(item.fill) : null;
    const strokeRgb = 'stroke' in item ? parseHexColor(item.stroke) : null;
    const sw = 'sw' in item && item.sw !== undefined ? item.sw : 0;
    const strokeStyle =
      'strokeStyle' in item && item.strokeStyle ? item.strokeStyle : 'solid';
    const hasStroke = Boolean(strokeRgb) && sw > 0 && strokeStyle !== 'none';

    if (hasStroke && strokeRgb) {
      doc.setDrawColor(strokeRgb[0], strokeRgb[1], strokeRgb[2]);
      doc.setLineWidth(sw);
      if (strokeStyle === 'dashed') doc.setLineDashPattern([6, 4], 0);
      else if (strokeStyle === 'dotted') doc.setLineDashPattern([2, 3], 0);
      else doc.setLineDashPattern([], 0);
    }

    if (item.t === 'artboard' || item.t === 'rect') {
      const r = 'r' in item && item.r ? Math.min(item.r, Math.min(item.w, item.h) / 2) : 0;
      const mode = fillRgb && hasStroke ? 'FD' : fillRgb ? 'F' : hasStroke ? 'S' : '';
      if (mode) {
        if (fillRgb) doc.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2]);
        if (r > 0) doc.roundedRect(rx, ry, item.w, item.h, r, r, mode);
        else doc.rect(rx, ry, item.w, item.h, mode);
      }
    } else if (item.t === 'oval') {
      const mode = fillRgb && hasStroke ? 'FD' : fillRgb ? 'F' : hasStroke ? 'S' : '';
      if (mode) {
        if (fillRgb) doc.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2]);
        doc.ellipse(rx + item.w / 2, ry + item.h / 2, item.w / 2, item.h / 2, mode);
      }
    } else if (item.t === 'line' || item.t === 'arrow') {
      const lRgb = parseHexColor(item.stroke) || [31, 111, 224];
      doc.setDrawColor(lRgb[0], lRgb[1], lRgb[2]);
      doc.setLineWidth(Math.max(0.5, item.sw));
      doc.line(rx, ry, rx + item.w, ry + item.h);
      if (item.t === 'arrow') {
        const angle = Math.atan2(item.h, item.w);
        const headLength = 12 + item.sw * 2;
        const h1X = rx + item.w + Math.cos(angle + 2.6) * headLength;
        const h1Y = ry + item.h + Math.sin(angle + 2.6) * headLength;
        const h2X = rx + item.w + Math.cos(angle - 2.6) * headLength;
        const h2Y = ry + item.h + Math.sin(angle - 2.6) * headLength;
        doc.line(h1X, h1Y, rx + item.w, ry + item.h);
        doc.line(rx + item.w, ry + item.h, h2X, h2Y);
      }
    } else if (item.t === 'path' && item.pts.length > 0) {
      const pRgb = parseHexColor(item.stroke) || [31, 111, 224];
      doc.setDrawColor(pRgb[0], pRgb[1], pRgb[2]);
      doc.setLineWidth(Math.max(0.5, item.sw));
      const pts = item.pts;
      doc.moveTo(rx + pts[0][0], ry + pts[0][1]);
      if (item.smooth !== false && pts.length >= 3) {
        const factor = 0.5 / 3;
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[Math.max(0, i - 1)];
          const p1 = pts[i];
          const p2 = pts[i + 1];
          const p3 = pts[Math.min(pts.length - 1, i + 2)];
          doc.curveTo(
            rx + p1[0] + (p2[0] - p0[0]) * factor,
            ry + p1[1] + (p2[1] - p0[1]) * factor,
            rx + p2[0] - (p3[0] - p1[0]) * factor,
            ry + p2[1] - (p3[1] - p1[1]) * factor,
            rx + p2[0],
            ry + p2[1]
          );
        }
      } else {
        for (let i = 1; i < pts.length; i++) {
          doc.lineTo(rx + pts[i][0], ry + pts[i][1]);
        }
      }
      doc.stroke();
    } else if (item.t === 'note') {
      const bg = parseHexColor(item.fill) || [254, 240, 138];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.setDrawColor(224, 213, 146);
      doc.setLineWidth(1);
      doc.roundedRect(rx, ry, item.w, item.h, 8, 8, 'FD');

      const tc = parseHexColor(item.tc) || [31, 41, 55];
      doc.setTextColor(tc[0], tc[1], tc[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(item.fs);
      const charsPerLine = Math.max(4, Math.floor((item.w - 24) / (item.fs * 0.55)));
      const wrapped = wrapText(item.text, charsPerLine);
      wrapped.forEach((line, idx) => {
        doc.text(line, rx + 12, ry + 20 + ((idx + 1) * 1.25 - 0.2) * item.fs);
      });
    } else if (item.t === 'text') {
      const tc = parseHexColor(item.fill) || [15, 23, 42];
      doc.setTextColor(tc[0], tc[1], tc[2]);
      const isBold = (item.fw ?? (item.b ? 700 : 400)) >= 600;
      const isItalic = Boolean(item.it);
      const fontStyle =
        isBold && isItalic
          ? 'bolditalic'
          : isBold
          ? 'bold'
          : isItalic
          ? 'italic'
          : 'normal';
      doc.setFont(resolvePdfFontFamily(item.ff), fontStyle);
      doc.setFontSize(item.fs);

      const align = item.align || 'left';
      const anchorX = align === 'center' ? rx + item.w / 2 : align === 'right' ? rx + item.w : rx;
      const charSpace = item.ls ?? 0;
      const lines = item.text.split('\n');
      lines.forEach((line, idx) => {
        const lineY = ry + ((idx + 1) * 1.25 - 0.2) * item.fs;
        doc.text(line, anchorX, lineY, {
          align,
          charSpace,
          ...(item.rot ? { angle: -item.rot } : {}),
        });
      });
    }

    doc.restoreGraphicsState();
  }

  const safeName = `${exportName.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'artboard'}.pdf`;
  doc.save(safeName);
  return safeName;
}

export function generateHtmlDocument(project: ProjectState, pageIndex: number): string {
  const page = project.pages[pageIndex] || project.pages[0];
  const artboards = generateArtboardSvgs(page);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(project.name)} - ${escapeHtml(page.n)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 16px;
      background: #f0f1f5;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32px;
    }
    .artboard-container {
      background: #fff;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      overflow: hidden;
      max-width: 100%;
    }
    .artboard-header {
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
    }
    svg {
      display: block;
      max-width: 100%;
      height: auto;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .artboard-container { box-shadow: none; border-radius: 0; break-after: page; }
      .artboard-header { display: none; }
    }
  </style>
</head>
<body>
${artboards
  .map(
    (art) => `  <div class="artboard-container">
    <div class="artboard-header">
      <span>${escapeHtml(art.name)}</span>
      <span>${art.w} × ${art.h}</span>
    </div>
    ${art.svg}
  </div>`
  )
  .join('\n\n')}
</body>
</html>`;
}

export function generateElementDebugJson(item: CanvasElement): string {
  const styles: Record<string, any> = {
    'box-sizing': 'border-box',
    position: 'absolute',
    left: `${Math.round(item.x)}px`,
    top: `${Math.round(item.y)}px`,
    width: `${Math.round(item.w)}px`,
    height: `${Math.round(item.h)}px`,
  };

  if (item.radialGradient) {
    if (typeof item.radialGradient === 'string') {
      styles['background-image'] = item.radialGradient;
    } else if (item.radialGradient.stops?.length) {
      const stopsStr = item.radialGradient.stops
        .map((s) => `${s.color} ${s.offset}%`)
        .join(', ');
      styles['background-image'] = `radial-gradient(circle at ${item.radialGradient.cx ?? 50}% ${item.radialGradient.cy ?? 50}%, ${stopsStr})`;
    }
  } else if ('gradientFill' in item && item.gradientFill) {
    styles['background-image'] = item.gradientFill;
  } else if ('fill' in item && item.fill) {
    styles['background-color'] = item.fill;
  }
  if (item.t === 'text') {
    styles['font-size'] = `${item.fs}px`;
    styles['font-weight'] = item.fw ?? (item.b ? 700 : 400);
    if (item.ls !== undefined && item.ls !== 0) {
      styles['letter-spacing'] = `${item.ls}px`;
    }
  }
  if ('stroke' in item && item.stroke && 'sw' in item && item.sw) {
    const strokeStyle = 'strokeStyle' in item && item.strokeStyle ? item.strokeStyle : 'solid';
    styles['border'] = `${item.sw}px ${strokeStyle} ${item.stroke}`;
  }
  if ('r' in item && item.r) {
    styles['border-radius'] = `${item.r}px`;
  }
  if (item.sh || (item.shadowStyle && item.shadowStyle !== 'none')) {
    const sStyle =
      item.shadowStyle ||
      ((item.shadowIntensity ?? 8) >= 18
        ? 'heavy'
        : (item.shadowIntensity ?? 8) <= 6
        ? 'subtle'
        : 'soft');
    styles['box-shadow'] =
      sStyle === 'subtle'
        ? '0 2px 6px rgba(0, 0, 0, 0.08)'
        : sStyle === 'heavy'
        ? '0 14px 28px rgba(0, 0, 0, 0.22)'
        : '0 4px 12px rgba(0, 0, 0, 0.14)';
  }
  if ('paddingH' in item && item.paddingH !== undefined) {
    styles['padding'] = `${item.paddingV || 0}px ${item.paddingH}px`;
  }
  if ('marginH' in item && item.marginH !== undefined) {
    styles['margin'] = `${item.marginV || 0}px ${item.marginH}px`;
  }
  if (item.op !== undefined && item.op < 1) {
    styles['opacity'] = item.op;
  }
  if (item.blendMode && item.blendMode !== 'normal') {
    styles['mix-blend-mode'] = item.blendMode;
  }
  const transforms: string[] = [];
  if (item.rot) transforms.push(`rotate(${item.rot}deg)`);
  if (item.flipX) transforms.push('scaleX(-1)');
  if (item.flipY) transforms.push('scaleY(-1)');
  if (transforms.length > 0) {
    styles['transform'] = transforms.join(' ');
  }

  const cssString = Object.entries(styles)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');

  return JSON.stringify(
    {
      tid: item.id,
      tag: item.t === 'artboard' ? 'section' : item.t === 'text' ? 'p' : 'div',
      parent: null,
      attrs: item.link ? { href: item.link } : {},
      style: cssString,
    },
    null,
    2
  );
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  try {
    const isDataUrl = content.startsWith('data:');
    const url = isDataUrl
      ? content
      : URL.createObjectURL(new Blob([content], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (!isDataUrl) {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (err) {
    console.error('Download error:', err);
  }
}
