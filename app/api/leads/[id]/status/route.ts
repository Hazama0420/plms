import { NextRequest, NextResponse } from "next/server";
import { updateCRMLeadStatusAction } from "@/actions/crm-leads.action";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json();
  const result = await updateCRMLeadStatusAction(id, body.status, {
    lostReason: body.lostReason,
    lostExplanation: body.lostExplanation,
  });
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
