# Class Spell Reference

Generated from `Angband-4.2.6/lib/gamedata/class.txt`.

This document lists each spellcasting class, the books associated with that class, and every spell currently defined in the Angband data files.

## Blackguard

Spellcasting stat: Wisdom

### [Into the Shadows]

- Source: shadow book
- Availability: Town
- Realm: Shadow

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Seek Battle | 1 | 1 | 15% | Detects all monsters susceptible to fear in the immediate area, for one turn only. |
| Berserk Strength | 3 | 2 | 20% | Removes fear and grants you berserk strength (resistance to fear, +75 melee skill, -10 to AC, and prevents healing over time) for a level-dependent duration. |
| Whirlwind Attack | 5 | 4 | 25% | Deals a level-dependent number of melee blows to each adjacent enemy. At level 5 you do one blow and gain an additional blow every 15 levels (2 at 20, 3 at 35, and 4 at 50). |
| Shatter Stone | 7 | 3 | 20% | Destroys an adjacent section of wall or rubble, unless it is a permanent wall.  Deals 20+1d30 damage to monsters vulnerable to rock remover. |
| Leap into Battle | 10 | 5 | 30% | You run up to 4 spaces towards targeted enemy, then perform a melee blow.  You gain an additional blow at levels 25 and 40.  If you moved, the number of blows is reduced by 25% for each space, then rounded. |
| Grim Purpose | 13 | 8 | 30% | Your mind becomes too focused to be slowed, paralyzed or confused for 12+d12 turns. |

### [Fear and Torment]

- Source: shadow book
- Availability: Town
- Realm: Shadow

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Maim Foe | 15 | 6 | 35% | Attempts a level-dependent number of melee blows against the targeted enemy.  You get 1 blow for every 15 levels.  If any of these blows damage the enemy, it will be stunned for 6 turns. |
| Howl of the Damned | 18 | 8 | 30% | Attempts to scare every monster in line of sight for a duration dependent on player level and monster depth.  Monsters that resist fear are not affected. |
| Relentless Taunting | 24 | 10 | 32% | Makes any monster that can move more inclined to run toward you, and less likely to use a ranged attack (including spells and innate abilities). |
| Venom | 28 | 18 | 35% | Coats all your melee weapons with poison for 18+d18 turns. |
| Werewolf Form | 32 | 30 | 40% | With a blood-curdling cry you change into a half-man half-wolf! In this form you move, attack, and heal faster. |

### [Deadly Powers]

- Source: shadow book
- Availability: Dungeon
- Realm: Shadow

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Bloodlust | 30 | 25 | 37% | Gives you a powerful desire to kill, increased every time you satisfy it. Gives you extra melee damage and extra blows, but comes with dangerous side-effects. |
| Unholy Reprieve | 34 | 45 | 60% | Restores STR, INT, CON, and experience at the cost of 66 HP. |
| Forceful Blow | 38 | 16 | 50% | Attempts a melee blow that deals additional force damage when it hits, knocking the target back with a chance to stun it. |
| Quake | 44 | 39 | 55% | Causes a radius 13 earthquake centered around the player. |

## Druid

Spellcasting stat: Wisdom

### [Lesser Charms]

- Source: nature book
- Availability: Town
- Realm: Nature

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Detect Life | 1 | 1 | 23% | Detects all living monsters in the immediate area, for one turn only. |
| Fox Form | 1 | 2 | 20% | Changes you into the shape of a quick and stealthy fox. While shapechanged you cannot use items. |
| Remove Hunger | 2 | 2 | 25% | Magically renders you comfortably fed (but not satiated). |
| Stinking Cloud | 3 | 2 | 27% | Shoots a radius-2 poison ball. |
| Confuse Monster | 5 | 3 | 30% | Confuse a single monster; more effective against animals. |
| Slow Monster | 6 | 4 | 30% | Slows down a monster; more effective against animals. |

### [Gifts of Nature]

