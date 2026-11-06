// The backend of the site's modules, installed by the api and the worker when they start (site/modules/index.ts).
import type { ServerModule } from "@aihot/backend/modules";
import competitorWeekly from "@aihot/competitor-weekly/server";

export const SERVER_MODULES: readonly ServerModule[] = [competitorWeekly];
