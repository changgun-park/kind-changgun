import { Request, Response } from "express";
import { askQuestion } from "./question-service";

export async function slackEventHandler(req: Request, res: Response) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  const { type, event } = req.body;

  // URL verification
  if (req.body.type === "url_verification") {
    return res.json({ challenge: req.body.challenge });
  }

  if (type === "event_callback") {
    // 🔥 CRITICAL: Respond to Slack immediately to prevent retries
    res.status(200).send("OK");
    // Process the event asynchronously
    processEventAsync(event, requestId, startTime);
  } else {
    res.status(200).send("OK");
  }
}

async function processEventAsync(
  event: any,
  requestId: string,
  startTime: number
) {
  // Handle app mentions
  if (event.type === "app_mention") {
    try {
      const question = event.text.replace(/<@[^>]+>/g, "").trim();
      if (question) {
        const answer = await askQuestion(question);
        await sendSlackMessage(event.channel, answer);
        const totalTime = Date.now() - startTime;
        console.log(`[${requestId}] 🎉 Question answered in ${totalTime}ms`);
      }
    } catch (error) {
      console.error(`[${requestId}] ❌ Error processing app mention:`, error);
      try {
        await sendSlackMessage(
          event.channel,
          "Sorry, I'm having trouble connecting to my database right now. Please try again later."
        );
      } catch (slackError) {
        console.error(
          `[${requestId}] 💥 Failed to send error message:`,
          slackError
        );
      }
    }
  }

  // Handle direct messages
  else if (event.type === "message" && event.channel_type === "im") {
    try {
      if (event.bot_id) {
        return; // Ignore bot messages
      }

      const answer = await askQuestion(event.text);
      await sendSlackMessage(event.channel, answer);

      const totalTime = Date.now() - startTime;
      console.log(
        `[${requestId}] 🎉 Direct message answered in ${totalTime}ms`
      );
    } catch (error) {
      console.error(
        `[${requestId}] ❌ Error processing direct message:`,
        error
      );
      try {
        await sendSlackMessage(
          event.channel,
          "Sorry, I'm having trouble connecting to my database right now. Please try again later."
        );
      } catch (slackError) {
        console.error(
          `[${requestId}] 💥 Failed to send error message:`,
          slackError
        );
      }
    }
  }
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
      const errorText = await response.text();
      throw new Error(`Slack API error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();

    if (!responseData.ok) {
      throw new Error(`Slack API error: ${responseData.error}`);
    }
  } catch (error) {
    throw error;
  }
}
