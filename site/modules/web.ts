// What the site's modules add to the web pages (site/modules/index.ts).
import type { WebModule } from "@aihot/web/modules";
import competitorWeekly from "@aihot/competitor-weekly/web";

export const WEB_MODULES: readonly WebModule[] = [competitorWeekly];
