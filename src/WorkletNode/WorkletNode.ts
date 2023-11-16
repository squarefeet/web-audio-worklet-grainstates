import { AudioParamDescriptor } from "./types";
import { hasLoadedWorkletProcessor, storeLoadedWorkletProcessor } from "./worklet-store";

export class WorkletNode {
    static params: AudioParamDescriptor[] = [];

    static _getWorkletParamsAsJSON(): string {
        return JSON.stringify(this.params);
    }

    static _getWorkletProcessorClassName(): string {
        return this.name + 'Processor';
    }

    // TODO:
    // - Transform _getWorkletProcessorClassName() to hyphen case
    //   to adhere to convention.
    static _getWorkletProcessorName(): string {
        return this.name + 'Processor';
    }

    static _getWorkletProcessor(): string {
        const workletClassName = this._getWorkletProcessorClassName();

        return `
            class ${workletClassName} extends AudioWorkletProcessor {
                static get parameterDescriptors() {
                    return ${this._getWorkletParamsAsJSON()};
                }

                constructor() {
                    super();
                    this.workletConstructor();
                }

                ${this.workletConstructor.toString()}

                ${this._getParameterValue.toString()}

                ${this.process.toString()}
            }

            registerProcessor('${this._getWorkletProcessorName()}', ${workletClassName});
        `;
    }

    static workletConstructor() {}

    // Note:
    //  A parameter contains an array of 128 values (one value for each of 128 samples),
    //  however it may contain a single value which is to be used for all 128 samples
    //  if no automation is scheduled for the moment.
    static _getParameterValue(params: Record<string, Float32Array>, paramName: string, index: number): number {
        const param = params[paramName];

        return param.length > 1 ?
            param[index] :
            param[0];
    }

    // Whatever this function contains will be used as the worker's `process` method.
    // Designed to be overridden by sub-classes.
    static process(
        _inputs: Float32Array[][],
        _outputs: Float32Array[][],
        _parameters: Record<string, Float32Array>
    ): boolean {
        return false;
    }

    // Instance properties...
    context: BaseAudioContext;
    workletNode!: AudioWorkletNode;
    _connectionStore: Map<AudioNode, (number | undefined)[]> = new Map();
    _initialised: Boolean = false;

    workletNodeOptions: AudioWorkletNodeOptions = {
        numberOfInputs: 1,
        numberOfOutputs: 1,
    };

    constructor(context: BaseAudioContext, numberOfInputs: number = 1, numberOfOutputs: number = 1) {
        this.context = context;
        this.numberOfInputs = numberOfInputs;
        this.numberOfOutputs = numberOfOutputs;
    }

    get numberOfInputs(): number {
        return this.workletNodeOptions.numberOfInputs as number;
    }
    set numberOfInputs(count: number) {
        this.workletNodeOptions.numberOfInputs = count;
        
        if( this.workletNode ) {
            this._generateAudioWorkletNode();
        }
    }

    get numberOfOutputs(): number {
        return this.workletNodeOptions.numberOfOutputs as number;
    }
    set numberOfOutputs(count: number) {
        this.workletNodeOptions.numberOfOutputs = count;

        if( this.workletNode ) {
            this._generateAudioWorkletNode();
        }
    }

    protected _getConstructor(): typeof WorkletNode {
        return (this.constructor as typeof WorkletNode);
    }

    protected _generateAudioWorkletNode(): AudioWorkletNode {
        const node = new AudioWorkletNode(
            this.context,
            this._getConstructor()._getWorkletProcessorName(),
            this.workletNodeOptions
        );

        this._restoreConnections();

        return node;
    }

    private _restoreConnections(): void {
        [...this._connectionStore.entries()].forEach(entry => {
            const targetNode = entry[ 0 ];
            const ports = entry[ 1 ];
            this.connect(targetNode, ports[0], ports[1]);
        });
    }

