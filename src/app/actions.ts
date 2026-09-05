"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import * as mutations from "@/lib/mutations";
import { prisma } from "@/lib/prisma";
import { err, ok, type ActionResult } from "@/lib/types";
import type { NextTouchPreset } from "@/lib/domain";
import type { AppointmentStatus, TaskType } from "@prisma/client";

function refreshLead(leadId?: string) {
  revalidatePath("/", "layout");
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

export async function switchUserAction(
  userId: string,
): Promise<ActionResult<{ name: string }>> {
  const user = await prisma.salesperson.findUnique({ where: { id: userId } });
  if (!user) return err("Unknown salesperson");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  return ok({ name: user.name });
}

export async function createLeadAction(input: {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  vehicleInterest?: string;
  nextTouch?: NextTouchPreset | "";
}) {
  const result = await mutations.createLead(input);
  if (result.ok) {
    refreshLead(result.data.id);
    revalidatePath("/leads/new");
  }
  return result;
}

export async function updateVehicleInterestAction(
  leadId: string,
  vehicleInterest: string,
) {
  const result = await mutations.updateVehicleInterest(leadId, vehicleInterest);
  if (result.ok) refreshLead(leadId);
  return result;
}

export async function setNextTaskAction(input: {
  leadId: string;
  preset?: NextTouchPreset;
  type?: TaskType;
  title?: string;
  dueAt?: string;
}) {
  const result = await mutations.setNextTask(input);
  if (result.ok) refreshLead(input.leadId);
  return result;
}

export async function completeTaskAction(taskId: string, leadId: string) {
  const result = await mutations.completeTask(taskId);
  if (result.ok) refreshLead(leadId);
  return result;
}

export async function logCallAction(input: { leadId: string; note: string }) {
  const result = await mutations.logCall(input);
  if (result.ok) refreshLead(input.leadId);
  return result;
}

export async function addNoteAction(input: { leadId: string; note: string }) {
  const result = await mutations.addNote(input);
  if (result.ok) refreshLead(input.leadId);
  return result;
}

export async function sendMessageAction(input: {
  leadId: string;
  channel: "SMS" | "EMAIL";
  body: string;
  subject?: string;
}) {
  const result = await mutations.sendMessage(input);
  refreshLead(input.leadId);
  return result;
}

export async function reassignOwnerAction(input: {
  leadId: string;
  ownerId: string;
}) {
  const result = await mutations.reassignOwner(input);
  if (result.ok) refreshLead(input.leadId);
  return result;
}

export async function markSoldAction(leadId: string) {
  const result = await mutations.markSold(leadId);
  if (result.ok) refreshLead(leadId);
  return result;
}

export async function markLostOrDeadAction(input: {
  leadId: string;
  status: "LOST" | "DEAD";
  reason: string;
}) {
  const result = await mutations.markLostOrDead(input);
  if (result.ok) refreshLead(input.leadId);
  return result;
}

export async function setOptOutAction(input: {
  leadId: string;
  channel: "SMS" | "EMAIL";
  optedOut: boolean;
}) {
  const result = await mutations.setOptOut(input);
  if (result.ok) refreshLead(input.leadId);
  return result;
}

export async function scheduleAppointmentAction(input: {
  leadId: string;
  scheduledAt: string;
  notes?: string;
}) {
  const result = await mutations.scheduleAppointment(input);
  if (result.ok) refreshLead(input.leadId);
  return result;
}

export async function updateAppointmentStatusAction(input: {
  appointmentId: string;
  leadId: string;
  status: Extract<AppointmentStatus, "SHOWED" | "NO_SHOW" | "CANCELLED">;
}) {
  const result = await mutations.updateAppointmentStatus(input);
  if (result.ok) refreshLead(input.leadId);
  return result;
}

export async function rescheduleAppointmentAction(input: {
  appointmentId: string;
  leadId: string;
  scheduledAt: string;
}) {
  const result = await mutations.rescheduleAppointment(input);
  if (result.ok) refreshLead(input.leadId);
  return result;
}

export async function logTestDriveAction(input: {
  leadId: string;
  vehicle: string;
  occurredAt: string;
  note?: string;
  appointmentId?: string;
}) {
  const result = await mutations.logTestDrive(input);
  if (result.ok) refreshLead(input.leadId);
  return result;
}
