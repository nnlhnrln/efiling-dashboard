import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from './api';
import Shell from './components/Shell';
import { Auth } from './context';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Direktori from './pages/Direktori';
import Cari from './pages/Cari';
import Detail from './pages/Detail';
import FormArsip from './pages/FormArsip';
import Laporan from './pages/Laporan';
import DataMaster from './pages/DataMaster';
import LogAktivitas from './pages/LogAktivitas';

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(!!getToken());
  const navigate = useNavigate();

  const logout = useCallback(() => {
    api('/logout', { method: 'POST' }).catch(() => {});
    setToken('');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const onForced = () => setUser(null);
    window.addEventListener('efiling:logout', onForced);
    if (!getToken()) { setBooting(false); return () => window.removeEventListener('efiling:logout', onForced); }
    api('/me')
      .then((r) => setUser(r.user))
      .catch(() => setToken(''))
      .finally(() => setBooting(false));
    return () => window.removeEventListener('efiling:logout', onForced);
  }, []);

  if (booting) return null;
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login onDone={setUser} />} />
      </Routes>
    );
  }

  const admin = user.peran === 'admin';
  return (
    <Auth.Provider value={{ user, admin, logout }}>
      <Shell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/direktori" element={<Direktori />} />
          <Route path="/cari" element={<Cari />} />
          <Route path="/arsip/:id" element={<Detail />} />
          <Route path="/laporan" element={<Laporan />} />
          {admin && <Route path="/arsip/baru" element={<FormArsip />} />}
          {admin && <Route path="/arsip/:id/ubah" element={<FormArsip />} />}
          {admin && <Route path="/data-master" element={<DataMaster />} />}
          {admin && <Route path="/log" element={<LogAktivitas />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </Auth.Provider>
  );
}
