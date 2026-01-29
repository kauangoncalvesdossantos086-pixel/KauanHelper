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
//      DEFINIÇÃO COMPLETA DOS SLASH (/)
// ==========================================
const slashCommands = [
    { name: 'ajuda', description: '📚 Central de comandos' },
    { name: 'ticket', description: '🎫 Central de Atendimento' },
    { name: 'lock', description: '🔒 Painel de Controle' },
    { name: 'pix', description: '💸 Pagamento PIX' },
    { name: 'faq', description: '❓ Perguntas Frequentes' },
    { name: 'estoque', description: '📦 Ver ou atualizar estoque', options: [{name: 'valor', type: 3, description: 'Novo estoque (Dono)'}] },
    { name: 'calc', description: '📊 Calculadora de taxas', options: [{name: 'valor', type: 4, description: 'Valor para calcular', required: true}] },
    { name: 'id', description: '🆔 Ver ID de usuário', options: [{name: 'user', type: 6, description: 'Selecione o usuário'}] },
    { name: 'snipe', description: '🎯 Ver última mensagem apagada' },
    { name: 'vouch', description: '⭐ Postar avaliação', options: [{name: 'texto', type: 3, description: 'Sua avaliação', required: true}] },
    { name: 'traduzir', description: '🇧🇷 Traduzir texto', options: [{name: 'texto', type: 3, description: 'Texto para traduzir', required: true}] },
    { name: 'close', description: '🔒 Encerrar ticket atual' },
    { name: 'blacklist', description: '🚫 Gerenciar banidos do bot', options: [{name: 'id', type: 3, description: 'ID do usuário', required: true}] }
];

