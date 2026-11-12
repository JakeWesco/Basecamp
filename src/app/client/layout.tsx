import { AreaShell } from "@/components/area-shell";

export default function ClientLayout({ children }: LayoutProps<"/client">) {
  return <AreaShell role="client">{children}</AreaShell>;
}
