const fetch = require("node-fetch");

async function fetchWalltakerImage(feedId) {
  const apiUrl = `https://walltaker.joi.how/api/links/${feedId}.json`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "User-Agent": "NappBot/1.0 (by Napp on Discord)" },
    });

    if (!response.ok) {
      throw new Error(`Walltaker API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.post_url) return null;

    return {
      feedId,
      imageUrl: data.post_url.trim(),
      sourceUrl: `https://walltaker.joi.how/links/${feedId}`,
      lastUpdatedBy: data.set_by?.trim() || "anon",
    };
  } catch (error) {
    console.error(
      `❌ Error fetching Walltaker image for feed ${feedId}:`,
      error.message
    );
    return null;
  }
}

module.exports = { fetchWalltakerImage };