// ==========================================
//            EVENTO DE INICIALIZAÇÃO
// ==========================================
client.once('ready', async () => {
    console.log('==========================================');
    console.log(`✅ LOGADO COMO: ${client.user.tag}`);
    console.log('==========================================');

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('🚀 Atualizando comandos de barra (/). Wait...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
        console.log('✅ Comandos / sincronizados com sucesso!');
    } catch (e) { console.error("Erro ao registrar comandos: ", e); }

    client.user.setPresence({
        activities: [{ name: 'Tigre Bux 🐯 | Use /ajuda', type: ActivityType.Watching }],
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
//          SISTEMA DE SEGURANÇA
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (blacklist.includes(message.author.id)) return;

    // ANTI-LINK
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

    // LOG DE MENÇÃO
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
//        LÓGICA DE INTERAÇÕES (SUBSTITUI !)
// ==========================================
client.on('interactionCreate', async (i) => {
    if (blacklist.includes(i.user.id)) return i.reply({ content: "🚫 Você está na blacklist!", ephemeral: true });

    if (i.isChatInputCommand()) {
        const { commandName, options, user, guild, channel, member } = i;

        if (commandName === 'lock') {
            if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return i.reply({ content: "🚫 Sem permissão!", ephemeral: true });
            const embedLock = new EmbedBuilder().setTitle('🔒 Painel de Controle').setDescription('Gerencie a trava e a limpeza deste canal nos botões abaixo.').setColor('#2b2d31').setFooter({ text: 'Segurança Tigre Bux' });
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_lock').setLabel('Bloquear').setEmoji('🔒').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('btn_unlock').setLabel('Desbloquear').setEmoji('🔓').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_clear').setLabel('Limpar Mensagens').setEmoji('🗑️').setStyle(ButtonStyle.Secondary)
            );
            return i.reply({ embeds: [embedLock], components: [row] });
        }

        if (commandName === 'ticket') {
            const embedTicket = new EmbedBuilder().setTitle('🎫 Central de Atendimento').setDescription('Selecione uma categoria abaixo para abrir um ticket.').setColor('#2b2d31');
            const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_ticket').setPlaceholder('Escolha o motivo...').addOptions([
                { label: 'Compras', description: 'Comprar Robux ou itens.', value: 'compras', emoji: '💸' },
                { label: 'Blox Fruits', description: 'Itens de Blox Fruits.', value: 'bloxfruits', emoji: '🍎' },
                { label: 'Suporte', description: 'Dúvidas gerais.', value: 'suporte', emoji: '🆘' },
                { label: 'Denúncias', description: 'Denunciar usuários.', value: 'denuncias', emoji: '🔨' }
            ]));
            return i.reply({ embeds: [embedTicket], components: [menu] });
        }

        if (commandName === 'pix') {
            const embed = new EmbedBuilder().setTitle('💸 Pagamento PIX').setDescription('Chave: `SUA_CHAVE_AQUI` \n\nEnvie o comprovante no ticket!').setColor('#00FFFF');
            return i.reply({ embeds: [embed] });
        }

        if (commandName === 'faq') {
            const embed = new EmbedBuilder().setTitle('❓ FAQ - Perguntas Frequentes').setColor('#FFA500').addFields(
                { name: 'É confiável?', value: 'Sim! Veja nossas avaliações em <#1460383106639855748>.' },
                { name: 'Qual o prazo?', value: 'Entrega imediata após confirmação.' },
                { name: 'Formas de pagamento?', value: 'PIX, Cartão e Saldo.' }
            );
            return i.reply({ embeds: [embed] });
        }

        if (commandName === 'traduzir') {
            const txt = options.getString('texto');
            try {
                const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURI(txt)}`);
                return i.reply(`🇧🇷 **Tradução:** ${res.data[0][0][0]}`);
            } catch (e) { return i.reply("❌ Erro ao traduzir."); }
        }

        if (commandName === 'estoque') {
            const novo = options.getString('valor');
            if (user.id === MEU_ID && novo) {
                estoqueRobux = novo;
                return i.reply("✅ Estoque atualizado!");
            }
            return i.reply(`📦 Estoque atual: **${estoqueRobux}**`);
        }

        if (commandName === 'calc') {
            const v = options.getInteger('valor');
            return i.reply(`📊 Recebe: **${Math.floor(v * 0.7)}** | Cobrar: **${Math.ceil(v / 0.7)}**`);
        }

        if (commandName === 'id') {
            const target = options.getUser('user') || user;
            return i.reply(`🆔 ID: \`${target.id}\``);
        }

        if (commandName === 'vouch') {
            const relato = options.getString('texto');
            const canalV = client.channels.cache.get(CANAL_AVALIACOES_ID);
            if (canalV) {
                canalV.send({ embeds: [new EmbedBuilder().setTitle('⭐ Nova Avaliação!').setDescription(relato).setColor('#FFFF00').setFooter({ text: `Por: ${user.tag}` })] });
                return i.reply({ content: "✅ Vouch enviado!", ephemeral: true });
            }
        }

        if (commandName === 'snipe') {
            const msg = lastDeletedMessage[channel.id];
            if (!msg) return i.reply({ content: "❌ Nenhuma mensagem apagada recentemente.", ephemeral: true });
            const e = new EmbedBuilder().setAuthor({ name: msg.tag }).setDescription(msg.content || "Anexo/Imagem").setColor('#800080');
            if (msg.image) e.setImage(msg.image);
            return i.reply({ embeds: [e] });
        }

        if (commandName === 'close') {
            if (!channel.name.startsWith('ticket-')) return i.reply({ content: "❌ Use apenas em tickets.", ephemeral: true });
            if (user.id === MEU_ID || member.permissions.has(PermissionFlagsBits.Administrator)) {
                await i.reply("🔒 **Encerrando ticket em 5 segundos...**");
                setTimeout(() => channel.delete().catch(() => {}), 5000);
            }
        }

        if (commandName === 'blacklist') {
            if (user.id !== MEU_ID) return i.reply({ content: "🚫 Apenas o dono!", ephemeral: true });
            const alvo = options.getString('id');
            if (blacklist.includes(alvo)) {
                blacklist = blacklist.filter(id => id !== alvo);
                return i.reply(`✅ Usuário ${alvo} saiu da blacklist.`);
            } else {
                blacklist.push(alvo);
                return i.reply(`🚫 Usuário ${alvo} entrou na blacklist.`);
            }
        }

        if (commandName === 'ajuda') {
            const e = new EmbedBuilder().setTitle('📚 Central de Comandos - KauanHelper').setDescription('Agora todos os comandos são via `/`:').setColor('#2b2d31')
                .addFields(
                    { name: '🎫 Atendimento', value: '`/ticket`, `/close`' },
                    { name: '💰 Loja', value: '`/estoque`, `/pix`, `/calc`, `/vouch`, `/faq`' },
                    { name: '🛠️ Moderação', value: '`/lock`, `/blacklist`, `/snipe`' },
                    { name: '🌐 Geral', value: '`/id`, `/traduzir`' }
                ).setFooter({ text: 'Tigre Bux - Use / para ver a lista' });
            return i.reply({ embeds: [e] });
        }
    }

    // BOTÕES E SELECT MENU (MANTIDOS IGUAIS)
    if (i.isButton()) {
        if (!i.member.permissions.has(PermissionFlagsBits.ManageChannels)) return i.reply({ content: "🚫 Sem permissão!", ephemeral: true });
        if (i.customId === 'btn_lock') {
            await i.channel.permissionOverwrites.edit(i.guild.id, { SendMessages: false });
            return i.reply({ content: "🔒 Canal bloqueado!", ephemeral: true });
        }
        if (i.customId === 'btn_unlock') {
            await i.channel.permissionOverwrites.edit(i.guild.id, { SendMessages: true });
            return i.reply({ embeds: [new EmbedBuilder().setDescription('🔓 **Canal desbloqueado!**').setColor('#00FF00')] });
        }
        if (i.customId === 'btn_clear') {
            const msgs = await i.channel.messages.fetch({ limit: 100 });
            await i.channel.bulkDelete(msgs.filter(m => m.id !== i.message.id), true).catch(() => {});
            return i.reply({ content: "🗑️ Chat limpo!", ephemeral: true });
        }
    }

    if (i.isStringSelectMenu() && i.customId === 'select_ticket') {
        const cat = i.values[0];
        const canal = await i.guild.channels.create({
            name: `ticket-${cat}-${i.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: MEU_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ],
        });
        await canal.send({ content: `${i.user} | <@${MEU_ID}>`, embeds: [new EmbedBuilder().setTitle(`Ticket: ${cat.toUpperCase()}`).setDescription("Olá! Explique sua dúvida.").setColor('#00FF00')] });
        await i.reply({ content: `✅ Ticket criado: ${canal}`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);
                             
