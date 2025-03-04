const Task = require("task");
const config = require("config");
const utils = require("utils");
const Claimer = require("body.claimer");

class Claim extends Task {

    static emoji() {
        return '🚩';
    }

    constructor(room, action, wanted, spots) {
        super("Claim", room + ':' + action, room, wanted);
        this.body = new Claimer();
        this.detail = action;
        this.max_workers = spots;
    }

    static getTasks() {
        let tasks = []

        // Iterate through claim flags
        for (let flag in Game.flags) {
            flag = Game.flags[flag];

            // Check flag
            if (flag.color != COLOR_YELLOW) { continue }

            // Check controller exists and is not owned by me (unless flag allows otherwise for either)
            if (flag.room && flag.room.controller && flag.room.controller.my && (flag.secondaryColor === COLOR_PURPLE || flag.secondaryColor === COLOR_BLUE)) {
                flag.remove();
                continue;
            }

            let spots = 1;

            // Handle actions
            switch (flag.secondaryColor) {
                case COLOR_PURPLE:
                    // Claim
                    if (flag.room && flag.room.controller.owner) { continue }
                    tasks.push(new Claim(flag.pos.roomName, 'C', 1, spots));
                    break;
                case COLOR_BLUE:
                    // Reserve
                    if (flag.room) {
                        // Check not already owned or reserved
                        if (flag.room.controller.owner || (flag.room.controller.reservation && flag.room.controller.reservation.username != utils.username())) { continue }

                        // Get remaining reservation ticks to add
                        let remaining = 5000;
                        if (flag.room.controller.reservation) { remaining -= flag.room.controller.reservation.ticksToEnd }

                        tasks.push(new Claim(flag.pos.roomName, 'R', Math.max(1, Math.log(remaining)/2), spots));
                    } else {
                        tasks.push(new Claim(flag.pos.roomName, 'R', 2, spots));
                    }
                    break;
                case COLOR_RED:
                    // Attack
                    // Check owned or reserved
                    if (flag.room && (!flag.room.controller.reservation && !flag.room.controller.owner)) { continue }
                    // HARDCODE 1 FOR NOW
                    tasks.push(new Claim(flag.pos.roomName, 'A', 1, spots));
                    break;
            }
        }

        return tasks;
    }

    static doTask(creep) {
        // Move to room
        if (creep.room.name != creep.memory.task.room) {
            creep.memory.room = creep.memory.task.room;
            return ERR_NOT_IN_RANGE;
        }

        let controller = Game.rooms[creep.memory.task.room].controller;
        let result = ERR_NOT_FOUND;

        // Handle actions
        switch (creep.memory.task.detail) {
            case 'C':
                // Claim
                result = creep.claimController(controller);
                break;
            case 'R':
                // Reserve
                result = creep.reserveController(controller);
                break;
            case 'A':
                // Attack
                result = creep.attackController(controller);
                break;
        }

        // Move if needed
        if (result === ERR_NOT_IN_RANGE) { result = creep.moveTo(controller, { maxRooms: 1, visualizePathStyle: {stroke: "#991eff"}}) }

        return result;
    }

}

module.exports = Claim;