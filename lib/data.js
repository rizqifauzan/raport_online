// Dummy data — resets on refresh (in-memory only)

export const MAPEL = {
  TPQ: [
    { id: 'tahsin', label: 'Tahsin / Tilawah' },
    { id: 'tajwid', label: 'Tajwid' },
    { id: 'tahfidz', label: 'Tahfidz Juz 30' },
    { id: 'doa', label: 'Doa & Adab Harian' },
    { id: 'ibadah', label: 'Praktik Ibadah' },
    { id: 'imla', label: "Imla' (Menulis Arab)" },
  ],
  Madin: [
    { id: 'fiqih', label: 'Fiqih' },
    { id: 'akidah', label: 'Akidah Akhlak' },
    { id: 'quran', label: "Al-Qur'an Hadits" },
    { id: 'nahwu', label: 'Nahwu Shorof' },
    { id: 'tarikh', label: 'Tarikh Islam' },
    { id: 'bahasa', label: 'Bahasa Arab' },
  ],
};

export const KELAS = [
  { id: 'tpq-1', nomor: 1, label: 'Kelas 1', wali: 'Ust. Salim', lembaga: 'TPQ' },
  { id: 'tpq-2', nomor: 2, label: 'Kelas 2', wali: 'Ust. Farid', lembaga: 'TPQ' },
  { id: 'tpq-3', nomor: 3, label: 'Kelas 3', wali: 'Usth. Maryam', lembaga: 'TPQ' },
  { id: 'tpq-4', nomor: 4, label: 'Kelas 4', wali: 'Ust. Zubair', lembaga: 'TPQ' },
  { id: 'tpq-5', nomor: 5, label: 'Kelas 5', wali: 'Usth. Halimah', lembaga: 'TPQ' },
  { id: 'tpq-6', nomor: 6, label: 'Kelas 6', wali: 'Ust. Anwar', lembaga: 'TPQ' },
  { id: 'mdn-1', nomor: 1, label: 'Kelas Ula', wali: 'Ust. Hasan', lembaga: 'Madin' },
  { id: 'mdn-2', nomor: 2, label: 'Kelas Wustho', wali: 'Ust. Husain', lembaga: 'Madin' },
  { id: 'mdn-3', nomor: 3, label: 'Kelas Ulya', wali: 'Ust. Ali', lembaga: 'Madin' },
];

