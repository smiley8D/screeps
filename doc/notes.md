## TODO

- Performance
    - Look into switching to raw memory, compressing repeated keys
    - Pathing, caching, etc.
        - Especially for multirooms, I don't think I ever want it to recompute that during a run
        - Need to research and test more
        - Consider using findClosestByRange more often. Within a room it probably works quite well
            - currently testing, not much noticable impact
- Calculate replacement time from distance to nearest spawn
    - Store creep's spawn and calculate current linear distance?
- Metrics on survey
- Metrics on last sighted (including in game map), add other events?
- Spawn reserves/failsafe procotols
    - Some system should already be in to spawn haulers w/ work part if no other creeps
    - Maintain a reserve, determine when it should be used (ex. no more spawn energy + trying to spawn an energy stocker?)
    - can have tasks flag if they are allowed to eat reserve, and/or create specific boot-up task? (could double as pioneers and reuse logic for new/underdeveloped rooms, specialize in 0 to 1)
- Often dramatic difference in energy change & transfers, probably to do with counters being slightly off, look in to
- Creep behaviors
    - Consider/test GTFOTR again
        - Alternatively, look ahead and see if creep is in way? Trade places if so?
    - Combat stance (aggressive, neutral, avoid?)
        - PathFinder has a flee option, could be very useful for avoidance
        - Room cost function
    - Room traversing (already in)
- Diplomacy (integrate w/ behaviors)
    - Player stance (ally, neutral, enemy?)
    - Ignore neutrals in neutral territory, engage in owned
    - Always engage enemies
    - Ignore allies in all territory
    - Switch neutral to enemy if attacked (consider territory?)
    - Switch ally to enemy if attacked a sufficient amount (probably using a moving average) (consider territory?)
    - Configurable no scouting of allies? Would be nice to set
    - Per-room overrides? Ex some rooms always treat everyone/someones hostiles, etc.
- Reservation quirks for sources
    - 300 tick reset for all, reserving/owning bumps up to 3000, unowned is 1500, center is 4000
    - Figure out how to make decisions based on this, is it worth it to get extra energy?
    - When does the downgrade happen? If a source is partially exploited, will it downgrade before reset?
- Calculate parking spots in survey, also apply to controller (currently hard-coded to 1)
- Task metrics/track info in memory
    - solve double-printing issue for visuals
    - can be used to determine task assignments, constants, etc.
- Set defense % to % of free room energy?
- Do combat first, devote CPU to it
- Military commands done via flags, flag name references an "army" or force composition which is designed elsewhere
- Some issue w/ task visuals not displaying for rooms w/o metrics
- Look into changing body types from Dredge to Worker based on spawner distance

## Scouting notes
- CPU when searching ~30 range from 1 spawn: ~1, total usage ~10%
- Modify current method to just cache results
- Track last attempt time (reset when creep actually reaches) to avoid spamming unreachable places
- See above on room cost function to try better routing
- Research path caching, possibly integrate w/ efforts like GTFOTR to reduce path finding attempts

## Logistics notes
- Hauler pull tasks ("Trailer?") for Drudge units not in position
- Restock task (fill spawner/extension/towers)
- Cleanup task (pickup drops, loot tombstones & ruins)
- Supply route task
    - Use logistics flags to 

## Pioneer notes (short on time, dropping these here for now)
- Worth separating base bootstrapping and remote exploitation into 2 very different tasks, possibly w/ diff body types
- Base bootstrapping is when "i need spawn energy, buildings, or repairs and the existing creep and infrastructure networks are insufficient"
    - Trigger condition:
        - The point is that it's a fallback when there is limited spawning ability, whether that's no spawner or slowly-replenishing spawner
        - Low/slowly regening energy?
            - Low is easy to calc, can just say room energy avail < 300 possibly (multispawners mess w/ this so maybe not)
    - Action priorities:
        - No energy? loot (including sources)
        - Empty spawners? supply
        - Damage? repair
        - Build sites? build
- Remote exploitation is mining but in a diff room w/ a larger travel time (and probably also worse logistics)
    - Can act almost exactly like miner otherwise I think
    - Add check to not depo in unowned/other owned structures? (if room owned by someone else, containers off limits?)

## Scouting notes
- CPU when searching ~30 range from 1 spawn: ~1

## Scouting notes
- CPU when searching ~30 range from 1 spawn: ~1

## Flags

- Brown: Graveyard, place for unassigned creeps to gather out of the way
- Orange: Deconstruct
- White-###/Grey-###: Logistics (Fill/Drain)
    - Yellow: Energy
    - Grey: Hydrogen
- Purple-###: Intelligence (will generate visuals)
    - Purple: Scout
- Yellow-###: Expansion/exploitation
    - Purple: Claim
    - Blue: Reserve
    - Red: Attack ownership
    - Yellow: Exploit energy
    - Brown: Exploit other
- Red-###: Military (decide colors later) (some can be configured to renew, esp rally)
    - Garrison
    - Escort
    - Attack
    - Rally