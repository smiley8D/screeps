Body = require("body");

class Task {

    constructor(name, tgt, wanted, max_workers=4, room=null) {
        // Body of assignable workers
        this.body = new Body();

        // Number of workers assigned
        this.workers = 0;

        // Maximum number of allowed workers
        this.max_workers = max_workers;

        // Total size of parts assigned
        this.parts = 0;

        // Total parts wanted
        this.wanted = wanted;

        // Unique string ID
        this.id = name + ":" + tgt

        // Task type (class name)
        this.name = name;

        // Target of task
        this.tgt = tgt;

        // Attached room
        this.room = room;
    }

    // Generate list of tasks for a given room
    static getTasks(tasks) {}

    // Compress tasks for memory storage
    compress() {
        return {
            id: this.id,
            name: this.name,
            tgt: this.tgt,
            room: this.room,
        }
    }

    // Make provided creep perform this task
    static dotask(creep) {}
}

module.exports = Task;