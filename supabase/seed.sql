-- seed.sql
-- Seed data for the 22 archetypal glyphs
-- Each glyph is intentionally ambiguous — meaning emerges from context and interpretation

insert into public.glyphs (id, labels, tags, interpretations, stories, bitmap_url) values

-- 1. SPIRAL
(
  'spiral',
  array['Spiral', 'Unfurling', 'Vortex'],
  array['growth', 'recursion', 'time', 'inward', 'cycles'],
  array[
    'A pattern repeating at a different scale',
    'Returning to something familiar with new understanding',
    'Getting drawn deeper into a question',
    'Growth that looks like going in circles',
    'The tightening focus before a breakthrough',
    'Losing yourself in something deliberately',
    'A conversation that keeps circling the same unsaid thing'
  ],
  array[
    'She traced the nautilus shell and realized her career had the same shape — the same problems at every level, but she was larger each time she met them.',
    'The old man walked the labyrinth every morning. He said it was never the same path twice, even though the stones never moved.',
    'They kept returning to the same argument, but each time the silence afterward was a little shorter.'
  ],
  'glyphs/spiral.bmp'
),

-- 2. MIRROR
(
  'mirror',
  array['Mirror', 'Reflection', 'Double'],
  array['self', 'truth', 'perception', 'honesty', 'duality'],
  array[
    'Seeing yourself clearly for the first time in a while',
    'Someone reflecting your own behavior back to you',
    'The gap between how you see yourself and how others do',
    'A confrontation with something you have been avoiding',
    'Recognizing a pattern in yourself you thought you had outgrown',
    'Finding yourself in someone else''s story',
    'The version of you that exists in other people''s minds',
    'A moment of painful clarity'
  ],
  array[
    'He listened to the recording of his own voice and did not recognize the person speaking. Not the sound — the certainty.',
    'The twins grew up in different cities and met at thirty. They had the same laugh but opposite fears.'
  ],
  'glyphs/mirror.bmp'
),

-- 3. BRIDGE
(
  'bridge',
  array['Bridge', 'Span', 'Crossing'],
  array['connection', 'transition', 'risk', 'between', 'commitment'],
  array[
    'A difficult conversation that needs to happen',
    'The space between deciding and doing',
    'Reaching toward someone across a divide',
    'A compromise that costs something real',
    'Building trust one small gesture at a time',
    'The vulnerable moment of asking for help',
    'Translating between two worlds you inhabit',
    'Leaving one shore before you can see the other'
  ],
  array[
    'She wrote the email seven times. Each draft was shorter. The one she sent was three words.',
    'The interpreter sat between the two delegations and realized she was not translating languages — she was translating griefs.',
    'He drove halfway across the country to say something he could have texted, because some bridges have to be crossed on foot.'
  ],
  'glyphs/bridge.bmp'
),

-- 4. FLAME
(
  'flame',
  array['Flame', 'Burn', 'Ignition'],
  array['passion', 'destruction', 'urgency', 'warmth', 'transformation'],
  array[
    'Something that excites and frightens you equally',
    'Intensity that cannot be sustained but must be honored',
    'Burning away what no longer serves',
    'The spark of an idea that won''t leave you alone',
    'Anger that is actually grief',
    'The warmth you offer others at a cost to yourself',
    'A deadline that clarifies everything',
    'Creative energy that feels almost dangerous'
  ],
  array[
    'The potter broke every piece from that month. She said the kiln had shown her they were all rehearsals.',
    'He quit on a Tuesday with nothing lined up. His hands stopped shaking for the first time in a year.'
  ],
  'glyphs/flame.bmp'
),

-- 5. SEED
(
  'seed',
  array['Seed', 'Dormancy', 'Potential'],
  array['beginning', 'patience', 'latent', 'future', 'small'],
  array[
    'Something planted long ago that is only now showing',
    'A small action with consequences you cannot yet see',
    'Waiting for the right conditions, not the right moment',
    'The earliest stage of something that will become important',
    'An idea too fragile to share yet',
    'Trust that what you have started will grow without your constant attention',
    'The quiet accumulation of small choices'
  ],
  array[
    'The letter arrived twenty years after it was written. The apology still mattered.',
    'She planted the oak knowing she would never sit in its shade. Her granddaughter did.',
    'He started learning the language with no trip planned. Three years later, the trip planned itself.'
  ],
  'glyphs/seed.bmp'
),

