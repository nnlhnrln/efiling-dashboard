export const tgl = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '-');
export const tglWaktu = (s) => {
  if (!s) return '-';
  const [d, t] = String(s).split(' ');
  return `${tgl(d)} ${t ? t.slice(0, 5) : ''}`.trim();
};
export const rupiah = (n) =>
  n === null || n === undefined || n === '' ? '-' : 'Rp' + Number(n).toLocaleString('id-ID');

export const sapaan = () => {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
};

export const inisial = (nama) =>
  String(nama || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const labelGaya = (label) =>
  label === 'AKTIF' ? 'chip chip-aktif' : label === 'MENDEKATI' ? 'chip chip-mendekati' : 'chip chip-lewat';
