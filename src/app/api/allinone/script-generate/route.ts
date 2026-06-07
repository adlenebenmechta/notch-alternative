import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DEEPSEEK_KEY = process.env.DEEPSEEK_KEY || "sk-b1cf6ffa8ebd457abc96da5904912931";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, videoFormat, channelStyle, context } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const format = videoFormat || "Short-form video (TikTok/Reels/Shorts)";
    const style = channelStyle || "Casual & conversational";
    const ctx = context || "";

    const systemPrompt = `You are an expert video scriptwriter. You create engaging, natural-sounding scripts for videos.

Rules:
- Create a complete, well-structured script for the given topic
- Video format: ${format}
- Channel style: ${style}
${ctx ? `- Additional context: ${ctx}` : ""}
- Use clear, conversational language
- Include hook, main content, and call-to-action
- Make it engaging and compelling from start to finish
- Add stage directions in [brackets] where helpful
- Estimate the duration based on the format

CRITICAL: Respond ONLY with a valid JSON object. No markdown. No code blocks. No explanation.
{"title": "script title", "script": "the full script text with stage directions", "duration": estimated_seconds, "wordCount": number_of_words}`;

    const userPrompt = `Create a video script for: "${prompt.trim()}"`;

    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.9,
            max_tokens: 4000,
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "Unknown error");
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          return NextResponse.json(
            { error: `DeepSeek API error (${response.status}): ${errText.slice(0, 300)}` },
            { status: 500 }
          );
        }

        const completion = await response.json();
        const rawContent = completion?.choices?.[0]?.message?.content || "";

        if (!rawContent.trim()) {
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          return NextResponse.json({ error: "AI returned empty response" }, { status: 500 });
        }

        // Parse JSON response
        let jsonStr = rawContent.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();

        const braceStart = jsonStr.indexOf("{");
        const braceEnd = jsonStr.lastIndexOf("}");
        if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
          jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
        }

        let parsed;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          // Return the raw script if JSON parsing fails
          return NextResponse.json({
            title: prompt.trim(),
            script: rawContent.trim(),
            duration: Math.round(rawContent.split(/\s+/).length / 2.5),
            wordCount: rawContent.split(/\s+/).length,
          });
        }

        return NextResponse.json({
          title: parsed.title || prompt.trim(),
          script: parsed.script || rawContent.trim(),
          duration: parsed.duration || Math.round((parsed.script || rawContent).split(/\s+/).length / 2.5),
          wordCount: parsed.wordCount || (parsed.script || rawContent).split(/\s+/).length,
        });
      } catch (err) {
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return NextResponse.json({ error: "Script generation failed after retries" }, { status: 500 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Script generation error:", msg);
    return NextResponse.json({ error: "Script generation failed: " + msg }, { status: 500 });
  }
}
