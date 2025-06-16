import { Router } from "express";
import { slackEventHandler } from "../services/slack-service";

export const slackRouter = Router();

slackRouter.post("/events", slackEventHandler);
