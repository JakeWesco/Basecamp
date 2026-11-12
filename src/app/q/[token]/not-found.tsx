import { Card } from "@/components/ui";
import { Receipt } from "@/components/ui/icons";

/** A share link that is wrong or was turned off. */
export default function QuoteNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-24">
      <Card>
        <div className="flex flex-col gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-sand-tint text-olive">
            <Receipt className="size-6" />
          </span>
          <h1 className="text-3xl">This quote link doesn&apos;t work</h1>
          <p className="text-muted">It may have been turned off, or part of the link is missing. Ask your outfitter to send it again.</p>
        </div>
      </Card>
    </main>
  );
}
