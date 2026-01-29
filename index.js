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
const MEU_ID = "1228447123490476143"; 
const CANAL_AVALIACOES_ID = "1460383106639855748"; 

let estoqueRobux = "Disponível ✅"; 
let lastDeletedMessage = {};
let blacklist = []; 

// ==========================================
//      REGISTRO DE COMANDOS DE BARRA
// ==========================================
const commands = [
    { name: 'lock', description: '🔒 Abre o painel de controle de tranca do canal.' },
    { name: 'ticket', description: '🎫 Abre a central de atendimento para suporte ou compras.' },
    { name: 'pix', description: '💸 Exibe as chaves de pagamento via PIX.' },
    { name: 'faq', description: '❓ Veja as perguntas mais frequentes dos clientes.' },
    { name: 'traduzir', description: '🇧🇷 Traduz um texto automaticamente para português.', options: [{ name: 'texto', type: 3, description: 'Texto para traduzir', required: true }] },
    { name: 'close', description: '🔒 Fecha o ticket atual permanentemente.' },
    { name: 'snipe', description: '🎯 Mostra a última mensagem que foi apagada no canal.' },
    { name: 'id', description: '🆔 Pega o ID de um usuário específico.', options: [{ name: 'usuario', type: 6, description: 'Selecione o usuário' }] },
    { name: 'estoque', description: '📦 Ver ou alterar o status do estoque de Robux.', options: [{ name: 'status', type: 3, description: 'Novo status (Dono apenas)' }] },
    { name: 'calc', description: '📊 Calcula quanto você recebe ou quanto deve cobrar.', options: [{ name: 'valor', type: 4, description: 'Valor base para o cálculo', required: true }] },
    { name: 'vouch', description: '⭐ Envia uma avaliação para o canal oficial.', options: [{ name: 'relato', type: 3, description: 'Seu comentário sobre a venda', required: true }] },
    { name: 'blacklist', description: '🚫 Gerencia a lista negra do bot.', options: [{ name: 'usuario_id', type: 3, description: 'ID do usuário', required: true }] },
    { name: 'ajuda', description: '📚 Mostra a lista completa de comandos do bot.' }
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
        console.log('🚀 Sincronizando comandos de barra (/)...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comandos registrados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }

    client.user.setPresence({
        activities: [{ name: 'Tigre Bux 🐯 | Use /ajuda', type: ActivityType.Watching }],
        status: 'online',
    });
});

// ==========================================
//          SISTEMA DEDO DURO (SNIPE)
// ==========================================
client.on('messageDelete', async (message) => {
    if (!message || !message.author || message.author.bot || !message.guild) return;
    lastDeletedMessage[message.channel.id] = {
        content: message.content,
        author: message.author,
        tag: message.author.tag,
        image: message.attachments.first()?.proxyURL,
        timestamp: new Date()
    };
});

// ==========================================
//          PROCESSAMENTO DE SEGURANÇA
// ==========================================
client.on('messageCreate', async (message) => {
    if (!message.author || message.author.bot || !message.guild) return;
    if (blacklist.includes(message.author.id)) return;

    // --- ANTI-LINK AUTOMÁTICO ---
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

    // --- LOG DE MENÇÃO AO DONO ---
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
});

