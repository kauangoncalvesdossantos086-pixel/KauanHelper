// ==========================================
//        KAUAN HELPER - SISTEMA COMPLETO
// ==========================================

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
//        CONFIGURAÇÃO DO SERVIDOR WEB
// ==========================================

const app = express();
app.get('/', (req, res) => {
    res.send('KauanHelper Full System Online! 🚀🐯');
});
app.listen(3000, () => {
    console.log('📡 [SERVIDOR] Monitoramento HTTP ativo na porta 3000');
});

// ==========================================
//          INSTÂNCIA DO CLIENTE
// ==========================================

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

// ==========================================
//            VARIÁVEIS DE ESTADO
// ==========================================

const MEU_ID = "1228447123490476143"; 
const CANAL_AVALIACOES_ID = "1460383106639855748"; 

let estoqueRobux = "Disponível ✅"; 
let lastDeletedMessage = {};
let blacklist = []; 

// ==========================================
//      DEFINIÇÃO DOS COMANDOS SLASH (/)
// ==========================================

const commands = [
    {
        name: 'ajuda',
        description: '📚 Lista completa de todos os comandos do bot.'
    },
    {
        name: 'ticket',
        description: '🎫 Abre a central de atendimento para suporte ou compras.'
    },
    {
        name: 'lock',
        description: '🔒 Abre o painel de controle para gerenciar o canal.'
    },
    {
        name: 'pix',
        description: '💸 Exibe as chaves de pagamento e métodos PIX.'
    },
    {
        name: 'faq',
        description: '❓ Perguntas frequentes e dúvidas comuns dos clientes.'
    },
    {
        name: 'traduzir',
        description: '🇧🇷 Traduz um texto automaticamente para português.',
        options: [{ name: 'texto', type: 3, description: 'O texto que deseja traduzir', required: true }]
    },
    {
        name: 'close',
        description: '🔒 Encerra o ticket atual de forma definitiva.'
    },
    {
        name: 'snipe',
        description: '🎯 Mostra a última mensagem que foi apagada neste canal.'
    },
    {
        name: 'id',
        description: '🆔 Pega o ID de um usuário ou o seu próprio.',
        options: [{ name: 'usuario', type: 6, description: 'Selecione o usuário', required: false }]
    },
    {
        name: 'estoque',
        description: '📦 Ver ou alterar o status do estoque de Robux.',
        options: [{ name: 'status', type: 3, description: 'Novo status do estoque', required: false }]
    },
    {
        name: 'calc',
        description: '📊 Calcula taxas de 70% e valores de cobrança.',
        options: [{ name: 'valor', type: 4, description: 'Valor base para calcular', required: true }]
    },
    {
        name: 'vouch',
        description: '⭐ Envia uma avaliação positiva para o canal oficial.',
        options: [{ name: 'relato', type: 3, description: 'Conte como foi sua compra', required: true }]
    },
    {
        name: 'blacklist',
        description: '🚫 Gerencia usuários proibidos de usar o bot.',
        options: [{ name: 'id', type: 3, description: 'ID do usuário para banir/desbanir', required: true }]
    },
    {
        name: 'preços',
        description: '💰 Exibe a tabela oficial de preços de Robux.'
    }
];

// ==========================================
//            EVENTO: READY (ON)
// ==========================================

client.once('ready', async () => {
    console.log('==========================================');
    console.log(`✅ LOGADO COM SUCESSO: ${client.user.tag}`);
    console.log(`🆔 ID DO BOT: ${client.user.id}`);
    console.log(`🐯 PRONTO PARA ATENDER OS CLIENTES`);
    console.log('==========================================');

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('🚀 Sincronizando comandos globais no Discord...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Todos os comandos de barra (/) foram registrados!');
    } catch (error) {
        console.error('❌ Erro crítico no registro de comandos:', error);
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
    // Verificação de segurança para evitar crash no Render
    if (!message || !message.author || message.author.bot || !message.guild) {
        return;
    }

    lastDeletedMessage[message.channel.id] = {
        content: message.content || "Mensagem sem texto detectada.",
        author: message.author,
        tag: message.author.tag,
        image: message.attachments.first()?.proxyURL || null,
        timestamp: new Date()
    };
});

// ==========================================
//         SISTEMA DE MODERAÇÃO AUTO
// ==========================================

