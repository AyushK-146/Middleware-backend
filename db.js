const Pool = require('pg').Pool;

const pool = new Pool({
    user: "postgres",
    password: "Ayush-146",
    port: 8080,
    database: "atlan"
});

module.exports = pool;