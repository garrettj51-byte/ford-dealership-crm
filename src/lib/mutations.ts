import type {
  ActivityType,
  AppointmentStatus,
  LeadStatus,
  Prisma,
  TaskType,
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import {
  REBOOK_TASK_TITLE,
  canMarkLostOrDead,
  canMarkSold,
  isTerminal,
  leadDisplayName,
  nextTouchFromPreset,
  promoteNewToWorking,
  requirePhoneOrEmail,
  type NextTouchPreset,
} from "@/lib/domain";
import { getMessageProvider } from "@/lib/messaging";
import { prisma } from "@/lib/prisma";
import { err, ok, type ActionResult } from "@/lib/types";

type Tx = Prisma.TransactionClient;

async function actor() {
  return getCurrentUser();
}

async function activity(
  tx: Tx,
  input: {
    leadId: string;
    actorId: string;
    type: ActivityType;
    body: string;
    metadata?: Record<string, unknown>;
  },
) {
  return tx.activity.create({
    data: {
      leadId: input.leadId,
      actorId: input.actorId,
      type: input.type,
      body: input.body,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

async function cancelOpenTasks(
  tx: Tx,
  leadId: string,
  actorId: string,
  reason: string,
) {
  const open = await tx.task.findMany({
    where: { leadId, status: "OPEN" },
  });
  if (open.length === 0) return;
  await tx.task.updateMany({
    where: { leadId, status: "OPEN" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  await activity(tx, {
    leadId,
    actorId,
    type: "TASK_CANCELLED",
    body: reason,
  });
}

async function createOpenTask(
  tx: Tx,
  input: {
    leadId: string;
    ownerId: string;
    actorId: string;
    type: TaskType;
    title: string;
    dueAt: Date;
    replaceExisting?: boolean;
  },
) {
  if (input.replaceExisting !== false) {
    await cancelOpenTasks(
      tx,
      input.leadId,
      input.actorId,
      "Replaced previous next touch",
    );
  }
  const task = await tx.task.create({
    data: {
      leadId: input.leadId,
      ownerId: input.ownerId,
      type: input.type,
      title: input.title,
      dueAt: input.dueAt,
      status: "OPEN",
    },
  });
  await activity(tx, {
    leadId: input.leadId,
    actorId: input.actorId,
    type: "TASK_CREATED",
    body: `Next: ${input.title}`,
    metadata: { taskId: task.id, type: input.type, dueAt: input.dueAt },
  });
  return task;
}

async function promoteIfNew(
  tx: Tx,
  lead: { id: string; status: LeadStatus },
  actorId: string,
) {
  const next = promoteNewToWorking(lead.status);
  if (next === lead.status) return lead.status;
  await tx.lead.update({
    where: { id: lead.id },
    data: { status: next },
  });
  await activity(tx, {
    leadId: lead.id,
    actorId,
    type: "STATUS_CHANGE",
    body: "New → Working",
    metadata: { from: lead.status, to: next },
  });
  return next;
}

function clean(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export async function createLead(input: {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  vehicleInterest?: string;
  nextTouch?: NextTouchPreset | "";
}): Promise<ActionResult<{ id: string }>> {
  const user = await actor();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    return err("First and last name required");
  }
  const phone = clean(input.phone);
  const email = clean(input.email);
  const contactError = requirePhoneOrEmail(phone, email);
  if (contactError) return err(contactError);

  const preset = input.nextTouch || undefined;
  const draft =
    preset && preset !== "skip"
      ? nextTouchFromPreset(preset as NextTouchPreset)
      : preset === "skip"
        ? null
        : null;

  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        firstName,
        lastName,
        phone,
        email,
        vehicleInterest: clean(input.vehicleInterest),
        status: "NEW",
        ownerId: user.id,
      },
    });
    await activity(tx, {
      leadId: created.id,
      actorId: user.id,
      type: "LEAD_CREATED",
      body: `${user.name} added ${leadDisplayName(created)}`,
    });
    if (draft) {
      await createOpenTask(tx, {
        leadId: created.id,
        ownerId: user.id,
        actorId: user.id,
        type: draft.type,
        title: draft.title,
        dueAt: draft.dueAt,
        replaceExisting: false,
      });
    }
    return created;
  });

  return ok({ id: lead.id });
}

export async function updateVehicleInterest(
  leadId: string,
  vehicleInterest: string,
): Promise<ActionResult> {
  const user = await actor();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return err("Lead not found");

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { vehicleInterest: clean(vehicleInterest) },
    });
    await activity(tx, {
      leadId,
      actorId: user.id,
      type: "NOTE",
      body: `Vehicle interest: ${clean(vehicleInterest) ?? "(cleared)"}`,
    });
  });
  return ok(undefined);
}

