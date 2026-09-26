function parseIds(envValue) {
  return (envValue || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
owners: parseIds(process.env.OWNER_IDS),
  // in applications:
managerRoles: parseIds(process.env.APPLICATION_MANAGER_ROLE_IDS),

// in tickets:
supportRoles: parseIds(process.env.TICKET_SUPPORT_ROLE_IDS),

// in giveaways:
allowedRoles: parseIds(process.env.GIVEAWAY_HOST_ROLE_IDS),
bypassRoles: parseIds(process.env.GIVEAWAY_BYPASS_ROLE_IDS),
    // =========================
  // LEVELING SETTINGS
  // =========================
  leveling: {
    xpMin: 15,
    xpMax: 25,
    xpCooldown: 60000, // ms between XP awards per user
    baseXp: 100,       // xpForLevel(n) = baseXp * n^exponent
    exponent: 1.5,
    announcementChannel: null, // null = reply in the channel the message was sent in
    levelUpMessage: "🎉 {user} just reached level **{level}**!",
    levelRoles: {},     // e.g. { "5": "roleId", "10": "roleId" }
    ignoredChannels: [],
    ignoredRoles: [],
  },

  // =========================
  // LOGGING SETTINGS
  // =========================
  logging: {
    channels: {
      messageEdits: null,
      messageDeletes: null,
      memberJoins: null,
      memberLeaves: null,
      memberUpdates: null,
      roleChanges: null,
      channelChanges: null,
      voiceActivity: null,
      moderation: null,
      server: null,
    },
    ignoreBots: true,
  },

  // =========================
  // MODERATION SETTINGS
  // =========================
  moderation: {
    muteRoleId: null,
    warnThreshold: 3,
    warnThresholdAction: "mute", // "mute" | "kick" | "ban"
    warnThresholdMuteDuration: 3600000, // 1 hour
    defaultBanDeleteDays: 0,
    warnExpiryDays: 30, // null = never expire
  },

  // =========================
  // REACTION ROLES
  // =========================
  reactionRoles: {
    maxPerMessage: 20,
    removeOnUnreact: true,
  },

  // =========================
  // JOIN-TO-CREATE VOICE CHANNELS
  // =========================
  joinToCreate: {
    triggerChannelId: null,
    categoryId: null, // null = same category as trigger channel
    nameTemplate: "{user}'s Channel",
    defaultUserLimit: 0, // 0 = unlimited
    deleteWhenEmpty: true,
  },
      function isValidHexColor(value) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function collectInvalidColors(colors, path = "embeds.colors") {
  const invalid = [];
  for (const [key, value] of Object.entries(colors)) {
    const currentPath = `${path}.${key}`;
    if (typeof value === "string") {
      if (!isValidHexColor(value)) invalid.push(currentPath);
    } else if (value && typeof value === "object") {
      invalid.push(...collectInvalidColors(value, currentPath));
    }
  }
  return invalid;
}
        const invalidColors = collectInvalidColors(config.embeds.colors);
  if (invalidColors.length > 0) {
    errors.push(`Invalid hex color(s) in embeds.colors: ${invalidColors.join(", ")}`);
  }

  if (config.giveaways.minimumWinners > config.giveaways.maximumWinners) {
    errors.push("giveaways.minimumWinners cannot be greater than giveaways.maximumWinners");
  }
  if (config.giveaways.minimumDuration > config.giveaways.maximumDuration) {
    errors.push("giveaways.minimumDuration cannot be greater than giveaways.maximumDuration");
  }
  if (config.verification.autoVerify.minAccountAge > config.verification.autoVerify.maxAccountAge) {
    errors.push("verification.autoVerify.minAccountAge cannot be greater than maxAccountAge");
  }
  if (config.economy.robSuccessRate < 0 || config.economy.robSuccessRate > 1) {
    errors.push("economy.robSuccessRate must be between 0 and 1");
  }
  if (config.commands.maintenanceMode && config.commands.owners.length === 0) {
    // Non-fatal, but flagged loudly: this config would lock every single
    // user (including you) out of every command with no way back in.
    logger.warn(
      "maintenanceMode is enabled but OWNER_IDS is empty — no one will be able to use the bot."
    );
  }
