import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

export const hasDbConfig = Boolean(dbConfig.host && dbConfig.user && dbConfig.database);

export const pool = hasDbConfig
  ? mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
      namedPlaceholders: true,
    })
  : null;
