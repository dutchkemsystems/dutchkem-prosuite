import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// PRE-SUBSCRIPTION HANDLER
// Provides warm, helpful responses BEFORE client subscribes
// ═══════════════════════════════════════════════════════════════════

// Track pre-subscription conversations per user
const MAX_FREE_EXCHANGES = 3;

// Agent-specific warm welcome messages
const AGENT_WELCOMES: Record<string, (userName?: string) => string> = {
  A1: (name) => `Hello ${name || 'there'}! 👋 Welcome to the Academic Writing Hub!

I'm your personal academic assistant — think of me as your thesis companion who's always available. 😊

I've helped over 2,000 students just like you navigate everything from first-year essays to PhD dissertations. Whether you're stuck on your literature review, need help with APA formatting, or just want someone to bounce ideas off — I'm here for you.

What brings you here today? I'd love to hear about your academic journey! 🎓`,

  A2: (name) => `Hey ${name || 'there'}! 👋 Welcome to the Business Advisory Suite!

Starting or growing a business is one of the bravest things you can do. I've worked with 3,000+ Nigerian entrepreneurs — from Lagos tech startups to Abuja agri-businesses — and I know the challenges you're facing.

I'm here to help with business plans, financial models, market research, and everything in between. No question is too small, and I promise to keep things simple and practical.

What's your business about? I'd love to learn more! 💼`,

  A3: (name) => `Hi ${name || 'there'}! 👋 Welcome to the Content Strategy Suite!

Great content is the heartbeat of any successful brand. I've helped hundreds of businesses create content that actually converts — from viral social posts to SEO-optimized blog articles.

Whether you're a startup founder, a marketing manager, or a solo entrepreneur, I'm here to help you create content that resonates with your audience.

What kind of content are you working on? Let's brainstorm together! ✍️`,

  A4: (name) => `Hello ${name || 'there'}! 👋 Welcome to Career Development Hub!

Your career is one of the most important investments you'll ever make. I've helped thousands of professionals land their dream jobs at companies like Google, MTN, and Dangote Group.

Whether you need help with your CV, LinkedIn profile, interview prep, or career strategy — I'm here to guide you every step of the way.

What's your career goal? I'd love to help you get there! 📄`,

  A5: (name) => `Hey ${name || 'there'}! 👋 Welcome to Personal Shopping Assistant!

Finding the right products at the right price shouldn't be a headache. I compare prices across 100+ vendors to save you time and money.

Whether you're shopping for electronics, fashion, home goods, or anything else — I'll help you make smart purchase decisions.

What are you looking for today? Let me help you find the best deals! 🛍️`,

  A6: (name) => `Hello ${name || 'there'}! 👋 Welcome to Exam Preparation Suite!

Exams can be stressful, but with the right preparation, you can ace them. My students have improved their scores by 40% on average.

Whether you're preparing for JAMB, WAEC, PMP, CFA, or any other exam — I'm here to create a study plan that actually works.

What exam are you preparing for? Let's create a winning strategy! 📝`,

  A7: (name) => `Hey ${name || 'there'}! 👋 Welcome to Financial Planning Suite!

Money management doesn't have to be stressful. I've helped 4,000+ Nigerians save over ₦500M through smart budgeting and investment strategies.

Whether you want to create a budget, plan for retirement, or optimize your taxes — I'm here to help you take control of your finances.

What's your biggest financial goal right now? Let's create a plan to get there! 💰`,

  A8: (name) => `Hello ${name || 'there'}! 👋 Welcome to MediaStudio Pro!

Great content deserves great presentation. I've helped creators produce professional videos, scripts, and media content that stands out.

Whether you need help with video editing, script writing, or content strategy — I'm here to bring your vision to life.

What kind of media project are you working on? Let's make it amazing! 🎬`,

  A9: (name) => `Hey ${name || 'there'}! 👋 Welcome to Wellness & Health Suite!

Your health is your most valuable asset. I've helped thousands of people create sustainable wellness routines that actually work.

Whether you need a meal plan, workout routine, or just want to feel more energized — I'm here to help you on your wellness journey.

What's your health goal? Let's create a plan that works for your lifestyle! 🏥`,

  A10: (name) => `Hello ${name || 'there'}! 👋 Welcome to Home Management Suite!

Your home should be your sanctuary. I've helped countless families create organized, efficient living spaces.

Whether you need cleaning schedules, maintenance plans, or home organization tips — I'm here to help you create a home that works for you.

What's your biggest home challenge right now? Let's solve it together! 🧹`,

  A11: (name) => `Hey ${name || 'there'}! 👋 Welcome to Language Learning Suite!

Learning a new language opens up a world of opportunities. I've helped 500+ students become fluent in languages from Yoruba to Mandarin.

Whether you're learning for work, travel, or personal growth — I'm here to make your language journey fun and effective.

What language are you interested in learning? Let's get started! 🗣️`,

  A12: (name) => `Hello ${name || 'there'}! 👋 Welcome to Travel Planning Suite!

Travel is one of life's greatest pleasures. I've helped 1,000+ travelers plan unforgettable trips across Nigeria and beyond.

Whether you're planning a weekend getaway, a business trip, or a dream vacation — I'm here to create the perfect itinerary.

Where are you thinking of traveling? Let's plan something amazing! ✈️`,

  A13: (name) => `Hey ${name || 'there'}! 👋 Welcome to ServiceMart NG!

Finding reliable local services shouldn't be a hassle. I connect you with trusted professionals in your area.

Whether you need a plumber, electrician, caterer, or any other service — I'll help you find the right person for the job.

What service are you looking for today? Let me help you find it! 🚀`,

  A14: (name) => `Hello ${name || 'there'}! 👋 Welcome to Translation Hub!

Breaking language barriers is what we do best. I provide accurate, culturally-aware translations across 50+ languages.

Whether you need document translation, website localization, or business communication in multiple languages — I'm here to help.

What languages do you need help with? Let's get started! 🗣️📝`,

  A15: (name) => `Hey ${name || 'there'}! 👋 Welcome to Event Planning Suite!

Every great event starts with great planning. I've helped 800+ clients create memorable events that wow their guests.

Whether you're planning a wedding, corporate event, birthday party, or conference — I'm here to handle every detail.

What kind of event are you planning? Let's make it unforgettable! 🎉`,
};

