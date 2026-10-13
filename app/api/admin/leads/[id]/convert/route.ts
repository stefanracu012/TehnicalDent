import { NextResponse } from "next/server";
import { convertLeadToPatient, LeadError } from "@/lib/leads";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Turns a lead into a patient — see convertLeadToPatient for the rules. */
export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const result = await convertLeadToPatient(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LeadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error converting lead:", error);
    return NextResponse.json(
      { error: "Nu am putut crea pacientul." },
      { status: 500 },
    );
  }
}
