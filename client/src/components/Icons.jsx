const S = ({ children, size = 20, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>
);

export const IconHome = (p) => <S {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></S>;
export const IconFolder = (p) => <S {...p}><path d="M3 7a2 2 0 0 1 2-2h3.6l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></S>;
export const IconFolderOpen = (p) => <S {...p}><path d="M3 7h6l2 2h8v3" /><path d="M3 7v10l2.5 4H21l-2.5-4H8" /></S>;
export const IconSearch = (p) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></S>;
export const IconReport = (p) => <S {...p}><path d="M5 21V4m5 17V9m5 12V6m4 15H3" /></S>;
export const IconDatabase = (p) => <S {...p}><ellipse cx="12" cy="5.5" rx="8" ry="2.8" /><path d="M4 5.5v13c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8v-13" /><path d="M4 12c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8" /></S>;
export const IconLog = (p) => <S {...p}><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M9 8h6M9 12h6M9 16h3" /></S>;
export const IconPlus = (p) => <S {...p}><path d="M12 5v14M5 12h14" /></S>;
export const IconEye = (p) => <S {...p}><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.8" /></S>;
export const IconDownload = (p) => <S {...p}><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></S>;
export const IconEdit = (p) => <S {...p}><path d="M4 20h4l10-10-4-4L4 16Z" /><path d="m14 6 4 4" /></S>;
export const IconTrash = (p) => <S {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></S>;
export const IconClock = (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></S>;
export const IconAlert = (p) => <S {...p}><path d="M12 3.5 21 19H3Z" /><path d="M12 9.5v4M12 16.5v.5" /></S>;
export const IconPdf = (p) => <S {...p}><path d="M6 2h8l4 4v16H6Z" /><path d="M14 2v4h4" /><path d="M9 13h1.5a1.2 1.2 0 0 1 0 2.4H9V13Zm0 2.4V18" /><path d="M14.5 13v5" /></S>;
export const IconChevron = (p) => <S {...p}><path d="m9 6 6 6-6 6" /></S>;
export const IconClose = (p) => <S {...p}><path d="m6 6 12 12M18 6 6 18" /></S>;
export const IconMenu = (p) => <S {...p}><path d="M4 7h16M4 12h16M4 17h16" /></S>;
export const IconLogout = (p) => <S {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></S>;
export const IconCheck = (p) => <S {...p}><path d="m4 12.5 5 5L20 6.5" /></S>;
export const IconPrint = (p) => <S {...p}><path d="M7 8V3h10v5" /><path d="M5 8h14a2 2 0 0 1 2 2v6h-4v5H7v-5H3v-6a2 2 0 0 1 2-2Z" /></S>;
export const IconCsv = (p) => <S {...p}><path d="M4 6h16v12H4Z" /><path d="M4 10h16M10 10v8" /></S>;
export const IconShield = (p) => <S {...p}><path d="M12 3 5 6v6c0 4.2 3 7.5 7 9 4-1.5 7-4.8 7-9V6Z" /></S>;
