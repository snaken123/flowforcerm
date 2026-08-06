"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push(searchParams.get("callbackUrl") ?? "/superadmin");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[#ccc]">Email</Label>
        <Input id="email" type="email" placeholder="you@flowforcerm.com" className="bg-[#1a1a1a] border-white/20 text-white placeholder:text-[#555] focus-visible:ring-white/30" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-[#ccc]">Password</Label>
        <Input id="password" type="password" placeholder="••••••••" className="bg-[#1a1a1a] border-white/20 text-white placeholder:text-[#555] focus-visible:ring-white/30" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>
    </form>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold uppercase tracking-widest text-white">FlowForceRM</h1>
          <p className="text-[#666] uppercase tracking-[0.2em] text-xs">Platform Control</p>
        </div>
        <Card className="bg-[#111] border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-white">Super Admin Sign In</CardTitle>
            <CardDescription className="text-[#666]">Platform-level access only</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-40" />}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
