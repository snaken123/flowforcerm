import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import Link from "next/link";
import { Users, Calendar, BarChart3, Award, Clock, ArrowRight, Shield, Dumbbell } from "lucide-react";

export default async function RootPage() {
  const session = await getAuthSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/NS LOGO.png" alt="FlowForceRM" className="h-10 w-10 object-cover rounded-full" />
        </div>
        <Link
          href="/login"
          className="rounded-md border border-white/20 hover:bg-white hover:text-black transition-colors px-5 py-2 text-sm font-semibold tracking-wide"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 pt-24 pb-28 text-center">
        <div className="flex justify-center mb-10">
          <div className="h-28 w-28 rounded-full overflow-hidden opacity-90">
            <img src="/NS LOGO.png" alt="" className="h-full w-full object-cover scale-110" />
          </div>
        </div>
        <h1 className="text-6xl sm:text-7xl font-bold tracking-tight leading-none mb-4 uppercase">
          FlowForceRM<br />
          <span className="text-[#888]">Manage Less. Train More.</span>
        </h1>
        <p className="text-lg text-[#666] max-w-lg mx-auto mb-10 tracking-wide">
          Gym management built for martial arts — athletes, classes, schedules, ranks, and memberships in one system.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-8 py-3 text-base font-semibold tracking-wide"
        >
          Enter Portal <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Divider */}
      <div className="border-t border-white/10 max-w-6xl mx-auto" />

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-[#555] text-center mb-12">Everything You Need</p>
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 bg-white/10 rounded-xl overflow-hidden border border-white/10">
          {[
            { icon: Users,    title: "Athlete Profiles",    desc: "Track members, ranks, belts, stripes, photos, and full history." },
            { icon: Calendar, title: "Class Scheduling",    desc: "Time-based weekly calendar with coaches and capacity control." },
            { icon: Award,    title: "Rank Tracking",       desc: "Belt promotions for BJJ, Judo, and more with stripe records." },
            { icon: Clock,    title: "Attendance",          desc: "Log class check-ins and monitor session usage per membership." },
            { icon: Dumbbell, title: "Memberships",         desc: "Packages, session counts, freezes, and payment tracking." },
            { icon: Shield,   title: "Role-Based Access",   desc: "Admin, Staff, and Member roles with tailored views." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#0d0d0d] p-8 hover:bg-[#151515] transition-colors">
              <Icon className="h-5 w-5 text-[#666] mb-4" />
              <h3 className="font-semibold text-base mb-2 tracking-wide uppercase">{title}</h3>
              <p className="text-sm text-[#555] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-8 pb-24">
        <div className="rounded-xl border border-white/10 bg-[#111] p-12 text-center">
          <h2 className="text-3xl font-bold mb-3 uppercase tracking-wide">Ready to Train?</h2>
          <p className="text-[#666] mb-8 tracking-wide">Sign in to access the FlowForceRM management portal.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-8 py-3 font-semibold tracking-wide"
          >
            Sign In Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-sm text-[#444] tracking-wide">
        © {new Date().getFullYear()} FlowForceRM · All rights reserved
      </footer>
    </div>
  );
}
