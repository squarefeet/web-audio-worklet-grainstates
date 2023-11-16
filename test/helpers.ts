export function generateConstantSignal(context: BaseAudioContext, value: number): AudioBufferSourceNode {
    const buffer = context.createBuffer(2, 1024, context.sampleRate),
        bufferSource = context.createBufferSource();

    for( let c = 0; c < buffer.numberOfChannels; ++c ) {
        const data = buffer.getChannelData( c );

        for (let i = 0; i < data.length; ++i) {
            data[i] = value;
        }
    }

    bufferSource.buffer = buffer;
    bufferSource.loop = true;
    bufferSource.start();

    return bufferSource;
}