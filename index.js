const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    StringSelectMenuBuilder, Events, MessageFlags, REST, Routes, SlashCommandBuilder
} = require("discord.js");
const http = require("http");
const fs = require("fs");
const path = require("path");

// مسار ثابت لملف الـ JSON
const DB_PATH = path.join(__dirname, "warns_database.json");

// دالة لجلب البيانات من الملف
function getWarnsData() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, JSON.stringify({}));
        }
        const fileContent = fs.readFileSync(DB_PATH, "utf8");
        return JSON.parse(fileContent || "{}");
    } catch (error) {
        console.error("خطأ في قراءة قاعدة البيانات:", error);
        return {};
    }
}

// دالة لحفظ البيانات في الملف فوراُ
function saveWarnsData(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("خطأ في حفظ قاعدة البيانات:", error);
    }
}

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
    console.log(`✅ البوت جاهز وشغال باستخدام نظام ملفات JSON الثابت!`);
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
                .setTitle("🔊 فك الميوت | يدوي")
                .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: "👤 العضو المحرر:", value: `<@${targetId}> \`(${targetId})\``, inline: false },
                    { name: "🛠️ بواسطة الإداري:", value: `<@${message.author.id}>`, inline: false }
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
                    { name: "🛠️ بواسطة الإداري:", value: `<@${message.author.id}>`, inline: false }
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
                    { name: "🛠️ بواسطة الإداري:", value: `<@${message.author.id}>`, inline: false }
                )
                .setTimestamp();
            logChannel.send({ embeds: [embed] });
        }
        return message.reply(`✅ تم فك الباند عن الآيدي: ${targetId}`);
    }

    if (activeCommand === "unwarn") {
        if (!targetId) return message.reply("⚠️ يرجى كتابة آيدي العضو.");
        
        let allData = getWarnsData();
        let userWarns = allData[targetId] || [];

        if (userWarns.length > 0) {
            userWarns.pop(); 
            allData[targetId] = userWarns;
            saveWarnsData(allData);

            if (logChannel) {
                const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
                const embed = new EmbedBuilder()
                    .setColor("#2ECC71")
                    .setTitle("🛡️ إزالة تحذير رسمي")
                    .addFields(
                        { name: "👤 العضو المشمول:", value: `<@${targetId}>`, inline: false },
                        { name: "🛠️ بواسطة الإداري:", value: `<@${message.author.id}>`, inline: false },
                        { name: "📊 سجل التحذيرات المتبقي:", value: `\`${userWarns.length}\` تحذير`, inline: false }
                    )
                    .setTimestamp();
                if (targetMember) embed.setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }));
                logChannel.send({ embeds: [embed] });
            }
            return message.reply(`✅ تم حذف آخر تحذير للعضو. المتبقي له: ${userWarns.length}`);
        } else {
            return message.reply("❌ هذا العضو ليس لديه أي تحذيرات سابقة في قاعدة البيانات.");
        }
    }

    if (activeCommand === "warnings") {
        if (!targetId) return message.reply("⚠️ يرجى كتابة آيدي العضو لعرض تحذيراته.");
        
        const allData = getWarnsData();
        const userWarns = allData[targetId] || [];

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
        let currentCommandName = activeCommand === "mute" ? "ميوت" : activeCommand === "ban" ? "باند" : activeCommand === "jail" ? "سجن" : "تحذير";
        return message.reply(`⚠️ يرجى تحديد العضو بشكل صحيح. مثال: \`${currentCommandName} 1197508804544315513\` أو \`1197508804544315513 ${currentCommandName}\``);
    }

    const isTargetAdminOrMod = targetMember.roles.cache.has(CONFIG.ADMIN_ROLE) || 
                               targetMember.roles.cache.has(CONFIG.ADMIN_ROLE_2) || 
                               targetMember.roles.cache.has(CONFIG.MOD_ROLE) ||
                               targetMember.roles.cache.has(CONFIG.SLASH_ALLOWED_ROLE);

    if (isTargetAdminOrMod) {
        return message.reply("❌ ** خطأ:** لا يمكنك إعطاء عقوبة لأحد أفراد طاقم الإدارة أو العليا!");
    }

    if (!PUNISHMENT_REASONS[activeCommand] || PUNISHMENT_REASONS[activeCommand].length === 0) {
        return message.reply(`❌ لا توجد أي أسباب مضافة لقائمة الـ **${activeCommand}** حالياً. استخدم أمر \`/اضف_سبب\` أولاً.`);
    }

    let selectMenu = new StringSelectMenuBuilder().setPlaceholder("اضغط لأختيار السبب لتنفيذ العقوبة");
    let contentMessage = `<@${targetMember.id}> , رجاءً قم بأختيار السبب المخصص`;

    if (activeCommand === "mute") {
        selectMenu.setCustomId(`mutemenu_${targetMember.id}`).addOptions(PUNISHMENT_REASONS.mute);
    } else if (activeCommand === "ban") {
        selectMenu.setCustomId(`banmenu_${targetMember.id}`).addOptions(PUNISHMENT_REASONS.ban);
    } else if (activeCommand === "jail") {
        selectMenu.setCustomId(`jailmenu_${targetMember.id}`).addOptions(PUNISHMENT_REASONS.jail);
    } else if (activeCommand === "warn") {
        selectMenu.setCustomId(`warnmenu_${targetMember.id}`).addOptions(PUNISHMENT_REASONS.warn);
    }

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await message.reply({ content: contentMessage, components: [row] });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    const customId = interaction.customId;
    const logChannel = interaction.guild.channels.cache.get(CONFIG.LOG_CHANNEL);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const hasAdmin = interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE) || interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE_2);
    const hasMod = interaction.member.roles.cache.has(CONFIG.MOD_ROLE);

    if (customId.startsWith("mutemenu_")) {
        if (!hasAdmin && !hasMod) return interaction.reply({ content: "❌ لا تملك الرتبة المطلوبة لاستخدام منيو الميوت.", flags: MessageFlags.Ephemeral });
        
        const targetId = customId.split("_")[1];
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return interaction.reply({ content: "❌ لم يتم العثور على العضو لتطبيق الميوت.", flags: MessageFlags.Ephemeral });

        const selectedValue = interaction.values[0];
        const selectedOption = interaction.component.options.find(o => o.value === selectedValue);
        const cleanReason = selectedOption.label.split("،")[0].trim();
        const durationText = selectedOption.label.split("،")[1] ? selectedOption.label.split("،")[1].trim() : "نهائي";

        let durationMs = 0;
        const timeMatch = selectedValue.match(/_(\d+)/) || durationText.match(/(\d+)\s*د/);
        if (timeMatch) durationMs = parseInt(timeMatch[1], 10) * 60 * 1000;

        await targetMember.roles.add(CONFIG.MUTE_ROLE);
        await interaction.reply({ content: `✅ تم تطبيق عقوبة كتم الصوت (ميوت) بنجاح على ${targetMember}.` });
        await interaction.message.delete().catch(() => {});

        if (logChannel) {
            const muteEmbed = new EmbedBuilder()
                .setColor("#E67E22")
                .setTitle("🔇 تسجيل عقوبة: ميوت ")
                .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: "👤 العضو المستهدف:", value: `<@${targetId}> \`(${targetId})\``, inline: false },
                    { name: "🛠️ الإداري المسؤول:", value: `${interaction.user}`, inline: false },
                    { name: "⏳ المدة المحددة:", value: `\`${durationText}\``, inline: false },
                    { name: "⏱️ توقيت المخالفة:", value: `<t:${currentTimestamp}:R>`, inline: false },
                    { name: "📝 سبب العقوبة المباشر:", value: `\`\`\`yaml\n${cleanReason}\n\`\`\``, inline: false }
                )
                .setFooter({ text: "developed by @f52k CTO" })
                .setTimestamp();
            logChannel.send({ embeds: [muteEmbed] });
        }

        if (durationMs > 0) {
            setTimeout(async () => {
                const memberCheck = await interaction.guild.members.fetch(targetId).catch(() => null);
                if (memberCheck && memberCheck.roles.cache.has(CONFIG.MUTE_ROLE)) {
                    await memberCheck.roles.remove(CONFIG.MUTE_ROLE).catch(() => {});
                    if (logChannel) {
                        const autoUnmuteEmbed = new EmbedBuilder()
                            .setColor("#2ECC71")
                            .setTitle("⏰ انتهاء مدة العقوبة | ميوت")
                            .setThumbnail(memberCheck.user.displayAvatarURL({ dynamic: true }))
                            .setDescription(`⏱️ تم إلغاء كتم الصوت عن العضو وإعادة صلاحيات التحدث بالكامل نظراً لانتهاء المدة الزمنية الخاصة بعقوبته وهي (\`${durationText}\`).`)
                            .addFields(
                                { name: "👤 العضو المشمول:", value: `<@${targetId}>`, inline: false },
                                { name: "🤖 النظام:", value: `${client.user}`, inline: false }
                            )
                            .setTimestamp();
                        logChannel.send({ embeds: [autoUnmuteEmbed] });
                    }
                }
            }, durationMs);
        }
    }

    if (customId.startsWith("banmenu_")) {
        if (!hasAdmin) return interaction.reply({ content: "❌ رتبتك الحالية لا تملك صلاحية استخدام منيو الباند النهائي.", flags: MessageFlags.Ephemeral });
        
        const targetId = customId.split("_")[1];
        const selectedValue = interaction.values[0];
        const selectedOption = interaction.component.options.find(o => o.value === selectedValue);
        const cleanReason = selectedOption.label.split("،")[0].trim();

        await interaction.guild.members.ban(targetId, { reason: cleanReason });
        await interaction.reply({ content: `✅ تم حظر وحذف الآيدي \`${targetId}\` من السيرفر نهائياً.` });
        await interaction.message.delete().catch(() => {});

        if (logChannel) {
            const banEmbed = new EmbedBuilder()
                .setColor("#E74C3C")
                .setTitle("✈️ تسجيل طرد وعقوبة: حظر نهائي (باند)")
                .addFields(
                    { name: "👤 العضو المحظور:", value: `<@${targetId}> \`(${targetId})\``, inline: false },
                    { name: "🛠️ الإداري المسؤول:", value: `${interaction.user}`, inline: false },
                    { name: "⏳ المدة المقررة:", value: `\`نهائي دون رجعة\``, inline: false },
                    { name: "⏱️ توقيت الحظر:", value: `<t:${currentTimestamp}:R>`, inline: false },
                    { name: "📝 وبناءً على ذلك السبب القاطع:", value: `\`\`\`yaml\n${cleanReason}\n\`\`\``, inline: false }
                )
                .setFooter({ text: "developed by @f52k CTO" })
                .setTimestamp();
            logChannel.send({ embeds: [banEmbed] });
        }
    }

    if (customId.startsWith("jailmenu_")) {
        if (!hasAdmin) return interaction.reply({ content: "❌ عذراً، منيو السجن مخصص فقط لأصحاب الصلاحيات الإدارية العليا.", flags: MessageFlags.Ephemeral });
        
        const targetId = customId.split("_")[1];
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return interaction.reply({ content: "❌ لم يتم العثور على العضو لتطبيق السجن عليه.", flags: MessageFlags.Ephemeral });

        const selectedValue = interaction.values[0];
        const selectedOption = interaction.component.options.find(o => o.value === selectedValue);
        const cleanReason = selectedOption.label.split("،")[0].trim();
        const durationText = selectedOption.label.split("،")[1] ? selectedOption.label.split("،")[1].trim() : "حتى أمر الإدارة";

        let durationMs = 0;
        const timeMatch = selectedValue.match(/_(\d+)/) || durationText.match(/(\d+)\s*د/);
        if (timeMatch) durationMs = parseInt(timeMatch[1], 10) * 60 * 1000;

        await targetMember.roles.add(CONFIG.JAIL_ROLE);
        await interaction.reply({ content: `✅ تم سجن العضو بنجاح ونقله لغرفة السجن الإداري.` });
        await interaction.message.delete().catch(() => {});

        if (logChannel) {
            const jailEmbed = new EmbedBuilder()
                .setColor("#9B59B6")
                .setTitle("🚨 تسجيل عقوبة: سجن إداري وعزل رتب")
                .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: "👤 العضو المسجون:", value: `<@${targetId}> \`(${targetId})\``, inline: false },
                    { name: "🛠️ الإداري المسؤول:", value: `${interaction.user}`, inline: false },
                    { name: "⏳ مدة الاحتجاز:", value: `\`${durationText}\``, inline: false },
                    { name: "⏱️ توقيت السجن:", value: `<t:${currentTimestamp}:R>`, inline: false },
                    { name: "📝 سبب الحجز وعزل الصلاحيات:", value: `\`\`\`yaml\n${cleanReason}\n\`\`\``, inline: false }
                )
                .setFooter({ text: "developed by @f52k CTO" })
                .setTimestamp();
            logChannel.send({ embeds: [jailEmbed] });
        }

        if (durationMs > 0) {
            setTimeout(async () => {
                const memberCheck = await interaction.guild.members.fetch(targetId).catch(() => null);
                if (memberCheck && memberCheck.roles.cache.has(CONFIG.JAIL_ROLE)) {
                    await memberCheck.roles.remove(CONFIG.JAIL_ROLE).catch(() => {});
                    if (logChannel) {
                        const autoUnjailEmbed = new EmbedBuilder()
                            .setColor("#2ECC71")
                            .setTitle("⏰ انتهاء مدة الحجز | سجن تلقائي")
                            .setThumbnail(memberCheck.user.displayAvatarURL({ dynamic: true }))
                            .setDescription(`⏱️ تم الإفراج عن العضو تلقائياً وفك القيود عنه بعد انقضاء كامل مدة العقوبة المحكوم بها وهي (\`${durationText}\`).`)
                            .addFields(
                                { name: "👤 العضو المفرج عنه:", value: `<@${targetId}>`, inline: false },
                                { name: "🤖 النظام والتأمين تلقائي:", value: `${client.user}`, inline: false }
                            )
                            .setTimestamp();
                        logChannel.send({ embeds: [autoUnjailEmbed] });
                    }
                }
            }, durationMs);
        }
    }

    if (customId.startsWith("warnmenu_")) {
        if (!hasAdmin && !hasMod) return interaction.reply({ content: "❌ لا تملك الرتبة المطلوبة لتسجيل التحذيرات.", flags: MessageFlags.Ephemeral });
        
        const targetId = customId.split("_")[1];
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return interaction.reply({ content: "❌ تعذر العثور على العضو لإرسال التحذير.", flags: MessageFlags.Ephemeral });

        const selectedValue = interaction.values[0];
        const selectedOption = interaction.component.options.find(o => o.value === selectedValue);
        const cleanReason = selectedOption.label.split("،")[0].trim();

        let allData = getWarnsData();
        let userWarns = allData[targetId] || [];

        userWarns.push({
            reason: cleanReason,
            admin: interaction.user.id,
            timestamp: Date.now()
        });

        allData[targetId] = userWarns;
        saveWarnsData(allData);

        const totalWarns = userWarns.length;

        const dmEmbed = new EmbedBuilder()
            .setColor("#FFA500")
            .setTitle(`⚠️ لقد تلقيت تحذيراً جديداً!`)
            .setDescription(`مرحباً بك في سيرفر **${interaction.guild.name}**، نود إعلامك بأنه تم تسجيل تحذير رسمي بحقك بسبب مخالفتك للقوانين.`)
            .addFields(
                { name: "السبب الرئيسي:", value: cleanReason, inline: false },
                { name: "مجموع تحذيراتك الحالي بالمخدم:", value: `\`${totalWarns}\` تحذيرات`, inline: false }
            )
            .setFooter({ text: "يرجى الالتزام التام بالقوانين لتجنب العقوبات الأشد كالميوت أو السجن والباند النهائي." })
            .setTimestamp();

        await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});
        await interaction.reply({ content: `✅ تم تسجيل تحذير بحق ${targetMember} لـ: ${cleanReason}` });
        await interaction.message.delete().catch(() => {});

        if (logChannel) {
            const warnEmbed = new EmbedBuilder()
                .setColor("#F1C40F")
                .setTitle(`⚠️ تسجيل مخالفة: تحذير رسمي رقم (${totalWarns})`)
                .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: "👤 العضو المنذر:", value: `<@${targetId}> \`(${targetId})\``, inline: false },
                    { name: "🛠️ الإداري المنذر:", value: `${interaction.user}`, inline: false },
                    { name: "📊 المجموع التراكمي:", value: `\`${totalWarns}\` تحذيرات`, inline: false },
                    { name: "⏱️ تاريخ التنبيه:", value: `<t:${currentTimestamp}:R>`, inline: false },
                    { name: "📝 فحوى ونوع المخالفة المسجلة:", value: `\`\`\`yaml\n${cleanReason}\n\`\`\``, inline: false }
                )
                .setFooter({ text: "developed by @f52k CTO" })
                .setTimestamp();
            logChannel.send({ embeds: [warnEmbed] });
        }
    }
});

client.login(process.env.TOKEN);
