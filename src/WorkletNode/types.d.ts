export interface AudioParamDescriptor {
    name: string;
    defaultValue: number;
    minValue?: number;
    maxValue?: number;
    automationRate: 'a-rate' | 'k-rate';
}