/* eslint-disable no-unused-vars */
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import chalk from 'chalk';

const PORT = 7000;
const isDev = process.env.NODE_ENV === 'development';

export const start = () =>
	new Promise((resolve, reject) => {
		try {
			const app = express();
			const server = new http.Server(app);

			const mode = isDev ? 'development' : 'production';

			const io = new Server(server);

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			let producer: string = '';
			let producers = {};
			let clients = {};

			io.on('connection', (socket) => {
				console.log('websocket server connected:', { id: socket.id, mode });

				function log(...args: any) {
					const arr = ['server >'];
					arr.push.apply(arr, arguments);
					socket.emit('log', arr);
				}

				socket.on('producer', (payload) => {
					log('registered producer:', payload.name);
					producer = socket.id;
					socket.broadcast.emit('producer', { ...payload, id: socket.id });
				});

				socket.on('consumer', (payload) => {
					console.log('requesting consumer:', payload);
					socket.broadcast.emit('consumer', { ...payload, id: socket.id });
				});

				socket.on('offer', (payload) => {
					console.log('offer to:', payload.name, payload.id);
					socket.broadcast.to(payload.room).emit('offer', { ...payload, id: socket.id });
				});

				socket.on('answer', (payload) => {
					console.log('answer to:', payload.name);
					socket.to(payload.id).emit('answer', { ...payload, id: socket.id });
				});

				socket.on('candidate', (payload) => {
					console.log('candidate to:', payload.name);
					socket.broadcast.to(payload.room).emit('candidate', { ...payload, id: socket.id });
				});

				// Host
				socket.on('create or join', (event) => {
					const name = event.name;
					const room = event.room;
					log('created / joined room:', { name, room });

					// number of clients in the room
					const clientsInRoom = io.sockets.adapter.rooms.get(room);
					let numClients = clientsInRoom ? clientsInRoom.size : 0;

					if (numClients === 0) {
						log(`Producer ${name} created room:`, { room, numClients });
						producers[socket.id] = { name, room };
						socket.join(room);
						socket.emit('created', { ...event, id: socket.id });
					} else {
						log(`Member ${name} joined room:`, { room, numClients });
						clients[socket.id] = { name, room };

						io.sockets.in(room).emit('join', { ...event, id: socket.id });
						socket.join(room);
						io.to(socket.id).emit('joined', { ...event, id: socket.id });
						io.sockets.in(room).emit('ready', { ...event, id: socket.id });
					}
				});

				socket.on('message', (event) => {
					console.log('Client message:', socket.id, event.type);
					const toId = event?.toId;
					const room = event?.room;

					if (toId) {
						log('To Signal Message:', { socket: socket.id, event: event.type });
						console.log('To Signal Message:', {
							socket: socket.id,
							event: event.type
						});
						io.to(toId).emit('message', { ...event, id: socket.id });
					} else if (room) {
						log('Room Signal Message:', {
							socket: socket.id,
							event: event.type
						});
						console.log('Room Signal Message:', {
							socket: socket.id,
							event: event.type,
							room
						});
						socket.broadcast.to(room).emit('message', { ...event, id: socket.id });
					} else {
						log('Broadcast Signal:', { socket: socket.id, event: event.type });
						console.log('Broadcast Signal Message:', {
							socket: socket.id,
							event: event.type
						});
						socket.broadcast.emit('message', { ...event, id: socket.id });
					}
				});

				socket.on('disconnect', () => {
					const { room } = producers[socket.id];
					delete producers[socket.id];
					delete clients[socket.id];
					socket.leave(room);
				});
			});

			app.use(cors());

			server.listen(PORT, () => {
				console.log(chalk.yellow(`rtc peer server started..`));
				resolve(PORT);
			});
		} catch (error) {
			reject(error);
		}
	});