- Source: nature book
- Availability: Town
- Realm: Nature

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Cure Poison | 4 | 4 | 30% | Neutralizes poison. |
| Resist Poison | 7 | 6 | 32% | Grants you resistance to poison for 20+1d20 turns. |
| Turn Stone to Mud | 8 | 3 | 25% | Produces a beam that destroys the first section of wall it hits, unless it is a permanent wall.  Each monster caught in the beam that is susceptible to rock remover takes 20+1d30 points of damage. |
| Sense Surroundings | 9 | 4 | 35% | Maps the nearby area. |
| Lightning Strike | 12 | 6 | 35% | Strikes a target from above with a lightning bolt, followed by a clap of thunder.  If targeting a direction or the target is not a passable grid in the line of sight, the player will be the target. |
| Earth Rising | 14 | 5 | 40% | Causes shards to explode in a line out of the earth, striking objects and monsters.  Length of the line increases with player level. |

### [Creature Dominion]

- Source: nature book
- Availability: Dungeon
- Realm: Nature

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Trance | 20 | 10 | 45% | Holds every adjacent, non-resistant monster for a level-dependent number of turns; animals are entranced for longer. |
| Mass Sleep | 25 | 15 | 50% | Attempts to put to sleep each monster within line of sight. Monsters that resist sleep are not affected. |
| Become Pukel-man | 30 | 20 | 75% | Gives you the form of a statue of the Drúedain, slow but hard to hurt. |
| Eagle's Flight | 35 | 20 | 80% | Gives you the form of one of the great eagles of Manwë. |
| Bear Form | 40 | 20 | 85% | Allows you to take the form of a great bear of the mountains, sweeping aside your enemies with your mighty paws. |

### [Nature Craft]

- Source: nature book
- Availability: Dungeon
- Realm: Nature

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Tremor | 20 | 20 | 60% | Causes a targeted 4-square radius earthquake. Earthquakes may hurt the player, damage monsters and destroy items in some squares in the area of effect. Artifacts will not be destroyed by this spell. This spell has no effect when used in the town. |
| Haste Self | 25 | 12 | 65% | Hastes you (+10 to speed) for a level-dependent duration. |
| Revitalize | 35 | 70 | 90% | Restores all stats and experience points to maximum. |
| Rapid Regeneration | 37 | 20 | 90% | Speed up digestion to increase regeneration of hitpoints for the next 5+1d3 turns (or until hungry). |
| Herbal Curing | 40 | 20 | 90% | Cures all cuts, poison, stunning and black breath, and leaves you well-nourished. |

### [Wild Forces]

- Source: nature book
- Availability: Dungeon
- Realm: Nature

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Meteor Swarm | 30 | 14 | 85% | Shoots a swarm of 3 or 4 meteors. Meteors will travel until hitting a wall, a monster, or reaching the target location. Meteors will explode as a radius-1 ball that does unresistable damage to each monster in its area of effect. If this kills the monster that blocked the path to the target location, the next meteor may continue to find another target. |
| Rift | 35 | 20 | 60% | Fires a gravity beam that hurts each monster in its path and has a chance of teleporting it away. |
| Ice Storm | 37 | 25 | 75% | Strikes every monster in line of sight with sheets of ice from above. |
| Volcanic Eruption | 40 | 30 | 75% | Creates a radius 5 ball of fire, followed by a radius 5 earthquake, around the player. |
| River of Lightning | 43 | 35 | 75% | Spews plasma in a long narrow cone from the player. |

## Mage

Spellcasting stat: Intelligence

### [First Spells]

