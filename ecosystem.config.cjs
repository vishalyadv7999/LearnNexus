module.exports = {
  apps: [
    {
      name: "learnnexus-api",
      cwd: "./server",
      script: "src/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "350M",
      min_uptime: "10s",
      restart_delay: 5000,
      max_restarts: 10,
      kill_timeout: 10000,
      listen_timeout: 10000,
      exp_backoff_restart_delay: 200,
    },
  ],
};
