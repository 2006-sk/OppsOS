"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CandidateActions({ candidateId, hasOpportunity }: { candidateId: string; hasOpportunity: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  function act(action: "accept" | "reject" | "merge") {
    startTransition(async () => {
      await fetch(`/api/admin/candidates/${candidateId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: note || undefined }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        placeholder="Note (optional, used for reject/merge)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="h-8 w-56 rounded-md border border-zinc-200 px-2 text-xs"
      />
      <Button size="sm" disabled={isPending || !hasOpportunity} onClick={() => act("accept")}>
        Accept
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("reject")}>
        Reject
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("merge")}>
        Merge duplicate
      </Button>
    </div>
  );
}