-- 6. WAVE
(
  'wave',
  array['Wave', 'Surge', 'Rhythm'],
  array['emotion', 'cycles', 'momentum', 'release', 'natural'],
  array[
    'An emotion arriving without warning or permission',
    'The natural rhythm of effort and rest',
    'Momentum that carries you further than you intended',
    'Grief that comes in waves, not stages',
    'Surrendering to a process you cannot control',
    'The rising energy before a change',
    'Something building beneath the surface'
  ],
  array[
    'The surfer said the wave does not care about your plans. You ride it or you don''t, but it''s coming either way.',
    'She cried in the grocery store for no reason she could name. Later she realized it was relief.'
  ],
  'glyphs/wave.bmp'
),

-- 7. ECLIPSE
(
  'eclipse',
  array['Eclipse', 'Shadow', 'Occultation'],
  array['hidden', 'temporary', 'perspective', 'awe', 'alignment'],
  array[
    'Something important temporarily obscured',
    'A rare alignment of forces in your life',
    'The shadow of one priority falling across another',
    'Beauty in something that cannot last',
    'A brief window of unusual clarity',
    'What becomes visible only when the obvious is blocked',
    'The strange calm at the center of an overwhelming moment',
    'Two parts of your life overlapping in an unexpected way'
  ],
  array[
    'During the blackout, the neighbors met for the first time in years. When the power returned, they kept the candles lit.',
    'He lost his voice for a week. In the silence, he heard what his family had been trying to tell him.'
  ],
  'glyphs/eclipse.bmp'
),

-- 8. COMPASS
(
  'compass',
  array['Compass', 'Bearing', 'North'],
  array['direction', 'values', 'orientation', 'choice', 'clarity'],
  array[
    'Knowing your direction even when the path is unclear',
    'A value that orients you when everything else is uncertain',
    'The difference between where you are heading and where you thought you would be',
    'Recalibrating after a period of drift',
    'Someone who helps you find your bearing',
    'The question that cuts through noise',
    'Trusting your sense of direction over the map'
  ],
  array[
    'She asked herself the same question every year on her birthday: would the person I was at twenty be proud or relieved?',
    'The sailor threw away the chart and followed the stars. He arrived somewhere he did not expect but could not argue with.'
  ],
  'glyphs/compass.bmp'
),

-- 9. ANCHOR
(
  'anchor',
  array['Anchor', 'Hold', 'Ground'],
  array['stability', 'weight', 'grounding', 'commitment', 'roots'],
  array[
    'Something that keeps you steady when everything moves',
    'A commitment that limits your freedom but gives you depth',
    'The weight of responsibility you chose',
    'A relationship that grounds you',
    'The practice or ritual that holds your days together',
    'Staying when leaving would be easier',
    'The difference between being stuck and being rooted'
  ],
  array[
    'Every morning he made the same coffee in the same cup. It was the one thing that did not negotiate.',
    'She kept the apartment long after she could afford better. It was where she had become herself.',
    'The old dog could not walk far anymore, but he still went to the door every evening. Loyalty outlasts the legs.'
  ],
  'glyphs/anchor.bmp'
),

-- 10. PRISM
(
  'prism',
  array['Prism', 'Spectrum', 'Refraction'],
  array['complexity', 'perspective', 'analysis', 'beauty', 'multiplicity'],
  array[
    'A simple situation revealing unexpected complexity',
    'Seeing all sides of something at once',
    'Breaking a problem into its component parts',
    'The many versions of a single truth',
    'Finding beauty in analysis',
    'A person who shows different faces in different contexts',
    'The moment you realize a question has more than two answers',
    'Appreciation for nuance over certainty'
  ],
  array[
    'The committee had seven members and seven different memories of the same meeting.',
    'She held the glass to the window and watched white light become everything. She thought about her mother, who had always seemed simple.'
  ],
  'glyphs/prism.bmp'
),

-- 11. NEST
(
  'nest',
  array['Nest', 'Haven', 'Shelter'],
  array['safety', 'home', 'care', 'protection', 'nurture'],
  array[
    'Creating safety for someone or something vulnerable',
    'The urge to protect what you have built',
    'A space you have made warm for others',
    'The tension between shelter and confinement',
    'Outgrowing a place that once held you perfectly',
    'Building something from whatever materials are at hand',
    'The quiet work of maintenance and care'
  ],
  array[
    'The bird used a strand of his daughter''s hair in the nest outside the window. He left the window open all spring.',
    'She redecorated the room three times before admitting it was not the room she was trying to fix.'
  ],
  'glyphs/nest.bmp'
),

