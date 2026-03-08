export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWhop } from "@/lib/whop";

export async function POST(request: NextRequest) {
  try {
    const data = JSON.parse(await request.text());
    const { type } = data; const d = data.data || data;
    const cid = d.company?.id || d.company_id || d.membership?.company_id || "";
    let acc = cid ? await db.getAccountByCompanyId(cid) : null;
    if (!acc) { const accs = await db.getAccounts(); if (accs.length === 1) acc = accs[0]; }
    if (!acc) return NextResponse.json({ ok: true }); // ignore unknown
    const aid = acc.id;

    if (type === "setup_intent.succeeded") {
      const mid = d.member?.id, pmid = d.payment_method?.id;
      if (mid && pmid) { const c = await db.getCustomer(aid, mid); if (c) { c.payment_method_id = pmid; await db.saveCustomer(aid, c); } }
    }
    if (type === "payment.succeeded") {
      const mid = d.member?.id;
      if (mid) { const c = await db.getCustomer(aid, mid); if (c) {
        const n = new Date(); n.setDate(n.getDate() + c.rebill_interval_days);
        c.next_rebill_date = n.toISOString(); c.status = "active"; c.last_charged_at = new Date().toISOString();
        c.total_charged += (d.final_amount || d.amount || c.amount * 100) / 100; c.charge_count++; c.failed_count = 0;
        await db.saveCustomer(aid, c);
      }}
    }
    if (type === "payment.failed") {
      const mid = d.member?.id;
      if (mid) { const c = await db.getCustomer(aid, mid); if (c) {
        c.failed_count++; const r = new Date(); r.setDate(r.getDate() + 3); c.next_rebill_date = r.toISOString();
        if (c.failed_count >= 3) c.status = "failed"; await db.saveCustomer(aid, c);
      }}
    }
    if (type === "membership.activated") {
      const mid = d.member?.id, u = d.user || d.member?.user;
      if (mid && !(await db.getCustomer(aid, mid))) {
        let pmid = ""; try { const w = getWhop(acc); const m = await w.paymentMethods.list({ member_id: mid }); if (m.data?.length) pmid = m.data[0].id; } catch {}
        await db.saveCustomer(aid, { member_id: mid, user_id: u?.id || "", email: u?.email || "", username: u?.username || "", payment_method_id: pmid, membership_id: d.id || "", plan_id: d.plan?.id || d.plan_id || "", product_id: d.product?.id || d.product_id || "", amount: 0, currency: "usd", rebill_interval_days: 30, next_rebill_date: new Date(Date.now() + 30 * 86400000).toISOString(), status: "paused", created_at: new Date().toISOString(), last_charged_at: null, total_charged: 0, charge_count: 0, failed_count: 0, notes: "" });
        await db.log(aid, "member", `New: ${u?.email || mid}`);
      }
    }
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: true }); }
}
