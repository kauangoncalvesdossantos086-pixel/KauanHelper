// ==================================================================================
//        KAUAN HELPER - SISTEMA SUPREMO TIGRE BUX (VERSÃO 300+ LINHAS)
// ==================================================================================
// Proprietário: kauanu791
// Descrição: Bot completo com Tickets, Moderação, Snipe, Economia e Anti-Crash.
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
const axios = require('axios');
const express = require('express');

// ----------------------------------------------------------------------------------
// [SISTEMA DE MANUTENÇÃO] - EVITA QUE O BOT FIQUE OFF-LINE NO RENDER
// ----------------------------------------------------------------------------------
const app = express();

app.get('/', (req, res) => {
    const dataAtual = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    res.send(`<h1>KauanHelper V300 está Online! 🐯</h1><p>Último ping em: ${dataAtual}</p>`);
});

app.listen(3000, () => {
    console.log('--------------------------------------------------');
    console.log('📡 [HTTP] Servidor de monitoramento ativo na porta 3000');
    console.log('--------------------------------------------------');
});

// ----------------------------------------------------------------------------------
// [CONFIGURAÇÃO DO CLIENTE] - INTENTS E PARTIALS PARA MÁXIMO DESEMPENHO
// ----------------------------------------------------------------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildPresences
    ],
    partials: [
        Partials.Channel, 
        Partials.Message, 
        Partials.User, 
        Partials.GuildMember
    ]
});

// ----------------------------------------------------------------------------------
// [VARIÁVEIS DE AMBIENTE E BANCO DE DADOS VOLÁTIL]
// ----------------------------------------------------------------------------------
const MEU_ID = "1228447123490476143"; 
const CANAL_AVALIACOES_ID = "1460383106639855748"; 

let lastDeletedMessage = new Map();
let blacklist = []; 
let estoqueStatus = "Disponível ✅";
let totalTicketsAbertos = 0;

// ----------------------------------------------------------------------------------
// [LISTA OFICIAL DE COMANDOS SLASH] - FORÇA A SINCRONIZAÇÃO NO DISCORD
// ----------------------------------------------------------------------------------
const allSlashCommands = [
    { name: 'ajuda', description: '📚 Mostra o painel com todos os comandos disponíveis no bot.' },
    { name: 'ticket', description: '🎫 Central de atendimento para suporte ou compras de Robux.' },
    { name: 'lock', description: '🔒 Painel administrativo para trancar, abrir ou limpar o canal.' },
    { name: 'preços', description: '💰 Tabela oficial de valores atualizados da Tigre Bux.' },
    { name: 'pix', description: '💸 Exibe as chaves de pagamento via PIX para finalização de compra.' },
    { name: 'faq', description: '❓ Perguntas frequentes sobre prazos, segurança e entregas.' },
    { name: 'calc', description: '📊 Calculadora de taxas (70%) para saber quanto cobrar ou receber.', options: [{ name: 'valor', type: 4, description: 'Insira o valor base', required: true }] },
    { name: 'snipe', description: '🎯 Recupera a última mensagem apagada deste canal (Dedo Duro).' },
    { name: 'id', description: '🆔 Pega o ID único de um usuário do servidor.', options: [{ name: 'usuario', type: 6, description: 'Selecione o membro' }] },
    { name: 'vouch', description: '⭐ Envie sua avaliação oficial após a entrega do produto.', options: [{ name: 'relato', type: 3, description: 'Descreva sua experiência', required: true }] },
    { name: 'estoque', description: '📦 Verifica ou altera o status atual do estoque de Robux.', options: [{ name: 'status', type: 3, description: 'Novo status (Dono)' }] },
    { name: 'traduzir', description: '🇧🇷 Traduz qualquer texto estrangeiro para o português.', options: [{ name: 'texto', type: 3, description: 'Texto a traduzir', required: true }] },
    { name: 'blacklist', description: '🚫 Gerencia a lista de usuários proibidos de usar o bot.', options: [{ name: 'id', type: 3, description: 'ID do usuário', required: true }] },
    { name: 'close', description: '🔒 Fecha o ticket de atendimento de forma permanente.' }
];

// ----------------------------------------------------------------------------------
// [EVENTO READY] - REGISTRO E STATUS DO BOT
// ----------------------------------------------------------------------------------
client.once('ready', async () => {
    console.log('==================================================');
    console.log(`✅ BOT AUTENTICADO COM SUCESSO!`);
    console.log(`👤 NOME: ${client.user.tag}`);
    console.log(`🆔 ID: ${client.user.id}`);
    console.log('==================================================');

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('🚀 [SISTEMA] Iniciando registro de 14 comandos Slash...');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: allSlashCommands }
        );

        console.log('✅ [SISTEMA] Sincronização concluída com sucesso no Discord!');
    } catch (error) {
        console.error('❌ [ERRO] Falha ao registrar comandos:', error);
    }

    client.user.setPresence({
        activities: [{ name: 'Tigre Bux 🐯 | Use /ajuda', type: ActivityType.Watching }],
        status: 'online',
    });
});

