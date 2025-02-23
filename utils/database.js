const mysql = require("mysql2/promise");
const { URL } = require("node:url");

const dbUrl = process.env.MYSQL_PUBLIC_URL;
if (!dbUrl) {
  console.error("❌ MYSQL_PUBLIC_URL is not set in environment variables!");
  process.exit(1);
}

let databasePool;

try {
  const dbUri = new URL(dbUrl);
  const dbName = dbUri.pathname.replace("/", "").trim();

  if (!dbName) {
    throw new Error("Invalid MySQL Database Name");
  }

  databasePool = mysql.createPool({
    host: dbUri.hostname,
    port: dbUri.port || "3306",
    user: dbUri.username || "root",
    password: dbUri.password || "",
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4_general_ci",
  });

  console.log("✅ MySQL Connection Pool Created");

  async function testDatabaseConnection() {
    try {
      const conn = await databasePool.getConnection();
      console.log("✅ MySQL Connection Successful");
      conn.release();
    } catch (err) {
      console.error("❌ MySQL Connection Test Failed:", err.message || err);
      process.exit(1);
    }
  }

  testDatabaseConnection();
} catch (error) {
  console.error("❌ Failed to initialize MySQL:", error.message || error);
  process.exit(1);
}

async function executeQuery(query, params = []) {
  try {
    const [rows] = await databasePool.execute(query, params);
    return rows;
  } catch (error) {
    console.error(
      `❌ MySQL Error: ${error.code || "Unknown"} - ${
        error.sqlMessage || error.message
      }`
    );
    return null;
  }
}

if (!databasePool) {
  console.error("❌ MySQL connection pool failed to initialize.");
  process.exit(1);
}

module.exports = {
  database: databasePool,
  executeQuery,
};
