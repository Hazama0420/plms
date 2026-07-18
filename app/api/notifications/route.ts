// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notificationService } from "@/services/notification.service";

const createSupabaseClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
};

// ============================================================
// GET – Ambil daftar notifikasi user
// ============================================================
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const is_read = searchParams.get("is_read");

  const result = await notificationService.getNotifications({
    page,
    limit,
    is_read: is_read ? is_read === "true" : undefined,
  });

  return NextResponse.json({ success: true, ...result });
}

// ============================================================
// POST – Kirim notifikasi
// ============================================================
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { recipient_type, user_ids, type, title, message, link } = body;

  if (!recipient_type || !type || !title || !message) {
    return NextResponse.json(
      { error: "recipient_type, type, title, message required" },
      { status: 400 }
    );
  }

  try {
    const result = await notificationService.sendNotification({
      recipient_type,
      user_ids,
      type,
      title,
      message,
      link,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengirim notifikasi" },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT – Mark as read / mark all as read
// ============================================================
export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, notificationId } = body;

  if (action === "mark_all") {
    await notificationService.markAllAsRead();
    return NextResponse.json({ success: true });
  }

  if (action === "mark_one" && notificationId) {
    await notificationService.markAsRead(notificationId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: "Invalid action. Use 'mark_all' or 'mark_one' with notificationId" },
    { status: 400 }
  );
}