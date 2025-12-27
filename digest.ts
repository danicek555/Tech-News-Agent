import {
  webSearchTool,
  RunContext,
  Agent,
  AgentInputItem,
  Runner,
  withTrace,
} from "@openai/agents";
import { z } from "zod";
import "dotenv/config";
import nodemailer from "nodemailer";

// --- ENV helpers (added) ---
const parseNum = (v: string | undefined, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const parseBool = (v: string | undefined, def: boolean) => {
  if (v == null) return def;
  const s = v.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(s)) return true;
  if (["false", "0", "no", "n", "off"].includes(s)) return false;
  return def;
};

const parseTopics = (v: string | undefined) => {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

// Tool definitions
const webSearchPreview = webSearchTool({
  searchContextSize: "medium",
  userLocation: {
    type: "approximate",
  },
});
const TechNewsSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      publisher: z.string(),
      url: z.string(),
      category: z.string(),
      date: z.string(), // Date when the news was published
    })
  ),
});
interface TechNewsContext {
  stateRecencyHours: string;
  stateTopics: string;
  stateMaxItems: string;
  stateLanguage: string;
}
const techNewsInstructions = (
  runContext: RunContext<TechNewsContext>,
  _agent: Agent<TechNewsContext, typeof TechNewsSchema>
) => {
  const { stateRecencyHours, stateTopics, stateMaxItems, stateLanguage } =
    runContext.context;
  return `You are an agent for collecting and summarizing TECH news.
You must use the web search tool. Do not respond from memory. Return only items that come from the search results (URLs must not be made up).
Goal: Find the most important news from the last ${stateRecencyHours} hours for topics: ${stateTopics}.
Quality rules:
- Prefer trustworthy sources (official blogs/company announcements, respected tech websites, security advisories, research labs).
- Avoid clickbait and unsubstantiated leaks; if something is speculation, don't include it.
- Prioritize articles with clear dates and direct links to sources.
- Each item must have a URL, publisher, and publication date.
- Summary: max 2 sentences.
- Date: Include the publication date in format YYYY-MM-DD or a relative format like "2 hours ago" if exact date is not available.
Return maximum ${stateMaxItems} items. If you don't find anything relevant, return items: [] and explain why in notes.
Output language: ${stateLanguage} (cs = Czech, en = English).
The output must exactly match the JSON schema (no additional text outside JSON).`;
};
const techNewsAgent = new Agent<TechNewsContext, typeof TechNewsSchema>({
  name: "Tech News Search Agent",
  instructions: techNewsInstructions,
  model: "gpt-4.1",
  tools: [webSearchPreview],
  outputType: TechNewsSchema,
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
});

// Format email from news items
const formatEmailFromNews = (
  items: Array<{
    title: string;
    summary: string;
    publisher: string;
    url: string;
    category: string;
    date: string;
  }>,
  language: string = "en"
): { subject: string; body: string } => {
  if (items.length === 0) {
    return {
      subject: "No Tech News Found",
      body: "No relevant tech news was found for the specified criteria.",
    };
  }

  // Get current date for subject
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Generate a concise subject from the first few items
  const firstTitles = items
    .slice(0, 3)
    .map((item) => item.title)
    .join(", ");
  const titlesPart =
    firstTitles.length > 50
      ? firstTitles.substring(0, 47) + "..."
      : firstTitles;

  // Format the email body
  const bodyLines: string[] = [];
  if (language === "cs") {
    bodyLines.push("Nejnovější tech novinky:\n");
  } else {
    bodyLines.push("Latest Tech News:\n");
  }

  items.forEach((item, index) => {
    bodyLines.push(
      `${index + 1}. [${item.category}] ${item.title} (${item.date})`
    );
    bodyLines.push(`   ${item.summary}`);
    bodyLines.push(`   Source: ${item.publisher} - ${item.url}`);
    bodyLines.push(""); // Empty line between items
  });

  return {
    subject: `${currentDate} - Latest Tech News: ${titlesPart}`,
    body: bodyLines.join("\n"),
  };
};

// Email sending function
const sendEmail = async (
  to: string,
  subject: string,
  body: string
): Promise<void> => {
  // Create transporter based on environment variables
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_APP_PASSWORD, // Use app password for Gmail
    },
  });

  // Verify transporter configuration
  if (!process.env.SMTP_USER) {
    throw new Error(
      "SMTP_USER environment variable is required. Please set it in GitHub Secrets."
    );
  }
  if (!process.env.SMTP_PASSWORD && !process.env.SMTP_APP_PASSWORD) {
    throw new Error(
      "SMTP_PASSWORD or SMTP_APP_PASSWORD environment variable is required. Please set it in GitHub Secrets."
    );
  }

  // Send email
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: to,
    subject: subject,
    text: body,
    html: body.replace(/\n/g, "<br>"), // Convert newlines to HTML breaks
  });

  console.log(`Email sent successfully! Message ID: ${info.messageId}`);
};

