import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const COMPANY_TYPES = [
  { id: 'S1', name: 'Local Service Business', size: 'small' as const, employees: '5-20', price: 199, subdomain: 'localservice', agents: 3, description: 'Plumbing, Electrical, Cleaning', icon: '🔧', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'S2', name: 'E-commerce Store', size: 'small' as const, employees: '5-30', price: 299, subdomain: 'ecommercestore', agents: 5, description: 'Online Retail / E-commerce', icon: '🛒', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'S3', name: 'Marketing Agency', size: 'small' as const, employees: '5-40', price: 349, subdomain: 'marketingagency', agents: 5, description: 'Digital Marketing & Advertising', icon: '📣', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  { id: 'S4', name: 'Real Estate Agency', size: 'small' as const, employees: '5-35', price: 299, subdomain: 'realestate', agents: 4, description: 'Property Sales & Leasing', icon: '🏠', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'S5', name: 'SaaS Startup', size: 'small' as const, employees: '5-50', price: 399, subdomain: 'saasstartup', agents: 5, description: 'Software as a Service', icon: '💻', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'M1', name: 'Manufacturing Corp', size: 'enterprise' as const, employees: '500-5,000', price: 2999, subdomain: 'manufacturing', agents: 10, description: 'Industrial Manufacturing', icon: '🏭', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'M2', name: 'Healthcare Provider', size: 'enterprise' as const, employees: '500-10,000', price: 4999, subdomain: 'healthcare', agents: 10, description: 'Hospitals & Clinics', icon: '🏥', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'M3', name: 'Financial Services', size: 'enterprise' as const, employees: '500-10,000', price: 9999, subdomain: 'financial', agents: 12, description: 'Banking & Insurance', icon: '🏦', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'M4', name: 'Logistics & Supply Chain', size: 'enterprise' as const, employees: '500-10,000', price: 7499, subdomain: 'logistics', agents: 10, description: 'Transport & Warehousing', icon: '🚚', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'M5', name: 'Enterprise Tech', size: 'enterprise' as const, employees: '1,000-10,000', price: 14999, subdomain: 'enterprisetech', agents: 15, description: 'Enterprise Software & IT', icon: '🖥️', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'H1', name: 'Global Banking & Finance', size: 'hyper-scale' as const, employees: '500,000+', price: 49999, subdomain: 'globalbanking', agents: 25, description: '50+ Countries · Fraud, KYC, Risk, Compliance', icon: '🏦', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'H2', name: 'International Manufacturing', size: 'hyper-scale' as const, employees: '1,000,000+', price: 59999, subdomain: 'globalmanufacturing', agents: 30, description: '40+ Countries · Supply Chain, Quality', icon: '🏭', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'H3', name: 'Worldwide E-commerce', size: 'hyper-scale' as const, employees: '800,000+', price: 69999, subdomain: 'globalecommerce', agents: 35, description: '60+ Countries · Personalization, Fraud, Logistics', icon: '🛒', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'H4', name: 'Global Healthcare Network', size: 'hyper-scale' as const, employees: '600,000+', price: 79999, subdomain: 'globalhealthcare', agents: 28, description: '30+ Countries · Patient, Telemedicine, HIPAA', icon: '🏥', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'H5', name: 'Multi-National Telecom', size: 'hyper-scale' as const, employees: '700,000+', price: 89999, subdomain: 'globaltelecom', agents: 32, description: '45+ Countries · Network, Churn, Billing', icon: '📡', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'H6', name: 'Global Logistics & Shipping', size: 'hyper-scale' as const, employees: '500,000+', price: 99999, subdomain: 'globallogistics', agents: 40, description: '80+ Countries · Route, Fleet, Warehouse', icon: '🚚', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'H7', name: 'International Energy Corp', size: 'hyper-scale' as const, employees: '400,000+', price: 119999, subdomain: 'globalenergy', agents: 38, description: '35+ Countries · Grid, Analytics, Safety', icon: '⚡', color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30' },
  { id: 'H8', name: 'Worldwide Retail Chain', size: 'hyper-scale' as const, employees: '900,000+', price: 129999, subdomain: 'globalretail', agents: 45, description: '55+ Countries · Inventory, Price, Insights', icon: '🛍️', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  { id: 'H9', name: 'Global Tech Conglomerate', size: 'hyper-scale' as const, employees: '1,500,000+', price: 149999, subdomain: 'globaltech', agents: 50, description: '70+ Countries · DevOps, Security, Product', icon: '🖥️', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'H10', name: 'Mega Government Agency', size: 'hyper-scale' as const, employees: '2,000,000+', price: 199999, subdomain: 'government', agents: 60, description: '100+ Countries · Citizen, Documents, Compliance', icon: '🏛️', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // HEALTHCARE (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'HC11', name: 'Dental Clinic Network', size: 'small' as const, employees: '50-200', price: 499, subdomain: 'dentalnetwork', agents: 5, description: 'Multi-location dental practices', icon: '🦷', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'HC12', name: 'Veterinary Hospital', size: 'small' as const, employees: '20-100', price: 399, subdomain: 'vethospital', agents: 4, description: 'Animal healthcare & pet services', icon: '🐾', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'HC13', name: 'Pharmacy Chain', size: 'enterprise' as const, employees: '200-2,000', price: 2499, subdomain: 'pharmacychain', agents: 8, description: 'Retail pharmacy & drug distribution', icon: '💊', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'HC14', name: 'Diagnostic Lab Network', size: 'enterprise' as const, employees: '300-3,000', price: 3499, subdomain: 'diaglab', agents: 10, description: 'Medical testing & pathology labs', icon: '🔬', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'HC15', name: 'Mental Health Practice', size: 'small' as const, employees: '10-50', price: 349, subdomain: 'mentalhealth', agents: 4, description: 'Psychiatry, therapy & counseling', icon: '🧠', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'HC16', name: 'Home Healthcare Agency', size: 'small' as const, employees: '30-150', price: 449, subdomain: 'homehealth', agents: 5, description: 'In-home patient care services', icon: '🏡', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'HC17', name: 'Fertility Clinic', size: 'small' as const, employees: '20-80', price: 599, subdomain: 'fertility', agents: 4, description: 'IVF & reproductive health', icon: '👶', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  { id: 'HC18', name: 'Medical Devices Corp', size: 'enterprise' as const, employees: '500-5,000', price: 7999, subdomain: 'meddevices', agents: 12, description: 'Surgical & diagnostic equipment', icon: '🩺', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'HC19', name: 'Telehealth Platform', size: 'enterprise' as const, employees: '100-1,000', price: 4999, subdomain: 'telehealth', agents: 10, description: 'Virtual care & remote monitoring', icon: '📱', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'HC20', name: 'Health Insurance Provider', size: 'enterprise' as const, employees: '1,000-10,000', price: 12999, subdomain: 'healthinsurance', agents: 15, description: 'HMO, PPO & managed care', icon: '🛡️', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // EDUCATION (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'ED11', name: 'Online Course Platform', size: 'enterprise' as const, employees: '30-150', price: 599, subdomain: 'onlinecourse', agents: 6, description: 'E-learning & course marketplace', icon: '📚', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'ED12', name: 'Tutoring Center', size: 'small' as const, employees: '10-50', price: 299, subdomain: 'tutoring', agents: 3, description: 'K-12 & test prep tutoring', icon: '📖', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'ED13', name: 'University Admin System', size: 'enterprise' as const, employees: '2,000-20,000', price: 9999, subdomain: 'university', agents: 15, description: 'Higher education management', icon: '🎓', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'ED14', name: 'Coding Bootcamp', size: 'small' as const, employees: '20-80', price: 499, subdomain: 'bootcamp', agents: 5, description: 'Tech skills training & placement', icon: '⌨️', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'ED15', name: 'Language School', size: 'small' as const, employees: '15-60', price: 349, subdomain: 'languageschool', agents: 4, description: 'Foreign language instruction', icon: '🌍', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'ED16', name: 'K-12 School Network', size: 'enterprise' as const, employees: '500-5,000', price: 6999, subdomain: 'k12network', agents: 12, description: 'Multi-campus school management', icon: '🏫', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'ED17', name: 'Corporate Training Platform', size: 'enterprise' as const, employees: '100-1,000', price: 3999, subdomain: 'corptraining', agents: 8, description: 'Enterprise L&D & upskilling', icon: '📋', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'ED18', name: 'Student Housing Platform', size: 'small' as const, employees: '20-80', price: 399, subdomain: 'studenthousing', agents: 4, description: 'Off-campus accommodation', icon: '🏠', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'ED19', name: 'Research Institution', size: 'enterprise' as const, employees: '200-2,000', price: 8999, subdomain: 'research', agents: 14, description: 'Academic & scientific research', icon: '🔬', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  { id: 'ED20', name: 'EdTech Startup', size: 'small' as const, employees: '10-50', price: 449, subdomain: 'edtech', agents: 5, description: 'Educational technology products', icon: '💡', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // TECHNOLOGY (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'TECH11', name: 'Cybersecurity Firm', size: 'enterprise' as const, employees: '100-500', price: 1499, subdomain: 'cybersec', agents: 10, description: 'Threat detection & security ops', icon: '🔒', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  { id: 'TECH12', name: 'Cloud Services Provider', size: 'enterprise' as const, employees: '50-200', price: 999, subdomain: 'cloudservices', agents: 8, description: 'IaaS, PaaS & managed cloud', icon: '☁️', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'TECH13', name: 'AI/ML Startup', size: 'small' as const, employees: '10-50', price: 599, subdomain: 'aiml', agents: 6, description: 'Artificial intelligence products', icon: '🤖', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'TECH14', name: 'DevOps Agency', size: 'small' as const, employees: '15-60', price: 499, subdomain: 'devops', agents: 5, description: 'CI/CD, infrastructure & SRE', icon: '⚙️', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'TECH15', name: 'Mobile App Studio', size: 'small' as const, employees: '10-40', price: 449, subdomain: 'mobileapp', agents: 5, description: 'iOS & Android development', icon: '📱', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'TECH16', name: 'Data Analytics Firm', size: 'enterprise' as const, employees: '100-500', price: 1299, subdomain: 'dataanalytics', agents: 9, description: 'Business intelligence & data', icon: '📊', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'TECH17', name: 'IoT Solutions Provider', size: 'enterprise' as const, employees: '80-300', price: 1199, subdomain: 'iot', agents: 8, description: 'Connected devices & edge computing', icon: '🌐', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'TECH18', name: 'Blockchain Company', size: 'small' as const, employees: '10-40', price: 699, subdomain: 'blockchain', agents: 5, description: 'DeFi, NFTs & Web3 infrastructure', icon: '⛓️', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'TECH19', name: 'SaaS Platform', size: 'enterprise' as const, employees: '100-1,000', price: 1999, subdomain: 'saasplatform', agents: 10, description: 'B2B SaaS products', icon: '🚀', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'TECH20', name: 'IT Consulting Firm', size: 'enterprise' as const, employees: '200-2,000', price: 3999, subdomain: 'itconsulting', agents: 12, description: 'Digital transformation & IT strategy', icon: '💼', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // FINANCE (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'FIN11', name: 'Microfinance Bank', size: 'enterprise' as const, employees: '200-2,000', price: 4999, subdomain: 'microfinance', agents: 10, description: 'SME lending & micro-credit', icon: '💰', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'FIN12', name: 'Insurance Brokerage', size: 'small' as const, employees: '20-80', price: 599, subdomain: 'insurancebroker', agents: 5, description: 'Multi-carrier insurance sales', icon: '🛡️', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'FIN13', name: 'Wealth Management Firm', size: 'enterprise' as const, employees: '100-1,000', price: 7999, subdomain: 'wealthmgmt', agents: 12, description: 'Portfolio & investment advisory', icon: '📈', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'FIN14', name: 'Payment Gateway Company', size: 'enterprise' as const, employees: '100-500', price: 5999, subdomain: 'paygateway', agents: 10, description: 'Digital payment processing', icon: '💳', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'FIN15', name: 'Credit Union', size: 'enterprise' as const, employees: '300-3,000', price: 6999, subdomain: 'creditunion', agents: 11, description: 'Member-owned financial co-op', icon: '🏛️', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'FIN16', name: 'Accounting Firm', size: 'small' as const, employees: '15-60', price: 449, subdomain: 'accounting', agents: 5, description: 'Audit, tax & advisory services', icon: '🧮', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'FIN17', name: 'Venture Capital Fund', size: 'small' as const, employees: '10-30', price: 799, subdomain: 'vcfund', agents: 4, description: 'Startup investment & portfolio', icon: '🎯', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'FIN18', name: 'Remittance Service', size: 'enterprise' as const, employees: '200-1,000', price: 3999, subdomain: 'remittance', agents: 8, description: 'Cross-border money transfers', icon: '💸', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'FIN19', name: 'Stock Brokerage', size: 'enterprise' as const, employees: '500-5,000', price: 9999, subdomain: 'stockbroker', agents: 14, description: 'Securities trading & research', icon: '📊', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'FIN20', name: 'Fintech Startup', size: 'small' as const, employees: '10-50', price: 599, subdomain: 'fintech', agents: 6, description: 'Innovative financial products', icon: '🚀', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // REAL ESTATE (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'RE11', name: 'Property Management Co', size: 'enterprise' as const, employees: '100-500', price: 1299, subdomain: 'propmgmt', agents: 8, description: 'Residential & commercial management', icon: '🏢', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'RE12', name: 'Construction Company', size: 'enterprise' as const, employees: '200-2,000', price: 3999, subdomain: 'construction', agents: 10, description: 'General contracting & building', icon: '🏗️', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'RE13', name: 'Architectural Firm', size: 'small' as const, employees: '15-60', price: 499, subdomain: 'architecture', agents: 5, description: 'Building design & planning', icon: '📐', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'RE14', name: 'Co-working Space', size: 'small' as const, employees: '10-40', price: 399, subdomain: 'coworking', agents: 4, description: 'Shared office & community', icon: '🖥️', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'RE15', name: 'Vacation Rental Platform', size: 'enterprise' as const, employees: '50-300', price: 1999, subdomain: 'vacationrental', agents: 8, description: 'Short-term rental management', icon: '🏖️', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'RE16', name: 'Land Development Corp', size: 'enterprise' as const, employees: '100-1,000', price: 5999, subdomain: 'landdev', agents: 10, description: 'Raw land & subdivision development', icon: '🌍', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'RE17', name: 'Interior Design Studio', size: 'small' as const, employees: '10-30', price: 349, subdomain: 'interiordesign', agents: 4, description: 'Commercial & residential interiors', icon: '🎨', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'RE18', name: 'Real Estate Investment Trust', size: 'hyper-scale' as const, employees: '500-5,000', price: 19999, subdomain: 'reit', agents: 20, description: 'Portfolio of income properties', icon: '🏘️', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'RE19', name: 'Facility Management Co', size: 'enterprise' as const, employees: '300-3,000', price: 4999, subdomain: 'facilitymgmt', agents: 10, description: 'Building maintenance & ops', icon: '🔧', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'RE20', name: 'Smart Home Tech Company', size: 'small' as const, employees: '20-80', price: 599, subdomain: 'smarthome', agents: 5, description: 'IoT home automation products', icon: '🏠', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // MANUFACTURING (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'MF11', name: 'Automotive Parts Manufacturer', size: 'enterprise' as const, employees: '500-5,000', price: 5999, subdomain: 'autoparts', agents: 12, description: 'OEM & aftermarket components', icon: '🚗', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'MF12', name: 'Food Processing Plant', size: 'enterprise' as const, employees: '300-3,000', price: 4999, subdomain: 'foodprocessing', agents: 10, description: 'Food production & packaging', icon: '🍎', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'MF13', name: 'Textile Factory', size: 'enterprise' as const, employees: '200-2,000', price: 3499, subdomain: 'textile', agents: 8, description: 'Fabric & garment manufacturing', icon: '🧵', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'MF14', name: 'Electronics Assembly', size: 'enterprise' as const, employees: '500-5,000', price: 6999, subdomain: 'electronics', agents: 12, description: 'PCB & consumer electronics', icon: '📟', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'MF15', name: 'Pharmaceutical Manufacturer', size: 'enterprise' as const, employees: '1,000-10,000', price: 14999, subdomain: 'pharma', agents: 15, description: 'Drug production & R&D', icon: '💊', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'MF16', name: 'Steel & Metals Plant', size: 'enterprise' as const, employees: '500-5,000', price: 7999, subdomain: 'steel', agents: 12, description: 'Metal fabrication & processing', icon: '⚙️', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'MF17', name: 'Furniture Manufacturer', size: 'small' as const, employees: '50-200', price: 799, subdomain: 'furniture', agents: 5, description: 'Office & home furniture', icon: '🪑', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'MF18', name: 'Chemical Processing Plant', size: 'enterprise' as const, employees: '300-3,000', price: 8999, subdomain: 'chemical', agents: 14, description: 'Industrial chemicals & polymers', icon: '🧪', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'MF19', name: 'Packaging Solutions Co', size: 'enterprise' as const, employees: '200-2,000', price: 4499, subdomain: 'packaging', agents: 10, description: 'Industrial & consumer packaging', icon: '📦', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'MF20', name: '3D Printing Company', size: 'small' as const, employees: '10-50', price: 599, subdomain: '3dprinting', agents: 5, description: 'Rapid prototyping & additive mfg', icon: '🖨️', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // LOGISTICS (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'LG11', name: 'Last-Mile Delivery Service', size: 'enterprise' as const, employees: '200-2,000', price: 2999, subdomain: 'lastmile', agents: 8, description: 'Same-day & next-day delivery', icon: '🏍️', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'LG12', name: 'Freight Forwarding Company', size: 'enterprise' as const, employees: '100-1,000', price: 3999, subdomain: 'freight', agents: 10, description: 'International cargo shipping', icon: '🚢', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'LG13', name: 'Cold Chain Logistics', size: 'enterprise' as const, employees: '200-2,000', price: 4999, subdomain: 'coldchain', agents: 10, description: 'Temperature-controlled transport', icon: '❄️', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'LG14', name: 'Warehouse & Fulfillment', size: 'enterprise' as const, employees: '300-3,000', price: 5999, subdomain: 'warehouse', agents: 12, description: '3PL & order fulfillment', icon: '🏭', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'LG15', name: 'Courier Service', size: 'small' as const, employees: '50-200', price: 599, subdomain: 'courier', agents: 4, description: 'Express document & parcel delivery', icon: '📮', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'LG16', name: 'Fleet Management Company', size: 'enterprise' as const, employees: '100-1,000', price: 3499, subdomain: 'fleetmgmt', agents: 8, description: 'Vehicle leasing & telematics', icon: '🚛', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'LG17', name: 'Drone Delivery Startup', size: 'small' as const, employees: '10-50', price: 799, subdomain: 'dronedelivery', agents: 5, description: 'UAV logistics & aerial delivery', icon: '🛸', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'LG18', name: 'Rail Freight Operator', size: 'enterprise' as const, employees: '500-5,000', price: 7999, subdomain: 'railfreight', agents: 14, description: 'Bulk & intermodal rail transport', icon: '🚂', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'LG19', name: 'E-commerce Fulfillment Hub', size: 'enterprise' as const, employees: '200-2,000', price: 4499, subdomain: 'ecommfulfill', agents: 10, description: 'Marketplace order processing', icon: '📦', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'LG20', name: 'Customs Brokerage Firm', size: 'small' as const, employees: '20-80', price: 499, subdomain: 'customs', agents: 5, description: 'Import/export clearance', icon: '🛃', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // RETAIL (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'RT11', name: 'Fashion Boutique Chain', size: 'enterprise' as const, employees: '200-2,000', price: 3499, subdomain: 'fashion', agents: 8, description: 'Apparel & accessories retail', icon: '👗', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  { id: 'RT12', name: 'Grocery Store Chain', size: 'enterprise' as const, employees: '500-5,000', price: 5999, subdomain: 'grocery', agents: 12, description: 'Supermarket & fresh produce', icon: '🥑', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'RT13', name: 'Electronics Retailer', size: 'enterprise' as const, employees: '300-3,000', price: 4999, subdomain: 'electronicsretail', agents: 10, description: 'Consumer electronics & gadgets', icon: '📱', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'RT14', name: 'Home Improvement Store', size: 'enterprise' as const, employees: '200-2,000', price: 3999, subdomain: 'homeimprove', agents: 10, description: 'Hardware & building materials', icon: '🔨', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'RT15', name: 'Pet Supply Store', size: 'small' as const, employees: '10-50', price: 399, subdomain: 'petsupply', agents: 4, description: 'Pet food, toys & accessories', icon: '🐕', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'RT16', name: 'Luxury Goods Retailer', size: 'enterprise' as const, employees: '100-1,000', price: 6999, subdomain: 'luxury', agents: 10, description: 'High-end fashion & jewelry', icon: '💎', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'RT17', name: 'Sporting Goods Store', size: 'small' as const, employees: '20-80', price: 449, subdomain: 'sportinggoods', agents: 5, description: 'Athletic equipment & apparel', icon: '⚽', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'RT18', name: 'Convenience Store Chain', size: 'enterprise' as const, employees: '300-3,000', price: 3999, subdomain: 'convenience', agents: 10, description: 'Neighborhood quick-stop stores', icon: '🏪', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'RT19', name: 'Baby & Kids Store', size: 'small' as const, employees: '15-60', price: 399, subdomain: 'babystore', agents: 4, description: 'Children clothing & gear', icon: '👶', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'RT20', name: 'Automotive Parts Retailer', size: 'enterprise' as const, employees: '200-2,000', price: 3499, subdomain: 'autoretail', agents: 8, description: 'Car parts & accessories', icon: '🔧', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // HOSPITALITY (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'HO11', name: 'Hotel Chain', size: 'enterprise' as const, employees: '500-5,000', price: 7999, subdomain: 'hotelchain', agents: 14, description: 'Multi-property hotel management', icon: '🏨', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'HO12', name: 'Restaurant Chain', size: 'enterprise' as const, employees: '300-3,000', price: 4999, subdomain: 'restchain', agents: 10, description: 'Franchise & multi-location dining', icon: '🍽️', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'HO13', name: 'Event Planning Company', size: 'small' as const, employees: '10-40', price: 449, subdomain: 'eventplanning', agents: 5, description: 'Corporate & social events', icon: '🎉', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  { id: 'HO14', name: 'Catering Service', size: 'small' as const, employees: '20-80', price: 399, subdomain: 'catering', agents: 4, description: 'Corporate & wedding catering', icon: '🍱', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'HO15', name: 'Spa & Wellness Center', size: 'small' as const, employees: '15-60', price: 399, subdomain: 'spa', agents: 4, description: 'Beauty, massage & wellness', icon: '🧖', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'HO16', name: 'Nightclub & Lounge', size: 'small' as const, employees: '20-80', price: 499, subdomain: 'nightclub', agents: 4, description: 'Entertainment & nightlife venues', icon: '🎶', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'HO17', name: 'Travel Agency', size: 'small' as const, employees: '10-50', price: 399, subdomain: 'travelagency', agents: 5, description: 'Tour packages & bookings', icon: '✈️', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'HO18', name: 'Resort & Casino', size: 'hyper-scale' as const, employees: '1,000-10,000', price: 19999, subdomain: 'resortcasino', agents: 18, description: 'Luxury resort & gaming', icon: '🎰', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'HO19', name: 'Coffee Shop Chain', size: 'enterprise' as const, employees: '100-1,000', price: 1999, subdomain: 'coffeeshop', agents: 6, description: 'Specialty coffee & cafe chain', icon: '☕', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'HO20', name: 'Food Delivery Platform', size: 'enterprise' as const, employees: '200-2,000', price: 3999, subdomain: 'fooddelivery', agents: 10, description: 'Restaurant delivery aggregator', icon: '🛵', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // LEGAL (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'LG21', name: 'Law Firm (Full Service)', size: 'enterprise' as const, employees: '200-2,000', price: 5999, subdomain: 'lawfirm', agents: 12, description: 'Corporate, litigation & IP law', icon: '⚖️', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'LG22', name: 'Patent Attorney Office', size: 'small' as const, employees: '10-30', price: 699, subdomain: 'patent', agents: 5, description: 'IP filing & prosecution', icon: '📝', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'LG23', name: 'Immigration Law Firm', size: 'small' as const, employees: '10-40', price: 499, subdomain: 'immigration', agents: 5, description: 'Visa, green card & citizenship', icon: '🌍', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'LG24', name: 'Mediation Center', size: 'small' as const, employees: '10-30', price: 399, subdomain: 'mediation', agents: 4, description: 'Alternative dispute resolution', icon: '🤝', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'LG25', name: 'Legal Tech Company', size: 'enterprise' as const, employees: '100-500', price: 2999, subdomain: 'legaltech', agents: 8, description: 'Contract management & e-discovery', icon: '💻', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'LG26', name: 'Compliance Consultancy', size: 'enterprise' as const, employees: '100-1,000', price: 4999, subdomain: 'compliance', agents: 10, description: 'Regulatory compliance & audit', icon: '📋', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'LG27', name: 'Corporate Law Department', size: 'enterprise' as const, employees: '50-300', price: 3999, subdomain: 'corplaw', agents: 8, description: 'In-house legal team support', icon: '🏛️', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'LG28', name: 'Intellectual Property Firm', size: 'small' as const, employees: '10-40', price: 599, subdomain: 'ipfirm', agents: 5, description: 'Trademarks, copyrights & patents', icon: '©️', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'LG29', name: 'Family Law Practice', size: 'small' as const, employees: '5-20', price: 349, subdomain: 'familylaw', agents: 3, description: 'Divorce, custody & adoption', icon: '👨‍👩‍👧', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  { id: 'LG30', name: 'Tax Advisory Firm', size: 'enterprise' as const, employees: '100-1,000', price: 3999, subdomain: 'taxadvisory', agents: 8, description: 'Tax planning & preparation', icon: '🧾', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // AGRICULTURE (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'AG11', name: 'Commercial Farming Operation', size: 'enterprise' as const, employees: '200-2,000', price: 3999, subdomain: 'farm', agents: 10, description: 'Large-scale crop production', icon: '🌾', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'AG12', name: 'Livestock Ranch', size: 'enterprise' as const, employees: '100-1,000', price: 2999, subdomain: 'ranch', agents: 8, description: 'Cattle, poultry & dairy farming', icon: '🐄', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'AG13', name: 'Agri-Tech Startup', size: 'small' as const, employees: '10-50', price: 599, subdomain: 'agritech', agents: 5, description: 'Precision agriculture & drones', icon: '🤖', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'AG14', name: 'Food Distribution Company', size: 'enterprise' as const, employees: '200-2,000', price: 4999, subdomain: 'fooddist', agents: 10, description: 'Wholesale food & produce', icon: '🚛', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'AG15', name: 'Seed & Fertilizer Supplier', size: 'enterprise' as const, employees: '100-1,000', price: 3499, subdomain: 'seedfert', agents: 8, description: 'Agricultural inputs & supplies', icon: '🌱', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  { id: 'AG16', name: 'Aquaculture Farm', size: 'enterprise' as const, employees: '100-1,000', price: 3999, subdomain: 'aquaculture', agents: 8, description: 'Fish & shrimp farming', icon: '🐟', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'AG17', name: 'Organic Farm Network', size: 'small' as const, employees: '20-80', price: 499, subdomain: 'organicfarm', agents: 4, description: 'Certified organic produce', icon: '🥬', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'AG18', name: 'Agricultural Cooperative', size: 'enterprise' as const, employees: '300-3,000', price: 2999, subdomain: 'coop', agents: 8, description: 'Farmer-owned cooperative', icon: '🤝', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'AG19', name: 'Greenhouse Operation', size: 'small' as const, employees: '20-80', price: 599, subdomain: 'greenhouse', agents: 5, description: 'Controlled environment agriculture', icon: '🏡', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'AG20', name: 'Forestry & Timber Company', size: 'enterprise' as const, employees: '200-2,000', price: 4499, subdomain: 'timber', agents: 10, description: 'Logging & wood products', icon: '🌲', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
]

export function PortalCompanyManagement({ adminToken, organizations }: { adminToken: string, organizations: any[] }) {
  const [selectedType, setSelectedType] = useState(COMPANY_TYPES[0])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(organizations[0]?._id || '')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({ companyName: '', contactEmail: '', contactPhone: '', address: '' })

  const companies = useQuery(api.enterprise_companies.listAllCompanies, { adminToken })
  const companyList = companies || []

  const createCompany = useMutation(api.enterprise_companies.createCompany)
  const updateStatus = useMutation(api.enterprise_companies.updateCompanyStatus)
  const deleteCompany = useMutation(api.enterprise_companies.deleteCompany)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreate = async () => {
    if (!selectedOrg) { showToast('Select an organization first', 'error'); return }
    if (!form.companyName || !form.contactEmail) { showToast('Fill required fields', 'error'); return }
    try {
      const result: any = await createCompany({
        orgId: selectedOrg as any,
        companyType: selectedType.id,
        companyName: form.companyName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone || undefined,
        address: form.address || undefined,
        adminToken,
      })
      if (result?.error) { showToast(result.error, 'error'); return }
      showToast(`${form.companyName} created! Login: ${result.loginUrl}`, 'success')
      setShowCreate(false)
      setForm({ companyName: '', contactEmail: '', contactPhone: '', address: '' })
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleStatusChange = async (companyId: string, status: 'active' | 'suspended' | 'pending') => {
    try {
      await updateStatus({ companyId, status, adminToken })
      showToast('Status updated', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleDelete = async (companyId: string) => {
    try {
      await deleteCompany({ companyId, adminToken })
      showToast('Company deleted', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const totalRevenue = companyList.reduce((sum: number, c: any) => sum + c.monthlyPrice, 0)

  return (
    <div className="space-y-6 ">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Company Management</h2>
          <p className="text-sm text-slate-400 mt-1">Create companies from 120 types — S1-S5 (Small), M1-M5 (Enterprise), H1-H10 (Hyper-Scale) + 100 Industry Types</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50">
            <option value="" className="bg-[#0a0a0f]">Select organization...</option>
            {organizations.map((o: any) => <option key={o._id} value={o._id} className="bg-[#0a0a0f]">{o.name}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all duration-200">
            + Create Company
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black">{companyList.length}</div>
          <div className="text-xs text-slate-400">Total Companies</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-emerald-400">{companyList.filter((c: any) => c.status === 'active').length}</div>
          <div className="text-xs text-slate-400">Active</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-blue-400">{companyList.filter((c: any) => c.size === 'small').length}</div>
          <div className="text-xs text-slate-400">Small (S1-S5)</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-purple-400">{COMPANY_TYPES.length}</div>
          <div className="text-xs text-slate-400">Total Types Available</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-purple-400">{companyList.filter((c: any) => c.size === 'enterprise').length}</div>
          <div className="text-xs text-slate-400">Enterprise (M1-M5)</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-amber-400">{companyList.filter((c: any) => c.size === 'hyper-scale').length}</div>
          <div className="text-xs text-slate-400">Hyper-Scale (H1-H10)</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-300 mb-3">Company Types ({COMPANY_TYPES.length} total)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {COMPANY_TYPES.map((type) => {
            const count = companyList.filter((c: any) => c.companyType === type.id).length
            return (
              <div
                key={type.id}
                onClick={() => { setSelectedType(type); setShowCreate(true) }}
                className={`bg-gradient-to-br ${type.color} border ${type.border} rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{type.icon}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${type.size === 'small' ? 'bg-emerald-500/20 text-emerald-400' : type.size === 'hyper-scale' ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {type.size.toUpperCase()}
                  </span>
                </div>
                <h4 className="text-xs font-black text-white mb-1">{type.name}</h4>
                <p className="text-[10px] text-slate-400 mb-2">{type.description}</p>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#FF6B35] font-black">${type.price}/mo</span>
                  <span className="text-slate-500">{type.employees} emp</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-1">{type.agents} agents · {count} created</div>
              </div>
            )
          })}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">Create {selectedType.name}</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-xl">
              <span className="text-2xl">{selectedType.icon}</span>
              <div>
                <div className="text-sm font-black">{selectedType.name}</div>
                <div className="text-[10px] text-slate-400">${selectedType.price}/mo · {selectedType.employees} employees · {selectedType.agents} agents</div>
              </div>
            </div>
            <div className="space-y-3">
              <input placeholder="Company Name *" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input type="email" placeholder="Contact Email *" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input placeholder="Contact Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <div className="text-[10px] text-slate-500">Login URL: https://{selectedType.subdomain}.enterprise.dutchkem.com/login</div>
              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all">Create & Sync to Hub</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs font-black hover:text-white">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-black text-slate-300 mb-3">Created Companies</h3>
        {companyList.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No companies created yet. Click a company type above or "Create Company" to start.</div>
        ) : (
          <div className="space-y-2">
            {companyList.map((company: any) => (
              <div key={company._id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-4">
                  <span className="text-xl">{COMPANY_TYPES.find(t => t.id === company.companyType)?.icon || '🏢'}</span>
                  <div>
                    <div className="text-sm font-black text-white">{company.companyName}</div>
                    <div className="text-[10px] text-slate-400">{company.typeName} · {company.contactEmail}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] text-[#FF6B35] font-black">${company.monthlyPrice}/mo</div>
                    <div className="text-[9px] text-slate-500">{company.employeeRange} employees</div>
                  </div>
                  <code className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] text-slate-400">{company.subdomain}.enterprise.dutchkem.com</code>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${company.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : company.status === 'suspended' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {company.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${company.syncStatus === 'synced' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {company.syncStatus}
                  </span>
                  <div className="flex gap-1">
                    {company.status === 'active' ? (
                      <button onClick={() => handleStatusChange(company.companyId, 'suspended')} className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-[9px] font-bold text-red-400 hover:bg-red-500/30">Suspend</button>
                    ) : (
                      <button onClick={() => handleStatusChange(company.companyId, 'active')} className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/30">Activate</button>
                    )}
                    <button onClick={() => handleDelete(company.companyId)} className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-[9px] font-bold text-red-400 hover:bg-red-500/30">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
