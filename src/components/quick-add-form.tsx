"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createLeadAction } from "@/app/actions";
import { NextTouchChips } from "@/components/next-touch-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PHONE_OR_EMAIL_ERROR, type NextTouchPreset } from "@/lib/domain";
import { useServerAction } from "@/hooks/use-server-action";

export function QuickAddForm({ ownerName }: { ownerName: string }) {
  const router = useRouter();
  const { pending, run } = useServerAction();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicleInterest, setVehicleInterest] = useState("");
  const [nextTouch, setNextTouch] = useState<NextTouchPreset | "">("");
  const [contactError, setContactError] = useState<string | null>(null);

  function validateContact() {
    if (!phone.trim() && !email.trim()) {
      setContactError(PHONE_OR_EMAIL_ERROR);
      return false;
    }
    setContactError(null);
    return true;
  }

  function resetForm() {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setVehicleInterest("");
    setNextTouch("");
    setContactError(null);
  }

  function submit(addAnother: boolean) {
    if (!validateContact()) {
      toast.error(PHONE_OR_EMAIL_ERROR);
      return;
    }
    run(
      () =>
        createLeadAction({
          firstName,
          lastName,
          phone,
          email,
          vehicleInterest,
          nextTouch,
        }),
      {
        refresh: addAnother,
        success: addAnother ? "Lead saved" : undefined,
        onSuccess: (data) => {
          if (addAnother) {
            resetForm();
            return;
          }
          router.push(`/leads/${data.id}`);
        },
      },
    );
  }

  return (
    <form
      className="space-y-5 px-4 py-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(false);
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" htmlFor="firstName">
          <Input
            id="firstName"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </Field>
        <Field label="Last name" htmlFor="lastName">
          <Input
            id="lastName"
            required
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </Field>
      </div>

      <Field label="Phone" htmlFor="phone">
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            if (contactError) setContactError(null);
          }}
        />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (contactError) setContactError(null);
          }}
        />
      </Field>
      {contactError ? (
        <p className="text-sm font-medium text-destructive">{contactError}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Phone or email required</p>
      )}

      <Field label="Vehicle interest" htmlFor="vehicle">
        <Input
          id="vehicle"
          placeholder="F-150 XLT, Bronco, Explorer…"
          value={vehicleInterest}
          onChange={(event) => setVehicleInterest(event.target.value)}
        />
      </Field>

      <p className="text-xs text-muted-foreground">Owner: {ownerName}</p>

      <NextTouchChips
        value={nextTouch}
        onChange={setNextTouch}
        emphasize
      />

      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="submit"
          size="lg"
          className="h-11 bg-[var(--ford-navy)] text-white hover:bg-[#00285c]"
          disabled={pending}
        >
          Save
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-11"
          disabled={pending}
          onClick={() => submit(true)}
        >
          Save & add another
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
