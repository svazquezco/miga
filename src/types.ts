import type { AppData, Ratio } from './domain/starter';
export type Page = 'home' | 'guide' | 'assistant' | 'calculator' | 'history' | 'settings';
export interface PageProps {
  data: AppData;
  update: (data: AppData) => 'saved' | 'memory' | 'blocked';
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
