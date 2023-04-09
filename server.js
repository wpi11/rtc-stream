const express = require('express');
const app = express();
const server = require('http').Server(app);
const { Server } = require('socket.io');
const cors = require('cors');
const PORT = 3001;
app.use(cors());

const io = new Server(server, {
	cors: {
		origin: 'http://localhost:3000'
	}
});

let producer = null;
let producers = {};
let clients = {};

io.on('connection', (socket) => {
	function log() {
		const arr = ['Server ->'];
		arr.push.apply(arr, arguments);
		socket.emit('log', arr);
	}

	socket.on('join', (payload) => {
		socket.join(payload.room);
		clients[socket.id] = payload.name;
		const roomId = payload.room;
		const numberOfClients = Object.keys(clients).length;

		log(payload?.name, 'joining', payload.room, 'with', numberOfClients);
		console.log(payload?.name, 'joining', payload.room, 'with', numberOfClients);

		// These events are emitted only to the sender socket.
		// if (numberOfClients === 1) {
		// if (payload.name === 'Stylz') {
		// 	console.log(`Creating room ${roomId} and emitting room_created socket event`);
		// 	socket.join(roomId);
		// 	socket.emit('room_created', roomId);
		// } else {
		// 	console.log(`Joining room ${roomId} and emitting room_joined socket event`);
		// 	socket.join(roomId);
		// 	socket.emit('room_joined', roomId);
		// }

		// original
		socket.join(payload.name);
		socket.emit('join', { ...payload, numberOfClients });
		socket.broadcast.to(payload.room).emit('joined', { ...payload, numberOfClients });
	});

	socket.on('producer', (payload) => {
		console.log('registered producer:', payload.name);
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
		// socket.to(payload.id).emit('offer', { ...payload, id: socket.id });
	});

	socket.on('answer', (payload) => {
		console.log('answer to:', payload.name);
		// socket.broadcast.to(payload.room).emit('answer', { ...payload, id: socket.id });
		socket.to(payload.id).emit('answer', { ...payload, id: socket.id });
	});

	socket.on('candidate', (payload) => {
		console.log('candidate to:', payload.name);
		socket.broadcast.to(payload.room).emit('candidate', { ...payload, id: socket.id });
		// socket.to(payload.name).emit('candidate', { ...payload, id: socket.id });
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
			producers[socket.id] = name;
			socket.join(room);
			socket.emit('created', { ...event, id: socket.id });
		} else {
			log(`Member ${name} joined room:`, { room, numClients });
			clients[socket.id] = name;

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
			console.log('To Signal Message:', { socket: socket.id, event: event.type });
			io.to(toId).emit('message', { ...event, id: socket.id });
		} else if (room) {
			log('Room Signal Message:', { socket: socket.id, event: event.type });
			console.log('Room Signal Message:', { socket: socket.id, event: event.type, room });
			socket.broadcast.to(room).emit('message', { ...event, id: socket.id });
		} else {
			log('Broadcast Signal:', { socket: socket.id, event: event.type });
			console.log('Broadcast Signal Message:', { socket: socket.id, event: event.type });
			socket.broadcast.emit('message', { ...event, id: socket.id });
		}
	});

	socket.on('disconnect', () => {
		delete producers[socket.id];
		delete clients[socket.id];
		socket.leave();
	});
});

server.listen(PORT, () => {
	console.log(`rtc peer server listening on: ${PORT}`);
});
