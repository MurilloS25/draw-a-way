import type { Mission } from "./types";

/**
 * Application-owned story content. Drawings and models can only ever select
 * capabilities from the fixed taxonomy; they never add or change these texts.
 * Each mission has exactly three scenes. Later scenes read the capabilities
 * the child confirmed earlier (variants, skipped needs), so the story merges
 * back into shared structure instead of branching without end.
 */
export const MISSIONS: readonly Mission[] = [
  {
    id: "river",
    title: "Across the river",
    goal: "Help Mossy the snail reach the berries and a new friend.",
    hero: "Mossy",
    scenes: [
      {
        id: "river-1",
        title: "The wide river",
        story: "Mossy the snail lives on one side of a wide river. The berry bush is on the other side.",
        prompt: "Draw something that helps Mossy get to the berries.",
        sceneAlt:
          "A wide river between two green banks. A small snail waits on the left bank. A berry bush grows on the right bank.",
        needs: [
          {
            id: "cross",
            label: "cross the river",
            solvedBy: ["connects_places", "carries_someone", "floats", "flies"],
            partialBy: ["supports_weight", "anchors", "pushes_or_pulls", "rolls", "signals", "delivers"],
          },
        ],
        outcome: {
          full: "Mossy reaches the berry bush and takes a big, happy sniff.",
          partial: "Mossy gets close to the berries. One more step would make it all the way.",
          neutral: "The river stays wide for now, so Mossy waits and thinks of another way. The story goes on.",
        },
        recap: {
          full: "Mossy reached the berries.",
          partial: "Mossy got close to the berries.",
          neutral: "The river stayed wide, and Mossy kept thinking.",
        },
      },
      {
        id: "river-2",
        title: "The river rushes",
        story:
          "Rain upstream has made the river quick, and the wind is blowing hard. Mossy wants to carry berries home to the left bank without being swept away.",
        variants: [
          {
            ifAnyPrior: ["connects_places", "supports_weight"],
            story:
              "Your first idea is still by the river, but the wind makes it wobble. Mossy wants to carry berries home to the left bank without slipping.",
          },
          {
            ifAnyPrior: ["carries_someone", "floats", "flies", "rolls"],
            story:
              "Your first idea waits by the bank, but the river is quick and the wind is pushing hard. Mossy wants to carry berries home to the left bank safely.",
          },
        ],
        prompt: "Draw something that keeps Mossy steady on the way home.",
        sceneAlt:
          "The river is faster now, with wind lines across the sky. A snail with a berry stands on the right bank. The left bank is far away.",
        needs: [
          {
            id: "cross-back",
            label: "get home across the water",
            solvedBy: ["connects_places", "carries_someone", "floats", "flies"],
            partialBy: ["rolls", "pushes_or_pulls"],
            skipIfPrior: ["connects_places"],
          },
          {
            id: "steady",
            label: "stay steady in the wind",
            solvedBy: ["anchors", "supports_weight", "blocks", "shelters"],
            partialBy: ["floats", "carries_someone", "connects_places", "pushes_or_pulls"],
          },
        ],
        outcome: {
          full: "Mossy crosses home steady and dry, berries safe. The wind just blows past.",
          partial: "Mossy makes it across, wobbling a little and holding the berries tight. It worked, and it could be steadier.",
          neutral: "The wind is still strong, so Mossy waits safely for calmer weather. The berries are fine for now.",
        },
        recap: {
          full: "Mossy got home steady and dry.",
          partial: "Mossy got home, a little wobbly.",
          neutral: "Mossy waited safely for calmer weather.",
        },
      },
      {
        id: "river-3",
        title: "Peeping on the rock",
        story:
          "On the way home Mossy hears peeping. Pip the duckling is stuck on a flat rock in the middle of the water and cannot get to the shore.",
        variants: [
          {
            ifAnyPrior: ["carries_someone", "floats", "flies"],
            story:
              "On the way home Mossy hears peeping. Pip the duckling is stuck on a flat rock in the middle of the water. Your earlier idea is still nearby and might help.",
          },
          {
            ifAnyPrior: ["connects_places", "supports_weight"],
            story:
              "On the way home Mossy hears peeping. Pip the duckling is stuck on a flat rock in the middle of the water. Your earlier crossing is close to the rock.",
          },
        ],
        prompt: "Draw something that helps Pip get to the shore.",
        sceneAlt:
          "A flat rock in the middle of the river with a small yellow duckling on it. The shore is on the left. A snail waits there.",
        needs: [
          {
            id: "reach-pip",
            label: "reach Pip",
            solvedBy: ["carries_someone", "floats", "flies", "connects_places", "pushes_or_pulls"],
            partialBy: ["signals", "lights_area", "marks_path", "rolls"],
          },
          {
            id: "safe-ride",
            label: "keep Pip safe from the current",
            solvedBy: ["shelters", "anchors", "blocks", "supports_weight", "floats"],
            partialBy: ["carries_someone", "connects_places"],
          },
        ],
        outcome: {
          full: "Pip hops aboard and is soon safe on the shore. Mossy and Pip share the berries.",
          partial: "Pip is not alone any more, and help is close. Mossy and Pip wait together near the shore.",
          neutral: "Pip keeps peeping while Mossy stays close and waits for the river to calm down.",
        },
        recap: {
          full: "Pip got safely to shore.",
          partial: "Pip had company and help was close.",
          neutral: "Mossy stayed close until the river calmed.",
        },
      },
    ],
  },
  {
    id: "sprout",
    title: "The windy hill",
    goal: "Help Sprig the sprout grow through a day of changing weather.",
    hero: "Sprig",
    scenes: [
      {
        id: "sprout-1",
        title: "Wind and rain",
        story: "Sprig, a tiny sprout, grows on a hill. Strong wind and rain are coming this afternoon.",
        prompt: "Draw something that helps Sprig through the weather.",
        sceneAlt: "A grassy hill with one tiny green sprout. Grey clouds, wind swirls, and rain gather in the sky.",
        needs: [
          {
            id: "shield",
            label: "get through the weather",
            solvedBy: ["shelters", "blocks", "delivers"],
            partialBy: ["anchors", "supports_weight", "carries_someone"],
          },
        ],
        outcome: {
          full: "The wind rushes past and the rain rolls away. Sprig stays dry and upright.",
          partial: "Sprig is better off than before, though a few gusts still get through.",
          neutral: "The weather passes over the hill, and Sprig is still there afterwards.",
        },
        recap: {
          full: "Sprig stayed dry and upright.",
          partial: "Sprig was better off, with a few gusts left.",
          neutral: "Sprig came through the weather.",
        },
      },
      {
        id: "sprout-2",
        title: "Sunshine across the mud",
        story:
          "After the storm, Sprig needs sun. The sunny slope is across a muddy patch, and Sprig is too fragile to be bumped.",
        variants: [
          {
            ifAnyPrior: ["shelters", "blocks"],
            story:
              "Your first idea kept Sprig safe, but it is shady underneath. The sunny slope is across a muddy patch, and Sprig must be moved gently.",
          },
          {
            ifAnyPrior: ["anchors", "supports_weight"],
            story:
              "Your first idea holds Sprig firmly, but Sprig needs sunshine. The sunny slope is across a muddy patch, and Sprig must be moved gently.",
          },
        ],
        prompt: "Draw something that gets Sprig to the sun gently.",
        sceneAlt:
          "After the rain, a muddy brown patch lies between a shady spot on the left and a sunny slope on the right. The sprout is on the left.",
        needs: [
          {
            id: "move",
            label: "reach the sunny slope",
            solvedBy: ["carries_someone", "delivers", "rolls", "flies", "pushes_or_pulls", "connects_places"],
            partialBy: ["floats", "supports_weight"],
          },
          {
            id: "gentle",
            label: "stay safe from bumps",
            solvedBy: ["shelters", "supports_weight", "anchors", "delivers", "blocks"],
            partialBy: ["carries_someone", "floats"],
          },
        ],
        outcome: {
          full: "Sprig arrives on the sunny slope without a single bump and turns toward the light.",
          partial: "Sprig reaches the sun and feels a few bumps on the way. It is tired but happy.",
          neutral: "Sprig stays where it is while the mud dries, and soaks up a little sun.",
        },
        recap: {
          full: "Sprig reached the sun smoothly.",
          partial: "Sprig reached the sun, a bit bumped.",
          neutral: "Sprig got a little sun where it was.",
        },
      },
      {
        id: "sprout-3",
        title: "A cold, clear night",
        story: "The sun is warm now, but tonight will be clear and chilly, and the hillside soil is slippery.",
        variants: [
          {
            ifPriorLevel: "full",
            story:
              "Sprig is strong and happy in the sunny spot. Tonight will be clear and chilly, and the hillside soil is slippery.",
          },
          {
            ifPriorLevel: "partial",
            story:
              "Sprig is in the sunny spot and still a bit bumped. Tonight will be clear and chilly, and the hillside soil is slippery.",
          },
        ],
        prompt: "Draw something that helps Sprig through the night.",
        sceneAlt: "A sloping hillside at dusk with early stars. The sprout stands on a sunny patch. The soil has slippery marks.",
        needs: [
          {
            id: "warm",
            label: "stay warm",
            solvedBy: ["shelters", "blocks", "lights_area"],
            partialBy: ["anchors", "delivers"],
          },
          {
            id: "steady-soil",
            label: "stay put on the slope",
            solvedBy: ["anchors", "supports_weight"],
            partialBy: ["blocks", "shelters"],
            skipIfPrior: ["anchors"],
          },
        ],
        outcome: {
          full: "Sprig sleeps warm and steady under the stars. By morning it has a brand new leaf.",
          partial: "Sprig has a chilly night, and morning comes. It is still there, and it stands a bit taller.",
          neutral: "Sprig makes it to the morning, a little chilly and ready for a new day.",
        },
        recap: {
          full: "Sprig grew a new leaf overnight.",
          partial: "Sprig made it through a chilly night.",
          neutral: "Sprig made it to morning.",
        },
      },
    ],
  },
  {
    id: "fog",
    title: "Lights in the fog",
    goal: "Help Bix the traveler find the way home and help a friend.",
    hero: "Bix",
    scenes: [
      {
        id: "fog-1",
        title: "Lost in the mist",
        story: "Fog drifts over the meadow. Bix is walking home and cannot see which way the village is.",
        prompt: "Draw something that helps Bix find the way.",
        sceneAlt:
          "A meadow in soft fog. A small traveler stands on a path on the left. Rooftops of a village glow faintly on the right.",
        needs: [
          {
            id: "find-way",
            label: "find the way",
            solvedBy: ["lights_area", "signals", "marks_path"],
            partialBy: ["carries_someone", "flies", "connects_places", "rolls"],
          },
        ],
        outcome: {
          full: "Bix sees it through the mist and walks toward the village. The way feels clear.",
          partial: "Bix can tell which direction might be right and walks on, carefully.",
          neutral: "Bix keeps walking slowly and carefully through the mist.",
        },
        recap: {
          full: "Bix could see the way.",
          partial: "Bix found a likely direction.",
          neutral: "Bix kept going, slowly.",
        },
      },
      {
        id: "fog-2",
        title: "The fork and the gap",
        story: "Bix reaches a fork. One path ends at a gap with a trickling stream. Bix is not sure which way is the village.",
        variants: [
          {
            ifAnyPrior: ["lights_area"],
            story:
              "Your lights glow near a fork, but they do not say which way to go. One path ends at a gap with a trickling stream.",
          },
          {
            ifAnyPrior: ["marks_path", "signals"],
            story:
              "Your first idea led Bix to a fork. One path ends at a gap with a trickling stream, and the village is hidden in the mist.",
          },
        ],
        prompt: "Draw something that helps Bix choose the way and get past the gap.",
        sceneAlt:
          "The path splits in two. The right branch stops at a narrow gap with a little stream. Soft fog hangs over both branches.",
        needs: [
          {
            id: "choose",
            label: "choose the right path",
            solvedBy: ["signals", "marks_path"],
            partialBy: ["lights_area", "flies"],
            skipIfPrior: ["marks_path"],
          },
          {
            id: "gap",
            label: "get past the gap",
            solvedBy: ["connects_places", "supports_weight", "carries_someone", "flies"],
            partialBy: ["floats", "rolls"],
          },
        ],
        outcome: {
          full: "Bix picks the right path and steps over the gap. The village roofs appear through the mist.",
          partial: "Bix takes a careful step at the gap and keeps going. The village is a little closer.",
          neutral: "Bix waits at the fork, then follows the sound of the stream, one careful step at a time.",
        },
        recap: {
          full: "Bix chose well and crossed the gap.",
          partial: "Bix moved on, a little closer to the village.",
          neutral: "Bix followed the stream, carefully.",
        },
      },
      {
        id: "fog-3",
        title: "A friend behind the rock",
        story:
          "At the village gate, Bix hears a call. Rue, a small hedgehog, is stuck behind a big rock on the hill and cannot see the way down.",
        variants: [
          {
            ifAnyPrior: ["lights_area", "signals", "marks_path"],
            story:
              "At the village gate, Bix hears a call. Rue, a small hedgehog, is stuck behind a big rock on the hill. Your earlier idea could help Rue see the way down.",
          },
        ],
        prompt: "Draw something that helps Rue get down the hill.",
        sceneAlt:
          "A village gate on the right with glowing windows. A big rock on a hill on the left, with a small hedgehog behind it.",
        needs: [
          {
            id: "reach-rue",
            label: "reach Rue",
            solvedBy: ["carries_someone", "flies", "connects_places", "pushes_or_pulls", "signals", "lights_area"],
            partialBy: ["marks_path", "rolls"],
          },
          {
            id: "bring-down",
            label: "bring Rue down safely",
            solvedBy: ["carries_someone", "supports_weight", "floats", "rolls", "shelters", "delivers"],
            partialBy: ["marks_path", "connects_places", "blocks"],
          },
        ],
        outcome: {
          full: "Rue comes down the hill safe and sound, and Bix opens the village gate. Everybody is home.",
          partial: "Rue starts down the hill with Bix close by. They reach the gate slowly, side by side.",
          neutral: "Rue and Bix wait together until the fog thins.",
        },
        recap: {
          full: "Rue got home safe.",
          partial: "Rue and Bix reached the gate slowly.",
          neutral: "Rue and Bix waited out the fog together.",
        },
      },
    ],
  },
];
