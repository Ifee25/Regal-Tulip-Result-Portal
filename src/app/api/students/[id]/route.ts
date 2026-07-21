import { supabase } from "@/lib/supabase";

async function authCheck(req: Request) {
  if (!supabase) {
    return { error: "Supabase not configured", status: 500 };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { error: "Unauthorized", status: 401 };
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: user, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { error: "Unauthorized", status: 401 };
  }

  return { user };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authCheck(req);
    if ("error" in auth) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const client = supabase;
    if (!client) {
      return Response.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const { id } = await params;
    const body = await req.json();
    const { student_name, class_name, term, average_score } = body;

    const { data, error } = await client
      .from("students")
      .update({ student_name, class_name, term, average_score: Number(average_score), updated_at: new Date() })
      .eq("id", id)
      .select();

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(data);
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authCheck(req);
    if ("error" in auth) {
      return Response.json({ error: auth.error }, { status: auth.status });
    }

    const client = supabase;
    if (!client) {
      return Response.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const { id } = await params;
    const { error } = await client.from("students").delete().eq("id", id);

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
