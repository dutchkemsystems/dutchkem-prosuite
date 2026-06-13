import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

const ENTERPRISE_TEMPLATES: Array<{
  templateId: string; name: string; description: string; category: string;
  priceNgn: number; isFree: boolean; tags: string[]; bestFor: string;
}> = [
  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 1: OIL & GAS (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "OG-001", name: "Reservoir Data Analyzer", description: "Analyzes seismic and well data to optimize reservoir management for upstream operations", category: "Oil & Gas", priceNgn: 45000, isFree: false, tags: ["reservoir", "seismic", "upstream"], bestFor: "50K+ employees" },
  { templateId: "OG-002", name: "Pipeline Integrity Monitor", description: "Monitors pipeline corrosion, leak detection, and maintenance scheduling in real-time", category: "Oil & Gas", priceNgn: 37500, isFree: false, tags: ["pipeline", "corrosion", "maintenance"], bestFor: "50K+ employees" },
  { templateId: "OG-003", name: "Drilling Operations Optimizer", description: "Optimizes drilling parameters using ML to reduce non-productive time", category: "Oil & Gas", priceNgn: 52500, isFree: false, tags: ["drilling", "optimization", "ml"], bestFor: "50K+ employees" },
  { templateId: "OG-004", name: "HSE Compliance Agent", description: "Manages Health, Safety & Environment compliance with incident tracking and reporting", category: "Oil & Gas", priceNgn: 30000, isFree: false, tags: ["hse", "safety", "compliance"], bestFor: "50K+ employees" },
  { templateId: "OG-005", name: "Production Forecasting Engine", description: "Forecasts oil and gas production using decline curve analysis and ML models", category: "Oil & Gas", priceNgn: 42000, isFree: false, tags: ["production", "forecasting", "decline-curve"], bestFor: "50K+ employees" },
  { templateId: "OG-006", name: "Equipment Fleet Manager", description: "Tracks and maintains heavy equipment across offshore and onshore sites", category: "Oil & Gas", priceNgn: 33000, isFree: false, tags: ["equipment", "fleet", "maintenance"], bestFor: "50K+ employees" },
  { templateId: "OG-007", name: "Commodity Price Hedging Agent", description: "Manages commodity price risk with hedging strategies and market analysis", category: "Oil & Gas", priceNgn: 60000, isFree: false, tags: ["hedging", "commodity", "risk"], bestFor: "50K+ employees" },
  { templateId: "OG-008", name: "Reserve Estimation Agent", description: "Calculates proved, probable, and possible reserves with SEC compliance", category: "Oil & Gas", priceNgn: 48000, isFree: false, tags: ["reserves", "estimation", "sec"], bestFor: "50K+ employees" },
  { templateId: "OG-009", name: "Well Completion Optimizer", description: "Optimizes well completion designs using offset well analysis", category: "Oil & Gas", priceNgn: 39000, isFree: false, tags: ["well-completion", "optimization", "design"], bestFor: "50K+ employees" },
  { templateId: "OG-010", name: "Downstream Logistics Agent", description: "Manages refinery throughput, product blending, and distribution scheduling", category: "Oil & Gas", priceNgn: 36000, isFree: false, tags: ["downstream", "logistics", "refinery"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 2: INSURANCE (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "INS-001", name: "Claims Processing Agent", description: "Automates end-to-end claims intake, validation, and adjudication using AI", category: "Insurance", priceNgn: 42000, isFree: false, tags: ["claims", "processing", "adjudication"], bestFor: "50K+ employees" },
  { templateId: "INS-002", name: "Underwriting Risk Assessor", description: "Evaluates underwriting risk using telematics, weather, and historical data", category: "Insurance", priceNgn: 55000, isFree: false, tags: ["underwriting", "risk", "assessment"], bestFor: "50K+ employees" },
  { templateId: "INS-003", name: "Fraud Detection Engine", description: "Detects fraudulent claims using pattern recognition and network analysis", category: "Insurance", priceNgn: 60000, isFree: false, tags: ["fraud", "detection", "patterns"], bestFor: "50K+ employees" },
  { templateId: "INS-004", name: "Policy Lifecycle Manager", description: "Manages policy issuance, endorsements, renewals, and cancellations", category: "Insurance", priceNgn: 37500, isFree: false, tags: ["policy", "lifecycle", "management"], bestFor: "50K+ employees" },
  { templateId: "INS-005", name: "Actuarial Model Engine", description: "Runs actuarial models for pricing, reserving, and solvency analysis", category: "Insurance", priceNgn: 72000, isFree: false, tags: ["actuarial", "pricing", "reserving"], bestFor: "50K+ employees" },
  { templateId: "INS-006", name: "Customer Retention Predictor", description: "Predicts policyholder churn risk with retention offer optimization", category: "Insurance", priceNgn: 33000, isFree: false, tags: ["retention", "churn", "prediction"], bestFor: "50K+ employees" },
  { templateId: "INS-007", name: "Regulatory Filing Agent", description: "Automates regulatory filings (NAIC, IFRS 17, Solvency II) across jurisdictions", category: "Insurance", priceNgn: 48000, isFree: false, tags: ["regulatory", "filing", "compliance"], bestFor: "50K+ employees" },
  { templateId: "INS-008", name: "Reinsurance Manager", description: "Optimizes reinsurance treaty structures and claim recovery tracking", category: "Insurance", priceNgn: 54000, isFree: false, tags: ["reinsurance", "treaty", "recovery"], bestFor: "50K+ employees" },
  { templateId: "INS-009", name: "Document Intelligence Agent", description: "Extracts and validates data from insurance documents (ACORD, claims forms)", category: "Insurance", priceNgn: 30000, isFree: false, tags: ["documents", "extraction", "acord"], bestFor: "50K+ employees" },
  { templateId: "INS-010", name: "Loss Ratio Optimizer", description: "Analyzes loss ratios by line and recommends portfolio adjustments", category: "Insurance", priceNgn: 45000, isFree: false, tags: ["loss-ratio", "portfolio", "optimization"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 3: HEALTHCARE (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "HC-001", name: "Clinical Decision Support", description: "Provides evidence-based clinical recommendations at point of care", category: "Healthcare", priceNgn: 60000, isFree: false, tags: ["clinical", "decision-support", "evidence"], bestFor: "50K+ employees" },
  { templateId: "HC-002", name: "Revenue Cycle Manager", description: "Optimizes hospital revenue cycle from patient registration to final payment", category: "Healthcare", priceNgn: 45000, isFree: false, tags: ["revenue-cycle", "billing", "hospital"], bestFor: "50K+ employees" },
  { templateId: "HC-003", name: "Patient Flow Optimizer", description: "Optimizes patient flow through ED, inpatient, and discharge processes", category: "Healthcare", priceNgn: 37500, isFree: false, tags: ["patient-flow", "ed", "discharge"], bestFor: "50K+ employees" },
  { templateId: "HC-004", name: "Drug Interaction Checker", description: "Checks drug-drug and drug-food interactions using clinical databases", category: "Healthcare", priceNgn: 33000, isFree: false, tags: ["drug-interactions", "pharmacy", "safety"], bestFor: "50K+ employees" },
  { templateId: "HC-005", name: "Population Health Analyzer", description: "Analyzes population health trends with risk stratification and intervention", category: "Healthcare", priceNgn: 52500, isFree: false, tags: ["population-health", "risk-stratification", "analytics"], bestFor: "50K+ employees" },
  { templateId: "HC-006", name: "Surgical Scheduling Agent", description: "Optimizes OR scheduling with surgeon preferences and equipment availability", category: "Healthcare", priceNgn: 30000, isFree: false, tags: ["surgical", "scheduling", "or"], bestFor: "50K+ employees" },
  { templateId: "HC-007", name: "Clinical Trial Matcher", description: "Matches patients to eligible clinical trials using EHR data", category: "Healthcare", priceNgn: 48000, isFree: false, tags: ["clinical-trials", "matching", "ehr"], bestFor: "50K+ employees" },
  { templateId: "HC-008", name: "Supply Chain Agent", description: "Manages medical supply chain with demand forecasting and inventory optimization", category: "Healthcare", priceNgn: 39000, isFree: false, tags: ["supply-chain", "inventory", "forecasting"], bestFor: "50K+ employees" },
  { templateId: "HC-009", name: "Telemedicine Triage Agent", description: "Performs AI-powered symptom assessment and triage for telehealth visits", category: "Healthcare", priceNgn: 27000, isFree: false, tags: ["telemedicine", "triage", "symptoms"], bestFor: "50K+ employees" },
  { templateId: "HC-010", name: "Quality Metrics Dashboard", description: "Tracks CMS quality measures, HCAHPS scores, and readmission rates", category: "Healthcare", priceNgn: 36000, isFree: false, tags: ["quality", "cms", "hcahps"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 4: EDUCATION (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "EDU-001", name: "Enrollment Predictor", description: "Predicts student enrollment trends and optimizes recruitment strategies", category: "Education", priceNgn: 33000, isFree: false, tags: ["enrollment", "prediction", "recruitment"], bestFor: "50K+ employees" },
  { templateId: "EDU-002", name: "Research Grant Manager", description: "Manages research grant applications, tracking, and compliance reporting", category: "Education", priceNgn: 39000, isFree: false, tags: ["grants", "research", "compliance"], bestFor: "50K+ employees" },
  { templateId: "EDU-003", name: "Curriculum Alignment Agent", description: "Ensures curriculum alignment with accreditation standards and learning outcomes", category: "Education", priceNgn: 27000, isFree: false, tags: ["curriculum", "accreditation", "alignment"], bestFor: "50K+ employees" },
  { templateId: "EDU-004", name: "Student Success Predictor", description: "Predicts at-risk students using academic, engagement, and behavioral data", category: "Education", priceNgn: 36000, isFree: false, tags: ["student-success", "at-risk", "prediction"], bestFor: "50K+ employees" },
  { templateId: "EDU-005", name: "Faculty Workload Balancer", description: "Balances faculty teaching, research, and service workloads equitably", category: "Education", priceNgn: 24000, isFree: false, tags: ["faculty", "workload", "balance"], bestFor: "50K+ employees" },
  { templateId: "EDU-006", name: "Alumni Engagement Agent", description: "Manages alumni relations with personalized outreach and fundraising", category: "Education", priceNgn: 30000, isFree: false, tags: ["alumni", "engagement", "fundraising"], bestFor: "50K+ employees" },
  { templateId: "EDU-007", name: "Learning Analytics Engine", description: "Analyzes learning patterns and recommends personalized learning paths", category: "Education", priceNgn: 42000, isFree: false, tags: ["learning-analytics", "personalization", "paths"], bestFor: "50K+ employees" },
  { templateId: "EDU-008", name: "Plagiarism Detection Agent", description: "Detects plagiarism and AI-generated content with source attribution", category: "Education", priceNgn: 22500, isFree: false, tags: ["plagiarism", "detection", "integrity"], bestFor: "50K+ employees" },
  { templateId: "EDU-009", name: "Budget Allocation Optimizer", description: "Optimizes institutional budget allocation across departments and programs", category: "Education", priceNgn: 36000, isFree: false, tags: ["budget", "allocation", "optimization"], bestFor: "50K+ employees" },
  { templateId: "EDU-010", name: "Accreditation Evidence Agent", description: "Collects and organizes evidence for accreditation self-studies", category: "Education", priceNgn: 33000, isFree: false, tags: ["accreditation", "evidence", "self-study"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 5: CUSTOMS & TRADE (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "CT-001", name: "Customs Declaration Agent", description: "Automates customs declaration preparation with HS code classification", category: "Customs & Trade", priceNgn: 39000, isFree: false, tags: ["customs", "declaration", "hs-code"], bestFor: "50K+ employees" },
  { templateId: "CT-002", name: "Tariff Optimizer", description: "Optimizes tariff classification and duty calculations across trade agreements", category: "Customs & Trade", priceNgn: 45000, isFree: false, tags: ["tariff", "optimization", "duty"], bestFor: "50K+ employees" },
  { templateId: "CT-003", name: "Trade Compliance Scanner", description: "Scans shipments against sanctions lists and export control regulations", category: "Customs & Trade", priceNgn: 52500, isFree: false, tags: ["compliance", "sanctions", "export-control"], bestFor: "50K+ employees" },
  { templateId: "CT-004", name: "Free Trade Zone Manager", description: "Manages FTZ inventory, bonding, and duty deferral optimization", category: "Customs & Trade", priceNgn: 36000, isFree: false, tags: ["ftz", "bonding", "duty-deferral"], bestFor: "50K+ employees" },
  { templateId: "CT-005", name: "Origin Determination Agent", description: "Determines country of origin for rules of compliance with trade agreements", category: "Customs & Trade", priceNgn: 33000, isFree: false, tags: ["origin", "rules", "trade-agreements"], bestFor: "50K+ employees" },
  { templateId: "CT-006", name: "Bonded Warehouse Agent", description: "Manages bonded warehouse operations with inventory reconciliation", category: "Customs & Trade", priceNgn: 30000, isFree: false, tags: ["bonded", "warehouse", "inventory"], bestFor: "50K+ employees" },
  { templateId: "CT-007", name: "Import/Export License Tracker", description: "Tracks import/export license applications, approvals, and expirations", category: "Customs & Trade", priceNgn: 27000, isFree: false, tags: ["license", "import-export", "tracking"], bestFor: "50K+ employees" },
  { templateId: "CT-008", name: "Valuation Compliance Agent", description: "Ensures customs valuation compliance with transfer pricing documentation", category: "Customs & Trade", priceNgn: 42000, isFree: false, tags: ["valuation", "transfer-pricing", "compliance"], bestFor: "50K+ employees" },
  { templateId: "CT-009", name: "Trade Finance Optimizer", description: "Optimizes letters of credit, trade guarantees, and supply chain financing", category: "Customs & Trade", priceNgn: 48000, isFree: false, tags: ["trade-finance", "letters-of-credit", "supply-chain"], bestFor: "50K+ employees" },
  { templateId: "CT-010", name: "Cross-Border Data Agent", description: "Manages cross-border data transfer compliance with privacy regulations", category: "Customs & Trade", priceNgn: 36000, isFree: false, tags: ["cross-border", "data-transfer", "privacy"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 6: SECURITY & DEFENSE (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "SD-001", name: "Threat Intelligence Agent", description: "Aggregates and analyzes threat intelligence from multiple sources", category: "Security & Defense", priceNgn: 60000, isFree: false, tags: ["threat", "intelligence", "analysis"], bestFor: "50K+ employees" },
  { templateId: "SD-002", name: "SOC Automation Agent", description: "Automates Security Operations Center workflows with SOAR integration", category: "Security & Defense", priceNgn: 52500, isFree: false, tags: ["soc", "soar", "automation"], bestFor: "50K+ employees" },
  { templateId: "SD-003", name: "Vulnerability Scanner", description: "Scans and prioritizes vulnerabilities with CVSS scoring and remediation", category: "Security & Defense", priceNgn: 45000, isFree: false, tags: ["vulnerability", "scanning", "cvss"], bestFor: "50K+ employees" },
  { templateId: "SD-004", name: "Access Control Manager", description: "Manages role-based access control with least-privilege enforcement", category: "Security & Defense", priceNgn: 39000, isFree: false, tags: ["rbac", "access-control", "least-privilege"], bestFor: "50K+ employees" },
  { templateId: "SD-005", name: "Incident Response Orchestrator", description: "Orchestrates incident response playbooks with automated containment", category: "Security & Defense", priceNgn: 57000, isFree: false, tags: ["incident-response", "playbooks", "containment"], bestFor: "50K+ employees" },
  { templateId: "SD-006", name: "Penetration Test Planner", description: "Plans and tracks penetration testing with findings management", category: "Security & Defense", priceNgn: 36000, isFree: false, tags: ["pentest", "planning", "findings"], bestFor: "50K+ employees" },
  { templateId: "SD-007", name: "Data Loss Prevention Agent", description: "Monitors and prevents sensitive data exfiltration across channels", category: "Security & Defense", priceNgn: 48000, isFree: false, tags: ["dlp", "data-protection", "exfiltration"], bestFor: "50K+ employees" },
  { templateId: "SD-008", name: "Compliance Audit Automator", description: "Automates security compliance audits (ISO 27001, NIST, SOC 2)", category: "Security & Defense", priceNgn: 42000, isFree: false, tags: ["compliance", "audit", "iso27001"], bestFor: "50K+ employees" },
  { templateId: "SD-009", name: "Insider Threat Detector", description: "Detects insider threats using behavioral analytics and UEBA", category: "Security & Defense", priceNgn: 54000, isFree: false, tags: ["insider-threat", "ueba", "behavioral"], bestFor: "50K+ employees" },
  { templateId: "SD-010", name: "Cyber Risk Quantifier", description: "Quantifies cyber risk in financial terms for board-level reporting", category: "Security & Defense", priceNgn: 45000, isFree: false, tags: ["cyber-risk", "quantification", "reporting"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 7: TRANSPORTATION (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "TR-001", name: "Fleet Telematics Agent", description: "Analyzes fleet telematics data for fuel efficiency and driver behavior", category: "Transportation", priceNgn: 36000, isFree: false, tags: ["telematics", "fleet", "fuel"], bestFor: "50K+ employees" },
  { templateId: "TR-002", name: "Route Optimization Engine", description: "Optimizes multi-stop routes with traffic, weather, and constraint data", category: "Transportation", priceNgn: 42000, isFree: false, tags: ["routing", "optimization", "traffic"], bestFor: "50K+ employees" },
  { templateId: "TR-003", name: "Predictive Maintenance Agent", description: "Predicts vehicle breakdowns using IoT sensor data and maintenance history", category: "Transportation", priceNgn: 33000, isFree: false, tags: ["predictive", "maintenance", "iot"], bestFor: "50K+ employees" },
  { templateId: "TR-004", name: "Capacity Planning Agent", description: "Plans fleet capacity based on demand forecasts and seasonal patterns", category: "Transportation", priceNgn: 39000, isFree: false, tags: ["capacity", "planning", "demand"], bestFor: "50K+ employees" },
  { templateId: "TR-005", name: "Driver Compliance Monitor", description: "Monitors driver hours-of-service, CDL status, and ELD compliance", category: "Transportation", priceNgn: 27000, isFree: false, tags: ["driver", "compliance", "hos"], bestFor: "50K+ employees" },
  { templateId: "TR-006", name: "Fuel Cost Optimizer", description: "Optimizes fuel purchasing, routing, and consumption tracking", category: "Transportation", priceNgn: 30000, isFree: false, tags: ["fuel", "cost", "optimization"], bestFor: "50K+ employees" },
  { templateId: "TR-007", name: "Last-Mile Delivery Agent", description: "Optimizes last-mile delivery with customer time windows and density", category: "Transportation", priceNgn: 36000, isFree: false, tags: ["last-mile", "delivery", "optimization"], bestFor: "50K+ employees" },
  { templateId: "TR-008", name: "Freight Broker Agent", description: "Matches freight with carriers using rate optimization and reliability", category: "Transportation", priceNgn: 45000, isFree: false, tags: ["freight", "broker", "rates"], bestFor: "50K+ employees" },
  { templateId: "TR-009", name: "Safety Score Manager", description: "Calculates and improves driver safety scores with coaching recommendations", category: "Transportation", priceNgn: 24000, isFree: false, tags: ["safety", "score", "coaching"], bestFor: "50K+ employees" },
  { templateId: "TR-010", name: "Warehouse Robotics Agent", description: "Coordinates warehouse robotics for picking, packing, and sorting", category: "Transportation", priceNgn: 52500, isFree: false, tags: ["robotics", "warehouse", "automation"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 8: TELECOM (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "TEL-001", name: "Network Optimization Agent", description: "Optimizes 4G/5G network performance with self-organizing networks (SON)", category: "Telecom", priceNgn: 52500, isFree: false, tags: ["network", "optimization", "5g"], bestFor: "50K+ employees" },
  { templateId: "TEL-002", name: "Churn Prediction Engine", description: "Predicts subscriber churn with personalized retention offers", category: "Telecom", priceNgn: 42000, isFree: false, tags: ["churn", "prediction", "retention"], bestFor: "50K+ employees" },
  { templateId: "TEL-003", name: "Revenue Assurance Agent", description: "Detects revenue leakage from billing errors, fraud, and provisioning gaps", category: "Telecom", priceNgn: 48000, isFree: false, tags: ["revenue-assurance", "leakage", "billing"], bestFor: "50K+ employees" },
  { templateId: "TEL-004", name: "Spectrum Analyzer", description: "Analyzes spectrum utilization and recommends refarming strategies", category: "Telecom", priceNgn: 39000, isFree: false, tags: ["spectrum", "utilization", "refarming"], bestFor: "50K+ employees" },
  { templateId: "TEL-005", name: "Customer Experience Monitor", description: "Monitors customer experience across touchpoints with NPS correlation", category: "Telecom", priceNgn: 36000, isFree: false, tags: ["cx", "monitoring", "nps"], bestFor: "50K+ employees" },
  { templateId: "TEL-006", name: "Tower Site Optimizer", description: "Optimizes tower site placement and capacity expansion planning", category: "Telecom", priceNgn: 45000, isFree: false, tags: ["tower", "site", "capacity"], bestFor: "50K+ employees" },
  { templateId: "TEL-007", name: "BSS/OSS Integration Agent", description: "Integrates BSS/OSS systems for seamless order-to-activate workflows", category: "Telecom", priceNgn: 54000, isFree: false, tags: ["bss", "oss", "integration"], bestFor: "50K+ employees" },
  { templateId: "TEL-008", name: "Roaming Partner Manager", description: "Manages roaming agreements, settlement, and QoS monitoring", category: "Telecom", priceNgn: 39000, isFree: false, tags: ["roaming", "settlement", "qos"], bestFor: "50K+ employees" },
  { templateId: "TEL-009", name: "IoT Device Manager", description: "Manages massive IoT device deployments with connectivity monitoring", category: "Telecom", priceNgn: 42000, isFree: false, tags: ["iot", "device", "connectivity"], bestFor: "50K+ employees" },
  { templateId: "TEL-010", name: "Bandwidth Predictor", description: "Forecasts bandwidth demand by region and recommends infrastructure investment", category: "Telecom", priceNgn: 36000, isFree: false, tags: ["bandwidth", "forecasting", "infrastructure"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 9: GOVERNMENT (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "GOV-001", name: "Citizen Service Agent", description: "Handles citizen inquiries across channels with case management integration", category: "Government", priceNgn: 39000, isFree: false, tags: ["citizen", "service", "case-management"], bestFor: "50K+ employees" },
  { templateId: "GOV-002", name: "Permit Processing Agent", description: "Automates permit applications with zoning, environmental, and code checks", category: "Government", priceNgn: 36000, isFree: false, tags: ["permit", "processing", "zoning"], bestFor: "50K+ employees" },
  { templateId: "GOV-003", name: "Budget Transparency Reporter", description: "Generates public budget transparency reports with visualization", category: "Government", priceNgn: 30000, isFree: false, tags: ["budget", "transparency", "reporting"], bestFor: "50K+ employees" },
  { templateId: "GOV-004", name: "Procurement Compliance Agent", description: "Ensures procurement compliance with bid evaluation and vendor screening", category: "Government", priceNgn: 45000, isFree: false, tags: ["procurement", "compliance", "bids"], bestFor: "50K+ employees" },
  { templateId: "GOV-005", name: "Tax Revenue Optimizer", description: "Optimizes tax collection with taxpayer segmentation and compliance scoring", category: "Government", priceNgn: 52500, isFree: false, tags: ["tax", "revenue", "compliance"], bestFor: "50K+ employees" },
  { templateId: "GOV-006", name: "Public Safety Monitor", description: "Monitors public safety incidents with real-time alerting and coordination", category: "Government", priceNgn: 48000, isFree: false, tags: ["safety", "monitoring", "alerts"], bestFor: "50K+ employees" },
  { templateId: "GOV-007", name: "Land Registry Agent", description: "Manages land registry operations with title verification and dispute tracking", category: "Government", priceNgn: 33000, isFree: false, tags: ["land", "registry", "title"], bestFor: "50K+ employees" },
  { templateId: "GOV-008", name: "Census Data Processor", description: "Processes census and survey data with demographic analysis", category: "Government", priceNgn: 36000, isFree: false, tags: ["census", "survey", "demographics"], bestFor: "50K+ employees" },
  { templateId: "GOV-009", name: "Legislative Tracker", description: "Tracks legislation, regulations, and policy changes across jurisdictions", category: "Government", priceNgn: 30000, isFree: false, tags: ["legislation", "regulation", "policy"], bestFor: "50K+ employees" },
  { templateId: "GOV-010", name: "Disaster Response Coordinator", description: "Coordinates disaster response with resource allocation and communication", category: "Government", priceNgn: 42000, isFree: false, tags: ["disaster", "response", "coordination"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 10: REAL ESTATE (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "RE-001", name: "Portfolio Analytics Agent", description: "Analyzes real estate portfolio performance with market comparables", category: "Real Estate", priceNgn: 42000, isFree: false, tags: ["portfolio", "analytics", "market"], bestFor: "50K+ employees" },
  { templateId: "RE-002", name: "Tenant Risk Assessor", description: "Assesses tenant credit risk and lease default probability", category: "Real Estate", priceNgn: 33000, isFree: false, tags: ["tenant", "risk", "credit"], bestFor: "50K+ employees" },
  { templateId: "RE-003", name: "Lease Administration Agent", description: "Manages lease abstracts, renewals, and CAM reconciliation", category: "Real Estate", priceNgn: 36000, isFree: false, tags: ["lease", "administration", "cam"], bestFor: "50K+ employees" },
  { templateId: "RE-004", name: "Property Tax Appeal Agent", description: "Identifies overassessed properties and prepares tax appeal documentation", category: "Real Estate", priceNgn: 30000, isFree: false, tags: ["property-tax", "appeal", "assessment"], bestFor: "50K+ employees" },
  { templateId: "RE-005", name: "Market Comp Analyzer", description: "Analyzes comparable sales with adjustments for property differences", category: "Real Estate", priceNgn: 27000, isFree: false, tags: ["comps", "analysis", "valuation"], bestFor: "50K+ employees" },
  { templateId: "RE-006", name: "Construction Progress Tracker", description: "Tracks construction progress with milestone monitoring and delay prediction", category: "Real Estate", priceNgn: 39000, isFree: false, tags: ["construction", "progress", "milestones"], bestFor: "50K+ employees" },
  { templateId: "RE-007", name: "Facility Operations Agent", description: "Manages facility operations with work order automation and vendor management", category: "Real Estate", priceNgn: 33000, isFree: false, tags: ["facility", "operations", "work-orders"], bestFor: "50K+ employees" },
  { templateId: "RE-008", name: "Investment Return Calculator", description: "Calculates IRR, cap rate, and cash-on-cash returns for acquisitions", category: "Real Estate", priceNgn: 36000, isFree: false, tags: ["investment", "returns", "acquisitions"], bestFor: "50K+ employees" },
  { templateId: "RE-009", name: "Zoning Compliance Agent", description: "Verifies zoning compliance for development projects with variance tracking", category: "Real Estate", priceNgn: 27000, isFree: false, tags: ["zoning", "compliance", "development"], bestFor: "50K+ employees" },
  { templateId: "RE-010", name: "Tenant Experience Platform", description: "Enhances tenant experience with amenity booking and community features", category: "Real Estate", priceNgn: 30000, isFree: false, tags: ["tenant", "experience", "amenities"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 11: MARKETING & ADVERTISING (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "MA-001", name: "Brand Monitor Agent", description: "Monitors brand sentiment and share of voice across all media channels", category: "Marketing & Advertising", priceNgn: 42000, isFree: false, tags: ["brand", "sentiment", "monitoring"], bestFor: "50K+ employees" },
  { templateId: "MA-002", name: "Attribution Model Engine", description: "Implements multi-touch attribution models for marketing ROI analysis", category: "Marketing & Advertising", priceNgn: 52500, isFree: false, tags: ["attribution", "multi-touch", "roi"], bestFor: "50K+ employees" },
  { templateId: "MA-003", name: "Creative Performance Agent", description: "Analyzes creative performance across channels with A/B test recommendations", category: "Marketing & Advertising", priceNgn: 36000, isFree: false, tags: ["creative", "performance", "ab-test"], bestFor: "50K+ employees" },
  { templateId: "MA-004", name: "Media Buying Optimizer", description: "Optimizes media buying across TV, digital, and out-of-home with reach/frequency", category: "Marketing & Advertising", priceNgn: 48000, isFree: false, tags: ["media-buying", "optimization", "reach"], bestFor: "50K+ employees" },
  { templateId: "MA-005", name: "Customer Journey Mapper", description: "Maps customer journeys across touchpoints with conversion drop-off analysis", category: "Marketing & Advertising", priceNgn: 39000, isFree: false, tags: ["journey", "mapping", "conversion"], bestFor: "50K+ employees" },
  { templateId: "MA-006", name: "SEO Intelligence Agent", description: "Provides enterprise SEO intelligence with competitive gap analysis", category: "Marketing & Advertising", priceNgn: 33000, isFree: false, tags: ["seo", "intelligence", "competitive"], bestFor: "50K+ employees" },
  { templateId: "MA-007", name: "Marketing Mix Modeler", description: "Builds marketing mix models for budget allocation across channels", category: "Marketing & Advertising", priceNgn: 57000, isFree: false, tags: ["marketing-mix", "budget", "allocation"], bestFor: "50K+ employees" },
  { templateId: "MA-008", name: "Influencer ROI Tracker", description: "Tracks influencer campaign ROI with engagement and conversion metrics", category: "Marketing & Advertising", priceNgn: 30000, isFree: false, tags: ["influencer", "roi", "campaign"], bestFor: "50K+ employees" },
  { templateId: "MA-009", name: "Content Calendar Agent", description: "Plans and schedules content calendars with editorial workflow management", category: "Marketing & Advertising", priceNgn: 27000, isFree: false, tags: ["content", "calendar", "editorial"], bestFor: "50K+ employees" },
  { templateId: "MA-010", name: "Campaign Performance Dashboard", description: "Provides real-time campaign performance dashboards with anomaly alerts", category: "Marketing & Advertising", priceNgn: 36000, isFree: false, tags: ["campaign", "dashboard", "anomaly"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 12: E-COMMERCE & RETAIL (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "EC-001", name: "Dynamic Pricing Engine", description: "Adjusts pricing in real-time based on demand, competition, and inventory", category: "E-commerce & Retail", priceNgn: 45000, isFree: false, tags: ["dynamic-pricing", "real-time", "demand"], bestFor: "50K+ employees" },
  { templateId: "EC-002", name: "Inventory Intelligence Agent", description: "Provides real-time inventory visibility across all channels with demand sensing", category: "E-commerce & Retail", priceNgn: 39000, isFree: false, tags: ["inventory", "visibility", "demand"], bestFor: "50K+ employees" },
  { templateId: "EC-003", name: "Customer 360 Agent", description: "Creates unified customer profiles from online, in-store, and mobile data", category: "E-commerce & Retail", priceNgn: 42000, isFree: false, tags: ["customer-360", "unified", "profiles"], bestFor: "50K+ employees" },
  { templateId: "EC-004", name: "Recommendation Engine Pro", description: "Enterprise-grade product recommendations with collaborative filtering", category: "E-commerce & Retail", priceNgn: 48000, isFree: false, tags: ["recommendations", "collaborative", "filtering"], bestFor: "50K+ employees" },
  { templateId: "EC-005", name: "Returns Intelligence Agent", description: "Analyzes return patterns and recommends product description improvements", category: "E-commerce & Retail", priceNgn: 33000, isFree: false, tags: ["returns", "patterns", "optimization"], bestFor: "50K+ employees" },
  { templateId: "EC-006", name: "Omnichannel Orchestrator", description: "Orchestrates seamless omnichannel experiences from browse to buy", category: "E-commerce & Retail", priceNgn: 52500, isFree: false, tags: ["omnichannel", "orchestration", "experience"], bestFor: "50K+ employees" },
  { templateId: "EC-007", name: "Loyalty Program Engine", description: "Manages enterprise loyalty programs with points, tiers, and personalized rewards", category: "E-commerce & Retail", priceNgn: 36000, isFree: false, tags: ["loyalty", "points", "tiers"], bestFor: "50K+ employees" },
  { templateId: "EC-008", name: "Supply Chain Visibility Agent", description: "Provides end-to-end supply chain visibility with exception management", category: "E-commerce & Retail", priceNgn: 42000, isFree: false, tags: ["supply-chain", "visibility", "exceptions"], bestFor: "50K+ employees" },
  { templateId: "EC-009", name: "Store Operations Agent", description: "Optimizes store operations with labor scheduling and task management", category: "E-commerce & Retail", priceNgn: 30000, isFree: false, tags: ["store", "operations", "labor"], bestFor: "50K+ employees" },
  { templateId: "EC-010", name: "Fraud Prevention Agent", description: "Prevents e-commerce fraud with device fingerprinting and behavioral analysis", category: "E-commerce & Retail", priceNgn: 45000, isFree: false, tags: ["fraud", "prevention", "fingerprinting"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 13: BANKING & FINANCE (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "BF-001", name: "AML Transaction Monitor", description: "Monitors transactions for suspicious activity with SAR generation", category: "Banking & Finance", priceNgn: 60000, isFree: false, tags: ["aml", "transactions", "sar"], bestFor: "50K+ employees" },
  { templateId: "BF-002", name: "Credit Scoring Engine", description: "Enterprise credit scoring with alternative data and model explainability", category: "Banking & Finance", priceNgn: 52500, isFree: false, tags: ["credit-scoring", "alternative-data", "explainability"], bestFor: "50K+ employees" },
  { templateId: "BF-003", name: "Loan Origination Agent", description: "Automates loan origination from application to disbursement with risk assessment", category: "Banking & Finance", priceNgn: 48000, isFree: false, tags: ["loan", "origination", "disbursement"], bestFor: "50K+ employees" },
  { templateId: "BF-004", name: "Treasury Management Agent", description: "Manages cash positioning, forecasting, and investment optimization", category: "Banking & Finance", priceNgn: 54000, isFree: false, tags: ["treasury", "cash", "investment"], bestFor: "50K+ employees" },
  { templateId: "BF-005", name: "Regulatory Reporting Agent", description: "Automates regulatory reports (CAR, FR Y-9C, Basel III) across jurisdictions", category: "Banking & Finance", priceNgn: 57000, isFree: false, tags: ["regulatory", "reporting", "basel"], bestFor: "50K+ employees" },
  { templateId: "BF-006", name: "Customer Onboarding Agent", description: "Streamlines customer onboarding with digital KYC and account opening", category: "Banking & Finance", priceNgn: 39000, isFree: false, tags: ["onboarding", "kyc", "account-opening"], bestFor: "50K+ employees" },
  { templateId: "BF-007", name: "Market Risk Analyzer", description: "Calculates VaR, CVaR, and stress tests for trading portfolios", category: "Banking & Finance", priceNgn: 60000, isFree: false, tags: ["market-risk", "var", "stress-test"], bestFor: "50K+ employees" },
  { templateId: "BF-008", name: "Payment Processing Agent", description: "Processes real-time payments with reconciliation and exception handling", category: "Banking & Finance", priceNgn: 42000, isFree: false, tags: ["payments", "processing", "reconciliation"], bestFor: "50K+ employees" },
  { templateId: "BF-009", name: "Portfolio Rebalancer", description: "Rebalances investment portfolios based on policy and market conditions", category: "Banking & Finance", priceNgn: 45000, isFree: false, tags: ["portfolio", "rebalancing", "investment"], bestFor: "50K+ employees" },
  { templateId: "BF-010", name: "Customer Lifetime Value Agent", description: "Calculates customer lifetime value with retention and cross-sell modeling", category: "Banking & Finance", priceNgn: 36000, isFree: false, tags: ["clv", "lifetime-value", "cross-sell"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 14: MANUFACTURING (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "MFG-001", name: "Digital Twin Simulator", description: "Creates digital twins of production lines for simulation and optimization", category: "Manufacturing", priceNgn: 52500, isFree: false, tags: ["digital-twin", "simulation", "production"], bestFor: "50K+ employees" },
  { templateId: "MFG-002", name: "Predictive Quality Agent", description: "Predicts quality defects using sensor data and process parameters", category: "Manufacturing", priceNgn: 45000, isFree: false, tags: ["quality", "predictive", "sensors"], bestFor: "50K+ employees" },
  { templateId: "MFG-003", name: "Supply Chain Orchestrator", description: "Orchestrates multi-tier supply chain with demand-supply matching", category: "Manufacturing", priceNgn: 48000, isFree: false, tags: ["supply-chain", "orchestration", "demand"], bestFor: "50K+ employees" },
  { templateId: "MFG-004", name: "Energy Management Agent", description: "Optimizes energy consumption across plants with real-time monitoring", category: "Manufacturing", priceNgn: 36000, isFree: false, tags: ["energy", "management", "monitoring"], bestFor: "50K+ employees" },
  { templateId: "MFG-005", name: "Production Scheduler", description: "Schedules production runs with constraint optimization and changeover minimization", category: "Manufacturing", priceNgn: 39000, isFree: false, tags: ["scheduling", "optimization", "changeover"], bestFor: "50K+ employees" },
  { templateId: "MFG-006", name: "Spare Parts Optimizer", description: "Optimizes spare parts inventory with failure prediction and lead time analysis", category: "Manufacturing", priceNgn: 33000, isFree: false, tags: ["spare-parts", "inventory", "failure"], bestFor: "50K+ employees" },
  { templateId: "MFG-007", name: "Compliance Traceability Agent", description: "Provides full traceability for regulatory compliance (FDA, ISO, TS)", category: "Manufacturing", priceNgn: 42000, isFree: false, tags: ["traceability", "compliance", "iso"], bestFor: "50K+ employees" },
  { templateId: "MFG-008", name: "Yield Improvement Agent", description: "Identifies yield improvement opportunities using Six Sigma analytics", category: "Manufacturing", priceNgn: 36000, isFree: false, tags: ["yield", "six-sigma", "improvement"], bestFor: "50K+ employees" },
  { templateId: "MFG-009", name: "Vendor Managed Inventory", description: "Implements VMI with suppliers for optimal stock levels and replenishment", category: "Manufacturing", priceNgn: 30000, isFree: false, tags: ["vmi", "suppliers", "replenishment"], bestFor: "50K+ employees" },
  { templateId: "MFG-010", name: "OT Security Monitor", description: "Monitors operational technology networks for cybersecurity threats", category: "Manufacturing", priceNgn: 45000, isFree: false, tags: ["ot", "security", "monitoring"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 15: PHARMACEUTICAL (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "PH-001", name: "Drug Discovery Accelerator", description: "Accelerates drug discovery with molecular modeling and target identification", category: "Pharmaceutical", priceNgn: 72000, isFree: false, tags: ["drug-discovery", "molecular", "targets"], bestFor: "50K+ employees" },
  { templateId: "PH-002", name: "Clinical Trial Optimizer", description: "Optimizes clinical trial design with patient recruitment and site selection", category: "Pharmaceutical", priceNgn: 57000, isFree: false, tags: ["clinical-trials", "recruitment", "sites"], bestFor: "50K+ employees" },
  { templateId: "PH-003", name: "Pharmacovigilance Agent", description: "Manages adverse event reporting and signal detection for drug safety", category: "Pharmaceutical", priceNgn: 52500, isFree: false, tags: ["pharmacovigilance", "adverse-events", "safety"], bestFor: "50K+ employees" },
  { templateId: "PH-004", name: "Regulatory Submission Agent", description: "Prepares regulatory submissions (IND, NDA, ANDA) with document compilation", category: "Pharmaceutical", priceNgn: 48000, isFree: false, tags: ["regulatory", "submission", "nda"], bestFor: "50K+ employees" },
  { templateId: "PH-005", name: "Supply Chain Serialization", description: "Manages drug serialization and track-and-trace for DSCSA compliance", category: "Pharmaceutical", priceNgn: 39000, isFree: false, tags: ["serialization", "track-trace", "dscsa"], bestFor: "50K+ employees" },
  { templateId: "PH-006", name: "Manufacturing Process Agent", description: "Optimizes pharmaceutical manufacturing with PAT and quality-by-design", category: "Pharmaceutical", priceNgn: 45000, isFree: false, tags: ["manufacturing", "pat", "qbd"], bestFor: "50K+ employees" },
  { templateId: "PH-007", name: "Pipeline Portfolio Analyzer", description: "Analyzes drug pipeline portfolio with probability of success modeling", category: "Pharmaceutical", priceNgn: 54000, isFree: false, tags: ["pipeline", "portfolio", "pos"], bestFor: "50K+ employees" },
  { templateId: "PH-008", name: "Real World Evidence Agent", description: "Generates real-world evidence from EHR, claims, and registry data", category: "Pharmaceutical", priceNgn: 42000, isFree: false, tags: ["rwe", "ehr", "claims"], bestFor: "50K+ employees" },
  { templateId: "PH-009", name: "Commercial Launch Planner", description: "Plans drug commercial launches with market access and pricing strategies", category: "Pharmaceutical", priceNgn: 36000, isFree: false, tags: ["commercial", "launch", "pricing"], bestFor: "50K+ employees" },
  { templateId: "PH-010", name: "GMP Compliance Monitor", description: "Monitors GMP compliance with deviation tracking and CAPA management", category: "Pharmaceutical", priceNgn: 33000, isFree: false, tags: ["gmp", "compliance", "capa"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 16: LOGISTICS & SUPPLY CHAIN (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "LS-001", name: "Control Tower Agent", description: "Provides supply chain control tower with real-time visibility and alerts", category: "Logistics & Supply Chain", priceNgn: 48000, isFree: false, tags: ["control-tower", "visibility", "alerts"], bestFor: "50K+ employees" },
  { templateId: "LS-002", name: "Demand Sensing Engine", description: "Senses demand signals from POS, social, and weather data for accurate forecasting", category: "Logistics & Supply Chain", priceNgn: 42000, isFree: false, tags: ["demand-sensing", "forecasting", "pos"], bestFor: "50K+ employees" },
  { templateId: "LS-003", name: "Warehouse Management Agent", description: "Manages warehouse operations with wave planning and slot optimization", category: "Logistics & Supply Chain", priceNgn: 39000, isFree: false, tags: ["warehouse", "wave-planning", "slot"], bestFor: "50K+ employees" },
  { templateId: "LS-004", name: "Transportation Planner", description: "Plans multi-modal transportation with cost and carbon optimization", category: "Logistics & Supply Chain", priceNgn: 36000, isFree: false, tags: ["transportation", "multi-modal", "carbon"], bestFor: "50K+ employees" },
  { templateId: "LS-005", name: "Supplier Collaboration Agent", description: "Enables supplier collaboration with shared forecasts and VMI programs", category: "Logistics & Supply Chain", priceNgn: 33000, isFree: false, tags: ["supplier", "collaboration", "vmi"], bestFor: "50K+ employees" },
  { templateId: "LS-006", name: "Inventory Optimizer Pro", description: "Enterprise inventory optimization with multi-echelon safety stock", category: "Logistics & Supply Chain", priceNgn: 45000, isFree: false, tags: ["inventory", "multi-echelon", "safety-stock"], bestFor: "50K+ employees" },
  { templateId: "LS-007", name: "Reverse Logistics Agent", description: "Manages reverse logistics with returns processing and refurbishment", category: "Logistics & Supply Chain", priceNgn: 30000, isFree: false, tags: ["reverse-logistics", "returns", "refurbishment"], bestFor: "50K+ employees" },
  { templateId: "LS-008", name: "Carbon Footprint Tracker", description: "Tracks supply chain carbon footprint with Scope 1-3 reporting", category: "Logistics & Supply Chain", priceNgn: 36000, isFree: false, tags: ["carbon", "scope-3", "reporting"], bestFor: "50K+ employees" },
  { templateId: "LS-009", name: "Risk & Resilience Agent", description: "Assesses supply chain risks and builds resilience strategies", category: "Logistics & Supply Chain", priceNgn: 42000, isFree: false, tags: ["risk", "resilience", "assessment"], bestFor: "50K+ employees" },
  { templateId: "LS-010", name: "Freight Audit Agent", description: "Audits freight invoices against contracts and identifies overcharges", category: "Logistics & Supply Chain", priceNgn: 33000, isFree: false, tags: ["freight", "audit", "invoices"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 17: HOSPITALITY & TOURISM (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "HT-001", name: "Revenue Management Agent", description: "Optimizes hotel revenue management with dynamic pricing and demand forecasting", category: "Hospitality & Tourism", priceNgn: 42000, isFree: false, tags: ["revenue", "dynamic-pricing", "demand"], bestFor: "50K+ employees" },
  { templateId: "HT-002", name: "Guest Personalization Engine", description: "Personalizes guest experiences using preference data and loyalty history", category: "Hospitality & Tourism", priceNgn: 36000, isFree: false, tags: ["personalization", "guest", "loyalty"], bestFor: "50K+ employees" },
  { templateId: "HT-003", name: "Channel Manager Agent", description: "Manages distribution across OTAs, GDS, and direct channels with parity monitoring", category: "Hospitality & Tourism", priceNgn: 39000, isFree: false, tags: ["channel", "distribution", "ota"], bestFor: "50K+ employees" },
  { templateId: "HT-004", name: "Staff Scheduling Optimizer", description: "Optimizes hotel staffing based on occupancy forecasts and labor rules", category: "Hospitality & Tourism", priceNgn: 30000, isFree: false, tags: ["staffing", "scheduling", "occupancy"], bestFor: "50K+ employees" },
  { templateId: "HT-005", name: "Guest Feedback Analyzer", description: "Analyzes guest feedback from reviews, surveys, and social media", category: "Hospitality & Tourism", priceNgn: 33000, isFree: false, tags: ["feedback", "reviews", "analysis"], bestFor: "50K+ employees" },
  { templateId: "HT-006", name: "Event Management Agent", description: "Manages event logistics from booking to execution with vendor coordination", category: "Hospitality & Tourism", priceNgn: 36000, isFree: false, tags: ["events", "logistics", "vendors"], bestFor: "50K+ employees" },
  { templateId: "HT-007", name: "Loyalty Program Manager", description: "Manages hotel loyalty programs with tier management and reward optimization", category: "Hospitality & Tourism", priceNgn: 33000, isFree: false, tags: ["loyalty", "tiers", "rewards"], bestFor: "50K+ employees" },
  { templateId: "HT-008", name: "Sustainability Reporter", description: "Tracks and reports hospitality sustainability metrics (GSTC, Green Globe)", category: "Hospitality & Tourism", priceNgn: 27000, isFree: false, tags: ["sustainability", "gstc", "reporting"], bestFor: "50K+ employees" },
  { templateId: "HT-009", name: "Catering Operations Agent", description: "Manages catering operations with menu planning and dietary compliance", category: "Hospitality & Tourism", priceNgn: 30000, isFree: false, tags: ["catering", "menu", "dietary"], bestFor: "50K+ employees" },
  { templateId: "HT-010", name: "Travel Package Optimizer", description: "Optimizes travel packages with bundling and dynamic pricing", category: "Hospitality & Tourism", priceNgn: 36000, isFree: false, tags: ["travel", "packages", "bundling"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 18: MINING & RESOURCES (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "MR-001", name: "Geological Survey Analyzer", description: "Analyzes geological survey data for mineral exploration targeting", category: "Mining & Resources", priceNgn: 52500, isFree: false, tags: ["geological", "survey", "exploration"], bestFor: "50K+ employees" },
  { templateId: "MR-002", name: "Mine Planning Optimizer", description: "Optimizes mine planning with pit optimization and haul road design", category: "Mining & Resources", priceNgn: 48000, isFree: false, tags: ["mine-planning", "optimization", "haul"], bestFor: "50K+ employees" },
  { templateId: "MR-003", name: "Equipment Health Monitor", description: "Monitors mining equipment health with predictive maintenance scheduling", category: "Mining & Resources", priceNgn: 39000, isFree: false, tags: ["equipment", "health", "predictive"], bestFor: "50K+ employees" },
  { templateId: "MR-004", name: "Grade Control Agent", description: "Manages grade control with ore body modeling and blending optimization", category: "Mining & Resources", priceNgn: 42000, isFree: false, tags: ["grade-control", "ore-body", "blending"], bestFor: "50K+ employees" },
  { templateId: "MR-005", name: "Environmental Compliance Agent", description: "Monitors environmental compliance with water, air, and noise monitoring", category: "Mining & Resources", priceNgn: 36000, isFree: false, tags: ["environmental", "compliance", "monitoring"], bestFor: "50K+ employees" },
  { templateId: "MR-006", name: "Safety Management System", description: "Manages mining safety with hazard identification and incident investigation", category: "Mining & Resources", priceNgn: 33000, isFree: false, tags: ["safety", "hazard", "incident"], bestFor: "50K+ employees" },
  { templateId: "MR-007", name: "Mineral Processing Agent", description: "Optimizes mineral processing with recovery rate maximization", category: "Mining & Resources", priceNgn: 45000, isFree: false, tags: ["processing", "recovery", "optimization"], bestFor: "50K+ employees" },
  { templateId: "MR-008", name: "Commodity Trader Agent", description: "Manages commodity trading positions with risk management and hedging", category: "Mining & Resources", priceNgn: 54000, isFree: false, tags: ["commodity", "trading", "hedging"], bestFor: "50K+ employees" },
  { templateId: "MR-009", name: "Community Relations Agent", description: "Manages community relations with social investment tracking and grievances", category: "Mining & Resources", priceNgn: 30000, isFree: false, tags: ["community", "social-investment", "grievances"], bestFor: "50K+ employees" },
  { templateId: "MR-010", name: "Tailings Management Agent", description: "Monitors tailings dam stability with real-time sensor data", category: "Mining & Resources", priceNgn: 36000, isFree: false, tags: ["tailings", "dam", "stability"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 19: LEGAL & REGULATORY (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "LG-001", name: "Contract Lifecycle Agent", description: "Manages contracts from drafting to renewal with obligation tracking", category: "Legal & Regulatory", priceNgn: 48000, isFree: false, tags: ["contract", "lifecycle", "obligations"], bestFor: "50K+ employees" },
  { templateId: "LG-002", name: "E-Discovery Agent", description: "Performs e-discovery with document review, coding, and production", category: "Legal & Regulatory", priceNgn: 52500, isFree: false, tags: ["e-discovery", "document-review", "production"], bestFor: "50K+ employees" },
  { templateId: "LG-003", name: "Legal Hold Manager", description: "Manages legal holds with custodian tracking and compliance verification", category: "Legal & Regulatory", priceNgn: 36000, isFree: false, tags: ["legal-hold", "custodian", "compliance"], bestFor: "50K+ employees" },
  { templateId: "LG-004", name: "IP Portfolio Manager", description: "Manages intellectual property portfolio with filing and renewal tracking", category: "Legal & Regulatory", priceNgn: 39000, isFree: false, tags: ["ip", "portfolio", "renewals"], bestFor: "50K+ employees" },
  { templateId: "LG-005", name: "Regulatory Change Agent", description: "Tracks regulatory changes and assesses organizational impact", category: "Legal & Regulatory", priceNgn: 42000, isFree: false, tags: ["regulatory-change", "impact", "tracking"], bestFor: "50K+ employees" },
  { templateId: "LG-006", name: "Litigation Support Agent", description: "Supports litigation with case analysis, timeline construction, and document management", category: "Legal & Regulatory", priceNgn: 45000, isFree: false, tags: ["litigation", "case-analysis", "timeline"], bestFor: "50K+ employees" },
  { templateId: "LG-007", name: "Compliance Training Agent", description: "Delivers compliance training with progress tracking and certification", category: "Legal & Regulatory", priceNgn: 30000, isFree: false, tags: ["compliance", "training", "certification"], bestFor: "50K+ employees" },
  { templateId: "LG-008", name: "M&A Due Diligence Agent", description: "Supports M&A due diligence with document review and risk identification", category: "Legal & Regulatory", priceNgn: 57000, isFree: false, tags: ["ma", "due-diligence", "risk"], bestFor: "50K+ employees" },
  { templateId: "LG-009", name: "Privacy Impact Assessor", description: "Conducts privacy impact assessments with GDPR/CCPA compliance checks", category: "Legal & Regulatory", priceNgn: 39000, isFree: false, tags: ["privacy", "impact-assessment", "gdpr"], bestFor: "50K+ employees" },
  { templateId: "LG-010", name: "Corporate Governance Agent", description: "Manages corporate governance with board meeting coordination and compliance", category: "Legal & Regulatory", priceNgn: 36000, isFree: false, tags: ["governance", "board", "compliance"], bestFor: "50K+ employees" },

  // ═══════════════════════════════════════════════════════════════
  // INDUSTRY 20: AGRICULTURE & FOOD (10 Templates)
  // ═══════════════════════════════════════════════════════════════
  { templateId: "AF-001", name: "Precision Agriculture Agent", description: "Enables precision agriculture with GPS-guided operations and variable rate technology", category: "Agriculture & Food", priceNgn: 42000, isFree: false, tags: ["precision", "gps", "variable-rate"], bestFor: "50K+ employees" },
  { templateId: "AF-002", name: "Food Safety Compliance", description: "Manages food safety compliance (HACCP, FSMA, GFSI) with traceability", category: "Agriculture & Food", priceNgn: 39000, isFree: false, tags: ["food-safety", "haccp", "fsma"], bestFor: "50K+ employees" },
  { templateId: "AF-003", name: "Crop Planning Optimizer", description: "Optimizes crop planning with rotation, soil health, and market price data", category: "Agriculture & Food", priceNgn: 33000, isFree: false, tags: ["crop-planning", "rotation", "soil"], bestFor: "50K+ employees" },
  { templateId: "AF-004", name: "Supply Chain Traceability", description: "Provides farm-to-fork traceability with blockchain-based tracking", category: "Agriculture & Food", priceNgn: 36000, isFree: false, tags: ["traceability", "farm-to-fork", "blockchain"], bestFor: "50K+ employees" },
  { templateId: "AF-005", name: "Livestock Management Agent", description: "Manages livestock operations with health monitoring and feed optimization", category: "Agriculture & Food", priceNgn: 30000, isFree: false, tags: ["livestock", "health", "feed"], bestFor: "50K+ employees" },
  { templateId: "AF-006", name: "Cold Chain Monitor", description: "Monitors cold chain integrity with temperature tracking and alerts", category: "Agriculture & Food", priceNgn: 33000, isFree: false, tags: ["cold-chain", "temperature", "monitoring"], bestFor: "50K+ employees" },
  { templateId: "AF-007", name: "Grain Quality Analyzer", description: "Analyzes grain quality with moisture, protein, and contamination testing", category: "Agriculture & Food", priceNgn: 27000, isFree: false, tags: ["grain", "quality", "testing"], bestFor: "50K+ employees" },
  { templateId: "AF-008", name: "Agricultural Finance Agent", description: "Manages agricultural lending with crop insurance and weather-indexed products", category: "Agriculture & Food", priceNgn: 42000, isFree: false, tags: ["agri-finance", "lending", "insurance"], bestFor: "50K+ employees" },
  { templateId: "AF-009", name: "Sustainability Reporter", description: "Tracks agricultural sustainability metrics (water, carbon, biodiversity)", category: "Agriculture & Food", priceNgn: 30000, isFree: false, tags: ["sustainability", "water", "biodiversity"], bestFor: "50K+ employees" },
  { templateId: "AF-010", name: "Food Processing Optimizer", description: "Optimizes food processing operations with yield and waste minimization", category: "Agriculture & Food", priceNgn: 36000, isFree: false, tags: ["processing", "yield", "waste"], bestFor: "50K+ employees" },
];

/** Seed all 200 enterprise marketplace templates — safe to call multiple times (skips existing) */
export const seedEnterpriseTemplates = mutation({
  args: { adminToken: v.string(), offset: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return { authError: true, message: "Admin session invalid" };

      const BATCH_SIZE = 25;
      const startOffset = args.offset || 0;
      const batch = ENTERPRISE_TEMPLATES.slice(startOffset, startOffset + BATCH_SIZE);
      let inserted = 0;
      let skipped = 0;

      for (const t of batch) {
        try {
          const existing = await ctx.db.query("agent_marketplace_templates")
            .withIndex("by_template_id", (q) => q.eq("templateId", t.templateId))
            .first();
          if (existing) { skipped++; continue; }

          await ctx.db.insert("agent_marketplace_templates", {
            templateId: t.templateId,
            name: t.name,
            description: t.description,
            category: t.category,
            author: "Dutchkem Enterprise AI",
            version: "1.0.0",
            priceNgn: t.priceNgn,
            isFree: t.isFree,
            config: { bestFor: t.bestFor, tags: t.tags, type: "enterprise_template" },
            tags: t.tags,
            installCount: Math.floor(Math.random() * 200) + 20,
            rating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10,
            reviewCount: Math.floor(Math.random() * 80) + 15,
            isPublished: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          inserted++;
        } catch (insertErr: any) {
          return { error: `Insert failed at ${t.templateId}: ${insertErr.message}`, inserted, skipped };
        }
      }

      const nextOffset = startOffset + batch.length;
      const hasMore = nextOffset < ENTERPRISE_TEMPLATES.length;

      return {
        success: true, inserted, skipped, hasMore,
        nextOffset: hasMore ? nextOffset : undefined,
        total: ENTERPRISE_TEMPLATES.length,
        message: hasMore
          ? `Batch done. Call again with offset=${nextOffset}`
          : `All ${ENTERPRISE_TEMPLATES.length} enterprise templates loaded!`,
      };
    } catch (e: any) {
      return { error: e.message || String(e), stack: e.stack };
    }
  },
});

/** List all enterprise templates with optional category and search */
export const listEnterpriseTemplates = query({
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

/** Get enterprise category counts */
export const getEnterpriseCategoryCounts = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const ENTERPRISE_CATEGORIES = [
      "Oil & Gas", "Insurance", "Healthcare", "Education", "Customs & Trade",
      "Security & Defense", "Transportation", "Telecom", "Government", "Real Estate",
      "Marketing & Advertising", "E-commerce & Retail", "Banking & Finance", "Manufacturing",
      "Pharmaceutical", "Logistics & Supply Chain", "Hospitality & Tourism",
      "Mining & Resources", "Legal & Regulatory", "Agriculture & Food",
    ];
    const all = await ctx.db.query("agent_marketplace_templates")
      .filter((q: any) => q.eq(q.field("isPublished"), true))
      .take(500);
    const counts: Record<string, number> = {};
    for (const t of all) {
      if (ENTERPRISE_CATEGORIES.includes(t.category)) {
        counts[t.category] = (counts[t.category] || 0) + 1;
      }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total };
  },
});