const STUDENTS_RAW = [
  // TPQ Kelas 1
  { id:'24101', kelasId:'tpq-1', nama:'Ahmad Faiz Maulana',      gender:'L', lahir:'Kediri, 14 Mar 2018',    waliSantri:'Bpk. Sulaiman',      status:'Aktif',  color:'#0d9488' },
  { id:'24102', kelasId:'tpq-1', nama:'Nadia Aulia Rahma',       gender:'P', lahir:'Blitar, 02 Jun 2018',    waliSantri:'Bpk. Ridwan',         status:'Aktif',  color:'#7c3aed' },
  { id:'24103', kelasId:'tpq-1', nama:'Muhammad Rafa Pratama',   gender:'L', lahir:'Kediri, 21 Jan 2018',    waliSantri:'Bpk. Hartono',        status:'Aktif',  color:'#2563eb' },
  { id:'24104', kelasId:'tpq-1', nama:'Khalisa Zahra Putri',     gender:'P', lahir:'Nganjuk, 09 Sep 2018',   waliSantri:'Bpk. Munir',          status:'Aktif',  color:'#16a34a' },
  { id:'24105', kelasId:'tpq-1', nama:'Yusuf Habibie Anwar',     gender:'L', lahir:'Kediri, 30 Nov 2017',    waliSantri:'Bpk. Faizal',         status:'Izin',   color:'#d4a056' },
  { id:'24106', kelasId:'tpq-1', nama:'Salma Aqila Husna',       gender:'P', lahir:'Tulungagung, 17 Apr 2018',waliSantri:'Bpk. Ghozali',       status:'Aktif',  color:'#dc2626' },
  { id:'24107', kelasId:'tpq-1', nama:'Hamzah Firdaus Akbar',    gender:'L', lahir:'Kediri, 05 Des 2017',    waliSantri:'Bpk. Saiful',         status:'Aktif',  color:'#0891b2' },
  // TPQ Kelas 2
  { id:'24201', kelasId:'tpq-2', nama:'Ainun Mardiyah',          gender:'P', lahir:'Blitar, 10 Jan 2018',    waliSantri:'Bpk. Wahyudi',        status:'Aktif',  color:'#7c3aed' },
  { id:'24202', kelasId:'tpq-2', nama:'Bagas Firmansyah',        gender:'L', lahir:'Kediri, 15 Mar 2017',    waliSantri:'Bpk. Sutrisno',       status:'Aktif',  color:'#2563eb' },
  { id:'24203', kelasId:'tpq-2', nama:'Dian Safitri Hidayah',    gender:'P', lahir:'Tulungagung, 22 Jun 2017',waliSantri:'Bpk. Mulyono',       status:'Aktif',  color:'#16a34a' },
  { id:'24204', kelasId:'tpq-2', nama:'Fahmi Nur Huda',          gender:'L', lahir:'Kediri, 08 Agu 2017',    waliSantri:'Bpk. Budiman',        status:'Aktif',  color:'#0d9488' },
  { id:'24205', kelasId:'tpq-2', nama:'Ghina Aulia Putri',       gender:'P', lahir:'Nganjuk, 30 Apr 2018',   waliSantri:'Bpk. Wahab',          status:'Aktif',  color:'#d4a056' },
  { id:'24206', kelasId:'tpq-2', nama:'Haris Maulana',           gender:'L', lahir:'Kediri, 17 Des 2017',    waliSantri:'Bpk. Supriadi',       status:'Keluar', color:'#dc2626' },
  { id:'24207', kelasId:'tpq-2', nama:'Imas Nur Fadhilah',       gender:'P', lahir:'Jombang, 11 Sep 2017',   waliSantri:'Bpk. Rohman',         status:'Aktif',  color:'#0891b2' },
  // TPQ Kelas 3
  { id:'24301', kelasId:'tpq-3', nama:'Abdurrahman Hakim',       gender:'L', lahir:'Kediri, 03 Feb 2017',    waliSantri:'Bpk. Hakim',          status:'Aktif',  color:'#0d9488' },
  { id:'24302', kelasId:'tpq-3', nama:'Aisyah Putri Ramadhani',  gender:'P', lahir:'Kediri, 02 Jun 2017',    waliSantri:'Bpk. Ridwan Hidayat', status:'Aktif',  color:'#7c3aed' },
  { id:'24303', kelasId:'tpq-3', nama:'Bilal Arrahman',          gender:'L', lahir:'Kediri, 19 Okt 2017',    waliSantri:'Bpk. Arrahman',       status:'Aktif',  color:'#2563eb' },
  { id:'24304', kelasId:'tpq-3', nama:'Fauzan Adhim',            gender:'L', lahir:'Tulungagung, 25 Jul 2017',waliSantri:'Bpk. Adhim',         status:'Aktif',  color:'#16a34a' },
  { id:'24305', kelasId:'tpq-3', nama:'Hafshah Nuraini',         gender:'P', lahir:'Nganjuk, 14 Mar 2017',   waliSantri:'Bpk. Nuraini',        status:'Aktif',  color:'#d4a056' },
  { id:'24306', kelasId:'tpq-3', nama:'Ibrahim Khalil',          gender:'L', lahir:'Kediri, 28 Nov 2017',    waliSantri:'Bpk. Khalil',         status:'Aktif',  color:'#dc2626' },
  { id:'24307', kelasId:'tpq-3', nama:'Maryam Shofiyah',         gender:'P', lahir:'Blitar, 07 Agu 2017',    waliSantri:'Bpk. Shofiy',         status:'Aktif',  color:'#0891b2' },
  // TPQ Kelas 4
  { id:'24401', kelasId:'tpq-4', nama:'Najib Fauzan',            gender:'L', lahir:'Kediri, 11 Jan 2017',    waliSantri:'Bpk. Fauzan Sr.',     status:'Aktif',  color:'#0d9488' },
  { id:'24402', kelasId:'tpq-4', nama:'Oky Ramadhan',            gender:'L', lahir:'Kediri, 02 Apr 2016',    waliSantri:'Bpk. Rudi',           status:'Aktif',  color:'#2563eb' },
  { id:'24403', kelasId:'tpq-4', nama:'Putri Rahayu',            gender:'P', lahir:'Nganjuk, 18 Sep 2016',   waliSantri:'Bpk. Rahmat',         status:'Aktif',  color:'#7c3aed' },
  { id:'24404', kelasId:'tpq-4', nama:'Rizki Firmansyah',        gender:'L', lahir:'Blitar, 23 Des 2016',    waliSantri:'Bpk. Firman',         status:'Izin',   color:'#16a34a' },
  { id:'24405', kelasId:'tpq-4', nama:'Siti Nurfadhilah',        gender:'P', lahir:'Kediri, 05 Jul 2016',    waliSantri:'Bpk. Fadli',          status:'Aktif',  color:'#d4a056' },
  { id:'24406', kelasId:'tpq-4', nama:'Taufik Hidayat',          gender:'L', lahir:'Jombang, 14 Feb 2016',   waliSantri:'Bpk. Hidayat',        status:'Aktif',  color:'#dc2626' },
  { id:'24407', kelasId:'tpq-4', nama:'Ulfa Nur Azizah',         gender:'P', lahir:'Kediri, 29 Okt 2016',    waliSantri:'Bpk. Aziz',           status:'Aktif',  color:'#0891b2' },
  // TPQ Kelas 5
  { id:'24501', kelasId:'tpq-5', nama:'Wahyu Hidayat',           gender:'L', lahir:'Kediri, 15 Mar 2016',    waliSantri:'Bpk. Hendra',         status:'Aktif',  color:'#0d9488' },
  { id:'24502', kelasId:'tpq-5', nama:'Xena Aulia Putri',        gender:'P', lahir:'Tulungagung, 08 Jun 2016',waliSantri:'Bpk. Aulia',         status:'Aktif',  color:'#7c3aed' },
  { id:'24503', kelasId:'tpq-5', nama:'Yahya Akbar',             gender:'L', lahir:'Kediri, 21 Jan 2016',    waliSantri:'Bpk. Akbar',          status:'Aktif',  color:'#2563eb' },
  { id:'24504', kelasId:'tpq-5', nama:'Zahra Nur Hidayah',       gender:'P', lahir:'Nganjuk, 30 Apr 2016',   waliSantri:'Bpk. Hidayah',        status:'Aktif',  color:'#16a34a' },
  { id:'24505', kelasId:'tpq-5', nama:'Ahmad Zainuddin',         gender:'L', lahir:'Kediri, 12 Sep 2016',    waliSantri:'Bpk. Zainuddin',      status:'Aktif',  color:'#d4a056' },
  { id:'24506', kelasId:'tpq-5', nama:'Bintang Aulia',           gender:'P', lahir:'Blitar, 04 Des 2015',    waliSantri:'Bpk. Suwanto',        status:'Aktif',  color:'#dc2626' },
  { id:'24507', kelasId:'tpq-5', nama:'Cahya Ramadhani',         gender:'L', lahir:'Kediri, 17 Jul 2016',    waliSantri:'Bpk. Ramadhan',       status:'Aktif',  color:'#0891b2' },
  // TPQ Kelas 6
  { id:'24601', kelasId:'tpq-6', nama:'Damar Wicaksono',         gender:'L', lahir:'Kediri, 10 Feb 2015',    waliSantri:'Bpk. Wicaksono',      status:'Aktif',  color:'#0d9488' },
  { id:'24602', kelasId:'tpq-6', nama:'Elsa Nurhanifah',         gender:'P', lahir:'Nganjuk, 23 Mei 2015',   waliSantri:'Bpk. Hanif',          status:'Aktif',  color:'#7c3aed' },
  { id:'24603', kelasId:'tpq-6', nama:'Farhan Malik',            gender:'L', lahir:'Kediri, 01 Agu 2015',    waliSantri:'Bpk. Malik',          status:'Aktif',  color:'#2563eb' },
  { id:'24604', kelasId:'tpq-6', nama:'Gita Ayu Lestari',        gender:'P', lahir:'Blitar, 18 Nov 2015',    waliSantri:'Bpk. Lestari',        status:'Aktif',  color:'#16a34a' },
  { id:'24605', kelasId:'tpq-6', nama:'Hendra Saputra',          gender:'L', lahir:'Tulungagung, 07 Apr 2015',waliSantri:'Bpk. Saputra',       status:'Aktif',  color:'#d4a056' },
  { id:'24606', kelasId:'tpq-6', nama:'Indah Permata Sari',      gender:'P', lahir:'Kediri, 14 Sep 2015',    waliSantri:'Bpk. Permata',        status:'Aktif',  color:'#dc2626' },
  { id:'24607', kelasId:'tpq-6', nama:'Joko Susanto',            gender:'L', lahir:'Kediri, 29 Jan 2015',    waliSantri:'Bpk. Susanto',        status:'Aktif',  color:'#0891b2' },
  // Madin Kelas Ula
  { id:'25101', kelasId:'mdn-1', nama:'Ahmad Bashori',           gender:'L', lahir:'Kediri, 12 Mar 2012',    waliSantri:'Bpk. Bashori',        status:'Aktif',  color:'#0d9488' },
  { id:'25102', kelasId:'mdn-1', nama:'Aisyah Kamalia',          gender:'P', lahir:'Nganjuk, 04 Jun 2012',   waliSantri:'Bpk. Kamali',         status:'Aktif',  color:'#7c3aed' },
  { id:'25103', kelasId:'mdn-1', nama:'Dzaky Maulana',           gender:'L', lahir:'Kediri, 17 Sep 2012',    waliSantri:'Bpk. Maulana',        status:'Aktif',  color:'#2563eb' },
  { id:'25104', kelasId:'mdn-1', nama:'Fatimah Zahro',           gender:'P', lahir:'Blitar, 28 Nov 2012',    waliSantri:'Bpk. Zahri',          status:'Aktif',  color:'#16a34a' },
  { id:'25105', kelasId:'mdn-1', nama:'Ghazali Ahmad',           gender:'L', lahir:'Kediri, 01 Feb 2013',    waliSantri:'Bpk. Ahmad',          status:'Aktif',  color:'#d4a056' },
  // Madin Kelas Wustho
  { id:'25201', kelasId:'mdn-2', nama:'Hamdan Habibi',           gender:'L', lahir:'Kediri, 20 Apr 2011',    waliSantri:'Bpk. Habibi',         status:'Aktif',  color:'#0d9488' },
  { id:'25202', kelasId:'mdn-2', nama:'Izza Nur Faizah',         gender:'P', lahir:'Tulungagung, 15 Jul 2011',waliSantri:'Bpk. Faiz',          status:'Aktif',  color:'#7c3aed' },
  { id:'25203', kelasId:'mdn-2', nama:'Junaidi Rahman',          gender:'L', lahir:'Nganjuk, 09 Nov 2011',   waliSantri:'Bpk. Rahman',         status:'Aktif',  color:'#2563eb' },
  { id:'25204', kelasId:'mdn-2', nama:'Khoirunnisa Putri',       gender:'P', lahir:'Kediri, 22 Jan 2011',    waliSantri:'Bpk. Khoir',          status:'Aktif',  color:'#16a34a' },
  { id:'25205', kelasId:'mdn-2', nama:'Lutfi Hakim',             gender:'L', lahir:'Blitar, 30 Agu 2011',    waliSantri:'Bpk. Hakim Jr.',      status:'Aktif',  color:'#d4a056' },
  // Madin Kelas Ulya
  { id:'25301', kelasId:'mdn-3', nama:'Mifta Khairul',           gender:'L', lahir:'Kediri, 06 Mar 2010',    waliSantri:'Bpk. Khairul',        status:'Aktif',  color:'#0d9488' },
  { id:'25302', kelasId:'mdn-3', nama:'Nurul Hikmah',            gender:'P', lahir:'Nganjuk, 19 Jun 2010',   waliSantri:'Bpk. Hikmah',         status:'Aktif',  color:'#7c3aed' },
  { id:'25303', kelasId:'mdn-3', nama:'Omar Faruq',              gender:'L', lahir:'Kediri, 11 Sep 2010',    waliSantri:'Bpk. Faruq',          status:'Aktif',  color:'#2563eb' },
  { id:'25304', kelasId:'mdn-3', nama:'Pita Rahmawati',          gender:'P', lahir:'Tulungagung, 27 Des 2010',waliSantri:'Bpk. Rahmat',        status:'Aktif',  color:'#16a34a' },
  { id:'25305', kelasId:'mdn-3', nama:'Qodir Billah',            gender:'L', lahir:'Blitar, 14 Feb 2010',    waliSantri:'Bpk. Billah',         status:'Aktif',  color:'#d4a056' },
];

