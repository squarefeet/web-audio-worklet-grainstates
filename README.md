## About

This is a little experiment to see how a basic granular sampler could be implemented using the Web Audio API's Worklet node. It's very much a quick and dirty sketch, so no tests yet.

## Usage

1. Check out the repo
2. `yarn` || `npm i`
3. `yarn dev` || `npm run dev`

#### Controls

Once running, you'll see a bunch of labels and inputs. These control the granular sampler.

* `Attack`, `Hold`, and `Release` affect the envelope of each grain.
* `Spread` will increase each grain's length by a random amount each time the grain is reset.
* `Density` controls how many grains play at once, from 1 to 10. Each step in the density scale will also spread out the grains further.
* `Reverse` determines what direction the grains should play back
* `Mix` is the gain conrol ( 0 - 1 )
* `Pitch` linearly controls the pitch of the grains in 0.25% steps. It's not the most musical way of changing pitch but as a proof of concept it's fine.