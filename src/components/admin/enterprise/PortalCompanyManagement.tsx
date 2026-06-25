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
  // ═══════════════════════════════════════════════════════════════
  // ENERGY & UTILITIES (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'EP21', name: 'Solar Energy Company', size: 'enterprise' as const, employees: '200-2,000', price: 4999, subdomain: 'solar', agents: 10, description: 'Solar panel installation & maintenance', icon: '☀️', color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30' },
  { id: 'EP22', name: 'Water Treatment Plant', size: 'enterprise' as const, employees: '300-3,000', price: 6999, subdomain: 'watertreatment', agents: 12, description: 'Municipal & industrial water treatment', icon: '💧', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'EP23', name: 'Wind Farm Operator', size: 'enterprise' as const, employees: '100-1,000', price: 5999, subdomain: 'windfarm', agents: 10, description: 'Wind turbine energy generation', icon: '🌬️', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'EP24', name: 'Electric Utility Company', size: 'hyper-scale' as const, employees: '5,000-50,000', price: 29999, subdomain: 'electricutil', agents: 20, description: 'Power generation & distribution', icon: '⚡', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'EP25', name: 'Natural Gas Provider', size: 'enterprise' as const, employees: '1,000-10,000', price: 19999, subdomain: 'naturalgas', agents: 15, description: 'Gas extraction & distribution', icon: '🔥', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'EP26', name: 'Waste Management Company', size: 'enterprise' as const, employees: '200-2,000', price: 3999, subdomain: 'wastemanage', agents: 8, description: 'Garbage collection & recycling', icon: '♻️', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  { id: 'EP27', name: 'EV Charging Network', size: 'small' as const, employees: '20-100', price: 799, subdomain: 'evcharging', agents: 6, description: 'Electric vehicle charging stations', icon: '🔌', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'EP28', name: 'Nuclear Energy Corp', size: 'hyper-scale' as const, employees: '10,000-100,000', price: 49999, subdomain: 'nuclear', agents: 25, description: 'Nuclear power generation', icon: '☢️', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  { id: 'EP29', name: 'Hydroelectric Plant', size: 'enterprise' as const, employees: '500-5,000', price: 8999, subdomain: 'hydroelectric', agents: 12, description: 'Dam-based power generation', icon: '🌊', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'EP30', name: 'Smart Grid Technology', size: 'enterprise' as const, employees: '100-500', price: 7999, subdomain: 'smartgrid', agents: 10, description: 'Intelligent power distribution', icon: '🏗️', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // MEDIA & ENTERTAINMENT (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'ME21', name: 'Film Production Studio', size: 'enterprise' as const, employees: '100-1,000', price: 7999, subdomain: 'filmstudio', agents: 12, description: 'Movie & TV series production', icon: '🎬', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'ME22', name: 'Music Streaming Platform', size: 'hyper-scale' as const, employees: '1,000-10,000', price: 39999, subdomain: 'musicstream', agents: 22, description: 'Audio streaming & distribution', icon: '🎵', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'ME23', name: 'Game Development Studio', size: 'small' as const, employees: '20-100', price: 899, subdomain: 'gamedev', agents: 6, description: 'Video game creation & publishing', icon: '🎮', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'ME24', name: 'Broadcasting Network', size: 'hyper-scale' as const, employees: '5,000-50,000', price: 29999, subdomain: 'broadcast', agents: 20, description: 'TV & radio broadcasting', icon: '📺', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'ME25', name: 'Digital Media Agency', size: 'small' as const, employees: '15-60', price: 599, subdomain: 'digitalmedia', agents: 5, description: 'Content creation & social media', icon: '📱', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'ME26', name: 'Podcast Network', size: 'small' as const, employees: '10-40', price: 399, subdomain: 'podcast', agents: 4, description: 'Podcast production & hosting', icon: '🎙️', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'ME27', name: 'Animation Studio', size: 'enterprise' as const, employees: '200-2,000', price: 5999, subdomain: 'animation', agents: 10, description: '2D & 3D animation production', icon: '🎨', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  { id: 'ME28', name: 'Esports Organization', size: 'small' as const, employees: '20-80', price: 699, subdomain: 'esports', agents: 5, description: 'Competitive gaming & teams', icon: '🏆', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'ME29', name: 'Event Production Company', size: 'small' as const, employees: '30-150', price: 799, subdomain: 'eventprod', agents: 5, description: 'Concert & festival production', icon: '🎪', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'ME30', name: 'OTT Platform', size: 'hyper-scale' as const, employees: '2,000-20,000', price: 49999, subdomain: 'ott', agents: 25, description: 'Over-the-top streaming service', icon: '📱', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // GOVERNMENT & PUBLIC SECTOR (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'GOV21', name: 'Municipal Government', size: 'enterprise' as const, employees: '500-5,000', price: 9999, subdomain: 'municipal', agents: 15, description: 'City & local government services', icon: '🏛️', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'GOV22', name: 'Tax Authority', size: 'enterprise' as const, employees: '1,000-10,000', price: 14999, subdomain: 'taxauthority', agents: 18, description: 'Revenue collection & compliance', icon: '💰', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'GOV23', name: 'Immigration Department', size: 'enterprise' as const, employees: '2,000-20,000', price: 19999, subdomain: 'immigration', agents: 20, description: 'Visa processing & border control', icon: '🛂', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'GOV24', name: 'Public Health Agency', size: 'enterprise' as const, employees: '1,000-10,000', price: 12999, subdomain: 'publichealth', agents: 15, description: 'Disease control & health policy', icon: '🏥', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'GOV25', name: 'Public Works Department', size: 'enterprise' as const, employees: '500-5,000', price: 8999, subdomain: 'publicworks', agents: 12, description: 'Infrastructure & road maintenance', icon: '🛣️', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'GOV26', name: 'Education Ministry', size: 'hyper-scale' as const, employees: '10,000-100,000', price: 39999, subdomain: 'eduministry', agents: 22, description: 'National education policy & oversight', icon: '🎓', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'GOV27', name: 'Law Enforcement Agency', size: 'enterprise' as const, employees: '5,000-50,000', price: 29999, subdomain: 'lawenforce', agents: 20, description: 'Police & public safety operations', icon: '🚔', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'GOV28', name: 'Social Welfare Agency', size: 'enterprise' as const, employees: '500-5,000', price: 7999, subdomain: 'socialwelfare', agents: 12, description: 'Social services & benefit programs', icon: '🤲', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'GOV29', name: 'Environmental Protection Agency', size: 'enterprise' as const, employees: '500-5,000', price: 9999, subdomain: 'epa', agents: 14, description: 'Environmental regulation & enforcement', icon: '🌍', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  { id: 'GOV30', name: 'Central Bank', size: 'hyper-scale' as const, employees: '5,000-50,000', price: 99999, subdomain: 'centralbank', agents: 30, description: 'Monetary policy & financial regulation', icon: '🏦', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // NON-PROFIT & NGO (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'NP21', name: 'International Aid Organization', size: 'hyper-scale' as const, employees: '5,000-50,000', price: 29999, subdomain: 'aidorg', agents: 20, description: 'Humanitarian relief & development', icon: '🕊️', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'NP22', name: 'Environmental NGO', size: 'enterprise' as const, employees: '200-2,000', price: 4999, subdomain: 'envngo', agents: 10, description: 'Conservation & climate action', icon: '🌿', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  { id: 'NP23', name: 'Education Charity', size: 'small' as const, employees: '20-80', price: 399, subdomain: 'educharity', agents: 4, description: 'Schools & literacy programs', icon: '📚', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'NP24', name: 'Healthcare Foundation', size: 'enterprise' as const, employees: '300-3,000', price: 6999, subdomain: 'healthfound', agents: 10, description: 'Medical research & patient support', icon: '❤️', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'NP25', name: 'Disaster Relief Agency', size: 'enterprise' as const, employees: '500-5,000', price: 9999, subdomain: 'disasterrelief', agents: 14, description: 'Emergency response & recovery', icon: '🆘', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  { id: 'NP26', name: 'Animal Welfare Organization', size: 'small' as const, employees: '20-100', price: 449, subdomain: 'animalwelfare', agents: 4, description: 'Animal rescue & protection', icon: '🐾', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'NP27', name: 'Human Rights Organization', size: 'enterprise' as const, employees: '200-2,000', price: 5999, subdomain: 'humanrights', agents: 10, description: 'Civil liberties & advocacy', icon: '✊', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'NP28', name: 'Community Development Corp', size: 'small' as const, employees: '15-60', price: 349, subdomain: 'communitydev', agents: 4, description: 'Neighborhood improvement programs', icon: '🏘️', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'NP29', name: 'Youth Empowerment Foundation', size: 'small' as const, employees: '10-40', price: 299, subdomain: 'youthempower', agents: 3, description: 'Skills training & mentorship', icon: '🌟', color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30' },
  { id: 'NP30', name: 'Religious Organization', size: 'small' as const, employees: '10-50', price: 299, subdomain: 'religious', agents: 3, description: 'Faith-based community services', icon: '⛪', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // MINING & RESOURCES (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'MN21', name: 'Gold Mining Company', size: 'enterprise' as const, employees: '1,000-10,000', price: 19999, subdomain: 'goldmine', agents: 16, description: 'Gold extraction & refining', icon: '🥇', color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30' },
  { id: 'MN22', name: 'Oil & Gas Exploration', size: 'hyper-scale' as const, employees: '10,000-100,000', price: 59999, subdomain: 'oilgas', agents: 30, description: 'Petroleum exploration & drilling', icon: '🛢️', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'MN23', name: 'Diamond Mining Corp', size: 'enterprise' as const, employees: '2,000-20,000', price: 39999, subdomain: 'diamond', agents: 20, description: 'Diamond mining & sorting', icon: '💎', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'MN24', name: 'Copper Mining Company', size: 'enterprise' as const, employees: '1,000-10,000', price: 14999, subdomain: 'copper', agents: 14, description: 'Copper ore extraction & processing', icon: '🔶', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'MN25', name: 'Quarry Operations', size: 'enterprise' as const, employees: '200-2,000', price: 5999, subdomain: 'quarry', agents: 10, description: 'Stone, sand & gravel extraction', icon: '⛰️', color: 'from-stone-500/20 to-stone-600/10', border: 'border-stone-500/30' },
  { id: 'MN26', name: 'Lithium Mining Corp', size: 'enterprise' as const, employees: '500-5,000', price: 19999, subdomain: 'lithium', agents: 16, description: 'Battery-grade lithium extraction', icon: '🔋', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'MN27', name: 'Mining Equipment Supplier', size: 'enterprise' as const, employees: '500-5,000', price: 8999, subdomain: 'minequip', agents: 12, description: 'Heavy machinery & tools for mining', icon: '⛏️', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'MN28', name: 'Mineral Processing Plant', size: 'enterprise' as const, employees: '300-3,000', price: 7999, subdomain: 'mineralproc', agents: 10, description: 'Ore crushing & concentration', icon: '🏗️', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'MN29', name: 'Rare Earth Mining', size: 'enterprise' as const, employees: '500-5,000', price: 24999, subdomain: 'rareearth', agents: 18, description: 'Rare earth element extraction', icon: '🧲', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'MN30', name: 'Mining Safety Consulting', size: 'small' as const, employees: '20-80', price: 699, subdomain: 'minesafety', agents: 5, description: 'Mine safety audits & training', icon: '⛑️', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // AUTOMOTIVE (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'AU21', name: 'Car Dealership Chain', size: 'enterprise' as const, employees: '500-5,000', price: 7999, subdomain: 'cardealership', agents: 12, description: 'New & used vehicle sales', icon: '🚗', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'AU22', name: 'Auto Repair Shop Chain', size: 'enterprise' as const, employees: '200-2,000', price: 3999, subdomain: 'autorepair', agents: 8, description: 'Vehicle maintenance & repair', icon: '🔧', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'AU23', name: 'Electric Vehicle Manufacturer', size: 'hyper-scale' as const, employees: '50,000-500,000', price: 89999, subdomain: 'evmanufacturer', agents: 35, description: 'EV design & manufacturing', icon: '⚡', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'AU24', name: 'Car Rental Company', size: 'enterprise' as const, employees: '1,000-10,000', price: 9999, subdomain: 'carrental', agents: 14, description: 'Fleet rental & leasing', icon: '🚙', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'AU25', name: 'Ride-sharing Platform', size: 'hyper-scale' as const, employees: '10,000-100,000', price: 69999, subdomain: 'rideshare', agents: 30, description: 'On-demand transportation', icon: '🚕', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'AU26', name: 'Auto Insurance Company', size: 'enterprise' as const, employees: '1,000-10,000', price: 12999, subdomain: 'autoinsurance', agents: 15, description: 'Vehicle & driver insurance', icon: '🛡️', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'AU27', name: 'Tire Manufacturing Company', size: 'enterprise' as const, employees: '2,000-20,000', price: 14999, subdomain: 'tires', agents: 14, description: 'Tire production & distribution', icon: '⭕', color: 'from-stone-500/20 to-stone-600/10', border: 'border-stone-500/30' },
  { id: 'AU28', name: 'Autonomous Vehicle Startup', size: 'small' as const, employees: '50-200', price: 1299, subdomain: 'autonomous', agents: 8, description: 'Self-driving technology R&D', icon: '🤖', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'AU29', name: 'Motorcycle Manufacturer', size: 'enterprise' as const, employees: '1,000-10,000', price: 9999, subdomain: 'motorcycle', agents: 12, description: 'Motorcycle & scooter production', icon: '🏍️', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  { id: 'AU30', name: 'Auto Parts E-commerce', size: 'small' as const, employees: '20-80', price: 599, subdomain: 'autopartsstore', agents: 5, description: 'Online auto parts marketplace', icon: '🛒', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // SPORTS & RECREATION (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'SR21', name: 'Professional Sports Team', size: 'enterprise' as const, employees: '100-1,000', price: 9999, subdomain: 'sportsteam', agents: 14, description: 'League sports franchise', icon: '⚽', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'SR22', name: 'Fitness Gym Chain', size: 'enterprise' as const, employees: '500-5,000', price: 5999, subdomain: 'gymchain', agents: 10, description: 'Fitness centers & personal training', icon: '💪', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'SR23', name: 'Golf Course & Resort', size: 'enterprise' as const, employees: '200-2,000', price: 7999, subdomain: 'golfresort', agents: 10, description: 'Golf courses & club management', icon: '⛳', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  { id: 'SR24', name: 'Ski Resort', size: 'enterprise' as const, employees: '300-3,000', price: 8999, subdomain: 'skiresort', agents: 12, description: 'Winter sports & mountain resort', icon: '⛷️', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'SR25', name: 'Sports Equipment Manufacturer', size: 'enterprise' as const, employees: '1,000-10,000', price: 9999, subdomain: 'sportequip', agents: 12, description: 'Athletic gear & equipment', icon: '🏈', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'SR26', name: 'Water Park', size: 'small' as const, employees: '100-500', price: 1299, subdomain: 'waterpark', agents: 6, description: 'Aquatic entertainment venue', icon: '🏊', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'SR27', name: 'Sports Betting Platform', size: 'enterprise' as const, employees: '200-2,000', price: 14999, subdomain: 'sportsbet', agents: 15, description: 'Online sports wagering', icon: '🎰', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'SR28', name: 'Yoga & Wellness Studio', size: 'small' as const, employees: '10-40', price: 349, subdomain: 'yogastudio', agents: 3, description: 'Yoga, meditation & wellness', icon: '🧘', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'SR29', name: 'Theme Park', size: 'hyper-scale' as const, employees: '5,000-50,000', price: 39999, subdomain: 'themepark', agents: 25, description: 'Amusement & entertainment park', icon: '🎢', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  { id: 'SR30', name: 'Cycling Sports Company', size: 'small' as const, employees: '20-80', price: 499, subdomain: 'cycling', agents: 4, description: 'Bicycle retail & cycling events', icon: '🚴', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // FASHION & BEAUTY (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'FB31', name: 'Fashion Design House', size: 'small' as const, employees: '20-80', price: 799, subdomain: 'fashiondesign', agents: 5, description: 'High fashion & ready-to-wear', icon: '👗', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  { id: 'FB32', name: 'Cosmetics Brand', size: 'enterprise' as const, employees: '500-5,000', price: 6999, subdomain: 'cosmetics', agents: 10, description: 'Makeup & skincare products', icon: '💄', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'FB33', name: 'Hair Salon Chain', size: 'enterprise' as const, employees: '200-2,000', price: 3999, subdomain: 'hairsalon', agents: 8, description: 'Hair styling & beauty services', icon: '💇', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'FB34', name: 'Jewelry Store Chain', size: 'enterprise' as const, employees: '300-3,000', price: 7999, subdomain: 'jewelry', agents: 10, description: 'Fine jewelry & watches', icon: '💍', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'FB35', name: 'Perfume & Fragrance Brand', size: 'small' as const, employees: '20-80', price: 699, subdomain: 'perfume', agents: 5, description: 'Designer fragrances', icon: '🌹', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'FB36', name: 'Footwear Brand', size: 'enterprise' as const, employees: '1,000-10,000', price: 9999, subdomain: 'footwear', agents: 12, description: 'Shoes & sneaker brand', icon: '👟', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'FB37', name: 'Nail Salon Chain', size: 'small' as const, employees: '50-200', price: 399, subdomain: 'nailsalon', agents: 4, description: 'Manicure, pedicure & nail art', icon: '💅', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'FB38', name: 'Sunglasses Brand', size: 'small' as const, employees: '15-60', price: 599, subdomain: 'sunglasses', agents: 4, description: 'Eyewear & sunglasses retail', icon: '🕶️', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'FB39', name: 'Textile & Fabric Company', size: 'enterprise' as const, employees: '500-5,000', price: 5999, subdomain: 'textile', agents: 10, description: 'Fabric wholesale & distribution', icon: '🧵', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'FB40', name: 'Sustainable Fashion Brand', size: 'small' as const, employees: '10-50', price: 599, subdomain: 'sustainablefashion', agents: 5, description: 'Eco-friendly & ethical clothing', icon: '🌿', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // TELECOMMUNICATIONS (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'TC41', name: 'Mobile Network Operator', size: 'hyper-scale' as const, employees: '10,000-100,000', price: 79999, subdomain: 'mno', agents: 30, description: 'Cellular network & SIM services', icon: '📡', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'TC42', name: 'Internet Service Provider', size: 'enterprise' as const, employees: '1,000-10,000', price: 19999, subdomain: 'isp', agents: 18, description: 'Broadband & fiber internet', icon: '🌐', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'TC43', name: 'VoIP Provider', size: 'small' as const, employees: '20-100', price: 599, subdomain: 'voip', agents: 5, description: 'Internet-based phone services', icon: '📞', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'TC44', name: 'Cable TV Provider', size: 'enterprise' as const, employees: '1,000-10,000', price: 14999, subdomain: 'cabletv', agents: 14, description: 'Cable & satellite television', icon: '📺', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'TC45', name: '5G Infrastructure Company', size: 'enterprise' as const, employees: '500-5,000', price: 29999, subdomain: 'fiveg', agents: 20, description: '5G tower & infrastructure', icon: '📶', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'TC46', name: 'Satellite Communications', size: 'hyper-scale' as const, employees: '5,000-50,000', price: 59999, subdomain: 'satellite', agents: 28, description: 'Satellite internet & broadcasting', icon: '🛰️', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'TC47', name: 'Fiber Optic Network Company', size: 'enterprise' as const, employees: '500-5,000', price: 19999, subdomain: 'fiber', agents: 15, description: 'Fiber optic cable installation', icon: '💡', color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30' },
  { id: 'TC48', name: 'Telecom Tower Company', size: 'enterprise' as const, employees: '1,000-10,000', price: 24999, subdomain: 'towers', agents: 16, description: 'Cell tower construction & leasing', icon: '🏗️', color: 'from-stone-500/20 to-stone-600/10', border: 'border-stone-500/30' },
  { id: 'TC49', name: 'Submarine Cable Operator', size: 'hyper-scale' as const, employees: '2,000-20,000', price: 89999, subdomain: 'subcable', agents: 30, description: 'Undersea fiber cable networks', icon: '🌊', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'TC50', name: 'Unified Communications Platform', size: 'enterprise' as const, employees: '100-1,000', price: 4999, subdomain: 'unifiedcomm', agents: 10, description: 'Team messaging & video conferencing', icon: '💬', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // INSURANCE (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'INS51', name: 'Life Insurance Company', size: 'hyper-scale' as const, employees: '10,000-100,000', price: 49999, subdomain: 'lifeinsurance', agents: 25, description: 'Term & whole life policies', icon: '🛡️', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'INS52', name: 'Property Insurance Provider', size: 'enterprise' as const, employees: '1,000-10,000', price: 14999, subdomain: 'propertyins', agents: 14, description: 'Home & commercial property', icon: '🏠', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'INS53', name: 'Reinsurance Company', size: 'hyper-scale' as const, employees: '2,000-20,000', price: 69999, subdomain: 'reinsurance', agents: 28, description: 'Insurance for insurance companies', icon: '🔄', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'INS54', name: 'Health Maintenance Org', size: 'enterprise' as const, employees: '2,000-20,000', price: 19999, subdomain: 'hmo', agents: 16, description: 'Managed health insurance plans', icon: '🏥', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'INS55', name: 'Pet Insurance Provider', size: 'small' as const, employees: '50-200', price: 599, subdomain: 'petinsurance', agents: 5, description: 'Pet health & accident coverage', icon: '🐕', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'INS56', name: 'Travel Insurance Company', size: 'small' as const, employees: '30-150', price: 499, subdomain: 'travelins', agents: 4, description: 'Trip cancellation & medical', icon: '✈️', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'INS57', name: 'Cyber Insurance Provider', size: 'enterprise' as const, employees: '100-500', price: 3999, subdomain: 'cyberins', agents: 8, description: 'Data breach & cyber liability', icon: '🔒', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'INS58', name: 'Marine Insurance Company', size: 'enterprise' as const, employees: '200-2,000', price: 5999, subdomain: 'marineins', agents: 10, description: 'Cargo & vessel insurance', icon: '🚢', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'INS59', name: 'Workers Compensation Fund', size: 'enterprise' as const, employees: '500-5,000', price: 7999, subdomain: 'workerscomp', agents: 12, description: 'Workplace injury coverage', icon: '⚙️', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'INS60', name: 'Crop Insurance Provider', size: 'enterprise' as const, employees: '200-2,000', price: 4999, subdomain: 'cropins', agents: 8, description: 'Agricultural crop protection', icon: '🌾', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // ENVIRONMENTAL SERVICES (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'ENV61', name: 'Environmental Consultancy', size: 'small' as const, employees: '20-80', price: 699, subdomain: 'envconsult', agents: 5, description: 'EIA & environmental audits', icon: '🌿', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  { id: 'ENV62', name: 'Carbon Credit Trading Platform', size: 'enterprise' as const, employees: '100-500', price: 4999, subdomain: 'carboncredit', agents: 8, description: 'Carbon offset marketplace', icon: '🌱', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'ENV63', name: 'Water Purification Company', size: 'enterprise' as const, employees: '200-2,000', price: 5999, subdomain: 'waterpurify', agents: 10, description: 'Clean water technology', icon: '💧', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'ENV64', name: 'Recycling Technology Startup', size: 'small' as const, employees: '10-50', price: 599, subdomain: 'recycletech', agents: 5, description: 'Advanced recycling solutions', icon: '♻️', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'ENV65', name: 'Air Quality Monitoring Company', size: 'small' as const, employees: '20-80', price: 499, subdomain: 'airquality', agents: 4, description: 'Pollution monitoring & analysis', icon: '🌬️', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'ENV66', name: 'Soil Remediation Company', size: 'enterprise' as const, employees: '100-1,000', price: 3999, subdomain: 'soilremed', agents: 8, description: 'Contaminated land cleanup', icon: '🌍', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'ENV67', name: 'Eco-Tourism Company', size: 'small' as const, employees: '20-80', price: 449, subdomain: 'ecotourism', agents: 4, description: 'Sustainable travel experiences', icon: '🏕️', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  { id: 'ENV68', name: 'Environmental Monitoring Firm', size: 'enterprise' as const, employees: '100-500', price: 2999, subdomain: 'envmonitor', agents: 7, description: 'Environmental data collection', icon: '📡', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'ENV69', name: 'Green Building Consultancy', size: 'small' as const, employees: '10-40', price: 599, subdomain: 'greenbuilding', agents: 5, description: 'LEED & sustainable construction', icon: '🏢', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'ENV70', name: 'Hazardous Waste Disposal', size: 'enterprise' as const, employees: '200-2,000', price: 5999, subdomain: 'hazwaste', agents: 10, description: 'Industrial waste management', icon: '⚠️', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // PROFESSIONAL SERVICES (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'PS71', name: 'Management Consulting Firm', size: 'enterprise' as const, employees: '500-5,000', price: 12999, subdomain: 'mgmtconsult', agents: 14, description: 'Strategy & operations consulting', icon: '💼', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'PS72', name: 'HR Consulting Firm', size: 'enterprise' as const, employees: '200-2,000', price: 5999, subdomain: 'hrconsult', agents: 10, description: 'Talent acquisition & development', icon: '👥', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'PS73', name: 'Executive Search Firm', size: 'small' as const, employees: '20-80', price: 899, subdomain: 'execsearch', agents: 5, description: 'C-suite & senior recruitment', icon: '🎯', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'PS74', name: 'Business Process Outsourcing', size: 'enterprise' as const, employees: '2,000-20,000', price: 9999, subdomain: 'bpo', agents: 12, description: 'Back-office & customer support', icon: '📞', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'PS75', name: 'PR & Communications Agency', size: 'small' as const, employees: '20-80', price: 599, subdomain: 'pragency', agents: 5, description: 'Public relations & media management', icon: '📰', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'PS76', name: 'Graphic Design Studio', size: 'small' as const, employees: '10-40', price: 399, subdomain: 'graphicdesign', agents: 4, description: 'Visual design & branding', icon: '🎨', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'PS77', name: 'Research & Advisory Firm', size: 'enterprise' as const, employees: '200-2,000', price: 8999, subdomain: 'researchadvisory', agents: 12, description: 'Market research & strategic advice', icon: '🔬', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'PS78', name: 'Translation & Localization Agency', size: 'small' as const, employees: '20-80', price: 499, subdomain: 'translation', agents: 4, description: 'Multilingual content services', icon: '🌍', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  { id: 'PS79', name: 'Market Research Firm', size: 'enterprise' as const, employees: '100-1,000', price: 3999, subdomain: 'marketresearch', agents: 8, description: 'Consumer insights & analytics', icon: '📊', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'PS80', name: 'Coaching & Mentoring Firm', size: 'small' as const, employees: '10-40', price: 449, subdomain: 'coaching', agents: 4, description: 'Executive & career coaching', icon: '🤝', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // TRANSPORTATION (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'TR81', name: 'Passenger Airline', size: 'hyper-scale' as const, employees: '50,000-500,000', price: 89999, subdomain: 'airline', agents: 35, description: 'Commercial aviation services', icon: '✈️', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'TR82', name: 'Bus Transportation Company', size: 'enterprise' as const, employees: '500-5,000', price: 5999, subdomain: 'bustransit', agents: 10, description: 'Public & intercity bus services', icon: '🚌', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'TR83', name: 'Shipping Line', size: 'hyper-scale' as const, employees: '10,000-100,000', price: 69999, subdomain: 'shippingline', agents: 28, description: 'Container shipping & maritime', icon: '🚢', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'TR84', name: 'Moving & Relocation Company', size: 'small' as const, employees: '30-150', price: 499, subdomain: 'movers', agents: 4, description: 'Household & office relocation', icon: '📦', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'TR85', name: 'Charter Flight Company', size: 'small' as const, employees: '20-80', price: 899, subdomain: 'charterflight', agents: 5, description: 'Private jet & helicopter charter', icon: '🛩️', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'TR86', name: 'Parking Management Company', size: 'enterprise' as const, employees: '200-2,000', price: 3999, subdomain: 'parking', agents: 8, description: 'Parking lot & garage operations', icon: '🅿️', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'TR87', name: 'Towing Service Company', size: 'small' as const, employees: '20-80', price: 399, subdomain: 'towing', agents: 4, description: 'Vehicle towing & roadside assist', icon: '🚛', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  { id: 'TR88', name: 'Logistics Technology Startup', size: 'small' as const, employees: '10-50', price: 699, subdomain: 'logtech', agents: 5, description: 'Supply chain SaaS platform', icon: '💻', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'TR89', name: 'Public Transit Authority', size: 'hyper-scale' as const, employees: '10,000-100,000', price: 49999, subdomain: 'transit', agents: 25, description: 'Urban mass transit system', icon: '🚇', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'TR90', name: 'Freight Brokerage Company', size: 'enterprise' as const, employees: '200-2,000', price: 4999, subdomain: 'freightbroker', agents: 10, description: 'Load matching & carrier management', icon: '📋', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // FOOD & BEVERAGE (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'FNB91', name: 'Brewery & Distillery', size: 'enterprise' as const, employees: '500-5,000', price: 7999, subdomain: 'brewery', agents: 10, description: 'Beer, wine & spirits production', icon: '🍺', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'FNB92', name: 'Bakery Chain', size: 'enterprise' as const, employees: '200-2,000', price: 3999, subdomain: 'bakerychain', agents: 8, description: 'Bread & pastry production', icon: '🍞', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'FNB93', name: 'Ice Cream & Dessert Chain', size: 'small' as const, employees: '50-200', price: 599, subdomain: 'icecream', agents: 4, description: 'Frozen treats & desserts', icon: '🍦', color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/30' },
  { id: 'FNB94', name: 'Juice Bar Chain', size: 'small' as const, employees: '30-150', price: 399, subdomain: 'juicebar', agents: 4, description: 'Fresh juice & smoothies', icon: '🥤', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'FNB95', name: 'Gourmet Food Producer', size: 'small' as const, employees: '20-80', price: 699, subdomain: 'gourmet', agents: 5, description: 'Artisan food products', icon: '🧀', color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30' },
  { id: 'FNB96', name: 'Wine Estate & Vineyard', size: 'enterprise' as const, employees: '100-1,000', price: 5999, subdomain: 'winery', agents: 10, description: 'Wine production & tasting', icon: '🍷', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'FNB97', name: 'Snack Food Manufacturer', size: 'enterprise' as const, employees: '500-5,000', price: 6999, subdomain: 'snacks', agents: 10, description: 'Chips, cookies & packaged snacks', icon: '🍿', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'FNB98', name: 'Coffee Roastery Chain', size: 'small' as const, employees: '30-150', price: 599, subdomain: 'coffeeroastery', agents: 5, description: 'Specialty coffee roasting', icon: '☕', color: 'from-stone-500/20 to-stone-600/10', border: 'border-stone-500/30' },
  { id: 'FNB99', name: 'Dairy Processing Plant', size: 'enterprise' as const, employees: '200-2,000', price: 5999, subdomain: 'dairy', agents: 10, description: 'Milk, cheese & yogurt production', icon: '🥛', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'FNB100', name: 'Craft Soda Company', size: 'small' as const, employees: '10-50', price: 449, subdomain: 'craftsoda', agents: 4, description: 'Artisan soft drinks', icon: '🥤', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // DEFENSE & SECURITY (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'DEF101', name: 'Private Security Firm', size: 'enterprise' as const, employees: '500-5,000', price: 7999, subdomain: 'security', agents: 12, description: 'Physical & digital security services', icon: '🛡️', color: 'from-slate-500/20 to-slate-600/10', border: 'border-slate-500/30' },
  { id: 'DEF102', name: 'Defense Contractor', size: 'hyper-scale' as const, employees: '10,000-100,000', price: 99999, subdomain: 'defensecontractor', agents: 30, description: 'Military equipment & systems', icon: '🎖️', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  { id: 'DEF103', name: 'Cybersecurity Operations Center', size: 'enterprise' as const, employees: '200-2,000', price: 9999, subdomain: 'soc', agents: 14, description: '24/7 threat monitoring & response', icon: '🔍', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  { id: 'DEF104', name: 'Surveillance Technology Company', size: 'enterprise' as const, employees: '100-1,000', price: 5999, subdomain: 'surveillance', agents: 10, description: 'CCTV & monitoring systems', icon: '📹', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'DEF105', name: 'Arms & Ammunition Manufacturer', size: 'hyper-scale' as const, employees: '5,000-50,000', price: 69999, subdomain: 'armsmfg', agents: 25, description: 'Military-grade weapons & ammo', icon: '🔫', color: 'from-stone-500/20 to-stone-600/10', border: 'border-stone-500/30' },
  { id: 'DEF106', name: 'Border Control Technology', size: 'enterprise' as const, employees: '200-2,000', price: 8999, subdomain: 'bordercontrol', agents: 12, description: 'Border security & surveillance', icon: '🛂', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'DEF107', name: 'Risk Assessment Company', size: 'small' as const, employees: '20-80', price: 699, subdomain: 'riskassess', agents: 5, description: 'Threat analysis & risk evaluation', icon: '⚠️', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'DEF108', name: 'Armored Transport Company', size: 'enterprise' as const, employees: '300-3,000', price: 5999, subdomain: 'armoredtransport', agents: 10, description: 'Cash-in-transit & valuables', icon: '🏦', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'DEF109', name: 'Emergency Response Technology', size: 'enterprise' as const, employees: '100-500', price: 4999, subdomain: 'emergencytech', agents: 8, description: '911 & dispatch systems', icon: '🚨', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'DEF110', name: 'Intelligence Analysis Firm', size: 'enterprise' as const, employees: '100-1,000', price: 7999, subdomain: 'intelligence', agents: 12, description: 'Open-source intelligence & analysis', icon: '🕵️', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // AEROSPACE & AVIATION (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'AE111', name: 'Aircraft Manufacturing', size: 'hyper-scale' as const, employees: '50,000-500,000', price: 129999, subdomain: 'aircraftmfg', agents: 40, description: 'Commercial & military aircraft', icon: '✈️', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'AE112', name: 'Space Exploration Company', size: 'hyper-scale' as const, employees: '10,000-100,000', price: 149999, subdomain: 'space', agents: 45, description: 'Rocket launches & satellite deployment', icon: '🚀', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'AE113', name: 'Aircraft Maintenance Company', size: 'enterprise' as const, employees: '500-5,000', price: 8999, subdomain: 'aircraftmro', agents: 12, description: 'Aircraft repair & overhaul', icon: '🔧', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'AE114', name: 'Airport Operations Company', size: 'hyper-scale' as const, employees: '5,000-50,000', price: 39999, subdomain: 'airportops', agents: 22, description: 'Airport management & services', icon: '🛫', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'AE115', name: 'Drone Manufacturing Company', size: 'small' as const, employees: '50-200', price: 899, subdomain: 'dronemfg', agents: 6, description: 'Commercial & consumer drones', icon: '🛸', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'AE116', name: 'Aviation Training Academy', size: 'small' as const, employees: '30-150', price: 699, subdomain: 'aviationacademy', agents: 5, description: 'Pilot & crew training', icon: '🎓', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'AE117', name: 'Air Cargo Company', size: 'enterprise' as const, employees: '1,000-10,000', price: 14999, subdomain: 'aircargo', agents: 14, description: 'Air freight & logistics', icon: '📦', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'AE118', name: 'Avionics Manufacturer', size: 'enterprise' as const, employees: '500-5,000', price: 12999, subdomain: 'avionics', agents: 14, description: 'Aircraft electronics & instruments', icon: '📡', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'AE119', name: 'Helicopter Services Company', size: 'small' as const, employees: '30-150', price: 799, subdomain: 'heliservices', agents: 5, description: 'Helicopter charter & air ambulance', icon: '🚁', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
  { id: 'AE120', name: 'Satellite Manufacturing Company', size: 'hyper-scale' as const, employees: '5,000-50,000', price: 79999, subdomain: 'satmfg', agents: 30, description: 'Satellite design & construction', icon: '🛰️', color: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30' },
  // ═══════════════════════════════════════════════════════════════
  // MARINE & SHIPPING (10 New Types)
  // ═══════════════════════════════════════════════════════════════
  { id: 'MS121', name: 'Container Shipping Line', size: 'hyper-scale' as const, employees: '20,000-200,000', price: 99999, subdomain: 'containership', agents: 35, description: 'Global container shipping', icon: '🚢', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'MS122', name: 'Port Authority', size: 'hyper-scale' as const, employees: '5,000-50,000', price: 59999, subdomain: 'portauthority', agents: 25, description: 'Port operations & management', icon: '⚓', color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30' },
  { id: 'MS123', name: 'Fishing Fleet Company', size: 'enterprise' as const, employees: '200-2,000', price: 4999, subdomain: 'fishing', agents: 10, description: 'Commercial fishing operations', icon: '🐟', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
  { id: 'MS124', name: 'Ship Building Company', size: 'hyper-scale' as const, employees: '5,000-50,000', price: 89999, subdomain: 'shipbuilding', agents: 30, description: 'Vessel construction & repair', icon: '🏗️', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
  { id: 'MS125', name: 'Marine Salvage Company', size: 'enterprise' as const, employees: '100-1,000', price: 5999, subdomain: 'salvage', agents: 8, description: 'Wreck removal & rescue', icon: '⚓', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  { id: 'MS126', name: 'Offshore Oil Platform', size: 'hyper-scale' as const, employees: '5,000-50,000', price: 119999, subdomain: 'offshore', agents: 35, description: 'Deep-sea drilling & extraction', icon: '🛢️', color: 'from-stone-500/20 to-stone-600/10', border: 'border-stone-500/30' },
  { id: 'MS127', name: 'Yacht & Boat Dealer', size: 'small' as const, employees: '20-80', price: 799, subdomain: 'yachtdealer', agents: 5, description: 'Luxury yacht & boat sales', icon: '🛥️', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/30' },
  { id: 'MS128', name: 'Maritime Law Firm', size: 'small' as const, employees: '15-60', price: 699, subdomain: 'maritimelaw', agents: 5, description: 'Admiralty & shipping law', icon: '⚖️', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/30' },
  { id: 'MS129', name: 'Cruise Line Company', size: 'hyper-scale' as const, employees: '20,000-200,000', price: 109999, subdomain: 'cruiseline', agents: 38, description: 'Luxury cruise operations', icon: '🛳️', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30' },
  { id: 'MS130', name: 'Marine Insurance Provider', size: 'enterprise' as const, employees: '500-5,000', price: 8999, subdomain: 'marineinsurance', agents: 12, description: 'Hull, cargo & liability coverage', icon: '🛡️', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/30' },
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
