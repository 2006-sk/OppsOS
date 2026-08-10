"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SaveButton({ opportunityId, initialSaved }: { opportunityId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    setSaved((s) => !s);
    startTransition(async () => {
      const res = await fetch(`/api/opportunities/${opportunityId}/save`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSaved(data.saved);
      } else {
        setSaved((s) => !s);
      }
    });
  }

  return (
    <Button
      type="button"
      variant={saved ? "default" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={isPending}
      className="gap-1.5"
    >
      {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
