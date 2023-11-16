let GLOBAL_AUDIO_CONTEXT: BaseAudioContext;

export function getGlobalAudioContext(): BaseAudioContext {
    console.trace();
    
    if( !GLOBAL_AUDIO_CONTEXT ) {
        GLOBAL_AUDIO_CONTEXT = new AudioContext();
    }

    return GLOBAL_AUDIO_CONTEXT;
}