export async function updateLeadContact(input: {
  leadId: string;
  phone?: string;
  email?: string;
}): Promise<ActionResult> {
  await actor();
  const phone = clean(input.phone);
  const email = clean(input.email);
  const contactError = requirePhoneOrEmail(phone, email);
  if (contactError) return err(contactError);
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) return err("Lead not found");
  await prisma.lead.update({
    where: { id: input.leadId },
    data: { phone, email },
  });
  return ok(undefined);
}

export async function setNextTask(input: {
  leadId: string;
  preset?: NextTouchPreset;
  type?: TaskType;
  title?: string;
  dueAt?: string;
}): Promise<ActionResult> {
  const user = await actor();
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) return err("Lead not found");
  if (isTerminal(lead.status)) {
    return err("Closed leads cannot have a next touch");
  }

  const draft =
    input.preset && input.preset !== "skip"
      ? nextTouchFromPreset(input.preset)
      : input.dueAt
        ? {
            type: input.type ?? "FOLLOW_UP",
            title: input.title?.trim() || "Follow up",
            dueAt: new Date(input.dueAt),
          }
        : null;

  if (!draft) {
    if (input.preset === "skip") {
      await prisma.$transaction(async (tx) => {
        await cancelOpenTasks(tx, lead.id, user.id, "Skipped next touch");
      });
      return ok(undefined);
    }
    return err("Pick a next touch");
  }

  await prisma.$transaction(async (tx) => {
    await createOpenTask(tx, {
      leadId: lead.id,
      ownerId: lead.ownerId,
      actorId: user.id,
      type: draft.type,
      title: draft.title,
      dueAt: draft.dueAt,
    });
  });
  return ok(undefined);
}

export async function completeTask(taskId: string): Promise<ActionResult> {
  const user = await actor();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.status !== "OPEN") return err("Task not found");

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: { status: "DONE", completedAt: new Date() },
    });
    await activity(tx, {
      leadId: task.leadId,
      actorId: user.id,
      type: "TASK_COMPLETED",
      body: `Done: ${task.title}`,
    });
  });
  return ok(undefined);
}

export async function logCall(input: {
  leadId: string;
  note: string;
}): Promise<ActionResult> {
  const user = await actor();
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) return err("Lead not found");
  const note = input.note.trim();
  if (!note) return err("Add a call note");

  await prisma.$transaction(async (tx) => {
    await activity(tx, {
      leadId: lead.id,
      actorId: user.id,
      type: "CALL",
      body: note,
    });
    await promoteIfNew(tx, lead, user.id);
  });
  return ok(undefined);
}

export async function addNote(input: {
  leadId: string;
  note: string;
}): Promise<ActionResult> {
  const user = await actor();
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) return err("Lead not found");
  const note = input.note.trim();
  if (!note) return err("Add a note");

  await prisma.$transaction(async (tx) => {
    await activity(tx, {
      leadId: lead.id,
      actorId: user.id,
      type: "NOTE",
      body: note,
    });
    await promoteIfNew(tx, lead, user.id);
  });
  return ok(undefined);
}

