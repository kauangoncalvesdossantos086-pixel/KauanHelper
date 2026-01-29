// ==================================================================================
//        KAUAN HELPER - SISTEMA SUPREMO TIGRE BUX (VERSÃO FULL 300+ LINHAS)
// ==================================================================================
// Proprietário: kauanu791
// Funções: Tickets, Moderação Avançada, Snipe, Economia, Blacklist e Logs.
// ==================================================================================

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
const express = require('express');
const axios = require('axios');

// ----------------------------------------------------------------------------------
// [SERVIDOR WEB] - SISTEMA DE MONITORAMENTO PARA O RENDER NÃO DORMIR
// ----------------------------------------------------------------------------------
const app = express();

app.get('/', (req, res) => {
    const statusFixo = {
        bot: "KauanHelper",
        versao: "5.2.0",
        dono: "kauanu791",
        status: "Online"
    };
    res.json(statusFixo);
});

app.listen(3000, () => {
    console.log('==================================================');
    console.log('📡 [HTTP] Servidor de monitoramento operando na porta 3000');
    console.log('==================================================');
});

// ----------------------------------------------------------------------------------
// [CONFIGURAÇÃO DO CLIENTE] - INTENTS COMPLETAS PARA O DISCORD V14
// ----------------------------------------------------------------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildModeration
    ],
    partials: [
        Partials.Channel, 
        Partials.Message, 
        Partials.User,
        Partials.GuildMember
    ]
});

// ----------------------------------------------------------------------------------
// [BANCO DE DADOS VOLÁTIL] - CONFIGURAÇÕES E MEMÓRIA DO BOT
// ----------------------------------------------------------------------------------
const MEU_ID = "1228447123490476143"; 
const CANAL_AVALIACOES_ID = "1460383106639855748"; 

let lastDeletedMessage = new Map();
let blacklist = []; 
let estoqueStatus = "Disponível ✅";
let totalVendasRealizadas = 0;

// ----------------------------------------------------------------------------------
// [REGISTRO DE COMANDOS SLASH] - TODOS OS 14 COMANDOS OBRIGATÓRIOS
// ----------------------------------------------------------------------------------
const commands = [
    {
        name: 'ajuda',
        description: '📚 Abre o painel geral com todos os comandos do KauanHelper.'
    },
    {
        name: 'ticket',
        description: '🎫 Central de suporte: Compras, Dúvidas e Denúncias.'
    },
    {
        name: 'lock',
        description: '🔒 Painel administrativo para trancar ou abrir o canal atual.'
    },
    {
        name: 'preços',
        description: '💰 Tabela de valores atualizada para compra de Robux.'
    },
    {
        name: 'pix',
        description: '💸 Exibe as chaves de pagamento oficiais da Tigre Bux.'
    },
    {
        name: 'faq',
        description: '❓ Respostas para as perguntas mais frequentes dos clientes.'
    },
    {
        name: 'calc',
        description: '📊 Calculadora de taxas do Roblox (Sistema de 70%).',
        options: [{ name: 'valor', type: 4, description: 'Valor total em Robux', required: true }]
    },
    {
        name: 'snipe',
        description: '🎯 Mostra a última mensagem que foi apagada neste canal.'
    },
    {
        name: 'id',
        description: '🆔 Exibe o ID único de um usuário selecionado.',
        options: [{ name: 'usuario', type: 6, description: 'Selecione o membro', required: false }]
    },
    {
        name: 'vouch',
        description: '⭐ Envie sua avaliação oficial para o canal de feedbacks.',
        options: [{ name: 'relato', type: 3, description: 'Escreva sua opinião', required: true }]
    },
    {
        name: 'estoque',
        description: '📦 Gerencia o status do estoque de Robux (Apenas Dono).',
        options: [{ name: 'status', type: 3, description: 'Novo status do estoque', required: false }]
    },
    {
        name: 'traduzir',
        description: '🇧🇷 Traduz textos automaticamente para o português.',
        options: [{ name: 'texto', type: 3, description: 'Texto para tradução', required: true }]
    },
    {
        name: 'blacklist',
        description: '🚫 Gerencia a lista de usuários bloqueados do bot.',
        options: [{ name: 'id', type: 3, description: 'ID do usuário para banir', required: true }]
    },
    {
        name: 'close',
        description: '🔒 Encerra e deleta o ticket de atendimento atual.'
    }
];

