Task = require("task");
utils = require("utils");

class BuildTask extends Task {

    constructor(site_id) {
        super();

        this.name = "build";
        this.emoji = "🔨";

        this.id = "build:" + site_id;
        this.site_id = site_id;
    }

    static getTasks(tasks, room_limit) {
        let total_build = 0;
        for (let site_id in Game.constructionSites) {
            let site = Game.constructionSites[site_id];
            let task = new BuildTask(site_id);
            tasks.set(task.id, task);
            total_build += site.progressTotal - site.progress + 1;
            task.local_limit = Math.ceil(Math.log(site.progressTotal - site.progress + 1) / Math.log(1000));
        }
        room_limit["build"] = Math.ceil(Math.log(total_build) / Math.log(1000));
    }

    static doTask(creep) {
        creep.say("🔨")
        let site = Game.constructionSites[creep.memory.task.site_id];

        // Collect
        utils.fill(creep);

        // Build
        if (!creep.memory.curFill) {
            let result = creep.build(site)
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(site, {visualizePathStyle: {}})
            } else if (result != OK) {
                creep.memory.task = null;
            }
        }
    }

    static alert(task) {
        let site = Game.constructionSites[task.site_id];
        if (!site) {return}
        site.room.visual.text(task.local_limit + "🔨",site.pos);
    }
}

module.exports = BuildTask;