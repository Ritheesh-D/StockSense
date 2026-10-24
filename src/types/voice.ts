// src/types/voice.ts
import { Product } from './index';

export type VoiceAssistantState = 
  | 'idle' 
  | 'listening' 
  | 'processing' 
  | 'speaking' 
  | 'completed' 
  | 'error';

export type VoiceIntent =
  | 'inventory_status'
  | 'low_stock'
  | 'overstock'
  | 'critical_items'
  | 'health_score'
  | 'risk_matrix'
  | 'highest_stock_category'
  | 'search_product'
  | 'add_product'
  | 'open_dashboard'
  | 'open_inventory'
  | 'open_analytics'
  | 'open_pos'
  | 'open_recommendations'
  | 'open_settings'
  | 'import_csv'
  | 'export_csv'
  | 'help'
  | 'unknown';

export interface VoiceActionItem {
  id: string;
  label: string;
  action: () => void;
  primary?: boolean;
}

export interface VoiceCommandResult {
  id: string;
  timestamp: string;
  transcript: string;
  spokenResponse: string;
  intent: VoiceIntent;
  summaryText?: string;
  suggestedActions: VoiceActionItem[];
  matchedProducts?: Product[];
}
