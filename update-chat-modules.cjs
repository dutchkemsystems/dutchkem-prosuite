const fs = require('fs');
const path = require('path');

const agentConfigs = [
  { file: 'career_chat.ts', agent: 'careerAgent', agentId: 'A4', agentName: 'career-agent', varName: 'careerAgent' },
  { file: 'certification_chat.ts', agent: 'certificationAgent', agentId: 'A6', agentName: 'certification-agent', varName: 'certificationAgent' },
  { file: 'exam_career_chat.ts', agent: 'examCareerAgent', agentId: 'A13', agentName: 'exam-career-agent', varName: 'examCareerAgent' },
  { file: 'finance_chat.ts', agent: 'financeAgent', agentId: 'A7', agentName: 'finance-agent', varName: 'financeAgent' },
  { file: 'home_chat.ts', agent: 'homeAgent', agentId: 'A10', agentName: 'home-agent', varName: 'homeAgent' },
  { file: 'language_chat.ts', agent: 'languageAgent', agentId: 'A11', agentName: 'language-agent', varName: 'languageAgent' },
  { file: 'shopping_chat.ts', agent: 'shoppingAgent', agentId: 'A5', agentName: 'shopping-agent', varName: 'shoppingAgent' },
  { file: 'translation_chat.ts', agent: 'translationAgent', agentId: 'A14', agentName: 'translation-agent', varName: 'translationAgent' },
  { file: 'travel_chat.ts', agent: 'travelAgent', agentId: 'A12', agentName: 'travel-agent', varName: 'travelAgent' },
  { file: 'video_chat.ts', agent: 'videoAgent', agentId: 'A8', agentName: 'video-agent', varName: 'videoAgent' },
  { file: 'wellness_chat.ts', agent: 'wellnessAgent', agentId: 'A9', agentName: 'wellness-agent', varName: 'wellnessAgent' },
  { file: 'event_chat.ts', agent: 'eventAgent', agentId: 'A15', agentName: 'event-agent', varName: 'eventAgent' },
];

const dir = 'C:\\dutchkem-ventures-platform-overview\\convex';

for (const config of agentConfigs) {
  const filePath = path.join(dir, config.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${config.file} - not found`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already updated
  if (content.includes('pre_subscription_handler')) {
    console.log(`Skipping ${config.file} - already updated`);
    continue;
  }
  
  // Add imports
  const importLine = `import { getPreSubscriptionResponse, getUpgradePrompt, getPreSubscriptionCountInternal, savePreSubscriptionExchange } from "./pre_subscription_handler";\n`;
  const constLines = `\nconst MAX_FREE_EXCHANGES = 3;\nconst AGENT_ID = "${config.agentId}";\n`;
  
  // Find the last import line
  const lastImportIndex = content.lastIndexOf('import ');
  const endOfImports = content.indexOf('\n', lastImportIndex) + 1;
  
  // Insert imports and constants
  content = content.slice(0, endOfImports) + importLine + constLines + content.slice(endOfImports);
  
  // Replace subscription gate
  const oldGate = `// SUBSCRIPTION CHECK — require active plan before AI processing
    if (userId) {
      const sub = await ctx.runQuery(internal.subscription_guard.checkUserSubscription, { userId });
      if (!sub.active) {
        const { messageId } = await ${config.varName}.agents[0].saveMessage(ctx, {
          threadId,
          prompt,
          userId,
          skipEmbeddings: true,
        });
        await (${config.varName}.agents[0] as any).answer(ctx, {
          threadId,
          promptMessageId: messageId,
          assistantId: (${config.varName}.agents[0] as any).agentId ?? "${config.agentName}",
          text: "⚠️ Active subscription required. Please subscribe at https://dutchkem-prosuite-app.vercel.app/dashboard to use this agent.",
        });
        return messageId;
      }
    }`;
  
  const newGate = `if (userId) {
      const sub = await ctx.runQuery(internal.subscription_guard.checkUserSubscription, { userId });
      if (!sub.active) {
        const exchangeCount = await ctx.runQuery(internal.pre_subscription_handler.getPreSubscriptionCountInternal, {
          userId,
          agentId: AGENT_ID,
        });

        const { messageId } = await ${config.varName}.agents[0].saveMessage(ctx, {
          threadId,
          prompt,
          userId,
          skipEmbeddings: true,
        });

        if (exchangeCount < MAX_FREE_EXCHANGES) {
          const response = getPreSubscriptionResponse(AGENT_ID, prompt);
          await (${config.varName}.agents[0] as any).answer(ctx, {
            threadId,
            promptMessageId: messageId,
            assistantId: (${config.varName}.agents[0] as any).agentId ?? "${config.agentName}",
            text: response,
          });
          await ctx.runMutation(internal.pre_subscription_handler.savePreSubscriptionExchange, {
            userId,
            agentId: AGENT_ID,
            exchangeCount: exchangeCount + 1,
          });
        } else {
          const upgradePrompt = getUpgradePrompt(AGENT_ID, exchangeCount);
          await (${config.varName}.agents[0] as any).answer(ctx, {
            threadId,
            promptMessageId: messageId,
            assistantId: (${config.varName}.agents[0] as any).agentId ?? "${config.agentName}",
            text: upgradePrompt,
          });
        }
        return messageId;
      }
    }`;
  
  content = content.replace(oldGate, newGate);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${config.file}`);
}

console.log('All files updated successfully!');
