import { AreaShell } from "@/components/area-shell";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AreaShell role="admin">{children}</AreaShell>;
}
