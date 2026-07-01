#!/usr/bin/env node

/**
 * Enterprise Portal Automation Script
 * 
 * Usage:
 *   node enterprise_setup.mjs create --name "Company Name" --email "admin@company.com" --type M1 --subdomain "mycompany"
 *   node enterprise_setup.mjs list
 *   node enterprise_setup.mjs types
 * 
 * This script automates:
 * 1. Organization creation
 * 2. Company creation with proper subdomain
 * 3. Admin user setup
 * 4. Returns login credentials
 */

import { ConvexClient } from 'convex/browser';
import { api } from './convex/_generated/api.js';
import { parseArgs } from 'node:util';

const CONVEX_URL = 'https://warmhearted-aardvark-280.convex.cloud';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'qn7fjqg8eq47zt57ba55vmbqsh893tzs';

const { values, positionals } = parseArgs({
  options: {
    name: { type: 'string' },
    email: { type: 'string' },
    type: { type: 'string' },
    subdomain: { type: 'string' },
    industry: { type: 'string', default: 'Technology' },
    size: { type: 'string', default: '50-200' },
    phone: { type: 'string', default: '' },
    website: { type: 'string', default: '' },
    plan: { type: 'string', default: 'trial' },
    password: { type: 'string' },
  },
  strict: false,
  allowPositionals: true,
});

const action = positionals[0] || 'create';

async function main() {
  const client = new ConvexClient(CONVEX_URL);

  try {
    switch (action) {
      case 'create':
        await createCompany(client);
        break;
      case 'list':
        await listCompanies(client);
        break;
      case 'types':
        await listCompanyTypes(client);
        break;
      default:
        console.log('Usage: node enterprise_setup.mjs <create|list|types> [options]');
        console.log('');
        console.log('Create a new enterprise company:');
        console.log('  node enterprise_setup.mjs create --name "Acme Corp" --email "admin@acme.com" --type M1 --subdomain "acme"');
        console.log('');
        console.log('List all companies:');
        console.log('  node enterprise_setup.mjs list');
        console.log('');
        console.log('List available company types:');
        console.log('  node enterprise_setup.mjs types');
    }
  } finally {
    client.close();
  }
}

async function createCompany(client) {
  const { name, email, type, subdomain, industry, size, phone, website, plan, password } = values;

  if (!name || !email || !type || !subdomain) {
    console.error('Error: --name, --email, --type, and --subdomain are required');
    console.error('');
    console.error('Usage: node enterprise_setup.mjs create --name "Acme Corp" --email "admin@acme.com" --type M1 --subdomain "acme"');
    process.exit(1);
  }

  console.log(`\nCreating enterprise company...`);
  console.log(`  Name: ${name}`);
  console.log(`  Email: ${email}`);
  console.log(`  Type: ${type}`);
  console.log(`  Subdomain: ${subdomain}`);
  console.log('');

  // Step 1: Create organization
  const orgResult = await client.mutation(api.admin_enterprise.createOrganization, {
    name,
    email,
    industry: industry || 'Technology',
    size: size || '50-200',
    phone: phone || '',
    website: website || '',
    subdomain,
    plan: plan || 'trial',
    adminName: name + ' Admin',
    adminEmail: email,
    adminPassword: password || undefined,
    adminToken: ADMIN_TOKEN,
  });

  if (orgResult.error) {
    console.error('Error creating organization:', orgResult.error);
    process.exit(1);
  }

  console.log('✅ Organization created:', orgResult.orgId);

  // Step 2: Create company
  const companyResult = await client.mutation(api.enterprise_companies.createCompany, {
    orgId: orgResult.orgId,
    companyType: type,
    companyName: name,
    contactEmail: email,
    contactPhone: phone || undefined,
    adminToken: ADMIN_TOKEN,
  });

  if (companyResult.error) {
    console.error('Error creating company:', companyResult.error);
    process.exit(1);
  }

  console.log('✅ Company created:', companyResult.companyId);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ENTERPRISE PORTAL CREATED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Login URL:', `https://${subdomain}.enterprise.dutchkem.com/login`);
  console.log('  Email:', email);
  console.log('  Password:', orgResult.tempPassword);
  console.log('');
  console.log('  Company Type:', type);
  console.log('  Monthly Price: $' + getCompanyTypePrice(type));
  console.log('');
  console.log('  ⚠️  SAVE THESE CREDENTIALS SECURELY');
  console.log('═══════════════════════════════════════════════════════════════');
}

async function listCompanies(client) {
  const companies = await client.query(api.enterprise_companies.listAllCompanies, {
    adminToken: ADMIN_TOKEN,
  });

  console.log('\nEnterprise Companies:');
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (companies.length === 0) {
    console.log('  No companies found.');
  } else {
    for (const company of companies) {
      console.log(`  ${company.companyName}`);
      console.log(`    Type: ${company.companyType} | Status: ${company.status}`);
      console.log(`    Subdomain: ${company.subdomain}.enterprise.dutchkem.com`);
      console.log(`    Price: $${company.monthlyPrice}/mo`);
      console.log('');
    }
  }
  console.log('═══════════════════════════════════════════════════════════════');
}

async function listCompanyTypes(client) {
  const types = await client.query(api.enterprise_companies.listCompanyTypes, {});

  console.log('\nAvailable Company Types:');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  SMALL (S1-S5)');
  console.log('  ───────────────────────────────────────────────────────────');
  for (const t of types.filter(t => t.size === 'small')) {
    console.log(`  ${t.id}: ${t.name} (${t.employees} employees) - $${t.price}/mo`);
    console.log(`       ${t.description} | ${t.agents} agents`);
  }
  console.log('');
  console.log('  ENTERPRISE (M1-M5)');
  console.log('  ───────────────────────────────────────────────────────────');
  for (const t of types.filter(t => t.size === 'enterprise')) {
    console.log(`  ${t.id}: ${t.name} (${t.employees} employees) - $${t.price}/mo`);
    console.log(`       ${t.description} | ${t.agents} agents`);
  }
  console.log('');
  console.log('  HYPER-SCALE (H1-H10)');
  console.log('  ───────────────────────────────────────────────────────────');
  for (const t of types.filter(t => t.size === 'hyper-scale')) {
    console.log(`  ${t.id}: ${t.name} (${t.employees} employees) - $${t.price}/mo`);
    console.log(`       ${t.description} | ${t.agents} agents`);
  }
  console.log('═══════════════════════════════════════════════════════════════');
}

function getCompanyTypePrice(type) {
  const prices = {
    S1: 199, S2: 299, S3: 349, S4: 299, S5: 399,
    M1: 2999, M2: 4999, M3: 9999, M4: 7499, M5: 14999,
    H1: 49999, H2: 59999, H3: 69999, H4: 79999, H5: 89999,
    H6: 99999, H7: 119999, H8: 129999, H9: 149999, H10: 199999,
  };
  return prices[type] || 0;
}

main();
