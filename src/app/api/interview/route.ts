import { interviewStep, type InterviewTurn } from "@/builder/interview";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST { description, history } → the next interview step (a question) OR a
 * finished LoopSpec when the interviewer has enough. Non-streaming: each turn
 * is one short question, so latency is low and the UI shows a "thinking" stall.
 */
export async function POST(req: Request) {
  let body: { description?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  try {
    const description: string = typeof body?.description === "string" ? body.description : "";
    const history: InterviewTurn[] = Array.isArray(body?.history) ? body.history : [];
    if (!description.trim()) {
      return Response.json({ error: "describe the workflow first" }, { status: 400 });
    }
    const result = await interviewStep(description, history);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