- Source: magic book
- Availability: Town
- Realm: Arcane

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Magic Missile | 1 | 1 | 22% | Fires a magic missile that always hits its target and does unresistable damage. Sometimes a beam is fired instead that hurts each monster in its path. The chance to get a beam goes up with your character level. |
| Light Room | 1 | 2 | 26% | Lights up all squares within 2 grids of the player, and hurts all light-sensitive monsters in the area of effect. If you are in a room, the entire room will be lit up as well. |
| Find Traps, Doors & Stairs | 1 | 1 | 20% | Detects all traps, doors, and stairs in the immediate area. |
| Phase Door | 2 | 2 | 22% | Teleports you randomly up to 10 squares away. |
| Electric Arc | 2 | 2 | 34% | Creates an electrical discharge that hurts monsters and destroys vulnerable items in its path.  Length of the effect increases with player level. |
| Detect Monsters | 3 | 2 | 24% | Detects all non-invisible monsters in the immediate area, for one turn only. |
| Fire Ball | 6 | 5 | 33% | Shoots a radius-2 fire ball. |

### [Attacks and Knowledge]

- Source: magic book
- Availability: Town
- Realm: Arcane

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Recharging | 5 | 5 | 28% | Adds charges to a stack of wands or staves. Chance of success and number of charges gained increase with your level and decrease with level of wand or staff and number of charges. A failed attempt to recharge destroys one wand or staff from the stack. |
| Identify Rune | 8 | 7 | 25% | Reveals an unknown rune on an object. |
| Treasure Detection | 10 | 3 | 60% | Detects gold and senses objects in the immediate area. |
| Frost Bolt | 13 | 5 | 40% | Shoots a bolt of frost that always hits its target. Sometimes a beam is fired instead that hurts each monster in its path. The chance to get a beam goes up with your character level. |
| Reveal Monsters | 15 | 6 | 40% | Detects all monsters in the immediate area, for one turn only. |
| Acid Spray | 20 | 5 | 30% | Sprays acid in a 60-degree cone, hitting all monsters up to 10 grids away. |

### [Magical Defences]

- Source: magic book
- Availability: Town
- Realm: Arcane

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Disable Traps, Destroy Doors | 5 | 5 | 30% | Disables traps and destroys doors within a 1-square radius of you. |
| Teleport Self | 7 | 6 | 35% | Teleports you randomly within the current level. |
| Teleport Other | 15 | 10 | 30% | Produces a bolt that teleports away the first monster in its path. Distance teleported increases with player level. |
| Resistance | 20 | 20 | 65% | Grants you resistance to acid, cold, fire and lightning for 20+1d20 turns. |
| Tap Magical Energy | 22 | 2 | 30% | Turns wand or staff energy into mana; tapping stuns the player briefly. |
| Mana Channel | 25 | 10 | 50% | Increases spellcasting speed by 33% for 5+1d5 turns. |

### [Arcane Control]

- Source: magic book
- Availability: Dungeon
- Realm: Arcane

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Door Creation | 13 | 9 | 40% | A door is created on each empty floor space that is directly adjacent to you.  These doors are closed, but not locked. |
| Mana Bolt | 25 | 8 | 60% | Fires a magic missile that always hits its target and does unresistable damage. Sometimes a beam is fired instead that hurts each monster in its path. The chance to get a beam goes up with your character level. |
| Teleport Level | 28 | 17 | 65% | Teleports you 1 level up or 1 level down (chosen at random). This spell may have no effect when the forced descent option is set. |
| Detection | 30 | 10 | 70% | Detects all traps, doors, stairs, treasure, objects and monsters in the immediate area. |
| Dimension Door | 35 | 30 | 80% | Teleports you to (or near to) a square of your choice. |
| Thrust Away | 40 | 12 | 90% | Fires a short range beam of force. |

### [Wizard's Tome of Power]

- Source: magic book
- Availability: Dungeon
- Realm: Arcane

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Shock Wave | 20 | 5 | 40% | Shoots a radius-2 sound ball. Apart from doing sound damage, this also has a chance to stun each monster in the area of effect. |
| Explosion | 30 | 10 | 50% | Shoots a radius-2 shards ball and throws around anything in the area of effect. |
| Banishment | 35 | 45 | 95% | Removes all monsters represented by a chosen symbol from the level. Uniques are not affected. You take 1d4 points of damage for every monster removed. |
| Mass Banishment | 40 | 75 | 90% | Removes all monsters within 20 squares of you. Uniques are not affected. You take 1d3 points of damage for every monster removed. |
| Mana Storm | 45 | 16 | 85% | Shoots a radius-3 mana ball that does unresistable damage to each monster in its area of effect. |

