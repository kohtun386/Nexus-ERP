import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase'; // သင့် firebase.ts မှ functions instance ကို import လုပ်ပါ။

// Cloud Function ကို ကိုယ်စားပြုသော Callable Function တစ်ခု ဖန်တီးပါ။
// 'callGeminiApi' သည် functions/src/index.ts တွင် သင်ဖန်တီးခဲ့သော Function နာမည် ဖြစ်သည်။
const callGeminiCloudFunction = httpsCallable(functions, 'callGeminiApi');

// Gemini Insight ကို ရယူသည့် Function
export async function getGeminiInsight(userPrompt: string): Promise<string> {
  try {
    console.log("Calling Gemini Cloud Function with prompt:", userPrompt);
    const result = await callGeminiCloudFunction({ prompt: userPrompt });
    // result.data တွင် { success: true, response: "AI response" } ပုံစံဖြင့် ပြန်လာပါမည်။
    const aiResponse = result.data as { success: boolean; response: string };

    if (aiResponse.success) {
      return aiResponse.response;
    } else {
      throw new Error("Gemini Cloud Function returned an error.");
    }
  } catch (error) {
    console.error("Error fetching AI insight from Cloud Function:", error);
    // Error handling ကို သင့် app လိုအပ်ချက်အရ ထပ်ထည့်နိုင်ပါသည်။
    throw new Error("Failed to get AI insight. Please try again.");
  }
}

// သင်၏ React Components များတွင် ဤ function ကို ခေါ်ဆိုပုံ:
// import { getGeminiInsight } from '../../services/geminiService';
// const insight = await getGeminiInsight("Analyze current inventory data and suggest optimal reorder points.");