-- 12. THRESHOLD
(
  'threshold',
  array['Threshold', 'Doorway', 'Liminal'],
  array['transition', 'decision', 'boundary', 'beginning', 'courage'],
  array[
    'Standing at the edge of a decision you cannot undo',
    'The moment just before everything changes',
    'A boundary between who you were and who you are becoming',
    'The pause before entering a room',
    'Recognizing a point of no return',
    'The strange space between endings and beginnings',
    'An invitation you are not sure you want to accept',
    'The door you keep walking past'
  ],
  array[
    'He stood in the doorway for so long that both rooms started to feel like hallways.',
    'The graduate held her diploma and felt nothing. The feeling came three weeks later, in a supermarket, when she realized no one was expecting her anywhere.',
    'They signed the lease and sat on the empty floor. The echo made everything they said sound like a question.'
  ],
  'glyphs/threshold.bmp'
),

-- 13. EMBER
(
  'ember',
  array['Ember', 'Glow', 'Residual'],
  array['persistence', 'memory', 'warmth', 'fading', 'endurance'],
  array[
    'Something that was once intense but still glows quietly',
    'A friendship that survives on very little contact',
    'The last energy before rest',
    'A feeling you thought was gone but is still warm',
    'The remnant of a passion that shaped who you are',
    'What remains after the fire of a crisis',
    'Keeping something alive with careful attention'
  ],
  array[
    'They had not spoken in five years but she still set a place for him at Thanksgiving. Just in case.',
    'The old notebook had one page left. He had been saving it for something worth writing. He wrote: I am still here.'
  ],
  'glyphs/ember.bmp'
),

-- 14. ROOTS
(
  'roots',
  array['Roots', 'Foundation', 'Underground'],
  array['origin', 'identity', 'depth', 'heritage', 'hidden'],
  array[
    'The unseen structures that support what is visible',
    'Reconnecting with where you came from',
    'A problem whose real cause is deeper than it appears',
    'The inherited patterns you carry without choosing',
    'Drawing strength from your history',
    'The work that nobody sees',
    'Understanding why you react the way you do',
    'Something fundamental that resists change'
  ],
  array[
    'She learned her grandmother''s language at forty and understood, for the first time, why she had always dreamed in rhythms she could not name.',
    'The tree fell in the storm. Its roots were wider than the canopy had been. No one knew until it was lying on its side.'
  ],
  'glyphs/roots.bmp'
),

-- 15. TIDE
(
  'tide',
  array['Tide', 'Ebb', 'Flow'],
  array['change', 'patience', 'inevitability', 'rhythm', 'surrender'],
  array[
    'A change that is coming whether you prepare or not',
    'The rhythm of things beyond your control',
    'Knowing when to push and when to wait',
    'The slow revealing of what was always there',
    'Energy that withdraws before it returns stronger',
    'Trust in a process that has its own timing',
    'Something you lost that the current may bring back'
  ],
  array[
    'The fisherman said: you do not argue with the tide. You learn its schedule and call it partnership.',
    'She stopped chasing the promotion and it arrived. She was not sure if she had been blocking it or if the timing was just the timing.'
  ],
  'glyphs/tide.bmp'
),

-- 16. VEIL
(
  'veil',
  array['Veil', 'Gauze', 'Obscured'],
  array['mystery', 'protection', 'illusion', 'softness', 'boundary'],
  array[
    'Something you can almost see but not quite',
    'A truth softened by distance or time',
    'The protective layer between you and something overwhelming',
    'A secret that serves a purpose',
    'The gentleness of not knowing everything',
    'A memory that has become more feeling than fact',
    'The privacy you owe yourself',
    'Something revealed gradually rather than all at once'
  ],
  array[
    'The fog that morning was so thick that the familiar street became a new country. She walked to work and arrived somewhere else entirely.',
    'He told the story so many times that the pain wore smooth, like sea glass. The sharp thing became beautiful and no longer cut.'
  ],
  'glyphs/veil.bmp'
),

-- 17. CANYON
(
  'canyon',
  array['Canyon', 'Chasm', 'Depth'],
  array['distance', 'erosion', 'time', 'perspective', 'vastness'],
  array[
    'A gap that formed slowly without anyone noticing',
    'The distance between intention and impact',
    'Something carved by persistence, not force',
    'The awe of looking back at how far you have come',
    'A divide that seems impossible to cross',
    'The beauty that only exists because something was removed',
    'Depth earned through sustained pressure',
    'The echo of your own voice coming back changed'
  ],
  array[
    'The geologist pointed at the canyon wall and said: this layer is a million years of nothing happening. Sometimes nothing is the most important thing.',
    'They stood on opposite rims and waved. It looked like they were close. The hike between them took two days.'
  ],
  'glyphs/canyon.bmp'
),

