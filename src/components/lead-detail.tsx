"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  MoreHorizontal,
  Phone,
  Mail,
  MessageSquare,
  NotebookPen,
} from "lucide-react";
import {
  addNoteAction,
  completeTaskAction,
  logCallAction,
  logTestDriveAction,
  markLostOrDeadAction,
  markSoldAction,
  reassignOwnerAction,
  rescheduleAppointmentAction,
  scheduleAppointmentAction,
  sendMessageAction,
  setNextTaskAction,
  setOptOutAction,
  updateAppointmentStatusAction,
  updateVehicleInterestAction,
} from "@/app/actions";
import { NextTouchChips } from "@/components/next-touch-chips";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import {
  DEAD_REASON_CHIPS,
  LOST_REASON_CHIPS,
  canMarkLostOrDead,
  canMarkSold,
  formatPhone,
  isTerminal,
  leadDisplayName,
  taskTypeLabel,
  telHref,
  type NextTouchPreset,
} from "@/lib/domain";
import {
  formatDateTime,
  formatRelativeDue,
  fromDatetimeLocalValue,
  isOverdue,
  toDatetimeLocalValue,
} from "@/lib/time";
import type { ActivityType, AppointmentStatus, LeadStatus, TaskType } from "@prisma/client";

type Person = { id: string; name: string };

export type LeadDetailModel = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  vehicleInterest: string | null;
  status: LeadStatus;
  lostReason: string | null;
  ownerId: string;
  owner: Person;
  smsOptOut: boolean;
  emailOptOut: boolean;
  nextTask: {
    id: string;
    title: string;
    type: TaskType;
    dueAt: string;
  } | null;
  openAppointment: {
    id: string;
    scheduledAt: string;
    status: AppointmentStatus;
    notes: string | null;
  } | null;
  linkableAppointments: Array<{
    id: string;
    scheduledAt: string;
    status: AppointmentStatus;
  }>;
  activities: Array<{
    id: string;
    type: ActivityType;
    body: string;
    createdAt: string;
    actorName: string;
  }>;
  salespeople: Person[];
  currentUserId: string;
};