## Necromancer

Spellcasting stat: Intelligence

### [Into the Shadows]

- Source: shadow book
- Availability: Town
- Realm: Shadow

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Nether Bolt | 1 | 1 | 22% | Fires a bolt of nether magic. |
| Sense Invisible | 2 | 4 | 25% | Enables you to see invisible monsters for 24+1d24 turns. |
| Create Darkness | 3 | 3 | 10% | Darkens all squares in a level-dependent area.  If you are in a room, the entire room will be darkened as well. |
| Bat Form | 3 | 4 | 20% | Changes you into the shape of a bat, weak but with excellent senses. While shapechanged you cannot use items. |
| Read Minds | 4 | 4 | 10% | Detects all monsters which have a spirit in the immediate area, and then maps in a region around them, increasing in size with character level. |

### [Dark Rituals]

- Source: shadow book
- Availability: Town
- Realm: Shadow

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Tap Unlife | 7 | 0 | 50% | Targets the nearest undead monster and damages it to gain player mana. |
| Crush | 10 | 6 | 40% | Instantly kill any monster in line-of-sight with less than four times the player's level in hitpoints, also hurting the player.  Other monsters are unharmed. |
| Sleep Evil | 12 | 5 | 50% | Attempts to put to sleep each evil monster within line of sight. Monsters that resist confusion are not affected. |
| Shadow Shift | 15 | 10 | 50% | Displaces your spirit a short distance, hurting your body as it is dragged along. |
| Disenchant | 16 | 12 | 50% | Casts a bolt which wounds, and makes spellcasting monsters less successful in casting spells. |

### [Fear and Torment]

- Source: shadow book
- Availability: Town
- Realm: Shadow

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Frighten | 17 | 4 | 40% | Attempts to scare a single monster for a level-dependent duration. Monsters that resist fear are not affected. |
| Vampire Strike | 20 | 5 | 50% | Teleports you to the nearest living monster and drains a level-dependent number of hitpoints, healing and nourishing the player. |
| Dispel Life | 22 | 20 | 50% | Inflicts unresistable damage on each living monster within line of sight. |
| Dark Spear | 25 | 10 | 60% | Fires a beam of darkness. |
| Warg Form | 28 | 20 | 60% | Changes you into the form of a warg, and gives you temporary berserk strength, at the cost of some hitpoints. |

### [Deadly Powers]

- Source: shadow book
- Availability: Dungeon
- Realm: Shadow

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Banish Spirits | 25 | 25 | 80% | Teleports away each monster with a spirit within line of sight. |
| Annihilate | 30 | 20 | 75% | Inflicts damage equal to four times player level on a single monster that is not undead, an elemental, a golem, or a vortex. |
| Grond's Blow | 35 | 35 | 80% | Destroys everything in a 15-square radius circle around you. All monsters, objects, and terrain features in the area of effect are destroyed, except stairs and permanent walls. You will also be blinded for 10+1d10 turns, unless you have resistance to blindness or dark. This ritual has no effect when used in the town. |
| Unleash Chaos | 38 | 15 | 90% | Fires a chaos beam, arc or ball in the chosen direction, wakes everything in the area, and attempts to frighten everything in line of sight. |
| Fume of Mordor | 40 | 50 | 80% | Darkens, maps out, and detects all objects on the complete current dungeon level. |
| Storm of Darkness | 43 | 16 | 80% | Invokes a radius-4 darkness ball. |

### [Corruption of Spirit]

