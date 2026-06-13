import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const TEMPLATES: Array<{
  templateId: string; name: string; description: string; category: string;
  priceNgn: number; isFree: boolean; tags: string[]; bestFor: string;
}> = [
  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 1: CUSTOMER SERVICE & SUPPORT (25 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "CS-001", name: "Support Ticket Classifier", description: "Automatically categorizes and routes support tickets to the right department using NLP", category: "Customer Service", priceNgn: 4500, isFree: false, tags: ["tickets", "routing", "nlp"], bestFor: "All Sizes" },
  { templateId: "CS-002", name: "Sentiment Analysis Agent", description: "Detects customer emotion in messages and calls in real-time", category: "Customer Service", priceNgn: 6000, isFree: false, tags: ["sentiment", "emotion", "analysis"], bestFor: "All Sizes" },
  { templateId: "CS-003", name: "Auto-Response Generator", description: "Generates contextual replies to common customer queries instantly", category: "Customer Service", priceNgn: 7500, isFree: false, tags: ["auto-reply", "templates", "ai"], bestFor: "Small-Enterprise" },
  { templateId: "CS-004", name: "Escalation Predictor", description: "Predicts which tickets will escalate to complaints before they happen", category: "Customer Service", priceNgn: 9000, isFree: false, tags: ["escalation", "prediction", "proactive"], bestFor: "Mid-Large" },
  { templateId: "CS-005", name: "Multi-Language Translator", description: "Translates support conversations into 50+ languages in real-time", category: "Customer Service", priceNgn: 12000, isFree: false, tags: ["translation", "multilingual", "global"], bestFor: "Global" },
  { templateId: "CS-006", name: "Voice-to-Ticket Agent", description: "Converts phone calls into structured support tickets automatically", category: "Customer Service", priceNgn: 7000, isFree: false, tags: ["voice", "transcription", "tickets"], bestFor: "All Sizes" },
  { templateId: "CS-007", name: "Customer Health Score", description: "Predicts customer churn risk using engagement and support data", category: "Customer Service", priceNgn: 10500, isFree: false, tags: ["health", "churn", "prediction"], bestFor: "Mid-Large" },
  { templateId: "CS-008", name: "Knowledge Base Agent", description: "Auto-suggests KB articles based on customer queries in real-time", category: "Customer Service", priceNgn: 5500, isFree: false, tags: ["knowledge-base", "self-service", "articles"], bestFor: "All Sizes" },
  { templateId: "CS-009", name: "Call Summary Generator", description: "Summarizes customer calls with key action items automatically", category: "Customer Service", priceNgn: 13500, isFree: false, tags: ["calls", "summary", "transcription"], bestFor: "Enterprise" },
  { templateId: "CS-010", name: "QA Scoring Agent", description: "Scores support agent performance based on conversation quality", category: "Customer Service", priceNgn: 8500, isFree: false, tags: ["quality", "scoring", "agents"], bestFor: "Mid-Large" },
  { templateId: "CS-011", name: "CSAT Predictor", description: "Predicts customer satisfaction scores before surveys are sent", category: "Customer Service", priceNgn: 6000, isFree: false, tags: ["csat", "prediction", "satisfaction"], bestFor: "All Sizes" },
  { templateId: "CS-012", name: "Auto-Follow-up Agent", description: "Sends automated follow-up emails after support interactions", category: "Customer Service", priceNgn: 4500, isFree: false, tags: ["follow-up", "email", "automation"], bestFor: "Small-Mid" },
  { templateId: "CS-013", name: "Complaint Analyzer", description: "Analyzes patterns in customer complaints across all channels", category: "Customer Service", priceNgn: 15000, isFree: false, tags: ["complaints", "patterns", "analytics"], bestFor: "Enterprise" },
  { templateId: "CS-014", name: "Wait Time Optimizer", description: "Optimizes agent scheduling to minimize customer wait times", category: "Customer Service", priceNgn: 7500, isFree: false, tags: ["scheduling", "wait-time", "optimization"], bestFor: "Mid-Large" },
  { templateId: "CS-015", name: "First Response Predictor", description: "Predicts first response time SLA breaches before they happen", category: "Customer Service", priceNgn: 5500, isFree: false, tags: ["sla", "prediction", "response-time"], bestFor: "All Sizes" },
  { templateId: "CS-016", name: "Customer Journey Agent", description: "Maps complete customer journey across all touchpoints", category: "Customer Service", priceNgn: 18000, isFree: false, tags: ["journey", "mapping", "touchpoints"], bestFor: "Enterprise" },
  { templateId: "CS-017", name: "Survey Response Analyzer", description: "Analyzes NPS and survey responses with actionable insights", category: "Customer Service", priceNgn: 7000, isFree: false, tags: ["surveys", "nps", "analysis"], bestFor: "All Sizes" },
  { templateId: "CS-018", name: "Social Listening Agent", description: "Monitors brand mentions across social media platforms 24/7", category: "Customer Service", priceNgn: 12000, isFree: false, tags: ["social", "monitoring", "brand"], bestFor: "Mid-Large" },
  { templateId: "CS-019", name: "Review Response Agent", description: "Auto-generates personalized responses to online reviews", category: "Customer Service", priceNgn: 6000, isFree: false, tags: ["reviews", "responses", "reputation"], bestFor: "Small-Mid" },
  { templateId: "CS-020", name: "Chatbot Training Agent", description: "Continuously improves chatbot responses from interactions", category: "Customer Service", priceNgn: 9000, isFree: false, tags: ["chatbot", "training", "improvement"], bestFor: "All Sizes" },
  { templateId: "CS-021", name: "Agent Assist Agent", description: "Provides real-time suggestions to support agents during conversations", category: "Customer Service", priceNgn: 7500, isFree: false, tags: ["assist", "real-time", "suggestions"], bestFor: "All Sizes" },
  { templateId: "CS-022", name: "SLA Monitor Agent", description: "Monitors SLA compliance in real-time with alerts", category: "Customer Service", priceNgn: 10500, isFree: false, tags: ["sla", "monitoring", "compliance"], bestFor: "Enterprise" },
  { templateId: "CS-023", name: "Customer Effort Score", description: "Measures customer effort in resolution across channels", category: "Customer Service", priceNgn: 7000, isFree: false, tags: ["effort", "measurement", "resolution"], bestFor: "Mid-Large" },
  { templateId: "CS-024", name: "Proactive Outreach Agent", description: "Proactively reaches out to at-risk customers before churn", category: "Customer Service", priceNgn: 8500, isFree: false, tags: ["proactive", "outreach", "retention"], bestFor: "Small-Mid" },
  { templateId: "CS-025", name: "Support Analytics Agent", description: "Provides deep analytics on support operations and trends", category: "Customer Service", priceNgn: 10000, isFree: false, tags: ["analytics", "insights", "reporting"], bestFor: "All Sizes" },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 2: SALES & MARKETING (30 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "SM-001", name: "Lead Scorer Agent", description: "Scores leads based on conversion probability using AI", category: "Sales & Marketing", priceNgn: 7500, isFree: false, tags: ["leads", "scoring", "conversion"], bestFor: "All Sizes" },
  { templateId: "SM-002", name: "Email Campaign Agent", description: "Automates personalized email campaigns with A/B testing", category: "Sales & Marketing", priceNgn: 6000, isFree: false, tags: ["email", "campaigns", "automation"], bestFor: "Small-Mid" },
  { templateId: "SM-003", name: "SEO Optimizer Agent", description: "Analyzes and optimizes SEO content for higher rankings", category: "Sales & Marketing", priceNgn: 9000, isFree: false, tags: ["seo", "optimization", "content"], bestFor: "All Sizes" },
  { templateId: "SM-004", name: "Social Media Scheduler", description: "Schedules posts across all platforms with optimal timing", category: "Sales & Marketing", priceNgn: 4500, isFree: false, tags: ["social", "scheduling", "automation"], bestFor: "Small-Mid" },
  { templateId: "SM-005", name: "Competitor Monitor", description: "Tracks competitor pricing, products, and strategies in real-time", category: "Sales & Marketing", priceNgn: 12000, isFree: false, tags: ["competitor", "monitoring", "intelligence"], bestFor: "Mid-Large" },
  { templateId: "SM-006", name: "Content Generator", description: "Generates blog posts, articles, and social content with AI", category: "Sales & Marketing", priceNgn: 10500, isFree: false, tags: ["content", "writing", "ai"], bestFor: "All Sizes" },
  { templateId: "SM-007", name: "Ad Performance Agent", description: "Optimizes ad spend across Google, Meta, and TikTok platforms", category: "Sales & Marketing", priceNgn: 13500, isFree: false, tags: ["ads", "optimization", "roi"], bestFor: "Mid-Large" },
  { templateId: "SM-008", name: "Sales Prediction Agent", description: "Predicts sales pipeline outcomes with 90%+ accuracy", category: "Sales & Marketing", priceNgn: 19500, isFree: false, tags: ["sales", "prediction", "pipeline"], bestFor: "Enterprise" },
  { templateId: "SM-009", name: "Customer Persona Builder", description: "Builds detailed customer personas from behavioral data", category: "Sales & Marketing", priceNgn: 7500, isFree: false, tags: ["personas", "segmentation", "data"], bestFor: "All Sizes" },
  { templateId: "SM-010", name: "Campaign ROI Analyzer", description: "Calculates ROI for marketing campaigns across all channels", category: "Sales & Marketing", priceNgn: 12000, isFree: false, tags: ["roi", "analytics", "campaigns"], bestFor: "Mid-Large" },
  { templateId: "SM-011", name: "Web Analytics Agent", description: "Provides actionable web analytics insights and recommendations", category: "Sales & Marketing", priceNgn: 7000, isFree: false, tags: ["analytics", "web", "insights"], bestFor: "All Sizes" },
  { templateId: "SM-012", name: "A/B Test Analyzer", description: "Automates A/B test analysis with statistical significance", category: "Sales & Marketing", priceNgn: 9000, isFree: false, tags: ["ab-testing", "statistics", "optimization"], bestFor: "Mid-Large" },
  { templateId: "SM-013", name: "Influencer Matcher", description: "Matches brands with relevant influencers based on audience data", category: "Sales & Marketing", priceNgn: 15000, isFree: false, tags: ["influencer", "matching", "social"], bestFor: "Mid-Large" },
  { templateId: "SM-014", name: "Cart Recovery Agent", description: "Recovers abandoned shopping carts with personalized messages", category: "Sales & Marketing", priceNgn: 6000, isFree: false, tags: ["cart", "recovery", "ecommerce"], bestFor: "E-commerce" },
  { templateId: "SM-015", name: "Upsell Recommender", description: "Recommends upsell opportunities based on purchase history", category: "Sales & Marketing", priceNgn: 7500, isFree: false, tags: ["upsell", "recommendations", "revenue"], bestFor: "E-commerce" },
  { templateId: "SM-016", name: "Customer Segmentation", description: "Segments customers automatically using clustering algorithms", category: "Sales & Marketing", priceNgn: 10500, isFree: false, tags: ["segmentation", "clustering", "customers"], bestFor: "All Sizes" },
  { templateId: "SM-017", name: "Lead Enrichment Agent", description: "Enriches lead data from multiple sources automatically", category: "Sales & Marketing", priceNgn: 8500, isFree: false, tags: ["leads", "enrichment", "data"], bestFor: "All Sizes" },
  { templateId: "SM-018", name: "Meeting Scheduler", description: "Automates sales meeting scheduling with calendar integration", category: "Sales & Marketing", priceNgn: 4500, isFree: false, tags: ["meetings", "scheduling", "calendar"], bestFor: "All Sizes" },
  { templateId: "SM-019", name: "Proposal Generator", description: "Generates customized sales proposals from templates", category: "Sales & Marketing", priceNgn: 12000, isFree: false, tags: ["proposals", "generation", "sales"], bestFor: "Small-Mid" },
  { templateId: "SM-020", name: "Contract Analyzer", description: "Analyzes sales contracts for risks and compliance issues", category: "Sales & Marketing", priceNgn: 22500, isFree: false, tags: ["contracts", "analysis", "risk"], bestFor: "Enterprise" },
  { templateId: "SM-021", name: "Price Optimizer", description: "Optimizes pricing based on demand, competition, and margins", category: "Sales & Marketing", priceNgn: 13500, isFree: false, tags: ["pricing", "optimization", "demand"], bestFor: "E-commerce" },
  { templateId: "SM-022", name: "Churn Prevention Agent", description: "Identifies and prevents customer churn with proactive outreach", category: "Sales & Marketing", priceNgn: 15000, isFree: false, tags: ["churn", "prevention", "retention"], bestFor: "SaaS" },
  { templateId: "SM-023", name: "Referral Tracker", description: "Tracks and manages referral programs with reward automation", category: "Sales & Marketing", priceNgn: 5500, isFree: false, tags: ["referrals", "tracking", "rewards"], bestFor: "Small-Mid" },
  { templateId: "SM-024", name: "Loyalty Program Agent", description: "Manages customer loyalty programs with points and rewards", category: "Sales & Marketing", priceNgn: 9000, isFree: false, tags: ["loyalty", "rewards", "engagement"], bestFor: "Retail" },
  { templateId: "SM-025", name: "Cross-Sell Agent", description: "Identifies cross-sell opportunities from purchase patterns", category: "Sales & Marketing", priceNgn: 7500, isFree: false, tags: ["cross-sell", "recommendations", "revenue"], bestFor: "E-commerce" },
  { templateId: "SM-026", name: "Sales Script Generator", description: "Generates optimized sales scripts for different scenarios", category: "Sales & Marketing", priceNgn: 10500, isFree: false, tags: ["scripts", "sales", "generation"], bestFor: "All Sizes" },
  { templateId: "SM-027", name: "Objection Handler", description: "Provides AI-powered responses to common sales objections", category: "Sales & Marketing", priceNgn: 8500, isFree: false, tags: ["objections", "responses", "sales"], bestFor: "All Sizes" },
  { templateId: "SM-028", name: "Territory Planner", description: "Optimizes sales territory assignments for maximum coverage", category: "Sales & Marketing", priceNgn: 18000, isFree: false, tags: ["territory", "planning", "optimization"], bestFor: "Enterprise" },
  { templateId: "SM-029", name: "Quota Planner", description: "Helps plan realistic sales quotas based on historical data", category: "Sales & Marketing", priceNgn: 15000, isFree: false, tags: ["quotas", "planning", "forecasting"], bestFor: "Enterprise" },
  { templateId: "SM-030", name: "Sales Coach Agent", description: "Provides coaching based on sales call analysis and best practices", category: "Sales & Marketing", priceNgn: 12000, isFree: false, tags: ["coaching", "training", "performance"], bestFor: "All Sizes" },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 3: FINANCE & ACCOUNTING (20 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "FA-001", name: "Invoice Generator", description: "Automatically generates and sends invoices from project data", category: "Finance & Accounting", priceNgn: 4500, isFree: false, tags: ["invoicing", "billing", "automation"], bestFor: "All Sizes" },
  { templateId: "FA-002", name: "Expense Tracker", description: "Tracks and categorizes business expenses with receipt scanning", category: "Finance & Accounting", priceNgn: 5500, isFree: false, tags: ["expenses", "tracking", "receipts"], bestFor: "Small-Mid" },
  { templateId: "FA-003", name: "Tax Calculator", description: "Calculates estimated tax liabilities across multiple jurisdictions", category: "Finance & Accounting", priceNgn: 7500, isFree: false, tags: ["tax", "calculation", "compliance"], bestFor: "All Sizes" },
  { templateId: "FA-004", name: "Payroll Processor", description: "Processes payroll for employees with tax deductions and benefits", category: "Finance & Accounting", priceNgn: 12000, isFree: false, tags: ["payroll", "salary", "deductions"], bestFor: "Mid-Large" },
  { templateId: "FA-005", name: "Financial Forecaster", description: "Predicts financial performance using machine learning models", category: "Finance & Accounting", priceNgn: 22500, isFree: false, tags: ["forecasting", "ml", "predictions"], bestFor: "Enterprise" },
  { templateId: "FA-006", name: "Budget Analyzer", description: "Analyzes budget vs actual spending with variance reports", category: "Finance & Accounting", priceNgn: 10500, isFree: false, tags: ["budget", "analysis", "variance"], bestFor: "Mid-Large" },
  { templateId: "FA-007", name: "Cash Flow Predictor", description: "Predicts future cash flow positions for better planning", category: "Finance & Accounting", priceNgn: 13500, isFree: false, tags: ["cash-flow", "prediction", "planning"], bestFor: "All Sizes" },
  { templateId: "FA-008", name: "Fraud Detector", description: "Detects potential financial fraud using pattern analysis", category: "Finance & Accounting", priceNgn: 30000, isFree: false, tags: ["fraud", "detection", "security"], bestFor: "Enterprise" },
  { templateId: "FA-009", name: "Invoice Matcher", description: "Matches invoices to purchase orders automatically", category: "Finance & Accounting", priceNgn: 9000, isFree: false, tags: ["invoices", "matching", "po"], bestFor: "Mid-Large" },
  { templateId: "FA-010", name: "Payment Reminder", description: "Sends automated payment reminders on custom schedules", category: "Finance & Accounting", priceNgn: 4500, isFree: false, tags: ["reminders", "payments", "automation"], bestFor: "All Sizes" },
  { templateId: "FA-011", name: "Currency Converter", description: "Handles multi-currency transactions with real-time rates", category: "Finance & Accounting", priceNgn: 6000, isFree: false, tags: ["currency", "conversion", "forex"], bestFor: "Global" },
  { templateId: "FA-012", name: "Financial Report Generator", description: "Generates P&L, Balance Sheet, and Cash Flow statements", category: "Finance & Accounting", priceNgn: 15000, isFree: false, tags: ["reports", "financial-statements", "automation"], bestFor: "Mid-Large" },
  { templateId: "FA-013", name: "Audit Trail Agent", description: "Maintains complete audit trails for all financial transactions", category: "Finance & Accounting", priceNgn: 19500, isFree: false, tags: ["audit", "compliance", "trails"], bestFor: "Enterprise" },
  { templateId: "FA-014", name: "Vendor Payment Agent", description: "Automates vendor payment scheduling and processing", category: "Finance & Accounting", priceNgn: 7500, isFree: false, tags: ["vendors", "payments", "scheduling"], bestFor: "Mid-Large" },
  { templateId: "FA-015", name: "Subscription Billing", description: "Manages recurring subscription billing with dunning", category: "Finance & Accounting", priceNgn: 12000, isFree: false, tags: ["subscriptions", "billing", "recurring"], bestFor: "SaaS" },
  { templateId: "FA-016", name: "Commission Calculator", description: "Calculates sales commissions with complex commission structures", category: "Finance & Accounting", priceNgn: 7000, isFree: false, tags: ["commissions", "sales", "calculations"], bestFor: "Sales" },
  { templateId: "FA-017", name: "VAT/GST Calculator", description: "Calculates VAT/GST for transactions across jurisdictions", category: "Finance & Accounting", priceNgn: 5500, isFree: false, tags: ["vat", "gst", "tax"], bestFor: "All Sizes" },
  { templateId: "FA-018", name: "Bank Reconciliation", description: "Automates bank reconciliation with transaction matching", category: "Finance & Accounting", priceNgn: 10500, isFree: false, tags: ["reconciliation", "bank", "matching"], bestFor: "Mid-Large" },
  { templateId: "FA-019", name: "Credit Check Agent", description: "Checks customer creditworthiness before extending credit", category: "Finance & Accounting", priceNgn: 15000, isFree: false, tags: ["credit", "risk", "assessment"], bestFor: "Enterprise" },
  { templateId: "FA-020", name: "Collection Agent", description: "Automates debt collection processes with escalating outreach", category: "Finance & Accounting", priceNgn: 9000, isFree: false, tags: ["collections", "debt", "automation"], bestFor: "Mid-Large" },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 4: HUMAN RESOURCES (20 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "HR-001", name: "Resume Screener", description: "Screens and ranks job applications using AI matching", category: "Human Resources", priceNgn: 7500, isFree: false, tags: ["recruiting", "screening", "ai"], bestFor: "All Sizes" },
  { templateId: "HR-002", name: "Interview Scheduler", description: "Automates interview scheduling with calendar coordination", category: "Human Resources", priceNgn: 4500, isFree: false, tags: ["interviews", "scheduling", "calendar"], bestFor: "All Sizes" },
  { templateId: "HR-003", name: "Onboarding Agent", description: "Manages employee onboarding workflows and checklists", category: "Human Resources", priceNgn: 12000, isFree: false, tags: ["onboarding", "workflows", "checklists"], bestFor: "Mid-Large" },
  { templateId: "HR-004", name: "Performance Reviewer", description: "Automates performance review cycles with 360-degree feedback", category: "Human Resources", priceNgn: 13500, isFree: false, tags: ["performance", "reviews", "feedback"], bestFor: "Mid-Large" },
  { templateId: "HR-005", name: "Attendance Tracker", description: "Tracks employee attendance with geo-fencing and biometrics", category: "Human Resources", priceNgn: 5500, isFree: false, tags: ["attendance", "tracking", "time"], bestFor: "All Sizes" },
  { templateId: "HR-006", name: "Leave Manager", description: "Manages leave requests, approvals, and balance tracking", category: "Human Resources", priceNgn: 4500, isFree: false, tags: ["leave", "requests", "approvals"], bestFor: "All Sizes" },
  { templateId: "HR-007", name: "Payroll Agent", description: "Processes payroll and benefits with multi-country support", category: "Human Resources", priceNgn: 15000, isFree: false, tags: ["payroll", "benefits", "global"], bestFor: "Mid-Large" },
  { templateId: "HR-008", name: "Recruiting Agent", description: "Manages end-to-end recruiting from sourcing to offer", category: "Human Resources", priceNgn: 22500, isFree: false, tags: ["recruiting", "sourcing", "hiring"], bestFor: "Enterprise" },
  { templateId: "HR-009", name: "Employee Sentiment", description: "Measures employee satisfaction through pulse surveys", category: "Human Resources", priceNgn: 10500, isFree: false, tags: ["sentiment", "surveys", "engagement"], bestFor: "Mid-Large" },
  { templateId: "HR-010", name: "Training Recommender", description: "Recommends training courses based on skills gaps", category: "Human Resources", priceNgn: 8500, isFree: false, tags: ["training", "recommendations", "skills"], bestFor: "All Sizes" },
  { templateId: "HR-011", name: "Career Path Planner", description: "Plans career progression paths for employees", category: "Human Resources", priceNgn: 12000, isFree: false, tags: ["career", "planning", "development"], bestFor: "Enterprise" },
  { templateId: "HR-012", name: "Exit Interview Agent", description: "Conducts automated exit interviews with sentiment analysis", category: "Human Resources", priceNgn: 7000, isFree: false, tags: ["exit", "interviews", "retention"], bestFor: "Mid-Large" },
  { templateId: "HR-013", name: "Benefits Administrator", description: "Manages employee benefits enrollment and claims", category: "Human Resources", priceNgn: 13500, isFree: false, tags: ["benefits", "enrollment", "claims"], bestFor: "Mid-Large" },
  { templateId: "HR-014", name: "Compliance Checker", description: "Ensures HR compliance with labor laws across jurisdictions", category: "Human Resources", priceNgn: 18000, isFree: false, tags: ["compliance", "labor-law", "regulations"], bestFor: "Enterprise" },
  { templateId: "HR-015", name: "Time Tracker", description: "Tracks billable hours with project allocation", category: "Human Resources", priceNgn: 4500, isFree: false, tags: ["time-tracking", "billable", "projects"], bestFor: "Small-Mid" },
  { templateId: "HR-016", name: "Skills Gap Analyzer", description: "Identifies skills gaps in workforce with training plans", category: "Human Resources", priceNgn: 10500, isFree: false, tags: ["skills", "gaps", "analysis"], bestFor: "Mid-Large" },
  { templateId: "HR-017", name: "Succession Planner", description: "Plans leadership succession with talent pipelines", category: "Human Resources", priceNgn: 19500, isFree: false, tags: ["succession", "leadership", "pipeline"], bestFor: "Enterprise" },
  { templateId: "HR-018", name: "Diversity Monitor", description: "Monitors diversity metrics with actionable recommendations", category: "Human Resources", priceNgn: 15000, isFree: false, tags: ["diversity", "monitoring", "inclusion"], bestFor: "Enterprise" },
  { templateId: "HR-019", name: "Employee Engagement", description: "Measures and improves employee engagement scores", category: "Human Resources", priceNgn: 9000, isFree: false, tags: ["engagement", "measurement", "improvement"], bestFor: "All Sizes" },
  { templateId: "HR-020", name: "Wellness Coordinator", description: "Manages employee wellness programs and challenges", category: "Human Resources", priceNgn: 7500, isFree: false, tags: ["wellness", "programs", "health"], bestFor: "Mid-Large" },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 5: OPERATIONS & LOGISTICS (25 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "OP-001", name: "Inventory Optimizer", description: "Optimizes inventory levels to reduce carrying costs", category: "Operations & Logistics", priceNgn: 12000, isFree: false, tags: ["inventory", "optimization", "cost"], bestFor: "Retail/Manufacturing" },
  { templateId: "OP-002", name: "Route Planner", description: "Plans optimal delivery routes saving fuel and time", category: "Operations & Logistics", priceNgn: 10500, isFree: false, tags: ["routing", "delivery", "optimization"], bestFor: "Logistics" },
  { templateId: "OP-003", name: "Fleet Manager", description: "Manages vehicle fleet operations with maintenance tracking", category: "Operations & Logistics", priceNgn: 15000, isFree: false, tags: ["fleet", "vehicles", "maintenance"], bestFor: "Logistics" },
  { templateId: "OP-004", name: "Warehouse Organizer", description: "Optimizes warehouse layout for maximum efficiency", category: "Operations & Logistics", priceNgn: 13500, isFree: false, tags: ["warehouse", "layout", "efficiency"], bestFor: "Retail" },
  { templateId: "OP-005", name: "Demand Forecaster", description: "Predicts product demand using historical and market data", category: "Operations & Logistics", priceNgn: 18000, isFree: false, tags: ["demand", "forecasting", "prediction"], bestFor: "Retail/Manufacturing" },
  { templateId: "OP-006", name: "Supplier Manager", description: "Manages supplier relationships and performance scoring", category: "Operations & Logistics", priceNgn: 12000, isFree: false, tags: ["suppliers", "relationships", "scoring"], bestFor: "Manufacturing" },
  { templateId: "OP-007", name: "Quality Control Agent", description: "Automates quality checks with image and data analysis", category: "Operations & Logistics", priceNgn: 10500, isFree: false, tags: ["quality", "inspection", "automation"], bestFor: "Manufacturing" },
  { templateId: "OP-008", name: "Maintenance Scheduler", description: "Schedules preventive maintenance to reduce downtime", category: "Operations & Logistics", priceNgn: 9000, isFree: false, tags: ["maintenance", "scheduling", "preventive"], bestFor: "Manufacturing" },
  { templateId: "OP-009", name: "Production Planner", description: "Optimizes production schedules for maximum throughput", category: "Operations & Logistics", priceNgn: 15000, isFree: false, tags: ["production", "planning", "scheduling"], bestFor: "Manufacturing" },
  { templateId: "OP-010", name: "Shipping Tracker", description: "Tracks shipments in real-time across all carriers", category: "Operations & Logistics", priceNgn: 7000, isFree: false, tags: ["shipping", "tracking", "carriers"], bestFor: "E-commerce" },
  { templateId: "OP-011", name: "Return Processor", description: "Automates return processing with label generation", category: "Operations & Logistics", priceNgn: 6000, isFree: false, tags: ["returns", "processing", "labels"], bestFor: "E-commerce" },
  { templateId: "OP-012", name: "Procurement Agent", description: "Automates procurement workflows with approval chains", category: "Operations & Logistics", priceNgn: 13500, isFree: false, tags: ["procurement", "workflows", "approvals"], bestFor: "Enterprise" },
  { templateId: "OP-013", name: "Contract Manager", description: "Manages supplier contracts with renewal alerts", category: "Operations & Logistics", priceNgn: 19500, isFree: false, tags: ["contracts", "management", "renewals"], bestFor: "Enterprise" },
  { templateId: "OP-014", name: "Risk Assessor", description: "Assesses operational risks with mitigation strategies", category: "Operations & Logistics", priceNgn: 22500, isFree: false, tags: ["risk", "assessment", "mitigation"], bestFor: "Enterprise" },
  { templateId: "OP-015", name: "Compliance Monitor", description: "Monitors operational compliance with industry regulations", category: "Operations & Logistics", priceNgn: 15000, isFree: false, tags: ["compliance", "monitoring", "regulations"], bestFor: "Enterprise" },
  { templateId: "OP-016", name: "Facility Manager", description: "Manages facility operations with IoT integration", category: "Operations & Logistics", priceNgn: 12000, isFree: false, tags: ["facility", "operations", "iot"], bestFor: "Enterprise" },
  { templateId: "OP-017", name: "Energy Optimizer", description: "Optimizes energy consumption to reduce costs", category: "Operations & Logistics", priceNgn: 10500, isFree: false, tags: ["energy", "optimization", "costs"], bestFor: "Manufacturing" },
  { templateId: "OP-018", name: "Waste Reducer", description: "Identifies waste reduction opportunities across operations", category: "Operations & Logistics", priceNgn: 8500, isFree: false, tags: ["waste", "reduction", "lean"], bestFor: "Manufacturing" },
  { templateId: "OP-019", name: "Capacity Planner", description: "Plans production capacity based on demand forecasts", category: "Operations & Logistics", priceNgn: 13500, isFree: false, tags: ["capacity", "planning", "demand"], bestFor: "Manufacturing" },
  { templateId: "OP-020", name: "Lead Time Predictor", description: "Predicts delivery lead times with accuracy scoring", category: "Operations & Logistics", priceNgn: 9000, isFree: false, tags: ["lead-time", "prediction", "delivery"], bestFor: "Logistics" },
  { templateId: "OP-021", name: "Carrier Selector", description: "Selects optimal carriers based on cost and performance", category: "Operations & Logistics", priceNgn: 7500, isFree: false, tags: ["carriers", "selection", "optimization"], bestFor: "Logistics" },
  { templateId: "OP-022", name: "Customs Agent", description: "Handles customs documentation for international shipments", category: "Operations & Logistics", priceNgn: 15000, isFree: false, tags: ["customs", "documentation", "international"], bestFor: "Global" },
  { templateId: "OP-023", name: "Insurance Agent", description: "Manages shipment insurance with claim processing", category: "Operations & Logistics", priceNgn: 10500, isFree: false, tags: ["insurance", "claims", "shipments"], bestFor: "Logistics" },
  { templateId: "OP-024", name: "Proof of Delivery", description: "Captures and manages delivery proofs with photo evidence", category: "Operations & Logistics", priceNgn: 5500, isFree: false, tags: ["delivery", "proof", "evidence"], bestFor: "Logistics" },
  { templateId: "OP-025", name: "Reverse Logistics", description: "Manages return logistics with refurbishment tracking", category: "Operations & Logistics", priceNgn: 9000, isFree: false, tags: ["reverse-logistics", "returns", "refurbishment"], bestFor: "E-commerce" },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 6: INDUSTRY-SPECIFIC (40 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "IND-001", name: "Real Estate Valuation", description: "Automates property valuations using comparable sales data", category: "Industry Specific", priceNgn: 12000, isFree: false, tags: ["real-estate", "valuation", "property"], bestFor: "All" },
  { templateId: "IND-002", name: "Property Lead Matcher", description: "Matches leads to properties based on preferences", category: "Industry Specific", priceNgn: 9000, isFree: false, tags: ["real-estate", "leads", "matching"], bestFor: "Agencies" },
  { templateId: "IND-003", name: "Lease Document Generator", description: "Generates lease agreements from templates", category: "Industry Specific", priceNgn: 7500, isFree: false, tags: ["real-estate", "leases", "documents"], bestFor: "Agencies" },
  { templateId: "IND-004", name: "Property Maintenance Tracker", description: "Tracks maintenance requests for properties", category: "Industry Specific", priceNgn: 7000, isFree: false, tags: ["real-estate", "maintenance", "tracking"], bestFor: "Property Mgmt" },
  { templateId: "IND-005", name: "Patient Appointment Scheduler", description: "Manages patient appointments with reminders", category: "Industry Specific", priceNgn: 10500, isFree: false, tags: ["healthcare", "appointments", "scheduling"], bestFor: "Clinics" },
  { templateId: "IND-006", name: "Medical Records Manager", description: "Manages electronic medical records with HIPAA compliance", category: "Industry Specific", priceNgn: 19500, isFree: false, tags: ["healthcare", "emr", "hipaa"], bestFor: "Hospitals" },
  { templateId: "IND-007", name: "Insurance Verifier", description: "Verifies insurance eligibility before appointments", category: "Industry Specific", priceNgn: 12000, isFree: false, tags: ["healthcare", "insurance", "verification"], bestFor: "Clinics" },
  { templateId: "IND-008", name: "Medical Billing Agent", description: "Processes medical billing with code optimization", category: "Industry Specific", priceNgn: 15000, isFree: false, tags: ["healthcare", "billing", "coding"], bestFor: "Hospitals" },
  { templateId: "IND-009", name: "Symptom Checker", description: "Checks symptoms before appointments for triage", category: "Industry Specific", priceNgn: 9000, isFree: false, tags: ["healthcare", "symptoms", "triage"], bestFor: "Telehealth" },
  { templateId: "IND-010", name: "Prescription Refill Manager", description: "Manages prescription refills with pharmacy integration", category: "Industry Specific", priceNgn: 7000, isFree: false, tags: ["healthcare", "prescriptions", "pharmacy"], bestFor: "Pharmacies" },
  { templateId: "IND-011", name: "Legal Document Review", description: "Reviews legal documents for risks and compliance", category: "Industry Specific", priceNgn: 22500, isFree: false, tags: ["legal", "review", "compliance"], bestFor: "Law Firms" },
  { templateId: "IND-012", name: "Case Tracker", description: "Tracks case progress with deadline management", category: "Industry Specific", priceNgn: 12000, isFree: false, tags: ["legal", "cases", "deadlines"], bestFor: "Law Firms" },
  { templateId: "IND-013", name: "Legal Deadline Monitor", description: "Monitors legal deadlines with automated alerts", category: "Industry Specific", priceNgn: 10500, isFree: false, tags: ["legal", "deadlines", "alerts"], bestFor: "Law Firms" },
  { templateId: "IND-014", name: "Legal Research Assistant", description: "Assists with legal research using case law databases", category: "Industry Specific", priceNgn: 15000, isFree: false, tags: ["legal", "research", "case-law"], bestFor: "Law Firms" },
  { templateId: "IND-015", name: "Contract Risk Analyzer", description: "Analyzes contracts for risks and unfavorable terms", category: "Industry Specific", priceNgn: 19500, isFree: false, tags: ["legal", "contracts", "risk"], bestFor: "Corporate" },
  { templateId: "IND-016", name: "Student Grade Book", description: "Manages student grades with analytics", category: "Industry Specific", priceNgn: 7500, isFree: false, tags: ["education", "grades", "analytics"], bestFor: "Schools" },
  { templateId: "IND-017", name: "Student Attendance Tracker", description: "Tracks student attendance with parent notifications", category: "Industry Specific", priceNgn: 6000, isFree: false, tags: ["education", "attendance", "parents"], bestFor: "Schools" },
  { templateId: "IND-018", name: "Lesson Planner", description: "Creates lesson plans aligned to curriculum standards", category: "Industry Specific", priceNgn: 7000, isFree: false, tags: ["education", "lesson-plans", "curriculum"], bestFor: "Teachers" },
  { templateId: "IND-019", name: "Student Performance Analyzer", description: "Analyzes student performance with intervention recommendations", category: "Industry Specific", priceNgn: 10500, isFree: false, tags: ["education", "performance", "intervention"], bestFor: "Schools" },
  { templateId: "IND-020", name: "Parent Communication Agent", description: "Manages parent communications with automated updates", category: "Industry Specific", priceNgn: 5500, isFree: false, tags: ["education", "parents", "communication"], bestFor: "Schools" },
  { templateId: "IND-021", name: "Hotel Booking Manager", description: "Manages room bookings with dynamic pricing", category: "Industry Specific", priceNgn: 12000, isFree: false, tags: ["hospitality", "bookings", "pricing"], bestFor: "Hotels" },
  { templateId: "IND-022", name: "Guest Experience Agent", description: "Personalizes guest experience with preference tracking", category: "Industry Specific", priceNgn: 9000, isFree: false, tags: ["hospitality", "guests", "personalization"], bestFor: "Hotels" },
  { templateId: "IND-023", name: "Revenue Manager", description: "Optimizes room pricing based on demand and competition", category: "Industry Specific", priceNgn: 15000, isFree: false, tags: ["hospitality", "revenue", "pricing"], bestFor: "Hotels" },
  { templateId: "IND-024", name: "Housekeeping Scheduler", description: "Schedules housekeeping with room status tracking", category: "Industry Specific", priceNgn: 7000, isFree: false, tags: ["hospitality", "housekeeping", "scheduling"], bestFor: "Hotels" },
  { templateId: "IND-025", name: "Restaurant POS Agent", description: "Manages restaurant point of sale with inventory sync", category: "Industry Specific", priceNgn: 10500, isFree: false, tags: ["hospitality", "pos", "inventory"], bestFor: "Restaurants" },
  { templateId: "IND-026", name: "Construction Project Scheduler", description: "Schedules construction projects with Gantt charts", category: "Industry Specific", priceNgn: 13500, isFree: false, tags: ["construction", "scheduling", "gantt"], bestFor: "Contractors" },
  { templateId: "IND-027", name: "Construction Budget Tracker", description: "Tracks project budgets with cost code allocation", category: "Industry Specific", priceNgn: 10500, isFree: false, tags: ["construction", "budget", "costs"], bestFor: "Contractors" },
  { templateId: "IND-028", name: "Permit Expeditor", description: "Expedites permit applications with status tracking", category: "Industry Specific", priceNgn: 9000, isFree: false, tags: ["construction", "permits", "expediting"], bestFor: "Contractors" },
  { templateId: "IND-029", name: "Site Safety Monitor", description: "Monitors safety compliance with incident reporting", category: "Industry Specific", priceNgn: 12000, isFree: false, tags: ["construction", "safety", "compliance"], bestFor: "Sites" },
  { templateId: "IND-030", name: "Equipment Tracker", description: "Tracks equipment usage and maintenance schedules", category: "Industry Specific", priceNgn: 8500, isFree: false, tags: ["construction", "equipment", "tracking"], bestFor: "Contractors" },
  { templateId: "IND-031", name: "Crop Health Monitor", description: "Monitors crop health using satellite and sensor data", category: "Industry Specific", priceNgn: 12000, isFree: false, tags: ["agriculture", "crops", "monitoring"], bestFor: "Farms" },
  { templateId: "IND-032", name: "Weather Predictor", description: "Provides localized weather forecasts for farming", category: "Industry Specific", priceNgn: 9000, isFree: false, tags: ["agriculture", "weather", "forecasting"], bestFor: "Farms" },
  { templateId: "IND-033", name: "Yield Forecaster", description: "Predicts crop yields for harvest planning", category: "Industry Specific", priceNgn: 13500, isFree: false, tags: ["agriculture", "yield", "forecasting"], bestFor: "Farms" },
  { templateId: "IND-034", name: "Pest Detector", description: "Detects pest infestations using image analysis", category: "Industry Specific", priceNgn: 10500, isFree: false, tags: ["agriculture", "pests", "detection"], bestFor: "Farms" },
  { templateId: "IND-035", name: "Irrigation Controller", description: "Optimizes irrigation schedules based on weather data", category: "Industry Specific", priceNgn: 8500, isFree: false, tags: ["agriculture", "irrigation", "automation"], bestFor: "Farms" },
  { templateId: "IND-036", name: "Grid Optimizer", description: "Optimizes energy distribution across the grid", category: "Industry Specific", priceNgn: 22500, isFree: false, tags: ["energy", "grid", "optimization"], bestFor: "Utilities" },
  { templateId: "IND-037", name: "Energy Consumption Tracker", description: "Tracks energy consumption with efficiency recommendations", category: "Industry Specific", priceNgn: 9000, isFree: false, tags: ["energy", "consumption", "tracking"], bestFor: "Consumers" },
  { templateId: "IND-038", name: "Outage Predictor", description: "Predicts power outages using weather and grid data", category: "Industry Specific", priceNgn: 15000, isFree: false, tags: ["energy", "outages", "prediction"], bestFor: "Utilities" },
  { templateId: "IND-039", name: "Renewable Forecaster", description: "Forecasts renewable energy generation from solar and wind", category: "Industry Specific", priceNgn: 13500, isFree: false, tags: ["energy", "renewable", "forecasting"], bestFor: "Solar/Wind" },
  { templateId: "IND-040", name: "Carbon Calculator", description: "Calculates carbon footprint across operations", category: "Industry Specific", priceNgn: 7500, isFree: false, tags: ["energy", "carbon", "sustainability"], bestFor: "All" },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 7: COMPLIANCE & RISK (15 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "CR-001", name: "GDPR Compliance Agent", description: "Ensures GDPR compliance with data mapping and consent", category: "Compliance & Risk", priceNgn: 15000, isFree: false, tags: ["gdpr", "compliance", "privacy"], bestFor: "EU Businesses" },
  { templateId: "CR-002", name: "SOC2 Monitor", description: "Monitors SOC2 controls with evidence collection", category: "Compliance & Risk", priceNgn: 19500, isFree: false, tags: ["soc2", "monitoring", "controls"], bestFor: "SaaS Companies" },
  { templateId: "CR-003", name: "KYC Verifier", description: "Automates KYC verification with document scanning", category: "Compliance & Risk", priceNgn: 13500, isFree: false, tags: ["kyc", "verification", "identity"], bestFor: "Financial" },
  { templateId: "CR-004", name: "AML Scanner", description: "Scans for anti-money laundering patterns", category: "Compliance & Risk", priceNgn: 22500, isFree: false, tags: ["aml", "scanning", "financial-crime"], bestFor: "Financial" },
  { templateId: "CR-005", name: "Data Privacy Agent", description: "Manages data privacy compliance across jurisdictions", category: "Compliance & Risk", priceNgn: 12000, isFree: false, tags: ["privacy", "compliance", "data"], bestFor: "All Sizes" },
  { templateId: "CR-006", name: "Compliance Audit Trail", description: "Maintains compliance audit trails with evidence", category: "Compliance & Risk", priceNgn: 15000, isFree: false, tags: ["audit", "trails", "evidence"], bestFor: "Enterprise" },
  { templateId: "CR-007", name: "Business Risk Assessor", description: "Assesses business risks with mitigation planning", category: "Compliance & Risk", priceNgn: 18000, isFree: false, tags: ["risk", "assessment", "mitigation"], bestFor: "Enterprise" },
  { templateId: "CR-008", name: "Policy Manager", description: "Manages compliance policies with acknowledgment tracking", category: "Compliance & Risk", priceNgn: 10500, isFree: false, tags: ["policies", "management", "acknowledgment"], bestFor: "Enterprise" },
  { templateId: "CR-009", name: "Incident Reporter", description: "Reports security incidents with automated escalation", category: "Compliance & Risk", priceNgn: 9000, isFree: false, tags: ["incidents", "reporting", "security"], bestFor: "All Sizes" },
  { templateId: "CR-010", name: "Vendor Risk Assessor", description: "Assesses vendor security risks with scorecards", category: "Compliance & Risk", priceNgn: 13500, isFree: false, tags: ["vendors", "risk", "security"], bestFor: "Enterprise" },
  { templateId: "CR-011", name: "Compliance Training Tracker", description: "Tracks compliance training completion across teams", category: "Compliance & Risk", priceNgn: 7500, isFree: false, tags: ["training", "compliance", "tracking"], bestFor: "All Sizes" },
  { templateId: "CR-012", name: "Document Retention Agent", description: "Manages document retention policies with auto-archival", category: "Compliance & Risk", priceNgn: 12000, isFree: false, tags: ["retention", "documents", "archival"], bestFor: "Enterprise" },
  { templateId: "CR-013", name: "Breach Notifier", description: "Notifies stakeholders of data breaches within 72 hours", category: "Compliance & Risk", priceNgn: 10500, isFree: false, tags: ["breach", "notification", "gdpr"], bestFor: "All Sizes" },
  { templateId: "CR-014", name: "Consent Manager", description: "Manages user consent with granular preferences", category: "Compliance & Risk", priceNgn: 8500, isFree: false, tags: ["consent", "preferences", "privacy"], bestFor: "All Sizes" },
  { templateId: "CR-015", name: "Right to Delete Agent", description: "Handles data deletion requests with verification", category: "Compliance & Risk", priceNgn: 7000, isFree: false, tags: ["deletion", "gdpr", "compliance"], bestFor: "All Sizes" },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 8: GLOBAL & MULTINATIONAL (15 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "GL-001", name: "Multi-Currency Converter", description: "Handles 150+ currencies with real-time exchange rates", category: "Global & Multinational", priceNgn: 12000, isFree: false, tags: ["currency", "conversion", "global"], bestFor: "Global" },
  { templateId: "GL-002", name: "Cross-Border Payment", description: "Facilitates international payments with compliance", category: "Global & Multinational", priceNgn: 15000, isFree: false, tags: ["payments", "cross-border", "international"], bestFor: "Global" },
  { templateId: "GL-003", name: "Language Translator", description: "Translates to 100+ languages with context awareness", category: "Global & Multinational", priceNgn: 13500, isFree: false, tags: ["translation", "languages", "global"], bestFor: "Global" },
  { templateId: "GL-004", name: "Time Zone Manager", description: "Manages global time zones with meeting scheduling", category: "Global & Multinational", priceNgn: 7500, isFree: false, tags: ["timezones", "scheduling", "global"], bestFor: "Global" },
  { templateId: "GL-005", name: "Cultural Compliance", description: "Ensures cultural compliance in global communications", category: "Global & Multinational", priceNgn: 10500, isFree: false, tags: ["culture", "compliance", "communication"], bestFor: "Global" },
  { templateId: "GL-006", name: "International Tax Agent", description: "Calculates international taxes across jurisdictions", category: "Global & Multinational", priceNgn: 22500, isFree: false, tags: ["tax", "international", "compliance"], bestFor: "Global" },
  { templateId: "GL-007", name: "Global Inventory Manager", description: "Manages inventory across global warehouses", category: "Global & Multinational", priceNgn: 18000, isFree: false, tags: ["inventory", "global", "warehouses"], bestFor: "Global" },
  { templateId: "GL-008", name: "International Shipping Agent", description: "Handles international shipping with customs clearance", category: "Global & Multinational", priceNgn: 15000, isFree: false, tags: ["shipping", "international", "customs"], bestFor: "Global" },
  { templateId: "GL-009", name: "Global HR Manager", description: "Manages global workforce with country-specific compliance", category: "Global & Multinational", priceNgn: 30000, isFree: false, tags: ["hr", "global", "compliance"], bestFor: "Multinational" },
  { templateId: "GL-010", name: "Country Risk Assessor", description: "Assesses country-specific risks for expansion", category: "Global & Multinational", priceNgn: 19500, isFree: false, tags: ["risk", "country", "expansion"], bestFor: "Global" },
  { templateId: "GL-011", name: "Trade Compliance Agent", description: "Ensures trade compliance with export controls", category: "Global & Multinational", priceNgn: 24000, isFree: false, tags: ["trade", "compliance", "export"], bestFor: "Global" },
  { templateId: "GL-012", name: "Global Payroll Agent", description: "Processes global payroll across 50+ countries", category: "Global & Multinational", priceNgn: 27000, isFree: false, tags: ["payroll", "global", "multi-country"], bestFor: "Multinational" },
  { templateId: "GL-013", name: "International Benefits Manager", description: "Manages global benefits with country-specific plans", category: "Global & Multinational", priceNgn: 22500, isFree: false, tags: ["benefits", "global", "plans"], bestFor: "Multinational" },
  { templateId: "GL-014", name: "Global Reporting Agent", description: "Consolidates global reports with multi-currency support", category: "Global & Multinational", priceNgn: 15000, isFree: false, tags: ["reporting", "global", "consolidation"], bestFor: "Multinational" },
  { templateId: "GL-015", name: "Cross-Cultural Training", description: "Provides cross-cultural training for global teams", category: "Global & Multinational", priceNgn: 12000, isFree: false, tags: ["training", "culture", "global"], bestFor: "Global" },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY 9: AI & AUTOMATION (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "AI-001", name: "Data Cleaner", description: "Cleans and prepares data for analysis with ML", category: "AI & Automation", priceNgn: 10500, isFree: false, tags: ["data", "cleaning", "preparation"], bestFor: "All Sizes" },
  { templateId: "AI-002", name: "Model Trainer", description: "Trains custom AI models on your business data", category: "AI & Automation", priceNgn: 30000, isFree: false, tags: ["ml", "training", "custom-models"], bestFor: "Enterprise" },
  { templateId: "AI-003", name: "API Integrator", description: "Integrates with external APIs using natural language", category: "AI & Automation", priceNgn: 13500, isFree: false, tags: ["api", "integration", "automation"], bestFor: "All Sizes" },
  { templateId: "AI-004", name: "Workflow Automator", description: "Automates complex business workflows with AI decisions", category: "AI & Automation", priceNgn: 12000, isFree: false, tags: ["workflow", "automation", "decisions"], bestFor: "All Sizes" },
  { templateId: "AI-005", name: "Document Processor", description: "Processes documents with AI extraction and classification", category: "AI & Automation", priceNgn: 15000, isFree: false, tags: ["documents", "extraction", "classification"], bestFor: "All Sizes" },
  { templateId: "AI-006", name: "Image Analyzer", description: "Analyzes images for insights and categorization", category: "AI & Automation", priceNgn: 12000, isFree: false, tags: ["images", "analysis", "vision"], bestFor: "Retail/Media" },
  { templateId: "AI-007", name: "Voice Assistant Builder", description: "Provides voice interface for business applications", category: "AI & Automation", priceNgn: 10500, isFree: false, tags: ["voice", "assistant", "interface"], bestFor: "All Sizes" },
  { templateId: "AI-008", name: "Chatbot Builder", description: "Builds custom chatbots with no-code configuration", category: "AI & Automation", priceNgn: 15000, isFree: false, tags: ["chatbot", "builder", "no-code"], bestFor: "All Sizes" },
  { templateId: "AI-009", name: "Recommendation Engine", description: "Provides personalized product and content recommendations", category: "AI & Automation", priceNgn: 13500, isFree: false, tags: ["recommendations", "personalization", "ai"], bestFor: "E-commerce" },
  { templateId: "AI-010", name: "Anomaly Detector", description: "Detects anomalies in data streams in real-time", category: "AI & Automation", priceNgn: 19500, isFree: false, tags: ["anomaly", "detection", "real-time"], bestFor: "Enterprise" },
];

