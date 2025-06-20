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
    // Handle app mentions
    if (event.type === "app_mention") {
      try {
        const question = event.text.replace(/<@[^>]+>/g, "").trim();

        if (question) {
          const questionStart = Date.now();
          const answer = await askQuestion(question);
          console.log(
            `[${requestId}] ✅ Question answered in ${
              Date.now() - questionStart
            }ms`
          );
          await sendSlackMessage(event.channel, answer);
          const totalTime = Date.now() - startTime;
          console.log(`[${requestId}] 🎉 Question answered in ${totalTime}ms`);
        } else {
          console.log(`[${requestId}] ⚠️ No question extracted from message`);
          // TODO: 스페이스만 찍어서 보냇을때도 뭔가 대답을 해줘야 하지 않을까?
        }
      } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(
          `[${requestId}] ❌ Error processing Slack event after ${totalTime}ms:`,
          {
            error: (error as Error).message,
            stack: (error as Error).stack,
            eventType: event.type,
            channel: event.channel,
          }
        );

        try {
          console.log(
            `[${requestId}] 🆘 Attempting to send error message to Slack...`
          );
          await sendSlackMessage(
            event.channel,
            "Sorry, I'm having trouble connecting to my database right now. Please try again later."
          );
          console.log(`[${requestId}] ✅ Error message sent to Slack`);
        } catch (slackError) {
          console.error(
            `💥 Failed to send error message to Slack:`,
            slackError
          );
        }
      }
    }

    // Handle direct messages
    if (event.type === "message" && event.channel_type === "im") {
      try {
        if (event.bot_id) {
          console.log(`[${requestId}] 🤖 Ignoring bot message`);
          return res.status(200).send("OK");
        }
        const answer = await askQuestion(event.text);
        await sendSlackMessage(event.channel, answer);

        const totalTime = Date.now() - startTime;
        console.log(
          `[${requestId}] 🎉 Complete flow successful in ${totalTime}ms`
        );
      } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(
          `[${requestId}] ❌ Error processing direct message after ${totalTime}ms:`,
          {
            error: (error as Error).message,
            stack: (error as Error).stack,
            eventType: event.type,
            channel: event.channel,
          }
        );

        try {
          console.log(
            `[${requestId}] 🆘 Attempting to send error message to Slack...`
          );
          await sendSlackMessage(
            event.channel,
            "Sorry, I'm having trouble connecting to my database right now. Please try again later."
          );
          console.log(`[${requestId}] ✅ Error message sent to Slack`);
        } catch (slackError) {
          console.error(
            `[${requestId}] 💥 Failed to send error message to Slack:`,
            slackError
          );
        }
      }
    }
  }

  console.log(`[${requestId}] ✅ Slack event handler completed`);
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
