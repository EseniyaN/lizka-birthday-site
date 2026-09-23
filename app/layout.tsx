import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "С днём рождения, Лизка!",
  description: "Персональная интерактивная 3D-открытка ко дню рождения.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