- Source: shadow book
- Availability: Dungeon
- Realm: Shadow

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Power Sacrifice | 27 | 0 | 20% | Exchanges 50 hitpoints for 50 mana. |
| Zone of Unmagic | 32 | 16 | 60% | Produces a zone of disenchantment affecting the player and monsters within radius 4. |
| Vampire Form | 37 | 20 | 60% | Allows you to assume the form of a vampire at the cost of half your current hitpoints, than teleports you to the nearest living monster and drains a level-dependent number of hitpoints, healing and nourishing you.  When first transformed you will temporarily be able to take hitpoints from living monsters with your bite attack. |
| Curse | 40 | 50 | 60% | Deals direct damage to a single monster, more the more damaged the monster is already, at the cost of 100 hitpoints. |
| Command | 45 | 40 | 60% | Allows you to take control of a monster, and move it instead of yourself. Possible actions are move, stand still, 'd'rop, 'm'agic, or 'r'elease. |

## Paladin

Spellcasting stat: Wisdom

### [Novice's Handbook]

- Source: prayer book
- Availability: Town
- Realm: Divine

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Bless | 1 | 2 | 20% | Blesses you, giving a bonus of +5 to AC and +10 to-hit, for a level-dependent number of turns. |
| Detect Evil | 3 | 2 | 10% | Detects all evil monsters in the immediate area, for one turn only. |
| Call Light | 5 | 3 | 10% | Lights up all squares in a level-dependent area, and hurts all light-sensitive monsters in the area of effect. If you are in a room, the entire room will be lit up as well. |
| Minor Healing | 7 | 3 | 15% | Heals a level-dependent amount or percentage of hitpoints, and cures 20 points worth of cuts and of stunning. |
| Sense Invisible | 8 | 4 | 25% | Enables you to see invisible monsters for 24+1d24 turns. |
| Heroism | 12 | 5 | 30% | Cures 10 points of damage, removes fear and, from character level 15, grants you heroism (resistance to fear, and a bonus of +12 to-hit) for a level-dependent duration. |

### [Healing and Sanctuary]

- Source: prayer book
- Availability: Dungeon
- Realm: Divine

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Protection from Evil | 15 | 8 | 42% | Protects you from evil for a level-dependent duration: all melee attacks by evil monsters have a chance to be repelled, unless the monster's level is higher than your character level. |
| Remove Curse | 20 | 12 | 38% | Attempts to remove a curse from an item, more effective at higher character levels. |
| Word of Recall | 25 | 30 | 75% | Teleports you from the dungeon to the town or from the town to the deepest level you have visited in the dungeon. The recall effect is not immediate; it is delayed by 14+1d20 turns. During that delay, the prayer can be canceled by invoking the prayer of recall again. This prayer has no effect when the option to restrict the use of stairs and recall is set, unless Morgoth is dead. |
| Healing | 30 | 50 | 80% | Heals 2000 points of damage and cures all stunning, cuts, poison and amnesia. |
| Clairvoyance | 37 | 50 | 80% | Lights up, maps out, and senses all objects on the complete current dungeon level. |

### [Battle Blessings]

- Source: prayer book
- Availability: Dungeon
- Realm: Divine

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Smite Evil | 25 | 20 | 70% | Temporarily makes your melee attacks slay evil creatures. |
| Demon Bane | 30 | 40 | 80% | Temporarily makes your melee attacks powerfully slay demons. |
| Enchant Weapon | 35 | 50 | 80% | Attempts to improve the to-hit bonus and the to-dam bonus of a weapon. |
| Enchant Armour | 37 | 60 | 85% | Attempts to improve the armour class bonus of a piece of armour. |
| Single Combat | 40 | 50 | 30% | Encases you and the targeted monster in a stone cell from which only the winner can emerge. |

## Priest

Spellcasting stat: Wisdom

### [Novice's Handbook]