export function LeadDetail({ lead }: { lead: LeadDetailModel }) {
  const { pending, run } = useServerAction();
  const name = leadDisplayName(lead);
  const callHref = telHref(lead.phone);

  const [vehicle, setVehicle] = useState(lead.vehicleInterest ?? "");
  const [compose, setCompose] = useState<null | "SMS" | "EMAIL" | "LOG">(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState<null | "LOST" | "DEAD">(null);
  const [apptOpen, setApptOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const [nextOpen, setNextOpen] = useState(false);

  const optedOut =
    (lead.smsOptOut && compose === "SMS") ||
    (lead.emailOptOut && compose === "EMAIL");

  return (
    <div className="flex flex-1 flex-col pb-24">
      <div className="sticky top-[4.75rem] z-30 flex items-center gap-2 border-b border-border bg-[var(--app-bg)] px-2 py-2">
        <Button variant="ghost" size="icon" render={<Link href="/" />} aria-label="Back to Today">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1 text-sm font-medium">Lead</div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" aria-label="More actions" />}
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setReassignOpen(true)}>
              Reassign owner
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setApptOpen(true)}>
              Set appointment
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDriveOpen(true)}>
              Log test drive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canMarkSold(lead.status) ? (
              <DropdownMenuItem
                onClick={() =>
                  run(() => markSoldAction(lead.id), { success: "Marked sold" })
                }
              >
                Mark sold
              </DropdownMenuItem>
            ) : null}
            {canMarkLostOrDead(lead.status) ? (
              <>
                <DropdownMenuItem onClick={() => setLostOpen("LOST")}>
                  Mark lost
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLostOpen("DEAD")}>
                  Mark dead
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                run(
                  () =>
                    setOptOutAction({
                      leadId: lead.id,
                      channel: "SMS",
                      optedOut: !lead.smsOptOut,
                    }),
                  {
                    success: lead.smsOptOut
                      ? "SMS opt-in restored"
                      : "SMS opt-out saved",
                  },
                )
              }
            >
              {lead.smsOptOut ? "Allow texts" : "Opt out of texts"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run(
                  () =>
                    setOptOutAction({
                      leadId: lead.id,
                      channel: "EMAIL",
                      optedOut: !lead.emailOptOut,
                    }),
                  {
                    success: lead.emailOptOut
                      ? "Email opt-in restored"
                      : "Email opt-out saved",
                  },
                )
              }
            >
              {lead.emailOptOut ? "Allow email" : "Opt out of email"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-4 px-4 py-4">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
            <StatusBadge status={lead.status} />
          </div>
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setReassignOpen(true)}
          >
            Owner · {lead.owner.name}
          </button>
          <div className="flex flex-col gap-1">
            {lead.phone ? (
              callHref ? (
                <a
                  href={callHref}
                  className="inline-flex items-center gap-2 text-base font-medium text-[var(--ford-navy)]"
                >
                  <Phone className="size-4" />
                  {formatPhone(lead.phone)}
                </a>
              ) : (
                <span className="text-base">{formatPhone(lead.phone)}</span>
              )
            ) : (
              <span className="text-sm text-muted-foreground">No phone</span>
            )}
            {lead.email ? (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Mail className="size-4" />
                {lead.email}
              </a>
            ) : null}
          </div>
          {lead.lostReason ? (
            <p className="text-sm text-rose-800">Reason: {lead.lostReason}</p>
          ) : null}
        </header>

        {lead.smsOptOut || lead.emailOptOut ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {lead.smsOptOut && lead.emailOptOut
              ? "Opted out of texts and email. Log a call or add a note instead."
              : lead.smsOptOut
                ? "Opted out of texts. Sends are blocked. Log a call or add a note."
                : "Opted out of email. Sends are blocked. Log a call or add a note."}
          </div>
        ) : null}

        <section className="space-y-2">
          <Label htmlFor="vehicleInterest">Vehicle interest</Label>
          <div className="flex gap-2">
            <Input
              id="vehicleInterest"
              value={vehicle}
              onChange={(event) => setVehicle(event.target.value)}
              placeholder="Free text — F-150, Bronco…"
            />
            <Button
              variant="outline"
              disabled={pending || vehicle === (lead.vehicleInterest ?? "")}
              onClick={() =>
                run(
                  () => updateVehicleInterestAction(lead.id, vehicle),
                  { success: "Vehicle interest saved" },
                )
              }
            >
              Save
            </Button>
          </div>
        </section>

        <NextTaskCard
          lead={lead}
          pending={pending}
          onComplete={() =>
            lead.nextTask
              ? run(
                  () => completeTaskAction(lead.nextTask!.id, lead.id),
                  { success: "Task done" },
                )
              : undefined
          }
          onChange={() => setNextOpen(true)}
        />

        {lead.openAppointment ? (
          <AppointmentCard
            appointment={lead.openAppointment}
            pending={pending}
            onShowed={() =>
              run(
                () =>
                  updateAppointmentStatusAction({
                    appointmentId: lead.openAppointment!.id,
                    leadId: lead.id,
                    status: "SHOWED",
                  }),
                { success: "Marked showed" },
              )
            }
            onNoShow={() =>
              run(
                () =>
                  updateAppointmentStatusAction({
                    appointmentId: lead.openAppointment!.id,
                    leadId: lead.id,
                    status: "NO_SHOW",
                  }),
                { success: "No-show · Working + Call — rebook" },
              )
            }
            onCancel={() =>
              run(
                () =>
                  updateAppointmentStatusAction({
                    appointmentId: lead.openAppointment!.id,
                    leadId: lead.id,
                    status: "CANCELLED",
                  }),
                { success: "Appointment cancelled" },
              )
            }
            onReschedule={() => setRescheduleOpen(true)}
            onLogDrive={() => setDriveOpen(true)}
          />
        ) : null}

        <section className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Timeline
          </h2>
          {lead.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ol className="space-y-3">
              {lead.activities.map((item) => (
                <li key={item.id} className="rounded-lg border border-border bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {activityLabel(item.type)}
                    </span>
                    <span>{formatDateTime(new Date(item.createdAt))}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{item.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.actorName}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2 px-4 py-3">
          <Button
            size="lg"
            className="h-11 bg-[var(--ford-navy)] text-white hover:bg-[#00285c]"
            onClick={() => setCompose("SMS")}
          >
            <MessageSquare data-icon="inline-start" />
            Text
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11"
            onClick={() => setCompose("EMAIL")}
          >
            <Mail data-icon="inline-start" />
            Email
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11"
            onClick={() => setCompose("LOG")}
          >
            <NotebookPen data-icon="inline-start" />
            Log
          </Button>
        </div>
      </div>

      <ComposeSheet
        open={compose === "SMS" || compose === "EMAIL"}
        channel={compose === "EMAIL" ? "EMAIL" : "SMS"}
        optedOut={Boolean(optedOut)}
        lead={lead}
        pending={pending}
        onOpenChange={(open) => {
          if (!open) setCompose(null);
        }}
        onSend={(payload) =>
          run(() => sendMessageAction(payload), {
            success: payload.channel === "SMS" ? "Text sent (stub)" : "Email sent (stub)",
            onSuccess: () => setCompose(null),
          })
        }
      />

      <LogSheet
        open={compose === "LOG"}
        pending={pending}
        onOpenChange={(open) => {
          if (!open) setCompose(null);
        }}
        onCall={(note) =>
          run(() => logCallAction({ leadId: lead.id, note }), {
            success: "Call logged",
            onSuccess: () => setCompose(null),
          })
        }
        onNote={(note) =>
          run(() => addNoteAction({ leadId: lead.id, note }), {
            success: "Note added",
            onSuccess: () => setCompose(null),
          })
        }
      />

      <ReassignDialog
        open={reassignOpen}
        people={lead.salespeople}
        currentOwnerId={lead.ownerId}
        pending={pending}
        onOpenChange={setReassignOpen}
        onSave={(ownerId) =>
          run(() => reassignOwnerAction({ leadId: lead.id, ownerId }), {
            success: (data) => data.toast,
            onSuccess: () => setReassignOpen(false),
          })
        }
      />

      <LostDialog
        kind={lostOpen}
        pending={pending}
        onOpenChange={(open) => {
          if (!open) setLostOpen(null);
        }}
        onSave={(reason) =>
          lostOpen
            ? run(
                () =>
                  markLostOrDeadAction({
                    leadId: lead.id,
                    status: lostOpen,
                    reason,
                  }),
                {
                  success: lostOpen === "LOST" ? "Marked lost" : "Marked dead",
                  onSuccess: () => setLostOpen(null),
                },
              )
            : undefined
        }
      />

      <AppointmentDialog
        open={apptOpen}
        pending={pending}
        onOpenChange={setApptOpen}
        onSave={(scheduledAt, notes) =>
          run(
            () =>
              scheduleAppointmentAction({
                leadId: lead.id,
                scheduledAt,
                notes,
              }),
            {
              success: "Appointment set",
              onSuccess: () => setApptOpen(false),
            },
          )
        }
      />

      <RescheduleDialog
        open={rescheduleOpen}
        defaultValue={
          lead.openAppointment
            ? toDatetimeLocalValue(new Date(lead.openAppointment.scheduledAt))
            : ""
        }
        pending={pending}
        onOpenChange={setRescheduleOpen}
        onSave={(scheduledAt) =>
          lead.openAppointment
            ? run(
                () =>
                  rescheduleAppointmentAction({
                    appointmentId: lead.openAppointment!.id,
                    leadId: lead.id,
                    scheduledAt,
                  }),
                {
                  success: "Rescheduled",
                  onSuccess: () => setRescheduleOpen(false),
                },
              )
            : undefined
        }
      />

      <TestDriveDialog
        open={driveOpen}
        lead={lead}
        pending={pending}
        onOpenChange={setDriveOpen}
        onSave={(input) =>
          run(() => logTestDriveAction(input), {
            success: "Test drive logged",
            onSuccess: () => setDriveOpen(false),
          })
        }
      />

      <NextTouchDialog
        open={nextOpen}
        pending={pending}
        onOpenChange={setNextOpen}
        onSave={(preset) =>
          run(
            () => setNextTaskAction({ leadId: lead.id, preset }),
            {
              success: preset === "skip" ? "Skipped next touch" : "Next touch set",
              onSuccess: () => setNextOpen(false),
            },
          )
        }
      />
    </div>
  );
}

function NextTaskCard({
  lead,
  pending,
  onComplete,
  onChange,
}: {
  lead: LeadDetailModel;
  pending: boolean;
  onComplete?: () => void;
  onChange: () => void;
}) {
  if (isTerminal(lead.status) && !lead.nextTask) {
    return (
      <section className="rounded-xl border border-border bg-white px-4 py-3">
        <h2 className="text-sm font-semibold">Next touch</h2>
        <p className="mt-1 text-sm text-muted-foreground">Closed — no open task</p>
      </section>
    );
  }

  const due = lead.nextTask ? new Date(lead.nextTask.dueAt) : null;

  return (
    <section className="rounded-xl border border-border bg-white px-4 py-3">
      <h2 className="text-sm font-semibold">Next touch</h2>
      {lead.nextTask && due ? (
        <>
          <p className="mt-1 text-base font-medium">
            {taskTypeLabel(lead.nextTask.type)} · {lead.nextTask.title}
          </p>
          <p className={isOverdue(due) ? "text-sm text-rose-700" : "text-sm text-muted-foreground"}>
            {formatRelativeDue(due)}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={pending} onClick={onComplete}>
              Done
            </Button>
            <Button size="sm" variant="outline" onClick={onChange}>
              Change
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">No open next task</p>
          <Button size="sm" className="mt-3" variant="outline" onClick={onChange}>
            Set next touch
          </Button>
        </>
      )}
    </section>
  );
}

function AppointmentCard({
  appointment,
  pending,
  onShowed,
  onNoShow,
  onCancel,
  onReschedule,
  onLogDrive,
}: {
  appointment: NonNullable<LeadDetailModel["openAppointment"]>;
  pending: boolean;
  onShowed: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  onReschedule: () => void;
  onLogDrive: () => void;
}) {
  const showed = appointment.status === "SHOWED";
  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
      <h2 className="text-sm font-semibold">Appointment</h2>
      <p className="mt-1 text-base font-medium">
        {formatDateTime(new Date(appointment.scheduledAt))}
      </p>
      {appointment.notes ? (
        <p className="text-sm text-muted-foreground">{appointment.notes}</p>
      ) : null}
      {appointment.status === "SCHEDULED" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" disabled={pending} onClick={onShowed}>
            Showed
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={onNoShow}>
            No-show
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" variant="outline" onClick={onReschedule}>
            Reschedule
          </Button>
        </div>
      ) : null}
      {showed ? (
        <Button size="sm" className="mt-3" onClick={onLogDrive}>
          Log test drive
        </Button>
      ) : null}
    </section>
  );
}

