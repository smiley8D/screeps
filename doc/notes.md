## TODO

- Improve caching/src & dst finding
    - Use a clear and consistent approach to caching/cleaning cache for srcs and dsts
    - Consider a Task.assign method to blast away cache on first assignment, including target room
- Logistics
    - See above on improved caching, hopefully would offer improved performance
    - Multi-room logistics
        - Allow findSrc & findDst to search nearby rooms? Probably just look at storage.
        - Automated room resupply? Would it even be needed if above point is added?
    - Flag-based approach still seems ideal, easily to manually control and add automation later
- Tasking
    - Investigate viability of current tasking system (especially logistics)
        - Performance hit of constant rerouting/assignment
        - Is there meat here that isn't needed? Should this be that dynamic? (it does add flexibility and resilience, but also offset by complexity)
        - Consider fixed paths intead? Possibly build roads along them automatically?
- Automated building
- Memory usage is a problem and not sustainable
    - Look into switching to raw memory, compressing repeated keys
    - VERY HIGH PRIORITY, this is currently eating ~7 CPU / tick
- Calculate replacement time from distance to nearest spawn
    - Store creep's spawn and calculate current linear distance?
- Check if creep could up replaced w/ larger size

## Scouting notes
- CPU when searching ~30 range from 1 spawn: ~1, total usage ~10%
- 1st method: iterate through spawns, search outward for rooms that need scouting
    - This works decent enough w/ just 1 spawn but probably collapses completely w/ more
    - Would prefer to not check every in range room every task update
- 2nd method: iterate through rooms in memory (possibly create a sorted queue by last tick?), check rooms that need scouting, can break early bc ordered
    - better integrates w/ current task assignment system
    - could possibly prioritize which paths to try first based on relative location to spawns, or even just most recent utilized spawn
    - searching would theoretically happen significantly less often
- issue to consider w/ both, at far ranges I'm very unlikely to try new rooms bc I currently need to have something in the room when tasking is done, previous efforts using memory caused massive performance hit

## Flags

- Grey-Grey: Graveyard, place for unassigned creeps to gather out of the way
- Purple-Purple: Claim/reserve controller in room
- Blue-Blue: Persistent scouting
- White-###: Logistics
    - -Grey: Drain
    - -Yellow: Energy