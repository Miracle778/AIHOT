// 竞品周汇总接进网页的插口：侧栏入口，以及竞品主题页顶部的本周汇总。
import { defineWebModule } from "@aihot/web/modules";
import { IconChart } from "../../apps/web/app/components/icons";

export default defineWebModule({
  name: "competitor-weekly",
  sidebar: { section: "竞品", items: [{ to: "/competitors/weekly", label: "竞品周汇总", icon: IconChart }] },
  tools: [{ to: "/competitors/weekly", label: "竞品周汇总", icon: <IconChart size={18} /> }],
  topicPage: () => import("./web/topic-part"),
});
