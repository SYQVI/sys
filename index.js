const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    StringSelectMenuBuilder, Events, PermissionFlagsBits 
} = require("discord.js");

// الإعدادات الأساسية (ضع آيديات سيرفرك هنا)
const CONFIG = {
    LOG_CHANNEL: "1524441464828985384", 
    JAIL_ROLE: "1524441575118082068"   
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
    console.log(`=== 👮‍♂️ System Online ===`);
    console.log(`Logged in as: ${client.user.tag}`);
    console.log(`Listening for direct moderation words...`);
});

// 1. جلب الكلمة المباشرة والآيدي (بدون بريفيكس)
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    // تقسيم نص الرسالة إلى كلمات
    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // تشغيل الأمر بمجرد كتابة (mute أو ميوت)
    if (command === "mute" || command === "ميوت" || command === "punish" || command === "عقوبة") {
        
        // التحقق من صلاحيات الإداري الذي كتب الأمر
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply("❌ ليس لديك صلاحية استخدام هذا الأمر.");
        }

        // جلب العضو المستهدف بالمنشن أو بالآيدي مباشرة
        const targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        
        if (!targetMember) {
            return message.reply(`⚠️ اكتب آيدي الشخص أو سوي له منشن بعد الكلمة مباشرة. مثال:\n\`mute 1234567890\`\n\`ميوت @user\``);
        }

        // تصميم القائمة المنسدلة (المنيو) المتطورة
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`punish_menu_${targetMember.id}`) // تخزين الآيدي للتعامل معه عند الضغط
            .setPlaceholder("قم بإختيار القانون المراد تطبيقه")
            .addOptions([
                {
                    label: "تحذير (Warn) - مخالفة القوانين للمرة الأولى",
                    description: "المدة: أبدي (تسجيل في اللوج)",
                    value: "warn"
                },
                {
                    label: "ميوت (Mute) - إزعاج في الرومات الصوتية أو الشات",
                    description: "المدة: 10 دقائق (تايم آوت تلقائي)",
                    value: "mute_10"
                },
                {
                    label: "سجن (Jail) - إثارة المشاكل وعدم احترام الأعضاء",
                    description: "المدة: حتى أمر الإدارة (رتبة السجن)",
                    value: "jail"
                },
                {
                    label: "باند (Ban) - نشر روابط تخريبية أو سب وقذف",
                    description: "المدة: نهائي (طرد وباند كامل)",
                    value: "ban"
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // إرسال القائمة في الشات
        await message.reply({
            content: `🛡️ قم باختيار العقوبة المناسبة للعضو: ${targetMember}`,
            components: [row]
        });
    }
});

// 2. معالجة الاختيار من القائمة المنسدلة وتنفيذ العقوبة
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith("punish_menu_")) return;

    const targetId = interaction.customId.split("_")[2];
    const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
    const action = interaction.values[0];

    // حماية المنيو: التحقق من صلاحيات الشخص الذي ضغط
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: "❌ لا يمكنك التحكم في هذا المنيو.", ephemeral: true });
    }

    if (!targetMember) {
        return interaction.reply({ content: "❌ لم يتم العثور على هذا العضو في السيرفر.", ephemeral: true });
    }

    const logChannel = interaction.guild.channels.cache.get(CONFIG.LOG_CHANNEL);
    let actionText = "";
    let color = "#000000";

    try {
        if (action === "warn") {
            actionText = "⚠️ تحذير (Warn)";
            color = "#FFA500";
            await interaction.reply({ content: `✅ تم تسجيل تحذير بحق ${targetMember}` });
        } 
        else if (action === "mute_10") {
            actionText = "🤐 ميوت (Mute)";
            color = "#FFFF00";
            await targetMember.timeout(10 * 60 * 1000, "تطبيق العقوبة بالقائمة المنسدلة");
            await interaction.reply({ content: `✅ تم إعطاء ميوت لـ ${targetMember} لمدة 10 دقائق` });
        } 
        else if (action === "jail") {
            actionText = "⛓️ سجن (Jail)";
            color = "#8B0000";
            const jailRole = interaction.guild.roles.cache.get(CONFIG.JAIL_ROLE);
            if (jailRole) await targetMember.roles.add(jailRole);
            await interaction.reply({ content: `✅ تم سجن العضو ${targetMember} بنجاح` });
        } 
        else if (action === "ban") {
            actionText = "🔨 باند (Ban)";
            color = "#FF0000";
            await targetMember.ban({ reason: "تطبيق العقوبة بالقائمة المنسدلة" });
            await interaction.reply({ content: `✅ تم طرد وتبنيد ${targetMember.user.username} نهائياً` });
        }

        // حذف رسالة المنيو بعد التنفيذ مباشرة ليكون الشات نظيفاً
        await interaction.message.delete().catch(() => {});

        // إرسال اللوج إلى الروم المخصص للإدارة
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`عقوبة إدارية جديدة: ${actionText}`)
                .addFields(
                    { name: "العضو المستهدف:", value: `${targetMember.user.tag} (${targetMember.id})`, inline: true },
                    { name: "الإداري المسؤول:", value: `${interaction.user.tag}`, inline: true }
                ).setTimestamp();
            logChannel.send({ embeds: [logEmbed] });
        }

    } catch (err) {
        console.error(err);
        await interaction.reply({ content: "❌ حدث خطأ، تأكد من صلاحيات رتبة البوت وتوفر رتبة السجن.", ephemeral: true });
    }
});

// استدعاء التوكن بأمان من بيئة العمل الخارجية المخصصة لـ GitHub
client.login(process.env.TOKEN);
