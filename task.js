Body = require("body");

class Task {
    // Old
    local_limit = 3;
    body_base = [WORK,CARRY,CARRY,MOVE];
    body_add = [WORK,CARRY,MOVE];
    permissive = true;
    task_lock;
    step = 0;
    emoji;

    // Initialize
    id;
    workers;
    wanted;

    // Defaults
    name = "Task";
    body = Body;

    constructor(workers=1) {
        this.workers = workers;
    }

    // Generate list of tasks for a given room
    static getTasks(tasks, room_limit) {}

    // Make provided creep perform this task
    static dotask(creep) {}

    static alert(task) {}
}

module.exports = Task;