import { Socket } from 'socket.io-client';
type Callback = (...args: unknown[]) => void;

interface IEventData {
	boundCallback: Callback;

	userCallback: Callback;

	id: string;

	isOnce: boolean | undefined;

	context: unknown;
}

export default class EventsManager {
	[x: string]: any;
	private eventsDataById: Map<string, IEventData[]>;
	private socket;

	constructor(socket: Socket) {
		this.eventsDataById = new Map();
		this.socket = socket;
	}

	on(eventId: string, callback: Callback, context: unknown, isOnce?: boolean): void {
		// console.log('em.on method called!', this.socket);
		let eventsData = this.eventsDataById.get(eventId);
		if (!eventsData) {
			eventsData = [];
			this.eventsDataById.set(eventId, eventsData);
		}

		const eventData: IEventData = {
			boundCallback: this.callback.bind(this, eventId),
			userCallback: callback,
			id: eventId,
			context,
			isOnce
		};

		eventsData.push(eventData);

		this.socket.on(eventId, eventData.boundCallback);
	}

	off(eventId: string, callback: Callback, context?: unknown, isOnce?: boolean): void {
		// get the specified events data array based on the event id. if not found,
		// exit early
		const eventsData = this.eventsDataById.get(eventId) as any;
		if (!eventsData) {
			return;
		}

		for (let index = eventsData.length - 1; index >= 0; index -= 1) {
			const eventData = eventsData[index];

			// if removing handlers by callback, check that it matches. if not, skip
			if (callback !== undefined && callback !== eventData.userCallback) {
				continue;
			}

			// if removing handlers by context, check that it matches. if not, skip
			if (context !== undefined && context !== eventData.context) {
				continue;
			}

			// if removing handlers by frequency, check that it matches. if not, skip
			if (isOnce !== undefined && isOnce !== eventData.isOnce) {
				continue;
			}

			// turn the event handler off in the socket, referencing our bound callback
			this.socket.off(eventId, eventData.boundCallback);

			// remove this events data object from the array
			eventsData.splice(index, 1);
		}

		if (eventsData.length === 0) {
			this.eventsDataById.delete(eventId);
		}
	}

	private callback(eventId: string, ...args: unknown[]): void {
		const eventsData = this.eventsDataById.get(eventId) as any;

		let length = eventsData.length;
		let index = 0;

		while (index < length) {
			const eventData = eventsData[index];
			if (eventData.isOnce) {
				// if this is a one-time event handler, remove it
				this._eventTarget.off(eventId, eventData.boundCallback);
				eventsData.splice(index, 1);
				length -= 1;
			} else {
				index += 1;
			}

			eventData.userCallback.call(eventData.context, ...args, this);
		}

		if (length === 0) {
			// it's possible that removing the one-time handler caused the eventsData array
			// to become empty. if so, we can remove it from the map. it's not strictly
			// necessary, but it helps to keep things clean ^_^
			this.eventsDataById.delete(eventId);
		}
	}
}
