"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchUserAction } from "@/app/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Person = { id: string; name: string };

export function UserSwitcher({
  people,
  currentUserId,
}: {
  people: Person[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const currentName =
    people.find((person) => person.id === currentUserId)?.name ?? "Salesperson";

  return (
    <Select
      value={currentUserId}
      onValueChange={(id) => {
        if (!id || id === currentUserId) return;
        startTransition(async () => {
          await switchUserAction(id);
          router.refresh();
        });
      }}
      disabled={pending}
    >
      <SelectTrigger
        size="sm"
        className="h-8 max-w-[11rem] border-white/20 bg-white/10 text-white hover:bg-white/15"
        aria-label="On the floor as"
      >
        <SelectValue>{currentName}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false}>
        {people.map((person) => (
          <SelectItem key={person.id} value={person.id}>
            {person.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
