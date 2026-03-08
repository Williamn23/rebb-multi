export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const pw = req.headers.get("x-admin-password") || new URL(req.url).searchParams.get("pw");
  if (pw !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const aid = new URL(req.url).searchParams.get("account_id");
  if (!aid) return NextResponse.json({ error: "account_id required" });
  
  try {
    const { db } = await import("@/lib/db");
    const acc = await db.getAccount(aid);
    if (!acc) return NextResponse.json({ error: "Account not found" });

    // Raw fetch to see exact response
    const Whop = (await import("@whop/sdk")).default;
    const client = new Whop({ apiKey: acc.whop_api_key });
    
    const result = await client.payments.list({
      company_id: acc.whop_company_id,
      per: 10,
      page: 1,
    });

    return NextResponse.json({
      raw_result: result,
      first_payment: result?.data?.[0] || null,
      all_payments: (result?.data || []).map((p: any) => ({
        id: p.id,
        status: p.status,
        final_amount: p.final_amount,
        subtotal: p.subtotal,
        currency: p.currency,
        created_at: p.created_at,
        paid_at: p.paid_at,
        user_id: p.user_id,
        card_brand: p.card_brand,
        card_last_4: p.card_last_4,
        ALL_KEYS: Object.keys(p),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack });
  }
}
