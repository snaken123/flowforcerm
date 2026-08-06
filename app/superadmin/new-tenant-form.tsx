"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const schema = z.object({
  gymName: z.string().min(2, "Required"),
  subdomain: z
    .string()
    .min(2, "Required")
    .max(32, "Too long")
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/, "Lowercase letters, numbers, hyphens only"),
  adminEmail: z.string().email("Invalid email"),
  adminName: z.string().min(2, "Required"),
});

type FormValues = z.infer<typeof schema>;

export function NewTenantForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ subdomain: string; adminEmail: string; tempPassword: string; emailSent: boolean } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Provisioning failed.");
        return;
      }
      setResult({
        subdomain: data.subdomain,
        adminEmail: data.adminEmail,
        tempPassword: body.tempPassword,
        emailSent: body.emailSent,
      });
      reset();
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-4 py-2 text-sm font-semibold"
      >
        + New Gym
      </button>
    );
  }

  if (result) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-6">
        <p className="text-emerald-400 font-semibold mb-3">
          {result.subdomain}.flowforcerm.com is live
        </p>
        {result.emailSent ? (
          <p className="text-sm text-[#888]">Activation email sent to {result.adminEmail}.</p>
        ) : (
          <div className="text-sm text-[#888] space-y-1">
            <p>Activation email could not be sent — share these credentials with the admin directly:</p>
            <p className="text-white">
              Email: <span className="font-mono">{result.adminEmail}</span>
            </p>
            <p className="text-white">
              Temp password: <span className="font-mono">{result.tempPassword}</span>
            </p>
          </div>
        )}
        <button
          onClick={() => {
            setResult(null);
            setOpen(false);
          }}
          className="mt-4 rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-4 py-2 text-sm font-semibold"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#111] p-6 mb-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-[#888]">Gym Name</label>
          <input
            {...register("gymName")}
            placeholder="Iron Fist BJJ"
            className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555]"
          />
          {errors.gymName && <p className="text-xs text-destructive">{errors.gymName.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#888]">Subdomain</label>
          <div className="flex items-center">
            <input
              {...register("subdomain")}
              placeholder="ironfist"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555]"
            />
            <span className="text-xs text-[#555] ml-2 whitespace-nowrap">.flowforcerm.com</span>
          </div>
          {errors.subdomain && <p className="text-xs text-destructive">{errors.subdomain.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#888]">Admin Name</label>
          <input
            {...register("adminName")}
            placeholder="Jane Dela Cruz"
            className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555]"
          />
          {errors.adminName && <p className="text-xs text-destructive">{errors.adminName.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#888]">Admin Email</label>
          <input
            {...register("adminEmail")}
            placeholder="jane@ironfist.com"
            className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555]"
          />
          {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail.message}</p>}
        </div>

        {error && (
          <div className="col-span-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="col-span-2 flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="px-4 py-2 text-sm text-[#888] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Provisioning…" : "Create Gym"}
          </button>
        </div>
      </form>
    </div>
  );
}
