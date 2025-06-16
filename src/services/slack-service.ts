import { Request, Response } from "express";
import { askQuestion } from "./question-service";
import { testConnection } from "../database";

export async function slackEventHandler(req: Request, res: Response) {
  const { type, challenge, event } = req.body;

  // URL verification
  if (req.body.type === "url_verification") {
    return res.json({ challenge: req.body.challenge });
  }

  if (type === "event_callback") {
    // Handle app mentions
    if (event.type === "app_mention") {
      try {
        console.log("🔍 Received app mention event:", event.text);
        const question = event.text.replace(/<@[^>]+>/g, "").trim();

        if (question) {
          await testConnection();
          const answer = await askQuestion(question);
          await sendSlackMessage(event.channel, answer);
          console.log("✅ Sent answer to Slack");
        }
      } catch (error) {
        console.error("❌ Error processing Slack event:", error);
        await sendSlackMessage(
          event.channel,
          "Sorry, I'm having trouble connecting to my database right now. Please try again later."
        );
      }
    }

    // Handle direct messages
    if (event.type === "message" && event.channel_type === "im") {
      try {
        if (event.bot_id) return res.status(200).send("OK");

        console.log("🔍 Received direct message:", event.text);
        await testConnection();
        const answer = await askQuestion(event.text);
        await sendSlackMessage(event.channel, answer);
        console.log("✅ Sent answer to Slack");
      } catch (error) {
        console.error("❌ Error processing Slack event:", error);
        await sendSlackMessage(
          event.channel,
          "Sorry, I'm having trouble connecting to my database right now. Please try again later."
        );
      }
    }
  }

  return res.status(200).send("OK");
}

export async function sendSlackMessage(
  channel: string,
  text: string
): Promise<void> {
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channel,
        text: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log("📤 Message sent to Slack successfully");
  } catch (error) {
    console.error("❌ Error sending Slack message:", error);
    throw error;
  }
}
