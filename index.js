// =================================================================
//        KAUAN HELPER - SISTEMA OFICIAL TIGRE BUX (V3.0)
// =================================================================
// Desenvolvido para: kauanu791
// Funções: Tickets, Moderação, Economia, Snipe e Segurança
// =================================================================

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

// -----------------------------------------------------------------
// WEB SERVER (MANTER O BOT ONLINE NO RENDER 24/7)
// -----------------------------------------------------------------
const app = express();
app.get('/', (req, res) => {
    res.send('<h1>KauanHelper está online! 🚀</h1><p>Sistema operando normalmente.</p>');
});

app.listen(3000, () => {
    console.log('📡 [SERVIDOR] Monitoramento HTTP ativo na porta 3000');
});

// -----------------------------------------------------------------
// CONFIGURAÇÃO DO CLIENTE E INTENTS
// -----------------------------------------------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        Partials.Channel, 
        Partials.Message, 
        Partials.User,
        Partials.GuildMember
    ]
});

// -----------------------------------------------------------------
// CONFIGURAÇÕES GERAIS E BANCO DE DADOS TEMPORÁRIO
// -----------------------------------------------------------------
const MEU_ID = "1228447123490476143"; 
const CANAL_AVALIACOES_ID = "1460383106639855748"; 

let estoqueRobux = "Disponível ✅"; 
let lastDeletedMessage = {};
let blacklist = []; 

// -----------------------------------------------------------------
// DEFINIÇÃO DE COMANDOS SLASH (/)
// -----------------------------------------------------------------
const slashCommands = [
    {
        name: 'ajuda',
        description: '📚 Abre o painel com todos os comandos disponíveis no bot.'
    },
    {
        name: 'ticket',
        description: '🎫 Central de atendimento para compras e suporte técnico.'
    },
    {
        name: 'lock',
        description: '🔒 Abre o painel de gerenciamento de tranca e limpeza de chat.'
    },
    {
        name: 'preços',
        description: '💰 Veja a nossa tabela atualizada de preços de Robux.'
    },
    {
        name: 'pix',
        description: '💸 Informações sobre pagamentos via PIX e chaves.'
    },
    {
        name: 'faq',
        description: '❓ Respostas para as dúvidas mais comuns dos nossos clientes.'
    },
    {
        name: 'calc',
        description: '📊 Calculadora de taxas do Roblox (Sistema de 70%).',
        options: [{ name: 'valor', type: 4, description: 'Insira o valor total', required: true }]
    },
    {
        name: 'snipe',
        description: '🎯 Recupera a última mensagem que foi apagada neste canal.'
    },
    {
        name: 'id',
        description: '🆔 Mostra o seu ID ou o ID de um usuário mencionado.',
        options: [{ name: 'usuario', type: 6, description: 'Selecione o usuário', required: false }]
    },
    {
        name: 'vouch',
        description: '⭐ Envie sua avaliação oficial após uma compra realizada.',
        options: [{ name: 'texto', type: 3, description: 'Escreva seu relato da compra', required: true }]
    },
    {
        name: 'estoque',
        description: '📦 Atualiza ou visualiza a situação atual do estoque.',
        options: [{ name: 'status', type: 3, description: 'Novo status (Apenas Dono)', required: false }]
    },
    {
        name: 'traduzir',
        description: '🇧🇷 Traduz instantaneamente um texto para o português.',
        options: [{ name: 'texto', type: 3, description: 'Texto a ser traduzido', required: true }]
    },
    {
        name: 'blacklist',
        description: '🚫 Adiciona ou remove um usuário da lista de banidos.',
        options: [{ name: 'usuario_id', type: 3, description: 'ID do usuário', required: true }]
    },
    {
        name: 'close',
        description: '🔒 Comando exclusivo para encerrar e deletar tickets.'
    }
];

