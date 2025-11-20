export interface DesignStyle {
  id: string;
  label: string;
  description: string;
  color: string;
}

export interface FurnitureItem {
  itemName: string;
  color: string;
  searchQuery: string;
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  MINING = 'MINING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export interface ProcessingState {
  status: AppState;
  message?: string;
}

export type DesignMode = 'MAKEOVER' | 'PARTIAL';