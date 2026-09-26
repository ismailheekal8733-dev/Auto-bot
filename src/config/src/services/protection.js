import {
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";

/*
 * ============================================================
 * AUTO-BOT PROFESSIONAL PROTECTION SYSTEM
 * ============================================================
 *
 * This module ADDS protection to the existing bot.
 * It does NOT replace your commands, database, tickets,
 * economy, leveling, giveaways, etc.
 *
 * Features:
 * - Anti-spam
 * - Anti-duplicate messages
 * - Anti-invite
 * - Anti-mass mentions
 * - Anti-caps
 * - Automatic timeout
 * - Automatic warnings
 * - Moderation logging
 * - Join protection
 * - Raid detection
 * - Welcome messages
 * - Goodbye messages
 * - Member join logging
 * - Member leave logging
 *
 * No additional npm package required.
 */

const state = {
  spam: new Map(),
  duplicates: new Map(),
  joins: new Map(),
  warnings: new Map(),
  raidMode: new Map(),
};

const settings = {
  spam: {
    enabled: true,
    maxMessages: 6,
    window: 5000,
    timeoutMinutes: 2,
  },

  duplicate: {
    enabled: true,
    maxDuplicates: 3,
    window: 10000,
  },

  invites: {
    enabled: true,
  },

  mentions: {
    enabled: true,
    max: 5,
    timeoutMinutes: 5,
  },

  caps: {
    enabled: true,
    minimumLength: 12,
    percentage: 0.85,
  },

  raid: {
    enabled: true,
    maxJoins: 8,
    window: 10000,
    timeoutMinutes: 10,
  },
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function getLogChannel(guild) {
  const configured =
    process.env.LOG_CHANNEL_ID ||
    guild.systemChannelId;

  if (!configured) return null;

  return guild.channels.cache.get(configured) || null;
}

async function log(guild, title, description, color = 0x5865f2) {
  try {
    const channel = getLogChannel(guild);

    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp()
      .setFooter({
        text: "Auto-bot • Somali Hub Community",
      });

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.warn("[Protection] Logging failed:", error.message);
  }
}

function isStaff(member) {
  if (!member) return false;

  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.ManageMessages) ||
    member.permissions.has(PermissionFlagsBits.ModerateMembers)
  );
}

async function timeout(member, minutes, reason) {
  if (!member) return false;

  try {
    if (!member.moderatable) return false;

    await member.timeout(
      minutes * 60 * 1000,
      reason,
    );

    return true;
  } catch {
    return false;
  }
}

async function warnUser(member, reason) {
  if (!member) return;

  try {
    await member.send(
      `⚠️ You received a warning in **${member.guild.name}**.\n\nReason: **${reason}**`
    );
  } catch {
    // DMs disabled
  }
}

// ------------------------------------------------------------
// Anti-spam
// ------------------------------------------------------------

async function antiSpam(message) {
  if (!settings.spam.enabled) return false;
  if (!message.guild || !message.member) return false;
  if (isStaff(message.member)) return false;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();

  const previous = state.spam.get(key) || [];

  const recent = previous.filter(
    timestamp => now - timestamp < settings.spam.window
  );

  recent.push(now);
  state.spam.set(key, recent);

  if (recent.length < settings.spam.maxMessages) {
    return false;
  }

  state.spam.set(key, []);

  try {
    await message.delete().catch(() => {});
  } catch {}

  const success = await timeout(
    message.member,
    settings.spam.timeoutMinutes,
    "Automatic anti-spam protection"
  );

  await warnUser(
    message.member,
    "Spam / sending messages too quickly."
  );

  await log(
    message.guild,
    "🛡️ Anti-Spam Triggered",
    `${message.author} was detected sending messages too quickly.\n\n` +
      `**Action:** ${success ? `Timeout ${settings.spam.timeoutMinutes} minutes` : "Warning"}\n` +
      `**Channel:** ${message.channel}`,
    0xed4245
  );

  return true;
}

// ------------------------------------------------------------
// Duplicate messages
// ------------------------------------------------------------

async function antiDuplicate(message) {
  if (!settings.duplicate.enabled) return false;
  if (!message.guild || !message.member) return false;
  if (isStaff(message.member)) return false;

  const content = message.content?.trim();

  if (!content || content.length < 3) return false;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();

  const data = state.duplicates.get(key) || {
    content: "",
    count: 0,
    time: now,
  };

  if (
    data.content === content &&
    now - data.time < settings.duplicate.window
  ) {
    data.count++;
  } else {
    data.content = content;
    data.count = 1;
  }

  data.time = now;
  state.duplicates.set(key, data);

  if (data.count < settings.duplicate.maxDuplicates) {
    return false;
  }

  await message.delete().catch(() => {});

  await log(
    message.guild,
    "🔁 Duplicate Spam Blocked",
    `${message.author} repeatedly sent the same message.\n\n` +
      `**Channel:** ${message.channel}`,
    0xf1c40f
  );

  return true;
}

// ------------------------------------------------------------
// Anti invite
// ------------------------------------------------------------

async function antiInvite(message) {
  if (!settings.invites.enabled) return false;
  if (!message.guild || !message.member) return false;
  if (isStaff(message.member)) return false;

  const inviteRegex =
    /(discord\.gg\/|discord\.com\/invite\/)[a-zA-Z0-9-]+/i;

  if (!inviteRegex.test(message.content || "")) {
    return false;
  }

  await message.delete().catch(() => {});

  await warnUser(
    message.member,
    "Discord invite links are not allowed."
  );

  await log(
    message.guild,
    "🔗 Invite Link Blocked",
    `${message.author} posted a Discord invite link.\n\n` +
      `**Channel:** ${message.channel}`,
    0xe67e22
  );

  return true;
}

