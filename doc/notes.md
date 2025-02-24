## TODO

- Performance
    - Pathing, caching, etc.
        - Especially for multirooms, I don't think I ever want it to recompute that during a run
        - Need to research and test more
        - Consider using findClosestByRange more often. Within a room it probably works quite well
            - currently testing, not much noticable impact
- Often dramatic difference in energy change & transfers, probably to do with counters being slightly off, look in to
- Creep behaviors
    - Consider/test GTFOTR again
        - Alternatively, look ahead and see if creep is in way? Trade places if so?
    - Combat stance (aggressive, neutral, avoid?)
        - PathFinder has a flee option, could be very useful for avoidance
        - Room cost function
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
- Track metrics/tasks info in memory
    - solve double-printing issue for visuals
    - can be used to determine task assignments, constants, etc.
- Set defense % to % of free room energy?
- Do combat first, devote CPU to it
- Military commands done via flags, flag name references an "army" or force composition which is designed elsewhere
- Some issue w/ task visuals not displaying for rooms w/o metrics

## Scouting notes
- CPU when searching ~30 range from 1 spawn: ~1, total usage ~10%
- Modify current method to just cache results
- Track last attempt time (reset when creep actually reaches) to avoid spamming unreachable places
- See above on room cost function to try better routing
- Research path caching, possibly integrate w/ efforts like GTFOTR to reduce path finding attempts

## Logistics notes
- Hauler pull tasks ("Trailer?") for Drudge units not in position

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