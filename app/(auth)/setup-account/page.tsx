"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Eye, EyeOff, CheckCircle2, ChevronDown, Loader2, Shield, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = [
  { id: "password", label: "Set Password",   icon: Shield },
  { id: "waiver",   label: "Liability Waiver", icon: FileText },
  { id: "privacy",  label: "Privacy Policy",  icon: Shield },
  { id: "welcome",  label: "Welcome",         icon: BookOpen },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// ── Full document text ──────────────────────────────────────────────────────

const WAIVER_TEXT = `FlowForceRM
Assumption of Risk, Waiver of Liability, Release, and Electronic Consent Agreement
Effective Date: July 2, 2026

Welcome to FlowForceRM ("NSFS").

Martial arts, combat sports, fitness training, and related activities involve inherent risks that cannot be completely eliminated, regardless of the care taken by coaches, staff, or participants. Before participating in any activity at NSFS, you must carefully read and agree to this Agreement.

By selecting "I Agree" within the FlowForceRM app, creating an account, purchasing a membership, booking a class, or participating in any activity, you acknowledge that you have read, understood, and voluntarily agree to the terms of this Agreement.

1. Acknowledgement of Risk

I understand and acknowledge that participation in Brazilian Jiu-Jitsu, Judo, Boxing, Muay Thai, Wrestling, Mixed Martial Arts, Yoga, Strength and Conditioning, Fitness Classes, Open Mat Sessions, Sparring, Competitions, Seminars, Personal Training, and all other activities conducted by NSFS involves inherent risks.

These risks include, but are not limited to:
• Bruises and cuts
• Sprains and strains
• Muscle injuries
• Broken bones
• Joint injuries
• Concussions
• Dental injuries
• Eye injuries
• Neck and spinal injuries
• Permanent disability
• Serious illness
• Death

I further understand that these injuries may result from accidents, contact with other participants, equipment failure, my own actions, the actions of others, or conditions within the training environment.

I voluntarily choose to participate despite these known and unknown risks.

2. Assumption of Risk

I knowingly and voluntarily assume full responsibility for all risks associated with my participation.

I accept full responsibility for any injury, illness, loss, damage, or death that may occur while:
• Training
• Attending classes
• Participating in competitions
• Using gym equipment
• Participating in seminars
• Using locker rooms or common areas
• Attending gym-sponsored events
• Being present anywhere on NSFS premises

3. Medical Fitness

I represent that I am physically and mentally fit to participate.

I have not been advised by a physician to refrain from strenuous physical activity.

I agree to immediately inform coaches of any injury, illness, medical condition, or physical limitation that may affect my ability to train safely.

If I become injured during training, I will immediately stop participating and notify a coach.

4. Release of Liability

To the fullest extent permitted by law, I release and forever discharge FlowForceRM, its owners, directors, officers, employees, coaches, instructors, volunteers, affiliates, and representatives from any and all liability arising from my participation.

This release includes claims arising from:
• Personal injury
• Property damage
• Loss of income
• Medical expenses
• Disability
• Wrongful death
• Any other damages arising from participation

This release applies whether such claims arise from ordinary negligence or otherwise, except where prohibited by applicable law or where liability results from gross negligence, willful misconduct, or fraud.

5. Emergency Medical Treatment

If I become injured or require medical assistance, I authorize NSFS to seek emergency medical treatment on my behalf when reasonable efforts to contact my emergency contact are unsuccessful or immediate action is necessary.

I understand that I am solely responsible for all medical expenses incurred.

6. Personal Property

I understand that I am responsible for my personal belongings.

NSFS is not responsible for lost, stolen, or damaged personal property, including vehicles, equipment, electronics, jewelry, or other valuables.

7. Conduct

I agree to follow all gym rules, instructor directions, safety requirements, and codes of conduct.

Failure to comply may result in:
• Removal from class
• Suspension
• Membership termination

No refund shall be required where membership is terminated due to violations of gym policies.

8. Photography and Video

I acknowledge that photographs and videos may be taken during classes, competitions, seminars, and gym events.

I understand that media may be used for:
• Marketing
• Social media
• Website content
• Educational purposes
• Promotional materials

I grant NSFS a perpetual, worldwide, royalty-free license to use images or recordings in which I appear, without compensation.

9. Minors

If this Agreement is accepted on behalf of a minor, I certify that I am the minor's parent or legal guardian.

I consent to the minor's participation in all approved activities and agree to all terms contained in this Agreement on behalf of the minor.

I accept responsibility for the minor's conduct and participation.

10. Indemnification

I agree to indemnify and hold harmless FlowForceRM from any claims, damages, costs, legal fees, or liabilities arising from my actions, misconduct, or violation of gym policies.

11. Electronic Consent

I understand that selecting "I Agree" constitutes my electronic signature.

I agree that this electronic acceptance has the same legal force and effect as a handwritten signature under applicable Philippine laws governing electronic transactions.

The electronic record maintained by FlowForceRM shall serve as proof of my acceptance of this Agreement.

12. Severability

If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.

13. Governing Law

This Agreement shall be governed by and interpreted in accordance with the laws of the Republic of the Philippines.

Any dispute arising from this Agreement shall be subject to the jurisdiction of the appropriate courts located within the Philippines.

14. Entire Agreement

This Agreement, together with the FlowForceRM Membership Terms, Gym Rules, and Privacy Policy, constitutes the entire agreement relating to participation in FlowForceRM activities.

Electronic Acknowledgement

By selecting "I Agree", I acknowledge that:
• I have carefully read this Agreement in its entirety.
• I understand the risks associated with martial arts and fitness training.
• I voluntarily assume those risks.
• I release FlowForceRM from liability to the fullest extent permitted by law.
• I understand that this Agreement is legally binding.
• I understand that my electronic acceptance is equivalent to my handwritten signature.
• If accepting on behalf of a minor, I certify that I am the parent or legal guardian and have authority to bind the minor to this Agreement.`;

