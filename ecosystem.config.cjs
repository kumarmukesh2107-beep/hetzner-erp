module.exports = {
  apps: [
    {
      name: 'erp-backend',
      script: 'server.js',
      env: { PORT: 4000 },
    },
    {
      name: 'nexus-sync',
      script: 'backend-sync-server.mjs',
      env: { SYNC_PORT: 8788 },
    },
  ],
};
