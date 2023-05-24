import chalk from 'chalk';
import { start } from './server.js';

start()
	.then((port) => console.log(chalk.green('rtc peer server listening on:', port)))
	.catch((err) => console.log(chalk.red('failed to launch stream server.', err.message)));
