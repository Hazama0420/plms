import { describe, it, expect, vi } from 'vitest';

describe('Follow-up and Survey Idempotency Mechanisms (Phase 11)', () => {
  describe('Follow-up Daily Digest Idempotency Logic', () => {
    it('dispatches notifications only when daily audit log is absent', async () => {
      const mockAuditLogs: any[] = [];
      const mockSendWhatsApp = vi.fn().mockResolvedValue({ success: true });
      const mockSendPush = vi.fn().mockResolvedValue({ success: true });

      async function processAgentDigest(agentId: string, todayIso: string) {
        // Idempotency check: Cari record audit harian
        const alreadySent = mockAuditLogs.find(
          (log) => log.action === 'followup.daily_digest' && log.targetId === agentId && log.date === todayIso
        );

        if (alreadySent) {
          return { status: 'skipped', reason: 'Already dispatched today' };
        }

        // Dispatch kanal
        await Promise.all([mockSendPush(agentId), mockSendWhatsApp(agentId)]);

        // Kunci idempotensi dengan menulis ke audit log
        mockAuditLogs.push({
          action: 'followup.daily_digest',
          targetId: agentId,
          date: todayIso,
        });

        return { status: 'notified' };
      }

      const agentId = 'agent-uuid-42';
      const today = '2026-09-07';

      // Jalankan pertama kali -> Harus 'notified'
      const firstRun = await processAgentDigest(agentId, today);
      expect(firstRun.status).toBe('notified');
      expect(mockSendWhatsApp).toHaveBeenCalledTimes(1);
      expect(mockSendPush).toHaveBeenCalledTimes(1);
      expect(mockAuditLogs).toHaveLength(1);

      // Jalankan kedua kali pada hari yang sama -> Harus 'skipped' tanpa panggil WA/Push lagi
      const secondRun = await processAgentDigest(agentId, today);
      expect(secondRun.status).toBe('skipped');
      expect(secondRun.reason).toBe('Already dispatched today');
      expect(mockSendWhatsApp).toHaveBeenCalledTimes(1); // Tetap 1, tidak bertambah
      expect(mockSendPush).toHaveBeenCalledTimes(1); // Tetap 1, tidak bertambah
    });
  });

  describe('Survey Reminder Idempotency (Mark-before-send Pattern)', () => {
    it('prevents double sending by marking reminder_sent_at prior to notification dispatch', async () => {
      interface SurveyRecord {
        id: string;
        scheduled_at: string;
        reminder_sent_at: string | null;
        status: string;
      }

      const surveysDb: SurveyRecord[] = [
        {
          id: 'survey-1',
          scheduled_at: new Date(Date.now() + 60 * 60_000).toISOString(), // 60 menit ke depan
          reminder_sent_at: null,
          status: 'scheduled',
        },
      ];

      const mockNotify = vi.fn().mockResolvedValue({ success: true });

      async function runSurveyReminderJob(now: number) {
        // 1. Query: jatuh dalam jendela 45-75 menit & reminder_sent_at IS NULL
        const due = surveysDb.filter((s) => {
          const schedTime = new Date(s.scheduled_at).getTime();
          const inWindow = schedTime >= now + 45 * 60_000 && schedTime <= now + 75 * 60_000;
          return inWindow && s.reminder_sent_at === null && s.status === 'scheduled';
        });

        if (due.length === 0) {
          return { sent: 0, failed: 0, scanned: 0 };
        }

        // 2. Tandai reminder_sent_at terlebih dahulu (Mark-before-send)
        const sentTime = new Date(now).toISOString();
        for (const s of due) {
          s.reminder_sent_at = sentTime;
        }

        // 3. Kirim notifikasi
        let sent = 0;
        for (const s of due) {
          await mockNotify(s.id);
          sent++;
        }

        return { sent, failed: 0, scanned: due.length };
      }

      const now = Date.now();

      // Eksekusi pertama -> 1 survei tersapu dan ditandai
      const run1 = await runSurveyReminderJob(now);
      expect(run1.scanned).toBe(1);
      expect(run1.sent).toBe(1);
      expect(mockNotify).toHaveBeenCalledTimes(1);
      expect(surveysDb[0].reminder_sent_at).not.toBeNull();

      // Eksekusi kedua 5 menit kemudian -> 0 survei tersapu karena reminder_sent_at sudah terisi
      const run2 = await runSurveyReminderJob(now + 5 * 60_000);
      expect(run2.scanned).toBe(0);
      expect(run2.sent).toBe(0);
      expect(mockNotify).toHaveBeenCalledTimes(1); // Tetap 1x, tidak ada spam pengingat
    });
  });
});
