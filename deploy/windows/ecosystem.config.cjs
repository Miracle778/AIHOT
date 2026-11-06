// Windows（以及任何装了 pm2 的机器）上让三个进程常驻：pm2 start deploy/windows/ecosystem.config.cjs
// 环境变量都从仓库根目录的 .env 读（--env-file）；NODE_ENV=production 写在这里，不依赖 .env。
// interpreter 明确写 node：pm2 默认会用 ts-node 跑 .ts 文件，这里是 Node 24 直接运行 TypeScript。
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const env = { NODE_ENV: "production" };

module.exports = {
  apps: [
    { name: "agenthot-api", cwd: root, script: "apps/api/src/main.ts", interpreter: "node", node_args: "--env-file=.env", env },
    {
      name: "agenthot-worker", cwd: root, script: "apps/worker/src/main.ts", interpreter: "node", node_args: "--env-file=.env", env,
      // 停止时给 worker 515 秒排空队列（docs/deploy.md“不用 Docker”）；只停主进程，不连带杀掉它启动的子进程。
      kill_timeout: 515000, treekill: false,
    },
    { name: "agenthot-web", cwd: path.join(root, "apps/web"), script: "server.ts", interpreter: "node", node_args: "--env-file=../../.env", env },
  ],
};