export async function sendMessage(input: {
  leadId: string;
  channel: "SMS" | "EMAIL";
  body: string;
  subject?: string;
}): Promise<ActionResult<{ blocked?: boolean }>> {
  const user = await actor();
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) return err("Lead not found");

  const body = input.body.trim();
  if (!body) return err("Message cannot be empty");

  const to = input.channel === "SMS" ? lead.phone : lead.email;
  if (!to) {
    return err(
      input.channel === "SMS"
        ? "This lead has no phone number"
        : "This lead has no email",
    );
  }

  const optedOut =
    input.channel === "SMS" ? lead.smsOptOut : lead.emailOptOut;
  if (optedOut) {
    await prisma.$transaction(async (tx) => {
      await tx.messageLog.create({
        data: {
          leadId: lead.id,
          actorId: user.id,
          channel: input.channel,
          to,
          subject: input.subject ?? null,
          body,
          status: "BLOCKED_OPTOUT",
        },
      });
      await activity(tx, {
        leadId: lead.id,
        actorId: user.id,
        type: input.channel,
        body: `${input.channel} blocked — customer opted out`,
        metadata: { status: "BLOCKED_OPTOUT" },
      });
    });
    return err(
      input.channel === "SMS"
        ? "Customer opted out of texts"
        : "Customer opted out of email",
    );
  }

  const provider = getMessageProvider();
  const sent =
    input.channel === "SMS"
      ? await provider.sendSms({ to, body })
      : await provider.sendEmail({
          to,
          subject: input.subject?.trim() || `Jess Ford — ${leadDisplayName(lead)}`,
          body,
        });

  if (!sent.ok) {
    await prisma.messageLog.create({
      data: {
        leadId: lead.id,
        actorId: user.id,
        channel: input.channel,
        to,
        subject: input.subject ?? null,
        body,
        status: "FAILED",
      },
    });
    return err(sent.error);
  }

  await prisma.$transaction(async (tx) => {
    await tx.messageLog.create({
      data: {
        leadId: lead.id,
        actorId: user.id,
        channel: input.channel,
        to,
        subject: input.subject ?? null,
        body,
        status: "SENT",
      },
    });
    await activity(tx, {
      leadId: lead.id,
      actorId: user.id,
      type: input.channel,
      body:
        input.channel === "EMAIL" && input.subject
          ? `${input.subject}\n${body}`
          : body,
      metadata: { to, stub: true },
    });
    await promoteIfNew(tx, lead, user.id);
  });

  return ok({ blocked: false });
}

export async function reassignOwner(input: {
  leadId: string;
  ownerId: string;
}): Promise<
  ActionResult<{ ownerName: string; toast: string; movedOffMine: boolean }>
> {
  const user = await actor();
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
    include: { owner: true },
  });
  if (!lead) return err("Lead not found");

  const nextOwner = await prisma.salesperson.findUnique({
    where: { id: input.ownerId },
  });
  if (!nextOwner) return err("Salesperson not found");
  if (nextOwner.id === lead.ownerId) {
    return ok({
      ownerName: nextOwner.name,
      toast: `Owner → ${nextOwner.name}`,
      movedOffMine: false,
    });
  }

  const movedOffMine = lead.ownerId === user.id && nextOwner.id !== user.id;

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: lead.id },
      data: { ownerId: nextOwner.id },
    });
    await tx.task.updateMany({
      where: { leadId: lead.id, status: "OPEN" },
      data: { ownerId: nextOwner.id },
    });
    await activity(tx, {
      leadId: lead.id,
      actorId: user.id,
      type: "OWNER_CHANGE",
      body: `Owner → ${nextOwner.name}`,
      metadata: { from: lead.ownerId, to: nextOwner.id },
    });
  });

  const toast = movedOffMine
    ? `Owner → ${nextOwner.name} · off Mine list`
    : `Owner → ${nextOwner.name}`;

  return ok({ ownerName: nextOwner.name, toast, movedOffMine });
}

