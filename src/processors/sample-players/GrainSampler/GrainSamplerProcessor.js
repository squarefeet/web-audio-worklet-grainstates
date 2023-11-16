class GrainSamplerWorkletProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
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
    }

    constructor() {
        super();

        // Global sampleCount;
        this.globalSampleIndex = 0;

        // `sampleBuffers` will be set by postMessage
        this.sampleBuffers = [];
        this.sampleBufferLength = 0;
        this.grains = [];
        this.grainsCount = 10;

        const grainLength = this.getGrainDefaultLength();

        for( let i = 0; i < this.grainsCount; ++i ) {
            this.grains[ i ] = [
                {
                    offset: Math.floor( ( 44100 / this.grainsCount ) * i ),
                    position: 0,
                    playbackPosition: 0,
                    length: grainLength,
                    smear: 0,
                },
                {
                    offset: Math.floor( ( 44100 / this.grainsCount ) * i ),
                    position: 0,
                    playbackPosition: 0,
                    length: grainLength,
                    smear: 0,
                },
            ];
        }

        this.port.onmessage = messageEvent => {
            messageEvent.data.forEach( ( buffer, index ) => {
                this.sampleBuffers[ index ] = new Float32Array( buffer ); 
            } );

            this.sampleBufferLength = this.sampleBuffers[ 0 ].length;

            console.log( this.sampleBuffers );
        };
    }

    getGrainDefaultLength() {
        return (
            this.getParamDefaultValue( 'attack' ) +
            this.getParamDefaultValue( 'hold' ) + 
            this.getParamDefaultValue( 'release' )
        );
    }

    getGrainLength( parameters, sampleIndex ) {
        return (
            this.getParameterValue( parameters, 'attack', sampleIndex ) +
            this.getParameterValue( parameters, 'hold', sampleIndex ) + 
            this.getParameterValue( parameters, 'release', sampleIndex )
        );
    }

    getParamDescriptor( paramName ) {
        return this.constructor.parameterDescriptors.find( d => {
            return d.name === paramName;
        } );
    }

    getParamDefaultValue( paramName ) {
        return this.getParamDescriptor( paramName ).defaultValue;
    }

    getParamMaxValue( paramName ) {
        return this.getParamDescriptor( paramName ).maxValue;
    }

    getParameterValue(params, paramName, index) {
        const param = params[paramName];

        return param.length > 1 ?
            param[index] :
            param[0];
    }

    calculateGainForSampleIndex( grainSampleIndex, parameters, sampleIndex ) {
        const attackTime = this.getParameterValue( parameters, 'attack', sampleIndex );
        const holdTime = this.getParameterValue( parameters, 'hold', sampleIndex );
        const releaseTime = this.getParameterValue( parameters, 'release', sampleIndex );
        const mix = this.getParameterValue( parameters, 'mix', sampleIndex );

        let index = grainSampleIndex;

        if( index < attackTime ) {
            return ( index / attackTime ) * mix;
        }

        index -= attackTime;

        if( index <= holdTime ) {
            return 1 * mix;
        }

        index -= holdTime;

        if( index <= releaseTime ) {
            return ( 1 - ( index / releaseTime ) ) * mix;
        }

        return 0;
    }

    playGrain( grain, channelIndex, outputChannel, sampleIndex, parameters ) {
        const grainChannel = grain[ channelIndex ];

        // Calculate where in the sample buffer this grain currently is.
        const sampleBufferIndex = Math.round(
            grainChannel.position +
            grainChannel.playbackPosition +
            grainChannel.offset +
            grainChannel.smear
        );
        
        // Use the above index to fetch the sample value (an audio sample) from the sample buffer(s)
        const sampleValue = this.sampleBuffers[ channelIndex ][ sampleBufferIndex % this.sampleBufferLength ];

        // Calculate the gain
        const gain = this.calculateGainForSampleIndex( grainChannel.position, parameters, sampleIndex );
        const reverse = this.getParameterValue( parameters, 'reverse', sampleIndex );
        const travel = this.getParameterValue( parameters, 'travel', sampleIndex );
        
        // Write the sample value to the output channel
        outputChannel[ sampleIndex ] += sampleValue * gain;

        // Now that the sample has been written, the grain's position can be moved
        // either forwards or backwards, depending on the direction (reverse or not)
        // and travel multiplier.
        if( reverse ) {
            grainChannel.position -= travel;

            if( grainChannel.position < 0 ) {
                grainChannel.position = grainChannel.length - 1;
            }
        }
        else {
            grainChannel.position += travel;
        }

        // If the grain's position has hit its limit, reset it.
        if( grainChannel.position >= grainChannel.length || grainChannel.position === 0 ) {
            // Use the attack, hold, and release values to calculate a new length.
            grainChannel.length = this.getGrainLength( parameters, sampleIndex );

            // Set new starting position
            grainChannel.position = reverse ? grainChannel.length - 1 : 0; 
            
            // Calculate a new smear value
            const smearValue = Math.random() * this.getParameterValue( parameters, 'spread', sampleIndex );
            
            // Reset both channels
            const pos = this.getParameterValue( parameters, 'playbackPosition', sampleIndex );
            for( let i = 0, il = grain.length; i < il; ++i ) {
                grain[ i ].position = 0;
                grain[ i ].playbackPosition = Math.round( pos * this.sampleBufferLength );
                grain[ i ].smear = Math.floor( smearValue );
            }
        }
    }

    process(inputs, outputs, parameters) {
        const outputPort = outputs[0];
        const numOutputChannels = outputPort.length;

        for (let channelIndex = 0; channelIndex < numOutputChannels; ++channelIndex) {
            const sampleBufferChannel = this.sampleBuffers[ channelIndex ];
            const outputChannel = outputPort[channelIndex];
            const sampleCount = outputChannel.length;

            for (let sampleIndex = 0; sampleIndex < sampleCount; ++sampleIndex) {
                outputChannel[ sampleIndex ] = 0;

                const density = this.getParameterValue( parameters, 'density', sampleIndex );

                for( let i = 0; i < density; ++i ) {
                    this.playGrain(
                        this.grains[ i ],
                        channelIndex,
                        outputChannel,
                        sampleIndex,
                        parameters
                    );
                }
            }
        }

        this.globalSampleIndex = currentFrame;
        
        return true;
    }
}

registerProcessor('GrainSamplerWorkletProcessor', GrainSamplerWorkletProcessor);