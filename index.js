const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    StringSelectMenuBuilder, Events, MessageFlags 
} = require("discord.js");
const http = require("http");

// حل مشكلة منفذ (Port) منصة Render لمنع الـ Timed Out
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is alive!\n');
}).listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

const CONFIG = {
    LOG_CHANNEL: "1524441464828985384", 
    JAIL_ROLE: "1524441575118082068",
    MUTE_ROLE: "1524461582917308558", 
    ADMIN_ROLE: "1523692857657917440", 
    ADMIN_ROLE_2: "1524454208282300526", 
    MOD_ROLE: "1523722197510783116"     
};

const warningsDatabase = {}; 

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans
    ] 
});

client.once(Events.ClientReady, () => { 
    console.log(`=== System Online ===`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const msgContent = message.content.trim();
    const args = msgContent.split(/ +/);
    if (args.length === 0) return;

    // فحص صلاحيات المسؤولين أولاً
    const hasAdmin = message.member.roles.cache.has(CONFIG.ADMIN_ROLE) || message.member.roles.cache.has(CONFIG.ADMIN_ROLE_2);
    const hasMod = message.member.roles.cache.has(CONFIG.MOD_ROLE);
    if (!hasAdmin && !hasMod) return;

    const firstWord = args[0].toLowerCase();
    const lastWord = args[args.length - 1].toLowerCase();

    let activeCommand = null;

    // فحص الأوامر العادية وأوامر الإزالة
    if (["unmute", "ازاله_ميوت", "إزالة_ميوت"].includes(firstWord) || msgContent.startsWith("ازاله ميوت") || msgContent.startsWith("إزالة ميوت")) activeCommand = "unmute";
    else if (["unjail", "خروج_من_سجن", "خروج_من_السجن"].includes(firstWord) || msgContent.startsWith("خروج من سجن") || msgContent.startsWith("خروج من السجن")) activeCommand = "unjail";
    else if (["unban", "ازاله_باند", "إزالة_باند"].includes(firstWord) || msgContent.startsWith("ازاله باند") || msgContent.startsWith("إزالة باند")) activeCommand = "unban";
    else if (["unwarn", "ازاله_تحذير", "إزالة_تحذير"].includes(firstWord) || msgContent.startsWith("ازاله تحذير") || msgContent.startsWith("إزالة تحذير")) activeCommand = "unwarn";
    else if (["تحذيرات", "warnings"].includes(firstWord)) activeCommand = "warnings";
    
    // فحص صارم: يجب أن تكون رغبة المعاقبة صريحة (إما أول كلمة أو آخر كلمة فقط بالرسالة) لضمان عدم تداخلها مع الكلام
    else if (firstWord === "ميوت" || firstWord === "mute" || lastWord === "ميوت" || lastWord === "mute") activeCommand = "mute";
    else if (firstWord === "باند" || firstWord === "ban" || lastWord === "باند" || lastWord === "ban") activeCommand = "ban";
    else if (firstWord === "سجن" || firstWord === "jail" || lastWord === "سجن" || lastWord === "jail") activeCommand = "jail";
    else if (firstWord === "تحذير" || firstWord === "warn" || lastWord === "تحذير" || lastWord === "warn") activeCommand = "warn";

    if (!activeCommand) return;

    // استخراج الآيدي
    const idRegex = /\d{17,19}/;
    const matchedId = msgContent.match(idRegex);
    let targetId = matchedId ? matchedId[0] : null;

    // تنفيذ أوامر فك العقوبات
    if (activeCommand === "unmute") {
        if (!targetId) return message.reply("⚠️ يرجى كتابة آيدي العضو.");
        const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return message.reply("❌ لم يتم العثور على العضو في السيرفر.");
        await targetMember.roles.remove(CONFIG.MUTE_ROLE);
        return message.reply(`✅ تم إزالة رتبة الميوت عن <@${targetId}>`);
    }

    if (activeCommand === "unjail") {
        if (!hasAdmin) return; 
        if (!targetId) return message.reply("⚠️ يرجى كتابة آيدي العضو.");
        const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return message.reply("❌ لم يتم العثور على العضو في السيرفر.");
        await targetMember.roles.remove(CONFIG.JAIL_ROLE);
        return message.reply(`✅ تم إخراج <@${targetId}> من السجن.`);
    }

    if (activeCommand === "unban") {
        if (!hasAdmin) return; 
        if (!targetId) return message.reply("⚠️ يرجى كتابة آيدي العضو.");
        const unbanned = await message.guild.members.unban(targetId).catch(() => null);
        if (!unbanned) return message.reply("❌ العضو ليس متبنداً أو الآيدي خاطئ.");
        return message.reply(`✅ تم فك الباند عن الآيدي: ${targetId}`);
    }

    if (activeCommand === "unwarn") {
        if (!targetId) return message.reply("⚠️ يرجى كتابة آيدي العضو.");
        if (warningsDatabase[targetId] && warningsDatabase[targetId].length > 0) {
            warningsDatabase[targetId].pop(); 
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

    // تصفية رتب الإدارة للباند والسجن
    if ((activeCommand === "ban" || activeCommand === "jail") && !hasAdmin) return;

    const targetMember = message.mentions.members.first() || (targetId ? await message.guild.members.fetch(targetId).catch(() => null) : null);

    if (!targetMember) {
        let currentCommandName = activeCommand === "mute" ? "ميوت" : activeCommand === "ban" ? "باند" : activeCommand === "jail" ? "سجن" : "تحذير";
        return message.reply(`⚠️ يرجى تحديد العضو بشكل صحيح. مثال: \`${currentCommandName} 1197508804544315513\` أو \`1197508804544315513 ${currentCommandName}\``);
    }

    let selectMenu = new StringSelectMenuBuilder().setPlaceholder("قم بإختيار القانون المراد تطبيقه");
    let contentMessage = "";

    if (activeCommand === "mute") {
        contentMessage = `🤐 اختيار سبب الميوت لـ: ${targetMember}`;
        selectMenu.setCustomId(`mute_menu_${targetMember.id}`)
            .addOptions([
                { label: "إزعاج في الرومات الصوتية أو الشات", description: "العقوبة: إعطاء رتبة الميوت", value: "mute_role_reason1" },
                { label: "سب وشتم خفيف أو تكرار الكلام (سبام)", description: "العقوبة: إعطاء رتبة الميوت", value: "mute_role_reason2" },
                { label: "مخالفة القوانين بشكل متكرر", description: "العقوبة: إعطاء رتبة الميوت", value: "mute_role_reason3" }
            ]);
    }
    else if (activeCommand === "ban") {
        contentMessage = `🔨 اختيار سبب الباند لـ: ${targetMember}`;
        selectMenu.setCustomId(`ban_menu_${targetMember.id}`)
            .addOptions([
                { label: "نشر روابط تخريبية أو تهكير", description: "المدة: نهائي", value: "scam" },
                { label: "سب وقذف الأهل أو الذات الإلهية", description: "المدة: نهائي", value: "insult" },
                { label: "تخريب السيرفر بشكل متعمد", description: "المدة: نهائي", value: "raid" }
            ]);
    }
    else if (activeCommand === "jail") {
        contentMessage = `⛓️ اختيار سبب السجن لـ: ${targetMember}`;
        selectMenu.setCustomId(`jail_menu_${targetMember.id}`)
            .addOptions([
                { label: "إثارة المشاكل وعدم احترام الأعضاء", description: "المدة: حتى أمر الإدارة", value: "problems" },
                { label: "صناعة دراما ونزاعات بالعام", description: "المدة: حتى أمر الإدارة", value: "drama" }
            ]);
    }
    else if (activeCommand === "warn") {
        contentMessage = `⚠️ اختيار سبب التحذير لـ: ${targetMember}`;
        selectMenu.setCustomId(`warn_menu_${targetMember.id}`)
            .addOptions([
                { label: "مخالفة القوانين للمرة الأولى", description: "النوع: إضافة تحذير للسجل والإرسال خاص", value: "first_time" },
                { label: "إرسال صور أو مقاطع غير لائقة", description: "النوع: إضافة تحذير للسجل والإرسال خاص", value: "media" }
            ]);
    }

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await message.reply({ content: contentMessage, components: [row] });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    const customId = interaction.customId;
    const parts = customId.split("_");
    const menuType = parts[0]; 
    const targetId = parts[2];
    
    const hasAdmin = interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE) || interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE_2);
    const hasMod = interaction.member.roles.cache.has(CONFIG.MOD_ROLE);

    if (!hasAdmin && !hasMod) {
        return interaction.reply({ content: "❌ لا تملك الرتبة المطلوبة للتحكم في هذا المنيو.", flags: MessageFlags.Ephemeral });
    }

    if ((menuType === "ban" || menuType === "jail") && !hasAdmin) {
        return interaction.reply({ content: "❌ رتبتك لا تسمح بتنفيذ عمليات الباند والسجن.", flags: MessageFlags.Ephemeral });
    }

    const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember && menuType !== "ban") return interaction.reply({ content: "❌ لم يتم العثور على العضو.", flags: MessageFlags.Ephemeral });

    const logChannel = interaction.guild.channels.cache.get(CONFIG.LOG_CHANNEL);
    const selectedValue = interaction.values[0];
    const selectedLabel = interaction.component.options.find(o => o.value === selectedValue).label;

    let typeText = "";

    try {
        if (menuType === "mute") {
            await targetMember.roles.add(CONFIG.MUTE_ROLE);
            typeText = "mute";
            await interaction.reply({ content: `✅ تم إعطاء رتبة الميوت لـ ${targetMember} بناءً على: ${selectedLabel}` });
        }
        else if (menuType === "ban") {
            await interaction.guild.members.ban(targetId, { reason: selectedLabel });
            typeText = "ban";
            await interaction.reply({ content: `✅ تم تبنيد الآيدي ${targetId} نهائياً بسبب: ${selectedLabel}` });
        }
        else if (menuType === "jail") {
            await targetMember.roles.add(CONFIG.JAIL_ROLE);
            typeText = "jail";
            await interaction.reply({ content: `✅ تم سجن ${targetMember} بسبب: ${selectedLabel}` });
        }
        else if (menuType === "warn") {
            if (!warningsDatabase[targetId]) warningsDatabase[targetId] = [];
            warningsDatabase[targetId].push({
                reason: selectedLabel,
                admin: interaction.user.id,
                timestamp: Date.now()
            });

            typeText = `warn (${warningsDatabase[targetId].length})`;

            const dmEmbed = new EmbedBuilder()
                .setColor("#FFA500")
                .setTitle(`⚠️ لقد تلقيت تحذيراً جديداً!`)
                .setDescription(`مرحباً بك في سيرفر **${interaction.guild.name}**، نود إعلامك بأنه تم تسجيل تحذير رسمي بحقك بسبب مخالفتك للقوانين.`)
                .addFields(
                    { name: "السبب:", value: selectedLabel },
                    { name: "إجمالي تحذيراتك الحالية:", value: `${warningsDatabase[targetId].length}` }
                )
                .setFooter({ text: "يرجى الالتزام بالقوانين لتجنب العقوبات الأشد كالميوت أو السجن والباند." })
                .setTimestamp();

            const dmSuccess = await targetMember.send({ embeds: [dmEmbed] }).then(() => true).catch(() => false);
            const dmSentStatus = dmSuccess ? "📥 (تم إرسال التحذير بنجاح في الخاص)" : "🔒 (تعذر الإرسال - الخاص مقفل)";

            await interaction.reply({ content: `✅ تم تسجيل تحذير بحق ${targetMember} لـ: ${selectedLabel} ${dmSentStatus}` });
        }

        await interaction.message.delete().catch(() => {});

        if (logChannel) {
            const logMessage = `**type: ${typeText}**\n**member :** <@${targetId}>\n**admin :** <@${interaction.user.id}>\n**reason :** ${selectedLabel}`;
            logChannel.send({ content: logMessage });
        }

    } catch (err) {
        console.error(err);
        await interaction.reply({ content: "❌ حدث خطأ، تحقق من صلاحيات رتبة البوت وترتيبها وترتيب رتبة البوت بالسيرفر.", flags: MessageFlags.Ephemeral });
    }
});

client.login(process.env.TOKEN);
