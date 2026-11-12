"use client";

import { useState, useTransition } from "react";
import { buttonClasses, Card, Input, Toggle, useToast } from "@/components/ui";
import { setPlannerEnabled } from "./actions";

/** The public hunt planner: on or off, and the link to share. */
export function PlannerCard({ enabled, url }: { enabled: boolean; url: string }) {
  const toast = useToast();
  const [on, setOn] = useState(enabled);
  const [busy, start] = useTransition();

  function change(next: boolean) {
    start(async () => {
      const r = await setPlannerEnabled(next);
      if (r.ok) {
        setOn(next);
        toast({ title: r.message ?? "Saved" });
      } else toast({ title: "Not saved", description: r.error, tone: "error" });
    });
  }

  return (
    <Card
      title="Hunt planner"
      description="A page where hunters describe the hunt they want, in English, German, Polish, Spanish or French, and get up to three packages priced from your price list. If they like one, it arrives in Leads with their details."
    >
      <div className="flex flex-col gap-6">
        <div className="max-w-sm">
          <Toggle key={String(on)} label="Planner page is on" defaultChecked={on} loading={busy} onCheckedChange={change} />
        </div>
        {on && (
          <div className="flex flex-col gap-4">
            <Input label="Link to share" readOnly value={url} onFocus={(e) => e.currentTarget.select()} hint="Put it on your website, in emails and in WhatsApp messages." />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={buttonClasses({ variant: "secondary", size: "sm" })}
                onClick={() => navigator.clipboard.writeText(url).then(() => toast({ title: "Link copied" }))}
              >
                Copy link
              </button>
              <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "ghost", size: "sm" })}>
                Open the page
              </a>
            </div>
          </div>
        )}
        <p className="text-sm text-muted">
          Each plan uses the AI service, which costs a few cents. To keep the bill small, a visitor can plan 8 hunts an hour and the page answers 300 plans a day.
        </p>
      </div>
    </Card>
  );
}