// -----------------------------------------------------------------
// EVENTO: INICIALIZAÇÃO (READY)
// -----------------------------------------------------------------
client.once('ready', async () => {
    console.log('==================================================');
    console.log(`🤖 BOT ONLINE: ${client.user.tag}`);
    console.log(`📡 SERVIDORES: ${client.guilds.cache.size}`);
    console.log('==================================================');

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('🚀 Iniciando sincronização de comandos de barra...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashCommands }
        );
        console.log('✅ Todos os comandos (/) foram registrados globalmente!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }

    client.user.setPresence({
        activities: [{ name: 'Tigre Bux 🐯 | Use /ajuda', type: ActivityType.Watching }],
        status: 'online',
    });
});

// -----------------------------------------------------------------
// EVENTO: SNIPE (MENSAGENS APAGADAS)
// -----------------------------------------------------------------
client.on('messageDelete', async (message) => {
    // PROTEÇÃO CONTRA CRASH NO RENDER (IMPORTANTÍSSIMO)
    if (!message || !message.author || message.author.bot || !message.guild) return;

    lastDeletedMessage[message.channel.id] = {
        content: message.content || "O conteúdo da mensagem era uma imagem ou embed.",
        author: message.author,
        tag: message.author.tag,
        image: message.attachments.first()?.proxyURL || null,
        timestamp: new Date()
    };
});

// -----------------------------------------------------------------
// EVENTO: SEGURANÇA E FILTROS (MESSAGE CREATE)
// -----------------------------------------------------------------
client.on('messageCreate', async (message) => {
    if (!message.author || message.author.bot || !message.guild) return;

    // VERIFICAÇÃO DE BLACKLIST
    if (blacklist.includes(message.author.id)) return;

    // SISTEMA ANTI-LINK
    const linksProibidos = ["discord.gg/", "https://", "http://", ".com", ".br"];
    if (linksProibidos.some(link => message.content.toLowerCase().includes(link))) {
        if (message.author.id !== MEU_ID && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            try {
                await message.delete();
                const alert = await message.channel.send(`🚫 **${message.author.username}**, você não tem permissão para enviar links!`);
                setTimeout(() => alert.delete().catch(() => {}), 5000);
                return;
            } catch (e) { console.log("Erro ao deletar link."); }
        }
    }

    // LOG DE MENÇÃO AO DONO
    if (message.mentions.has(MEU_ID) && message.author.id !== MEU_ID) {
        const logs = message.guild.channels.cache.find(c => c.name.includes('logs'));
        if (logs) {
            const embedLog = new EmbedBuilder()
                .setTitle('🚨 ALERTA DE MENÇÃO')
                .setColor('#FF0000')
                .addFields(
                    { name: '👤 Usuário:', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
                    { name: '📍 Canal:', value: `${message.channel}`, inline: true },
                    { name: '💬 Conteúdo:', value: message.content || "*Apenas mídia*" }
                )
                .setTimestamp();
            logs.send({ content: `<@${MEU_ID}>`, embeds: [embedLog] });
        }
    }
});

// -----------------------------------------------------------------
// EVENTO: INTERAÇÕES (SLASH E COMPONENTES)
// -----------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
    if (blacklist.includes(interaction.user.id)) {
        return interaction.reply({ content: "🚫 Você está na lista negra do bot.", ephemeral: true });
    }

    // --- COMANDOS DE BARRA ---
    if (interaction.isChatInputCommand()) {
        const { commandName, options, user, channel, member, guild } = interaction;

        // AJUDA
        if (commandName === 'ajuda') {
            const helpEmbed = new EmbedBuilder()
                .setTitle('📚 Central de Comandos - KauanHelper')
                .setDescription('Aqui estão todos os comandos que você pode utilizar para interagir comigo.')
                .setColor('#2b2d31')
                .addFields(
                    { name: '🎫 Atendimento', value: '`/ticket`, `/close`', inline: true },
                    { name: '💰 Economia', value: '`/preços`, `/pix`, `/calc`, `/estoque`, `/vouch`', inline: true },
                    { name: '🛠️ Moderação', value: '`/lock`, `/snipe`, `/blacklist`', inline: true },
                    { name: '🌐 Outros', value: '`/id`, `/traduzir`, `/faq`', inline: true }
                )
                .setFooter({ text: 'Tigre Bux - O melhor preço sempre!' });

            return interaction.reply({ embeds: [helpEmbed] });
        }

        // TICKET
        if (commandName === 'ticket') {
            const ticketEmbed = new EmbedBuilder()
                .setTitle('🎫 Central de Atendimento')
                .setDescription('Selecione abaixo a categoria que deseja para abrir um atendimento privado.')
                .setColor('#00FF00');

            const ticketMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_ticket')
                    .setPlaceholder('Escolha o motivo do contato...')
                    .addOptions([
                        { label: 'Compras', value: 'compras', emoji: '💸', description: 'Comprar Robux ou Itens.' },
                        { label: 'Suporte', value: 'suporte', emoji: '🆘', description: 'Tirar dúvidas ou relatar problemas.' },
                        { label: 'Denúncias', value: 'denuncia', emoji: '🔨', description: 'Denunciar algum membro.' }
                    ])
            );

            return interaction.reply({ embeds: [ticketEmbed], components: [ticketMenu] });
        }

        // LOCK
        if (commandName === 'lock') {
            if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: "🚫 Sem permissão!", ephemeral: true });
            
            const lockEmbed = new EmbedBuilder()
                .setTitle('🔒 Painel de Moderação')
                .setDescription('Controle as permissões de envio de mensagens deste canal.')
                .setColor('#2b2d31');

            const lockButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_lock').setLabel('Bloquear').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                new ButtonBuilder().setCustomId('btn_unlock').setLabel('Desbloquear').setStyle(ButtonStyle.Success).setEmoji('🔓'),
                new ButtonBuilder().setCustomId('btn_clear').setLabel('Limpar Chat').setStyle(ButtonStyle.Secondary).setEmoji('🗑️')
            );

            return interaction.reply({ embeds: [lockEmbed], components: [lockButtons] });
        }

        // PREÇOS
        if (commandName === 'preços') {
            const pEmbed = new EmbedBuilder()
                .setTitle('💰 Tabela de Preços - Tigre Bux')
                .setDescription('Nossos preços são os mais competitivos do mercado!')
                .addFields(
                    { name: '🐯 Robux via Gamepass:', value: 'R$ 3,50 cada 100 Robux', inline: false },
                    { name: '🍎 Blox Fruits:', value: 'Consulte no Ticket!', inline: false }
                )
                .setColor('#FFFF00');
            return interaction.reply({ embeds: [pEmbed] });
        }

        // CALC
        if (commandName === 'calc') {
            const val = options.getInteger('valor');
            const res = Math.floor(val * 0.7);
            const cob = Math.ceil(val / 0.7);
            
            const calcEmbed = new EmbedBuilder()
                .setTitle('📊 Calculadora de Taxas')
                .setColor('#00FFFF')
                .addFields(
                    { name: 'Valor Bruto:', value: `${val}`, inline: true },
                    { name: 'Você recebe (70%):', value: `${res}`, inline: true },
                    { name: 'Cobre isso para receber o Bruto:', value: `${cob}`, inline: false }
                );
            return interaction.reply({ embeds: [calcEmbed] });
        }

        // SNIPE
        if (commandName === 'snipe') {
            const msg = lastDeletedMessage[channel.id];
            if (!msg) return interaction.reply({ content: "❌ Nenhuma mensagem apagada recentemente.", ephemeral: true });

            const sEmbed = new EmbedBuilder()
                .setAuthor({ name: msg.tag, iconURL: msg.author.displayAvatarURL() })
                .setDescription(msg.content)
                .setColor('#800080')
                .setFooter({ text: 'Snipe System' })
                .setTimestamp(msg.timestamp);

            if (msg.image) sEmbed.setImage(msg.image);
            return interaction.reply({ embeds: [sEmbed] });
        }

        // CLOSE TICKET
        if (commandName === 'close') {
            if (!channel.name.startsWith('ticket-')) return interaction.reply({ content: "❌ Use apenas em tickets.", ephemeral: true });
            await interaction.reply("🔒 **Encerrando ticket em 5 segundos...**");
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }

        // BLACKLIST
        if (commandName === 'blacklist') {
            if (user.id !== MEU_ID) return interaction.reply({ content: "🚫 Apenas o dono!", ephemeral: true });
            const alvo = options.getString('usuario_id');
            if (blacklist.includes(alvo)) {
                blacklist = blacklist.filter(id => id !== alvo);
                return interaction.reply(`✅ Usuário \`${alvo}\` removido.`);
            } else {
                blacklist.push(alvo);
                return interaction.reply(`🚫 Usuário \`${alvo}\` banido.`);
            }
        }
    }

    // --- COMPONENTES (BOTÕES E MENUS) ---
    if (interaction.isButton()) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;

        if (interaction.customId === 'btn_lock') {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
            return interaction.reply({ content: "🔒 Canal trancado!", ephemeral: true });
        }
        if (interaction.customId === 'btn_unlock') {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });
            return interaction.reply({ content: "🔓 Canal aberto!", ephemeral: true });
        }
        if (interaction.customId === 'btn_clear') {
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            await interaction.channel.bulkDelete(messages, true);
            return interaction.reply({ content: "🗑️ Chat limpo!", ephemeral: true });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_ticket') {
        const cat = interaction.values[0];
        const tChannel = await interaction.guild.channels.create({
            name: `ticket-${cat}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: MEU_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const welcome = new EmbedBuilder()
            .setTitle(`Ticket: ${cat.toUpperCase()}`)
            .setDescription(`Olá ${interaction.user}! Descreva seu pedido e aguarde o <@${MEU_ID}>.`)
            .setColor('#00FF00');

        await tChannel.send({ content: `${interaction.user} | <@${MEU_ID}>`, embeds: [welcome] });
        return interaction.reply({ content: `✅ Ticket criado: ${tChannel}`, ephemeral: true });
    }
});

// -----------------------------------------------------------------
// AUTENTICAÇÃO FINAL
// -----------------------------------------------------------------
client.login(process.env.TOKEN);

// FINAL DO CÓDIGO - KAUAN HELPER FULL 300 LINES
// =================================================================
            
