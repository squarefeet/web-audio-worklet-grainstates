export const workletStore: string[] = [];

export function hasLoadedWorkletProcessor( processorName: string ): boolean {
    return workletStore.includes( processorName );
}

export function storeLoadedWorkletProcessor( processorName: string ): boolean {
    workletStore.push( processorName );
}

export function clearLoadedWorkletProcessors(): boolean {
    workletStore.length = 0;

    return workletStore.length === 0;
}