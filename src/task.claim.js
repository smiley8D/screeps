const Task = require("task");
const config = require("config");
const Claimer = require("body.claimer");

class Claim extends Task {

    constructor(room, wanted) {
        super("Claim", room, room, wanted);
        this.body = new Claimer();
    }

    static getTasks() {
        let tasks = []

        // Iterate through claim flags
        for (let flag in Game.flags) {
            flag = Game.flags[flag];
            if (flag.color != COLOR_PURPLE) {continue}
            if (!flag.room || !flag.room.controller.my) {
                tasks.push(new Claim(flag.pos.roomName, 1));
            } else {
                flag.remove();
            }
        }

        return tasks;
    }

    static doTask(creep) {
        // Move to room
        if (creep.room.name != creep.memory.task.room) {
            creep.memory.room = creep.memory.task.room;
            creep.say("🚩" + creep.memory.task.room);
            return;
        }

        // Claim controller
        let controller = Game.rooms[creep.memory.task.room].controller;
        let result = creep.claimController(controller);
        if (result === ERR_GCL_NOT_ENOUGH) { result = creep.reserveController(controller) }
        if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(controller, {visualizePathStyle: {stroke: "#991eff"}}) }

        if (result != OK) {
            creep.say("🚩" + result);
        } else {
            creep.say("🚩");
        };
    }

}

module.exports = Claim;