const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ]
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.userWarnings = new Map();
client.spamMap = new Map();

const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

const slashFiles = fs.readdirSync("./slash").filter(file => file.endsWith(".js"));
for (const file of slashFiles) {
  const command = require(`./slash/${file}`);
  client.commands.set(command.name, command);
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity("your server", { type: "WATCHING" });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const spamKey = `${message.guild.id}-${message.author.id}`;
  const now = Date.now();
  const spamData = client.spamMap.get(spamKey) || { count: 0, time: now };

  if (now - spamData.time < 2000) {
    spamData.count++;
    if (spamData.count >= 5) {
      await message.delete().catch(() => {});
      await message.channel.send(`${message.author} Stop spamming!`);
      client.spamMap.set(spamKey, { count: 0, time: now });
      return;
    }
  } else {
    spamData.count = 1;
    spamData.time = now;
  }

  client.spamMap.set(spamKey, spamData);

  if (!message.content.startsWith("!")) return;
  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(error);
    message.reply("An error occurred while running that command.");
  }
});

client.on("guildMemberAdd", async (member) => {
  const welcomeEmbed = new EmbedBuilder()
    .setColor("Green")
    .setTitle("Welcome!")
    .setDescription(`Welcome to **${member.guild.name}**, ${member}!`)
    .addFields(
      { name: "Rules", value: "Please read the rules and enjoy the server." },
      { name: "Links", value: "[Discord](https://discord.gg/f9P3Z4vXV)" }
    );

  const channel = member.guild.systemChannel;
  if (channel) {
    channel.send({ embeds: [welcomeEmbed] });
  }
});

client.on("guildMemberRemove", async (member) => {
  console.log(`${member.user.tag} left the server.`);
});

client.login(process.env.BOT_TOKEN);
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  description: "Show help",
  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("Bot Commands")
      .addFields(
        { name: "!help", value: "Show this help menu" },
        { name: "!ping", value: "Check bot latency" },
        { name: "!server", value: "Shows server info" },
        { name: "!user", value: "Shows user info" },
        { name: "!links", value: "Shows platform links" },
        { name: "!kick @user", value: "Kick a user" },
        { name: "!ban @user", value: "Ban a user" },
        { name: "!warn @user", value: "Warn a user" },
        { name: "!mute @user 5m", value: "Mute a user for time" },
        { name: "!clear 10", value: "Delete messages" }
      );

    message.reply({ embeds: [embed] });
  }
};
module.exports = {
  name: "ping",
  description: "Check bot response",
  async execute(message, args, client) {
    const sent = await message.reply("Pinging...");
    sent.edit(`🏓 Pong! Latency: ${sent.createdTimestamp - message.createdTimestamp}ms | API: ${Math.round(client.ws.ping)}ms`);
  }
};
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "links",
  description: "Share social links",
  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor("#00AAFF")
      .setTitle("Community Links")
      .addFields(
        { name: "Discord", value: "[Join Server](https://discord.gg/f9P3Z4vXV)", inline: true },
        { name: "Website", value: "[Website](https://yourwebsite.com)", inline: true },
        { name: "Telegram", value: "[Telegram](https://t.me/yourgroup)", inline: true },
        { name: "WhatsApp", value: "[WhatsApp](https://chat.whatsapp.com/yourgroup)", inline: true },
        { name: "Twitter", value: "[Twitter](https://twitter.com/yourhandle)", inline: true },
        { name: "Instagram", value: "[Instagram](https://instagram.com/yourhandle)", inline: true },
        { name: "YouTube", value: "[YouTube](https://youtube.com/@yourchannel)", inline: true }
      );

    message.reply({ embeds: [embed] });
  }
};
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "server",
  description: "Show server info",
  async execute(message) {
    const guild = message.guild;
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`${guild.name}`)
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
        { name: "Members", value: `${guild.memberCount}`, inline: true },
        { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true }
      );

    message.reply({ embeds: [embed] });
  }
};
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "user",
  description: "Show user info",
  async execute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(target.id);

    const embed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle(`${target.username}'s Info`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "Username", value: target.username, inline: true },
        { name: "ID", value: target.id, inline: true },
        { name: "Bot", value: target.bot ? "Yes" : "No", inline: true },
        { name: "Joined", value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : "Unknown", inline: true }
      );

    message.reply({ embeds: [embed] });
  }
};
const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "kick",
  description: "Kick a user",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply("You do not have permission to kick members.");
    }

    const member = message.mentions.members.first();
    if (!member) return message.reply("Please mention a user to kick.");

    const reason = args.slice(1).join(" ") || "No reason provided";
    await member.kick(reason);
    message.reply(`Kicked ${member.user.tag} for: ${reason}`);
  }
};
const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ban",
  description: "Ban a user",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply("You do not have permission to ban members.");
    }

    const member = message.mentions.members.first();
    if (!member) return message.reply("Please mention a user to ban.");

    const reason = args.slice(1).join(" ") || "No reason provided";
    await member.ban({ reason });
    message.reply(`Banned ${member.user.tag} for: ${reason}`);
  }
};
module.exports = {
  name: "warn",
  description: "Warn a user",
  async execute(message, args, client) {
    if (!message.member.permissions.has("ModerateMembers")) {
      return message.reply("You do not have permission to warn members.");
    }

    const member = message.mentions.members.first();
    if (!member) return message.reply("Mention a user to warn.");

    const reason = args.slice(1).join(" ") || "No reason provided";
    const key = `${message.guild.id}-${member.id}`;

    const warnings = (client.userWarnings.get(key) || 0) + 1;
    client.userWarnings.set(key, warnings);

    member.send(`You were warned in ${message.guild.name}: ${reason}`);
    message.reply(`${member.user.tag} has been warned (${warnings} warns).`);
  }
};
const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "mute",
  description: "Mute a user",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply("You are not allowed to mute members.");
    }

    const member = message.mentions.members.first();
    if (!member) return message.reply("Mention a user to mute.");

    const duration = args[1] || "5m";
    const reason = args.slice(2).join(" ") || "No reason provided";
    const ms = parseDuration(duration);

    await member.timeout(ms, reason);
    message.reply(`${member.user.tag} was muted for ${duration}.`);
  }
};

function parseDuration(duration) {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 300000;
  const value = Number(match[1]);
  const unit = match[2];
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * map[unit];
}
const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "unmute",
  description: "Unmute a user",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply("You do not have permission to unmute users.");
    }

    const member = message.mentions.members.first();
    if (!member) return message.reply("Mention a user to unmute.");

    await member.timeout(null);
    message.reply(`${member.user.tag} has been unmuted.`);
  }
};
const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "clear",
  description: "Delete messages",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply("You do not have permission to delete messages.");
    }

    const amount = Number(args[0]);
    if (!amount || amount <= 0) return message.reply("Provide a valid number between 1 and 100.");

    await message.channel.bulkDelete(Math.min(amount, 100));
    message.reply(`Deleted ${Math.min(amount, 100)} messages.`);
  }
};
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows bot help"),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("Bot Commands")
      .addFields(
        { name: "/ping", value: "Check bot latency" },
        { name: "/server", value: "Server info" },
        { name: "/user", value: "User info" },
        { name: "/links", value: "Community links" }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
const { REST, Routes } = require("discord.js");
require("dotenv").config();
const fs = require("fs");

const commands = [];
const commandFiles = fs.readdirSync("./slash").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./slash/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
{
  "name": "discord-bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "deploy": "node deploy-commands.js"
  },
  "dependencies": {
    "discord.js": "^14.14.0",
    "dotenv": "^16.3.1"
  }
}
npm install
node deploy-commands.js
node index.js
