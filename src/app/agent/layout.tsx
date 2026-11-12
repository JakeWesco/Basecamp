import { AreaShell } from "@/components/area-shell";

export default function AgentLayout({ children }: LayoutProps<"/agent">) {
  return <AreaShell role="agent">{children}</AreaShell>;
}
