const TeleClass = require('./class.js');
const bot = new TeleClass({ token: "your_bot_token" });

bot.start();

bot.on('text', async (text, chat, raw) => {
    bot.send('message', { chat_id: chat.id, text: 'message' });
    // bot.send('photo', { chat_id: chat.id, photo: 'url to image', caption: 'caption' });

    bot.setReaction({ chat_id: chat.id, message_id: raw.message_id, reaction: [{ type: 'emoji', emoji: '❤' }] });
});

bot.on('photo', async (photos, chat, raw) => {
    const fileId = photos[photos.length - 1].file_id;

    bot.getFileLink(fileId).then(link => {
        bot.send('message', { chat_id: chat.id, text: `Got your image! Link: <${link}>` });
    })
});
