class TeleClass {
    constructor (config) {
        this.token = (typeof config === 'string') ? config : config.token;

        this.api = `https://api.telegram.org/bot${this.token}`;
        this.fileLink = `https://api.telegram.org/file/bot${this.token}/`;

        this.loopFn = null;
        this.updateId = 0;

        this.limit        = (config.limit        >= 0) ? config.limit               : 100;
        this.interval     = (config.interval     >= 0) ? config.interval            : 300;
        this.timeout      = (config.timeout      >= 0) ? config.timeout             : 0;
        this.retryTimeout = (config.retryTimeout >= 0) ? config.retryTimeout * 1000 : 5000;

        this.allowedUpdates = ["message"];

        this.flags = { poll: false, retry: false, looping: false };


        this.updateTypes = {};

        this.processUpdate = (update) => {
            if (update) {
                for (let name in this.updateTypes) {
                    if (name in update.message) {
                        return this.updateTypes[name].call(this, update.message[name], update.message.chat, update.message);
                    }
                }
            }
        };
    }

    async request(url, options) {
        const responce = await fetch(this.api + url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(options)
        });
        return responce.json();
    }

    start() {
        const flags = this.flags;

        flags.poll = true;
        flags.looping = true;

        console.log("[INFO] Bot started");

        this.loopFn = setInterval(() => {

            if (!flags.looping) clearInterval(this.loopFn);
            if (!flags.poll) return;

            flags.poll = false;

            this.getUpdates()
            .then(() => {
                if (flags.retry) {
                    const now = Date.now();
                    const diff = (now - flags.retry) / 1000;

                    console.log("[INFO] Reconnected after %d seconds", diff);

                    flags.retry = false;
                }
            })
            .then(() => { flags.poll = true; })
            .catch(error => {
                if (flags.retry === false) flags.retry = Date.now();

                console.log('[ERROR] Bot error', error);
                return Promise.reject();
            })
            .catch(() => {
                console.log('[INFO] Reconnecting in 5 seconds...');

                setTimeout(() => (flags.poll = true), 5000);
            })
        }, 1000);
    }

    async getUpdates(offset = this.updateId, limit = this.limit, timeout = this.timeout, allowedUpdates = this.allowedUpdates) {
        const updates = await this.request('/getUpdates', { offset, limit, timeout, allowedUpdates });
        return this.recieveUpdates(updates.result);
    }
    
    async recieveUpdates(updates) {
        if (!updates || !updates?.length) return Promise.resolve();

        for (let i = 0; i < updates.length; i++) {
            const update = updates[i];
            const nextId = ++update.update_id;
            if (this.updateId < nextId) this.updateId = nextId;

            this.processUpdate(update);
        }
    }
  
    on(type, func) {
        if (!(type in this.updateTypes)) {
            this.updateTypes[type] = func;
        }
        else {
            console.log('Function for type: <%s> already exist! You can use only one function per type', type)
        }
    }

    async getFileLink(file_id) {
        const file = await this.request('/getFile', { file_id });
        return this.fileLink + file.result.file_path;
    }

    async send(type, options) {
        const types = [
            'message', 'photo', 'audio', 'document', 'video', 'animation', 'voice',
            'videoNote', 'mediaGroup', 'location', 'venue', 'contact', 'poll', 'dice', 'chatAction'
        ];
        if (types.indexOf(type) === -1) return console.log("[ERROR] Wrong type of content");

        if (typeof options === 'object' || !type) {
            const url = '/send' + type[0].toUpperCase() + type.slice(1);
            const response = await this.request(url, options);
            if (!response.ok) { return console.log("[ERROR] Bot can't send message. Reason:", response) }
            return response;
        } else {
            return console.log("[ERROR] Bot can't send message. Reason: wrong <options> type");
        }
    }

    async setReaction(options) {
        if (options) {
            const response = await this.request('/setMessageReaction', options);
            if (!response.ok) { return console.log("[ERROR] Bot can't set reaction. Reason:", response) }
            return response;
        } else {
            return console.log("[ERROR] Bot can't set reaction. Reason: wrong <options> type");
        }
    }
}

module.exports = TeleClass;
