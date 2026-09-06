import {
  PrismaClient,
  type LeadStatus,
  type TaskType,
} from "@prisma/client";

const prisma = new PrismaClient();

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function daysAgo(days: number) {
  return hoursAgo(days * 24);
}

function daysFromNow(days: number) {
  return hoursFromNow(days * 24);
}

async function main() {
  await prisma.messageLog.deleteMany();
  await prisma.testDrive.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.salesperson.deleteMany();

  const garrett = await prisma.salesperson.create({
    data: {
      name: "Garrett Jess",
      email: "garrett@jessford.com",
      phone: "5735550101",
    },
  });
  const maya = await prisma.salesperson.create({
    data: {
      name: "Maya Chen",
      email: "maya.chen@jessford.com",
      phone: "5735550102",
    },
  });
  const derek = await prisma.salesperson.create({
    data: {
      name: "Derek Holt",
      email: "derek.holt@jessford.com",
      phone: "5735550103",
    },
  });
  const sofia = await prisma.salesperson.create({
    data: {
      name: "Sofia Ramirez",
      email: "sofia.ramirez@jessford.com",
      phone: "5735550104",
    },
  });

  async function lead(data: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    vehicleInterest?: string;
    status: LeadStatus;
    ownerId: string;
    lostReason?: string;
    smsOptOut?: boolean;
    emailOptOut?: boolean;
    createdAt?: Date;
    task?: { type: TaskType; title: string; dueAt: Date; ownerId?: string };
    activities?: Array<{
      actorId: string;
      type:
        | "LEAD_CREATED"
        | "NOTE"
        | "CALL"
        | "SMS"
        | "EMAIL"
        | "STATUS_CHANGE"
        | "OWNER_CHANGE"
        | "TASK_CREATED"
        | "APPOINTMENT"
        | "TEST_DRIVE";
      body: string;
      createdAt?: Date;
    }>;
  }) {
    const created = await prisma.lead.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        vehicleInterest: data.vehicleInterest,
        status: data.status,
        ownerId: data.ownerId,
        lostReason: data.lostReason,
        smsOptOut: data.smsOptOut ?? false,
        emailOptOut: data.emailOptOut ?? false,
        createdAt: data.createdAt,
      },
    });

    if (data.task) {
      await prisma.task.create({
        data: {
          leadId: created.id,
          ownerId: data.task.ownerId ?? data.ownerId,
          type: data.task.type,
          title: data.task.title,
          dueAt: data.task.dueAt,
          status: "OPEN",
        },
      });
    }

    for (const item of data.activities ?? []) {
      await prisma.activity.create({
        data: {
          leadId: created.id,
          actorId: item.actorId,
          type: item.type,
          body: item.body,
          createdAt: item.createdAt,
        },
      });
    }

    return created;
  }

  const luis = await lead({
    firstName: "Luis",
    lastName: "Morales",
    phone: "5735550140",
    vehicleInterest: "F-150 XLT SuperCrew",
    status: "NEW",
    ownerId: garrett.id,
    createdAt: daysAgo(3),
    task: {
      type: "CALL",
      title: "Call",
      dueAt: hoursAgo(30),
    },
    activities: [
      {
        actorId: garrett.id,
        type: "LEAD_CREATED",
        body: "Garrett Jess added Luis Morales",
        createdAt: daysAgo(3),
      },
      {
        actorId: garrett.id,
        type: "TASK_CREATED",
        body: "Next: Call",
        createdAt: daysAgo(3),
      },
    ],
  });

  await lead({
    firstName: "Priya",
    lastName: "Shah",
    email: "priya.shah@example.com",
    phone: "5735550141",
    vehicleInterest: "Explorer ST",
    status: "WORKING",
    ownerId: garrett.id,
    createdAt: daysAgo(5),
    task: {
      type: "TEXT",
      title: "Text",
      dueAt: hoursFromNow(3),
    },
    activities: [
      {
        actorId: garrett.id,
        type: "LEAD_CREATED",
        body: "Garrett Jess added Priya Shah",
        createdAt: daysAgo(5),
      },
      {
        actorId: garrett.id,
        type: "CALL",
        body: "Interested in Explorer ST, waiting on trade numbers.",
        createdAt: daysAgo(4),
      },
      {
        actorId: garrett.id,
        type: "STATUS_CHANGE",
        body: "New → Working",
        createdAt: daysAgo(4),
      },
    ],
  });

  const tom = await lead({
    firstName: "Tom",
    lastName: "Brennan",
    phone: "5735550142",
    email: "tom.brennan@example.com",
    vehicleInterest: "Bronco Outer Banks",
    status: "APPT_SET",
    ownerId: garrett.id,
    createdAt: daysAgo(8),
    task: {
      type: "APPOINTMENT",
      title: "Appointment",
      dueAt: daysFromNow(1),
    },
    activities: [
      {
        actorId: garrett.id,
        type: "LEAD_CREATED",
        body: "Garrett Jess added Tom Brennan",
        createdAt: daysAgo(8),
      },
      {
        actorId: garrett.id,
        type: "APPOINTMENT",
        body: "Appointment set",
        createdAt: daysAgo(1),
      },
    ],
  });

  await prisma.appointment.create({
    data: {
      leadId: tom.id,
      scheduledAt: daysFromNow(1),
      status: "SCHEDULED",
      notes: "Bring trade — 2018 Escape",
    },
  });

  await lead({
    firstName: "Angela",
    lastName: "Cho",
    phone: "5735550143",
    vehicleInterest: "Mustang GT",
    status: "WORKING",
    ownerId: garrett.id,
    smsOptOut: true,
    createdAt: daysAgo(6),
    task: {
      type: "CALL",
      title: "Call",
      dueAt: hoursFromNow(5),
    },
    activities: [
      {
        actorId: garrett.id,
        type: "LEAD_CREATED",
        body: "Garrett Jess added Angela Cho",
        createdAt: daysAgo(6),
      },
      {
        actorId: garrett.id,
        type: "NOTE",
        body: "Opted out of texts",
        createdAt: daysAgo(2),
      },
      {
        actorId: garrett.id,
        type: "CALL",
        body: "Prefers a phone call, not SMS.",
        createdAt: daysAgo(2),
      },
    ],
  });

  await lead({
    firstName: "Hank",
    lastName: "Miller",
    phone: "5735550144",
    email: "hank.miller@example.com",
    vehicleInterest: "Maverick Lariat",
    status: "SOLD",
    ownerId: garrett.id,
    createdAt: daysAgo(20),
    activities: [
      {
        actorId: garrett.id,
        type: "LEAD_CREATED",
        body: "Garrett Jess added Hank Miller",
        createdAt: daysAgo(20),
      },
      {
        actorId: garrett.id,
        type: "TEST_DRIVE",
        body: "Test drive · Maverick Lariat",
        createdAt: daysAgo(12),
      },
      {
        actorId: garrett.id,
        type: "STATUS_CHANGE",
        body: "Working → Sold",
        createdAt: daysAgo(10),
      },
    ],
  });

  await lead({
    firstName: "Chris",
    lastName: "Nguyen",
    phone: "5735550150",
    vehicleInterest: "F-250 Lariat",
    status: "WORKING",
    ownerId: maya.id,
    createdAt: daysAgo(4),
    task: {
      type: "CALL",
      title: "Call",
      dueAt: hoursAgo(8),
    },
    activities: [
      {
        actorId: maya.id,
        type: "LEAD_CREATED",
        body: "Maya Chen added Chris Nguyen",
        createdAt: daysAgo(4),
      },
      {
        actorId: maya.id,
        type: "CALL",
        body: "Wants to look at diesel vs gas this week.",
        createdAt: daysAgo(3),
      },
    ],
  });

  await lead({
    firstName: "Dana",
    lastName: "Brooks",
    email: "dana.brooks@example.com",
    vehicleInterest: "Escape ST-Line",
    status: "NEW",
    ownerId: maya.id,
    createdAt: hoursAgo(6),
    activities: [
      {
        actorId: maya.id,
        type: "LEAD_CREATED",
        body: "Maya Chen added Dana Brooks",
        createdAt: hoursAgo(6),
      },
    ],
  });

  await lead({
    firstName: "Rita",
    lastName: "Alvarez",
    phone: "5735550152",
    vehicleInterest: "Expedition Max",
    status: "LOST",
    ownerId: maya.id,
    lostReason: "Bought elsewhere",
    createdAt: daysAgo(14),
    activities: [
      {
        actorId: maya.id,
        type: "STATUS_CHANGE",
        body: "Lost: Bought elsewhere",
        createdAt: daysAgo(2),
      },
    ],
  });

  await lead({
    firstName: "Sam",
    lastName: "Patel",
    phone: "5735550160",
    status: "DEAD",
    ownerId: derek.id,
    lostReason: "Bad number",
    createdAt: daysAgo(9),
    activities: [
      {
        actorId: derek.id,
        type: "STATUS_CHANGE",
        body: "Dead: Bad number",
        createdAt: daysAgo(8),
      },
    ],
  });

  await lead({
    firstName: "Elena",
    lastName: "Vasquez",
    phone: "5735550161",
    email: "elena.v@example.com",
    vehicleInterest: "Ranger Tremor",
    status: "WORKING",
    ownerId: derek.id,
    createdAt: daysAgo(2),
    task: {
      type: "FOLLOW_UP",
      title: "Follow up",
      dueAt: hoursFromNow(2),
    },
    activities: [
      {
        actorId: derek.id,
        type: "LEAD_CREATED",
        body: "Derek Holt added Elena Vasquez",
        createdAt: daysAgo(2),
      },
      {
        actorId: derek.id,
        type: "EMAIL",
        body: "Sent Ranger inventory recap (stub).",
        createdAt: daysAgo(1),
      },
    ],
  });

  const jordan = await lead({
    firstName: "Jordan",
    lastName: "Blake",
    phone: "5735550162",
    vehicleInterest: "Bronco Sport Badlands",
    status: "APPT_SET",
    ownerId: sofia.id,
    createdAt: daysAgo(7),
    activities: [
      {
        actorId: sofia.id,
        type: "LEAD_CREATED",
        body: "Sofia Ramirez added Jordan Blake",
        createdAt: daysAgo(7),
      },
      {
        actorId: sofia.id,
        type: "APPOINTMENT",
        body: "Showed",
        createdAt: daysAgo(1),
      },
    ],
  });

  const showed = await prisma.appointment.create({
    data: {
      leadId: jordan.id,
      scheduledAt: daysAgo(1),
      status: "SHOWED",
      notes: "Looked at Badlands in carbonized gray",
    },
  });

  await prisma.testDrive.create({
    data: {
      leadId: jordan.id,
      appointmentId: showed.id,
      vehicle: "Bronco Sport Badlands",
      occurredAt: daysAgo(1),
      note: "Liked the ride height; wants to compare Outer Banks.",
    },
  });

  await prisma.activity.create({
    data: {
      leadId: jordan.id,
      actorId: sofia.id,
      type: "TEST_DRIVE",
      body: "Test drive · Bronco Sport Badlands — Liked the ride height",
      createdAt: daysAgo(1),
    },
  });

  console.log("Seeded salespeople and sample leads.");
  console.log({ luis: luis.id, tom: tom.id, jordan: jordan.id });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
