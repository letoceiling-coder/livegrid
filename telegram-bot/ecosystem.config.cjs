module.exports = {
  apps: [
    {
      name: 'livegrid-telegram-bot',
      cwd: '/var/www/lg/telegram-bot',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
