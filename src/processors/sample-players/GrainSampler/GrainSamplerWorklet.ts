import { WorkletNode } from "@/WorkletNode/WorkletNode";
import { AudioParamDescriptor } from "@/WorkletNode/types";
import GrainSamplerProcessorRaw from '@/processors/sample-players/GrainSampler/GrainSamplerProcessor?raw';

export class GrainSamplerWorklet extends WorkletNode {
    static params: AudioParamDescriptor[] = [
        {
            name: 'attack',
            defaultValue: 4000,
            minValue: 0,
            maxValue: 44100,
            automationRate: 'a-rate',
        },
        {
            name: 'hold',
            defaultValue: 7000,
            minValue: 0,
            maxValue: 44100,
            automationRate: 'a-rate',
        },
        {
            name: 'release',
            defaultValue: 6000,
            minValue: 0,
            maxValue: 44100,
            automationRate: 'a-rate',
        },

        // Grain spread
        {
            name: 'spread',
            defaultValue: 30000,
            minValue: 0,
            maxValue: 44100,
            automationRate: 'k-rate',
        },

        // Grain density
        {
            name: 'density',
            defaultValue: 10,
            minValue: 1,
            maxValue: 10,
            automationRate: 'k-rate',
        },

        {
            name: 'densityJitter',
            defaultValue: 0,
            minValue: 0,
            maxValue: 1,
            automationRate: 'k-rate',
        },

        // Grain reverse
        {
            name: 'reverse',
            defaultValue: 0,
            minValue: 0,
            maxValue: 1,
            automationRate: 'k-rate',
        },

        {
            name: 'freeze',
            defaultValue: 0,
            minValue: 0,
            maxValue: 1,
            automationRate: 'k-rate',
        },

        {
            name: 'mix',
            defaultValue: 0.3,
            minValue: 0,
            maxValue: 1,
            automationRate: 'a-rate',
        },

        {
            name: 'travel',
            defaultValue: 1,
            minValue: 0.25,
            maxValue: 3,
            automationRate: 'a-rate',
        },

        {
            name: 'playbackPosition',
            defaultValue: 0,
            minValue: 0,
            maxValue: 1,
            automationRate: 'k-rate',
        },
    ];

    buffer: AudioBuffer;

    constructor( context: BaseAudioContext, buffer: AudioBuffer ) {
        super( context, 1, 1 );

        this.buffer = buffer;
    }

    static _getWorkletProcessor(): string {
        return GrainSamplerProcessorRaw.toString();
    }

    public onInitialised(): void {
        const audioBuffers = [];

        for( let i = 0; i < this.buffer.numberOfChannels; ++i ) {
            audioBuffers.push( this.buffer.getChannelData( i ).buffer );
        }

        this.workletNode.port.postMessage( audioBuffers, audioBuffers );
    }
}
