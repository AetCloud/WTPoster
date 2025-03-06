const { Client, Collection, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { ensureTablesExist } = require("./utils/databaseUtils");
const { database } = require("./utils/database");
const { fetchWalltakerImage } = require("./utils/fetchWalltaker");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  getLastPostedImage,
  saveLastPostedImage,
  getWalltakerSettings,
  fetchWalltakerSettings,
} = require("./commands/setwalltaker.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ Missing required environment variables!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

function getCommandFiles(dir) {
  let files = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getCommandFiles(fullPath));
    } else if (entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  });
  return files;
}

const commandFiles = getCommandFiles(path.join(__dirname, "commands"));

for (const file of commandFiles) {
  try {
    const command = require(file);
    if (command?.data?.name && command?.execute) {
      command.filePath = file;
      client.commands.set(command.data.name, command);
      console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
      console.warn(`⚠️ Skipping invalid command file: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error loading command file: ${file}`, error);
  }
}

console.log(`📜 Loaded ${client.commands.size} commands.`);

let lastCheckImages = {};

async function postWalltakerImages() {
  const settings = await getWalltakerSettings();
  if (!settings.length) {
    console.log("⚠️ No Walltaker settings found.");
    return;
  }

  for (const { guild_id, feed_id, channel_id } of settings) {
    try {
      const channel = await client.channels.fetch(channel_id);
      if (!channel) {
        console.error(`❌ Walltaker: Channel not found for guild ${guild_id}`);
        continue;
      }

      const imageData = await fetchWalltakerImage(feed_id);
      if (!imageData) {
        console.log(
          `⚠️ No image found in Walltaker feed for guild ${guild_id}`
        );
        continue;
      }

      const { imageUrl, sourceUrl, lastUpdatedBy } = imageData;
      const cleanImageUrl = imageUrl?.trim() || null;

      const lastPosted = await getLastPostedImage(guild_id);
      if (lastPosted === cleanImageUrl) {
        console.log(
          `✅ No new Walltaker image for guild ${guild_id}, skipping...`
        );
        continue;
      }

      console.log(
        `🆕 New Walltaker image detected for guild ${guild_id}, sending now!`
      );
      await saveLastPostedImage(guild_id, cleanImageUrl);

      const updatedByUser = lastUpdatedBy?.trim() || "anon";

      const embed = new EmbedBuilder()
        .setTitle(`🖼️ Walltaker Image for Feed ${feed_id}`)
        .setDescription(
          "🔄 **Automatic Detection** - A new image has been set!"
        )
        .setImage(cleanImageUrl)
        .setColor("#3498DB")
        .setFooter({
          text: `Image changed by: ${updatedByUser}`,
          iconURL: "https://cdn-icons-png.flaticon.com/512/1828/1828490.png",
        });

      const buttons = [
        new ButtonBuilder()
          .setLabel("🔗 View on Walltaker")
          .setStyle(ButtonStyle.Link)
          .setURL(sourceUrl),
      ];

      const row = new ActionRowBuilder().addComponents(...buttons);

      await channel.send({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(
        `❌ Error posting Walltaker image for guild ${guild_id}:`,
        error
      );
    }
  }
}

async function monitorWalltakerChanges() {
  const settings = await getWalltakerSettings();
  if (!settings.length) {
    console.log("⚠️ No Walltaker settings found.");
    return;
  }

  for (const { guild_id, feed_id } of settings) {
    try {
      const imageData = await fetchWalltakerImage(feed_id);
      if (!imageData) continue;

      const { imageUrl } = imageData;

      if (lastCheckImages[guild_id] !== imageUrl) {
        console.log(
          `🚨 Change detected in Walltaker feed ${feed_id} for guild ${guild_id}, posting immediately!`
        );
        await postWalltakerImages();
      }
    } catch (error) {
      console.error(`❌ Error checking Walltaker feed ${feed_id}:`, error);
    }
  }
}

client.once("ready", async () => {
  console.log("✅ Bot is fully loaded and ready to go!");
  console.log("🕵️‍♂️ Starting Walltaker image monitoring...");
  await ensureTablesExist();
  setInterval(monitorWalltakerChanges, 30 * 1000);
  setInterval(postWalltakerImages, 15 * 60 * 1000);
});

client.login(TOKEN);

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});
