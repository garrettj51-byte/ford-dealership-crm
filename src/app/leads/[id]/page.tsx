import { notFound } from "next/navigation";
import { LeadDetail } from "@/components/lead-detail";
import { getCurrentUser, listSalespeople } from "@/lib/auth";
import { getLeadDetail } from "@/lib/queries";

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, user, salespeople] = await Promise.all([
    getLeadDetail(id),
    getCurrentUser(),
    listSalespeople(),
  ]);

  if (!lead) notFound();

  const scheduled = lead.appointments.find((item) => item.status === "SCHEDULED");
  const showed = lead.appointments.find((item) => item.status === "SHOWED");
  const openAppointment = scheduled ?? showed ?? null;
  const nextTask = lead.tasks.find((task) => task.status === "OPEN") ?? null;

  return (
    <LeadDetail
      lead={{
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        vehicleInterest: lead.vehicleInterest,
        status: lead.status,
        lostReason: lead.lostReason,
        ownerId: lead.ownerId,
        owner: { id: lead.owner.id, name: lead.owner.name },
        smsOptOut: lead.smsOptOut,
        emailOptOut: lead.emailOptOut,
        nextTask: nextTask
          ? {
              id: nextTask.id,
              title: nextTask.title,
              type: nextTask.type,
              dueAt: nextTask.dueAt.toISOString(),
            }
          : null,
        openAppointment: openAppointment
          ? {
              id: openAppointment.id,
              scheduledAt: openAppointment.scheduledAt.toISOString(),
              status: openAppointment.status,
              notes: openAppointment.notes,
            }
          : null,
        linkableAppointments: lead.appointments
          .filter((item) => item.status === "SCHEDULED" || item.status === "SHOWED")
          .map((item) => ({
            id: item.id,
            scheduledAt: item.scheduledAt.toISOString(),
            status: item.status,
          })),
        activities: lead.activities.map((item) => ({
          id: item.id,
          type: item.type,
          body: item.body,
          createdAt: item.createdAt.toISOString(),
          actorName: item.actor.name,
        })),
        salespeople: salespeople.map((person) => ({
          id: person.id,
          name: person.name,
        })),
        currentUserId: user.id,
      }}
    />
  );
}
