const { database } = require("./database");

async function ensureTablesExist() {
  try {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS walltaker_settings (
        guild_id VARCHAR(50) PRIMARY KEY,
        feed_id VARCHAR(50) NOT NULL,
        channel_id VARCHAR(50) NOT NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS walltaker_last_posted (
        guild_id VARCHAR(50) PRIMARY KEY,
        image_url TEXT NOT NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    `);

    console.log("✅ Walltaker tables ensured.");
  } catch (error) {
    console.error("❌ Error ensuring Walltaker tables exist:", error);
  }
}

module.exports = { ensureTablesExist };
