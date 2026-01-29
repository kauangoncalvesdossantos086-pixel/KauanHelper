const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    Partials, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits,
    ActivityType,
    REST,
    Routes 
} = require('discord.js');
const axios = require('axios');
const express = require('express');

// ==========================================
//        CONFIGURAÇÃO E ANTI-SONO
// ==========================================
const app = express();
app.get('/', (req, res) => res.send('KauanHelper Full System Online! 🚀🐯'));
app.listen(3000, () => console.log('📡 [SERVIDOR] Monitoramento HTTP ativo na porta 3000'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// ==========================================
//            VARIÁVEIS GLOBAIS
// ==========================================
const PREFIXO = "!";
const MEU_ID = "1228447123490476143"; 
const CANAL_AVALIACOES_ID = "1460383106639855748"; 

let estoqueRobux = "Disponível ✅"; 
let lastDeletedMessage = {};
let blacklist = []; 

// COMANDOS PARA APARECER NO MENU DO /
const slashCommands = [
    { name: 'lock', description: '🔒 Painel de Controle de tranca' },
    { name: 'ticket', description: '🎫 Central de Atendimento' },
    { name: 'pix', description: '💸 Pagamento PIX' },
    { name: 'faq', description: '❓ Perguntas Frequentes' },
    { name: 'traduzir', description: '🇧🇷 Traduzir texto', options: [{name: 'texto', type: 3, description: 'Texto', required: true}] },
    { name: 'close', description: '🔒 Fechar ticket' },
    { name: 'snipe', description: '🎯 Ver mensagem apagada' },
    { name: 'id', description: '🆔 Ver ID', options: [{name: 'user', type: 6, description: 'Usuário'}] },
    { name: 'estoque', description: '📦 Ver/Mudar estoque', options: [{name: 'valor', type: 3, description: 'Novo valor'}] },
    { name: 'calc', description: '📊 Calcular taxas', options: [{name: 'valor', type: 4, description: 'Valor', required: true}] },
    { name: 'vouch', description: '⭐ Dar avaliação', options: [{name: 'texto', type: 3, description: 'Texto', required: true}] },
    { name: 'ajuda', description: '📚 Lista de comandos' }
];

// ==========================================
//            EVENTO DE INICIALIZAÇÃO
// ==========================================
client.once('ready', async () => {
    console.log('==========================================');
    console.log(`✅ LOGADO COMO: ${client.user.tag}`);
    console.log(`🆔 ID DO BOT: ${client.user.id}`);
    console.log('==========================================');

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
        console.log('🚀 Comandos / registrados e prontos!');
    } catch (e) { console.log(e); }

    client.user.setPresence({
        activities: [{ name: 'Tigre Bux 🐯 | !ajuda', type: ActivityType.Watching }],
        status: 'online',
    });
});

// ==========================================
//          SISTEMA DEDO DURO (SNIPE)
// ==========================================
client.on('messageDelete', async (message) => {
    if (message.author?.bot || !message.guild) return;
    lastDeletedMessage[message.channel.id] = {
        content: message.content,
        author: message.author,
        tag: message.author.tag,
        image: message.attachments.first()?.proxyURL,
        timestamp: new Date()
    };
});

// ==========================================
//          PROCESSAMENTO DE MENSAGENS
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (blacklist.includes(message.author.id)) return;

    // --- ANTI-LINK ---
    const links = ["discord.gg/", "http://", "https://"];
    if (links.some(link => message.content.toLowerCase().includes(link))) {
        if (message.author.id !== MEU_ID && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            try {
                await message.delete();
                return message.channel.send(`⚠️ **${message.author.username}**, o envio de links é proibido!`)
                    .then(msg => setTimeout(() => msg.delete(), 6000));
            } catch (err) { console.log("Erro no Anti-link"); }
        }
    }

    // --- LOG DE MENÇÃO ---
    if (message.mentions.has(MEU_ID) && message.author.id !== MEU_ID) {
        const canalLog = message.guild.channels.cache.find(c => c.name.includes('logs'));
        if (canalLog) {
            const embedLogM = new EmbedBuilder()
                .setTitle('🚨 ALERTA DE MENÇÃO')
                .setColor('#FF0000')
                .addFields(
                    { name: '👤 Usuário:', value: `${message.author.tag}`, inline: true },
                    { name: '📍 Canal:', value: `${message.channel}`, inline: true },
                    { name: '💬 Mensagem:', value: message.content || "*Anexo*" }
                ).setTimestamp();
            canalLog.send({ content: `<@${MEU_ID}>`, embeds: [embedLogM] });
        }
    }

    if (!message.content.startsWith(PREFIXO)) return;
    const args = message.content.slice(PREFIXO.length).trim().split(/ +/);
    const comando = args.shift().toLowerCase();

    // EXECUTAR COMANDO ORIGINAL
    executar(comando, args, message);
});

