import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    await prisma.leadNote.delete({ where: { id } });
    return NextResponse.json({ message: "Șters" });
  } catch (error) {
    console.error("Error deleting lead note:", error);
    return NextResponse.json({ error: "Nu am putut șterge notița." }, { status: 500 });
  }
}