const PRIVACY_TEXT = `FlowForceRM Privacy and Confidentiality Agreement
Effective Date: July 2, 2026

Welcome to FlowForceRM ("NSFS," "we," "our," or "us").

We respect your privacy and are committed to protecting your personal information in accordance with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173). This Privacy and Confidentiality Agreement explains how we collect, use, store, and protect your information.

By creating an account, purchasing a membership, registering for classes, or selecting "I Agree" within the FlowForceRM app or website, you acknowledge that you have read, understood, and agree to this Privacy and Confidentiality Agreement.

1. Information We Collect

Depending on the services you use, we may collect:
• Full name
• Date of birth
• Gender
• Home address
• Mobile number
• Email address
• Emergency contact details
• Membership information
• Attendance history
• Payment and billing information
• Competition registration information
• Belt rank and training history
• Medical information voluntarily disclosed that may affect your training
• Photographs and videos
• CCTV footage
• Device and application usage information necessary for operating our online services

2. How We Use Your Information

Your information may be used to:
• Create and manage your membership
• Schedule and manage classes
• Process payments
• Verify your identity
• Contact you regarding your membership
• Notify you of schedule changes and gym announcements
• Register you for competitions when requested
• Respond to emergencies
• Improve our coaching and member services
• Maintain gym security
• Comply with applicable laws and regulations
• Send promotional offers, newsletters, and event announcements (you may opt out of marketing communications at any time)

3. Competition Registration

If you authorize FlowForceRM to register you for tournaments, seminars, or affiliated events, we may share only the information required by organizers, including:
• Name
• Age
• Date of birth
• Belt rank
• Weight class
• Team affiliation
• Contact information when required

Information is shared solely for registration and event administration.

4. Communications

By becoming a member, you consent to receiving communications related to your membership through email, SMS, phone calls, push notifications, or messaging platforms used by NSFS.

These communications may include:
• Class schedules
• Membership reminders
• Billing notifications
• Gym announcements
• Event invitations
• Emergency notifications

Members may unsubscribe from promotional communications, although essential membership-related communications will continue.

5. Member Groups and Community Platforms

NSFS may use communication platforms such as Messenger, WhatsApp, Viber, TeamReach, or similar services to coordinate classes, events, and competitions.

By participating in these groups, you understand that your profile name, profile photo, and any information you choose to share may be visible to other participants according to the settings of the platform being used.

NSFS is not responsible for information voluntarily shared by members within these community platforms.

6. Photography and Video

Training sessions, competitions, seminars, and gym events may be photographed or recorded.

These images and videos may be used for:
• Social media
• Website content
• Advertising
• Promotional campaigns
• Educational materials
• Internal training

By agreeing to this policy, you grant NSFS permission to use photographs or videos in which you appear without compensation or further approval.

If you prefer not to appear in promotional materials, you may submit a written request. While we will make reasonable efforts to honor your request, we cannot guarantee exclusion from group photographs, public events, or incidental appearances.

7. CCTV

For the protection of members, guests, coaches, and staff, portions of the facility are monitored by CCTV.

Recordings may be used for:
• Security
• Incident investigations
• Safety monitoring
• Protection of property

CCTV footage is accessible only to authorized personnel unless disclosure is required by law.

Cameras are never installed inside restrooms or changing areas.

8. Confidentiality

Your personal information is treated as confidential.

We do not sell, rent, or intentionally disclose your information except:
• When required by law
• To payment processors
• To competition organizers with your authorization
• To emergency responders or medical professionals when necessary
• To insurance providers when applicable
• With your consent

9. Respect for Member Privacy

FlowForceRM is built on trust and mutual respect.

Members agree to respect the privacy of fellow members and shall not:
• Share another member's personal information without permission
• Record private coaching sessions without consent
• Photograph or video members who request not to be recorded
• Publish private conversations or incidents involving other members without their permission

Violation of this provision may result in disciplinary action or termination of membership.

10. Confidential Training Materials

Training curriculums, lesson plans, instructional videos, member-only content, coaching methodologies, and other proprietary materials developed or provided by NSFS remain the intellectual property of FlowForceRM.

Members agree not to reproduce, distribute, sell, or commercially exploit these materials without written permission.

This restriction does not prevent members from applying techniques learned during training.

11. Data Security

We implement reasonable administrative, physical, and technical safeguards to protect your information.

Although we strive to maintain secure systems, no electronic storage or internet transmission can be guaranteed to be completely secure.

12. Data Retention

We retain personal information only as long as reasonably necessary to:
• Maintain membership records
• Meet legal obligations
• Resolve disputes
• Enforce agreements
• Maintain historical training records

Information no longer required will be securely deleted or anonymized where appropriate.

13. Your Rights

Subject to applicable law, you may request to:
• Access your personal information
• Correct inaccurate information
• Update your contact details
• Withdraw consent where legally permitted
• Request deletion of information that is no longer required
• Inquire about how your personal information is being processed

Requests may be submitted through the contact information below.

14. Changes to this Agreement

FlowForceRM may modify this Privacy and Confidentiality Agreement at any time.

Material changes will be posted within the app and on our official website.

Continued use of our services after such changes constitutes acceptance of the updated Agreement.

Contact Us

FlowForceRM
89 Maharlika St., Brgy. San Antonio
San Pedro, Laguna 4023
Email: info@flowforcerm.com
Website: www.flowforcerm.com

Electronic Consent

By selecting "I Agree", creating an account, purchasing a membership, registering for classes, or continuing to use the FlowForceRM app or services, you acknowledge that:
• You have read and understood this Privacy and Confidentiality Agreement.
• You consent to the collection, use, storage, and processing of your personal information as described herein.
• You consent to electronic communications related to your membership.
• You consent to the use of your photographs or videos as described in this Agreement.
• You understand your rights under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173).
• If you are registering a minor, you represent that you are the parent or legal guardian and consent to the collection and processing of the minor's personal information, participation in classes, and use of photographs or videos as described in this Agreement.`;