// Pre-subscription value responses based on agent type
const PRE_SUBSCRIPTION_VALUES: Record<string, (prompt: string) => string> = {
  A1: (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('thesis') || lowerPrompt.includes('dissertation')) {
      return `Great question about thesis/dissertation work! 📚

Here's what I'd recommend for a strong thesis:

1. **Start with a clear research question** — This is the foundation of everything
2. **Do a thorough literature review** — I can help you identify key sources
3. **Choose the right methodology** — Quantitative, qualitative, or mixed methods
4. **Structure your chapters properly** — Introduction, Literature Review, Methodology, Findings, Discussion, Conclusion

**Free Tip:** Many students make the mistake of writing their introduction first. Start with your methodology and findings — the introduction will write itself!

Would you like me to help you outline your thesis structure? I can provide a detailed chapter-by-chapter guide. 🎓`;
    }
    if (lowerPrompt.includes('apa') || lowerPrompt.includes('citation') || lowerPrompt.includes('reference')) {
      return `Great question about citations! 📝

Here's a quick APA 7th Edition cheat sheet:

**In-text citations:**
- One author: (Smith, 2024)
- Two authors: (Smith & Johnson, 2024)
- Three+ authors: (Smith et al., 2024)

**Reference list:**
- Journal: Author, A. A. (Year). Title of article. *Journal Name*, *Volume*(Issue), Pages. DOI
- Book: Author, A. A. (Year). *Title of book*. Publisher.
- Website: Author, A. A. (Year). *Title of page*. URL

**Free Tip:** Always use DOIs when available — they make your references more credible and easier for readers to find.

Want me to help you format a specific citation? 🎓`;
    }
    return `That's a great question! 🤔

I'd be happy to help you with that. As your academic assistant, I specialize in:

✅ Thesis & dissertation writing
✅ Research papers & literature reviews
✅ Data analysis (SPSS, Python, R)
✅ APA, MLA, Chicago formatting
✅ Plagiarism checks

Many of my clients initially felt overwhelmed, but with the right guidance, they all completed their work successfully.

What specific aspect of academic writing would you like help with? I can provide detailed guidance right here! 🎓`;
  },

  A2: (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('business plan') || lowerPrompt.includes('startup')) {
      return `Excellent question about business planning! 💼

Here's what every successful business plan needs:

1. **Executive Summary** — Your elevator pitch (1-2 pages)
2. **Company Description** — What you do, who you serve
3. **Market Analysis** — TAM/SAM/SOM, competitor research
4. **Organization** — Team structure, roles
5. **Product/Service** — What you're offering
6. **Marketing Strategy** — How you'll reach customers
7. **Financial Projections** — 3-year revenue forecast
8. **Funding Request** — How much you need

**Free Tip:** Investors spend 3-5 minutes on a business plan. Make your executive summary count!

Would you like me to help you create a business plan outline for your specific industry? 💼`;
    }
    if (lowerPrompt.includes('financial') || lowerPrompt.includes('projection') || lowerPrompt.includes('revenue')) {
      return `Great question about financial planning! 💰

Here's a simple framework for financial projections:

**Year 1:** Focus on survival and learning
- Conservative revenue estimates
- Lean operations
- Emergency fund

**Year 2:** Focus on growth
- 20-30% revenue growth target
- Team expansion
- Market expansion

**Year 3:** Focus on scale
- 50%+ revenue growth
- Multiple revenue streams
- Strategic partnerships

**Free Tip:** Always base your projections on real data, not wishful thinking. Show investors you understand your market.

Would you like me to help you create a financial projection template? 💼`;
    }
    return `That's a great question! 💼

As a business consultant, I've helped 3,000+ Nigerian entrepreneurs succeed. Here's what I can help you with:

✅ Business plans & feasibility studies
✅ Financial models & projections
✅ Pitch decks for investors
✅ Market research & SWOT analysis
✅ Pricing strategies
✅ Go-to-market plans

**Free Tip:** The most successful businesses start with a clear understanding of their target market. Who exactly are your customers?

What's your biggest business challenge right now? Let's tackle it together! 💼`;
  },

  A3: (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('blog') || lowerPrompt.includes('seo') || lowerPrompt.includes('content')) {
      return `Great question about content creation! ✍️

Here's my proven content framework:

**The AIDA Formula:**
- **A**ttention — Hook them with a compelling headline
- **I**nterest — Share valuable insights
- **D**esire — Show the benefits
- **A**ction — Tell them what to do next

**Free Tips for Better Content:**
1. Write for scannability — Use headers, bullets, short paragraphs
2. Include data and statistics — Numbers build credibility
3. Tell stories — People remember stories 22x more than facts
4. End with a clear CTA — Don't leave them guessing

Would you like me to help you create a content calendar or write a specific piece? ✍️`;
    }
    return `That's a great question! ✍️

I specialize in creating content that actually converts. Here's what I can help you with:

✅ Blog posts & articles
✅ Social media content
✅ Email campaigns
✅ Sales copy & landing pages
✅ SEO-optimized content
✅ Brand storytelling

**Free Tip:** The best content solves a problem. Ask yourself: "What pain point does my audience have?"

What type of content are you looking to create? ✍️`;
  },

  A4: (prompt) => {
    return `Great career question! 📄

Here's what I've learned from helping 2,000+ professionals land their dream jobs:

**The 3-Second Rule:** Recruiters spend 3-7 seconds on initial resume screening. Make those seconds count!

**Key Resume Tips:**
1. Start with a strong summary statement
2. Use action verbs (led, developed, increased, achieved)
3. Quantify results (increased sales by 40%, managed team of 15)
4. Tailor to each job description

**Free Tip:** The #1 mistake I see? Generic resumes. Every application should be customized.

What's your career goal? I can help you create a strategy to get there! 📄`;
  },

  A7: (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('budget') || lowerPrompt.includes('save') || lowerPrompt.includes('money')) {
      return `Great question about budgeting! 💰

Here's the **50/30/20 Rule** that works for most people:

**50% - Needs:** Rent, food, transport, utilities
**30% - Wants:** Entertainment, dining out, hobbies
**20% - Savings:** Emergency fund, investments, debt repayment

**Free Tip:** Track every naira for one month. You'll be surprised where your money goes!

Would you like me to help you create a personalized budget based on your income? 💰`;
    }
    return `That's a great question! 💰

I'm here to help you take control of your finances. Here's what I can help you with:

✅ Personal budgets & expense tracking
✅ Debt repayment plans
✅ Investment strategies
✅ Tax optimization
✅ Retirement planning
✅ Savings challenges

**Free Tip:** Start with tracking your expenses for 30 days. Awareness is the first step to financial freedom!

What's your biggest financial goal right now? 💰`;
  },

  A9: (prompt) => {
    return `Great wellness question! 🏥

Here are 5 simple habits that can transform your health:

1. **Hydration** — Drink 8 glasses of water daily
2. **Movement** — 30 minutes of walking daily
3. **Sleep** — Aim for 7-8 hours consistently
4. **Nutrition** — Fill half your plate with vegetables
5. **Mindfulness** — 5 minutes of meditation daily

**Free Tip:** Start with just ONE habit. Master it, then add another. Small changes compound over time!

What's your biggest health challenge? I can create a personalized plan for you! 🏥`;
  },

  A11: (prompt) => {
    return `Great language question! 🗣️

Here are my top tips for learning any language faster:

1. **Immersion** — Surround yourself with the language (music, movies, podcasts)
2. **Practice daily** — Even 15 minutes daily beats 2 hours once a week
3. **Speak from day one** — Don't wait until you're "ready"
4. **Make mistakes** — They're your best teachers
5. **Find a language partner** — Practice with native speakers

**Free Tip:** The fastest way to learn is to focus on the 1,000 most common words — they cover 85% of daily conversation!

What language are you learning? I can create a personalized study plan! 🗣️`;
  },

  A12: (prompt) => {
    return `Great travel question! ✈️

Here are my top travel planning tips:

1. **Book flights 6-8 weeks in advance** — Best prices, best seats
2. **Travel during shoulder season** — Fewer crowds, lower prices
3. **Pack light** — You really don't need 5 pairs of shoes
4. **Learn basic local phrases** — Locals appreciate the effort
5. **Get travel insurance** — Always. No exceptions.

**Free Tip:** For Nigerian travelers, check visa requirements early. Some countries require 2-4 weeks processing!

Where are you planning to travel? I can create a detailed itinerary! ✈️`;
  },

  A14: (prompt) => {
    return `Great translation question! 🗣️📝

Here are my translation principles:

1. **Accuracy first** — Every word matters
2. **Cultural context** — Not just words, but meaning
3. **Terminology consistency** — Same terms throughout
4. **Local adaptation** — Adjust for cultural nuances

**Free Tip:** Always request a native speaker review for important documents. Machine translation is great for drafts, but humans catch the nuances!

What languages do you need help with? I support 50+ languages! 🗣️📝`;
  },

  A15: (prompt) => {
    return `Great event planning question! 🎉

Here are my top event planning tips:

1. **Start with the budget** — Everything else follows
2. **Book venues early** — 3-6 months ahead for popular dates
3. **Create a timeline** — Work backwards from event day
4. **Have a backup plan** — Weather, vendors, emergencies
5. **Delegate tasks** — You can't do everything alone

**Free Tip:** The most memorable events focus on 2-3 "wow moments" rather than trying to be perfect at everything!

What kind of event are you planning? I can help you create a detailed checklist! 🎉`;
  },

  A5: (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('price') || lowerPrompt.includes('cheap') || lowerPrompt.includes('deal') || lowerPrompt.includes('budget')) {
      return `Great question about finding the best deals! 🛍️

Here's my secret to saving money on every purchase:

**The Price Comparison Framework:**
1. **Check 3+ vendors** — Never buy from the first option
2. **Read reviews carefully** — Look for patterns, not outliers
3. **Compare total cost** — Include shipping, taxes, and hidden fees
4. **Check for coupons** — Always search before checkout
5. **Buy during sales** — Black Friday, end-of-season, clearance

**Free Tip:** I track prices across 100+ Nigerian vendors. I can alert you when prices drop on items you're watching!

What are you looking to buy? I'll find you the best deal! 🛍️`;
    }
    if (lowerPrompt.includes('phone') || lowerPrompt.includes('laptop') || lowerPrompt.includes('electronics') || lowerPrompt.includes('gadget')) {
      return `Smart choice asking about electronics! 📱

Here's what I look for when recommending tech:

**For Phones:**
- Battery life (5000mAh+ for heavy users)
- Camera quality (MP count + software processing)
- Storage (128GB minimum for 2024)
- Processor (Snapdragon 8+ for flagship, MediaTek for budget)

**For Laptops:**
- RAM (16GB minimum for professionals)
- SSD storage (512GB minimum)
- Battery life (8+ hours)
- Build quality (aluminum > plastic)

**Free Tip:** Buy during Jumia/Konga sales events — you can save 20-40% on electronics!

What's your budget and what do you need it for? 📱`;
    }
    return `That's a great question! 🛍️

As your Personal Shopper, I compare prices across 100+ Nigerian vendors to save you time and money. Here's what I can help with:

✅ Price comparison across Jumia, Konga, Jiji, etc.
✅ Product recommendations based on your needs
✅ Coupon and discount hunting
✅ Warranty and return policy checks
✅ Delivery cost optimization

**Free Tip:** Always check Jumia Flash Sales and Konga Yello Monday for the best deals!

What are you shopping for today? I'll find you the best deal! 🛍️`;
  },

  A6: (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('jamb') || lowerPrompt.includes('waec') || lowerPrompt.includes('exam') || lowerPrompt.includes('study')) {
      return `Great question about exam prep! 📝

Here's my proven study framework that's helped students improve scores by 40%:

**The SMART Study Method:**
1. **S**pecific — Focus on one topic per session
2. **M**easurable — Track your progress with practice tests
3. **A**chievable — Set realistic daily goals
4. **R**elevant — Study what's actually tested
5. **T**ime-bound — Use the Pomodoro technique (25min study + 5min break)

**Free Tip:** Past questions are your best friend! 70% of exams repeat concepts from previous years.

What exam are you preparing for? I'll create a customized study plan! 📝`;
    }
    if (lowerPrompt.includes('study') || lowerPrompt.includes('plan') || lowerPrompt.includes('schedule')) {
      return `Let me help you create a winning study plan! 📅

**The 4-Week Intensive Plan:**
- **Week 1:** Foundation — Cover all major topics
- **Week 2:** Practice — Past questions and mock tests
- **Week 3:** Review — Focus on weak areas
- **Week 4:** Polish — Final revision and confidence building

**Daily Schedule:**
- 6:00-8:00 AM: Fresh study (hardest topics)
- 10:00-12:00 PM: Practice questions
- 2:00-4:00 PM: Review and notes
- 8:00-9:00 PM: Quick recap

**Free Tip:** Study in 25-minute blocks with 5-minute breaks. Your brain retains more this way!

Want me to create a personalized study schedule for your exam? 📝`;
    }
    return `That's a great question! 📝

As your Exam Specialist, I've helped 3,000+ students improve their scores. Here's what I can help with:

✅ Personalized study plans
✅ Past question analysis
✅ Mock test creation
✅ Time management strategies
✅ Exam anxiety techniques
✅ Subject-specific tips

**Free Tip:** The secret to exam success is practice, not just reading. Do at least 2 practice tests per week!

What exam are you preparing for? Let's create a winning strategy! 📝`;
  },

  A8: (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('video') || lowerPrompt.includes('youtube') || lowerPrompt.includes('content') || lowerPrompt.includes('edit')) {
      return `Great question about video content! 🎬

Here's my formula for creating viral videos:

**The HOOK Framework:**
1. **H**ook — First 3 seconds must grab attention
2. **O**ffer — What value are you providing?
3. **U**rgency — Why should they watch now?
4. **K**ey message — What's the one thing they should remember?

**Free Tips for Better Videos:**
- Shoot in landscape for YouTube, portrait for TikTok/Reels
- Good audio matters more than good video
- Add subtitles — 80% of viewers watch without sound
- Keep it under 3 minutes for social media

What type of video content are you looking to create? 🎬`;
    }
    if (lowerPrompt.includes('script') || lowerPrompt.includes('write') || lowerPrompt.includes('content')) {
      return `Let me help you create compelling video scripts! 📝

**My Script Structure:**
1. **Hook** (0-3 sec) — Attention grabber
2. **Problem** (3-10 sec) — What pain point are you addressing?
3. **Solution** (10-30 sec) — How do you solve it?
4. **Proof** (30-45 sec) — Why should they believe you?
5. **CTA** (45-60 sec) — What should they do next?

**Free Tip:** Write scripts like you talk — conversational, not formal. People connect with authenticity!

What's your video about? I'll help you write a script that converts! 🎬`;
    }
    return `That's a great question! 🎬

As MediaStudio Pro, I help creators produce professional videos and media content. Here's what I can help with:

✅ Video script writing
✅ YouTube/TikTok content strategy
✅ Video editing guidance
✅ Thumbnail design tips
✅ Content calendar creation
✅ Audience growth strategies

**Free Tip:** Consistency beats perfection. Post 3-4 times per week minimum!

What type of media project are you working on? 🎬`;
  },

  A10: (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('clean') || lowerPrompt.includes('organize') || lowerPrompt.includes('house') || lowerPrompt.includes('home')) {
      return `Great question about home management! 🧹

Here's my 30-Minute Daily Reset routine that keeps homes spotless:

**Morning (10 min):**
- Make bed
- Wipe kitchen counters
- Load/unload dishwasher

**Afternoon (10 min):**
- Quick vacuum high-traffic areas
- Sort incoming mail
- Wipe bathroom surfaces

**Evening (10 min):**
- Prep for tomorrow
- Quick tidy living areas
- Take out trash if needed

**Free Tip:** The secret is "closing duties" — 10 minutes of tidying before bed makes mornings SO much easier!

What's your biggest home challenge? I can create a personalized plan! 🧹`;
    }
    if (lowerPrompt.includes('repair') || lowerPrompt.includes('fix') || lowerPrompt.includes('plumb') || lowerPrompt.includes('electric')) {
      return `Let me help you with home repairs! 🔧

**Common DIY Fixes Anyone Can Do:**
1. **Leaky faucet** — Replace washer (₦500 fix!)
2. **Clogged drain** — Baking soda + vinegar trick
3. **Running toilet** — Adjust flapper valve
4. **Squeaky doors** — WD-40 or petroleum jelly
5. **Wall holes** — Spackle + sandpaper

**When to Call a Pro:**
- Electrical work (safety first!)
- Major plumbing issues
- Structural changes
- Gas line work

**Free Tip:** For Nigerian homes, always check if your electrician is licensed. Unlicensed work voids your insurance!

What repair do you need help with? 🔧`;
    }
    return `That's a great question! 🧹

As your Home Specialist, I help you maintain a beautiful, organized home. Here's what I can help with:

✅ Cleaning schedules and routines
✅ Home organization systems
✅ Repair guidance and contractor recommendations
✅ Interior design tips
✅ Energy efficiency improvements
✅ Home security advice

**Free Tip:** The "one in, one out" rule prevents clutter. For every new item, donate or discard one!

What's your biggest home challenge? 🧹`;
  },

  A13: (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('plumb') || lowerPrompt.includes('electric') || lowerPrompt.includes('repair') || lowerPrompt.includes('service')) {
      return `Great question about finding reliable services! 🚀

Here's how I find the best service providers:

**My Vetting Process:**
1. **Check reviews** — Minimum 4.5 stars on Google/Jumia
2. **Verify licenses** — Especially for electrical and plumbing
3. **Get 3 quotes** — Never accept the first price
4. **Ask for references** — Talk to past customers
5. **Check insurance** — Protects you from liability

**Free Tip:** For Lagos, I recommend checking TaskRabbit, Kandoo, and local Facebook groups for verified professionals!

What service are you looking for? I'll connect you with the best provider! 🚀`;
    }
    if (lowerPrompt.includes('price') || lowerPrompt.includes('cost') || lowerPrompt.includes('how much')) {
      return `Let me help you understand service pricing! 💰

**Typical Nigerian Service Prices:**
- **Plumber:** ₦5,000-15,000 (depends on complexity)
- **Electrician:** ₦3,000-10,000 (depends on job)
- **Caterer:** ₦3,000-8,000 per head
- **Photographer:** ₦50,000-200,000 (depends on hours)
- **Event Planner:** ₦100,000-500,000 (depends on scale)

**Free Tip:** Always get written quotes before work starts. Verbal agreements lead to disputes!

What service are you pricing? I'll help you find the best value! 🚀`;
    }
    return `That's a great question! 🚀

As ServiceMart NG, I connect you with trusted local professionals. Here's what I can help with:

✅ Finding verified plumbers, electricians, caterers
✅ Price comparison across providers
✅ Review verification
✅ Booking coordination
✅ Quality guarantees

**Free Tip:** For any service, always ask for a written quote and check references before committing!

What service are you looking for today? 🚀`;
  },
};