client.on('messageCreate', async (message) => {
    if (!message.author || message.author.bot || !message.guild) return;

    // Filtro de Blacklist
    if (blacklist.includes(message.author.id)) {
        return;
    }

    // --- SISTEMA ANTI-LINK ---
    const proibidos = ["discord.gg/", "http://", "https://", "discord.com/invite"];
    if (proibidos.some(link => message.content.toLowerCase().includes(link))) {
        if (message.author.id !== MEU_ID && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            try {
                await message.delete();
                const aviso = await message.channel.send(`⚠️ **${message.author.username}**, o envio de links externos é estritamente proibido aqui!`);
                setTimeout(() => aviso.delete().catch(() => {}), 6000);
                return;
            } catch (err) {
                console.log("Erro ao tentar deletar link proibido.");
            }
        }
    }

    // --- LOG DE MENÇÃO AO DONO ---
    if (message.mentions.has(MEU_ID) && message.author.id !== MEU_ID) {
        const canalLog = message.guild.channels.cache.find(c => c.name.includes('logs') || c.name.includes('menções'));
        if (canalLog) {
            const embedMenção = new EmbedBuilder()
                .setTitle('🚨 ALERTA DE MENÇÃO DETECTADA')
                .setColor('#FF0000')
                .setThumbnail(message.author.displayAvatarURL())
                .addFields(
                    { name: '👤 Usuário:', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: false },
                    { name: '📍 Localização:', value: `${message.channel}`, inline: true },
                    { name: '💬 Mensagem Enviada:', value: message.content || "*Conteúdo não textual*", inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Sistema de Monitoramento Tigre Bux' });

            canalLog.send({ content: `<@${MEU_ID}>`, embeds: [embedMenção] });
        }
    }
});

// ==========================================
//        LÓGICA DE INTERAÇÕES (SLASH)
// ==========================================

client.on('interactionCreate', async (interaction) => {
    // Bloqueio de Blacklist nas interações
    if (blacklist.includes(interaction.user.id)) {
        return interaction.reply({ content: "🚫 Você está banido de utilizar as funções deste bot.", ephemeral: true });
    }

    // --- PROCESSAMENTO DE COMANDOS DE CHAT ---
    if (interaction.isChatInputCommand()) {
        const { commandName, options, user, channel, member, guild } = interaction;

        // COMANDO: LOCK
        if (commandName === 'lock') {
            if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: "🚫 Você não possui permissão de `Gerenciar Canais`!", ephemeral: true });
            }
            
            const embedLock = new EmbedBuilder()
                .setTitle('🔒 Painel de Controle Administrativo')
                .setDescription('Utilize os botões abaixo para gerenciar o estado deste canal em tempo real.')
                .setColor('#2b2d31')
                .addFields(
                    { name: 'Bloquear:', value: 'Ninguém poderá enviar mensagens.', inline: true },
                    { name: 'Desbloquear:', value: 'O chat volta ao normal.', inline: true }
                );

            const rowLock = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_lock').setLabel('Trancar Canal').setEmoji('🔒').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('btn_unlock').setLabel('Abrir Canal').setEmoji('🔓').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_clear').setLabel('Limpar Tudo').setEmoji('🗑️').setStyle(ButtonStyle.Secondary)
            );

            return interaction.reply({ embeds: [embedLock], components: [rowLock] });
        }

        // COMANDO: TICKET
        if (commandName === 'ticket') {
            const embedTicket = new EmbedBuilder()
                .setTitle('🎫 Central de Suporte - KauanHelper')
                .setDescription('Para um atendimento rápido e eficiente, escolha a categoria que melhor define sua necessidade.')
                .setColor('#00FF00')
                .setImage('https://i.imgur.com/link_da_sua_imagem.png');

            const menuTicket = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_ticket')
                    .setPlaceholder('Selecione o motivo do seu contato...')
                    .addOptions([
                        { label: 'Compras Robux', description: 'Desejo adquirir Robux com o melhor preço.', value: 'compras', emoji: '💸' },
                        { label: 'Blox Fruits', description: 'Comprar frutas ou serviços de up.', value: 'bloxfruits', emoji: '🍎' },
                        { label: 'Suporte Técnico', description: 'Dúvidas sobre entregas ou erros.', value: 'suporte', emoji: '🆘' },
                        { label: 'Denúncias', description: 'Reportar comportamentos inadequados.', value: 'denuncias', emoji: '🔨' }
                    ])
            );

            return interaction.reply({ embeds: [embedTicket], components: [menuTicket] });
        }

        // COMANDO: PIX
        if (commandName === 'pix') {
            const embedPix = new EmbedBuilder()
                .setTitle('💸 Informações de Pagamento PIX')
                .setDescription('Após realizar o pagamento, envie o comprovante imediatamente no seu ticket aberto.')
                .addFields(
                    { name: '🔑 Chave PIX (E-mail):', value: '`SUA_CHAVE_AQUI`', inline: false },
                    { name: '👤 Nome do Favorecido:', value: '`SEU_NOME_AQUI`', inline: true },
                    { name: '🏦 Banco:', value: '`NUBANK / INTER`', inline: true }
                )
                .setColor('#00FFFF')
                .setFooter({ text: 'Pagamentos via PIX são aprovados na hora!' });

            return interaction.reply({ embeds: [embedPix] });
        }

        // COMANDO: CALC
        if (commandName === 'calc') {
            const valorCalculo = options.getInteger('valor');
            const recebe = Math.floor(valorCalculo * 0.7);
            const cobra = Math.ceil(valorCalculo / 0.7);

            const embedCalc = new EmbedBuilder()
                .setTitle('📊 Calculadora de Taxas (Roblox 30%)')
                .setColor('#FFFF00')
                .addFields(
                    { name: '💰 Se você vender por:', value: `R$ ${valorCalculo}`, inline: true },
                    { name: '📩 Você receberá:', value: `R$ ${recebe}`, inline: true },
                    { name: '📈 Para receber o valor limpo, cobre:', value: `R$ ${cobra}`, inline: false }
                );

            return interaction.reply({ embeds: [embedCalc] });
        }

        // COMANDO: SNIPE
        if (commandName === 'snipe') {
            const dadosSnipe = lastDeletedMessage[channel.id];
            if (!dadosSnipe) {
                return interaction.reply({ content: "❌ Não há registros de mensagens apagadas recentemente neste canal.", ephemeral: true });
            }

            const embedSnipe = new EmbedBuilder()
                .setAuthor({ name: `Mensagem de ${dadosSnipe.tag}`, iconURL: dadosSnipe.author.displayAvatarURL() })
                .setDescription(`**Conteúdo:**\n${dadosSnipe.content}`)
                .setColor('#800080')
                .setTimestamp(dadosSnipe.timestamp);

            if (dadosSnipe.image) {
                embedSnipe.setImage(dadosSnipe.image);
            }

            return interaction.reply({ embeds: [embedSnipe] });
        }

        // COMANDO: CLOSE
        if (commandName === 'close') {
            if (!channel.name.startsWith('ticket-')) {
                return interaction.reply({ content: "❌ Este comando só é válido dentro de canais de ticket.", ephemeral: true });
            }
            
            await interaction.reply("🔒 **O ticket será encerrado e deletado em 5 segundos...**");
            setTimeout(() => {
                channel.delete().catch(() => {
                    console.log("Erro ao deletar canal de ticket.");
                });
            }, 5000);
        }

        // COMANDO: AJUDA
        if (commandName === 'ajuda') {
            const embedAjuda = new EmbedBuilder()
                .setTitle('📚 Guia de Comandos - KauanHelper')
                .setDescription('Bem-vindo ao sistema de ajuda! Todos os nossos comandos agora utilizam a tecnologia Slash (/) do Discord.')
                .addFields(
                    { name: '🎫 Atendimento:', value: '`/ticket`, `/close`', inline: true },
                    { name: '💰 Economia:', value: '`/pix`, `/calc`, `/estoque`, `/vouch`', inline: true },
                    { name: '🛠️ Moderação:', value: '`/lock`, `/snipe`, `/blacklist`', inline: true },
                    { name: '🌐 Utilidades:', value: '`/id`, `/traduzir`, `/faq`, `/preços`', inline: true }
                )
                .setColor('#2b2d31')
                .setFooter({ text: 'Tigre Bux - Qualidade e Segurança' });

            return interaction.reply({ embeds: [embedAjuda] });
        }
    }

    // --- PROCESSAMENTO DE BOTÕES ---
    if (interaction.isButton()) {
        const { customId, member, channel, guild } = interaction;

        if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: "🚫 Apenas moderadores podem usar estes botões.", ephemeral: true });
        }

        if (customId === 'btn_lock') {
            await channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
            return interaction.reply({ content: "🔒 Canal devidamente bloqueado para membros!", ephemeral: true });
        }

        if (customId === 'btn_unlock') {
            await channel.permissionOverwrites.edit(guild.id, { SendMessages: true });
            return interaction.reply({ content: "🔓 Canal desbloqueado com sucesso!", ephemeral: false });
        }

        if (customId === 'btn_clear') {
            const mensagensParaDeletar = await channel.messages.fetch({ limit: 100 });
            const filtradas = mensagensParaDeletar.filter(m => m.id !== interaction.message.id);
            await channel.bulkDelete(filtradas, true);
            return interaction.reply({ content: "🗑️ O chat foi limpo com sucesso (mensagens com mais de 14 dias não podem ser apagadas).", ephemeral: true });
        }
    }

    // --- PROCESSAMENTO DE TICKETS (SELECT MENU) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket') {
        const categoriaSelecionada = interaction.values[0];
        
        const canalTicket = await interaction.guild.channels.create({
            name: `ticket-${categoriaSelecionada}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: MEU_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ],
        });

        const embedBoasVindas = new EmbedBuilder()
            .setTitle(`Novo Ticket: ${categoriaSelecionada.toUpperCase()}`)
            .setDescription(`Olá ${interaction.user}, seja bem-vindo ao seu atendimento individual.\n\nPor favor, descreva detalhadamente sua dúvida ou pedido abaixo e aguarde o <@${MEU_ID}> responder.`)
            .setColor('#00FF00')
            .setTimestamp();

        await canalTicket.send({ content: `${interaction.user} | <@${MEU_ID}>`, embeds: [embedBoasVindas] });
        await interaction.reply({ content: `✅ Seu ticket foi aberto com sucesso em: ${canalTicket}`, ephemeral: true });
    }
});

// ==========================================
//          LOGIN FINAL DO BOT
// ==========================================

client.login(process.env.TOKEN);

// FINAL DO CÓDIGO - KAUAN HELPER V3.0
    
