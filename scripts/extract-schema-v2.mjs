#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const schemaPath = join(process.cwd(), 'convex', 'schema.ts');
const schemaDir = join(process.cwd(), 'convex', 'schema');

// Read the schema file
const content = readFileSync(schemaPath, 'utf-8');

// Find all table definitions by tracking brackets
function extractTables(content) {
  const tables = [];
  const tableStartPattern = /(\w+):\s*defineTable\(/g;
  let match;

  while ((match = tableStartPattern.exec(content)) !== null) {
    const name = match[1];
    const startIndex = match.index;
    let bracketCount = 0;
    let endIndex = startIndex;
    let foundFirstBracket = false;

    // Find the matching closing bracket for defineTable
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '(' && !foundFirstBracket) {
        foundFirstBracket = true;
        bracketCount = 1;
        continue;
      }
      if (foundFirstBracket) {
        if (content[i] === '(') bracketCount++;
        if (content[i] === ')') bracketCount--;
        if (bracketCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }

    // Now find the indexes (if any)
    let indexEnd = endIndex;
    const remaining = content.slice(endIndex);
    const indexPattern = /\.index\(/g;
    let indexMatch;
    let lastIndexChanged = endIndex;

    while ((indexMatch = indexPattern.exec(remaining)) !== null) {
      // Check if this index is part of the current table (within a reasonable distance)
      if (indexMatch.index < 200) { // Indexes should be close to the table definition
        let indexBracketCount = 0;
        for (let i = indexMatch.index; i < remaining.length; i++) {
          if (remaining[i] === '(') indexBracketCount++;
          if (remaining[i] === ')') indexBracketCount--;
          if (indexBracketCount === 0) {
            lastIndexChanged = endIndex + i + 1;
            break;
          }
        }
      }
    }

    // Find the comma after the table definition
    const afterTable = content.slice(lastIndexChanged);
    const commaMatch = afterTable.match(/^\s*,/);
    if (commaMatch) {
      indexEnd = lastIndexChanged + commaMatch[0].length;
    } else {
      indexEnd = lastIndexChanged;
    }

    const definition = content.slice(startIndex, indexEnd).trim();
    tables.push({ name, definition });
  }

  return tables;
}

const tables = extractTables(content);
console.log(`Found ${tables.length} tables`);

// Verify by checking some known tables
const knownTables = ['users', 'jobs', 'subscriptions', 'ai_agents', 'enterprise_organizations'];
for (const tableName of knownTables) {
  const found = tables.find(t => t.name === tableName);
  if (found) {
    console.log(`✓ Found ${tableName} (${found.definition.length} chars)`);
  } else {
    console.log(`✗ Missing ${tableName}`);
  }
}

// Define domain groupings
const domains = {
  core: ['users', 'jobs', 'subscriptions', 'refunds', 'payouts', 'daily_sweeps', 'beneficiaries', 'payment_methods', 'user_sessions', 'api_keys', 'audit_logs', 'failed_logins', 'admin_audit_log', 'admin_2fa', 'ip_whitelist', 'fraud_monitoring', 'payment_verifications', 'model_status', 'system_wallets', 'system_config', 'feature_flags', 'notifications', 'projects', 'agent_services', 'service_updates', 'holiday_discounts'],
  finance: ['tax_wallet', 'tax_transactions', 'interest_earnings', 'annual_tax_filing', 'charity_wallet', 'charity_transactions', 'tithe_transactions', 'cac_tax_transactions', 'expense_categories', 'business_expenses', 'tax_calculations', 'tax_payment_schedule'],
  agents: ['ai_agents', 'agent_conversations', 'agent_messages', 'agent_performance', 'agent_reviews', 'agent_analytics_metrics', 'agent_version_control', 'agent_autonomy_logs', 'agent_marketplace_templates', 'agent_marketplace_reviews', 'agent_marketplace_installations', 'agent_subscriptions', 'agent_payment_pending', 'agent_receipts'],
  payments: ['checkout_sessions', 'kora_webhook_events', 'kora_pending_transactions', 'pre_subscription_exchanges', 'agentic_payment_methods', 'agentic_payment_transactions', 'agentic_payment_limits'],
  ad_engine: ['ad_engine_status', 'ad_campaigns', 'ad_ads', 'ad_flyers', 'ad_analytics', 'ad_budget_rules', 'ad_budget_alerts', 'ad_ab_tests', 'ad_ab_test_variants', 'ad_compliance_rules', 'ad_compliance_logs', 'ad_account_connections', 'ad_monetization_plans', 'ad_monetization_invoices', 'ad_recommendations', 'ad_performance_snapshots', 'ad_orchestrator_status', 'ad_generated_content', 'ad_posting_logs', 'ad_tracking_urls', 'ad_conversions', 'ad_scheduling_recommendations', 'ad_webhook_configs', 'ad_webhook_events', 'ad_alert_emails', 'ad_alert_preferences', 'ad_batch_operations'],
  social: ['social_posts', 'social_platforms', 'social_activities', 'social_proof', 'socialProof', 'content_calendar', 'social_commerce_conversations', 'dm_automation_rules', 'social_engagement_logs', 'platform_connections', 'oauth_states', 'token_refresh_logs'],
  enterprise: ['enterprise_audit_logs', 'enterprise_organizations', 'enterprise_sessions', 'enterprise_invitations', 'enterprise_members', 'enterprise_capability_usage', 'enterprise_workflows', 'enterprise_marketplace_installs', 'enterprise_knowledge_entries', 'enterprise_companion_sessions', 'enterprise_transactions', 'enterprise_emotional_profiles', 'enterprise_healing_log', 'enterprise_companies', 'enterprise_subadmins', 'enterprise_clients', 'enterprise_security_log', 'enterprise_scaling_config', 'enterprise_scaling_logs', 'enterprise_monitoring_metrics', 'enterprise_monitoring_alerts', 'enterprise_sla_agreements', 'enterprise_sla_incidents', 'enterprise_compliance_docs', 'enterprise_support_tickets', 'enterprise_support_responses', 'enterprise_cdn_assets', 'enterprise_org_users', 'enterprise_feature_configs', 'enterprise_org_transactions', 'enterprise_org_analytics', 'enterprise_org_diagnostics', 'enterprise_org_healing_logs', 'enterprise_org_payment_configs', 'enterprise_client_payments', 'enterprise_org_bank_accounts', 'enterprise_org_subadmins', 'enterprise_org_feature_flags', 'enterprise_invoices', 'white_label_customers'],
  whatsapp: ['whatsapp_system_status', 'whatsapp_pricing_tiers', 'whatsapp_message_rates', 'whatsapp_subscriptions', 'whatsapp_usage_logs', 'whatsapp_toggle_logs', 'whatsapp_blacklist', 'whatsapp_ad_campaigns', 'whatsapp_ad_logs', 'whatsapp_revenue_logs', 'whatsapp_sessions'],
  marketplace: ['marketplace_listings', 'marketplace_purchases', 'marketplace_transactions'],
  kdp: ['kdp_projects', 'kdp_royalties', 'book_projects', 'book_royalties'],
  composio: ['composio_auth_configs', 'composio_settings', 'composio_agent_settings', 'composio_action_logs', 'composio_notification_prefs', 'composio_triggers', 'composio_trigger_events', 'composio_custom_tools', 'composio_webhooks', 'composio_sessions', 'composio_enhancement_logs', 'composio_failure_logs'],
  trypost: ['trypost_brand_profile', 'trypost_scheduled_posts', 'trypost_media', 'trypost_templates', 'trypost_post_comments', 'trypost_workflows', 'trypost_workflow_runs', 'trypost_carousels', 'trypost_analytics', 'trypost_webhook_events'],
  notifications: ['push_subscriptions', 'push_queue', 'email_notifications', 'webhook_notifications'],
  security: ['security_logs', 'blocked_ips', 'healing_logs', 'health_reports', 'client_2fa', 'aws_otp_requests', 'aws_fraud_scores', 'aws_trusted_devices', 'aws_rate_limit_events', 'aws_otp_delivery_logs'],
  gamification: ['gamification_profiles', 'gamification_log', 'user_achievements', 'badges', 'user_badges', 'leaderboard_entries'],
  video: ['video_productions', 'video_scenes', 'video_backups'],
  auto_heal: ['auto_heal_runs', 'auto_heal_alerts', 'auto_heal_fixes', 'auto_heal_secrets', 'auto_heal_health_checks'],
  hermes: ['hermes_tasks', 'hermes_healing_logs', 'hermes_scheduled_tasks', 'hermes_platform_gateways', 'hermes_installed_services'],
  misc: ['lead_scores', 'leads', 'workflows', 'workflow_executions', 'communication_logs', 'saved_reports', 'client_locations', 'territories', 'hygiene_reports', 'system_backups', 'synthetic_performance_logs', 'referral_codes', 'referral_conversions', 'referral_payouts', 'active_viewers', 'analytics_events', 'chatbot_conversations', 'testimonials', 'subscription_renewal_config', 'renewal_transactions', 'transfer_passkeys', 'usage_alerts', 'generated_receipts', 'live_feeds', 'transaction_analytics', 'cloud_memory_autonomy', 'knowledge_graph_nodes', 'knowledge_graph_edges', 'knowledge_graph_queries', 'companion_agent_sessions', 'companion_agent_memory', 'companion_agent_conversations', 'orchestration_workflows', 'orchestration_workflow_runs', 'emotional_ai_profiles', 'emotional_ai_interactions', 'emotional_ai_memory', 'mimo_core_state', 'mimo_health_logs', 'mimo_security_events', 'mimo_command_history', 'mimo_deployment_records', 'mimo_agent_registry', 'mimo_audit_logs', 'rapidapi_connections', 'rapidapi_post_logs', 'posting_config', 'user_credits', 'credit_purchases', 'credit_transactions', 'outcome_events', 'outcome_pricing_rules', 'agent_performance_metrics', 'commerce_conversations', 'consulting_bookings', 'developer_api_keys', 'developer_api_usage_logs', 'flyer_design_styles', 'flyer_auto_posting_engine', 'generated_flyers', 'flyer_posting_queue', 'flyer_posting_logs', 'credit_expiry_config', 'subscription_plans', 'agent_pricing_tiers', 'enterprise_addons', 'enterprise_addon_subscriptions', 'user_usage_tracking', 'overage_invoices', 'freemium_conversion_events', 'revenue_daily_snapshots', 'subscription_changes', 'password_change_requests', 'client_kyc_submissions', 'client_wallets', 'client_wallet_transactions', 'client_bank_accounts', 'client_payout_requests', 'bulk_payout_batches', 'admin_task_log', 'update_history', 'escrow_wallet', 'support_chats', 'influencers', 'influencer_campaigns', 'customer_database', 'customers', 'orders', 'telegram_carts', 'surveys', 'survey_responses', 'products', 'appointment_slots', 'appointment_bookings', 'sms_campaigns', 'email_campaigns', 'business_hours', 'ai_model_status', 'ai_model_toggle_logs', 'ai_model_usage', 'cron_jobs', 'cron_executions', 'unified_orchestrator_status', 'unified_ad_content', 'unified_scheduled_posts', 'unified_posting_logs', 'referral_withdrawal_requests']
};

// Create domain modules
for (const [domain, tableNames] of Object.entries(domains)) {
  const domainTables = tables.filter(t => tableNames.includes(t.name));

  if (domainTables.length === 0) {
    console.log(`Warning: No tables found for domain "${domain}"`);
    continue;
  }

  const imports = `import { defineTable } from "convex/server";\nimport { v } from "convex/values";\n\n`;
  const exports = `export const ${domain}Tables = {\n${domainTables.map(t => `  ${t.definition}`).join('\n')}\n};\n`;

  writeFileSync(join(schemaDir, `${domain}.ts`), imports + exports);
  console.log(`Created ${domain}.ts with ${domainTables.length} tables`);
}

// Create index.ts
const indexContent = Object.keys(domains).map(domain =>
  `export { ${domain}Tables } from "./${domain}";`
).join('\n');

writeFileSync(join(schemaDir, 'index.ts'), indexContent + '\n');
console.log('Created index.ts');

// Create new schema.ts
const newSchemaContent = `import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { coreTables } from "./schema/core";
import { financeTables } from "./schema/finance";
import { agentTables } from "./schema/agents";
import { paymentTables } from "./schema/payments";
import { adEngineTables } from "./schema/ad_engine";
import { socialTables } from "./schema/social";
import { enterpriseTables } from "./schema/enterprise";
import { whatsappTables } from "./schema/whatsapp";
import { marketplaceTables } from "./schema/marketplace";
import { kdpTables } from "./schema/kdp";
import { composioTables } from "./schema/composio";
import { trypostTables } from "./schema/trypost";
import { notificationTables } from "./schema/notifications";
import { securityTables } from "./schema/security";
import { gamificationTables } from "./schema/gamification";
import { videoTables } from "./schema/video";
import { autoHealTables } from "./schema/auto_heal";
import { hermesTables } from "./schema/hermes";
import { miscTables } from "./schema/misc";

export default defineSchema({
  ...authTables,
  ...coreTables,
  ...financeTables,
  ...agentTables,
  ...paymentTables,
  ...adEngineTables,
  ...socialTables,
  ...enterpriseTables,
  ...whatsappTables,
  ...marketplaceTables,
  ...kdpTables,
  ...composioTables,
  ...trypostTables,
  ...notificationTables,
  ...securityTables,
  ...gamificationTables,
  ...videoTables,
  ...autoHealTables,
  ...hermesTables,
  ...miscTables,
});
`;

// Backup original schema
writeFileSync(join(process.cwd(), 'convex', 'schema.ts.bak'), content);
writeFileSync(join(process.cwd(), 'convex', 'schema.ts'), newSchemaContent);

console.log('\nDone! Schema has been modularized.');
console.log('Original schema backed up to convex/schema.ts.bak');
