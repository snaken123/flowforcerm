export const metadata = {
  manifest: "/kiosk-manifest.json",
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden">{children}</div>;
}
