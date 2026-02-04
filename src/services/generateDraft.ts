import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Generate a post draft based on scraped raw stories.
 * If no items are found, a fallback message is returned.
 */
export async function generateDraft(rawStories: string) {
  console.log(
    `Generating a post draft with raw stories (${rawStories.length} characters)...`,
  );

  try {
    const currentDate = new Date().toLocaleDateString();
    const header = `🚀 AI and LLM Trends on X for ${currentDate}\n\n`;

    // Determine which API to use based on available API keys
    const useOpenAI = !!process.env.OPENAI_API_KEY;
    const useDeepseek = !!process.env.DEEPSEEK_API_KEY && !useOpenAI;

    if (!useOpenAI && !useDeepseek) {
      throw new Error("No API keys found. Please provide either OPENAI_API_KEY or DEEPSEEK_API_KEY in your .env file.");
    }

    // Prepare messages with explicit literal types
    const messages: Array<{ role: "system" | "user"; content: string }> = [
      {
        role: "system",
        content:
          "You are a helpful assistant that creates a concise, bullet-pointed draft post based on input stories and tweets. " +
          "Return strictly valid JSON that has a key 'interestingTweetsOrStories' containing an array of items. " +
          "Each item should have a 'description' and a 'story_or_tweet_link' key.",
      },
      {
        role: "user",
        content: rawStories,
      },
    ];

    let rawJSON;

    if (useOpenAI) {
      console.log("Using OpenAI API...");
      // Instantiate the OpenAI client using your OPENAI_API_KEY
      const openai = new OpenAI({
		baseURL: 'https://api.openai.com',
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Call the OpenAI chat completions API
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // or your preferred model
        messages,
      });

      rawJSON = completion.choices[0].message.content;
    } else {
      console.log("Using Deepseek API...");
      // Instantiate the OpenAI client using your DEEPSEEK_API_KEY
      const deepseek = new OpenAI({
		baseURL: 'https://api.deepseek.com',
        apiKey: process.env.DEEPSEEK_API_KEY,
      });

      // Call the Deepseek chat completions API
      const completion = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages,
      });

      rawJSON = completion.choices[0].message.content;
    }

    if (!rawJSON) {
      console.log("No JSON output returned from API.");
      return header + "No output.";
    }
    console.log(rawJSON);
	
    // Clean up the JSON string by removing markdown code block formatting
    const cleanJSON = rawJSON
      .replace(/```json\s*/g, '') // Remove ```json
      .replace(/```\s*$/g, '')    // Remove trailing ```
      .trim();                    // Trim any extra whitespace	

    const parsedResponse = JSON.parse(cleanJSON);

    // Check for either key and see if we have any content
    const contentArray =
      parsedResponse.interestingTweetsOrStories || parsedResponse.stories || [];
    if (contentArray.length === 0) {
      return header + "No trending stories or tweets found at this time.";
    }

    // Build the draft post using the content array
    const draft_post =
      header +
      contentArray
        .map(
          (item: any) =>
            `• ${item.description || item.headline}\n  ${
              item.story_or_tweet_link || item.link
            }`,
        )
        .join("\n\n");

    return draft_post;
  } catch (error) {
    console.error("Error generating draft post", error);
    return "Error generating draft post.";
  }
}
