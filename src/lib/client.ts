import { ClientOptions, SessionName } from '@constants';
import { Api, TelegramClient } from 'telegram';
import config from '@config';
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

		this._log.info('Successfully logged in.');

		const dialogs = await this.getDialogs();
		const groups = dialogs.filter(d => d.isChannel || d.isGroup);
		console.log(`» Getting information for channel ${config.channel}...`);

		const group = groups.find(g => g.id.toString() === config.channel);
		if (!group) return console.log('Group not found.');

		try {
			const participants = await this.getParticipants(group.entity);

			const result = [];

			for (const participant of participants) {
				const { fullUser } = await this.invoke(new Api.users.GetFullUser({ id: participant.id }));
				const { about } = fullUser;

				const twitter = about?.match(/http(|s):\/\/(twitter|x)\.com\/(#!\/)?\w+/gmi);
				const twitters = twitter?.join(', ');

				result.push(`${participant.username} ( ${participant.firstName ?? ''} ${participant.lastName ?? ''}) ${twitters ? `- (${twitters})` : about ? `- (${about})` : ''}`);
			}

			const file = path.join(__dirname, '..', '..', 'users.txt');
			fs.writeFileSync(file, result.join('\n'), 'utf-8');

			this.logger.info('Save participants for: ' + config.channel);
		} catch (e) {
			console.log(e);
			this.logger.error('Failed to retrieve participants for: ' + config.channel);
		}

		await this.disconnect();
		process.exit(-1);
	}
}

export default new Client();