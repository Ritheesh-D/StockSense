// src/services/voiceAssistantService.ts
// Production-ready Voice Assistant Engine for StockSense AI (English ONLY)

import { Product, Invoice, ReturnRecord, StoreSettings } from '../types';
import { VoiceIntent, VoiceCommandResult, VoiceActionItem } from '../types/voice';
import { HealthIntelligenceService } from './healthIntelligenceService';

export interface VoiceServiceContext {
  products: Product[];
  invoices: Invoice[];
  returns: ReturnRecord[];
  settings: StoreSettings;
  navigateTab: (tab: any) => void;
  openAddProduct: () => void;
  openImportCsv: () => void;
  exportCsv: () => void;
}

export class VoiceAssistantService {
  private static recognition: any = null;
  private static isListening: boolean = false;
  private static speechSynth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;

  /**
   * Check if Web Speech Recognition is supported in the current browser
   */
  static isRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Check if Speech Synthesis is supported in the current browser
   */
  static isSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  }

  /**
   * Initialize speech recognition instance (English US ONLY)
   */
  private static getRecognitionInstance(): any {
    if (this.recognition) return this.recognition;
    if (typeof window === 'undefined') return null;

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return null;

    const rec = new SpeechRecognitionClass();
    rec.lang = 'en-US'; // English ONLY
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    this.recognition = rec;
    return rec;
  }

  /**
   * Start listening for voice input
   */
  static startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (errorMessage: string) => void,
    onEnd: () => void
  ): boolean {
    const rec = this.getRecognitionInstance();
    if (!rec) {
      onError('Speech Recognition is not supported by your browser. Please use Google Chrome, Edge, or Safari, or click one of the suggested voice queries.');
      return false;
    }

    try {
      this.stopSpeaking();

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const activeText = finalTranscript || interimTranscript;
        onResult(activeText, !!finalTranscript);
      };

      rec.onerror = (event: any) => {
        this.isListening = false;
        let msg = 'Voice recognition error';
        if (event.error === 'not-allowed') {
          msg = 'Microphone permission was denied. Please allow microphone access or tap one of the suggested voice queries below.';
        } else if (event.error === 'no-speech') {
          msg = 'No speech detected. Please speak clearly into your microphone.';
        } else if (event.error === 'network') {
          msg = 'Network issue connecting to speech recognition service.';
        }
        onError(msg);
      };

      rec.onend = () => {
        this.isListening = false;
        onEnd();
      };

      rec.start();
      this.isListening = true;
      return true;
    } catch (err: any) {
      this.isListening = false;
      onError(err?.message || 'Could not access microphone.');
      return false;
    }
  }

  /**
   * Stop speech recognition
   */
  static stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isListening = false;
    }
  }

  /**
   * Speak response naturally using English SpeechSynthesis
   */
  static speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (!this.isSynthesisSupported()) {
      if (onEnd) onEnd();
      return;
    }

    try {
      this.stopSpeaking();

      // Clean markdown symbols for natural speech
      const plainText = text
        .replace(/[#*_`~[\]]/g, '')
        .replace(/₹/g, 'Rupees ')
        .replace(/\s+/g, ' ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.lang = 'en-US'; // English ONLY
      utterance.rate = 1.05; // Slightly upbeat, modern SaaS assistant tempo
      utterance.pitch = 1.0;

      // Select best natural English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('US') || v.name.includes('Jenny'))
      ) || voices.find(v => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      if (onEnd) onEnd();
    }
  }

  /**
   * Stop any current speech playback
   */
  static stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      this.currentUtterance = null;
    }
  }

  /**
   * Parse natural language command and formulate business intelligence response
   */
  static processCommand(transcript: string, ctx: VoiceServiceContext): VoiceCommandResult {
    const raw = transcript.trim().toLowerCase();
    const id = `voice-cmd-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Compute live health metrics
    const { metrics, analyses, recommendations } = HealthIntelligenceService.calculateOverallMetrics(
      ctx.products,
      ctx.invoices,
      ctx.returns
    );

    // 1. Management: Add product
    if (raw.includes('add product') || raw.includes('add a product') || raw.includes('new product') || raw.includes('create product')) {
      ctx.openAddProduct();
      return {
        id,
        timestamp,
        transcript,
        intent: 'add_product',
        spokenResponse: 'Opening the new product entry form with health threshold settings.',
        summaryText: 'Product Entry Sheet Activated',
        suggestedActions: [
          {
            id: 'act-add',
            label: 'Fill Product Form',
            primary: true,
            action: () => ctx.openAddProduct()
          }
        ]
      };
    }

    // 2. Navigation: Open Analytics
    if (raw.includes('open analytics') || raw.includes('show analytics') || raw.includes('go to analytics') || raw.includes('analytics view')) {
      ctx.navigateTab('forecast');
      return {
        id,
        timestamp,
        transcript,
        intent: 'open_analytics',
        spokenResponse: 'Opening Inventory Intelligence Analytics and Stock Risk Matrix.',
        summaryText: 'Switched to Analytics View',
        suggestedActions: [
          {
            id: 'act-view-matrix',
            label: 'Explore Risk Matrix',
            primary: true,
            action: () => ctx.navigateTab('forecast')
          }
        ]
      };
    }

    // 3. Navigation: Open Dashboard
    if (raw.includes('open dashboard') || raw.includes('go to dashboard') || raw.includes('show dashboard') || raw.includes('home')) {
      ctx.navigateTab('overview');
      return {
        id,
        timestamp,
        transcript,
        intent: 'open_dashboard',
        spokenResponse: 'Opening your primary inventory intelligence dashboard.',
        summaryText: 'Switched to Dashboard View',
        suggestedActions: [
          {
            id: 'act-dash',
            label: 'View Dashboard',
            primary: true,
            action: () => ctx.navigateTab('overview')
          }
        ]
      };
    }

    // 4. Navigation: Open Inventory
    if (raw.includes('open inventory') || raw.includes('show inventory') || raw.includes('go to inventory') || raw.includes('inventory section') || raw.includes('product list')) {
      ctx.navigateTab('inventory');
      return {
        id,
        timestamp,
        transcript,
        intent: 'open_inventory',
        spokenResponse: `Navigating to inventory catalog with ${ctx.products.length} registered SKUs.`,
        summaryText: 'Switched to Inventory Catalog',
        suggestedActions: [
          {
            id: 'act-inv',
            label: 'Manage Products',
            primary: true,
            action: () => ctx.navigateTab('inventory')
          }
        ]
      };
    }

    // 5. Navigation: Open POS / Billing
    if (raw.includes('open pos') || raw.includes('open billing') || raw.includes('start billing') || raw.includes('pos terminal') || raw.includes('checkout')) {
      ctx.navigateTab('billing');
      return {
        id,
        timestamp,
        transcript,
        intent: 'open_pos',
        spokenResponse: 'Opening POS billing counter for rapid barcode checkout.',
        summaryText: 'Switched to POS Terminal',
        suggestedActions: [
          {
            id: 'act-pos',
            label: 'Open Billing Counter',
            primary: true,
            action: () => ctx.navigateTab('billing')
          }
        ]
      };
    }

    // 6. CSV Commands: Import
    if (raw.includes('import') || raw.includes('upload csv') || raw.includes('import csv') || raw.includes('import inventory')) {
      ctx.openImportCsv();
      return {
        id,
        timestamp,
        transcript,
        intent: 'import_csv',
        spokenResponse: 'Opening the CSV catalog import modal with duplicate detection.',
        summaryText: 'CSV Import Ready',
        suggestedActions: [
          {
            id: 'act-import',
            label: 'Upload CSV File',
            primary: true,
            action: () => ctx.openImportCsv()
          }
        ]
      };
    }

    // 7. CSV Commands: Export
    if (raw.includes('export') || raw.includes('download csv') || raw.includes('export csv') || raw.includes('export report')) {
      ctx.exportCsv();
      return {
        id,
        timestamp,
        transcript,
        intent: 'export_csv',
        spokenResponse: 'Exporting your current inventory catalog and stock metrics to a CSV spreadsheet.',
        summaryText: 'Inventory CSV Exported',
        suggestedActions: [
          {
            id: 'act-export',
            label: 'Download Again',
            primary: true,
            action: () => ctx.exportCsv()
          }
        ]
      };
    }

    // 8. Inventory Query: Low stock / restocking
    if (
      raw.includes('low stock') || 
      raw.includes('restock') || 
      raw.includes('replenish') || 
      raw.includes('running out') || 
      raw.includes('run out')
    ) {
      const lowStockItems = analyses.filter(a => a.healthStatus === 'UNDERSTOCK' || a.healthStatus === 'CRITICAL');
      const count = lowStockItems.length;

      let spoken = '';
      if (count === 0) {
        spoken = 'All products are currently well stocked above minimum safety thresholds.';
      } else if (count === 1) {
        spoken = `One product, ${lowStockItems[0].name}, is below minimum stock level and requires restocking.`;
      } else {
        const topNames = lowStockItems.slice(0, 2).map(i => i.name).join(' and ');
        spoken = `${count} products are currently below minimum stock levels, including ${topNames}.`;
      }

      return {
        id,
        timestamp,
        transcript,
        intent: 'low_stock',
        spokenResponse: spoken,
        summaryText: `${count} Products Require Replenishment`,
        suggestedActions: [
          {
            id: 'act-view-low',
            label: 'View Low Stock Items',
            primary: true,
            action: () => ctx.navigateTab('inventory')
          },
          {
            id: 'act-plan-reorder',
            label: 'Open Reorder Planner',
            action: () => ctx.navigateTab('reorder')
          }
        ],
        matchedProducts: ctx.products.filter(p => lowStockItems.some(l => l.productId === p.id))
      };
    }

    // 9. Inventory Query: Critical / high stockout risk
    if (raw.includes('critical') || raw.includes('stockout') || raw.includes('out of stock') || raw.includes('zero stock')) {
      const criticalItems = analyses.filter(a => a.healthStatus === 'CRITICAL');
      const count = criticalItems.length;

      let spoken = '';
      if (count === 0) {
        spoken = 'There are zero critical stockouts right now. Your inventory coverage is secure.';
      } else {
        const itemNames = criticalItems.slice(0, 2).map(i => i.name).join(' and ');
        spoken = `${count} products have high stockout risk with under 3 days of coverage. Immediate action recommended for ${itemNames}.`;
      }

      return {
        id,
        timestamp,
        transcript,
        intent: 'critical_items',
        spokenResponse: spoken,
        summaryText: `${count} Critical Stockout Vulnerabilities`,
        suggestedActions: [
          {
            id: 'act-critical',
            label: 'View Priority Reorder List',
            primary: true,
            action: () => ctx.navigateTab('overview')
          },
          {
            id: 'act-po',
            label: 'Create Emergency PO',
            action: () => ctx.navigateTab('reorder')
          }
        ],
        matchedProducts: ctx.products.filter(p => criticalItems.some(c => c.productId === p.id))
      };
    }

    // 10. Inventory Query: Overstocked products
    if (raw.includes('overstock') || raw.includes('excess stock') || raw.includes('too much stock')) {
      const overstockItems = analyses.filter(a => a.healthStatus === 'OVERSTOCK');
      const count = overstockItems.length;
      const capitalTied = metrics.capitalTiedInOverstock;

      let spoken = '';
      if (count === 0) {
        spoken = 'No products are currently overstocked. Inventory buffer limits are well maintained.';
      } else {
        const topOver = overstockItems[0];
        spoken = `${count} products are overstocked, with approximately ${ctx.settings.currencySymbol || 'Rupees '}${capitalTied.toLocaleString()} tied up in idle inventory. ${topOver.name} has the largest excess buffer.`;
      }

      return {
        id,
        timestamp,
        transcript,
        intent: 'overstock',
        spokenResponse: spoken,
        summaryText: `${count} SKUs Overstocked • ₹${capitalTied.toLocaleString()} Idle Capital`,
        suggestedActions: [
          {
            id: 'act-view-overstock',
            label: 'Review Overstock Items',
            primary: true,
            action: () => ctx.navigateTab('inventory')
          },
          {
            id: 'act-view-insights',
            label: 'View Optimization Tips',
            action: () => ctx.navigateTab('recommendations')
          }
        ],
        matchedProducts: ctx.products.filter(p => overstockItems.some(o => o.productId === p.id))
      };
    }

    // 11. Inventory Query: Risky items / Stock risk analysis
    if (raw.includes('risky') || raw.includes('risk analysis') || raw.includes('risk matrix') || raw.includes('risk')) {
      const riskyItems = analyses.filter(a => a.riskScore >= 60);
      const count = riskyItems.length;

      return {
        id,
        timestamp,
        transcript,
        intent: 'risk_matrix',
        spokenResponse: `Stock risk analysis identified ${count} items requiring attention across critical and overstock quadrants. Opening the Stock Risk Matrix.`,
        summaryText: `Risk Matrix Analysis • ${count} High-Risk SKUs`,
        suggestedActions: [
          {
            id: 'act-matrix',
            label: 'Open Stock Risk Matrix',
            primary: true,
            action: () => ctx.navigateTab('forecast')
          }
        ],
        matchedProducts: ctx.products.filter(p => riskyItems.some(r => r.productId === p.id))
      };
    }

    // 12. Analytics Query: Health score / Inventory health
    if (raw.includes('health') || raw.includes('score') || raw.includes('health score') || raw.includes('how healthy')) {
      const score = metrics.healthScore;
      const grade = metrics.grade;
      const healthyPct = metrics.healthyPercent;

      let evaluation = 'good stock balance';
      if (score >= 90) evaluation = 'excellent stock balance';
      else if (score < 70) evaluation = 'moderate operational risk';

      const spoken = `Inventory Health Score is ${score}% with Grade ${grade}, indicating ${evaluation}. ${healthyPct}% of your catalog is currently in healthy status.`;

      return {
        id,
        timestamp,
        transcript,
        intent: 'health_score',
        spokenResponse: spoken,
        summaryText: `Inventory Health Score: ${score}/100 (Grade ${grade})`,
        suggestedActions: [
          {
            id: 'act-gauge',
            label: 'Inspect Health Gauge',
            primary: true,
            action: () => ctx.navigateTab('overview')
          },
          {
            id: 'act-insights',
            label: 'View AI Recommendations',
            action: () => ctx.navigateTab('recommendations')
          }
        ]
      };
    }

    // 13. Analytics Query: Highest stock category
    if (raw.includes('category') || raw.includes('highest stock') || raw.includes('most stock') || raw.includes('top category')) {
      const categoryTotals: Record<string, { count: number; stock: number; value: number }> = {};
      ctx.products.forEach(p => {
        if (!categoryTotals[p.category]) {
          categoryTotals[p.category] = { count: 0, stock: 0, value: 0 };
        }
        categoryTotals[p.category].count += 1;
        categoryTotals[p.category].stock += p.stock;
        categoryTotals[p.category].value += p.stock * p.sellingPrice;
      });

      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1].stock - a[1].stock);
      const top = sortedCategories[0] || ['All Products', { stock: 0, value: 0 }];
      const topCategoryName = top[0];
      const topStock = top[1].stock;
      const topValue = Math.round(top[1].value);

      const spoken = `${topCategoryName} has the highest stock volume with ${topStock} units in inventory, valued at ${ctx.settings.currencySymbol || 'Rupees '}${topValue.toLocaleString()}.`;

      return {
        id,
        timestamp,
        transcript,
        intent: 'highest_stock_category',
        spokenResponse: spoken,
        summaryText: `Top Stock Category: ${topCategoryName} (${topStock} units)`,
        suggestedActions: [
          {
            id: 'act-view-cat',
            label: `View ${topCategoryName}`,
            primary: true,
            action: () => ctx.navigateTab('inventory')
          }
        ]
      };
    }

    // 14. Smart Comprehensive Summary: Today's status / summary
    if (
      raw.includes('today') || 
      raw.includes('status') || 
      raw.includes('summary') || 
      raw.includes('overview') ||
      raw.includes('how is inventory') ||
      raw.includes('what is the status')
    ) {
      const critCount = metrics.immediateStockoutCount;
      const overCount = metrics.overstockedCount;
      const healthyPct = metrics.healthyPercent;
      const criticalNames = analyses.filter(a => a.healthStatus === 'CRITICAL').slice(0, 2).map(a => a.name);

      let spoken = `Current inventory health is ${metrics.healthScore >= 75 ? 'good' : 'fair'}. ${healthyPct}% of products are optimal. `;
      if (critCount > 0) {
        spoken += `${critCount} product${critCount === 1 ? ' is' : 's are'} critically low, and ${overCount} are overstocked. `;
        if (criticalNames.length > 0) {
          spoken += `Immediate action is recommended for ${criticalNames.join(' and ')}.`;
        }
      } else {
        spoken += `Zero stockouts detected across ${ctx.products.length} products.`;
      }

      return {
        id,
        timestamp,
        transcript,
        intent: 'inventory_status',
        spokenResponse: spoken,
        summaryText: `Inventory Status: ${metrics.healthyPercent}% Healthy • ${critCount} Critical • ${overCount} Overstocked`,
        suggestedActions: [
          {
            id: 'act-summary-dash',
            label: 'Review Dashboard',
            primary: true,
            action: () => ctx.navigateTab('overview')
          },
          {
            id: 'act-summary-reorder',
            label: 'Check Priority Reorder',
            action: () => ctx.navigateTab('reorder')
          }
        ]
      };
    }

    // 15. Product Search Query: "Find product Rice", "Search for Oil", "Show details of Sugar"
    const searchKeywords = ['find product', 'find', 'search for', 'search', 'details of', 'where is', 'look for', 'check product'];
    let targetQuery = '';
    for (const kw of searchKeywords) {
      if (raw.startsWith(kw) || raw.includes(kw)) {
        const parts = raw.split(kw);
        if (parts[1]) {
          targetQuery = parts[1].replace(/product/g, '').replace(/the/g, '').replace(/[?.]/g, '').trim();
          break;
        }
      }
    }

    if (targetQuery && targetQuery.length >= 2) {
      const matches = ctx.products.filter(p => 
        p.name.toLowerCase().includes(targetQuery) ||
        p.category.toLowerCase().includes(targetQuery) ||
        p.sku.toLowerCase().includes(targetQuery)
      );

      if (matches.length === 1) {
        const p = matches[0];
        const analysis = analyses.find(a => a.productId === p.id);
        const statusText = p.stock <= p.minStock ? 'below minimum buffer' : p.stock > (p.maxStock || 50) ? 'overstocked' : 'in good stock';
        const spoken = `Found ${p.name}. Current stock is ${p.stock} ${p.unit} at ${ctx.settings.currencySymbol || 'Rupees '}${p.sellingPrice.toFixed(0)} per unit, which is ${statusText}.`;

        return {
          id,
          timestamp,
          transcript,
          intent: 'search_product',
          spokenResponse: spoken,
          summaryText: `${p.name} • ${p.stock} ${p.unit} in stock (₹${p.sellingPrice})`,
          suggestedActions: [
            {
              id: 'act-find-inv',
              label: 'View Product in Inventory',
              primary: true,
              action: () => ctx.navigateTab('inventory')
            },
            {
              id: 'act-find-reorder',
              label: 'Reorder Product',
              action: () => ctx.navigateTab('reorder')
            }
          ],
          matchedProducts: [p]
        };
      } else if (matches.length > 1) {
        const names = matches.slice(0, 3).map(p => p.name).join(', ');
        const spoken = `Found ${matches.length} matching products for ${targetQuery}, including ${names}. Navigating to inventory.`;
        ctx.navigateTab('inventory');

        return {
          id,
          timestamp,
          transcript,
          intent: 'search_product',
          spokenResponse: spoken,
          summaryText: `Found ${matches.length} products matching "${targetQuery}"`,
          suggestedActions: [
            {
              id: 'act-view-all',
              label: 'Browse Matching Items',
              primary: true,
              action: () => ctx.navigateTab('inventory')
            }
          ],
          matchedProducts: matches
        };
      }
    }

    // Default Fallback / Help Response
    const defaultSpoken = "I can analyze your stock health, find products, detect stockouts, or navigate sections. Try saying 'Show low stock items' or 'What is my inventory score?'.";
    return {
      id,
      timestamp,
      transcript,
      intent: 'help',
      spokenResponse: defaultSpoken,
      summaryText: 'Ready for Voice Commands',
      suggestedActions: [
        {
          id: 'act-low-stock-suggest',
          label: 'Ask: "Show low stock items"',
          primary: true,
          action: () => {
            // Can be triggered
          }
        },
        {
          id: 'act-score-suggest',
          label: 'Ask: "What is my inventory score?"',
          action: () => {
            // Can be triggered
          }
        }
      ]
    };
  }
}