- Source: prayer book
- Availability: Town
- Realm: Divine

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Call Light | 1 | 1 | 10% | Lights up all squares in a level-dependent area, and hurts all light-sensitive monsters in the area of effect. If you are in a room, the entire room will be lit up as well. |
| Detect Evil | 1 | 1 | 10% | Detects all evil monsters in the immediate area, for one turn only. |
| Minor Healing | 1 | 2 | 15% | Heals a level-dependent amount or percentage of hitpoints, and cures 20 points worth of cuts and of stunning. |
| Bless | 1 | 2 | 20% | Blesses you, giving a bonus of +5 to AC and +10 to-hit, for a level-dependent number of turns. |
| Sense Invisible | 3 | 4 | 25% | Enables you to see invisible monsters for 24+1d24 turns. |
| Heroism | 5 | 2 | 30% | Cures 10 points of damage, removes fear and, from character level 20, grants you heroism (resistance to fear, and a bonus of +12 to-hit) for a level-dependent duration. |

### [Cleansing Power]

- Source: prayer book
- Availability: Town
- Realm: Divine

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Orb of Draining | 7 | 7 | 40% | Shoots a radius-2 or radius-3 ball that does unresistable damage to each monster in its area of effect. Evil monsters take double damage. The bigger area of effect is attained at character level 30. |
| Spear of Light | 7 | 6 | 30% | Fires a beam that lights up each square and hurts each light-sensitive monster in its path. |
| Dispel Undead | 10 | 14 | 55% | Inflicts unresistable damage on each undead monster within line of sight. |
| Dispel Evil | 12 | 20 | 70% | Inflicts unresistable damage on each evil monster within line of sight. |
| Protection from Evil | 14 | 8 | 42% | Protects you from evil for a level-dependent duration: all melee attacks by evil monsters have a chance to be repelled, unless the monster's level is higher than your character level. |
| Remove Curse | 16 | 6 | 38% | Attempts to remove a curse from an item, more effective at higher character levels. |

### [Healing and Sanctuary]

- Source: prayer book
- Availability: Dungeon
- Realm: Divine

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Portal | 10 | 4 | 30% | Teleports you randomly over a short distance. |
| Remembrance | 20 | 30 | 90% | Restores experience points to maximum if it is currently below maximum. |
| Word of Recall | 25 | 30 | 75% | Teleports you from the dungeon to the town or from the town to the deepest level you have visited in the dungeon. The recall effect is not immediate; it is delayed by 14+1d20 turns. During that delay, the prayer can be canceled by invoking the prayer of recall again. This prayer has no effect when the option to restrict the use of stairs and recall is set, unless Morgoth is dead. |
| Healing | 30 | 50 | 80% | Heals 2000 points of damage and cures all stunning, cuts, poison and amnesia. |
| Restoration | 35 | 70 | 90% | Restores to maximum all stats that are currently below maximum. |
| Clairvoyance | 37 | 50 | 80% | Lights up, maps out, and senses all objects on the complete current dungeon level. |

### [Battle Blessings]

- Source: prayer book
- Availability: Dungeon
- Realm: Divine

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Enchant Weapon | 35 | 50 | 80% | Attempts to improve the to-hit bonus and the to-dam bonus of a weapon. |
| Enchant Armour | 37 | 60 | 85% | Attempts to improve the armour class bonus of a piece of armour. |
| Smite Evil | 25 | 20 | 70% | Temporarily makes your melee attacks slay evil creatures. |
| Glyph of Warding | 20 | 40 | 90% | Inscribes a glyph of warding beneath you. Summoned monsters can't appear on the glyph. If a monster attempts to move onto the glyph or melee you while you are standing on the glyph, it must first succeed in breaking the glyph. Higher level monsters are more likely to break the glyph. The glyph will remain where it is, until a monster succeeds in breaking it, or until you leave the level. |
| Demon Bane | 42 | 40 | 80% | Temporarily makes your melee attacks powerfully slay demons. |

### [Wrath of the Valar]

