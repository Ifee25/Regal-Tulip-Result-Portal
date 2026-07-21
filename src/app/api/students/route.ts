import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    if (!supabase) {
      return Response.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // Check for auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: user, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { student_name, class_name, term, average_score } = body;

    if (!student_name || !class_name || !term || average_score === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("students")
      .insert([{ student_name, class_name, term, average_score: Number(average_score) }])
      .select();

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(data, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
