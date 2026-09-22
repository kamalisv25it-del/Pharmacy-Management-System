import { GoogleGenAI } from '@google/genai';
import { db } from './db.js';

let aiClient = null;

function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
  }
  return aiClient;
}

/**
 * Compile current pharmacy database snapshot as structured context for Gemini
 */
async function buildPharmacyContext() {
  const [dashboard, medicines, customers, sales, purchases, pharmacy] = await Promise.all([
    db.getDashboardData(),
    db.getMedicines(),
    db.getCustomers(),
    db.getSales(),
    db.getPurchases(),
    db.getPharmacyInfo()
  ]);

  const lowStock = medicines.filter(m => m.stock < 15);
  const expiringSoon = medicines.filter(m => {
    const exp = (m.expiry_date || '').toLowerCase();
    return exp.includes('2026') || exp.includes('oct 2026') || exp.includes('nov 2026') || exp.includes('dec 2026');
  });

  return {
    pharmacy: {
      name: pharmacy.name,
      location: pharmacy.address,
      contact: pharmacy.phone
    },
    metrics: {
      totalMedicines: dashboard.totalMedicines,
      totalCustomers: dashboard.totalCustomers,
      totalSalesAmount: dashboard.totalSalesAmount,
      totalPurchasesAmount: dashboard.totalPurchasesAmount,
      totalTransactions: dashboard.totalTransactions,
      lowStockCount: lowStock.length,
      expiringSoonCount: expiringSoon.length
    },
    inventorySample: medicines.map(m => ({
      id: m.id,
      name: m.name,
      category: m.category,
      stock: m.stock,
      price: m.price,
      expiry: m.expiry_date,
      batch: m.batch_no,
      status: m.status
    })),
    customersSummary: customers.map(c => ({
      id: c.id,
      name: c.name,
      city: c.address,
      purchases: c.purchase_count,
      totalSpent: c.total_purchase,
      status: c.status
    })),
    recentSales: sales.slice(0, 10).map(s => ({
      id: s.id,
      customer: s.customer_name,
      amount: s.amount,
      payment: s.payment_method,
      status: s.status,
      date: s.date
    })),
    recentPurchases: purchases.slice(0, 10).map(p => ({
      id: p.id,
      customer: p.customer_name,
      medicine: p.medicine,
      quantity: p.quantity,
      amount: p.amount,
      date: p.date
    }))
  };
}

/**
 * Deterministic analysis fallback when GEMINI_API_KEY is not configured
 */
function generateLocalInsight(type, query, context) {
  const { metrics, inventorySample, customersSummary, recentSales } = context;
  const lowStockItems = inventorySample.filter(m => m.stock < 15);
  const expiringItems = inventorySample.filter(m => (m.expiry || '').includes('2026'));
  const topCustomer = [...customersSummary].sort((a, b) => b.totalSpent - a.totalSpent)[0];

  if (type === 'inventory_audit' || /stock|expir/i.test(query)) {
    return {
      title: "Inventory & Stock Audit Report",
      summary: `Found ${lowStockItems.length} low-stock item(s) and ${expiringItems.length} item(s) nearing expiry in 2026.`,
      insights: [
        lowStockItems.length > 0
          ? `**Low Stock Alert**: Urgent replenishment needed for: ${lowStockItems.map(m => `${m.name} (${m.stock} left)`).join(', ')}.`
          : `**Stock Status**: All catalog items meet safety stock thresholds (>15 units).`,
        expiringItems.length > 0
          ? `**Expiry Warning**: Inspect batches for ${expiringItems.map(m => `${m.name} [Exp: ${m.expiry}]`).join(', ')}.`
          : `**Expiry Status**: No urgent batch expirations detected.`,
        `**Catalog Metrics**: ${metrics.totalMedicines} total medicines tracked with active batch tracking.`
      ],
      recommendations: [
        "Place supplier purchase orders for items below safety buffer of 15 units.",
        "Prioritize dispensing older batches first (First-Expired, First-Out - FEFO)."
      ],
      source: "Local Analytics Engine"
    };
  }

  if (type === 'sales_summary' || /sales|revenue|billing/i.test(query)) {
    return {
      title: "Sales & Financial Summary",
      summary: `Total processed revenue is ₹${metrics.totalSalesAmount.toLocaleString()} across ${metrics.totalTransactions} billing transactions.`,
      insights: [
        `**Revenue Flow**: Accumulated sales amount is ₹${metrics.totalSalesAmount.toLocaleString()}.`,
        `**Top Customer**: ${topCustomer ? `${topCustomer.name} (Total spent: ₹${topCustomer.totalSpent.toLocaleString()})` : 'N/A'}.`,
        `**Recent Invoices**: Processed ${recentSales.length} invoice(s) across Cash, Card, and UPI channels.`
      ],
      recommendations: [
        "Maintain adequate stock of fast-moving prescription medicines.",
        "Continue offering multiple digital payment methods to minimize checkout friction."
      ],
      source: "Local Analytics Engine"
    };
  }

  return {
    title: "Pharmacy Operations Summary",
    summary: `PharmaCare is managing ${metrics.totalMedicines} medicines, ${metrics.totalCustomers} registered customers, and ₹${metrics.totalSalesAmount.toLocaleString()} in revenue.`,
    insights: [
      `**Inventory**: ${metrics.totalMedicines} medicines, with ${lowStockItems.length} low-stock alerts.`,
      `**Customer Base**: ${metrics.totalCustomers} active customer profiles.`,
      `**Finances**: ₹${metrics.totalSalesAmount.toLocaleString()} in sales volume.`
    ],
    recommendations: [
      "Replenish low-stock medicines.",
      "Engage inactive customers with health reminders."
    ],
    source: "Local Analytics Engine"
  };
}