function ComposeSheet({
  open,
  channel,
  optedOut,
  lead,
  pending,
  onOpenChange,
  onSend,
}: {
  open: boolean;
  channel: "SMS" | "EMAIL";
  optedOut: boolean;
  lead: LeadDetailModel;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (input: {
    leadId: string;
    channel: "SMS" | "EMAIL";
    body: string;
    subject?: string;
  }) => void;
}) {
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const to = channel === "SMS" ? lead.phone : lead.email;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh]">
        <SheetHeader>
          <SheetTitle>{channel === "SMS" ? "Text" : "Email"}</SheetTitle>
          <SheetDescription>
            Stub send — audited, no carrier. To: {to || "missing"}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4">
          {optedOut ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Customer opted out. Send is blocked. Use Log call or Add note.
            </div>
          ) : null}
          {channel === "EMAIL" ? (
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder={`Jess Ford — ${leadDisplayName(lead)}`}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              rows={5}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                channel === "SMS"
                  ? "Hey — this is Garrett at Jess Ford…"
                  : "Quick note from the sales floor…"
              }
            />
          </div>
        </div>
        <SheetFooter>
          <Button
            className="h-11 bg-[var(--ford-navy)] text-white hover:bg-[#00285c]"
            disabled={pending || optedOut || !to || !body.trim()}
            onClick={() =>
              onSend({
                leadId: lead.id,
                channel,
                body,
                subject: subject || undefined,
              })
            }
          >
            Send {channel === "SMS" ? "text" : "email"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function LogSheet({
  open,
  pending,
  onOpenChange,
  onCall,
  onNote,
}: {
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onCall: (note: string) => void;
  onNote: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Log</SheetTitle>
          <SheetDescription>
            Call and notes still work when the customer is opted out.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-2 px-4">
          <Label htmlFor="log-note">Note</Label>
          <Textarea
            id="log-note"
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Left voicemail, talked numbers, etc."
          />
        </div>
        <SheetFooter>
          <Button
            className="h-11"
            disabled={pending || !note.trim()}
            onClick={() => onCall(note)}
          >
            Log call
          </Button>
          <Button
            variant="outline"
            className="h-11"
            disabled={pending || !note.trim()}
            onClick={() => onNote(note)}
          >
            Add note
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ReassignDialog({
  open,
  people,
  currentOwnerId,
  pending,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  people: Person[];
  currentOwnerId: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (ownerId: string) => void;
}) {
  const [ownerId, setOwnerId] = useState(currentOwnerId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign owner</DialogTitle>
          <DialogDescription>
            Open tasks move with the lead. You stay on this page.
          </DialogDescription>
        </DialogHeader>
        <Select value={ownerId} onValueChange={(value) => value && setOwnerId(value)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {people.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                {person.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button disabled={pending} onClick={() => onSave(ownerId)}>
            Save owner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LostDialog({
  kind,
  pending,
  onOpenChange,
  onSave,
}: {
  kind: "LOST" | "DEAD" | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const chips = kind === "DEAD" ? DEAD_REASON_CHIPS : LOST_REASON_CHIPS;
  return (
    <Dialog open={kind !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{kind === "DEAD" ? "Mark dead" : "Mark lost"}</DialogTitle>
          <DialogDescription>Reason required. Open tasks will be cancelled.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`rounded-full border px-3 py-1 text-sm ${
                reason === chip
                  ? "border-[var(--ford-navy)] bg-[var(--ford-navy)] text-white"
                  : "border-border"
              }`}
              onClick={() => setReason(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lost-reason">Reason</Label>
          <Input
            id="lost-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Required"
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={pending || !reason.trim()}
            onClick={() => onSave(reason)}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentDialog({
  open,
  pending,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (scheduledAt: string, notes?: string) => void;
}) {
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setWhen(toDatetimeLocalValue(tomorrow));
          setNotes("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set appointment</DialogTitle>
          <DialogDescription>Moves the lead to Appt set.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="appt-when">When</Label>
          <Input
            id="appt-when"
            type="datetime-local"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="appt-notes">Notes</Label>
          <Input
            id="appt-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            disabled={pending || !when}
            onClick={() =>
              onSave(fromDatetimeLocalValue(when).toISOString(), notes)
            }
          >
            Save appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RescheduleDialog({
  open,
  defaultValue,
  pending,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  defaultValue: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (scheduledAt: string) => void;
}) {
  const [when, setWhen] = useState(defaultValue);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setWhen(defaultValue);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule</DialogTitle>
        </DialogHeader>
        <Input
          type="datetime-local"
          value={when}
          onChange={(event) => setWhen(event.target.value)}
        />
        <DialogFooter>
          <Button
            disabled={pending || !when}
            onClick={() => onSave(fromDatetimeLocalValue(when).toISOString())}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestDriveDialog({
  open,
  lead,
  pending,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  lead: LeadDetailModel;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    leadId: string;
    vehicle: string;
    occurredAt: string;
    note?: string;
    appointmentId?: string;
  }) => void;
}) {
  const [vehicle, setVehicle] = useState(lead.vehicleInterest ?? "");
  const [when, setWhen] = useState(toDatetimeLocalValue(new Date()));
  const [note, setNote] = useState("");
  const [appointmentId, setAppointmentId] = useState<string>("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setVehicle(lead.vehicleInterest ?? "");
          setWhen(toDatetimeLocalValue(new Date()));
          setNote("");
          setAppointmentId(lead.openAppointment?.id ?? "");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log test drive</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="td-vehicle">Vehicle</Label>
          <Input
            id="td-vehicle"
            value={vehicle}
            onChange={(event) => setVehicle(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="td-when">When</Label>
          <Input
            id="td-when"
            type="datetime-local"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="td-note">Note</Label>
          <Textarea
            id="td-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        {lead.linkableAppointments.length > 0 ? (
          <div className="space-y-1.5">
            <Label>Link to appointment</Label>
            <Select
              value={appointmentId || "none"}
              onValueChange={(value) =>
                setAppointmentId(!value || value === "none" ? "" : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No appointment</SelectItem>
                {lead.linkableAppointments.map((appt) => (
                  <SelectItem key={appt.id} value={appt.id}>
                    {formatDateTime(new Date(appt.scheduledAt))} · {appt.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <DialogFooter>
          <Button
            disabled={pending || !vehicle.trim() || !when}
            onClick={() =>
              onSave({
                leadId: lead.id,
                vehicle,
                occurredAt: fromDatetimeLocalValue(when).toISOString(),
                note,
                appointmentId: appointmentId || undefined,
              })
            }
          >
            Save test drive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NextTouchDialog({
  open,
  pending,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (preset: NextTouchPreset) => void;
}) {
  const [preset, setPreset] = useState<NextTouchPreset | "">("");
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setPreset("");
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Next touch</DialogTitle>
          <DialogDescription>One open next-task per lead.</DialogDescription>
        </DialogHeader>
        <NextTouchChips value={preset} onChange={setPreset} />
        <DialogFooter>
          <Button disabled={pending || !preset} onClick={() => preset && onSave(preset)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function activityLabel(type: ActivityType) {
  switch (type) {
    case "LEAD_CREATED":
      return "Created";
    case "NOTE":
      return "Note";
    case "CALL":
      return "Call";
    case "SMS":
      return "Text";
    case "EMAIL":
      return "Email";
    case "STATUS_CHANGE":
      return "Status";
    case "OWNER_CHANGE":
      return "Owner";
    case "TASK_CREATED":
      return "Next touch";
    case "TASK_COMPLETED":
      return "Task done";
    case "TASK_CANCELLED":
      return "Task cancelled";
    case "APPOINTMENT":
      return "Appointment";
    case "TEST_DRIVE":
      return "Test drive";
  }
}
