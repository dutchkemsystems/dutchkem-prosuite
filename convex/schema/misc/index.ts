export { walletsTables } from "./wallets";
export { supportTables } from "./support";
export { workflowsTables } from "./workflows";
export { referralsTables } from "./referrals";
export { crmTables } from "./crm";
export { ai_memoryTables } from "./ai_memory";
export { monetizationTables } from "./monetization";
export { marketingTables } from "./marketing";
export { integrationsTables } from "./integrations";
export { opsTables } from "./ops";

import { walletsTables } from "./wallets";
import { supportTables } from "./support";
import { workflowsTables } from "./workflows";
import { referralsTables } from "./referrals";
import { crmTables } from "./crm";
import { ai_memoryTables } from "./ai_memory";
import { monetizationTables } from "./monetization";
import { marketingTables } from "./marketing";
import { integrationsTables } from "./integrations";
import { opsTables } from "./ops";

export const miscTables = {
  ...walletsTables,
  ...supportTables,
  ...workflowsTables,
  ...referralsTables,
  ...crmTables,
  ...ai_memoryTables,
  ...monetizationTables,
  ...marketingTables,
  ...integrationsTables,
  ...opsTables,
};
