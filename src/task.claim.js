const Task = require("task");
const config = require("config");
const Claimer = require("body.claimer");

class Claim extends Task {

    static emoji = '🚩';

    constructor(room, action, wanted) {
        super("Claim", room, room, wanted);
        this.body = new Claimer();
        this.action = action;
        this.detail = action;
    }

    static getTasks() {
        let tasks = []

        // Iterate through claim flags
        for (let flag in Game.flags) {
            flag = Game.flags[flag];

            // Check flag
            if (flag.color != COLOR_YELLOW) { continue }
            else if (flag.room && ((flag.color != COLOR_BROWN && !flag.room.controller) ||
            (flag.room.controller && flag.room.controller.my))) {
                flag.remove();
                continue;
            }

            // Handle actions
            switch (flag.secondaryColor) {
                case COLOR_YELLOW:
                    // Claim
                    if (flag.room && flag.room.controller.owner) {
                        flag.remove();
                        continue;
                    }
                    tasks.push(new Claim(flag.pos.roomName, 'claim', 1));
                    break;
                case COLOR_BLUE:
                    // Reserve
                    if (flag.room && flag.room.controller.owner) {
                        flag.remove();
                        continue;
                    }
                    tasks.push(new Claim(flag.pos.roomName, 'reserve', 2));
                    break;
                case COLOR_RED:
                    // Attack
                    if (flag.room && !flag.room.controller.owner) {
                        flag.remove();
                        continue;
                    }
                    tasks.push(new Claim(flag.pos.roomName, 'attack', 1));
                    break;
            }
        }

        return tasks;
    }

    static doTask(creep) {
        // Move to room
        if (creep.room.name != creep.memory.task.room) {
            return creep.memory.task.room;
        }

        let controller = Game.rooms[creep.memory.task.room].controller;
        let result = ERR_NOT_FOUND;

        // Handle actions
        switch (creep.memory.task.detail) {
            case 'claim':
                // Claim
                result = creep.claimController(controller);
                break;
            case 'reserve':
                // Reserve
                result = creep.reserveController(controller);
                break;
            case 'attack':
                // Attack
                result = creep.attackController(controller);
                break;
        }

        // Move if needed
        if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(controller, {visualizePathStyle: {stroke: "#991eff"}}) }

        return result;
    }

}

module.exports = Claim;