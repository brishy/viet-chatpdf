import { OpenAIApi, Configuration } from "openai-edge";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

export async function getEmbeddings(text: string) {
  try {
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text.replace(/\n/g, " "),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API request failed with status: ${response.status}`
      );
    }

    const result = await response.json();

    if (
      result &&
      result.data &&
      result.data.length > 0 &&
      result.data[0].embedding
    ) {
      return result.data[0].embedding as number[];
    } else {
      throw new Error("Embedding data not found");
    }
  } catch (error) {
    console.log("error calling openai embeddings api");
    throw error;
  }
}
