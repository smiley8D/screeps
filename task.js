Body = require("body");

class Task {

    constructor(name, tgt=null, wanted=0) {
        // Task type (class name)
        this.name = name;

        // Unique string ID for task
        this.id = name + ":" + tgt

        // Target of task
        this.tgt = tgt;

        // Body of assignable workers
        this.body = new Body();

        // Total size of workers assigned
        this.workers = 0;

        // Total workers wanted
        this.wanted = wanted;
    }

    // Generate list of tasks for a given room
    static getTasks(tasks, room_limit) {}

    // Compress tasks for memory storage
    compress() {
        return {
            name: this.name,
            id: this.id,
            tgt: this.tgt,
        }
    }

    // Make provided creep perform this task
    static dotask(creep) {}
}

module.exports = Task;