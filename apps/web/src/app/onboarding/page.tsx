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
import {
  CATEGORIES,
  CATEGORY_LABELS,
  EDUCATION_LEVELS,
  EDUCATION_LEVEL_LABELS,
  INTERESTS,
  INTEREST_LABELS,
  type EducationLevel,
} from "@/lib/enums";

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

const STEPS = [
  { title: "About you", description: "So we know which opportunities can even apply to you." },
  { title: "Where you're based", description: "Many opportunities are restricted by country." },
  { title: "What interests you", description: "Pick everything relevant — this drives your fit score." },
  { title: "Your preferences", description: "Last step — how you like to work, and what you can afford." },
];

function Stepper({ step }: { step: number }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s.title} className="flex flex-1 items-center gap-2">
          <div
            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
              i < step
                ? "bg-zinc-900 text-white"
                : i === step
                  ? "border-2 border-zinc-900 text-zinc-900"
                  : "border border-zinc-300 text-zinc-400"
            }`}
          >
            {i < step ? "✓" : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px flex-1 ${i < step ? "bg-zinc-900" : "bg-zinc-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel>("high_school");
  const [grade, setGrade] = useState("10");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [collegeYear, setCollegeYear] = useState("2");
  const [major, setMajor] = useState("");
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

  const isSchoolLevel = educationLevel === "middle_school" || educationLevel === "high_school";
  const isUndergraduate = educationLevel === "undergraduate";
  const isLastStep = step === STEPS.length - 1;

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function validateStep(s: number): string | null {
    if (s === 0 && name.trim().length === 0) return "Enter your name.";
    if (s === 1 && country.trim().length === 0) return "Enter your country.";
    if (s === 2 && interests.length === 0) return "Pick at least one interest.";
    if (s === 3 && categories.length === 0) return "Pick at least one competition type.";
    return null;
  }

  function goNext() {
    const validationError = validateStep(step);
    if (validationError) return setError(validationError);
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateStep(step);
    if (validationError) return setError(validationError);
    setError(null);

    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          educationLevel,
          grade: isSchoolLevel ? Number(grade) : null,
          dateOfBirth: dateOfBirth || null,
          collegeYear: isUndergraduate ? Number(collegeYear) : null,
          major: isUndergraduate ? major || null : null,
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
          <Stepper step={step} />
          <CardTitle className="text-2xl font-semibold tracking-tight">{STEPS[step].title}</CardTitle>
          <CardDescription>{STEPS[step].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={isLastStep ? onSubmit : (e) => e.preventDefault()}
            className="space-y-8"
          >
            {step === 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="educationLevel">Education level</Label>
                  <Select
                    value={educationLevel}
                    onValueChange={(v) => v && setEducationLevel(v as EducationLevel)}
                  >
                    <SelectTrigger id="educationLevel" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {EDUCATION_LEVEL_LABELS[level]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isSchoolLevel && (
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
                )}

                {isUndergraduate && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="collegeYear">College year</Label>
                      <Select value={collegeYear} onValueChange={(v) => v && setCollegeYear(v)}>
                        <SelectTrigger id="collegeYear" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 6 }, (_, i) => i + 1).map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              Year {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="major">Major/field of study</Label>
                      <Input
                        id="major"
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        placeholder="e.g. Computer Science"
                      />
                    </div>
                  </>
                )}

                <div className={isSchoolLevel || isUndergraduate ? "space-y-2" : "col-span-2 space-y-2"}>
                  <Label htmlFor="dateOfBirth">Date of birth (optional)</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">
                    Many competitions gate eligibility by age, not grade/year — without this we can&apos;t
                    confirm you qualify for those.
                  </p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="school">
                    {isUndergraduate ? "College/university (optional)" : "School (optional)"}
                  </Label>
                  <Textarea id="school" value={school} onChange={(e) => setSchool(e.target.value)} rows={1} />
                </div>
              </div>
            )}

            {step === 2 && (
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
            )}

            {step === 3 && (
              <>
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
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-3">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={goBack} disabled={loading}>
                  Back
                </Button>
              )}
              {isLastStep ? (
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Saving…" : "Finish"}
                </Button>
              ) : (
                <Button type="button" className="flex-1" onClick={goNext}>
                  Next
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