export function getInitials(nama) {
  return nama.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function g(uasP, uasT, deltaP = 4, deltaT = 4) {
  return {
    UAS: { p: uasP, t: uasT },
    UTS: { p: Math.max(60, uasP - deltaP), t: Math.max(60, uasT - deltaT) },
  };
}

const GRADES_RAW = {
  // --- TPQ KELAS 1 ---
  '24101': { tahsin:g(90,88), tajwid:g(85,83), tahfidz:g(92,90), doa:g(88,86), ibadah:g(88,85), imla:g(88,84) },
  '24102': { tahsin:g(93,91), tajwid:g(90,88), tahfidz:g(94,92), doa:g(91,89), ibadah:g(90,88), imla:g(90,89) },
  '24103': { tahsin:g(82,78), tajwid:g(80,76), tahfidz:g(84,82), doa:g(82,80), ibadah:g(78,76), imla:g(80,78) },
  '24104': { tahsin:g(88,86), tajwid:g(84,82), tahfidz:g(88,86), doa:g(86,84), ibadah:g(85,83), imla:g(85,83) },
  '24105': { tahsin:g(78,76), tajwid:g(76,72), tahfidz:g(80,78), doa:g(78,76), ibadah:g(74,72), imla:g(76,74) },
  '24106': { tahsin:g(94,92), tajwid:g(91,90), tahfidz:g(95,93), doa:g(93,92), ibadah:g(91,90), imla:g(92,91) },
  '24107': { tahsin:g(86,84), tajwid:g(83,81), tahfidz:g(87,85), doa:g(84,82), ibadah:g(83,81), imla:g(83,81) },
  // --- TPQ KELAS 2 ---
  '24201': { tahsin:g(84,82), tajwid:g(80,78), tahfidz:g(84,82), doa:g(82,80), ibadah:g(80,78), imla:g(82,80) },
  '24202': { tahsin:g(88,86), tajwid:g(84,82), tahfidz:g(88,86), doa:g(85,83), ibadah:g(84,82), imla:g(84,82) },
  '24203': { tahsin:g(80,78), tajwid:g(78,76), tahfidz:g(82,80), doa:g(80,78), ibadah:g(78,76), imla:g(80,78) },
  '24204': { tahsin:g(82,80), tajwid:g(80,78), tahfidz:g(84,82), doa:g(82,80), ibadah:g(80,78), imla:g(80,78) },
  '24205': { tahsin:g(86,84), tajwid:g(82,80), tahfidz:g(86,84), doa:g(84,82), ibadah:g(82,80), imla:g(84,82) },
  '24206': { tahsin:g(76,74), tajwid:g(74,72), tahfidz:g(78,76), doa:g(76,74), ibadah:g(74,72), imla:g(76,74) },
  '24207': { tahsin:g(86,84), tajwid:g(82,80), tahfidz:g(86,84), doa:g(84,82), ibadah:g(84,82), imla:g(84,82) },
  // --- TPQ KELAS 3 (from mockup data) ---
  '24301': { tahsin:g(90,88,4,5), tajwid:g(85,82,3,4), tahfidz:g(92,90,4,4), doa:g(88,86,4,4), ibadah:g(84,80,4,4), imla:g(86,84,4,4) },
  '24302': { tahsin:g(94,92,4,5), tajwid:g(90,88,4,4), tahfidz:g(95,93,4,5), doa:g(92,90,4,4), ibadah:g(89,87,4,4), imla:g(91,90,4,5) },
  '24303': { tahsin:g(80,76,4,4), tajwid:g(78,74,4,4), tahfidz:g(84,80,4,4), doa:g(82,80,4,4), ibadah:null,          imla:g(79,77,4,4) },
  '24304': { tahsin:g(86,84,4,4), tajwid:g(82,80,4,4), tahfidz:g(88,85,3,4), doa:g(84,83,4,4), ibadah:g(80,78,4,4), imla:g(83,81,4,4) },
  '24305': { tahsin:g(88,86,4,4), tajwid:g(85,84,4,4), tahfidz:g(90,88,4,4), doa:g(87,86,4,4), ibadah:g(85,83,4,4), imla:g(86,85,4,4) },
  '24306': { tahsin:g(76,72,4,4), tajwid:g(74,70,4,4), tahfidz:g(80,76,4,4), doa:g(78,75,4,4), ibadah:g(75,72,4,4), imla:g(77,74,4,4) },
  '24307': { tahsin:g(92,90,4,4), tajwid:g(88,87,4,4), tahfidz:g(93,91,4,4), doa:g(90,89,4,4), ibadah:g(88,86,4,4), imla:g(90,88,4,4) },
  // --- TPQ KELAS 4 ---
  '24401': { tahsin:g(82,80), tajwid:g(78,76), tahfidz:g(84,82), doa:g(80,78), ibadah:g(80,78), imla:g(80,78) },
  '24402': { tahsin:g(80,78), tajwid:g(76,74), tahfidz:g(82,80), doa:g(78,76), ibadah:g(76,74), imla:g(78,76) },
  '24403': { tahsin:g(84,82), tajwid:g(80,78), tahfidz:g(84,82), doa:g(82,80), ibadah:g(80,78), imla:g(82,80) },
  '24404': { tahsin:g(76,74), tajwid:g(74,72), tahfidz:g(78,76), doa:g(76,74), ibadah:g(74,72), imla:g(76,74) },
  '24405': { tahsin:g(84,82), tajwid:g(80,78), tahfidz:g(84,82), doa:g(82,80), ibadah:g(82,80), imla:g(82,80) },
  '24406': { tahsin:g(78,76), tajwid:g(76,74), tahfidz:g(80,78), doa:g(78,76), ibadah:g(76,74), imla:g(78,76) },
  '24407': { tahsin:g(82,80), tajwid:g(80,78), tahfidz:g(84,82), doa:g(82,80), ibadah:g(80,78), imla:g(82,80) },
  // --- TPQ KELAS 5 ---
  '24501': { tahsin:g(88,86), tajwid:g(84,82), tahfidz:g(90,88), doa:g(86,84), ibadah:g(86,84), imla:g(86,84) },
  '24502': { tahsin:g(90,88), tajwid:g(86,84), tahfidz:g(90,88), doa:g(88,86), ibadah:g(88,86), imla:g(88,86) },
  '24503': { tahsin:g(84,82), tajwid:g(80,78), tahfidz:g(86,84), doa:g(84,82), ibadah:g(82,80), imla:g(84,82) },
  '24504': { tahsin:g(92,90), tajwid:g(88,86), tahfidz:g(92,90), doa:g(90,88), ibadah:g(90,88), imla:g(90,88) },
  '24505': { tahsin:g(86,84), tajwid:g(82,80), tahfidz:g(88,86), doa:g(86,84), ibadah:g(84,82), imla:g(86,84) },
  '24506': { tahsin:g(88,86), tajwid:g(84,82), tahfidz:g(88,86), doa:g(86,84), ibadah:g(86,84), imla:g(86,84) },
  '24507': { tahsin:g(82,80), tajwid:g(80,78), tahfidz:g(84,82), doa:g(82,80), ibadah:g(80,78), imla:g(82,80) },
  // --- TPQ KELAS 6 ---
  '24601': { tahsin:g(86,84), tajwid:g(82,80), tahfidz:g(86,84), doa:g(84,82), ibadah:g(84,82), imla:g(84,82) },
  '24602': { tahsin:g(88,86), tajwid:g(84,82), tahfidz:g(88,86), doa:g(86,84), ibadah:g(86,84), imla:g(86,84) },
  '24603': { tahsin:g(84,82), tajwid:g(80,78), tahfidz:g(84,82), doa:g(82,80), ibadah:g(82,80), imla:g(82,80) },
  '24604': { tahsin:g(88,86), tajwid:g(84,82), tahfidz:g(88,86), doa:g(86,84), ibadah:g(86,84), imla:g(86,84) },
  '24605': { tahsin:g(80,78), tajwid:g(78,76), tahfidz:g(82,80), doa:g(80,78), ibadah:g(78,76), imla:g(80,78) },
  '24606': { tahsin:g(86,84), tajwid:g(82,80), tahfidz:g(86,84), doa:g(84,82), ibadah:g(84,82), imla:g(84,82) },
  '24607': { tahsin:g(82,80), tajwid:g(80,78), tahfidz:g(84,82), doa:g(82,80), ibadah:g(80,78), imla:g(80,78) },
  // --- MADIN KELAS ULA ---
  '25101': { fiqih:g(88,86), akidah:g(85,83), quran:g(88,86), nahwu:g(82,80), tarikh:g(84,82), bahasa:g(84,82) },
  '25102': { fiqih:g(92,90), akidah:g(88,86), quran:g(90,88), nahwu:g(84,82), tarikh:g(86,84), bahasa:g(88,86) },
  '25103': { fiqih:g(84,82), akidah:g(82,80), quran:g(84,82), nahwu:g(80,78), tarikh:g(80,78), bahasa:g(82,80) },
  '25104': { fiqih:g(90,88), akidah:g(87,85), quran:g(90,88), nahwu:g(84,82), tarikh:g(86,84), bahasa:g(88,86) },
  '25105': { fiqih:g(80,78), akidah:g(78,76), quran:g(80,78), nahwu:g(76,74), tarikh:g(78,76), bahasa:g(78,76) },
  // --- MADIN KELAS WUSTHO ---
  '25201': { fiqih:g(86,84), akidah:g(84,82), quran:g(86,84), nahwu:g(82,80), tarikh:g(82,80), bahasa:g(84,82) },
  '25202': { fiqih:g(90,88), akidah:g(88,86), quran:g(90,88), nahwu:g(86,84), tarikh:g(86,84), bahasa:g(88,86) },
  '25203': { fiqih:g(84,82), akidah:g(82,80), quran:g(84,82), nahwu:g(80,78), tarikh:g(80,78), bahasa:g(82,80) },
  '25204': { fiqih:g(88,86), akidah:g(86,84), quran:g(88,86), nahwu:g(84,82), tarikh:g(84,82), bahasa:g(86,84) },
  '25205': { fiqih:g(82,80), akidah:g(80,78), quran:g(82,80), nahwu:g(78,76), tarikh:g(78,76), bahasa:g(80,78) },
  // --- MADIN KELAS ULYA ---
  '25301': { fiqih:g(90,88), akidah:g(88,86), quran:g(90,88), nahwu:g(86,84), tarikh:g(86,84), bahasa:g(88,86) },
  '25302': { fiqih:g(94,92), akidah:g(90,88), quran:g(92,90), nahwu:g(88,86), tarikh:g(88,86), bahasa:g(90,88) },
  '25303': { fiqih:g(86,84), akidah:g(84,82), quran:g(86,84), nahwu:g(82,80), tarikh:g(82,80), bahasa:g(84,82) },
  '25304': { fiqih:g(88,86), akidah:g(86,84), quran:g(88,86), nahwu:g(84,82), tarikh:g(84,82), bahasa:g(86,84) },
  '25305': { fiqih:g(84,82), akidah:g(82,80), quran:g(84,82), nahwu:g(80,78), tarikh:g(80,78), bahasa:g(82,80) },
};

export function calcRata(gradeEntry) {
  if (!gradeEntry) return null;
  return Math.round((gradeEntry.p + gradeEntry.t) / 2 * 10) / 10;
}

export function calcNilaiAkhir(studentGrades, mapelList, periode) {
  if (!studentGrades) return null;
  const ratas = mapelList.map(m => {
    const entry = studentGrades[m.id]?.[periode];
    return entry ? (entry.p + entry.t) / 2 : null;
  }).filter(v => v !== null);
  if (ratas.length === 0) return null;
  return Math.round(ratas.reduce((a, b) => a + b, 0) / ratas.length * 10) / 10;
}

export function getPredikat(nilai) {
  if (nilai === null) return null;
  if (nilai >= 90) return { label: 'Mumtāz', cls: 'p-mumtaz' };
  if (nilai >= 80) return { label: 'Jayyid Jiddan', cls: 'p-jayyidj' };
  if (nilai >= 70) return { label: 'Jayyid', cls: 'p-jayyid' };
  if (nilai >= 60) return { label: 'Maqbūl', cls: 'p-maqbul' };
  return { label: 'Rāsib', cls: 'p-rasib' };
}

export const INITIAL_DATA = {
  students: STUDENTS_RAW,
  grades: GRADES_RAW,
};
