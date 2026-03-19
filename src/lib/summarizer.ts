let openaiClient: unknown = null;

async function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (openaiClient) return openaiClient;

  try {
    const { OpenAI } = await import('openai');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openaiClient;
  } catch {
    return null;
  }
}

export async function generateJapaneseSummary(
  title: string,
  abstract: string | null | undefined
): Promise<{ summary: string; shortSummary: string }> {
  const client = await getOpenAIClient();

  if (!client || !abstract) {
    const fallback = abstract
      ? `${abstract.slice(0, 150)}...`
      : `論文「${title.slice(0, 50)}」の要約は利用できません。`;
    return {
      summary: fallback,
      shortSummary: title.slice(0, 80),
    };
  }

  try {
    const { OpenAI } = await import('openai');
    const typedClient = client as InstanceType<typeof OpenAI>;

    const response = await typedClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            '材料科学の論文要約の専門家です。与えられた論文のタイトルとアブストラクトを日本語で要約してください。',
        },
        {
          role: 'user',
          content: `以下の論文を日本語で要約してください。

タイトル: ${title}

アブストラクト: ${abstract}

以下の形式で回答してください：
短文サマリ（40字以内）: [1行の短い要約]
詳細要約（200字以内）: [重要な情報を含む詳細な要約]`,
        },
      ],
      max_tokens: 400,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';

    const shortMatch = content.match(/短文サマリ[^:：]*[:：]\s*(.+)/);
    const detailMatch = content.match(/詳細要約[^:：]*[:：]\s*([\s\S]+)/);

    const shortSummary = shortMatch?.[1]?.trim() || title.slice(0, 80);
    const summary = detailMatch?.[1]?.trim() || content.slice(0, 200);

    return { summary, shortSummary };
  } catch (error) {
    console.error('[Summarizer] OpenAI error:', error);
    return {
      summary: abstract?.slice(0, 200) || '',
      shortSummary: title.slice(0, 80),
    };
  }
}
