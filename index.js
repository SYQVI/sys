const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    StringSelectMenuBuilder, Events 
} = require("discord.js");

const CONFIG = {
    LOG_CHANNEL: "1524441464828985384", 
    JAIL_ROLE: "1524441575118082068",
    ADMIN_ROLE: "1523692857657917440", 
    ADMIN_ROLE_2: "1524454208282300526", 
    MOD_ROLE: "1523722197510783116"     
};

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

client.once(Events.ClientReady, () => { 
    console.log(`=== System Online ===`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const msgContent = message.content.trim();

    const isMute = msgContent.includes("mute") || msgContent.includes("ميوت");
    const isBan = msgContent.includes("ban") || msgContent.includes("باند");
    const isJail = msgContent.includes("jail") || msgContent.includes("سجن");
    const isWarn = msgContent.includes("warn") || msgContent.includes("تحذير");

    if (!isMute && !isBan && !isJail && !isWarn) return;

    const hasAdmin = message.member.roles.cache.has(CONFIG.ADMIN_ROLE) || message.member.roles.cache.has(CONFIG.ADMIN_ROLE_2);
    const hasMod = message.member.roles.cache.has(CONFIG.MOD_ROLE);

    if (!hasAdmin && !hasMod) return;
    if ((isBan || isJail) && !hasAdmin) return;

    const idRegex = /\d{17,19}/;
    const matchedId = msgContent.match(idRegex);
    
    let targetMember = null;
    if (message.mentions.members.first()) {
        targetMember = message.mentions.members.first();
    } else if (matchedId) {
        targetMember = await message.guild.members.fetch(matchedId[0]).catch(() => null);
    }

    if (!targetMember) {
        let currentCommand = isMute ? "ميوت" : isBan ? "باند" : isJail ? "سجن" : "تحذير";
        return message.reply(`⚠️ يرجى تحديد العضو بشكل صحيح. مثال: \`${currentCommand} 1197508804544315513\``);
    }

    let selectMenu = new StringSelectMenuBuilder().setPlaceholder("قم بإختيار القانون المراد تطبيقه");
    let contentMessage = "";

    if (isMute) {
        contentMessage = `🤐 اختيار مدة وسبب الميوت لـ: ${targetMember}`;
        selectMenu.setCustomId(`mute_menu_${targetMember.id}`)
            .addOptions([
                { label: "إزعاج في الرومات الصوتية أو الشات", description: "المدة: 10 دقائق (تايم آوت تلقائي)", value: "10" },
                { label: "سب وشتم خفيف أو تكرار الكلام (سبام)", description: "المدة: 1 ساعة", value: "60" },
                { label: "مخالفة القوانين بشكل متكرر", description: "المدة: 1 يوم كامل", value: "1440" }
            ]);
    }
    else if (isBan) {
        contentMessage = `🔨 اختيار سبب الباند لـ: ${targetMember}`;
        selectMenu.setCustomId(`ban_menu_${targetMember.id}`)
            .addOptions([
                { label: "نشر روابط تخريبية أو تهكير", description: "المدة: نهائي (طرد وباند كامل)", value: "scam" },
                { label: "سب وقذف الأهل أو الذات الإلهية", description: "المدة: نهائي (طرد وباند كامل)", value: "insult" },
                { label: "تخريب السيرفر بشكل متعمد", description: "المدة: نهائي (طرد وباند كامل)", value: "raid" }
            ]);
    }
    else if (isJail) {
        contentMessage = `⛓️ اختيار سبب السجن لـ: ${targetMember}`;
        selectMenu.setCustomId(`jail_menu_${targetMember.id}`)
            .addOptions([
                { label: "إثارة المشاكل وعدم احترام الأعضاء", description: "المدة: حتى أمر الإدارة (رتبة السجن)", value: "problems" },
                { label: "صناعة دراما ونزاعات بالعام", description: "المدة: حتى أمر الإدارة (رتبة السجن)", value: "drama" }
            ]);
    }
    else if (isWarn) {
        contentMessage = `⚠️ اختيار سبب التحذير لـ: ${targetMember}`;
        selectMenu.setCustomId(`warn_menu_${targetMember.id}`)
            .addOptions([
                { label: "مخالفة القوانين للمرة الأولى", description: "المدة: أبدي (تسجيل في اللوج)", value: "first_time" },
                { label: "إرسال صور أو مقاطع غير لائقة", description: "المدة: أبدي (تسجيل في اللوج)", value: "media" }
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
        return interaction.reply({ content: "❌ لا تملك الرتبة المطلوبة للتحكم في هذا المنيو.", ephemeral: true });
    }

    if ((menuType === "ban" || menuType === "jail") && !hasAdmin) {
        return interaction.reply({ content: "❌ رتبتك لا تسمح بتنفيذ عمليات الباند والسجن.", ephemeral: true });
    }

    const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) return interaction.reply({ content: "❌ لم يتم العثور على العضو.", ephemeral: true });

    const logChannel = interaction.guild.channels.cache.get(CONFIG.LOG_CHANNEL);
    const selectedValue = interaction.values[0];
    const selectedLabel = interaction.component.options.find(o => o.value === selectedValue).label;

    let actionText = "";
    let color = "#000000";

    try {
        if (menuType === "mute") {
            const minutes = parseInt(selectedValue);
            await targetMember.timeout(minutes * 60 * 1000, selectedLabel);
            actionText = `🤐 ميوت لمدة ${minutes} دقائق`;
            color = "#FFFF00";
            await interaction.reply({ content: `✅ تم إعطاء ميوت لـ ${targetMember} بناءً على: ${selectedLabel}` });
        }
        else if (menuType === "ban") {
            await targetMember.ban({ reason: selectedLabel });
            actionText = "🔨 باند نهائي";
            color = "#FF0000";
            await interaction.reply({ content: `✅ تم تبنيد ${targetMember.user.username} نهائياً بسبب: ${selectedLabel}` });
        }
        else if (menuType === "jail") {
            const jailRole = interaction.guild.roles.cache.get(CONFIG.JAIL_ROLE);
            if (jailRole) await targetMember.roles.add(jailRole);
            actionText = "⛓️ سجن (Jail)";
            color = "#8B0000";
            await interaction.reply({ content: `✅ تم سجن ${targetMember} بسبب: ${selectedLabel}` });
        }
        else if (menuType === "warn") {
            actionText = "⚠️ تحذير (Warn)";
            color = "#FFA500";
            await interaction.reply({ content: `✅ تم تسجيل تحذير بحق ${targetMember} لـ: ${selectedLabel}` });
        }

        await interaction.message.delete().catch(() => {});

        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`عقوبة مستقلة: ${actionText}`)
                .addFields(
                    { name: "العضو المستهدف:", value: `${targetMember.user.tag} (${targetMember.id})`, inline: true },
                    { name: "الإداري المسؤول:", value: `${interaction.user.tag}`, inline: true },
                    { name: "السبب المختار:", value: selectedLabel }
                ).setTimestamp();
            logChannel.send({ embeds: [logEmbed] });
        }

    } catch (err) {
        console.error(err);
        await interaction.reply({ content: "❌ حدث خطأ، تحقق من صلاحيات رتبة البوت.", ephemeral: true });
    }
});

client.login(process.env.TOKEN);
