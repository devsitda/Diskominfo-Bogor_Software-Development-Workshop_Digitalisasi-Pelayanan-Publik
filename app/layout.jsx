import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Layanan Publik",
  description: "Sistem Layanan Publik Mobile Responsive",
  icons: {
    icon: '/favicon.png', // path dari /public
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
  referrerpolicy="no-referrer"
/>

      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
