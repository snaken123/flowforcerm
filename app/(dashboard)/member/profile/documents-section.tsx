"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, BookOpen, BookMarked, ChevronDown, ChevronUp } from "lucide-react";

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
Website: www.flowforcerm.com`;

const DOCS = [
  {
    id: "waiver",
    label: "Liability Waiver",
    icon: FileText,
    type: "text" as const,
    content: WAIVER_TEXT,
  },
  {
    id: "privacy",
    label: "Privacy & Confidentiality",
    icon: Shield,
    type: "text" as const,
    content: PRIVACY_TEXT,
  },
  {
    id: "rules",
    label: "Gym Rules & Guidelines",
    icon: BookOpen,
    type: "pdf" as const,
    src: "/documents/gym-rules.pdf",
  },
  {
    id: "handbook",
    label: "Welcome Handbook",
    icon: BookMarked,
    type: "pdf" as const,
    src: "/documents/welcome-packet.pdf",
  },
];

function formatAgreedDate(date: string | Date | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export function DocumentsSection({ waiverDate, privacyAcceptedAt }: { waiverDate?: string | Date | null; privacyAcceptedAt?: string | Date | null }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const agreedDates: Record<string, string | null> = {
    waiver: formatAgreedDate(waiverDate),
    privacy: formatAgreedDate(privacyAcceptedAt),
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">My Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {DOCS.map((doc) => {
          const Icon = doc.icon;
          const isOpen = openId === doc.id;
          const agreedOn = agreedDates[doc.id] ?? null;
          return (
            <div key={doc.id} className="rounded-md border overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : doc.id)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{doc.label}</span>
                    {agreedOn && (
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">✓ Agreed on {agreedOn}</p>
                    )}
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {isOpen && (
                <div className="border-t">
                  {doc.type === "text" ? (
                    <div className="h-80 overflow-y-auto p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono text-foreground/80 bg-muted/20">
                      {doc.content}
                    </div>
                  ) : (
                    <iframe
                      src={doc.src}
                      className="w-full h-[500px]"
                      title={doc.label}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
