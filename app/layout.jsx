import "./globals.css";

export const metadata = {
  title: "Raport Online Pesantren — TPQ & Madin",
  description:
    "Sistem Raport Online untuk pesantren: rekap nilai, manajemen santri, input nilai, dan cetak raport untuk TPQ & Madin.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
