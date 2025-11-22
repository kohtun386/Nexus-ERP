import { GoogleGenAI } from "@google/genai";
import { InventoryItem, Order, WorkerLog } from "../types";

// Initialize Gemini Client
// Note: API Key is expected to be in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeBusinessData = async (
  inventory: InventoryItem[],
  recentOrders: Order[],
  productionLogs: WorkerLog[]
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "API Key not found. Enable AI features by setting the API Key.";
    }

    const model = "gemini-2.5-flash";
    
    // Prepare a concise summary for the AI
    const dataSummary = JSON.stringify({
      lowStockItems: inventory.filter(i => i.currentStock <= i.reorderLevel).map(i => ({ name: i.name, stock: i.currentStock, min: i.reorderLevel })),
      recentSalesTotal: recentOrders.reduce((acc, curr) => acc + curr.totalAmount, 0),
      recentProductionCount: productionLogs.length,
      topSellingItems: recentOrders.flatMap(o => o.items).slice(0, 5) // Simplified
    });

    const prompt = `
      Act as a manufacturing business intelligence analyst. 
      Analyze the following JSON snapshot of our factory data:
      ${dataSummary}

      Provide 3 short, actionable bullet points about:
      1. Inventory health (urgent reorders needed?).
      2. Sales performance.
      3. Production efficiency.
      
      Keep it professional and concise. Format as simple text.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "No insights generated.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Unable to generate AI insights at this time.";
  }
};
