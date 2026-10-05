import type { Mission } from "./types";

/**
 * Application-owned story content. A model or a drawing can only ever select
 * one of these ids; it can never add, change, or extend the text.
 */
export const MISSIONS: readonly Mission[] = [
  {
    id: "river",
    title: "Across the river",
    story:
      "Mossy the snail lives on one side of a wide river. The berry bush is on the other side.",
    goal: "Help Mossy reach the berries.",
    drawPrompt: "Draw a way for Mossy to get across the river.",
    sceneAlt:
      "A river runs through the middle. A small snail waits on the left bank. A berry bush grows on the right bank.",
    ideas: [
      {
        id: "bridge",
        label: "A bridge",
        hint: "Something laid over the water to walk across.",
        consequence:
          "Mossy slides onto your bridge and crosses, one slow inch at a time. Your bridge holds all the way.",
        complication:
          "The bridge works, but it is slippery with spray. Mossy wonders how to feel steadier on the way back.",
        motion: "steady",
        refinements: [
          { id: "bridge.rail", label: "Add a rail to hold", hint: "A bar along the side of the bridge.", ending: "With the rail, Mossy crosses back feeling steady, berries in tow. Your bridge now has a place to hold on." },
          { id: "bridge.wide", label: "Make it wider", hint: "A broader bridge with more room.", ending: "On the wider bridge Mossy has room to stretch out, and a friend even walks alongside. The berries get shared." },
          { id: "bridge.keep", label: "Keep my bridge as it is", hint: "No change.", ending: "Mossy goes back slowly and carefully. Your first bridge was enough, and the berries made it home." },
        ],
      },
      {
        id: "stones",
        label: "Stepping stones",
        hint: "A line of stones to step or hop on.",
        consequence:
          "Mossy hops from stone to stone, and each one is just big enough. Splash by splash, Mossy makes it across.",
        complication:
          "A few stones wobble, and some of the gaps are long for a snail. Mossy needs the trip to feel safer.",
        motion: "bouncy",
        refinements: [
          { id: "stones.more", label: "Add more stones", hint: "Shorter gaps between stones.", ending: "With more stones, every gap is short. Mossy crosses back in a happy zigzag with the berries." },
          { id: "stones.rope", label: "Add a rope along them", hint: "A line to hold beside the stones.", ending: "Mossy holds the rope and glides back across. The wobbly stones feel steady now." },
          { id: "stones.keep", label: "Keep my stones as they are", hint: "No change.", ending: "Mossy picks a careful path back over the same stones. Your idea got the berries home." },
        ],
      },
      {
        id: "raft",
        label: "A raft or boat",
        hint: "Something that floats and carries Mossy on the water.",
        consequence:
          "Mossy climbs aboard your boat and floats gently over the water. The far bank slowly comes closer.",
        complication:
          "The current nudges the boat sideways. Mossy lands a little downstream from the berries.",
        motion: "float",
        refinements: [
          { id: "raft.rope", label: "Add a rope to the bank", hint: "A line that keeps the boat on course.", ending: "The rope keeps the boat on course. Mossy lands right beside the berry bush and then sails back, full." },
          { id: "raft.paddle", label: "Add a paddle", hint: "A tool to steer with.", ending: "With a paddle Mossy steers straight to the berries and back again. Your boat now has a way to steer." },
          { id: "raft.keep", label: "Keep my boat as it is", hint: "No change.", ending: "Mossy walks the short way along the bank to the berries. Your boat did the hard part." },
        ],
      },
      {
        id: "rope",
        label: "A rope or vine",
        hint: "A line to swing or slide along over the water.",
        consequence:
          "Mossy holds tight and swings out over the river, landing softly on the far bank. The berries are right there.",
        complication:
          "The swing is quick, and holding on is hard work for a small snail. Mossy would like a more comfortable ride.",
        motion: "swing",
        refinements: [
          { id: "rope.seat", label: "Add a seat", hint: "A place to sit while crossing.", ending: "Sitting on the seat, Mossy swings across and back with a big grin. The berries ride along in a basket." },
          { id: "rope.landing", label: "Add a soft landing", hint: "Something soft to land on.", ending: "Mossy lands on a pile of soft leaves and rolls to a stop beside the bush. Your rope has a soft landing now." },
          { id: "rope.keep", label: "Keep my rope as it is", hint: "No change.", ending: "Mossy holds on tight once more and swings home. Your first rope was enough." },
        ],
      },
    ],
  },
  {
    id: "sprout",
    title: "The windy hill",
    story:
      "A tiny sprout is growing on a hill. Gusty wind and rain are coming this afternoon, and the sprout is small and bendy.",
    goal: "Help the sprout get through the weather.",
    drawPrompt: "Draw a way to look after the sprout.",
    sceneAlt:
      "A grassy hill with one tiny green sprout. Grey clouds and wind swirls gather in the sky.",
    ideas: [
      {
        id: "cover",
        label: "A roof or umbrella",
        hint: "Something above the sprout that keeps the rain off.",
        consequence:
          "Rain taps on your cover and rolls off the sides. The sprout stays dry and perky underneath.",
        complication:
          "The wind tugs at the cover and it starts to tilt. It needs to stay put.",
        motion: "steady",
        refinements: [
          { id: "cover.pegs", label: "Add pegs to hold it down", hint: "Small stakes that anchor the cover.", ending: "With pegs in the ground, the cover stays put all afternoon. When the sun returns, the sprout is a little taller." },
          { id: "cover.slope", label: "Make it slanted", hint: "A tilted roof so wind slides over.", ending: "The slanted roof lets the wind slide right over. The sprout barely rustles." },
          { id: "cover.keep", label: "Keep my cover as it is", hint: "No change.", ending: "The cover wobbles but holds, and the sprout makes it through. Tomorrow it is sunny." },
        ],
      },
      {
        id: "windbreak",
        label: "A wall or fence",
        hint: "Something standing beside the sprout that blocks the wind.",
        consequence:
          "The wind hits your wall and swirls up and over. Behind it, the sprout hardly moves.",
        complication:
          "The wall blocks the wind, but the rain still comes from above and the sprout is getting wet.",
        motion: "steady",
        refinements: [
          { id: "windbreak.roof", label: "Add a top", hint: "A cover across the top of the wall.", ending: "With a top on the wall, the sprout is sheltered from wind and rain. It stands up straight in the soft light." },
          { id: "windbreak.curve", label: "Curve it around", hint: "Bend the wall around the sprout.", ending: "The curved wall wraps around the sprout like a cozy nest. The wind finds no way in." },
          { id: "windbreak.keep", label: "Keep my wall as it is", hint: "No change.", ending: "A little rain is fine for a sprout. Your wall kept the wind off, and the plant grows." },
        ],
      },
      {
        id: "pot",
        label: "A pot to carry it inside",
        hint: "A container so the sprout can be moved somewhere sheltered.",
        consequence:
          "Gently, the sprout is tucked into your pot and carried to a sheltered corner. The weather rattles by outside.",
        complication:
          "Inside it is cozy, but there is no light, and a sprout needs light to grow.",
        motion: "bouncy",
        refinements: [
          { id: "pot.window", label: "Put it by a window", hint: "A bright spot near glass.", ending: "By the window the sprout watches the storm and soaks up every bit of daylight. It grows a new leaf." },
          { id: "pot.lamp", label: "Add a lamp", hint: "A light to shine on the sprout.", ending: "Your lamp glows warm over the sprout. It turns toward the light and stretches." },
          { id: "pot.keep", label: "Keep my pot as it is", hint: "No change.", ending: "When the weather clears, the pot goes back outside. The sprout is safe and ready for sunshine." },
        ],
      },
      {
        id: "support",
        label: "A stick and string",
        hint: "A support that holds the sprout upright.",
        consequence:
          "Your stick stands tall and the string holds the sprout loosely. When the wind pushes, the sprout bends and bounces back.",
        complication:
          "The stick holds, but the string is a little too tight and the sprout looks squished.",
        motion: "swing",
        refinements: [
          { id: "support.loose", label: "Loosen the string", hint: "A looser loop around the sprout.", ending: "With a looser loop, the sprout sways without breaking. It grows strong in the breeze." },
          { id: "support.soft", label: "Add a soft wrap", hint: "A padded band instead of bare string.", ending: "The soft wrap cushions the sprout. It leans in the wind and stands up again." },
          { id: "support.keep", label: "Keep my stick as it is", hint: "No change.", ending: "The sprout wobbles but stands. By evening, the wind is gone and the sprout is still there." },
        ],
      },
    ],
  },
  {
    id: "fog",
    title: "Lost in the fog",
    story:
      "Fog is drifting over the meadow. Bix is on a walk home and cannot tell which way leads to the village.",
    goal: "Help Bix find the way to the village.",
    drawPrompt: "Draw a way to show Bix where to go.",
    sceneAlt:
      "A meadow in soft fog. A small traveler stands at a fork in the path on the left. Rooftops of a village glow faintly on the right.",
    ideas: [
      {
        id: "signpost",
        label: "A signpost",
        hint: "A post with arrows pointing the way.",
        consequence:
          "Bix reads your signpost, nods, and walks the way the arrow points. The path leads straight on.",
        complication:
          "Soon the fog is so thick that Bix can barely see the next signpost. Bix needs something easier to spot.",
        motion: "steady",
        refinements: [
          { id: "signpost.color", label: "Make it bright", hint: "Bold colors that stand out in fog.", ending: "The bright signpost glows through the mist. Bix follows it all the way home." },
          { id: "signpost.more", label: "Add more signposts", hint: "A sign every few steps.", ending: "With a sign every few steps, Bix never wonders where to go. The village door is open when Bix arrives." },
          { id: "signpost.keep", label: "Keep my signpost as it is", hint: "No change.", ending: "Bix walks slowly from sign to sign. One careful step at a time, home comes into view." },
        ],
      },
      {
        id: "lanterns",
        label: "A line of lanterns",
        hint: "Lights set along the path.",
        consequence:
          "One by one, your lanterns glow along the path. Bix follows the little lights through the mist.",
        complication:
          "The lanterns end before the village, and Bix reaches a dark stretch with a fork.",
        motion: "float",
        refinements: [
          { id: "lanterns.more", label: "Add more lanterns", hint: "Extend the line of lights to the village.", ending: "The lanterns now reach the village gate. Bix walks the glowing path all the way home." },
          { id: "lanterns.arrow", label: "Add an arrow at the fork", hint: "A marker showing which way to turn.", ending: "At the fork, your arrow shows the way. Bix turns, and the village lights twinkle ahead." },
          { id: "lanterns.keep", label: "Keep my lanterns as they are", hint: "No change.", ending: "Bix takes a careful guess at the fork and, with the lanterns behind, finds the village." },
        ],
      },
      {
        id: "flag",
        label: "A tall flag or tower",
        hint: "Something tall that can be seen from far away.",
        consequence:
          "Your flag rises above the fog. Bix spots it from far off and heads straight toward it.",
        complication:
          "The flag shows where the village is, but the meadow has puddles and bumps that Bix cannot see.",
        motion: "swing",
        refinements: [
          { id: "flag.path", label: "Add a path to it", hint: "A clear route leading to the flag.", ending: "Your path leads from the meadow to the flag. Bix walks it dry-footed and arrives at the village." },
          { id: "flag.light", label: "Add a light on top", hint: "A glow at the top of the flag.", ending: "A light on the flag glows through the mist. Bix steps toward it, cheerful, and is home before dark." },
          { id: "flag.keep", label: "Keep my flag as it is", hint: "No change.", ending: "Bix walks toward the flag, splashing through a puddle or two. The village is warm and welcoming." },
        ],
      },
      {
        id: "markers",
        label: "Colored stones or ribbons",
        hint: "Little markers along the path.",
        consequence:
          "Bix spots your first marker, then the next, and the next. Following them leads out of the meadow.",
        complication:
          "The markers all look alike, so at the fork Bix cannot tell which path they belong to.",
        motion: "bouncy",
        refinements: [
          { id: "markers.color", label: "Use one special color", hint: "Pick one color just for the right path.", ending: "Only the right path has your special color. Bix follows it with confidence, straight to the village." },
          { id: "markers.shape", label: "Add a shape pointing on", hint: "Markers that point toward the village.", ending: "Your pointing markers make every turn clear. Bix arrives home feeling like a pathfinder." },
          { id: "markers.keep", label: "Keep my markers as they are", hint: "No change.", ending: "Bix checks both paths and finds your markers on the right one. Home at last." },
        ],
      },
    ],
  },
];
