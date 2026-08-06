import { SuperAdminProviders } from "./providers";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminProviders>{children}</SuperAdminProviders>;
}
