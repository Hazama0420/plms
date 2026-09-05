// app/(dashboard)/admin/support/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mail, Phone, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminSupportInbox() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sesi Anda telah berakhir. Silakan login kembali.");
      setLoading(false);
      return;
    }

    // Disaring ke salinan milik admin ini. /api/support menulis satu baris untuk
    // SETIAP admin, jadi tanpa filter ini setiap pesan tampil sebanyak jumlah
    // admin — dan "Tandai Dibaca" hanya akan mengubah salah satu salinannya.
    const { data, error } = await supabase
      .from("notifications")
      .select(`
        id,
        title,
        message,
        created_at,
        is_read,
        sender_id,
        users:sender_id ( full_name, email, phone )
      `)
      .eq("type", "support")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Gagal memuat pesan bantuan", { description: error.message });
    } else if (data) {
      setMessages(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    // RLS bisa menolak update tanpa memunculkan pengecualian. Tanpa pemeriksaan
    // ini, tombolnya tampak berhasil padahal barisnya tidak berubah.
    if (error) {
      toast.error("Gagal menandai pesan", { description: error.message });
      return;
    }

    toast.success("Pesan ditandai sudah dibaca");
    fetchMessages();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            Kotak Masuk Pesan Bantuan Agen
          </h1>
          <p className="text-xs text-muted-foreground">
            Daftar pertanyaan dan permintaan bantuan dari agen/user.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchMessages} className="text-xs">
          Refresh Pesan
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Memuat pesan...</p>
      ) : messages.length === 0 ? (
        <Card className="p-8 text-center text-xs text-muted-foreground">
          Belum ada pesan bantuan masuk dari agen.
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card key={msg.id} className={`border ${!msg.is_read ? "border-emerald-500 bg-emerald-50/20" : ""}`}>
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <span className="truncate">{msg.users?.full_name || msg.users?.email || "Tanpa Nama"}</span>
                  <Badge variant={msg.is_read ? "outline" : "default"} className="text-[10px]">
                    {msg.is_read ? "Selesai/Dibaca" : "Pesan Baru"}
                  </Badge>
                </CardTitle>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(msg.created_at).toLocaleString("id-ID")}
                </span>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2 text-xs">
                <p className="p-3 bg-muted/40 rounded-lg text-foreground font-sans">
                  {msg.message}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {msg.users?.email ? (
                      <a
                        href={`mailto:${msg.users.email}`}
                        className="flex items-center gap-1 hover:text-foreground hover:underline"
                      >
                        <Mail className="w-3 h-3" /> {msg.users.email}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 italic">
                        <Mail className="w-3 h-3" /> Kontak tidak tersedia
                      </span>
                    )}
                    {msg.users?.phone && (
                      <a
                        href={`https://wa.me/${msg.users.phone.replace(/\D/g, "").replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-foreground hover:underline"
                      >
                        <Phone className="w-3 h-3" /> {msg.users.phone}
                      </a>
                    )}
                  </div>

                  {!msg.is_read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAsRead(msg.id)}
                      className="h-7 text-[11px] text-emerald-600 hover:text-emerald-700 gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Tandai Dibaca
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}