// Default fallback for agents without specific handlers
function getDefaultPreSubscriptionResponse(prompt: string, agentName: string): string {
  return `That's a great question! 😊

As your ${agentName}, I'm here to help you succeed. Here's what I specialize in:

✅ Personalized guidance tailored to your needs
✅ Professional-quality output
✅ Fast turnaround times
✅ Unlimited revisions until you're satisfied

**Free Tip:** The best results come from clear communication. Tell me exactly what you need, and I'll deliver!

Would you like me to help you with a specific task? I can provide detailed guidance right here! 💪`;
}

// Get the appropriate pre-subscription response
export function getPreSubscriptionResponse(agentId: string, prompt: string, userName?: string): string {
  // Check for agent-specific welcome (first message)
  if (prompt.length < 20 && AGENT_WELCOMES[agentId]) {
    return AGENT_WELCOMES[agentId](userName);
  }
  
  // Check for agent-specific value response
  if (PRE_SUBSCRIPTION_VALUES[agentId]) {
    return PRE_SUBSCRIPTION_VALUES[agentId](prompt);
  }
  
  // Default fallback
  const agentNames: Record<string, string> = {
    A1: 'Academic Writer',
    A2: 'Business Consultant',
    A3: 'Content Strategist',
    A4: 'Career Coach',
    A5: 'Personal Shopper',
    A6: 'Exam Specialist',
    A7: 'Finance Advisor',
    A8: 'MediaStudio Pro',
    A9: 'Wellness Coach',
    A10: 'Home Specialist',
    A11: 'Language Coach',
    A12: 'Travel Planner',
    A13: 'Exam Success',
    A14: 'Translation Hub',
    A15: 'Event Planner',
  };
  
  return getDefaultPreSubscriptionResponse(prompt, agentNames[agentId] || 'Assistant');
}

