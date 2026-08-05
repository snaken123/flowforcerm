export const metadata = { title: "Free Trial Registration — NorthSouth Fight Sports" };

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
