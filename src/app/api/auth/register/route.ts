import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid name, email, and password with at least 8 characters." },
      { status: 400 }
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);

  try {
    const user = await getDb().user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        subscription: {
          create: {
            plan: "FREE",
            status: "active",
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      },
      select: {
        id: true,
        email: true
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account already exists for that email." }, { status: 409 });
    }

    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
