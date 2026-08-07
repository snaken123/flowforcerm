import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { Users, Calendar, Award, Shield, Palette, Server, ArrowRight } from "lucide-react";
import { ContactForm } from "./contact-form";

export default async function RootPage() {
  const session = await getAuthSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">

      {/* Nav */}
      <nav className="flex items-center justify-center px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="FlowForceRM" className="h-10 w-10 object-contain rounded-full" />
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 pt-20 pb-28 text-center">
        <div className="flex justify-center mb-10">
          <div className="h-28 w-28 rounded-full overflow-hidden opacity-90">
            <img src="/logo.png" alt="" className="h-full w-full object-contain" />
          </div>
        </div>
        <h1 className="text-6xl sm:text-7xl font-bold tracking-tight leading-none mb-4">
          FlowForceRM<br />
          <span className="text-[#888]">Manage Less. Train More.</span>
        </h1>
        <p className="text-lg text-[#666] max-w-xl mx-auto mb-10 tracking-wide">
          The gym management platform built for martial arts studios — your own branded portal,
          fully hosted and managed, so you can focus on training athletes instead of running software.
        </p>
        <a
          href="#contact"
          className="inline-flex items-center gap-2 rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-8 py-3 text-base font-semibold tracking-wide"
        >
          Get Started <ArrowRight className="h-4 w-4" />
        </a>
      </section>

      {/* Divider */}
      <div className="border-t border-white/10 max-w-6xl mx-auto" />

      {/* Why FlowForceRM */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-[#555] text-center mb-12">Why Gym Owners Choose FlowForceRM</p>
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 bg-white/10 rounded-xl overflow-hidden border border-white/10">
          {[
            { icon: Palette, title: "Your Own Branded Portal", desc: "Your logo, your colors, your gym's identity — not a generic template." },
            { icon: Server, title: "Fully Hosted & Managed", desc: "No servers to run, no software to install. We handle hosting, backups, and updates." },
            { icon: Shield, title: "Your Data, Isolated", desc: "Every gym gets its own private database — never shared or mixed with anyone else's." },
            { icon: Users, title: "Athlete & Member Management", desc: "Profiles, ranks, belts, stripes, and full membership history in one place." },
            { icon: Calendar, title: "Class Scheduling & Check-Ins", desc: "Weekly calendars, coach assignments, capacity limits, and attendance tracking." },
            { icon: Award, title: "Built for Martial Arts", desc: "Rank and belt progression for BJJ, Muay Thai, Judo, MMA, and more — not a generic gym app." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#0d0d0d] p-8 hover:bg-[#151515] transition-colors">
              <Icon className="h-5 w-5 text-[#666] mb-4" />
              <h3 className="font-semibold text-base mb-2 tracking-wide uppercase">{title}</h3>
              <p className="text-sm text-[#555] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="max-w-2xl mx-auto px-8 pb-24 scroll-mt-8">
        <div className="rounded-xl border border-white/10 bg-[#111] p-8 sm:p-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3 uppercase tracking-wide">Ready to Train?</h2>
            <p className="text-[#666] tracking-wide">Tell us about your gym and we'll set you up — no self-serve signup, just a quick conversation.</p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-sm text-[#444] tracking-wide">
        © {new Date().getFullYear()} FlowForceRM · All rights reserved
      </footer>
    </div>
  );
}
