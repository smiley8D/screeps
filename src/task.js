const Body = require("body");

class Task {

    // Speech bubble for assigned creeps
    static emoji = '❔';

    constructor(name, tgt, room, wanted) {
        // Body of assignable workers
        this.body = new Body();

        // Unique string ID
        this.id = name + ":" + tgt

        // Task type (class name)
        this.name = name;

        // Target of task
        this.tgt = tgt;

        // Room of task
        this.room = room;

        // Rooms from which to search for available spawners and creeps
        this.search_rooms = [room];

        // Number of workers assigned
        this.workers = 0;

        // Maximum number of allowed workers
        this.max_workers = 8;

        // Total size of parts assigned
        this.parts = 0;

        // Total parts wanted
        this.wanted = wanted;

        this.max_search = 1;

        // Optional additional details for result bubble
        this.detail = '';

        // Task can use spawn reserves
        this.emergency = false;
    }

    // Generate list of tasks
    static getTasks() {}

    // Compress tasks for memory storage
    compress() {
        return {
            id: this.id,
            name: this.name,
            tgt: this.tgt,
            room: this.room,
            detail: this.detail
        }
    }

    // Make provided creep perform this task
    static dotask(creep) {}
}

module.exports = Task;