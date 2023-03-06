"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var EventsManager = /** @class */ (function () {
    function EventsManager(socket) {
        this.eventsDataById = new Map();
        this.socket = socket;
    }
    EventsManager.prototype.on = function (eventId, callback, context, isOnce) {
        // console.log('em.on method called!', this.socket);
        var eventsData = this.eventsDataById.get(eventId);
        if (!eventsData) {
            eventsData = [];
            this.eventsDataById.set(eventId, eventsData);
        }
        var eventData = {
            boundCallback: this.callback.bind(this, eventId),
            userCallback: callback,
            id: eventId,
            context: context,
            isOnce: isOnce
        };
        eventsData.push(eventData);
        this.socket.on(eventId, eventData.boundCallback);
    };
    EventsManager.prototype.off = function (eventId, callback, context, isOnce) {
        // get the specified events data array based on the event id. if not found,
        // exit early
        var eventsData = this.eventsDataById.get(eventId);
        if (!eventsData) {
            return;
        }
        for (var index = eventsData.length - 1; index >= 0; index -= 1) {
            var eventData = eventsData[index];
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
            this.eventsDataById["delete"](eventId);
        }
    };
    EventsManager.prototype.callback = function (eventId) {
        var _a;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var eventsData = this.eventsDataById.get(eventId);
        var length = eventsData.length;
        var index = 0;
        while (index < length) {
            var eventData = eventsData[index];
            if (eventData.isOnce) {
                // if this is a one-time event handler, remove it
                this._eventTarget.off(eventId, eventData.boundCallback);
                eventsData.splice(index, 1);
                length -= 1;
            }
            else {
                index += 1;
            }
            (_a = eventData.userCallback).call.apply(_a, __spreadArray(__spreadArray([eventData.context], args, false), [this], false));
        }
        if (length === 0) {
            // it's possible that removing the one-time handler caused the eventsData array
            // to become empty. if so, we can remove it from the map. it's not strictly
            // necessary, but it helps to keep things clean ^_^
            this.eventsDataById["delete"](eventId);
        }
    };
    return EventsManager;
}());
exports["default"] = EventsManager;
