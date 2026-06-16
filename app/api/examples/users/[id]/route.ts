import { NextResponse } from "next/server";

import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
};

type UserRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: UserRouteContext) {
  const { id } = await context.params;

  try {
    const result = await query<UserRow>(
      `
        select id, email, name, created_at
        from users
        where id = $1
        limit 1
      `,
      [id],
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch user." },
      { status: 500 },
    );
  }
}
