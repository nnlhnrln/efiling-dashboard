import React from 'react';
import { Link } from 'react-router-dom';
import { tgl, rupiah, labelGaya } from '../format';
import { IconPdf, IconEye } from './Icons';

function nilaiRingkas(d) {
  if (d.fields.nilai !== undefined) return rupiah(d.fields.nilai);
  if (d.fields.perihal) return d.fields.perihal;
  if (d.fields.masa_berlaku) return d.fields.masa_berlaku;
  return d.jenis;
}

export default function TicketCard({ d }) {
  return (
    <article className="ticket glass group flex flex-wrap items-center gap-4 rounded-xl2 px-5 py-4 sm:px-7 transition hover:bg-white/70">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose/25 text-rose-deep">
        <IconPdf size={24} />
      </div>
      <div className="min-w-[190px] flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">{d.idArsip}</p>
          <span className="text-[11px] font-semibold text-ink-soft">/ {d.kode}</span>
        </div>
        <p className="text-[15.5px] font-bold leading-snug">{d.jenis}</p>
        <p className="text-[13px] text-ink-soft">
          Nomor <b className="text-ink">{d.nomor}</b> &middot; {tgl(d.tanggal)}
        </p>
      </div>
      <div className="min-w-[150px] flex-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Pihak terkait</p>
        <p className="text-[13.5px] font-semibold">{d.pihak}</p>
        <p className="truncate text-[12.5px] text-ink-soft">{nilaiRingkas(d)}</p>
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <span className={labelGaya(d.label)}>{d.label}</span>
        <span className="text-[11.5px] text-ink-soft">Retensi {tgl(d.tanggalRetensi)}</span>
      </div>
      <Link to={`/arsip/${d.idArsip}`} className="btn btn-primary ml-auto">
        <IconEye size={17} /> Buka
      </Link>
    </article>
  );
}
