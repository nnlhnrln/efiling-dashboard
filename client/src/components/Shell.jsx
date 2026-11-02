import React, { useCallback, useContext, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { api } from '../api';
import { inisial } from '../format';
import { Auth, StatsCtx } from '../context';
import {
  IconHome, IconFolder, IconSearch, IconReport, IconDatabase, IconLog,
  IconAlert, IconClose, IconMenu, IconLogout,
} from './Icons';

const MENU = [
  { to: '/', label: 'Dashboard', icon: IconHome, end: true },
  { to: '/direktori', label: 'Direktori Arsip', icon: IconFolder },
  { to: '/cari', label: 'Cari Arsip', icon: IconSearch },
  { to: '/laporan', label: 'Laporan & Retensi', icon: IconReport },
  { to: '/data-master', label: 'Data Master', icon: IconDatabase, admin: true },
  { to: '/log', label: 'Log Aktivitas', icon: IconLog, admin: true },
];

function RetensiKartu({ mendekati, lewat, onNavigate }) {
  const total = mendekati + lewat;
  return (
    <div className={`glass-soft rounded-xl2 p-4 ${total === 0 ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <IconAlert size={18} className={lewat > 0 ? 'text-bad' : mendekati > 0 ? 'text-warn' : 'text-ink-soft'} />
        <p className="text-[13px] font-bold">Peringatan Retensi</p>
      </div>
      {total === 0 ? (
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">Semua arsip masih dalam masa simpan.</p>
      ) : (
        <>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
            <b className="text-warn">{mendekati} arsip</b> mendekati masa simpan,{' '}
            <b className="text-bad">{lewat} arsip</b> lewat masa simpan.
          </p>
          <NavLink to="/laporan?tab=retensi" onClick={onNavigate}
            className="mt-2 inline-block text-[12.5px] font-bold text-rose-deep underline underline-offset-2">
            Lihat daftar retensi
          </NavLink>
        </>
      )}
    </div>
  );
}

function SidebarBody({ user, stats, logout, onNavigate }) {
  const menu = MENU.filter((m) => !m.admin || user.peran === 'admin');
  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-center gap-3 px-1 pt-1">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-soft to-rose-deep text-lg font-extrabold text-white shadow-soft">
          {inisial(user.nama)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold">{user.nama}</p>
          <p className="truncate text-[12.5px] text-ink-soft">{user.email || user.username}</p>
          <span className="mt-1 inline-flex rounded-full bg-rose px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
            {user.peran === 'admin' ? 'Admin' : 'User'}
          </span>
        </div>
      </div>

      <nav className="-mr-3 flex-1 space-y-1 overflow-y-auto pr-3 scroll-thin">
        {menu.map((m) => (
          <NavLink key={m.to} to={m.to} end={m.end} onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'on' : ''}`}>
            <m.icon size={19} />
            <span>{m.label}</span>
          </NavLink>
        ))}
      </nav>

      <RetensiKartu mendekati={stats?.mendekati || 0} lewat={stats?.lewat || 0} onNavigate={onNavigate} />
      <button onClick={logout} className="pill w-full">
        <IconLogout size={17} /> Keluar
      </button>
    </div>
  );
}

export default function Shell({ children }) {
  const { user, logout } = useContext(Auth);
  const [stats, setStats] = useState(null);
  const [master, setMaster] = useState(null);
  const [open, setOpen] = useState(false);
  const loc = useLocation().pathname;

  useEffect(() => setOpen(false), [loc]);

  const refresh = useCallback(() => api('/summary').then(setStats).catch(() => {}), []);
  const refreshMaster = useCallback(() => api('/master').then(setMaster).catch(() => {}), []);

  useEffect(() => { refresh(); refreshMaster(); }, [refresh, refreshMaster]);

  const value = { stats, refresh, master, refreshMaster };

  return (
    <StatsCtx.Provider value={value}>
      <div className="relative min-h-screen">
        <div className="blob" style={{ width: 460, height: 460, right: -90, top: -60, background: '#D7BDB0' }} />
        <div className="blob" style={{ width: 380, height: 380, left: 120, bottom: -140, background: '#E3D5CA', opacity: 0.7 }} />
        <div className="blob" style={{ width: 300, height: 300, left: '45%', top: '38%', background: '#B99888', opacity: 0.35 }} />

        <div className="relative z-10 mx-auto flex max-w-[1500px] gap-4 p-3 sm:p-5">
          <aside className="glass-strong sticky top-3 hidden h-[calc(100vh-24px)] w-[290px] shrink-0 rounded-xl4 lg:block">
            <SidebarBody user={user} stats={stats} logout={logout} />
          </aside>

          <div className={`fixed inset-0 z-40 bg-ink/35 backdrop-blur-sm transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            onClick={() => setOpen(false)} />
          <aside className={`fixed left-0 top-0 z-50 h-full w-[300px] rounded-r-xl4 bg-mist/95 shadow-lift transition-transform backdrop-blur-2xl lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/60">
              <IconClose size={18} />
            </button>
            <SidebarBody user={user} stats={stats} logout={logout} onNavigate={() => setOpen(false)} />
          </aside>

          <main className="min-w-0 flex-1">
            <button onClick={() => setOpen(true)}
              className="glass mb-3 flex w-full items-center gap-2.5 rounded-xl2 px-4 py-3 text-[14px] font-bold lg:hidden">
              <IconMenu size={20} /> Menu
              <span className="ml-auto text-[12px] font-semibold text-ink-soft">{user.nama}</span>
            </button>
            <div className="glass-strong min-h-[calc(100vh-88px)] rounded-xl4 p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </StatsCtx.Provider>
  );
}