/** Seed all 200+ marketplace templates — safe to call multiple times (skips existing) */
export const seedAllTemplates = mutation({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    let inserted = 0;
    let skipped = 0;

    for (const t of TEMPLATES) {
      const existing = await ctx.db.query("agent_marketplace_templates")
        .withIndex("by_template_id", (q) => q.eq("templateId", t.templateId))
        .first();
      if (existing) { skipped++; continue; }

      await ctx.db.insert("agent_marketplace_templates", {
        templateId: t.templateId,
        name: t.name,
        description: t.description,
        category: t.category,
        author: "Dutchkem AI",
        version: "1.0.0",
        priceNgn: t.priceNgn,
        isFree: t.isFree,
        config: { bestFor: t.bestFor, tags: t.tags, type: "template" },
        tags: t.tags,
        installCount: Math.floor(Math.random() * 500) + 50,
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        reviewCount: Math.floor(Math.random() * 100) + 10,
        isPublished: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      inserted++;
    }

    return { success: true, inserted, skipped, total: TEMPLATES.length };
  },
});

/** List all templates with optional category and search */
export const listAllTemplates = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q: any = ctx.db.query("agent_marketplace_templates")
      .filter((q: any) => q.eq(q.field("isPublished"), true));
    if (args.category && args.category !== "all") {
      q = q.filter((q: any) => q.eq(q.field("category"), args.category));
    }
    const results = await q.order("desc").take(args.limit ?? 200);
    if (args.search) {
      const s = args.search.toLowerCase();
      return results.filter((t: any) =>
        t.name.toLowerCase().includes(s) ||
        t.description.toLowerCase().includes(s) ||
        t.tags.some((tag: string) => tag.toLowerCase().includes(s))
      );
    }
    return results;
  },
});

/** Get category counts */
export const getCategoryCounts = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("agent_marketplace_templates")
      .filter((q: any) => q.eq(q.field("isPublished"), true))
      .take(300);
    const counts: Record<string, number> = {};
    for (const t of all) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return { counts, total: all.length };
  },
});
