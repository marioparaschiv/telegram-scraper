import sourcemaps from 'source-map-support';
sourcemaps.install();

require('dotenv').config();

import { Client } from '@lib';
import config from '@config';

Client.initialize();

if (config.errors.catch) {
	process.on('uncaughtException', (error, origin) => {
		console.error([
			'**An error occured inside telegram-scraper**',
			'',
			`Origin: ${origin ?? 'Unknown'}`,
			`Cause: ${error.cause ?? 'Unknown'}`,
			`Type: ${error.name}`,
			`Stack: ${error.stack}\n`,
		].join('\n'));
	});
}