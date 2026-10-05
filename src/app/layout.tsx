import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Geo Fare Gap",
  description:
    "See how flight, hotel and activity prices change by country — TinyFish browser agents open the same booking page through 7 country proxies and compare the price each location is shown.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
