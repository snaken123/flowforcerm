// Shared "how did you hear about us?" options — used by the admin dropdown, the
// member-facing required-source modal, and (implicitly) server-side validation.
export const MEMBER_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "Facebook", label: "Facebook" },
  { value: "Instagram", label: "Instagram" },
  { value: "TikTok", label: "TikTok" },
  { value: "Google", label: "Google" },
  { value: "Referral", label: "Referral (friend/family)" },
  { value: "Walk-in", label: "Walk-in" },
  { value: "Flyer / Poster", label: "Flyer / Poster" },
  { value: "Other", label: "Other" },
];
