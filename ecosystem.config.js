module.exports = {
  apps: [
    {
      name: "denco-health",
      script: ".next/standalone/server.js",
      cwd: "/root/Fitness",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/root/.pm2/logs/denco-health-error.log",
      out_file: "/root/.pm2/logs/denco-health-out.log",
    },
  ],
};