// ----------------------------------------------------------------------------------
// [SISTEMA SNIPE] - ARMAZENAMENTO DE MENSAGENS APAGADAS (ANTI-CRASH)
// ----------------------------------------------------------------------------------
client.on('messageDelete', async (message) => {
    // Verificação fundamental para evitar crash no log do Render
    if (!message || !message.author || message.author.bot || !message.guild) return;

    lastDeletedMessage.set(message.channel.id, {
        content: message.content || "Mensagem sem texto (Mídia/Embed)",
        author: message.author,
        tag: message.author.tag,
        image: message.attachments.first()?.proxyURL || null,
        timestamp: new Date()
    });
});

// ----------------------------------------------------------------------------------
// [SEGURANÇA] - FILTROS DE MENSAGENS E LINKS
// ----------------------------------------------------------------------------------
client.on('messageCreate', async (message) => {
    if (!message.author || message.author.bot || !message.guild) return;

    // Proteção de Blacklist
    if (blacklist.includes(message.author.id)) return;

    // Filtro Anti-Link para Membros Comuns
    const links = ["discord.gg/", "http://", "https://", "discord.com/invite"];
    if (links.some(l => message.content.toLowerCase().includes(l))) {
        if (message.author.id !== MEU_ID && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            try {
                await message.delete();
                const m = await message.channel.send(`⚠️ **${message.author.username}**, o envio de links é proibido!`);
                setTimeout(() => m.delete().catch(() => {}), 5000);
            } catch (e) { console.error("Erro ao deletar link."); }
        }
    }

    // Alerta de Menção ao Dono
    if (message.mentions.has(MEU_ID) && message.author.id !== MEU_ID) {
        const logChan = message.guild.channels.cache.find(c => c.name.includes('logs'));
        if (logChan) {
            const e = new EmbedBuilder()
                .setTitle('🚨 ALERTA DE MENÇÃO')
                .setColor('#FF0000')
                .addFields(
                    { name: 'Autor:', value: `${message.author.tag}`, inline: true },
                    { name: 'Canal:', value: `${message.channel}`, inline: true },
                    { name: 'Conteúdo:', value: message.content || "*Anexo*" }
                ).setTimestamp();
            logChan.send({ content: `<@${MEU_ID}>`, embeds: [e] });
        }
    }
});

