Body = require("body");

class Task {

    constructor(workers=1) {
        // Old
        this.local_limit = 3;
        this.body_base = [WORK,CARRY,CARRY,MOVE];
        this.body_add = [WORK,CARRY,MOVE];
        this.permissive = true;
        this.task_lock;
        this.step = 0;
        this.emoji;

        // Initialize
        this.id;
        this.wanted;

        // Defaults
        this.name = "Task";
        this.body = Body;

        this.workers = workers;
    }

    // Generate list of tasks for a given room
    static getTasks(tasks, room_limit) {}

    // Make provided creep perform this task
    static dotask(creep) {}

    static alert(task) {}
}

module.exports = Task;