const config = {
  dbUrl: process.env.DB_URL,
  coreUrl: process.env.CORE_URL,
  idsAdminUrl: process.env.IDS_ADMIN_URL,
  jwksUrl: process.env.JWKS_URL,
  lsmUrl: process.env.LSM_URL,
  rdstUrl: process.env.RDST_URL,
  redisConnection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
};

export default config;