// ==========================================
//        LÓGICA DE INTERAÇÕES (SLASH)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (blacklist.includes(interaction.user.id)) return interaction.reply({ content: "🚫 Você está na blacklist e não pode usar o bot.", ephemeral: true });

    if (interaction.isChatInputCommand()) {
        const { commandName, options, user, channel, member, guild } = interaction;

        if (commandName === 'lock') {
            if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: "🚫 Você não tem permissão para gerenciar canais.", ephemeral: true });
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
            return interaction.reply({ embeds: [embedLock], components: [row] });
        }

        if (commandName === 'ticket') {
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
            return interaction.reply({ embeds: [embedTicket], components: [menu] });
        }

        if (commandName === 'pix') {
            const embed = new EmbedBuilder()
                .setTitle('💸 Pagamento PIX')
                .setDescription('Chave: `SUA_CHAVE_AQUI` \n\nEnvie o comprovante no ticket!')
                .setColor('#00FFFF');
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'faq') {
            const embed = new EmbedBuilder()
                .setTitle('❓ FAQ - Perguntas Frequentes')
                .setColor('#FFA500')
                .addFields(
                    { name: 'É confiável?', value: 'Sim! Veja nossas avaliações em <#1460383106639855748>.' },
                    { name: 'Qual o prazo?', value: 'Entrega imediata após confirmação.' },
                    { name: 'Formas de pagamento?', value: 'PIX, Cartão e Saldo.' }
                );
            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'traduzir') {
            const txt = options.getString('texto');
            try {
                const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURI(txt)}`);
                return interaction.reply(`🇧🇷 **Tradução:** ${res.data[0][0][0]}`);
            } catch (e) { return interaction.reply("❌ Erro ao traduzir."); }
        }

        if (commandName === 'close') {
            if (!channel.name.startsWith('ticket-')) return interaction.reply({ content: "❌ Este comando só pode ser usado dentro de um ticket.", ephemeral: true });
            if (user.id === MEU_ID || member.permissions.has(PermissionFlagsBits.Administrator)) {
                await interaction.reply("🔒 **Encerrando ticket em 5 segundos...**");
                setTimeout(() => channel.delete().catch(() => {}), 5000);
            } else {
                return interaction.reply({ content: "🚫 Apenas administradores podem fechar tickets.", ephemeral: true });
            }
        }

        if (commandName === 'snipe') {
            const msg = lastDeletedMessage[channel.id];
            if (!msg) return interaction.reply({ content: "❌ Nenhuma mensagem apagada recentemente.", ephemeral: true });
            const e = new EmbedBuilder().setAuthor({ name: msg.tag }).setDescription(msg.content || "Anexo/Imagem").setColor('#800080');
            if (msg.image) e.setImage(msg.image);
            return interaction.reply({ embeds: [e] });
        }

        if (commandName === 'id') {
            const target = options.getUser('usuario') || user;
            return interaction.reply(`🆔 ID: \`${target.id}\``);
        }

        if (commandName === 'estoque') {
            const novoStatus = options.getString('status');
            if (user.id === MEU_ID && novoStatus) {
                estoqueRobux = novoStatus;
                return interaction.reply(`✅ Estoque atualizado para: **${estoqueRobux}**`);
            }
            return interaction.reply(`📦 Estoque atual: **${estoqueRobux}**`);
        }

        if (commandName === 'calc') {
            const v = options.getInteger('valor');
            return interaction.reply(`📊 Recebe: **${Math.floor(v * 0.7)}** | Cobrar: **${Math.ceil(v / 0.7)}**`);
        }

        if (commandName === 'vouch') {
            const relato = options.getString('relato');
            const canalV = client.channels.cache.get(CANAL_AVALIACOES_ID);
            if (canalV) {
                canalV.send({ embeds: [new EmbedBuilder().setTitle('⭐ Nova Avaliação!').setDescription(relato).setColor('#FFFF00').setFooter({ text: `Por: ${user.tag}` })] });
                return interaction.reply({ content: "✅ Vouch enviado com sucesso!", ephemeral: true });
            }
        }

        if (commandName === 'blacklist') {
            if (user.id !== MEU_ID) return interaction.reply({ content: "🚫 Comando restrito ao dono.", ephemeral: true });
            const alvo = options.getString('usuario_id');
            if (blacklist.includes(alvo)) {
                blacklist = blacklist.filter(id => id !== alvo);
                return interaction.reply(`✅ <@${alvo}> foi removido da blacklist.`);
            } else {
                blacklist.push(alvo);
                return interaction.reply(`🚫 <@${alvo}> foi adicionado à blacklist.`);
            }
        }

        if (commandName === 'ajuda') {
            const e = new EmbedBuilder()
                .setTitle('📚 Central de Comandos - KauanHelper')
                .setDescription('Agora todos os comandos utilizam `/` para maior segurança e facilidade.')
                .setColor('#2b2d31')
                .addFields(
                    { name: '🎫 Atendimento', value: '`/ticket`, `/close`' },
                    { name: '💰 Vendas/Loja', value: '`/estoque`, `/pix`, `/calc`, `/vouch`, `/faq`' },
                    { name: '🛠️ Moderação', value: '`/lock`, `/blacklist`, `/snipe`' },
                    { name: '🌐 Geral', value: '`/id`, `/traduzir`' }
                )
                .setFooter({ text: 'Tigre Bux - O melhor preço sempre!' });
            return interaction.reply({ embeds: [e] });
        }
    }

    // --- LÓGICA DE BOTÕES ---
    if (interaction.isButton()) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: "🚫 Sem permissão!", ephemeral: true });

        if (interaction.customId === 'btn_lock') {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
            return interaction.reply({ content: "🔒 Canal bloqueado com sucesso!", ephemeral: true });
        }
        if (interaction.customId === 'btn_unlock') {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });
            return interaction.reply({ embeds: [new EmbedBuilder().setDescription('🔓 **Canal desbloqueado por um administrador!**').setColor('#00FF00')] });
        }
        if (interaction.customId === 'btn_clear') {
            const msgs = await interaction.channel.messages.fetch({ limit: 100 });
            const clean = msgs.filter(m => m.id !== interaction.message.id);
            await interaction.channel.bulkDelete(clean, true).catch(() => {});
            return interaction.reply({ content: "🗑️ Chat limpo!", ephemeral: true });
        }
    }

    // --- LÓGICA DE TICKETS ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket') {
        const cat = interaction.values[0];
        const canal = await interaction.guild.channels.create({
            name: `ticket-${cat}-${interaction.user.username.toLowerCase()}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: MEU_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ],
        });
        await canal.send({ content: `${interaction.user} | <@${MEU_ID}>`, embeds: [new EmbedBuilder().setTitle(`Ticket: ${cat.toUpperCase()}`).setDescription("Olá! Explique sua dúvida e aguarde o dono.").setColor('#00FF00')] });
        await interaction.reply({ content: `✅ Seu ticket foi criado: ${canal}`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);
        
