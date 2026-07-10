const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Variável de ambiente DATABASE_URL não definida!");
}

const pool = new Pool({
  connectionString: connectionString,
  // REMOVEMOS a parte do SSL para funcionar localmente
  /*
  ssl: {
    rejectUnauthorized: false
  }
  */
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};