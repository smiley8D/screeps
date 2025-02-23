const Task = require("task");
const config = require("config");
const utils = require("utils");
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

            // Check controller exists and is not owned by me (unless flag allows otherwise for either)
            if (flag.room && ((flag.secondaryColor != COLOR_BROWN && !flag.room.controller) || 
            (flag.secondaryColor != COLOR_RED && flag.room.controller && flag.room.controller.my))) {
                flag.remove();
                continue;
            }

            // Handle actions
            switch (flag.secondaryColor) {
                case COLOR_YELLOW:
                    // Claim
                    if (flag.room && flag.room.controller.owner) { continue }
                    tasks.push(new Claim(flag.pos.roomName, 'claim', 1));
                    break;
                case COLOR_BLUE:
                    // Reserve
                    if (flag.room) {
                        // Check not already owned or reserved
                        if (flag.room.controller.owner || (flag.room.controller.reservation && flag.room.controller.reservation.username != utils.username())) { continue }

                        // Get remaining reservation ticks to add
                        let remaining = 5000;
                        if (flag.room.controller.reservation) { remaining -= flag.room.controller.reservation.ticksToEnd }

                        tasks.push(new Claim(flag.pos.roomName, 'reserve', Math.max(1, Math.log(remaining)/2)));
                    } else {
                        tasks.push(new Claim(flag.pos.roomName, 'reserve', 2));
                    }
                    break;
                case COLOR_RED:
                    // Attack
                    // Check owned or reserved
                    if (flag.room && (!flag.room.controller.reservation && !flag.room.controller.owner)) { continue }
                    // HARDCODE 1 FOR NOW
                    tasks.push(new Claim(flag.pos.roomName, 'attack', 1));
                    break;
                case COLOR_BROWN:
                    // Exploit
                    // NOTHING FOR NOW, CHECK NOTES
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