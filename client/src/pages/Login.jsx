import React, { useState } from 'react';
import { api, setToken } from '../api';
import { IconShield } from '../components/Icons';

export default function Login({ onDone }) {
  const [peran, setPeran] = useState('admin');
  const [username, setUsername] = useState('admin.toko');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const pilih = (p) => {
    setPeran(p);
    setUsername(p === 'admin' ? 'admin.toko' : 'user.toko');
    setPassword('');
  };

  const masuk = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = await api('/login', { json: { username, password } });
      setToken(r.token);
      onDone(r.user);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center p-5">
      <div className="blob" style={{ width: 480, height: 480, right: -110, top: -90, background: '#D7BDB0' }} />
      <div className="blob" style={{ width: 360, height: 360, left: -70, bottom: -80, background: '#E3D5CA', opacity: 0.8 }} />
      <div className="blob" style={{ width: 280, height: 280, left: '40%', top: '55%', background: '#B99888', opacity: 0.3 }} />

      <form onSubmit={masuk} className="glass-strong relative z-10 w-full max-w-[420px] rounded-xl4 p-7 sm:p-9">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose/25 text-rose-deep"><IconShield size={24} /></div>
          <div>
            <h1 className="text-[21px] font-extrabold leading-tight">Arsip Kita</h1>
            <p className="text-[13px] text-ink-soft">Kearsipan Elektronik &middot; Electronic Filing System</p>
          </div>
        </div>

        <p className="mb-2 text-[12.5px] font-bold uppercase tracking-wide text-ink-soft">Masuk sebagai</p>
        <div className="mb-5 grid grid-cols-2 gap-2.5">
          {[['admin', 'Admin'], ['user', 'User']].map(([v, t]) => (
            <button type="button" key={v} onClick={() => pilih(v)}
              className={`rounded-2xl border px-4 py-3 text-[14px] font-bold transition ${peran === v ? 'border-rose-deep bg-rose/30 shadow-soft' : 'border-stone/70 bg-white/45 hover:bg-white/70'}`}>
              {t}
              <span className="mt-0.5 block text-[11.5px] font-semibold text-ink-soft">
                {v === 'admin' ? 'Kelola arsip & sistem' : 'Lihat & unduh arsip'}
              </span>
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-[12.5px] font-bold text-ink-soft">Username</label>
        <input className="field mb-4" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        <label className="mb-1.5 block text-[12.5px] font-bold text-ink-soft">Password</label>
        <input className="field mb-5" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Kata sandi akun" autoComplete="current-password" />

        {err && (
          <p className="mb-4 rounded-2xl border border-bad/30 bg-bad/10 px-4 py-3 text-[13px] font-semibold text-bad">{err}</p>
        )}

        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Memeriksa…' : 'Masuk'}
        </button>
        <p className="mt-4 text-center text-[12px] text-ink-soft">
          Akun uji: <b>admin.toko / Admin123!</b> &middot; <b>user.toko / User123!</b>
        </p>
      </form>
    </div>
  );
}
