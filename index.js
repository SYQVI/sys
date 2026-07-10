const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    StringSelectMenuBuilder, Events, MessageFlags, REST, Routes, SlashCommandBuilder
} = require("discord.js");
const http = require("http");

const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is alive!\n');
}).listen(port);

const CONFIG = {
    LOG_CHANNEL: "1524441464828985384", 
    JAIL_ROLE: "1524441575118082068",
    MUTE_ROLE: "1524461582917308558", 
    ADMIN_ROLE: "1523692857657917440", 
    ADMIN_ROLE_2: "1524454208282300526", 
    MOD_ROLE: "1523722197510783116",
    SLASH_ALLOWED_ROLE: "1524454076031696977"
};

const warningsDatabase = {}; 

const PUNISHMENT_REASONS = {
    mute: [
        { label: "القذف ، 120د", description: "العقوبة: ميوت للمدة المحددة", value: "القذف_120" },
        { label: "السب ، 60د", description: "العقوبة: ميوت للمدة المحددة", value: "السب_60" },
        { label: "طاري الاهل ، 60د", description: "العقوبة: ميوت للمدة المحددة", value: "طاري الاهل_60" },
        { label: "ايحاءات جنسية ، 30د", description: "العقوبة: ميوت للمدة المحددة", value: "ايحاءات جنسية_30" },
        { label: "مشاكل ، 15د", description: "العقوبة: ميوت للمدة المحددة", value: "مشاكل_15" }
    ],
    ban: [
        { label: "نشر روابط تخريبية أو تهكير", description: "المدة: نهائي", value: "scam_نهائي" },
        { label: "سب وقذف الذات الإلهية", description: "المدة: نهائي", value: "insult_نهائي" },
        { label: "تخريب السيرفر بشكل متعمد", description: "المدة: نهائي", value: "raid_نهائي" }
    ],
    jail: [
        { label: "إثارة المشاكل والنزاعات", description: "المدة: حتى أمر الإدارة", value: "problems_حتى أمر الإدارة" },
        { label: "صناعة دراما بالعام", description: "المدة: حتى أمر الإدارة", value: "drama_حتى أمر الإدارة" }
    ],
    warn: [
        { label: "مخالفة القوانين للمرة الأولى", description: "إضافة تحذير للسجل", value: "first_time_تحذير" },
        { label: "إرسال صور غير لائقة", description: "إضافة تحذير للسجل", value: "media_تحذير" }
    ]
};

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans
    ] 
});

