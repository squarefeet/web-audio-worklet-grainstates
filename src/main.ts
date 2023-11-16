import './style.css';
import { GrainSamplerWorklet } from '@/processors/sample-players/GrainSampler/GrainSamplerWorklet';
import { loadSound } from '@/utils/xhr-utils';

let audioContext: AudioContext;

document.querySelector('#start')?.addEventListener('click', () => start());

async function start() {
	audioContext = audioContext || new AudioContext();

	const delay = new DelayNode( audioContext, {
		delayTime: 0.25,
	} );

	const feedbackGain = new GainNode( audioContext );
	feedbackGain.gain.value = 0.20;
	delay.connect( feedbackGain );
	feedbackGain.connect( delay );

	const sampleBuffer = await loadSound(audioContext, 'src/audio-samples/guitar.mp3');
	const testWorklet = new GrainSamplerWorklet(audioContext, sampleBuffer);

	await testWorklet.initialise();

	testWorklet.workletNode.connect( audioContext.destination );
	testWorklet.workletNode.connect( delay );
	delay.connect( audioContext.destination );

	Object.values(GrainSamplerWorklet.params).forEach(param => {
		const input = document.querySelector(`#${param.name}-input`) as HTMLInputElement;

		if( !input ) {
			return;
		}

		if (input.type === 'range') {
			input.min = (param.minValue as number).toString();
			input.max = (param.maxValue as number).toString();
			input.value = (param.defaultValue as number).toString();

			input.addEventListener('input', () => {
				console.log(`${param.name} value:`, input.value);

				testWorklet.setParamValueAtTime(
					param.name,
					parseFloat(input.value),
					audioContext.currentTime
				);
			});
		}
		else if (input.type === 'checkbox') {
			input.value = (param.defaultValue as number).toString();

			input.addEventListener('input', () => {
				console.log(`${param.name} value:`, input.checked);

				testWorklet.setParamValueAtTime(
					param.name,
					Number(input.checked),
					audioContext.currentTime
				);
			});
		}
	});

	// Automatically increment the playback position while active...
	const playbackPosition = document.querySelector( '#playbackPosition-input' ) as HTMLInputElement;

	function tick( time: DOMHighResTimeStamp ): void {
		const t = ( time * 0.00001 ) % 1;
		playbackPosition.value = t.toString();

		testWorklet.setParamValueAtTime(
			'playbackPosition',
			t,
			audioContext.currentTime
		);

		requestAnimationFrame( tick );
	}

	requestAnimationFrame( tick );
}
