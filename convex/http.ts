import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { registerOtpRoutes } from "./http/otp";
import { registerAgentRoutes } from "./http/agents";
import { registerWebhookRoutes } from "./http/webhooks";
import { registerSocialRoutes } from "./http/social";
import { registerTelegramRoutes } from "./http/telegram";
import { registerAdminRoutes } from "./http/admin";
import { registerAutoHealRoutes } from "./http/auto-heal";
import { registerProxyRoutes } from "./http/proxy";
import { registerOrchestratorRoutes } from "./http/orchestrator";
import { registerMiscRoutes } from "./http/misc";

const http = httpRouter();

auth.addHttpRoutes(http);

registerOtpRoutes(http);
registerAgentRoutes(http);
registerWebhookRoutes(http);
registerSocialRoutes(http);
registerTelegramRoutes(http);
registerAdminRoutes(http);
registerAutoHealRoutes(http);
registerProxyRoutes(http);
registerOrchestratorRoutes(http);
registerMiscRoutes(http);

export default http;
