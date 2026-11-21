import type { AppData, JournalChange, Ratio } from './domain/starter';
import type { SaveResult } from './storage/local';
export type Page = 'home' | 'guide' | 'assistant' | 'calculator' | 'history' | 'settings';
export interface PageProps {
  data: AppData;
  update: (change: JournalChange) => Promise<SaveResult>;
  navigate: (page: Page) => void;
  notify: (message: string) => void;
}
export interface FeedRequest {
  ratio: Ratio;
  starterG: number;
  waterG: number;
  flourG: number;
  bakingStarterActive?: boolean;
  recoveryStage?: 'start' | 'feed';
}