- Source: prayer book
- Availability: Dungeon
- Realm: Divine

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Banish Evil | 25 | 25 | 80% | Teleports away each evil monster within line of sight. |
| Word of Destruction | 35 | 35 | 80% | Destroys everything in a 15-square radius circle around you. All monsters, objects, and terrain features in the area of effect are destroyed, except stairs and permanent walls. You will also be blinded for 10+1d10 turns, unless you have resistance to blindness or light. This prayer has no effect when used in the town. |
| Holy Word | 39 | 32 | 95% | Inflicts unresistable damage on each evil monster within line of sight, cures 1000 points of damage, cures all stunning, heals all cut damage, neutralizes poison, and removes fear. |
| Spear of Oromë | 40 | 10 | 75% | Fires a beam of holy magic that does extra damage to evil creatures. |
| Light of Manwë | 42 | 40 | 85% | Casts a radius 4 ball of strong light, and then bathes the entire area in light doing 100 damage to every light-sensitive creature. |

## Ranger

Spellcasting stat: Wisdom

### [Lesser Charms]

- Source: nature book
- Availability: Town
- Realm: Nature

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Remove Hunger | 3 | 1 | 25% | Magically renders you comfortably fed (but not satiated). |
| Detect Life | 5 | 2 | 23% | Detects all living monsters in the immediate area, for one turn only. |
| Herbal Curing | 9 | 6 | 30% | Cures all cuts, poison, stunning and black breath. |
| Resist Poison | 12 | 10 | 32% | Grants you resistance to poison for 20+1d20 turns. |
| Turn Stone to Mud | 15 | 5 | 25% | Produces a beam that destroys the first section of wall it hits, unless it is a permanent wall.  Each monster caught in the beam that is susceptible to rock remover takes 20+1d30 points of damage. |
| Sense Surroundings | 20 | 8 | 35% | Maps the nearby area. |

### [Nature Craft]

- Source: nature book
- Availability: Dungeon
- Realm: Nature

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Cover Tracks | 20 | 20 | 40% | Prevents you from leaving scent for monsters to track you by for a level-dependent duration. |
| Create Arrows | 22 | 20 | 40% | Allows the player to turn a staff into a stack of arrows, with quality depending on staff level and player level. |
| Haste Self | 25 | 12 | 65% | Hastes you (+10 to speed) for a level-dependent duration. |
| Decoy | 30 | 30 | 40% | Leaves a magical decoy that looks and sounds like the player. |
| Brand Ammunition | 40 | 60 | 95% | Brands one stack of ammunition with fire, cold, or poison (selected at random) and at the same time attempts to improve the to-hit bonus and the to-dam bonus of the same ammunition. The spell has no effect if the ammunition is already branded, has a slay, is broken, or is cursed. |

## Rogue

Spellcasting stat: Intelligence

### [First Spells]

- Source: magic book
- Availability: Town
- Realm: Arcane

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Detect Monsters | 5 | 1 | 50% | Detects all non-invisible monsters in the immediate area, for one turn only. |
| Phase Door | 7 | 2 | 55% | Teleports you randomly up to 10 squares away. |
| Object Detection | 10 | 3 | 60% | Detects all objects in the immediate area. |
| Detect Stairs | 12 | 3 | 50% | Detects all stairs in a wide area. |
| Recharging | 20 | 10 | 50% | Adds charges to a stack of wands or staves. Chance of success and number of charges gained increase with your level and decrease with level of wand or staff and number of charges. A failed attempt to recharge destroys one wand or staff from the stack. |
| Reveal Monsters | 25 | 3 | 40% | Detects all monsters in the immediate area, for one turn only. |

### [Arcane Control]

- Source: magic book
- Availability: Dungeon
- Realm: Arcane

| Spell | Level | Mana | Fail | Description |
| --- | ---: | ---: | ---: | --- |
| Teleport Self | 17 | 6 | 35% | Teleports you randomly within the current level. |
| Hit and Run | 23 | 20 | 40% | Prepares you to teleport a short distance after stealing from a monster. |
| Teleport Other | 30 | 10 | 30% | Produces a bolt that teleports away the first monster in its path. Distance teleported increases with player level. |
| Teleport Level | 35 | 17 | 65% | Teleports you 1 level up or 1 level down (chosen at random). This spell may have no effect when the forced descent option is set. |