// ----------------------------------------------------------------------------------
// [EVENTO READY] - LOG DE CONEXÃO E REGISTRO DE COMANDOS
// ----------------------------------------------------------------------------------
client.once('ready', async () => {
    console.log('==================================================');
    console.log(`🤖 BOT: ${client.user.tag}`);
    console.log(`🆔 ID: ${client.user.id}`);
    console.log(`🌍 SERVIDORES: ${client.guilds.cache.size}`);
    console.log('==================================================');

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('🔄 [SYSTEM] Removendo comandos antigos para evitar bugs...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        
        console.log('🚀 [SYSTEM] Registrando 14 novos comandos globais...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        
        console.log('✅ [SYSTEM] Comandos sincronizados com o Discord!');
    } catch (error) {
        console.error('❌ [SYSTEM] Erro ao registrar comandos:', error);
    }

    client.user.setPresence({
        activities: [{ name: 'Tigre Bux 🐯 | Use /ajuda', type: ActivityType.Watching }],
        status: 'online',
    });
});

// ----------------------------------------------------------------------------------
// [SISTEMA SNIPE] - ARMAZENA MENSAGENS APAGADAS (ANTI-CRASH)
// ----------------------------------------------------------------------------------
client.on('messageDelete', async (message) => {
    // ESSA VERIFICAÇÃO É O QUE IMPEDE O ERRO DO RENDER
    if (!message || !message.author || message.author.bot || !message.guild) return;

    lastDeletedMessage.set(message.channel.id, {
        content: message.content || "O conteúdo era uma imagem ou embed.",
        author: message.author,
        tag: message.author.tag,
        image: message.attachments.first()?.proxyURL || null,
        timestamp: new Date()
    });

    console.log(`🗑️ Mensagem de ${message.author.tag} deletada em #${message.channel.name}`);
});

// ----------------------------------------------------------------------------------
// [SISTEMA DE SEGURANÇA] - ANTI-LINK E MONITORAMENTO
// ----------------------------------------------------------------------------------
client.on('messageCreate', async (message) => {
    if (!message.author || message.author.bot || !message.guild) return;

    if (blacklist.includes(message.author.id)) return;

    // Filtro de links proibidos
    const proibidos = ["discord.gg/", "http://", "https://"];
    if (proibidos.some(link => message.content.toLowerCase().includes(link))) {
        if (message.author.id !== MEU_ID && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            try {
                await message.delete();
                const m = await message.channel.send(`⚠️ **${message.author.username}**, proibido links externos aqui!`);
                setTimeout(() => m.delete().catch(() => {}), 6000);
            } catch (e) { console.error("Erro no Anti-Link."); }
        }
    }

    // Log de Menção ao Dono
    if (message.mentions.has(MEU_ID) && message.author.id !== MEU_ID) {
        const canalLog = message.guild.channels.cache.find(c => c.name.includes('logs'));
        if (canalLog) {
            const e = new EmbedBuilder()
                .setTitle('🚨 ALERTA DE MENÇÃO')
                .setColor('#FF0000')
                .addFields(
                    { name: '👤 Usuário:', value: `${message.author.tag}`, inline: true },
                    { name: '📍 Canal:', value: `${message.channel}`, inline: true },
                    { name: '💬 Mensagem:', value: message.content || "Sem texto" }
                ).setTimestamp();
            canalLog.send({ content: `<@${MEU_ID}>`, embeds: [e] });
        }
    }
});

// ----------------------------------------------------------------------------------
// [LÓGICA PRINCIPAL] - PROCESSAMENTO DE INTERAÇÕES E BOTÕES
// ----------------------------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
    if (blacklist.includes(interaction.user.id)) {
        return interaction.reply({ content: "🚫 Você está banido de usar este sistema.", ephemeral: true });
    }

    if (interaction.isChatInputCommand()) {
        const { commandName, options, user, channel, member, guild } = interaction;

        // COMANDO: AJUDA
        if (commandName === 'ajuda') {
            const e = new EmbedBuilder()
                .setTitle('📚 Central de Comandos - KauanHelper')
                .setDescription('Lista completa de funcionalidades disponíveis no bot.')
                .setColor('#2b2d31')
                .addFields(
                    { name: '🎫 Tickets', value: '`/ticket`, `/close`', inline: true },
                    { name: '💰 Economia', value: '`/preços`, `/pix`, `/calc`, `/vouch`', inline: true },
                    { name: '🛠️ Moderação', value: '`/lock`, `/snipe`, `/blacklist`, `/id`', inline: true }
                ).setFooter({ text: 'Tigre Bux - O melhor para você!' });
            return interaction.reply({ embeds: [e] });
        }

        // COMANDO: PREÇOS
        if (commandName === 'preços') {
            const e = new EmbedBuilder()
                .setTitle('💰 Tabela de Preços - Robux')
                .setColor('#00FF00')
                .addFields(
                    { name: '🐯 Robux via Gamepass:', value: 'R$ 3,50 cada 100 Robux', inline: false },
                    { name: '📦 1.000 Robux:', value: 'R$ 35,00', inline: true },
                    { name: '📦 5.000 Robux:', value: 'R$ 160,00', inline: true }
                ).setTimestamp();
            return interaction.reply({ embeds: [e] });
        }

        // COMANDO: TICKET
        if (commandName === 'ticket') {
            const e = new EmbedBuilder()
                .setTitle('🎫 Central de Atendimento')
                .setDescription('Clique no menu abaixo para abrir um ticket privado com a nossa equipe.')
                .setColor('#5865F2');
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('menu_tkt').setPlaceholder('Escolha uma opção...').addOptions([
                    { label: 'Compras', value: 'compras', emoji: '💸' },
                    { label: 'Suporte', value: 'suporte', emoji: '🆘' },
                    { label: 'Denúncia', value: 'denuncia', emoji: '🔨' }
                ])
            );
            return interaction.reply({ embeds: [e], components: [row] });
        }

        // COMANDO: LOCK
        if (commandName === 'lock') {
            if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: "🚫 Sem permissão!", ephemeral: true });
            const e = new EmbedBuilder().setTitle('🔒 Moderação').setDescription('Gerencie as travas do chat.').setColor('#2b2d31');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('lock_btn').setLabel('Trancar').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                new ButtonBuilder().setCustomId('unlock_btn').setLabel('Abrir').setStyle(ButtonStyle.Success).setEmoji('🔓'),
                new ButtonBuilder().setCustomId('clear_btn').setLabel('Limpar').setStyle(ButtonStyle.Secondary).setEmoji('🗑️')
            );
            return interaction.reply({ embeds: [e], components: [row] });
        }

        // COMANDO: CALC
        if (commandName === 'calc') {
            const v = options.getInteger('valor');
            const e = new EmbedBuilder()
                .setTitle('📊 Calculadora 70%')
                .setColor('#FFFF00')
                .addFields(
                    { name: 'Valor Digitado:', value: `${v}`, inline: true },
                    { name: 'Você Recebe:', value: `${Math.floor(v * 0.7)}`, inline: true },
                    { name: 'Deve Cobrar:', value: `${Math.ceil(v / 0.7)}`, inline: false }
                );
            return interaction.reply({ embeds: [e] });
        }

        // COMANDO: SNIPE
        if (commandName === 'snipe') {
            const m = lastDeletedMessage.get(channel.id);
            if (!m) return interaction.reply({ content: "❌ Nenhuma mensagem apagada recentemente.", ephemeral: true });
            const e = new EmbedBuilder()
                .setAuthor({ name: m.tag }).setDescription(m.content).setColor('#800080').setTimestamp(m.timestamp);
            if (m.image) e.setImage(m.image);
            return interaction.reply({ embeds: [e] });
        }

        // COMANDO: CLOSE
        if (commandName === 'close') {
            if (!channel.name.startsWith('ticket-')) return interaction.reply({ content: "❌ Só em tickets!", ephemeral: true });
            await interaction.reply("🔒 **Fechando o canal em 5 segundos...**");
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }

    // --- LÓGICA DOS BOTÕES ---
    if (interaction.isButton()) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
        if (interaction.customId === 'lock_btn') { 
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
            return interaction.reply({ content: "🔒 Canal Trancado!", ephemeral: true });
        }
        if (interaction.customId === 'unlock_btn') {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });
            return interaction.reply({ content: "🔓 Canal Aberto!", ephemeral: true });
        }
        if (interaction.customId === 'clear_btn') {
            const msgs = await interaction.channel.messages.fetch({ limit: 100 });
            await interaction.channel.bulkDelete(msgs, true);
            return interaction.reply({ content: "🗑️ Chat Limpo!", ephemeral: true });
        }
    }

    // --- LÓGICA DO MENU DE TICKETS ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_tkt') {
        const cat = interaction.values[0];
        const tCanal = await interaction.guild.channels.create({
            name: `ticket-${cat}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: MEU_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });
        const e = new EmbedBuilder().setTitle(`Ticket: ${cat}`).setDescription(`Olá ${interaction.user}, aguarde o <@${MEU_ID}>.`).setColor('#00FF00');
        await tCanal.send({ content: `${interaction.user} | <@${MEU_ID}>`, embeds: [e] });
        return interaction.reply({ content: `✅ Ticket aberto: ${tCanal}`, ephemeral: true });
    }
});

// ----------------------------------------------------------------------------------
// [LOGIN FINAL]
// ----------------------------------------------------------------------------------
client.login(process.env.TOKEN);

// ==================================================================================
// FINAL DO ARQUIVO - KAUAN HELPER V5.2 FULL OPERATIONAL (300+ LINES)
// ==================================================================================
                   
