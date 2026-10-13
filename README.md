# Nepali Land Converter

Convert Nepali land units (Ropani · Aana · Paisa · Daam and Bigha · Kattha · Dhur) to square feet, square metres, acres and hectares. The page also shows how big the area actually is.

- **Converter**: type into any system and the others update as you go. Fields accept partial input and have press-and-hold steppers and arrow-key stepping. A "Tidy up" hint appears for values like 20 Aana, and you can share a link to the current area.
- **Sense of scale**: draws the area as a square plot to scale next to a familiar reference (a parking space, badminton, tennis or basketball court, or a football pitch), with its side length and the length of a wall around it.
- **Unit anatomy**: shows how each unit nests inside the next and fills in the area you entered.
- **Quick reference**: one of each unit, with every figure calculated by the same engine.

## Conversion standards

All areas are stored as square feet. Each unit is defined by its exact square-foot value, and 1 ft = 0.3048 m exactly.

| Unit   | ft²         | Shape            |
| ------ | ----------- | ---------------- |
| Ropani | 5,476       | 74 × 74 ft       |
| Aana   | 342.25      | 18.5 × 18.5 ft   |
| Paisa  | 85.5625     | 9.25 × 9.25 ft   |
| Daam   | 21.390625   | 4.625 × 4.625 ft |
| Bigha  | 72,900      | 270 × 270 ft     |
| Kattha | 3,645       | 67.5 × 54 ft     |
| Dhur   | 182.25      | 13.5 × 13.5 ft   |

The engine lives in `lib/land.ts`, and `lib/land.test.ts` covers it. Results are for planning and comparison. Your Lalpurja and the Survey Office measurement are the legal record.

## Development

```bash
yarn install
yarn dev        # http://localhost:3000
yarn test       # conversion tests
yarn lint
yarn typecheck
yarn build
```

Built with Next.js (Pages Router), React, TypeScript and [Motion](https://motion.dev). Motion respects the system's reduced-motion setting.
