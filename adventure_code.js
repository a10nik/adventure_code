const getSiblingsOf = (entity) => {
    return Object.values(parent.entities).filter(e => e.owner === entity.owner);
}

const extremumBy = (extremum) => (pluck, arr) => {
    return arr.reduce(function (best, next) {
        var pair = [pluck(next), next];
        if (!best) {
            return pair;
        } else if (extremum.apply(null, [best[0], pair[0]]) == best[0]) {
            return best;
        } else {
            return pair;
        }
    }, null)[1];
}

const minBy = extremumBy(Math.min);
const maxBy = extremumBy(Math.max);


const gatherParty = () => {
    const allies = getSiblingsOf(character);
    const fattest = maxBy(a => a.max_hp, allies);
    if (character.max_hp > fattest.max_hp) {
        set_message("Inviting");
        for (const ally of allies) {
            if (ally.id !== character.id) {
                send_party_invite(ally.id);
            }
        }
    } else {
        set_message("Accepting invites");
        accept_party_invite(fattest.id);
    }
}

const getParty = () => {
    return character.party ? parent.entities.where(e => e.party === character.party).concat(character) : [character];
}

var attack_mode = true
var interval = attack_mode && setInterval(function () {
    try {
        if (!character.party && getSiblingsOf(character).length > 0) {
            gatherParty();
            return;
        }
        if (character.rip) {
            respawn();
            return;
        }
        const leader = maxBy(a => a.max_hp, getParty());
        const isLeader = leader.id === character.id;
        if (character.hp < 100)
            use('use_hp');
        if (character.mp < character.max_mp - 200)
            use('use_mp');
        loot();

        if (character.rip || is_moving(character)) return;

        var target = get_targeted_monster();
        if (!target) {
            target = isLeader ? get_nearest_monster({ min_xp: 100, max_att: 120 }) : ;
            if (target) change_target(target);
            else {
                set_message("No Monsters");
                return;
            }
        }
        
        if (!is_in_range(target)) {
            move(
                character.x + (target.x - character.x) / 2,
                character.y + (target.y - character.y) / 2
            );
            // Walk half the distance
        }
        else if (can_attack(target)) {
            set_message("Attacking");
            attack(target);
        }
    } catch (e) {
        set_message("Error");
        game_log(e.message);
    }

}, 1000 / 4);

