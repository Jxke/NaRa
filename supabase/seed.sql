-- seed.sql
-- Seed data for the 43 NaRa glyphs
-- Meaning emerges through tags, interpretations, and prompt questions.

delete from public.glyphs;

insert into public.glyphs (id, tags, interpretations, prompt_questions, is_selectable, bitmap_url) values
(
  'venture',
  array['beginnings', 'leap of faith', 'becoming', 'unfolding'],
  array[
    'Something is beginning to take shape, even if it''s not visible yet',
    'You are in an early stage that requires care, not force',
    'Growth is happening quietly beneath the surface'
  ],
  array[
    'What is beginning to take shape?',
    'What might be emerging that you haven''t fully recognized yet?',
    'What beginning needs care?',
    'What is quietly starting in your life right now?'
  ],
  true,
  'glyphs/venture.bmp'
),
(
  'manifestation',
  array['focus', 'intention', 'energy', 'convergence', 'orbit'],
  array[
    'Energy is being directed toward a center',
    'Multiple forces are aligning or syncing',
    'What you focus on is shaping outcome'
  ],
  array[
    'What are you channeling your energy toward right now?',
    'Where is your attention naturally returning?',
    'What feels like it''s coming into alignment?'
  ],
  true,
  'glyphs/manifestation.bmp'
),
(
  'intuition',
  array['mystery', 'ambiguity', 'perception', 'subconscious', 'insight'],
  array[
    'Signals from the outside world are being gathered into inner understanding',
    'The subconscious is recognizing patterns before the conscious mind does',
    'Clarity emerges not from searching outward, but from receiving inward',
    'Meaning exists within ambiguity and insight comes from sitting with it'
  ],
  array[
    'What are you sensing beneath the surface and why haven''t you named it yet?',
    'What are you sensing beneath the surface?',
    'Where are you picking up on something without clear evidence?',
    'What feels understood without being fully explained?'
  ],
  true,
  'glyphs/intuition.bmp'
),
(
  'abundance',
  array['nature', 'expansion', 'multiplicity', 'growth', 'regeneration', 'interconnection', 'fertility', 'emergence'],
  array[
    'Growth happens through layering and repetition, not singular force',
    'What begins as one becomes many through time and conditions',
    'Abundance emerges from interconnected systems, not isolation',
    'Regeneration ensures that what is given returns in new forms'
  ],
  array[
    'What is quietly multiplying in your life and are you letting it?',
    'What is beginning to multiply or expand?',
    'Where is growth happening gradually over time?',
    'What feels supported by its environment?'
  ],
  true,
  'glyphs/abundance.bmp'
),
(
  'structure',
  array['action', 'personal power', 'control', 'discipline', 'strength', 'endurance', 'effort', 'resilience'],
  array[
    'Power is built through sustained effort, not bursts of force',
    'Control is being exercised, but may be rigid or over-applied',
    'Strength is forming through repetition and resistance',
    'Effort is present, but its direction may need examination'
  ],
  array[
    'What are you trying to control and is that control supporting you or constraining you?',
    'What is requiring consistency or discipline?',
    'Where is effort being applied repeatedly?',
    'What feels shaped through control or direction?'
  ],
  true,
  'glyphs/structure.bmp'
),
(
  'conformity',
  array['teacher', 'tradition', 'guidance', 'authority', 'imitation', 'learning', 'structure'],
  array[
    'Guidance is being followed, though it may not be internally defined',
    'Learning is occurring through imitation rather than exploration',
    'Structure is present and may influence individual expression',
    'Authority is shaping direction, whether consciously or unconsciously',
    'There is a relationship between belonging and self-definition'
  ],
  array[
    'How much of your direction is shaped by what you''ve been shown?',
    'Where are you following an existing model?',
    'What feels influenced by external guidance?'
  ],
  true,
  'glyphs/conformity.bmp'
),
(
  'divergence',
  array['choices', 'alignment', 'union', 'separation', 'overlap', 'pathways', 'intersection'],
  array[
    'Multiple paths are present, with areas of overlap and separation',
    'Choices may share common ground before moving in different directions',
    'Alignment exists, though it may not extend across all options',
    'Union and divergence are occurring at the same time'
  ],
  array[
    'How do these paths relate to one another before they split?',
    'Where do paths begin to separate?',
    'What options share common ground before splitting?'
  ],
  true,
  'glyphs/divergence.bmp'
),
(
  'determination',
  array['focus', 'aim', 'direction', 'intent', 'momentum'],
  array[
    'Energy is directed toward a specific target',
    'Focus narrows attention toward a single outcome',
    'Momentum builds through continued orientation toward that point',
    'Distraction is reduced in favor of precision'
  ],
  array[
    'What are you aiming toward right now?',
    'Where is your focus narrowing?',
    'What direction feels most defined?'
  ],
  true,
  'glyphs/determination.bmp'
),
(
  'courage',
  array['endurance', 'effort', 'stamina', 'persistence', 'resilience', 'progression'],
  array[
    'Movement continues despite difficulty or resistance',
    'Effort is sustained even when progress feels slow',
    'The path requires ongoing engagement rather than quick resolution',
    'Strength develops through staying with what is challenging'
  ],
  array[
    'What feels worth continuing, even when it''s difficult?',
    'Where is effort being sustained over time?',
    'What requires steady movement forward?'
  ],
  true,
  'glyphs/courage.bmp'
),
(
  'introspect',
  array['solitude', 'wisdom', 'inward', 'reflection', 'self-awareness', 'perception'],
  array[
    'Attention is directed inward rather than outward',
    'Self-perception is being observed or examined',
    'Understanding is forming through reflection rather than action',
    'Separation allows for clearer awareness of the self'
  ],
  array[
    'What do you notice when you turn your attention inward?',
    'Where is your attention directed within yourself?',
    'What becomes visible through reflection?'
  ],
  true,
  'glyphs/introspect.bmp'
),
(
  'cascade',
  array['chain reaction', 'consequence', 'momentum', 'cause-effect'],
  array[
    'One action is triggering others',
    'Small shifts are creating larger outcomes',
    'Momentum is building, intentionally or not'
  ],
  array[
    'What did you set in motion and where is it leading?',
    'What has been set into motion?',
    'Where are small actions creating larger effects?',
    'How is momentum building from earlier steps?'
  ],
  true,
  'glyphs/cascade.bmp'
),
(
  'balance',
  array['trust', 'equilibrium', 'fairness', 'stability', 'alignment', 'steadiness'],
  array[
    'Stability is maintained through careful distribution of weight',
    'Multiple elements are held in relation rather than isolation',
    'Equilibrium depends on subtle adjustments over time',
    'Trust is placed in the structure to hold without collapse'
  ],
  array[
    'What is holding things in place right now?',
    'What is being held in equilibrium?',
    'Where are adjustments maintaining stability?',
    'What feels carefully distributed?'
  ],
  true,
  'glyphs/balance.bmp'
),
(
  'surrender',
  array['yielding', 'redirection', 'pause', 'allowance', 'shift'],
  array[
    'Force gives way to redirection rather than resistance',
    'Movement adapts instead of pushing forward',
    'Pause creates space for alternative paths',
    'Control loosens in favor of responsiveness'
  ],
  array[
    'What changes when you stop pushing here?',
    'What changes when pressure is reduced?',
    'Where might a shift in direction occur naturally?',
    'What happens when control loosens?'
  ],
  true,
  'glyphs/surrender.bmp'
),
(
  'transformation',
  array['relief', 'renewal', 'rebirth', 'evolution'],
  array[
    'A shift has occurred, resulting in a new form or state',
    'What was once constrained is now able to move freely',
    'Change is not abrupt, but the result of a prior process',
    'Emergence follows a period of development or transition'
  ],
  array[
    'What feels different now compared to before?',
    'Where has a change already taken place?',
    'What has moved into a new form?'
  ],
  true,
  'glyphs/transformation.bmp'
),
(
  'harmony',
  array['flow', 'divine timing', 'balance', 'alignment', 'ease', 'unfolding'],
  array[
    'Elements are unfolding in a way that feels natural rather than forced',
    'Timing appears to align without the need for control',
    'Balance is achieved through allowing rather than adjusting',
    'Growth emerges from conditions being in sync'
  ],
  array[
    'Where does this feel like it''s unfolding on its own?',
    'What seems to be aligning without force?',
    'Where is balance occurring through flow?'
  ],
  true,
  'glyphs/harmony.bmp'
),
(
  'restriction',
  array['addiction', 'sabotage', 'dependency', 'attachment', 'limitation', 'entanglement'],
  array[
    'Movement is limited by something holding it in place',
    'Patterns may be reinforcing themselves over time',
    'Dependency is shaping behavior or direction',
    'What supports may also be constraining'
  ],
  array[
    'What feels difficult to move away from?',
    'Where is movement being limited?',
    'What patterns are holding something in place?'
  ],
  true,
  'glyphs/restriction.bmp'
),
(
  'sudden',
  array['sudden', 'break', 'upheaval', 'shock', 'disruption', 'rupture', 'shift'],
  array[
    'A break occurs abruptly, interrupting continuity',
    'Stability is disrupted without gradual transition',
    'Change happens faster than expected or prepared for',
    'A previous state can no longer be maintained'
  ],
  array[
    'What shifted more suddenly than you expected?',
    'What changed without warning?',
    'Where did stability shift quickly?',
    'What feels disrupted or interrupted?'
  ],
  true,
  'glyphs/sudden.bmp'
),
(
  'healing',
  array['tend', 'hope', 'faith', 'softness'],
  array[
    'Recovery is in motion, even if not yet complete',
    'Attention is being given to what needs care',
    'Softness is present where there was strain or damage',
    'Change is occurring through gentle, gradual repair'
  ],
  array[
    'What feels like it''s beginning to mend?',
    'Where is care being applied gently?',
    'What is gradually being restored?'
  ],
  true,
  'glyphs/healing.bmp'
),
(
  'illusion',
  array['fear', 'dreams', 'anxiety', 'confusion', 'uncertainty', 'distortion'],
  array[
    'Perception is influenced by incomplete or unclear information',
    'What is seen may not fully reflect what is present',
    'Emotions are shaping interpretation of reality',
    'Clarity is reduced, making direction less certain'
  ],
  array[
    'What feels unclear or difficult to fully see?',
    'Where might perception be influenced by uncertainty?',
    'What seems present but not fully defined?'
  ],
  true,
  'glyphs/illusion.bmp'
),
(
  'clarity',
  array['optimism', 'illumination', 'understanding', 'awareness', 'insight', 'renewal'],
  array[
    'Something becomes visible that was previously unclear',
    'Understanding is forming through increased awareness',
    'Perspective shifts as more light is introduced',
    'A new phase begins with greater sense of direction'
  ],
  array[
    'What is becoming clearer to you now?',
    'What is becoming easier to understand?',
    'Where is something coming into focus?'
  ],
  true,
  'glyphs/clarity.bmp'
),
(
  'awakening',
  array['recall', 'acceptance', 'reflection', 'evaluation', 'awareness', 'realization'],
  array[
    'Attention is being drawn to something that was previously overlooked',
    'Past experiences or choices are coming back into focus',
    'Awareness increases, prompting reflection and evaluation',
    'Recognition leads toward a shift in understanding'
  ],
  array[
    'What is calling for your attention right now?',
    'What is coming into awareness?',
    'Where is attention being drawn back?'
  ],
  true,
  'glyphs/awakening.bmp'
),
(
  'complete',
  array['fulfillment', 'achievement', 'closure', 'resolution', 'integration', 'wholeness'],
  array[
    'A missing element has been found or placed',
    'Parts are coming together into a coherent whole',
    'A process or effort is reaching resolution',
    'Something feels finished or fully formed'
  ],
  array[
    'What feels like it has come together?',
    'Where is something reaching resolution?',
    'What seems finished or whole?'
  ],
  true,
  'glyphs/complete.bmp'
),
(
  'industry',
  array['labor', 'repetition', 'accumulation', 'diligence', 'consistency'],
  array[
    'Progress is built through small, repeated actions',
    'Effort accumulates gradually over time',
    'Work is distributed rather than concentrated',
    'Output emerges from consistency rather than intensity'
  ],
  array[
    'How are small actions contributing over time?',
    'Where is effort accumulating gradually?',
    'What is being built through repetition?'
  ],
  true,
  'glyphs/industry.bmp'
),
(
  'transition',
  array['openness', 'transition', 'progression', 'reflection', 'understanding', 'continuation'],
  array[
    'Information is being taken in and processed over time',
    'Understanding develops through continued exposure and review',
    'Something is open and available to be read, understood, or revealed',
    'Attention is shifting forward, moving from one chapter or phase to the next'
  ],
  array[
    'Is it time to turn the page?',
    'What does moving forward from here look like?',
    'Where is one phase giving way to another?',
    'What feels like a shift between chapters?'
  ],
  true,
  'glyphs/transition.bmp'
),
(
  'release',
  array['flow', 'passage', 'letting go', 'movement', 'transition', 'time'],
  array[
    'What has happened is moving past and no longer held in place',
    'Events are flowing away rather than being revisited',
    'Time creates distance between experience and the present',
    'Movement continues without needing to return to what was'
  ],
  array[
    'Is this something that still needs to be held onto?',
    'What feels like it''s already moving past?',
    'Where is something no longer being held?',
    'What is naturally flowing away?'
  ],
  true,
  'glyphs/release.bmp'
),
(
  'duality',
  array['contrast', 'duality', 'tension', 'perspective', 'division', 'coexistence'],
  array[
    'Two perspectives exist within the same form',
    'Opposing directions are present at once',
    'Internal tension may arise from holding multiple viewpoints',
    'Difference does not require separation to exist'
  ],
  array[
    'Can both directions be true at the same time?',
    'Where are opposing directions present together?',
    'How do these differences coexist?'
  ],
  true,
  'glyphs/duality.bmp'
),
(
  'conflict',
  array['direction', 'tension', 'choice', 'opposition', 'divergence', 'uncertainty'],
  array[
    'Multiple directions are present without clear alignment',
    'Movement is pulled between opposing forces',
    'Choice is required, but resolution may not yet be formed',
    'Energy is divided rather than focused'
  ],
  array[
    'Which direction feels most aligned right now?',
    'Where is tension between options present?',
    'What is pulling in different directions?'
  ],
  true,
  'glyphs/conflict.bmp'
),
(
  'clouded',
  array['uncertainty', 'obscurity', 'floating', 'abstraction', 'ambiguity', 'diffusion'],
  array[
    'Clarity is softened or partially obscured',
    'Attention may feel lifted or detached from the immediate',
    'Thoughts drift into imagination or abstraction',
    'Understanding is present, but not fully defined',
    'Conditions are temporary and subject to change'
  ],
  array[
    'Where has your attention been drifting lately?',
    'Where does attention feel unfocused or diffuse?',
    'What feels partially obscured?'
  ],
  true,
  'glyphs/clouded.bmp'
),
(
  'pour',
  array['expression', 'outflow', 'release', 'giving', 'overflow'],
  array[
    'Something internal is moving outward',
    'Containment shifts into expression',
    'Accumulation reaches a point of release',
    'Flow replaces holding'
  ],
  array[
    'How is this moving outward?',
    'How is something being expressed outward?',
    'Where is release occurring?',
    'What is moving from inside to outside?'
  ],
  true,
  'glyphs/pour.bmp'
),
(
  'threshold',
  array['unknown', 'transition', 'entry', 'uncertainty', 'crossing', 'possibility'],
  array[
    'A boundary is being crossed from the known into the unknown',
    'Movement forward involves entering something not yet visible',
    'Clarity is reduced, but potential is present',
    'There is a shift from one state or space into another'
  ],
  array[
    'How do you relate to what lies beyond this threshold?',
    'What lies beyond this point of entry?',
    'Where does something new begin?'
  ],
  true,
  'glyphs/threshold.bmp'
),
(
  'fire',
  array['energy', 'intensity', 'passion', 'destruction', 'transformation', 'heat'],
  array[
    'Energy is active and difficult to contain',
    'Intensity can create or destroy depending on how it is held',
    'Something is being consumed to make way for change',
    'Heat accelerates processes that would otherwise take longer'
  ],
  array[
    'Where is this intensity being directed?',
    'Where is intensity present?',
    'What is being fueled or consumed?'
  ],
  true,
  'glyphs/fire.bmp'
),
(
  'pattern',
  array['recursion', 'repetition', 'structure', 'scale', 'self-similarity', 'system'],
  array[
    'The same structure appears across different scales',
    'Patterns repeat in ways that connect small and large forms',
    'A system is unfolding through consistent internal logic',
    'What appears complex is built from simple repeating rules'
  ],
  array[
    'Where have you seen this pattern before?',
    'What structure repeats across situations?',
    'How is this pattern showing up again?'
  ],
  true,
  'glyphs/pattern.bmp'
),
(
  'house',
  array['shelter', 'belonging', 'security', 'stability', 'familiarity', 'grounding'],
  array[
    'A space provides protection and containment',
    'Belonging is shaped by where one returns or rests',
    'Stability is created through familiarity and structure',
    'Environment influences how safe or settled something feels'
  ],
  array[
    'Where does this feel settled or grounded?',
    'What environment creates a sense of stability?',
    'Where do you return to?'
  ],
  true,
  'glyphs/house.bmp'
),
(
  'bond',
  array['linkage', 'attachment', 'continuity', 'connection', 'dependence'],
  array[
    'Two or more elements are directly linked',
    'Strength depends on the integrity of each connection point',
    'Attachment creates continuity across separation',
    'Connection may both support and restrict'
  ],
  array[
    'What is linking these parts together?',
    'Where is connection creating continuity?',
    'How are parts held in relation?'
  ],
  true,
  'glyphs/bond.bmp'
),
(
  'detachment',
  array['separation', 'survival', 'adaptation', 'release', 'resilience'],
  array[
    'Separation occurs to preserve the larger whole',
    'Something is released as a form of protection',
    'Loss and continuation exist at the same time',
    'Adaptation allows movement after disruption'
  ],
  array[
    'What is being separated in order to continue?',
    'Where is something being let go?',
    'How is adaptation occurring through release?'
  ],
  true,
  'glyphs/detachment.bmp'
),
(
  'unity',
  array['togetherness', 'cooperation', 'alignment', 'group', 'support'],
  array[
    'Multiple individuals act in coordination',
    'Shared movement creates collective strength',
    'Alignment exists across a group rather than an individual',
    'Support is mutual rather than one-directional'
  ],
  array[
    'Where are you moving in sync with others?',
    'Where are things moving together?',
    'What is shared across this group?'
  ],
  true,
  'glyphs/unity.bmp'
),
(
  'cycles',
  array['rhythm', 'flow', 'repetition', 'change', 'movement', 'continuity'],
  array[
    'Movement rises and falls in repeating patterns',
    'Change occurs in phases rather than all at once',
    'Momentum builds, recedes, and returns again',
    'Stability exists within ongoing motion'
  ],
  array[
    'How does this move in cycles rather than in a straight line?',
    'Where does this rise and fall over time?',
    'What repeats in phases?'
  ],
  true,
  'glyphs/cycles.bmp'
),
(
  'interconnection',
  array['network', 'system', 'linkage', 'sensitivity', 'structure'],
  array[
    'Multiple elements are connected across a wider system',
    'Change in one area affects others',
    'Connections extend beyond direct links',
    'The structure responds as a whole'
  ],
  array[
    'How does this connect across a larger system?',
    'Where do small changes affect the whole?',
    'What links these parts beyond direct contact?'
  ],
  true,
  'glyphs/interconnection.bmp'
),
(
  'opening',
  array['openness', 'possibility', 'perspective', 'access', 'ventilation', 'invitation'],
  array[
    'A boundary is partially removed, allowing exchange between inside and outside',
    'New perspectives become available through exposure',
    'Movement of air, light, or ideas is enabled',
    'There is access to something previously closed or unseen'
  ],
  array[
    'What becomes available through this opening?',
    'Where is access being created?',
    'What is now able to enter or leave?'
  ],
  true,
  'glyphs/opening.bmp'
),
(
  'ripple',
  array['impact', 'spread', 'influence', 'cause-effect', 'disturbance', 'propagation'],
  array[
    'A single action creates outward movement beyond its origin',
    'Change spreads gradually across a wider field',
    'Small disturbances can extend farther than expected',
    'Effects continue even after the initial moment has passed'
  ],
  array[
    'How far does this extend beyond its starting point?',
    'How far does this extend from its origin?',
    'Where are effects spreading outward?'
  ],
  true,
  'glyphs/ripple.bmp'
),
(
  'dialogue',
  array['communication', 'exchange', 'listening', 'expression', 'interaction', 'conversation'],
  array[
    'Information moves between two or more points',
    'Meaning is shaped through both speaking and listening',
    'Exchange creates mutual influence rather than one-way direction',
    'Understanding develops through interaction over time'
  ],
  array[
    'How are you expressing this to others?',
    'What is being exchanged in this interaction?',
    'Where is communication shaping understanding?'
  ],
  true,
  'glyphs/dialogue.bmp'
),
(
  'progression',
  array['steps', 'ascent', 'movement', 'growth', 'advancement', 'sequence'],
  array[
    'Movement occurs in defined steps rather than all at once',
    'Progress builds incrementally over time',
    'Each level depends on the one before it',
    'Advancement requires continued upward or forward motion'
  ],
  array[
    'What step comes next from where you are?',
    'What step comes next from here?',
    'Where is movement happening in stages?'
  ],
  true,
  'glyphs/progression.bmp'
),
(
  'error',
  array['boundary', 'persona', 'misdirected address', 'companion mode'],
  array[
    'This glyph appears when the device is being addressed as though it were a person rather than used for reflection',
    'It marks a boundary condition rather than a symbolic reading',
    'No companion word should be shown with this glyph'
  ],
  array[
    'This is a system-only glyph for personified device talk',
    'Do not use this glyph in normal reflective consultation output'
  ],
  false,
  'glyphs/error.bmp'
);
