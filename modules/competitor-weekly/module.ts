// 竞品周汇总：每周为每个竞品把它当周的全部动态（不只是精选）写成一份汇总，单独成页，也放在竞品主题页的顶部。
import { defineModule } from "@aihot/contracts/modules";

export default defineModule({
  name: "competitor-weekly",
  pages: [
    { path: "competitors/weekly", file: "web/page.tsx", id: "competitor-weekly" },
    { path: "competitors/weekly/:week", file: "web/page.tsx", id: "competitor-weekly-week" },
  ],
});
