import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { coreTables } from "./schema/core";
import { financeTables } from "./schema/finance";
import { agentsTables as agentTables } from "./schema/agents";
import { paymentsTables as paymentTables } from "./schema/payments";
import { ad_engineTables as adEngineTables } from "./schema/ad_engine";
import { socialTables } from "./schema/social";
import { enterpriseTables } from "./schema/enterprise";
import { whatsappTables } from "./schema/whatsapp";
import { marketplaceTables } from "./schema/marketplace";
import { kdpTables } from "./schema/kdp";
import { composioTables } from "./schema/composio";
import { trypostTables } from "./schema/trypost";
import { notificationsTables as notificationTables } from "./schema/notifications";
import { securityTables } from "./schema/security";
import { gamificationTables } from "./schema/gamification";
import { videoTables } from "./schema/video";
import { auto_healTables as autoHealTables } from "./schema/auto_heal";
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
