import { ClientOptions, SessionName } from '~/constants';
import { TelegramClient } from 'telegram';
import config from '#config';
import input from 'input';
import path from 'path';
import fs from 'fs';

class Client extends TelegramClient {
	constructor() {
		super(SessionName, config.api.id, config.api.hash, ClientOptions);
	}

	async initialize() {
		await this.start({
			phoneNumber: config.phone,
			password: async () => input.text('Please enter your password: '),
			phoneCode: async () => input.text('Please enter the code you received: '),
			onError: (e) => console.error('Failed to log in:', e.message),
		});

		this.logger.info('Successfully logged in.');

		const dialogs = await this.getDialogs();
		const groups = dialogs.filter(d => d.isChannel || d.isGroup);
		this.logger.info(`Getting information for channel ${config.channel}...`);

		const group = groups.find(g => g.id.toString() === config.channel);
		if (!group) return this.logger.error('Group not found.');


		try {
			const participants = await this.getParticipants(group.entity);
			const results: {
				[key: string]: {
					messages: {
						sentAt: string,
						text: string;
					}[],
					identifier: string;
				};
			} = {};

			for (const participant of participants) {
				results[participant.id.toString()] = {
					messages: [],
					identifier: [
						`${participant.username}`,
						(participant.firstName || participant.lastName) && `(${participant.firstName ?? ''}${participant.lastName ? ' ' + participant.lastName : ''})`,
						`(${participant.id})`
					].filter(Boolean).join(' ')
				};
			}


			const senders = Object.keys(results);

			for await (const message of this.iterMessages(group.entity)) {
				try {
					const sender = await message.getSender();
					if (!sender) continue;

					const matches = senders.find(s => s === sender.id.toString());
					if (!matches) continue;

					results[matches] ??= { messages: [], identifier: '' };
					results[matches].messages.push({ text: message.text, sentAt: new Date(message.date * 1000).toLocaleString() });
				} catch { }
			}

			const root = path.join(__dirname, '..', '..');
			const folder = path.join(root, 'results');
			const file = path.join(folder, 'users.txt');
			const messages = path.join(folder, 'messages');

			if (!fs.existsSync(folder)) fs.mkdirSync(folder);
			if (!fs.existsSync(messages)) fs.mkdirSync(messages);

			fs.writeFileSync(file, Object.values(results).map(i => i.identifier).join('\n'), 'utf-8');

			for (const id of Object.keys(results)) {
				const msgs = results[id] as typeof results[typeof id];
				const txt = path.join(messages, `${id}.txt`);

				fs.writeFileSync(txt, msgs.messages.map(m => `${m.text} - ${m.sentAt}`).join('\n\n'));
			}

			this.logger.info('Save participants for: ' + config.channel);
		} catch (error) {
			this.logger.error('Failed to retrieve participants for' + config.channel);
			console.error(error);
		}

		await this.disconnect();
		process.exit(0);
	}
}

export default new Client();