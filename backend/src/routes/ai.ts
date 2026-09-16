import { Router, type RequestHandler } from "express";
import { firstCall, structuredCall } from "@ai/index";
import { requireAuth } from "../auth/middleware";
import { requireSessionAccess } from "../middleware/requireSessionAccess";
import * as suggestions from "../realtime/suggestions";
import { detectAnswered } from "../realtime/autodetect";
import { pushSuggestion, pushAnswered, pushTranscript } from "../realtime/hub";
import { scheduleSavedAnswerForAi } from "./transcript";
import {
  MeetingAnswerError,
  saveMeetingAnswer,
  settleAiCardWithoutText,
} from "../lib/meetingAnswers";
import { placeholder } from "./_placeholder";
import { validateAiOutput } from "../middleware/validateAiOutput";
import type { AnswerInput, SavedAnswer } from "@shared/types";

export const aiRouter = Router();

aiRouter.get(
  "/",
  placeholder(
    "ai",
    "POST/GET /api/ai/test sends a hardcoded prompt (S1-T03-B)",
  ),
);

// requireAuth on both of these: they are Sprint-1 scaffolding that reaches the
// paid LLM. Open to the internet they are a metered bill anyone can run up —
// and a prompt anyone can choose.
aiRouter.get("/test", requireAuth, async (_req, res, next) => {
  try {
    const result = await firstCall();
    res.json({
      ok: true,
      data: { provider: result.provider, text: result.text, raw: result.raw },
    });
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/structure", requireAuth, async (req, res, next) => {
  try {
    const input = typeof req.body?.input === "string" ? req.body.input : "";
    if (input.trim() === "") {
      return res
        .status(400)
        .json({ ok: false, error: "body.input (string) is required" });
    }

    const result = await structuredCall(input);
    if (!result.ok) {
      return res.status(422).json({
        ok: false,
        error: `AI output failed validation: ${result.error}`,
        data: { provider: result.provider, rawText: result.rawText },
      });
    }

    const checked = validateAiOutput(result.data);
    if (!checked.ok) {
      return res.status(422).json({
        ok: false,
        error: `AI output failed validation: ${checked.error}`,
        data: { provider: result.provider },
      });
    }

    res.json({
      ok: true,
      data: { provider: result.provider, ...checked.data },
    });
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/suggest", requireAuth, requireSessionAccess(), async (req, res, next) => {
  try {
    const sessionId =
      typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
    const input = typeof req.body?.input === "string" ? req.body.input : "";
    if (!sessionId || input.trim() === "") {
      return res
        .status(400)
        .json({
          ok: false,
          error: "body.sessionId and body.input (string) are required",
        });
    }
    if (req.auth!.role !== "facilitator") {
      return res
        .status(403)
        .json({
          ok: false,
          error: "Only the facilitator can request suggestions",
        });
    }

    const result = await structuredCall(input);
    if (!result.ok) {
      return res.status(422).json({
        ok: false,
        error: `AI output failed validation: ${result.error}`,
        data: { provider: result.provider, rawText: result.rawText },
      });
    }

    const cards = await suggestions.createFromBlocks(sessionId, result.data.blocks);
    for (const card of cards) pushSuggestion(card);

    res.json({ ok: true, data: { provider: result.provider, cards } });
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/suggest/scan", requireAuth, requireSessionAccess(), async (req, res, next) => {
  try {
  const sessionId =
    typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
  const transcript =
    typeof req.body?.transcript === "string" ? req.body.transcript : "";
  if (!sessionId || transcript.trim() === "") {
    return res
      .status(400)
      .json({
        ok: false,
        error: "body.sessionId and body.transcript (string) are required",
      });
  }

  await suggestions.hydrate(sessionId);
  const open = suggestions.openCards(sessionId);
  const ids = detectAnswered(transcript, open);
  const answered: string[] = [];
  for (const id of ids) {
    if (await suggestions.markAnswered(sessionId, id, "auto")) {
      pushAnswered(sessionId, id, "auto");
      answered.push(id);
    }
  }

    res.json({ ok: true, data: { sessionId, answered } });
  } catch (err) {
    next(err);
  }
});

function actorFromRequest(req: Parameters<RequestHandler>[0]) {
  return { id: req.auth!.sub, orgId: req.auth!.orgId, role: req.auth!.role } as const;
}

function inputFromBody(sessionId: string, body: any): AnswerInput {
  if (body?.origin !== "ai" && body?.origin !== "planned") {
    throw new MeetingAnswerError(400, "origin must be ai or planned");
  }
  return {
    sessionId,
    questionId: typeof body?.questionId === "string" ? body.questionId : body?.cardId ?? "",
    origin: body.origin,
    plannedQuestionText: typeof body?.plannedQuestionText === "string" ? body.plannedQuestionText : undefined,
    text: typeof body?.text === "string" ? body.text : body?.answer ?? "",
    speaker: typeof body?.speaker === "string" ? body.speaker : undefined,
    requestId: typeof body?.requestId === "string" ? body.requestId : "",
  };
}

function publishSavedAnswer(saved: SavedAnswer, origin: AnswerInput["origin"]): { card: ReturnType<typeof suggestions.applyCommittedAnswer>; transcript: { id: string; session_id: string; speaker: string; text: string; timestamp: string } } {
  const card = origin === "ai"
    ? suggestions.applyCommittedAnswer(saved.sessionId, saved.questionId, saved.text)
    : null;
  const transcript = {
    id: saved.transcriptId,
    session_id: saved.sessionId,
    speaker: saved.speaker,
    text: saved.text,
    timestamp: saved.createdAt,
  };
  if (origin === "ai") pushAnswered(saved.sessionId, saved.questionId, "manual");
  pushTranscript(saved.sessionId, transcript);
  scheduleSavedAnswerForAi(saved.sessionId, saved.text, "facilitator");
  return { card, transcript };
}

function sendMeetingAnswerError(error: unknown, res: Parameters<RequestHandler>[1]): boolean {
  if (!(error instanceof MeetingAnswerError)) return false;
  res.status(error.status).json({ ok: false, error: error.message });
  return true;
}

/** The desktop contract: POST /api/session/:id/answers. */
export const saveMeetingAnswerHandler: RequestHandler = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    if (typeof req.body?.sessionId === "string" && req.body.sessionId !== sessionId) {
      return res.status(400).json({ ok: false, error: "body.sessionId must match the URL session id" });
    }
    const input = inputFromBody(sessionId, req.body);
    const saved = await saveMeetingAnswer(input, actorFromRequest(req));
    if (saved.created) publishSavedAnswer(saved, input.origin);
    res.status(201).json({ ok: true, data: saved });
  } catch (error) {
    if (!sendMeetingAnswerError(error, res)) next(error);
  }
};

/** Existing web endpoint, now delegated to the same durable-answer service. */
aiRouter.post("/suggest/answer", requireAuth, requireSessionAccess(), async (req, res, next) => {
  try {
    const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
    const cardId = typeof req.body?.cardId === "string" ? req.body.cardId : "";
    const answer = typeof req.body?.answer === "string" ? req.body.answer : "";
    if (!sessionId || !cardId) {
      return res.status(400).json({ ok: false, error: "body.sessionId and body.cardId are required" });
    }
    if (!answer.trim()) {
      const settled = await settleAiCardWithoutText(sessionId, cardId, actorFromRequest(req));
      const card = suggestions.applyCommittedAnswer(sessionId, settled.cardId, "");
      pushAnswered(sessionId, settled.cardId, "manual");
      return res.json({ ok: true, data: { card, transcript: null } });
    }

    const input = inputFromBody(sessionId, {
      ...req.body,
      questionId: cardId,
      origin: "ai",
      text: answer,
      // Old clients did not send an idempotency key; preserve them while new
      // callers use requestId for safe timeout retries.
      requestId: typeof req.body?.requestId === "string" ? req.body.requestId : `web_${Date.now()}_${cardId}`,
    });
    const saved = await saveMeetingAnswer(input, actorFromRequest(req));
    const published = saved.created
      ? publishSavedAnswer(saved, "ai")
      : { card: suggestions.applyCommittedAnswer(sessionId, cardId, saved.text), transcript: null };
    res.json({ ok: true, data: { card: published.card, transcript: published.transcript, answer: saved } });
  } catch (error) {
    if (!sendMeetingAnswerError(error, res)) next(error);
  }
});

aiRouter.post("/suggest/dismiss", requireAuth, requireSessionAccess(), (req, res) => {
  const sessionId =
    typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
  const cardId = typeof req.body?.cardId === "string" ? req.body.cardId : "";
  if (!sessionId || !cardId) {
    return res
      .status(400)
      .json({
        ok: false,
        error: "body.sessionId and body.cardId are required",
      });
  }
  if (req.auth!.role !== "facilitator") {
    return res
      .status(403)
      .json({ ok: false, error: "Only the facilitator can dismiss cards" });
  }

  const card = suggestions.dismissCard(sessionId, cardId);
  if (!card) {
    return res.status(404).json({ ok: false, error: "Card not found" });
  }
  res.json({ ok: true, data: { card } });
});

aiRouter.get("/suggest/:sessionId", requireAuth, requireSessionAccess("params"), async (req, res, next) => {
  try {
    await suggestions.hydrate(req.params.sessionId);
    const cards = suggestions.allCards(req.params.sessionId);
    res.json({ ok: true, data: { sessionId: req.params.sessionId, cards } });
  } catch (err) {
    next(err);
  }
});
