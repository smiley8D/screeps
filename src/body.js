const config = require("config");

class Body {

    constructor(base = [WORK,CARRY,MOVE], add = [WORK,CARRY,MOVE]) {
        this.base = base;
        this.add = add;
        this.base_cost = 0
        for (let part of this.base) {
            this.base_cost += BODYPART_COST[part];
        }
        this.add_cost = 0;
        for (let part of this.add) {
            this.add_cost += BODYPART_COST[part];
        }

        this.weight = 0;

        this.name = "Worker";
    }

    cost(size) {
        // Compute costs
        if (size === 0) { return 0 }
        return this.base_cost + this.add_cost * (size - 1);
    }

    spawn(spawner, task, limit=100) {
        let name = this.name + '-' + Game.time;
        let size = Math.min(Math.ceil(limit), 1 + Math.floor((spawner.room.energyAvailable - this.base_cost) / this.add_cost));
        let cost = this.cost(size);
        let body = this.base;
        for (let i = 1; i < size; i++) {
            body = body.concat(this.add);
        }

        let result = spawner.spawnCreep(body, name, {memory: {task: task.compress(), body: this.name, size: size, cost: cost, spawn: spawner.name}});
        if (result === OK) {
            // Update cost metrics
            if (spawner.room.memory.metrics && spawner.room.memory.metrics.count) { spawner.room.memory.metrics.count.spawn += cost }
            // console.log("Spawning " + name + " size " + size + " for " + task.id + " at " + spawner.room.name + ":" + spawner.name);
            return [name, size];
        }
        return [null, null];
    }

}

module.exports = Body;