"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, CATEGORY_LABELS, INTERESTS, INTEREST_LABELS } from "@/lib/enums";

function ChipToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
        checked
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} className="sr-only" />
      {label}
    </label>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("10");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [school, setSchool] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [teamPreference, setTeamPreference] = useState("either");
  const [hoursPerWeek, setHoursPerWeek] = useState("5");
  const [budgetMax, setBudgetMax] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (interests.length === 0) return setError("Pick at least one interest.");
    if (categories.length === 0) return setError("Pick at least one competition type.");

    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          grade: Number(grade),
          country,
          state: state || null,
          city: city || null,
          school: school || null,
          interests,
          preferredCategories: categories,
          teamPreference,
          hoursPerWeek: Number(hoursPerWeek),
          budgetMax: budgetMax ? Number(budgetMax) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push("/opportunities");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">Tell us about you</CardTitle>
          <CardDescription>
            This shapes which opportunities we surface and how we score fit for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Select value={grade} onValueChange={(v) => v && setGrade(v)}>
                  <SelectTrigger id="grade" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                      <SelectItem key={g} value={String(g)}>
                        Grade {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" required value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/City (optional)</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="sr-only">
                  City
                </Label>
                <Input id="city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="school">School (optional)</Label>
                <Textarea id="school" value={school} onChange={(e) => setSchool(e.target.value)} rows={1} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Main interests</Label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <ChipToggle
                    key={i}
                    label={INTEREST_LABELS[i]}
                    checked={interests.includes(i)}
                    onChange={() => toggle(interests, setInterests, i)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred competition types</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <ChipToggle
                    key={c}
                    label={CATEGORY_LABELS[c]}
                    checked={categories.includes(c)}
                    onChange={() => toggle(categories, setCategories, c)}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamPreference">Individual/team preference</Label>
                <Select value={teamPreference} onValueChange={(v) => v && setTeamPreference(v)}>
                  <SelectTrigger id="teamPreference" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="either">Either</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">Hours available per week</Label>
                <Input
                  id="hours"
                  type="number"
                  min={0}
                  max={80}
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="budget">Budget for entry fees, max (optional, INR)</Label>
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  placeholder="e.g. 2000"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
