import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "crm_session_user";

/**
 * Stub/demo session. Never trust a client-supplied actorId —
 * every mutation should call this instead.
 */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const cookieId = jar.get(SESSION_COOKIE)?.value;

  if (cookieId) {
    const fromCookie = await prisma.salesperson.findUnique({
      where: { id: cookieId },
    });
    if (fromCookie) return fromCookie;
  }

  const garrett = await prisma.salesperson.findUnique({
    where: { email: "garrett@jessford.com" },
  });
  if (garrett) return garrett;

  const first = await prisma.salesperson.findFirst({
    orderBy: { name: "asc" },
  });
  if (!first) {
    throw new Error("No salespeople seeded. Run `npx prisma db seed`.");
  }
  return first;
});

export async function listSalespeople() {
  return prisma.salesperson.findMany({ orderBy: { name: "asc" } });
}