/**
 * Main AI Assistant Handler
 * Uses Google Gemini 3.8 Flash or deterministic fallback
 */
export async function analyzePharmacyData(query = '', type = 'custom') {
  const context = await buildPharmacyContext();
  const client = getAIClient();

  // If no Gemini API key is configured, use structured local fallback
  if (!client) {
    const localResult = generateLocalInsight(type, query, context);
    return {
      success: true,
      mode: 'offline_fallback',
      model: 'deterministic_analytics',
      message: 'Generated using local analytics engine. Add GEMINI_API_KEY in settings to enable live Gemini 3.8 Flash intelligence.',
      data: localResult
    };
  }

  try {
    const systemPrompt = `You are PharmaCare AI, an expert clinical pharmacy and inventory management intelligence assistant for a professional pharmacy.
Analyze the provided live pharmacy database snapshot and provide accurate, actionable, data-grounded insights.

Current Database Context:
${JSON.stringify(context, null, 2)}

User Request Type: ${type}
User Query: ${query || 'Provide a complete management analysis'}

Instructions:
1. Provide a direct, professional, concise response formatted as JSON.
2. Structure your JSON response with these exact keys:
   - "title": Short string title of the report or answer.
   - "summary": 1-2 sentence executive summary answering the inquiry directly.
   - "insights": Array of 3-5 specific, bulleted insights citing actual names, counts, prices, or dates from the database. Use markdown bolding for key terms.
   - "recommendations": Array of 2-3 specific, actionable recommendations for pharmacy staff.
3. Respond ONLY with valid, raw JSON (no surrounding markdown code blocks, or standard JSON object).
4. Strictly ground all answers in the provided database context. Do not invent products or figures not present.`;

    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('AI response timed out, switching to local backup')), 8000);
    });

    const generatePromise = client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    let response;
    try {
      response = await Promise.race([generatePromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    const responseText = response.text || '';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch {
      // In case of slight formatting, try cleaning code fence
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    return {
      success: true,
      mode: 'gemini_live',
      model: 'gemini-3.8-flash',
      message: 'Analysis generated by Gemini 3.8 Flash based on live Supabase PostgreSQL data.',
      data: parsedData
    };
  } catch (err) {
    console.error('Gemini API call failed, falling back to local insights:', err.message);
    const fallback = generateLocalInsight(type, query, context);
    return {
      success: true,
      mode: 'error_fallback',
      model: 'deterministic_analytics',
      message: `Gemini API temporary notice: ${err.message}. Showing local analytics backup.`,
      data: fallback
    };
  }
}