-- 18. BLOOM
(
  'bloom',
  array['Bloom', 'Blossom', 'Opening'],
  array['emergence', 'beauty', 'timing', 'expression', 'vulnerability'],
  array[
    'Something finally ready to show itself',
    'A talent or quality emerging at the right moment',
    'The courage of being fully visible',
    'Beauty that requires vulnerability',
    'A season of abundance after a long winter',
    'The brief window when everything aligns',
    'Letting yourself be seen as you actually are',
    'An effort that is finally bearing fruit'
  ],
  array[
    'The night-blooming cereus opens for one night a year. The neighbors set alarms and bring chairs. Some things are worth staying up for.',
    'She published the poem twenty years after writing it. It was not that she was not ready. The world was not ready.'
  ],
  'glyphs/bloom.bmp'
),

-- 19. LATTICE
(
  'lattice',
  array['Lattice', 'Grid', 'Framework'],
  array['structure', 'pattern', 'support', 'interconnection', 'order'],
  array[
    'A structure that supports without constraining',
    'The invisible frameworks that shape your days',
    'Finding order in apparent chaos',
    'The web of relationships that holds you up',
    'A system you built that now runs without you',
    'The comfort of routine and the cost of it',
    'Interdependence that makes everyone stronger',
    'A pattern you can only see from a distance'
  ],
  array[
    'The vine needed the trellis and the trellis needed the vine. Without one, the other was just sticks or just a mess on the ground.',
    'He mapped his week and realized every free hour was actually committed — to habits so old they had become invisible.'
  ],
  'glyphs/lattice.bmp'
),

-- 20. ECHO
(
  'echo',
  array['Echo', 'Reverberation', 'Return'],
  array['repetition', 'memory', 'consequence', 'resonance', 'past'],
  array[
    'A past action whose consequences are still arriving',
    'Something someone said that you keep hearing',
    'A pattern from your past showing up in the present',
    'The way your influence ripples through others',
    'A memory triggered by something small and unexpected',
    'Hearing your parent''s voice come out of your own mouth',
    'The delayed impact of a kind act',
    'Something you said that meant more than you knew'
  ],
  array[
    'Ten years later, the student emailed to say: that one thing you said in October changed everything. The teacher did not remember saying it.',
    'She heard the song in a taxi in a foreign city and was instantly eight years old, standing in the kitchen, watching her father cook.'
  ],
  'glyphs/echo.bmp'
),

-- 21. DRIFT
(
  'drift',
  array['Drift', 'Wander', 'Float'],
  array['uncertainty', 'freedom', 'aimless', 'exploration', 'surrender'],
  array[
    'Moving without a clear destination',
    'The productive value of not having a plan',
    'A relationship slowly changing without anyone deciding',
    'The space between finishing one thing and starting another',
    'Letting your mind follow its own current',
    'The gentle terror of having no obligations',
    'Discovering something by accident',
    'The difference between being lost and exploring'
  ],
  array[
    'He took the wrong train on purpose. Three stops later he found the bookshop that had the one book he did not know he needed.',
    'After the project ended, she spent two weeks doing nothing. On day fifteen, the next idea arrived fully formed.',
    'The balloon released at the birthday party was found four states away. The child who found it wrote back.'
  ],
  'glyphs/drift.bmp'
),

-- 22. KEYSTONE
(
  'keystone',
  array['Keystone', 'Linchpin', 'Capstone'],
  array['essential', 'responsibility', 'completion', 'load-bearing', 'crucial'],
  array[
    'The one thing that holds everything else together',
    'A person without whom the whole structure shifts',
    'The final piece that completes an understanding',
    'A small element carrying disproportionate weight',
    'The habit or practice that makes all other habits possible',
    'Recognizing your own importance in a system',
    'The risk of removing something that seems small',
    'A responsibility you did not ask for but cannot set down'
  ],
  array[
    'When she left the team, six other things broke. No one had realized she was the reason they worked.',
    'The mason pointed to the small stone at the top of the arch and said: every other stone is trying to fall. That one is the reason they don''t.',
    'He stopped making coffee in the morning and within a week his entire routine had collapsed. It was never about the coffee.'
  ],
  'glyphs/keystone.bmp'
)
on conflict (id) do nothing;
