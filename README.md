## About

This is a little experiment to see how a basic granular sampler could be implemented using the Web Audio API's Worklet node. It's very much a quick and dirty sketch, so no tests yet.

## Usage

1. Check out the repo
2. `yarn` or `npm i`
3. `yarn dev` or `npm run dev`

#### Controls

Once running, you'll see a bunch of labels and inputs. These control the granular sampler.

* `Attack`, `Hold`, and `Release` affect the envelope of each grain.
* `Spread` will increase each grain's length by a random amount each time the grain is reset.
* `Density` controls how many grains play at once, from 1 to 10. Each step in the density scale will also spread out the grains further.
* `Reverse` determines what direction the grains should play back
* `Mix` is the gain control ( 0 - 1 )
* `Pitch` linearly controls the pitch of the grains in 0.25% steps. It's not the most musical way of changing pitch but as a proof of concept it's fine.


## What?!

An audio file is basically a big list of numbers (well, technically one list per channel, so two for stereo). Each one of those numbers is a _sample_. If you were to draw these numbers on a graph and zoom way out, you'd see a waveform.

Okay, so we know we have a big list of numbers and those numbers represent sound. We'll refer to these as _buffers_ from now on. A single _grain_, then, is a little window into these buffers. Like slicing an array would give you a selection of its data, so the same goes for a grain.

However, if we were to slice up our audio into grains and store them all, we'd run the risk of using up a lot more memory than we needed to. It could also take a while to do the slicing given that audio buffers can be rather large indeed (often millions of numbers). Instead, what if we used a _window_?

A window is basically the same thing as slicing a chunk out of our audio buffer, but instead of actually doing it, it just describes the _start index_ and either the _end index_ or the _window length_. Using these two values, we can just take a peek into our audio buffer at the _start index_ without having to copy the data. So, a grain, in this implementation at least, is an object describing a window into our buffer, but it doesn't contain any data itself, just where it should look. If you're curious what each one of these grain objects actually looks like, [see here](https://github.com/squarefeet/web-audio-worklet-grainstates/blob/main/src/processors/sample-players/GrainSampler/GrainSamplerProcessor.js#L111).

Great. We have grains. Now what? Well, it'd be pretty fatiguing on the ears if we just played a single grain (a very short slice of audio) over and over again. Remember what a CD sounds like when it skips? Well it's like that, but infinitely more headache-inducing. So instead, we _spread_ out the grains across say, one second, and then play them back. The variation causes a smearing effect which is much more pleasing to the ears. This is what the `spread` control does. We can also play back multiple grains at once to add to this smearing effect, with each one spread out even further. The `density` control allows you to control how many grains are playing back at once (1 - 10).

There's a bit more to it than that, but they're the basics.