// ── Helpers ─────────────────────────────────────────────────────────────────

function ScrollDocument({ text, onScrolled }: { text: string; onScrolled: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const notified = useRef(false);

  function handleScroll() {
    if (notified.current) return;
    const el = ref.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      notified.current = true;
      onScrolled();
    }
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-72 overflow-y-auto rounded-lg border bg-muted/30 p-5 text-sm leading-relaxed whitespace-pre-wrap font-mono text-foreground/80"
      >
        {text}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background/80 to-transparent pointer-events-none rounded-b-lg flex items-end justify-center pb-1">
        <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function SetupAccountPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const mustChangePassword = (session?.user as any)?.mustChangePassword ?? false;
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session !== undefined) {
      setCurrentStep(mustChangePassword ? 0 : 1);
    }
  }, [session, mustChangePassword]);

  const [error, setError] = useState("");

  // Password step state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Document scroll/agree state
  const [scrolled, setScrolled] = useState(false);
  const [agreed, setAgreed] = useState(false);

  function resetDocState() {
    setScrolled(false);
    setAgreed(false);
  }

  async function submit(step: StepId, extra?: object) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, ...extra }),
      });
      if (!res.ok) throw new Error("Something went wrong. Please try again.");
      if (currentStep !== null && currentStep < STEPS.length - 1) {
        setCurrentStep((s) => (s ?? 0) + 1);
        resetDocState();
      } else {
        await fetch("/api/auth/session");
        router.push("/member/athlete-id");
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (currentStep === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const step = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="FlowForceRM" className="h-9 w-9 rounded-full object-contain" />
            <div>
              <p className="font-bold text-sm leading-none">FlowForceRM</p>
              <p className="text-xs text-muted-foreground mt-0.5">Account Setup</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-muted/50 border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              if (i === 0 && !mustChangePassword) return null;
              const done = i < currentStep;
              const active = i === currentStep;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-2 flex-1 last:flex-none">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                      done ? "bg-emerald-500 text-white" :
                      active ? "bg-primary text-primary-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className={`text-xs hidden sm:block ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 mx-1 ${i < currentStep ? "bg-emerald-500" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-6">

          {/* ── Step 1: Password ── */}
          {step.id === "password" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Set your password</h1>
                <p className="text-muted-foreground mt-1">
                  Your account was created with a temporary password. Choose a new secure password to continue.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                onClick={() => submit("password", { newPassword })}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Set Password & Continue
              </Button>
            </div>
          )}

          {/* ── Step 2: Waiver ── */}
          {step.id === "waiver" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold">Liability Waiver</h1>
                <p className="text-muted-foreground mt-1">
                  Please read the full document below. Scroll to the bottom to accept.
                </p>
              </div>
              <ScrollDocument text={WAIVER_TEXT} onScrolled={() => setScrolled(true)} />
              <label className={`flex items-start gap-3 cursor-pointer ${!scrolled ? "opacity-40 pointer-events-none" : ""}`}>
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="text-sm">
                  I have read, understood, and voluntarily agree to the Assumption of Risk, Waiver of Liability, Release, and Electronic Consent Agreement. I understand this is legally binding.
                </span>
              </label>
              {!scrolled && (
                <p className="text-xs text-muted-foreground">↓ Scroll through the document to enable agreement</p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={loading || !agreed}
                onClick={() => submit("waiver")}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                I Agree & Accept
              </Button>
            </div>
          )}

          {/* ── Step 3: Privacy ── */}
          {step.id === "privacy" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold">Privacy & Confidentiality Agreement</h1>
                <p className="text-muted-foreground mt-1">
                  Please read the full document below. Scroll to the bottom to accept.
                </p>
              </div>
              <ScrollDocument text={PRIVACY_TEXT} onScrolled={() => setScrolled(true)} />
              <label className={`flex items-start gap-3 cursor-pointer ${!scrolled ? "opacity-40 pointer-events-none" : ""}`}>
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="text-sm">
                  I have read and understood the FlowForceRM Privacy and Confidentiality Agreement and consent to the collection and use of my personal information as described, in accordance with the Philippine Data Privacy Act of 2012.
                </span>
              </label>
              {!scrolled && (
                <p className="text-xs text-muted-foreground">↓ Scroll through the document to enable agreement</p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={loading || !agreed}
                onClick={() => submit("privacy")}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                I Agree & Accept
              </Button>
            </div>
          )}

          {/* ── Step 4: Welcome (informational) ── */}
          {step.id === "welcome" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Welcome to FlowForceRM! 🥋</h1>
                <p className="text-muted-foreground mt-1">
                  You're all set. Before you jump in, here are two resources available to you anytime in the app.
                </p>
              </div>

              <div className="space-y-4">
                {/* Gym Rules card */}
                <div className="rounded-xl border bg-muted/30 p-5 flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Gym Rules & Guidelines</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Our gym rules cover training etiquette, hygiene standards, equipment use, and conduct expectations. We encourage you to read them so you know what to expect on the mat.
                    </p>
                    <a
                      href="/documents/gym-rules.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      Read Gym Rules →
                    </a>
                  </div>
                </div>

                {/* Welcome Handbook card */}
                <div className="rounded-xl border bg-muted/30 p-5 flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Welcome Handbook</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      The welcome handbook gives you an overview of our programs, class structure, belt progression, and what to bring on your first day. A great starting point for new members.
                    </p>
                    <a
                      href="/documents/welcome-packet.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      Read Welcome Handbook →
                    </a>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                You can also find these documents anytime under <span className="font-medium">My Profile → Documents</span>.
              </p>

              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={loading}
                onClick={() => submit("welcome")}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enter the App
              </Button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
