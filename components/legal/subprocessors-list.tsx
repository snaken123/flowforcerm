import { Building2 } from "lucide-react";

export type SubprocessorInfo = {
  id: string;
  name: string;
  service: string;
  purpose: string;
  dataCategories: string;
  location: string | null;
  referenceUrl: string | null;
};

// Read-only, informational -- shown to every role. Content comes from the
// superadmin-managed registry (/superadmin/subprocessors), never editable here.
export function SubprocessorsList({ subprocessors }: { subprocessors: SubprocessorInfo[] }) {
  if (subprocessors.length === 0) return null;

  return (
    <div className="rounded-lg border p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-sm">Subprocessors</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Third-party services FlowForceRM uses to operate the platform.
      </p>
      <div className="space-y-2">
        {subprocessors.map((sp) => (
          <div key={sp.id} className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{sp.name}</span>
              <span className="text-xs text-muted-foreground">{sp.service}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{sp.purpose}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Data: {sp.dataCategories}{sp.location ? ` · Location: ${sp.location}` : ""}
            </p>
            {sp.referenceUrl && (
              <a href={sp.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                {sp.referenceUrl}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