client.once(Events.ClientReady, async () => { 
    const commands = [
        new SlashCommandBuilder()
            .setName("اضف_سبب")
            .setDescription("إضافة سبب جديد لقائمة العقوبات التفاعلية (خاص برتبة محددة)")
            .addStringOption(option => 
                option.setName("نوع_العقوبة")
                    .setDescription("اختر نوع العقوبة")
                    .setRequired(true)
                    .addChoices(
                        { name: "ميوت", value: "mute" },
                        { name: "باند", value: "ban" },
                        { name: "سجن", value: "jail" },
                        { name: "تحذير", value: "warn" }
                    )
            )
            .addStringOption(option => option.setName("السبب").setDescription("اكتب السبب الجديد").setRequired(true))
            .addStringOption(option => option.setName("المدة").setDescription("اكتب مدة العقوبة").setRequired(false)),

        new SlashCommandBuilder()
            .setName("حذف_سبب")
            .setDescription("حذف سبب من قائمة العقوبات التفاعلية (خاص برتبة محددة)")
            .addStringOption(option => 
                option.setName("نوع_العقوبة")
                    .setDescription("اختر نوع العقوبة المراد حذف سبب منها")
                    .setRequired(true)
                    .addChoices(
                        { name: "ميوت", value: "mute" },
                        { name: "باند", value: "ban" },
                        { name: "سجن", value: "jail" },
                        { name: "تحذير", value: "warn" }
                    )
            )
            .addStringOption(option => option.setName("كلمة_من_السبب").setDescription("اكتب كلمة موجودة في السبب").setRequired(true))
    ];

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
    } catch (error) {
        console.error(error);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const hasSlashRole = interaction.member.roles.cache.has(CONFIG.SLASH_ALLOWED_ROLE);
    if (!hasSlashRole) {
        return interaction.reply({ content: "❌ هذا الأمر مخصص فقط لأصحاب الصلاحيات العليا ولا يمكنك استخدامه.", flags: MessageFlags.Ephemeral });
    }

    if (interaction.commandName === "اضف_سبب") {
        const type = interaction.options.getString("نوع_العقوبة");
        const reasonName = interaction.options.getString("السبب").trim();
        const duration = type === "warn" ? "تحذير" : (interaction.options.getString("المدة") || "نهائي");

        let displayLabel = type === "warn" ? reasonName : `${reasonName} ، ${duration}`;
        let uniqueValue = `${reasonName.substring(0,10)}_${duration}_${Date.now().toString().slice(-4)}`;

        PUNISHMENT_REASONS[type].push({
            label: displayLabel,
            description: `عقوبة مخصصة مضافة بواسطة الإدارة العليا`,
            value: uniqueValue
        });

        let typeTextAr = type === "mute" ? "ميوت" : type === "ban" ? "باند" : type === "jail" ? "سجن" : "تحذير";
        return interaction.reply({ content: `✅ تم إضافة السبب الجديد بنجاح إلى قائمة الـ **${typeTextAr}**:\n📝 \`${displayLabel}\`` });
    }

    if (interaction.commandName === "حذف_سبب") {
        const type = interaction.options.getString("نوع_العقوبة");
        const searchWord = interaction.options.getString("كلمة_من_السبب").toLowerCase().trim();
        const initialLength = PUNISHMENT_REASONS[type].length;

        PUNISHMENT_REASONS[type] = PUNISHMENT_REASONS[type].filter(item => !item.label.toLowerCase().includes(searchWord));

        let typeTextAr = type === "mute" ? "ميوت" : type === "ban" ? "باند" : type === "jail" ? "سجن" : "تحذير";
        if (PUNISHMENT_REASONS[type].length < initialLength) {
            return interaction.reply({ content: `✅ تم حذف الأسباب التي تحتوي على الكلمة \`${searchWord}\` من قائمة الـ **${typeTextAr}**.` });
        } else {
            return interaction.reply({ content: `❌ لم يتم العثور على أي سبب يحتوي على الكلمة \`${searchWord}\` في القائمة.`, flags: MessageFlags.Ephemeral });
        }
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const msgContent = message.content.trim();
    const args = msgContent.split(/ +/);
    if (args.length === 0) return;

    const hasAdmin = message.member.roles.cache.has(CONFIG.ADMIN_ROLE) || message.member.roles.cache.has(CONFIG.ADMIN_ROLE_2);
    const hasMod = message.member.roles.cache.has(CONFIG.MOD_ROLE);
    if (!hasAdmin && !hasMod) return;

    const firstWord = args[0].toLowerCase();
    const lastWord = args[args.length - 1].toLowerCase();

    let activeCommand = null;

    if (["unmute", "ازاله_ميوت", "إزالة_ميوت"].includes(firstWord) || msgContent.startsWith("ازاله ميوت") || msgContent.startsWith("إزالة ميوت")) activeCommand = "unmute";
    else if (["unjail", "خروج_من_سجن", "خروج_من_السجن"].includes(firstWord) || msgContent.startsWith("خروج من سجن") || msgContent.startsWith("خروج من السجن")) activeCommand = "unjail";
    else if (["unban", "ازاله_باند", "إزالة_باند"].includes(firstWord) || msgContent.startsWith("ازاله باند") || msgContent.startsWith("إزالة باند")) activeCommand = "unban";
    else if (["unwarn", "ازاله_تحذير", "إزالة_تحذير"].includes(firstWord) || msgContent.startsWith("ازاله تحذير") || msgContent.startsWith("إزالة تحذير")) activeCommand = "unwarn";
    else if (["تحذيرات", "warnings"].includes(firstWord)) activeCommand = "warnings";
    else if (firstWord === "ميوت" || firstWord === "mute" || lastWord === "ميوت" || lastWord === "mute") activeCommand = "mute";
    else if (firstWord === "باند" || firstWord === "ban" || lastWord === "باند" || lastWord === "ban") activeCommand = "ban";
    else if (firstWord === "سجن" || firstWord === "jail" || lastWord === "سجن" || lastWord === "jail") activeCommand = "jail";
    else if (firstWord === "تحذير" || firstWord === "warn" || lastWord === "تحذير" || lastWord === "warn") activeCommand = "warn";

    if (!activeCommand) return;

    const idRegex = /\d{17,19}/;
    const matchedId = msgContent.match(idRegex);
    let targetId = matchedId ? matchedId[0] : null;

    const logChannel = message.guild.channels.cache.get(CONFIG.LOG_CHANNEL);

    if (activeCommand === "unmute") {
        if (!targetId) return message.reply("⚠️ يرجى كتابة آيدي العضو.");
        const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return message.reply("❌ لم يتم العثور على العضو في السيرفر.");
        await targetMember.roles.remove(CONFIG.MUTE_ROLE);
        
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor("#2ECC71")
                .setTitle("🔊 فك كتم الصوت | يدوي")
                .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: "👤 العضو المحرر:", value: `<@${targetId}> \`(${targetId})\``, inline: false },
                    { name: "🛠️ بواسطة الإداري:", value: `<@${message.author.id}>`, inline: true }
                )
                .setTimestamp();
            logChannel.send({ embeds: [embed] });
        }
        return message.reply(`✅ تم إزاله الميوت عن <@${targetId}>`);
    }

    if (activeCommand === "unjail") {
        if (!hasAdmin) return; 
        if (!targetId) return message.reply("⚠️ يرجى كتابة آيدي العضو.");
        const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return message.reply("❌ لم يتم العثور على العضو في السيرفر.");
        await targetMember.roles.remove(CONFIG.JAIL_ROLE);

        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor("#2ECC71")
                .setTitle("🔓 إخراج من السجن | يدوي")
                .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: "👤 العضو المحرر:", value: `<@${targetId}> \`(${targetId})\``, inline: false },
                    { name: "🛠️ بواسطة الإداري:", value: `<@${message.author.id}>`, inline: true }
                )
                .setTimestamp();
            logChannel.send({ embeds: [embed] });
        }
        return message.reply(`✅ تم إخراج <@${targetId}> من السجن.`);
    }

    if (activeCommand === "unban") {
        if (!hasAdmin) return; 
        if (!targetId) return message.reply("⚠️ يرجى كتابة آيدي العضو.");
        const unbanned = await message.guild.members.unban(targetId).catch(() => null);
        if (!unbanned) return message.reply("❌ العضو ليس متبنداً أو الآيدي خاطئ.");

        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor("#2ECC71")
                .setTitle("✈️ فك حظر السيرفر | يدوي")
                .addFields(
                    { name: "🆔 الآيدي المحرر:", value: `\`${targetId}\``, inline: false },
                    { name: "🛠️ بواسطة الإداري:", value: `<@${message.author.id}>`, inline: true }
                )
                .setTimestamp();
            logChannel.send({ embeds: [embed] });
        }
        return message.reply(`✅ تم فك الباند عن الآيدي: ${targetId}`);
    }

    if (activeCommand === "unwarn") {
        if (!targetId) return message.reply("⚠️ يرجى كتابة آيدي العضو.");
        if (warningsDatabase[targetId] && warningsDatabase[targetId].length > 0) {
            warningsDatabase[targetId].pop(); 

            if (logChannel) {
                const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
                const embed = new EmbedBuilder()
                    .setColor("#2ECC71")
                    .setTitle("🛡️ إزالة تحذير رسمي")
                    .addFields(
                        { name: "👤 العضو المشمول:", value: `<@${targetId}>`, inline: true },
                        { name: "🛠️ بواسطة الإداري:", value: `<@${message.author.id}>`, inline: true },
                        { name: "📊 سجل التحذيرات المتبقي:", value: `\`${warningsDatabase[targetId].length}\` تحذير`, inline: false }
                    )
                    .setTimestamp();
                if (targetMember) embed.setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }));
                logChannel.send({ embeds: [embed] });
            }
            return message.reply(`✅ تم حذف آخر تحذير للعضو. المتبقي له: ${warningsDatabase[targetId].length}`);
        } else {
            return message.reply("❌ هذا العضو ليس لديه أي تحذيرات سابقة.");
        }
    }

    if (activeCommand === "warnings") {
        if (!targetId) return message.reply("⚠️ يرجى كتابة آيدي العضو لعرض تحذيراته.");
        const userWarns = warningsDatabase[targetId] || [];
        if (userWarns.length === 0) {
            return message.reply("ℹ️ هذا العضو لا يوجد لديه أي تحذيرات سابقة.");
        }
        const embed = new EmbedBuilder()
            .setColor("#FFA500")
            .setTitle(`قائمة التحذيرات السابقة للآيدي: ${targetId}`)
            .setDescription(userWarns.map((w, index) => `**${index + 1}.** ${w.reason} | بواسطة: <@${w.admin}>`).join("\n"))
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    if ((activeCommand === "ban" || activeCommand === "jail") && !hasAdmin) return;

    const targetMember = message.mentions.members.first() || (targetId ? await message.guild.members.fetch(targetId).catch(() => null) : null);

    if (!targetMember) {
        let currentCommandName = activeCommand === "mute" ? "