// Track pre-subscription exchanges for a user
export async function trackPreSubscriptionExchange(ctx: any, userId: string, agentId: string): Promise<number> {
  const existing = await ctx.db
    .query("pre_subscription_exchanges")
    .withIndex("by_user_agent", (q) => q.eq("userId", userId).eq("agentId", agentId))
    .first();

  if (existing) {
    const newCount = (existing.exchangeCount || 0) + 1;
    await ctx.db.patch(existing._id, { exchangeCount: newCount, lastExchangeAt: Date.now() });
    return newCount;
  } else {
    await ctx.db.insert("pre_subscription_exchanges", {
      userId,
      agentId,
      exchangeCount: 1,
      lastExchangeAt: Date.now(),
      createdAt: Date.now(),
    });
    return 1;
  }
}

// Get pre-subscription exchange count
export async function getPreSubscriptionCount(ctx: any, userId: string, agentId: string): Promise<number> {
  const existing = await ctx.db
    .query("pre_subscription_exchanges")
    .withIndex("by_user_agent", (q) => q.eq("userId", userId).eq("agentId", agentId))
    .first();

  return existing?.exchangeCount || 0;
}

// Generate warm upgrade prompt
export function getUpgradePrompt(agentId: string, exchangeCount: number): string {
  const agentNames: Record<string, string> = {
    A1: 'Academic Writer',
    A2: 'Business Consultant',
    A3: 'Content Strategist',
    A4: 'Career Coach',
    A5: 'Personal Shopper',
    A6: 'Exam Specialist',
    A7: 'Finance Advisor',
    A8: 'MediaStudio Pro',
    A9: 'Wellness Coach',
    A10: 'Home Specialist',
    A11: 'Language Coach',
    A12: 'Travel Planner',
    A13: 'Exam Success',
    A14: 'Translation Hub',
    A15: 'Event Planner',
  };

  const agentName = agentNames[agentId] || 'Assistant';

  return `I've really enjoyed our conversation! 😊

I can see you're serious about getting help with this, and I'd love to work with you on it. Here's what you get when you subscribe:

🎯 **Full AI Processing** — I'll create detailed, professional output tailored to your exact needs
📊 **Complete Documents** — PDF, Word, Excel, PowerPoint formats
🔄 **Unlimited Revisions** — Until you're 100% satisfied
💬 **Priority Support** — Faster responses, dedicated attention
📈 **Advanced Features** — Analytics, templates, and more

**Starting at just ₦5,000/month** — that's less than ₦170/day for unlimited access to the ${agentName}!

👉 **Subscribe now:** https://dutchkem-prosuite-app.vercel.app/dashboard

No pressure at all — take your time. I'll be here whenever you're ready! 🤗`;
}

// Internal database operations
export const savePreSubscriptionExchange = internalMutation({
  args: {
    userId: v.string(),
    agentId: v.string(),
    exchangeCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pre_subscription_exchanges")
      .withIndex("by_user_agent", (q) => q.eq("userId", args.userId).eq("agentId", args.agentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        exchangeCount: args.exchangeCount,
        lastExchangeAt: Date.now(),
      });
    } else {
      await ctx.db.insert("pre_subscription_exchanges", {
        userId: args.userId,
        agentId: args.agentId,
        exchangeCount: args.exchangeCount,
        lastExchangeAt: Date.now(),
        createdAt: Date.now(),
      });
    }
  },
});

export const getPreSubscriptionCountInternal = internalQuery({
  args: {
    userId: v.string(),
    agentId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pre_subscription_exchanges")
      .withIndex("by_user_agent", (q) => q.eq("userId", args.userId).eq("agentId", args.agentId))
      .first();

    return existing?.exchangeCount || 0;
  },
});
