import { createContext, useContext } from 'react';

export const Auth = createContext({ user: null, admin: false, logout: () => {} });
export const StatsCtx = createContext({ stats: null, refresh: () => {}, master: null, refreshMaster: () => {} });

export const useAuth = () => useContext(Auth);
export const useStats = () => useContext(StatsCtx);
