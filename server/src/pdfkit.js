'use strict';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/[\\()]/g, (c) => '\\' + c)
    .replace(/[^\x20-\x7E]/g, '-');
}

function pageContent(title, lines, pageNo, pageCount) {
  let t = `BT /F1 20 Tf 60 760 Td (${esc(title)}) Tj ET\n`;
  t += `BT /F1 11 Tf 60 728 Td (${esc('Dokumen contoh - Electronic Filing System')}) Tj ET\n`;
  t += `0.85 0.74 0.69 RG 2 w 60 716 m 535 716 l S\n`;
  lines.forEach((l, i) => {
    t += `BT /F1 11 Tf 60 ${685 - i * 20} Td (${esc(l)}) Tj ET\n`;
  });
  t += `BT /F1 10 Tf 60 90 Td (${esc('Halaman ' + pageNo + ' dari ' + pageCount)}) Tj ET\n`;
  return t;
}

function buildPdf(pageCount, title, lines) {
  pageCount = Math.max(1, pageCount | 0);
  const nObj = 4 + pageCount * 2;
  const objs = new Array(nObj + 1).fill(null);
  const streams = new Array(nObj + 1).fill(null);
  const kids = [];
  for (let p = 0; p < pageCount; p++) kids.push(5 + p * 2);
  objs[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objs[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageCount} >>`;
  objs[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  for (let p = 0; p < pageCount; p++) {
    const pageN = 4 + p * 2 + 1; // 5, 7, 9...
    const contN = pageN + 1;
    objs[pageN] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contN} 0 R >>`;
    streams[contN] = pageContent(title, lines, p + 1, pageCount);
  }
  let out = '%PDF-1.4\n';
  const offsets = new Array(nObj + 1).fill(0);
  for (let n = 1; n <= nObj; n++) {
    offsets[n] = Buffer.byteLength(out, 'latin1');
    if (streams[n] != null) {
      const len = Buffer.byteLength(streams[n], 'latin1');
      out += `${n} 0 obj\n<< /Length ${len} >>\nstream\n${streams[n]}endstream\nendobj\n`;
    } else if (objs[n] != null) {
      out += `${n} 0 obj\n${objs[n]}\nendobj\n`;
    } else {
      out += `${n} 0 obj\n<< >>\nendobj\n`;
    }
  }
  const xrefPos = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${nObj + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= nObj; n++) out += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
  out += `trailer\n<< /Size ${nObj + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

function countPages(buf) {
  const s = buf.toString('latin1');
  const m = s.match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/);
  if (m) return parseInt(m[1], 10);
  return (s.match(/\/Type\s*\/Page[^s]/g) || []).length || 1;
}

module.exports = { buildPdf, countPages };