export async function markSold(leadId: string): Promise<ActionResult> {
  const user = await actor();
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return err("Lead not found");
  if (!canMarkSold(lead.status)) {
    return err("Sold is only allowed from an open deal");
  }

  await prisma.$transaction(async (tx) => {
    await cancelOpenTasks(tx, lead.id, user.id, "Cancelled — sold");
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: "SOLD", lostReason: null },
    });
    await activity(tx, {
      leadId: lead.id,
      actorId: user.id,
      type: "STATUS_CHANGE",
      body: `${lead.status} → Sold`,
      metadata: { from: lead.status, to: "SOLD" },
    });
  });
  return ok(undefined);
}

export async function markLostOrDead(input: {
  leadId: string;
  status: "LOST" | "DEAD";
  reason: string;
}): Promise<ActionResult> {
  const user = await actor();
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) return err("Lead not found");
  if (!canMarkLostOrDead(lead.status)) {
    return err("This lead is already closed");
  }
  const reason = input.reason.trim();
  if (!reason) return err("Reason required");

  const label = input.status === "LOST" ? "Lost" : "Dead";

  await prisma.$transaction(async (tx) => {
    await cancelOpenTasks(tx, lead.id, user.id, `Cancelled — ${label.toLowerCase()}`);
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: input.status, lostReason: reason },
    });
    await activity(tx, {
      leadId: lead.id,
      actorId: user.id,
      type: "STATUS_CHANGE",
      body: `${label}: ${reason}`,
      metadata: { from: lead.status, to: input.status, reason },
    });
  });
  return ok(undefined);
}

export async function setOptOut(input: {
  leadId: string;
  channel: "SMS" | "EMAIL";
  optedOut: boolean;
}): Promise<ActionResult> {
  const user = await actor();
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) return err("Lead not found");

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: input.leadId },
      data:
        input.channel === "SMS"
          ? { smsOptOut: input.optedOut }
          : { emailOptOut: input.optedOut },
    });
    await activity(tx, {
      leadId: lead.id,
      actorId: user.id,
      type: "NOTE",
      body: input.optedOut
        ? `Opted out of ${input.channel === "SMS" ? "texts" : "email"}`
        : `Opted back in to ${input.channel === "SMS" ? "texts" : "email"}`,
    });
  });
  return ok(undefined);
}

export async function scheduleAppointment(input: {
  leadId: string;
  scheduledAt: string;
  notes?: string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await actor();
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) return err("Lead not found");
  if (isTerminal(lead.status)) return err("Cannot set an appointment on a closed lead");
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return err("Valid appointment time required");

  const appt = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        leadId: lead.id,
        scheduledAt,
        status: "SCHEDULED",
        notes: clean(input.notes),
      },
    });
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: "APPT_SET" },
    });
    await activity(tx, {
      leadId: lead.id,
      actorId: user.id,
      type: "APPOINTMENT",
      body: `Appointment set`,
      metadata: { appointmentId: created.id, scheduledAt },
    });
    if (lead.status !== "APPT_SET") {
      await activity(tx, {
        leadId: lead.id,
        actorId: user.id,
        type: "STATUS_CHANGE",
        body: `${lead.status} → Appt set`,
        metadata: { from: lead.status, to: "APPT_SET" },
      });
    }
    await createOpenTask(tx, {
      leadId: lead.id,
      ownerId: lead.ownerId,
      actorId: user.id,
      type: "APPOINTMENT",
      title: "Appointment",
      dueAt: scheduledAt,
    });
    return created;
  });

  return ok({ id: appt.id });
}

async function loadOpenAppointment(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { lead: true },
  });
}

