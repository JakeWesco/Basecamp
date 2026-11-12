"use client";

import { useState } from "react";
import { Button, Card, Input, Select, Toggle, useToast } from "@/components/ui";

export function InteractiveDemo() {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  function save() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Price list saved", description: "Quotes now use the new prices.", tone: "success" });
    }, 1500);
  }

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-3xl">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="cta">Send quote</Button>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button loading={saving} loadingLabel="Saving…" onClick={save}>
            Save (shows loading, then a toast)
          </Button>
          <Button disabled>Disabled</Button>
          <Button size="sm" variant="ghost">
            Small
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast({ title: "Could not save", description: "Check your connection.", tone: "error" })}
          >
            Error toast
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-3xl">Form fields</h2>
        <Card>
          <div className="grid gap-6 sm:grid-cols-2">
            <Input label="Animal" placeholder="e.g. Kudu" />
            <Input label="Trophy fee" numeric defaultValue="2,400" hint="In the outfitter's currency." />
            <Select
              label="Region"
              placeholder="Choose a region"
              options={[
                { value: "lp", label: "Limpopo" },
                { value: "nc", label: "Northern Cape" },
              ]}
            />
            <Input label="Daily rate" numeric error="Enter an amount above zero." defaultValue="0" />
            <Toggle label="Show on quotes" description="Hidden prices stay in the list." defaultChecked />
            <Toggle label="Saving…" loading />
          </div>
        </Card>
      </section>
    </>
  );
}
