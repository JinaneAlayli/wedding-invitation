// // api/export-daily.ts
// import type { VercelRequest, VercelResponse } from 'vercel';
// import { Resend } from 'resend';
// import * as XLSX from 'xlsx';
// import { createClient } from '@supabase/supabase-js';

// type Row = {
//   id: number;
//   name: string;
//   people_count: number;
//   slug: string;
//   alt_slug: string | null;
//   people_names: string[] | null;
//   people_rsvps: (('coming' | 'not_coming') | null)[] | null;
// };

// const SUPABASE_URL = process.env.SUPABASE_URL!;
// const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// const TO_EMAILS = (process.env.TO_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
// const FROM_EMAIL = process.env.FROM_EMAIL || 'RSVP Robot <noreply@example.com>';
// const PUBLIC_SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN || 'http://localhost:5173';

// const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
//   auth: { persistSession: false },
// });

// export default async function handler(req: VercelRequest, res: VercelResponse) {
//   try {
//     // Pull all guests
//     const { data, error } = await supabase
//       .from('guests')
//       .select('id,name,people_count,slug,alt_slug,people_names,people_rsvps')
//       .order('name', { ascending: true });

//     if (error) throw error;

//     const rows = (data ?? []) as Row[];

//     // Sheet 1 — Households summary
//     const households = rows.map(r => {
//       const names = r.people_names ?? [];
//       const rsvps = r.people_rsvps ?? [];
//       const coming = names.filter((_, i) => rsvps[i] === 'coming');
//       const not = names.filter((_, i) => rsvps[i] === 'not_coming');
//       const pending = names.filter((_, i) => !rsvps[i]);

//       return {
//         Household: r.name,
//         People: r.people_count,
//         Names: names.join(', '),
//         ComingCount: coming.length,
//         ComingNames: coming.join(', '),
//         NotComingCount: not.length,
//         NotComingNames: not.join(', '),
//         PendingCount: pending.length,
//         PendingNames: pending.join(', '),
//         InviteLink: `${PUBLIC_SITE_ORIGIN}/invite/${r.alt_slug ?? r.slug}`,
//         Slug: r.slug,
//         AltSlug: r.alt_slug ?? '',
//       };
//     });

//     // Sheet 2 — People (flattened)
//     const peopleRows: Array<Record<string, any>> = [];
//     for (const r of rows) {
//       const names = r.people_names ?? [];
//       const rsvps = r.people_rsvps ?? [];
//       const L = Math.max(names.length, r.people_count, rsvps.length);
//       for (let i = 0; i < L; i++) {
//         const v = rsvps[i];
//         peopleRows.push({
//           Household: r.name,
//           PersonIndex: i + 1,
//           Name: names[i] ?? '',
//           RSVP: v === 'coming' ? 'coming' : v === 'not_coming' ? 'not_coming' : 'pending',
//           InviteLink: `${PUBLIC_SITE_ORIGIN}/invite/${r.alt_slug ?? r.slug}`,
//         });
//       }
//     }

//     // Build workbook
//     const wb = XLSX.utils.book_new();
//     const ws1 = XLSX.utils.json_to_sheet(households);
//     const ws2 = XLSX.utils.json_to_sheet(peopleRows);
//     XLSX.utils.book_append_sheet(wb, ws1, 'Households');
//     XLSX.utils.book_append_sheet(wb, ws2, 'People');

//     const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

//     // Email via Resend
//     const resend = new Resend(process.env.RESEND_API_KEY!);
//     const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

//     const send = await resend.emails.send({
//       from: FROM_EMAIL,
//       to: TO_EMAILS,
//       subject: `RSVP Export — ${today}`,
//       text: `Attached: RSVP export for ${today}.`,
//       attachments: [
//         {
//           filename: `rsvp-${today}.xlsx`,
//           content: buffer,
//         },
//       ],
//     });

//     if ((send as any).error) {
//       throw new Error((send as any).error.message || 'Email send failed');
//     }

//     res.status(200).json({ ok: true });
//   } catch (e: any) {
//     console.error('export-daily error:', e);
//     res.status(500).json({ ok: false, error: e.message || String(e) });
//   }
// }