export async function updateAppointmentStatus(input: {
  appointmentId: string;
  status: Extract<AppointmentStatus, "SHOWED" | "NO_SHOW" | "CANCELLED">;
}): Promise<ActionResult> {
  const user = await actor();
  const appt = await loadOpenAppointment(input.appointmentId);
  if (!appt) return err("Appointment not found");
  if (appt.status !== "SCHEDULED") {
    return err("Only a scheduled appointment can be updated");
  }

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appt.id },
      data: { status: input.status },
    });

    if (input.status === "NO_SHOW") {
      await tx.lead.update({
        where: { id: appt.leadId },
        data: { status: "WORKING" },
      });
      await activity(tx, {
        leadId: appt.leadId,
        actorId: user.id,
        type: "APPOINTMENT",
        body: "No-show",
        metadata: { appointmentId: appt.id },
      });
      await activity(tx, {
        leadId: appt.leadId,
        actorId: user.id,
        type: "STATUS_CHANGE",
        body: "Appt set → Working",
        metadata: { from: appt.lead.status, to: "WORKING" },
      });
      await createOpenTask(tx, {
        leadId: appt.leadId,
        ownerId: appt.lead.ownerId,
        actorId: user.id,
        type: "CALL",
        title: REBOOK_TASK_TITLE,
        dueAt: new Date(),
      });
    } else if (input.status === "CANCELLED") {
      await tx.lead.update({
        where: { id: appt.leadId },
        data: { status: isTerminal(appt.lead.status) ? appt.lead.status : "WORKING" },
      });
      await activity(tx, {
        leadId: appt.leadId,
        actorId: user.id,
        type: "APPOINTMENT",
        body: "Appointment cancelled",
        metadata: { appointmentId: appt.id },
      });
      if (!isTerminal(appt.lead.status)) {
        await activity(tx, {
          leadId: appt.leadId,
          actorId: user.id,
          type: "STATUS_CHANGE",
          body: "Appt set → Working",
          metadata: { from: appt.lead.status, to: "WORKING" },
        });
      }
    } else {
      await activity(tx, {
        leadId: appt.leadId,
        actorId: user.id,
        type: "APPOINTMENT",
        body: "Showed",
        metadata: { appointmentId: appt.id },
      });
    }
  });

  return ok(undefined);
}

export async function rescheduleAppointment(input: {
  appointmentId: string;
  scheduledAt: string;
}): Promise<ActionResult> {
  const user = await actor();
  const appt = await loadOpenAppointment(input.appointmentId);
  if (!appt) return err("Appointment not found");
  if (appt.status !== "SCHEDULED") {
    return err("Only a scheduled appointment can be rescheduled");
  }
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return err("Valid appointment time required");

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appt.id },
      data: { scheduledAt, status: "SCHEDULED" },
    });
    await tx.lead.update({
      where: { id: appt.leadId },
      data: { status: "APPT_SET" },
    });
    const openApptTask = await tx.task.findFirst({
      where: { leadId: appt.leadId, status: "OPEN", type: "APPOINTMENT" },
    });
    if (openApptTask) {
      await tx.task.update({
        where: { id: openApptTask.id },
        data: { dueAt: scheduledAt },
      });
    }
    await activity(tx, {
      leadId: appt.leadId,
      actorId: user.id,
      type: "APPOINTMENT",
      body: "Rescheduled",
      metadata: { appointmentId: appt.id, scheduledAt },
    });
  });
  return ok(undefined);
}

export async function logTestDrive(input: {
  leadId: string;
  vehicle: string;
  occurredAt: string;
  note?: string;
  appointmentId?: string;
}): Promise<ActionResult> {
  const user = await actor();
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) return err("Lead not found");
  const vehicle = input.vehicle.trim();
  if (!vehicle) return err("Vehicle required");
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) return err("When is required");

  const appointmentId = clean(input.appointmentId);
  if (appointmentId) {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appt || appt.leadId !== lead.id) {
      return err("Appointment does not belong to this lead");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.testDrive.create({
      data: {
        leadId: lead.id,
        appointmentId,
        vehicle,
        occurredAt,
        note: clean(input.note),
      },
    });
    await activity(tx, {
      leadId: lead.id,
      actorId: user.id,
      type: "TEST_DRIVE",
      body: `Test drive · ${vehicle}${clean(input.note) ? ` — ${clean(input.note)}` : ""}`,
      metadata: { vehicle, occurredAt, appointmentId },
    });
    await promoteIfNew(tx, lead, user.id);
  });
  return ok(undefined);
}
