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

// DEFINIÇÃO DOS SLASH COMMANDS
const commands = [
    { name: 'ajuda', description: 'Mostra a central de comandos' },
    { name: 'pix', description: 'Mostra a chave PIX para pagamento' },
    { name: 'faq', description: 'Perguntas frequentes' },
    { name: 'estoque', description: 'Verifica o estoque atual de Robux' },
    { name: 'id', description: 'Mostra o seu ID ou de um usuário', options: [{ name: 'usuario', type: 6, description: 'Selecione o usuário', required: false }] },
    { name: 'calc', description: 'Calculadora de taxas', options: [{ name: 'valor', type: 4, description: 'Valor para calcular', required: true }] },
    { name: 'ticket', description: 'Abre o menu de tickets' },
    { name: 'lock', description: 'Abre o painel de trancar canal' }
];

// ==========================================
//            EVENTO DE INICIALIZAÇÃO
// ==========================================
client.once('ready', async () => {
    console.log('==========================================');
    console.log(`✅ LOGADO COMO: ${client.user.tag}`);
    console.log(`🆔 ID DO BOT: ${client.user.id}`);
    console.log('==========================================');

    // Registrar Slash Commands
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('🚀 Registrando comandos de barra (/)');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comandos registrados com sucesso!');
    } catch (error) {
        console.error(error);
    }

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
//          PROCESSAMENTO DE MENSAGENS (PREFIXO)
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

    // Reutilizando lógica nos comandos de mensagem
    if (comando === 'lock') handleLock(message);
    if (comando === 'ticket') handleTicket(message);
    if (comando === 'pix') handlePix(message);
    if (comando === 'faq') handleFaq(message);
    if (comando === 'ajuda' || comando === 'help') handleAjuda(message);
    if (comando === 'estoque') handleEstoque(message, args);
    if (comando === 'id') handleId(message, message.mentions.users.first() || message.author);
    if (comando === 'calc') handleCalc(message, args[0]);
});

// ==========================================
//        LÓGICA DE INTERAÇÕES (SLASH & COMPONENTES)
// ==========================================
client.on('interactionCreate', async (i) => {
    // TRATAMENTO DE SLASH COMMANDS
    if (i.isChatInputCommand()) {
        if (i.commandName === 'ajuda') handleAjuda(i);
        if (i.commandName === 'pix') handlePix(i);
        if (i.commandName === 'faq') handleFaq(i);
        if (i.commandName === 'ticket') handleTicket(i);
        if (i.commandName === 'lock') handleLock(i);
        if (i.commandName === 'estoque') handleEstoque(i);
        if (i.commandName === 'calc') handleCalc(i, i.options.getInteger('valor'));
        if (i.commandName === 'id') handleId(i, i.options.getUser('usuario') || i.user);
    }

    // TRATAMENTO DE BOTÕES
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

    // TRATAMENTO DE TICKET
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
//           FUNÇÕES DE COMANDO
// ==========================================
function handleAjuda(input) {
    const e = new EmbedBuilder()
        .setTitle('📚 Central de Comandos - KauanHelper')
        .setDescription('Aqui estão todos os comandos disponíveis no bot:')
        .setColor('#2b2d31')
        .addFields(
            { name: '🎫 Atendimento', value: '`/ticket` ou `!ticket` (Abrir menu)\n`!close` (Fechar ticket)' },
            { name: '💰 Vendas/Loja', value: '`!preços` (Tabela)\n`/estoque` ou `!estoque` (Ver status)\n`/pix` ou `!pix` (Chave pagamento)\n`/calc` ou `!calc` (Calculadora taxas)\n`!vouch` (Postar avaliação)' },
            { name: '🛠️ Moderação', value: '`/lock` ou `!lock` (Painel com botões)\n`!blacklist` (Banir ID do bot)\n`!snipe` (Ver apagadas)' },
            { name: '🌐 Geral', value: '`/id` ou `!id` (Ver ID de alguém)\n`/faq` ou `!faq` (Dúvidas frequentes)\n`!traduzir` (Tradução auto)' }
        )
        .setFooter({ text: 'Tigre Bux - O melhor preço sempre!' });
    input.reply({ embeds: [e] });
}

function handlePix(input) {
    const embed = new EmbedBuilder()
        .setTitle('💸 Pagamento PIX')
        .setDescription('Chave: `SUA_CHAVE_AQUI` \n\nEnvie o comprovante no ticket!')
        .setColor('#00FFFF');
    input.reply({ embeds: [embed] });
}

function handleFaq(input) {
    const embed = new EmbedBuilder()
        .setTitle('❓ FAQ - Perguntas Frequentes')
        .setColor('#FFA500')
        .addFields(
            { name: 'É confiável?', value: 'Sim! Veja nossas avaliações em <#1460383106639855748>.' },
            { name: 'Qual o prazo?', value: 'Entrega imediata após confirmação.' },
            { name: 'Formas de pagamento?', value: 'PIX, Cartão e Saldo.' }
        );
    input.reply({ embeds: [embed] });
}

function handleEstoque(input, args) {
    if (input.user?.id === MEU_ID || input.author?.id === MEU_ID) {
        if (args && args.length > 0) {
            estoqueRobux = args.join(' ');
            return input.reply("✅ Estoque atualizado!");
        }
    }
    input.reply(`📦 Estoque atual: **${estoqueRobux}**`);
}

function handleId(input, target) {
    input.reply(`🆔 ID: \`${target.id}\``);
}

function handleCalc(input, valor) {
    const v = parseInt(valor);
    if (isNaN(v)) return input.reply("❌ Valor inválido!");
    input.reply(`📊 Recebe: **${Math.floor(v * 0.7)}** | Cobrar: **${Math.ceil(v / 0.7)}**`);
}

async function handleLock(input) {
    if (input.member && !input.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
    const embedLock = new EmbedBuilder()
        .setTitle('🔒 Painel de Controle')
        .setDescription('Gerencie a trava e a limpeza deste canal nos botões abaixo.')
        .setColor('#2b2d31')
        .setFooter({ text: 'Segurança Tigre Bux' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_lock').setLabel('Bloquear').setEmoji('🔒').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_unlock').setLabel('Desbloquear').setEmoji('🔓').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_clear').setLabel('Limpar Mensagens').setEmoji('🗑️').setStyle(ButtonStyle.Secondary)
    );
    input.reply({ embeds: [embedLock], components: [row] });
}

async function handleTicket(input) {
    const embedTicket = new EmbedBuilder()
        .setTitle('🎫 Central de Atendimento')
        .setDescription('Selecione uma categoria abaixo para abrir um ticket.')
        .setColor('#2b2d31');

    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('select_ticket')
            .setPlaceholder('Escolha o motivo...')
            .addOptions([
                { label: 'Compras', description: 'Comprar Robux ou itens.', value: 'compras', emoji: '💸' },
                { label: 'Blox Fruits', description: 'Itens de Blox Fruits.', value: 'bloxfruits', emoji: '🍎' },
                { label: 'Suporte', description: 'Dúvidas gerais.', value: 'suporte', emoji: '🆘' },
                { label: 'Denúncias', description: 'Denunciar usuários.', value: 'denuncias', emoji: '🔨' },
            ])
    );
    input.reply({ embeds: [embedTicket], components: [menu] });
}

client.login(process.env.TOKEN);
            