type WorkflowInput = { input_as_text: string };

// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("Tech news agent", async () => {
    // Validate required environment variables
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY environment variable is required. Please set it in GitHub Secrets."
      );
    }

    const state = {
      language: process.env.LANGUAGE ?? "en",
      topics: parseTopics(process.env.TOPICS), // comma-separated
      recency_hours: parseNum(process.env.RECENCY_HOURS, 24),
      max_items: parseNum(process.env.MAX_ITEMS, 24),
      must_include_sources: parseBool(process.env.MUST_INCLUDE_SOURCES, true),
      recipient_email: process.env.RECIPIENT_EMAIL ?? "danmitka@gmail.com",
    };

    console.log("Workflow state:", {
      language: state.language,
      topics: state.topics,
      recency_hours: state.recency_hours,
      max_items: state.max_items,
      recipient_email: state.recipient_email,
    });

    const conversationHistory: AgentInputItem[] = [
      {
        role: "user",
        content: [{ type: "input_text", text: workflow.input_as_text }],
      },
    ];
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_6907dd0ed33c81909750f7614ad59777020cfeb2f88f3151",
      },
    });
    const newsSearchResultTemp = await runner.run(
      techNewsAgent,
      [
        ...conversationHistory,
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `User request: {
          Context:
          Topics: ${state.topics}
          Time window: last ${state.recency_hours} hours
          Find and select the most important news and return them in structured JSON format.
          Make sure to include the publication date for each news item.`,
            },
          ],
        },
      ],
      {
        context: {
          stateRecencyHours: state.recency_hours,
          stateTopics: state.topics,
          stateMaxItems: state.max_items,
          stateLanguage: state.language,
        },
      }
    );
    conversationHistory.push(
      ...newsSearchResultTemp.newItems.map((item) => item.rawItem)
    );

    if (!newsSearchResultTemp.finalOutput) {
      throw new Error("Agent result is undefined");
    }

    const newsSearchResult = {
      output_text: JSON.stringify(newsSearchResultTemp.finalOutput),
      output_parsed: newsSearchResultTemp.finalOutput,
    };

    // Format and send email directly from news items
    if (newsSearchResult.output_parsed.items.length > 0) {
      const emailContent = formatEmailFromNews(
        newsSearchResult.output_parsed.items,
        state.language
      );
      const emailSubject = emailContent.subject;

      let emailSent = false;
      try {
        if (!process.env.SMTP_USER) {
          console.warn(
            "⚠️  SMTP_USER not set. Skipping email send. Set SMTP secrets in GitHub to enable email."
          );
        } else {
          await sendEmail(
            state.recipient_email,
            emailSubject,
            emailContent.body
          );
          console.log(`✅ Email sent to ${state.recipient_email}`);
          emailSent = true;
        }
      } catch (error) {
        console.error("❌ Failed to send email:", error);
        if (error instanceof Error) {
          console.error("Email error details:", error.message);
        }
        // Continue and return result even if email fails
      }

      return {
        output_text: JSON.stringify(newsSearchResult.output_parsed),
        output_parsed: newsSearchResult.output_parsed,
        email: {
          subject: emailSubject,
          body: emailContent.body,
          sent: emailSent,
        },
      };
    } else {
      console.log("ℹ️  No news items found to send.");
      return newsSearchResult;
    }
  });
};

// Run the workflow if this file is executed directly
if (typeof require !== "undefined" && require.main === module) {
  (async () => {
    try {
      const input = process.argv[2] || "Find the latest tech news";
      console.log(`Running workflow with input: "${input}"`);
      console.log(`Environment check:`, {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasSmtpUser: !!process.env.SMTP_USER,
        hasRecipient: !!process.env.RECIPIENT_EMAIL,
      });
      const result = await runWorkflow({ input_as_text: input });
      console.log("\nResult:", JSON.stringify(result, null, 2));
      console.log("\n✅ Workflow completed successfully!");
      process.exit(0);
    } catch (error) {
      console.error("\n❌ Error running workflow:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      // Exit with code 1 to indicate failure
      process.exit(1);
    }
  })();
}
