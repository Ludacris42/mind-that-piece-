import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Mind That Piece — Finance & Health Suite",
  description: "Free UK tax calculator, benefits estimator, budget planner, currency converter, inflation calculator, and AI health predictor. Powered by Max your personal AI advisor.",
  keywords: "UK tax calculator, salary calculator, universal credit calculator, benefits calculator, budget planner, health predictor, AI financial advisor",
  manifest: "/manifest.json",
  themeColor: "#0A0E1A",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mind That Piece",
  },
  openGraph: {
    title: "Mind That Piece — Finance & Health Suite",
    description: "Tax, benefits, budget, currency, inflation & AI health tools — all free, all in one place.",
    type: "website",
    locale: "en_GB",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0E1A",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <link rel="icon" type="image/svg+xml" href="/icon-192.svg" />
        {/* Google AdSense — uncomment and replace ID when approved */}
        {/* <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossOrigin="anonymous"></script> */}
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0A0E1A" }}>
        {children}
      </body>
    </html>
  );
}