// ------------------------------------------------------------
// Mass mentions
// ------------------------------------------------------------

async function antiMentions(message) {
  if (!settings.mentions.enabled) return false;
  if (!message.guild || !message.member) return false;
  if (isStaff(message.member)) return false;

  const count =
    message.mentions.users.size +
    message.mentions.roles.size;

  if (count < settings.mentions.max) {
    return false;
  }

  await message.delete().catch(() => {});

  const success = await timeout(
    message.member,
    settings.mentions.timeoutMinutes,
    "Mass mention protection"
  );

  await log(
    message.guild,
    "📢 Mass Mention Blocked",
    `${message.author} used **${count} mentions**.\n\n` +
      `**Action:** ${success ? "Member timed out" : "Message deleted"}`,
    0xed4245
  );

  return true;
}

// ------------------------------------------------------------
// CAPS protection
// ------------------------------------------------------------

async function antiCaps(message) {
  if (!settings.caps.enabled) return false;
  if (!message.guild || !message.member) return false;
  if (isStaff(message.member)) return false;

  const content = message.content?.trim();

  if (!content || content.length < settings.caps.minimumLength) {
    return false;
  }

  const letters = content.match(/[a-zA-Z]/g);

  if (!letters || letters.length < 8) {
    return false;
  }

  const upper = content.match(/[A-Z]/g) || [];

  const percentage = upper.length / letters.length;

  if (percentage < settings.caps.percentage) {
    return false;
  }

  await message.delete().catch(() => {});

  await warnUser(
    message.member,
    "Please avoid excessive CAPS messages."
  );

  return true;
}

// ------------------------------------------------------------
// Message protection
// ------------------------------------------------------------

async function handleMessage(message) {
  if (!message.guild) return;
  if (message.author.bot) return;

  if (await antiSpam(message)) return;
  if (await antiDuplicate(message)) return;
  if (await antiInvite(message)) return;
  if (await antiMentions(message)) return;
  if (await antiCaps(message)) return;
}

// ------------------------------------------------------------
// Raid protection
// ------------------------------------------------------------

async function handleJoin(member) {
  const guild = member.guild;

  if (!settings.raid.enabled) return;

  const now = Date.now();
  const key = guild.id;

  const previous = state.joins.get(key) || [];

  const recent = previous.filter(
    timestamp => now - timestamp < settings.raid.window
  );

  recent.push(now);
  state.joins.set(key, recent);

  if (recent.length < settings.raid.maxJoins) {
    return;
  }

  state.raidMode.set(guild.id, Date.now());

  await log(
    guild,
    "🚨 RAID PROTECTION ACTIVATED",
    `A large number of members joined in a short period.\n\n` +
      `**Joins detected:** ${recent.length}\n` +
      `**Window:** ${settings.raid.window / 1000}s\n\n` +
      `New members will receive additional protection.`,
    0xed4245
  );

  if (
    member.user.createdTimestamp &&
    Date.now() - member.user.createdTimestamp <
      7 * 24 * 60 * 60 * 1000
  ) {
    await timeout(
      member,
      settings.raid.timeoutMinutes,
      "New account during raid protection"
    );
  }
}

// ------------------------------------------------------------
// Welcome
// ------------------------------------------------------------

async function welcome(member) {
  const guild = member.guild;

  const channel =
    guild.systemChannel ||
    guild.channels.cache.find(
      c =>
        c.type === ChannelType.GuildText &&
        c.permissionsFor(guild.members.me)?.has(
          PermissionFlagsBits.SendMessages
        )
    );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("👋 Welcome to Somali Hub Community!")
    .setDescription(
      `Welcome ${member}!\n\n` +
      `We're happy to have you here. 🎉\n` +
      `Please check the server rules and enjoy the community!`
    )
    .addFields({
      name: "👥 Member Count",
      value: `${guild.memberCount}`,
      inline: true,
    })
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp()
    .setFooter({
      text: "Somali Hub Community",
    });

  await channel.send({
    embeds: [embed],
  }).catch(() => {});

  await log(
    guild,
    "👋 Member Joined",
    `${member} joined the server.`,
    0x57f287
  );
}

// ------------------------------------------------------------
// Goodbye
// ------------------------------------------------------------

async function goodbye(member) {
  const guild = member.guild;

  const channel = guild.systemChannel;

  if (channel?.isTextBased()) {
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("👋 Member Left")
      .setDescription(
        `**${member.user.tag}** has left the server.`
      )
      .setTimestamp()
      .setFooter({
        text: "Somali Hub Community",
      });

    await channel.send({
      embeds: [embed],
    }).catch(() => {});
  }

  await log(
    guild,
    "📤 Member Left",
    `${member.user.tag} left the server.`,
    0xed4245
  );
}

// ------------------------------------------------------------
// Cleanup
// ------------------------------------------------------------

setInterval(() => {
  const now = Date.now();

  for (const [key, timestamps] of state.spam) {
    const filtered = timestamps.filter(
      timestamp => now - timestamp < 30000
    );

    if (filtered.length === 0) {
      state.spam.delete(key);
    } else {
      state.spam.set(key, filtered);
    }
  }

  for (const [key, data] of state.duplicates) {
    if (now - data.time > 30000) {
      state.duplicates.delete(key);
    }
  }

  for (const [key, timestamps] of state.joins) {
    const filtered = timestamps.filter(
      timestamp => now - timestamp < 60000
    );

    if (filtered.length === 0) {
      state.joins.delete(key);
    } else {
      state.joins.set(key, filtered);
    }
  }
}, 30000).unref();

export {
  handleMessage,
  handleJoin,
  welcome,
  goodbye,
};
