"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/enums";

const DEADLINE_OPTIONS = [
  { value: "all", label: "Any deadline" },
  { value: "30", label: "Next 30 days" },
  { value: "90", label: "Next 90 days" },
  { value: "later", label: "Later" },
  { value: "none", label: "No deadline published" },
];

const DIFFICULTY_OPTIONS = [
  { value: "all", label: "Any difficulty" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "extreme", label: "Extreme" },
];

const TEAM_OPTIONS = [
  { value: "all", label: "Individual or team" },
  { value: "individual", label: "Individual" },
  { value: "team", label: "Team" },
  { value: "either", label: "Supports either" },
];

const FREE_PAID_OPTIONS = [
  { value: "all", label: "Free or paid" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

const SAVED_OPTIONS = [
  { value: "all", label: "All" },
  { value: "saved", label: "Saved" },
  { value: "not_saved", label: "Not saved" },
];

export function OpportunityFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const handle = setTimeout(() => setParam("search", search), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Search by name, organization, or category…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Select defaultValue={searchParams.get("category") ?? "all"} onValueChange={(v) => setParam("category", v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue={searchParams.get("deadline") ?? "all"} onValueChange={(v) => setParam("deadline", v)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Deadline" />
          </SelectTrigger>
          <SelectContent>
            {DEADLINE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          defaultValue={searchParams.get("difficulty") ?? "all"}
          onValueChange={(v) => setParam("difficulty", v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue={searchParams.get("team") ?? "all"} onValueChange={(v) => setParam("team", v)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            {TEAM_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          defaultValue={searchParams.get("freePaid") ?? "all"}
          onValueChange={(v) => setParam("freePaid", v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Free/Paid" />
          </SelectTrigger>
          <SelectContent>
            {FREE_PAID_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue={searchParams.get("saved") ?? "all"} onValueChange={(v) => setParam("saved", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Saved" />
          </SelectTrigger>
          <SelectContent>
            {SAVED_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