    /**
     * Unfortunately, this is initialiser is rather necessary.
     * 
     * Since workers have to be registered before an AudioWorkletNode
     * can be created (by calling `audioContext.audioWorklet.addModule(...)`)
     * the register process is asynchronous, and we're essentially making dynamic
     * workers by using stringified constructors[1], we cannot extend
     * AudioWorkletNode[2].
     * 
     * This also means that the AudioWorkletNode instance is accessible via a
     * property of an instance of this class. It makes calls to
     * `AudioNode.prototype.connect` a bit crappy looking, which _could_ be
     * solved by overriding `AudioNode.prototype.connect` but I'm rather loathe
     * to do that.
     * 
     * So, until a better solution is found, every time a WorkletNode is instantiated
     * it will also need it's `initialise` method called asynchronously, too.
     * 
     * TODO:
     * Although, it would technically only need calling once per sub-class, since
     * by the time a second particular sub-class was instantiated, the registry
     * will already have the worker present... Maybe this is something I can work
     * with...
     * 
     * [1]. This was a design decision. Having separate files loaded by
     *      the audio worker registry is not something that fit with how I wanted
     *      this project to be packaged. I didn't want users to have to faff about
     *      with loading workers from a pre-set path, making sure they were available
     *      and would load correctly. By generating workers using stringified classes,
     *      this is all avoided.
     * 
     * [2]. Extending AudioWorkletNode is the holy grail; it's the way I would
     *      like to architect this project. However, I cannot find a way to reliably
     *      register a worker (an async operation) before calling `super()` in a
     *      sub-class of AudioWorkletNode. Various potential solutions have been tried
     *      but none have proved reliable, and still require the use of at least one async
     *      call _somewhere_, which I wanted to avoid.
     *      
     *      The most promising was to register the worker after the sub-class had been
     *      declared, within the same file as the sub-class declaration. The downside to
     *      this, though, is that the worker registry belongs to an instance of
     *      BaseAudioContext, which while possible, means the audioContext needs to be
     *      globally available, and created _before_ the sub-class is imported (before
     *      its instantiated). A global audioContext means that there's only ever one
     *      context available per-session. I can foresee in the future needing an
     *      OfflineAudioContext for rendering to exist alongside the session's
     *      audioContext.
     *  
     *      Other attempts included trying to register the worker before super
     *      was called within the sub-class's constructor itself; but this obviously
     *      won't work; the `addModule` call _needs_ to be asynchronous, even with
     *      a stringified worker class (where no loading over-the-network is happening).
     */
    public async initialise(): Promise<void> {
        if( this._initialised ) {
            return;
        }
        
        const workletName = this._getConstructor()._getWorkletProcessorName();

        if (!hasLoadedWorkletProcessor(workletName)) {
            // Create a blob holding the stringified definition
            // for the audio worklet
            const blob = new Blob(
                [this._getConstructor()._getWorkletProcessor()],
                { type: 'application/javascript' }
            );

            // Await adding this worklet to the audio worker registry
            await this.context.audioWorklet.addModule(URL.createObjectURL(blob));

            // Store the created worker's name so we don't accidentally
            // try to register it again.
            storeLoadedWorkletProcessor(workletName);
        }

        // Now that there is definitely a worker available, the
        // AudioWorkletNode can be created
        this.workletNode = this._generateAudioWorkletNode();

        this._initialised = true;

        this.onInitialised();
    }

    public onInitialised(): void {}

    // Hopefully-handy proxy methods for connect and disconnect
    public connect(targetNode: AudioNode, output?: number, input?: number): void {
        this.workletNode.connect(targetNode, output, input);
        this._connectionStore.set(targetNode, [output, input]);
    }

    public disconnect(targetNode: AudioNode): void {
        this.workletNode.disconnect(targetNode);
        this._connectionStore.delete(targetNode);
    }

    public getParam(customParamName: string): AudioParam | undefined {
        return (this.workletNode?.parameters as unknown as Map<string, AudioParam>).get(customParamName);
    }

    public setParamValueAtTime(customParamName: string, value: number, when: number = this.context.currentTime): void {
        const param = this.getParam(customParamName);

        if (param) {
            param.setValueAtTime(value, when);

            // TODO:
            // - Add delegates for all of these, too.
            //
            // param.cancelAndHoldAtTime
            // param.cancelScheduledValues
            // param.exponentialRampToValueAtTime
            // param.setTargetAtTime
            // param.setValueAtTime
            // param.setValueCurveAtTime
        }
    }

    public enable() {
        this.workletNode?.port.postMessage({ active: true });
    }

    public disable() {
        this.workletNode?.port.postMessage({ active: false });
    }
}