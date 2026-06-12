#!/usr/bin/env node

/**
 * source-aws-env.js
 * Searches for AWS credentials across standard locations and exports them to .env.local
 * 
 * Search order:
 *   1. ~/.aws/credentials
 *   2. ~/.aws/config
 *   3. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 *   4. .env.local in project root
 *   5. .env, .env.production, .env.development
 * 
 * Usage: node scripts/source-aws-env.js
 * Output: Updates .env.local with AWS_* variables
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_LOCAL_PATH = path.join(PROJECT_ROOT, '.env.local');

// Search locations in order
const SEARCH_LOCATIONS = [
  { type: 'aws-credentials', path: path.join(os.homedir(), '.aws', 'credentials') },
  { type: 'aws-config', path: path.join(os.homedir(), '.aws', 'config') },
  { type: 'environment', path: null },
  { type: 'env-local', path: ENV_LOCAL_PATH },
  { type: 'env', path: path.join(PROJECT_ROOT, '.env') },
  { type: 'env-production', path: path.join(PROJECT_ROOT, '.env.production') },
  { type: 'env-development', path: path.join(PROJECT_ROOT, '.env.development') },
];

function parseAWSCredentials(content, profile = 'default') {
  const result = {};
  
  if (content.includes('[')) {
    // INI format (~/.aws/credentials)
    const sections = content.split(/\[/);
    for (const section of sections) {
      if (!section.trim()) continue;
      const lines = section.split('\n');
      const sectionName = lines[0].replace(']', '').trim();
      
      if (sectionName === profile || sectionName === 'default') {
        for (const line of lines.slice(1)) {
          const match = line.match(/^\s*(aws_access_key_id|aws_secret_access_key|region)\s*=\s*(.+)$/i);
          if (match) {
            const key = match[1].toLowerCase();
            const value = match[2].trim();
            if (key === 'aws_access_key_id') result.accessKeyId = value;
            if (key === 'aws_secret_access_key') result.secretAccessKey = value;
            if (key === 'region') result.region = value;
          }
        }
      }
    }
  } else {
    // Key=value format
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const match = trimmed.match(/^(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_REGION)\s*=\s*(.+)$/i);
      if (match) {
        const key = match[1].toUpperCase();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (key === 'AWS_ACCESS_KEY_ID') result.accessKeyId = value;
        if (key === 'AWS_SECRET_ACCESS_KEY') result.secretAccessKey = value;
        if (key === 'AWS_REGION') result.region = value;
      }
    }
  }
  
  return result;
}

function parseAWSConfig(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[')) continue;
    
    const match = trimmed.match(/^(region|output)\s*=\s*(.+)$/i);
    if (match) {
      if (match[1].toLowerCase() === 'region') result.region = match[2].trim();
    }
  }
  return result;
}

function validateCredentials(creds) {
  const errors = [];
  
  if (!creds.accessKeyId) {
    errors.push('Missing AWS_ACCESS_KEY_ID');
  } else if (!/^AKIA|^ASIA/.test(creds.accessKeyId)) {
    errors.push('AWS_ACCESS_KEY_ID must start with "AKIA" or "ASIA"');
  } else if (creds.accessKeyId.length < 16) {
    errors.push('AWS_ACCESS_KEY_ID must be at least 16 characters');
  }
  
  if (!creds.secretAccessKey) {
    errors.push('Missing AWS_SECRET_ACCESS_KEY');
  } else if (creds.secretAccessKey.length < 30) {
    errors.push('AWS_SECRET_ACCESS_KEY must be at least 30 characters');
  }
  
  return errors;
}

function searchForCredentials() {
  console.log('🔍 Searching for AWS credentials...\n');
  
  for (const location of SEARCH_LOCATIONS) {
    console.log(`  Checking: ${location.type}${location.path ? ` (${location.path})` : ''}`);
    
    // Check environment variables
    if (location.type === 'environment') {
      const accessKey = process.env.AWS_ACCESS_KEY_ID;
      const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
      const region = process.env.AWS_REGION;
      
      if (accessKey && secretKey) {
        console.log(`  ✅ Found AWS credentials in environment variables\n`);
        return {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          region: region || 'us-east-1',
          source: 'environment',
        };
      }
      continue;
    }
    
    // Check file locations
    if (!fs.existsSync(location.path)) {
      console.log(`  ❌ Not found\n`);
      continue;
    }
    
    const content = fs.readFileSync(location.path, 'utf-8');
    let creds = {};
    
    if (location.type === 'aws-credentials') {
      creds = parseAWSCredentials(content);
    } else if (location.type === 'aws-config') {
      const config = parseAWSConfig(content);
      if (config.region) creds.region = config.region;
    } else {
      creds = parseAWSCredentials(content);
    }
    
    const errors = validateCredentials(creds);
    if (errors.length > 0) {
      console.log(`  ⚠️  Found file but credentials invalid: ${errors.join(', ')}\n`);
      continue;
    }
    
    if (creds.accessKeyId && creds.secretAccessKey) {
      console.log(`  ✅ Found valid AWS credentials in ${location.type}\n`);
      return {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        region: creds.region || 'us-east-1',
        source: location.type,
      };
    }
  }
  
  return null;
}

function updateEnvLocal(creds) {
  let content = '';
  
  // Read existing .env.local if it exists
  if (fs.existsSync(ENV_LOCAL_PATH)) {
    content = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');
  }
  
  const lines = content.split('\n').filter(line => !line.startsWith('AWS_'));
  
  lines.push(`# AWS Credentials (auto-sourced by scripts/source-aws-env.js)`);
  lines.push(`AWS_ACCESS_KEY_ID=${creds.accessKeyId}`);
  lines.push(`AWS_SECRET_ACCESS_KEY=${creds.secretAccessKey}`);
  lines.push(`AWS_REGION=${creds.region}`);
  lines.push(`AWS_SES_FROM_EMAIL=noreply@dutchkem.com`);
  lines.push('');
  
  fs.writeFileSync(ENV_LOCAL_PATH, lines.join('\n'), 'utf-8');
  console.log(`✅ Updated ${ENV_LOCAL_PATH}`);
}

// Main
const creds = searchForCredentials();

if (creds) {
  console.log('📋 Credentials found:');
  console.log(`   Source: ${creds.source}`);
  console.log(`   Access Key: ${creds.accessKeyId.substring(0, 4)}...${creds.accessKeyId.slice(-4)}`);
  console.log(`   Region: ${creds.region}`);
  console.log('');
  
  updateEnvLocal(creds);
  
  console.log('\n🚀 To inject into Convex, run:');
  console.log(`   npx convex env set AWS_ACCESS_KEY_ID "${creds.accessKeyId}"`);
  console.log(`   npx convex env set AWS_SECRET_ACCESS_KEY "${creds.secretAccessKey}"`);
  console.log(`   npx convex env set AWS_REGION "${creds.region}"`);
  console.log(`   npx convex env set AWS_SES_FROM_EMAIL "noreply@dutchkem.com"`);
} else {
  console.log('❌ No valid AWS credentials found anywhere.\n');
  console.log('Please add your credentials to one of these locations:\n');
  console.log('  Option 1: Create ~/.aws/credentials:');
  console.log('    [default]');
  console.log('    aws_access_key_id = AKIA...');
  console.log('    aws_secret_access_key = ...');
  console.log('');
  console.log('  Option 2: Add to .env.local in project root:');
  console.log('    AWS_ACCESS_KEY_ID=AKIA...');
  console.log('    AWS_SECRET_ACCESS_KEY=...');
  console.log('');
  console.log('  Option 3: Set environment variables:');
  console.log('    $env:AWS_ACCESS_KEY_ID = "AKIA..."');
  console.log('    $env:AWS_SECRET_ACCESS_KEY = "..."');
}
