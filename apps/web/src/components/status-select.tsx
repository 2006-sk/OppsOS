"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_STATE_LABELS, USER_STATES } from "@/lib/enums";

export function StatusSelect({ opportunityId, status }: { opportunityId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      await fetch(`/api/opportunities/${opportunityId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      router.refresh();
    });
  }

  return (
    <Select defaultValue={status} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {USER_STATES.map((s) => (
          <SelectItem key={s} value={s}>
            {USER_STATE_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