// ==========================================
//        LÓGICA DE INTERAÇÕES
// ==========================================
client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        let args = [];
        if (i.options.getInteger('valor')) args.push(i.options.getInteger('valor').toString());
        if (i.options.getString('valor')) args.push(i.options.getString('valor'));
        if (i.options.getString('texto')) args = i.options.getString('texto').split(' ');
        if (i.options.getUser('user')) args.push(i.options.getUser('user').id);
        
        await executar(i.commandName, args, i);
    }

    if (i.isButton()) {
        if (!i.member.permissions.has(PermissionFlagsBits.ManageChannels)) return i.reply({ content: "🚫 Sem permissão!", ephemeral: true });

        if (i.customId === 'btn_lock') {
            await i.channel.permissionOverwrites.edit(i.guild.id, { SendMessages: false });
            return i.reply({ content: "🔒 Canal bloqueado com sucesso!", ephemeral: true });
        }
        if (i.customId === 'btn_unlock') {
            await i.channel.permissionOverwrites.edit(i.guild.id, { SendMessages: true });
            return i.reply({ embeds: [new EmbedBuilder().setDescription('🔓 **Canal desbloqueado por um administrador!**').setColor('#00FF00')] });
        }
        if (i.customId === 'btn_clear') {
            const msgs = await i.channel.messages.fetch({ limit: 100 });
            const clean = msgs.filter(m => m.id !== i.message.id);
            await i.channel.bulkDelete(clean, true).catch(() => {});
            return i.reply({ content: "🗑️ Chat limpo (mantendo o painel)!", ephemeral: true });
        }
    }

    if (i.isStringSelectMenu() && i.customId === 'select_ticket') {
        const cat = i.values[0];
        const canal = await i.guild.channels.create({
            name: `ticket-${cat}-${i.user.username.toLowerCase()}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: MEU_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ],
        });
        await canal.send({ content: `${i.user} | <@${MEU_ID}>`, embeds: [new EmbedBuilder().setTitle(`Ticket: ${cat.toUpperCase()}`).setDescription("Olá! Explique sua dúvida e aguarde o dono.").setColor('#00FF00')] });
        await i.reply({ content: `✅ Seu ticket foi criado: ${canal}`, ephemeral: true });
    }
});

// ==========================================
//      FUNÇÃO CENTRAL DE COMANDOS (300 LINHAS)
// ==========================================
async function executar(comando, args, context) {
    const isSlash = context.isChatInputCommand?.();
    const reply = (c) => isSlash ? context.reply(c) : context.reply(c);
    const author = isSlash ? context.user : context.author;
    const member = context.member;

    if (comando === 'lock') {
        if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
        if (!isSlash) context.delete().catch(() => {});
        const embedLock = new EmbedBuilder().setTitle('🔒 Painel de Controle').setDescription('Gerencie a trava e a limpeza deste canal nos botões abaixo.').setColor('#2b2d31').setFooter({ text: 'Segurança Tigre Bux' });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_lock').setLabel('Bloquear').setEmoji('🔒').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('btn_unlock').setLabel('Desbloquear').setEmoji('🔓').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_clear').setLabel('Limpar Mensagens').setEmoji('🗑️').setStyle(ButtonStyle.Secondary)
        );
        return reply({ embeds: [embedLock], components: [row] });
    }

    if (comando === 'ticket') {
        const embedTicket = new EmbedBuilder().setTitle('🎫 Central de Atendimento').setDescription('Selecione uma categoria abaixo para abrir um ticket.').setColor('#2b2d31');
        const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_ticket').setPlaceholder('Escolha o motivo...').addOptions([
            { label: 'Compras', description: 'Comprar Robux ou itens.', value: 'compras', emoji: '💸' },
            { label: 'Blox Fruits', description: 'Itens de Blox Fruits.', value: 'bloxfruits', emoji: '🍎' },
            { label: 'Suporte', description: 'Dúvidas gerais.', value: 'suporte', emoji: '🆘' },
            { label: 'Denúncias', description: 'Denunciar usuários.', value: 'denuncias', emoji: '🔨' }
        ]));
        return reply({ embeds: [embedTicket], components: [menu] });
    }

    if (comando === 'pix') {
        const embed = new EmbedBuilder().setTitle('💸 Pagamento PIX').setDescription('Chave: `SUA_CHAVE_AQUI` \n\nEnvie o comprovante no ticket!').setColor('#00FFFF');
        return reply({ embeds: [embed] });
    }

    if (comando === 'faq') {
        const embed = new EmbedBuilder().setTitle('❓ FAQ - Perguntas Frequentes').setColor('#FFA500').addFields(
            { name: 'É confiável?', value: 'Sim! Veja nossas avaliações em <#1460383106639855748>.' },
            { name: 'Qual o prazo?', value: 'Entrega imediata após confirmação.' },
            { name: 'Formas de pagamento?', value: 'PIX, Cartão e Saldo.' }
        );
        return reply({ embeds: [embed] });
    }

    if (comando === 'traduzir') {
        const txt = args.join(' ');
        if (!txt) return reply("❌ Digite o texto para traduzir!");
        try {
            const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURI(txt)}`);
            return reply(`🇧🇷 **Tradução:** ${res.data[0][0][0]}`);
        } catch (e) { return reply("❌ Erro ao traduzir."); }
    }

    if (comando === 'close') {
        if (!context.channel.name.startsWith('ticket-')) return;
        if (author.id === MEU_ID || member.permissions.has(PermissionFlagsBits.Administrator)) {
            reply("🔒 **Encerrando ticket em 5 segundos...**");
            setTimeout(() => context.channel.delete().catch(() => {}), 5000);
        }
    }

    if (comando === 'blacklist') {
        if (author.id !== MEU_ID) return;
        const alvo = (isSlash ? args[0] : (context.mentions.users.first()?.id || args[0]));
        if (!alvo) return reply("❌ ID inválido.");
        if (blacklist.includes(alvo)) {
            blacklist = blacklist.filter(id => id !== alvo);
            reply(`✅ <@${alvo}> saiu da blacklist.`);
        } else {
            blacklist.push(alvo);
            reply(`🚫 <@${alvo}> entrou na blacklist.`);
        }
    }

    if (comando === 'snipe') {
        const msg = lastDeletedMessage[context.channel.id];
        if (!msg) return reply("❌ Nenhuma mensagem apagada recentemente.");
        const e = new EmbedBuilder().setAuthor({ name: msg.tag }).setDescription(msg.content || "Anexo/Imagem").setColor('#800080');
        if (msg.image) e.setImage(msg.image);
        return reply({ embeds: [e] });
    }

    if (comando === 'id') {
        const target = isSlash ? (context.options.getUser('user') || author) : (context.mentions.users.first() || author);
        return reply(`🆔 ID: \`${target.id}\``);
    }

    if (comando === 'estoque') {
        if (author.id === MEU_ID && args.length > 0) {
            estoqueRobux = args.join(' ');
            return reply("✅ Estoque atualizado!");
        }
        return reply(`📦 Estoque atual: **${estoqueRobux}**`);
    }

    if (comando === 'calc') {
        const v = parseInt(args[0]);
        if (isNaN(v)) return reply("❌ Use: !calc [valor]");
        return reply(`📊 Recebe: **${Math.floor(v * 0.7)}** | Cobrar: **${Math.ceil(v / 0.7)}**`);
    }

    if (comando === 'vouch') {
        const relato = args.join(' ');
        if (!relato) return reply("❌ Use: !vouch [texto]");
        const canalV = client.channels.cache.get(CANAL_AVALIACOES_ID);
        if (canalV) {
            canalV.send({ embeds: [new EmbedBuilder().setTitle('⭐ Nova Avaliação!').setDescription(relato).setColor('#FFFF00').setFooter({ text: `Por: ${author.tag}` })] });
            return reply("✅ Vouch enviado!");
        }
    }

    if (comando === 'ajuda' || comando === 'help') {
        const e = new EmbedBuilder().setTitle('📚 Central de Comandos - KauanHelper').setDescription('Aqui estão todos os comandos disponíveis no bot:').setColor('#2b2d31')
            .addFields(
                { name: '🎫 Atendimento', value: '`!ticket` (Abrir menu)\n`!close` (Fechar ticket)' },
                { name: '💰 Vendas/Loja', value: '`!preços` (Tabela)\n`!estoque` (Ver status)\n`!pix` (Chave pagamento)\n`!calc` (Calculadora taxas)\n`!vouch` (Postar avaliação)' },
                { name: '🛠️ Moderação', value: '`!lock` (Painel com botões)\n`!blacklist` (Banir ID do bot)\n`!snipe` (Ver apagadas)' },
                { name: '🌐 Geral', value: '`!id` (Ver ID de alguém)\n`!faq` (Dúvidas frequentes)\n`!traduzir` (Tradução auto)' }
            ).setFooter({ text: 'Tigre Bux - O melhor preço sempre!' });
        return reply({ embeds: [e] });
    }
}

client.login(process.env.TOKEN);
