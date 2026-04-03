import { GoogleGenAI } from "@google/genai";
const test = 'AIzaSyDcqGMRRNkEIpcwIHGE1CV8QPQq6GZ_j14'
// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({apiKey: test});

async function main() {
  try {
      const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
  } catch (error) {
    console.log("error:" + error.message);
  }
setTimeout(main, 1000)
}

main();