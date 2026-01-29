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

// LISTA DE COMANDOS PARA O DISCORD RECONHECER O /
const slashCommands = [
    { name: 'ajuda', description: 'Central de comandos' },
    { name: 'ticket', description: 'Abre o menu de tickets' },
    { name: 'lock', description: 'Painel de controle de trava' },
    { name: 'pix', description: 'Chave de pagamento' },
    { name: 'faq', description: 'Dúvidas frequentes' },
    { name: 'estoque', description: 'Ver estoque de Robux' },
    { name: 'calc', description: 'Calculadora de taxas', options: [{name: 'valor', type: 4, description: 'Valor', required: true}] },
    { name: 'id', description: 'Ver ID de um usuário', options: [{name: 'user', type: 6, description: 'Usuário'}] },
    { name: 'snipe', description: 'Ver última mensagem apagada' }
];

// ==========================================
//            EVENTO DE INICIALIZAÇÃO
// ==========================================
client.once('ready', async () => {
    console.log('==========================================');
    console.log(`✅ LOGADO COMO: ${client.user.tag}`);
    console.log(`🆔 ID DO BOT: ${client.user.id}`);
    console.log('==========================================');

    // REGISTRAR COMANDOS DE BARRA
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
        console.log('🚀 Comandos de barra (/) registrados!');
    } catch (e) { console.log("Erro ao registrar comandos /"); }

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

    // EXECUTAR COMANDO DE PREFIXO
    executarComando(comando, args, message);
});

// ==========================================
//        LÓGICA DE INTERAÇÕES (SLASH)
// ==========================================
client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        const args = i.options.getInteger('valor') ? [i.options.getInteger('valor').toString()] : [];
        if (i.options.getUser('user')) args.push(i.options.getUser('user').id);
        
        // Simular o comportamento do comando para Slash
        await executarComando(i.commandName, args, i);
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
//         NÚCLEO DE COMANDOS (CENTRALIZADO)
// ==========================================
async function executarComando(comando, args, context) {
    const isSlash = context.isChatInputCommand?.();
    const responder = (data) => isSlash ? context.reply(data) : context.reply(data);
    const channel = context.channel;
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
        return responder({ embeds: [embedLock], components: [row] });
    }

    if (comando === 'ticket') {
        const embedTicket = new EmbedBuilder().setTitle('🎫 Central de Atendimento').setDescription('Selecione uma categoria abaixo para abrir um ticket.').setColor('#2b2d31');
        const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_ticket').setPlaceholder('Escolha o motivo...').addOptions([{ label: 'Compras', description: 'Comprar Robux ou itens.', value: 'compras', emoji: '💸' },{ label: 'Blox Fruits', description: 'Itens de Blox Fruits.', value: 'bloxfruits', emoji: '🍎' },{ label: 'Suporte', description: 'Dúvidas gerais.', value: 'suporte', emoji: '🆘' },{ label: 'Denúncias', description: 'Denunciar usuários.', value: 'denuncias', emoji: '🔨' }]));
        return responder({ embeds: [embedTicket], components: [menu] });
    }

    if (comando === 'pix') {
        const embed = new EmbedBuilder().setTitle('💸 Pagamento PIX').setDescription('Chave: `SUA_CHAVE_AQUI` \n\nEnvie o comprovante no ticket!').setColor('#00FFFF');
        return responder({ embeds: [embed] });
    }

    if (comando === 'faq') {
        const embed = new EmbedBuilder().setTitle('❓ FAQ - Perguntas Frequentes').setColor('#FFA500').addFields({ name: 'É confiável?', value: 'Sim! Veja nossas avaliações em <#1460383106639855748>.' },{ name: 'Qual o prazo?', value: 'Entrega imediata após confirmação.' },{ name: 'Formas de pagamento?', value: 'PIX, Cartão e Saldo.' });
        return responder({ embeds: [embed] });
    }

    if (comando === 'id') {
        const target = isSlash ? (context.options.getUser('user') || author) : (context.mentions.users.first() || author);
        return responder(`🆔 ID: \`${target.id}\``);
    }

    if (comando === 'estoque') {
        if (author.id === MEU_ID && args.length > 0) {
            estoqueRobux = args.join(' ');
            return responder("✅ Estoque atualizado!");
        }
        return responder(`📦 Estoque atual: **${estoqueRobux}**`);
    }

    if (comando === 'calc') {
        const v = parseInt(args[0]);
        if (isNaN(v)) return responder("❌ Use: /calc [valor]");
        return responder(`📊 Recebe: **${Math.floor(v * 0.7)}** | Cobrar: **${Math.ceil(v / 0.7)}**`);
    }

    if (comando === 'ajuda' || comando === 'help') {
        const e = new EmbedBuilder().setTitle('📚 Central de Comandos - KauanHelper').setDescription('Aqui estão todos os comandos disponíveis no bot:').setColor('#2b2d31').addFields({ name: '🎫 Atendimento', value: '`!ticket` / `/ticket`\n`!close` (Fechar ticket)' },{ name: '💰 Vendas/Loja', value: '`!preços`\n`!estoque` / `/estoque`\n`!pix` / `/pix`\n`!calc` / `/calc`\n`!vouch`' },{ name: '🛠️ Moderação', value: '`!lock` / `/lock`\n`!blacklist`\n`!snipe` / `/snipe`' },{ name: '🌐 Geral', value: '`!id` / `/id`\n`!faq` / `/faq`\n`!traduzir`' }).setFooter({ text: 'Tigre Bux - O melhor preço sempre!' });
        return responder({ embeds: [e] });
    }

    if (comando === 'snipe') {
        const msg = lastDeletedMessage[channel.id];
        if (!msg) return responder("❌ Nenhuma mensagem apagada recentemente.");
        const e = new EmbedBuilder().setAuthor({ name: msg.tag }).setDescription(msg.content || "Anexo/Imagem").setColor('#800080');
        if (msg.image) e.setImage(msg.image);
        return responder({ embeds: [e] });
    }
}

client.login(process.env.TOKEN);
        
