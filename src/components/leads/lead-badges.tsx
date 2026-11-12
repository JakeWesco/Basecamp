import { Badge } from "@/components/ui";
import { TEMPERATURE_LABEL, type LeadStatus, type Temperature } from "@/lib/leads";

export function TemperatureBadge({ temperature }: { temperature: Temperature }) {
  const tone = temperature === "hot" ? "error" : temperature === "warm" ? "warning" : "neutral";
  return <Badge tone={tone}>{TEMPERATURE_LABEL[temperature]}</Badge>;
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  if (status === "quoted") return <Badge status="Quoted" />;
  if (status === "booked") return <Badge status="Booked" />;
  if (status === "lost") return <Badge status="Completed">Lost</Badge>;
  if (status === "contacted") return <Badge tone="success">Contacted</Badge>;
  return <Badge>New</Badge>;
}
