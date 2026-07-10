import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// CUSTOMER FEEDBACK & SURVEYS
// NPS, CSAT, satisfaction surveys, testimonial collection
// ═══════════════════════════════════════════════════════════════════

export const createSurvey = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    questions: v.array(v.object({
      question: v.string(),
      type: v.string(),
      required: v.boolean(),
      options: v.optional(v.array(v.string())),
    })),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const surveyId = await ctx.db.insert("surveys", {
      name: args.name,
      type: args.type,
      questions: args.questions,
      responseCount: 0,
      isActive: true,
      createdAt: Date.now(),
    });
    return { success: true, surveyId, shareUrl: `https://dutchkem-prosuite-app.vercel.app/survey/${surveyId}` };
  },
});

export const submitResponse = mutation({
  args: {
    surveyId: v.string(),
    respondentName: v.optional(v.string()),
    respondentEmail: v.optional(v.string()),
    answers: v.array(v.object({
      questionIndex: v.number(),
      value: v.string(),
    })),
    testimonial: v.optional(v.string()),
    rating: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const responseId = await ctx.db.insert("survey_responses", {
      surveyId: args.surveyId as any,
      respondentName: args.respondentName || "Anonymous",
      respondentEmail: args.respondentEmail || "",
      answers: args.answers,
      testimonial: args.testimonial || "",
      rating: args.rating || 0,
      createdAt: Date.now(),
    });

    // Increment response count
    const survey = await ctx.db.get(args.surveyId as any);
    if (survey) {
      await ctx.db.patch(args.surveyId as any, {
        responseCount: ((survey as any).responseCount || 0) + 1,
      });
    }

    return { success: true, responseId };
  },
});

export const getSurveyResults = query({
  args: { surveyId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId as any);
    if (!survey) return null;

    const responses = await ctx.db
      .query("survey_responses")
      .withIndex("by_survey", (q) => q.eq("surveyId", args.surveyId as any))
      .take(500);

    // NPS calculation
    const ratings = responses.filter((r: any) => r.rating > 0).map((r: any) => r.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length : 0;
    const promoters = ratings.filter((r: number) => r >= 9).length;
    const passives = ratings.filter((r: number) => r >= 7 && r < 9).length;
    const detractors = ratings.filter((r: number) => r < 7).length;
    const nps = ratings.length > 0 ? Math.round(((promoters - detractors) / ratings.length) * 100) : 0;

    // CSAT (rating 1-5)
    const csatRatings = responses.filter((r: any) => r.rating >= 1 && r.rating <= 5).map((r: any) => r.rating);
    const csat = csatRatings.length > 0 ? (csatRatings.reduce((s: number, r: number) => s + r, 0) / csatRatings.length / 5 * 100).toFixed(1) : "0";

    // Testimonials
    const testimonials = responses.filter((r: any) => r.testimonial).map((r: any) => ({
      name: r.respondentName,
      text: r.testimonial,
      rating: r.rating,
      date: new Date(r.createdAt).toLocaleDateString("en-NG"),
    }));

    return {
      survey: { name: (survey as any).name, type: (survey as any).type },
      totalResponses: responses.length,
      nps,
      npsBreakdown: { promoters, passives, detractors },
      csat,
      avgRating: avgRating.toFixed(1),
      testimonials,
    };
  },
});

export const getActiveSurveys = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("surveys").withIndex("by_active", (q) => q.eq("isActive", true)).order("desc").take(20);
  },
});

export const generateSurveyPage = action({
  args: {
    surveyId: v.string(),
    businessName: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const survey = await ctx.runQuery("survey_commerce:getSurveyForPage" as any, { surveyId: args.surveyId });
    if (!survey) return { success: false, error: "Survey not found" };

    const questionsHtml = (survey.questions || []).map((q: any, i: number) => {
      if (q.type === "rating") {
        return `<div class="q"><p>${i + 1}. ${q.question}</p><div class="stars">${[1,2,3,4,5].map(s => `<button type="button" onclick="selectRating(${i},${s})" class="star" data-q="${i}" data-v="${s}">★</button>`).join("")}</div><input type="hidden" name="q${i}" id="q${i}"></div>`;
      }
      if (q.type === "nps") {
        return `<div class="q"><p>${i + 1}. ${q.question}</p><div class="nps">${[0,1,2,3,4,5,6,7,8,9,10].map(s => `<button type="button" onclick="selectNPS(${i},${s})" class="nps-btn" data-q="${i}" data-v="${s}">${s}</button>`).join("")}</div><input type="hidden" name="q${i}" id="q${i}"></div>`;
      }
      if (q.type === "choice") {
        const opts = q.options || [];
        return `<div class="q"><p>${i + 1}. ${q.question}</p>${opts.map((o: string) => `<label class="choice"><input type="radio" name="q${i}" value="${o}"> ${o}</label>`).join("")}</div>`;
      }
      return `<div class="q"><p>${i + 1}. ${q.question}</p><textarea name="q${i}" rows="3" placeholder="Your answer..."></textarea></div>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${survey.name} — ${args.businessName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#f5f5f5;min-height:100vh;display:flex;justify-content:center;padding:20px}
.card{background:#fff;border-radius:16px;padding:40px;max-width:500px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
h1{color:#FF6B35;font-size:22px;margin-bottom:5px}.sub{color:#666;font-size:13px;margin-bottom:25px}
.q{margin-bottom:20px}.q p{font-weight:600;font-size:14px;margin-bottom:8px}
.q textarea,.q input[type=text],.q input[type=email]{width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit}
.stars{display:flex;gap:5px}.star{background:none;border:none;font-size:28px;cursor:pointer;color:#ddd;transition:color .2s}.star:hover,.star.active{color:#FF6B35}
.nps{display:flex;gap:4px;flex-wrap:wrap}.nps-btn{width:36px;height:36px;border:2px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-weight:700;font-size:13px;transition:all .2s}
.nps-btn:hover,.nps-btn.active{border-color:#FF6B35;color:#FF6B35;background:#FFF3ED}
.choice{display:block;padding:8px 0;font-size:14px;cursor:pointer}.choice input{margin-right:8px}
.btn{width:100%;padding:14px;background:#FF6B35;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;margin-top:10px}.btn:hover{background:#E85A2A}
.footer{text-align:center;margin-top:15px;font-size:11px;color:#999}
</style></head><body><div class="card">
<h1>${survey.name}</h1><p class="sub">${args.businessName}</p>
<form id="surveyForm">
${questionsHtml}
<div class="q"><p>Testimonial (optional)</p><textarea name="testimonial" rows="3" placeholder="Share your experience..."></textarea></div>
<button type="submit" class="btn">Submit Feedback</button>
</form>
<p class="footer">Powered by DutchKem Prosuite</p>
</div>
<script>
function selectRating(q,v){document.querySelectorAll('[data-q="'+q+'"]').forEach(b=>b.classList.remove('active'));document.querySelector('[data-q="'+q+'"][data-v="'+v+'"]').classList.add('active');document.getElementById('q'+q).value=v}
function selectNPS(q,v){document.querySelectorAll('.nps [data-q="'+q+'"]').forEach(b=>b.classList.remove('active'));document.querySelector('.nps [data-q="'+q+'"][data-v="'+v+'"]').classList.add('active');document.getElementById('q'+q).value=v}
</script></body></html>`;

    return { success: true, html };
  },
});