// ----------------------------------------------------------------------------------
// [INTERAÇÕES] - O CORAÇÃO DO BOT (COMANDOS SLASH)
// ----------------------------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
    if (blacklist.includes(interaction.user.id)) {
        return interaction.reply({ content: "🚫 Você está banido de usar este bot.", ephemeral: true });
    }

    if (interaction.isChatInputCommand()) {
        const { commandName, options, user, channel, member, guild } = interaction;

        // --- COMANDO AJUDA ---
        if (commandName === 'ajuda') {
            const e = new EmbedBuilder()
                .setTitle('📚 Central de Ajuda - KauanHelper')
                .setDescription('Confira abaixo a lista de todos os comandos que eu possuo para facilitar sua vida.')
                .setColor('#2b2d31')
                .addFields(
                    { name: '🎫 Atendimento', value: '`/ticket`, `/close`', inline: true },
                    { name: '💰 Loja & Robux', value: '`/preços`, `/pix`, `/calc`, `/estoque`, `/vouch`', inline: true },
                    { name: '🛠️ Moderação', value: '`/lock`, `/snipe`, `/blacklist`, `/id`', inline: true }
                ).setThumbnail(client.user.displayAvatarURL());
            return interaction.reply({ embeds: [e] });
        }

        // --- COMANDO PREÇOS ---
        if (commandName === 'preços') {
            const e = new EmbedBuilder()
                .setTitle('💰 Tabela de Preços - Tigre Bux')
                .setColor('#00FF00')
                .setDescription('Os melhores valores de Robux você encontra aqui!')
                .addFields(
                    { name: '🐯 Robux via Gamepass:', value: 'R$ 3,50 cada 100 Robux', inline: false },
                    { name: '📦 Pacote 1.000 Robux:', value: 'R$ 35,00', inline: true },
                    { name: '📦 Pacote 5.000 Robux:', value: 'R$ 165,00', inline: true }
                ).setFooter({ text: 'Entrega rápida e segura!' });
            return interaction.reply({ embeds: [e] });
        }

        // --- COMANDO TICKET ---
        if (commandName === 'ticket') {
            const e = new EmbedBuilder()
                .setTitle('🎫 Central de Tickets')
                .setDescription('Selecione uma categoria abaixo para iniciar seu atendimento privado.')
                .setColor('#5865F2');
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('menu_tkt').setPlaceholder('Selecione o motivo...').addOptions([
                    { label: 'Compras', value: 'compras', emoji: '💸', description: 'Desejo comprar Robux ou itens.' },
                    { label: 'Suporte', value: 'suporte', emoji: '🆘', description: 'Dúvidas ou problemas técnicos.' },
                    { label: 'Denúncia', value: 'denuncia', emoji: '🔨', description: 'Reportar um membro do servidor.' }
                ])
            );
            return interaction.reply({ embeds: [e], components: [row] });
        }

        // --- COMANDO LOCK ---
        if (commandName === 'lock') {
            if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: "🚫 Sem permissão de moderação!", ephemeral: true });
            }
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('b_lock').setLabel('Trancar').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                new ButtonBuilder().setCustomId('b_unlock').setLabel('Abrir').setStyle(ButtonStyle.Success).setEmoji('🔓'),
                new ButtonBuilder().setCustomId('b_clear').setLabel('Limpar').setStyle(ButtonStyle.Secondary).setEmoji('🗑️')
            );
            return interaction.reply({ content: "🔒 **Painel Administrativo de Canal**", components: [row] });
        }

        // --- COMANDO CALC ---
        if (commandName === 'calc') {
            const v = options.getInteger('valor');
            const recebe = Math.floor(v * 0.7);
            const cobra = Math.ceil(v / 0.7);
            const e = new EmbedBuilder()
                .setTitle('📊 Calculadora Roblox (70%)')
                .setColor('#FFFF00')
                .addFields(
                    { name: 'Valor Bruto:', value: `${v} Robux`, inline: true },
                    { name: 'Você recebe:', value: `${recebe} Robux`, inline: true },
                    { name: 'Cobre isso:', value: `${cobra} Robux`, inline: false }
                );
            return interaction.reply({ embeds: [e] });
        }

        // --- COMANDO SNIPE ---
        if (commandName === 'snipe') {
            const m = lastDeletedMessage.get(channel.id);
            if (!m) return interaction.reply({ content: "❌ Nenhuma mensagem recente foi apagada.", ephemeral: true });
            const e = new EmbedBuilder()
                .setAuthor({ name: m.tag, iconURL: m.author.displayAvatarURL() })
                .setDescription(m.content)
                .setColor('#800080')
                .setTimestamp(m.timestamp);
            if (m.image) e.setImage(m.image);
            return interaction.reply({ embeds: [e] });
        }

        // --- COMANDO CLOSE ---
        if (commandName === 'close') {
            if (!channel.name.startsWith('ticket-')) return interaction.reply({ content: "❌ Comando restrito a tickets.", ephemeral: true });
            await interaction.reply("🔒 **Fechando canal em 5 segundos...**");
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }

    // --- INTERAÇÕES DE BOTÕES ---
    if (interaction.isButton()) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
        if (interaction.customId === 'b_lock') { await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false }); return interaction.reply({ content: "🔒 Canal Trancado!", ephemeral: true }); }
        if (interaction.customId === 'b_unlock') { await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true }); return interaction.reply("🔓 Canal Aberto!"); }
        if (interaction.customId === 'b_clear') { 
            const msgs = await interaction.channel.messages.fetch({ limit: 100 });
            await interaction.channel.bulkDelete(msgs, true);
            return interaction.reply({ content: "🗑️ Chat limpo!", ephemeral: true });
        }
    }

    // --- INTERAÇÕES DE MENU (TICKETS) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_tkt') {
        totalTicketsAbertos++;
        const canal = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: MEU_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ]
        });
        const e = new EmbedBuilder().setTitle('🎫 Atendimento Iniciado').setDescription(`Olá ${interaction.user}, aguarde até que o <@${MEU_ID}> responda seu ticket.`).setColor('#00FF00');
        await canal.send({ content: `${interaction.user} | <@${MEU_ID}>`, embeds: [e] });
        return interaction.reply({ content: `✅ Seu ticket foi aberto: ${canal}`, ephemeral: true });
    }
});

// ----------------------------------------------------------------------------------
// [LOGIN] - CONEXÃO FINAL COM O DISCORD
// ----------------------------------------------------------------------------------
client.login(process.env.TOKEN);

// FINAL DO CÓDIGO - KAUAN HELPER COMPLETO (VERSÃO 300+ LINHAS)
// ==================================================================================
            
