"use client";

import React, { useState, useEffect, useRef } from 'react';
import Binance from 'binance-api-node';
import { 
  Line, Bar 
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import dynamic from 'next/dynamic';
import { 
  FaPlay, FaStop, FaChartLine, FaDollarSign, 
  FaCog, FaSignal, FaHistory, FaExchangeAlt,
  FaInfoCircle, FaRedo
} from 'react-icons/fa';

// Lazy load untuk Technical Analysis
const TechnicalAnalysis = dynamic(
  () => import('react-ts-tradingview-widgets').then(mod => mod.TechnicalAnalysis),
  { ssr: false }
);

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Library untuk indikator teknikal
const { SMA, EMA, RSI, Stochastic, MACD, ATR } = require('technicalindicators');

// Konfigurasi Binance
const createClient = (apiKey, apiSecret, isTestnet) => {
  return Binance({
    apiKey: apiKey,
    apiSecret: apiSecret,
    httpBase: isTestnet ? 'https://testnet.binance.vision' : undefined,
  });
};

// Local Storage utilities
const LOCAL_STORAGE_KEYS = {
  DEMO_BALANCE: 'demo_trading_balance',
  DEMO_TRADES: 'demo_trading_trades',
  DEMO_PERFORMANCE: 'demo_trading_performance',
  BOT_SETTINGS: 'bot_trading_settings'
};

const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};

// Demo Trading Simulator
class DemoTradingSimulator {
  constructor() {
    this.winRate = 10.5; // 10.5% win rate
    this.baseBalance = 10000;
    this.tradeCount = 0;
    this.sessionStartTime = Date.now();
  }

  // Generate realistic random trade outcome based on win rate
  generateTradeOutcome() {
    const random = Math.random() * 100;
    const isWin = random <= this.winRate;
    
    if (isWin) {
      // Win: 1.5x to 3x risk (realistic RR)
      return {
        isWin: true,
        multiplier: 1.5 + Math.random() * 1.5 // 1.5x to 3x
      };
    } else {
      // Loss: -0.8x to -1x risk (partial losses and full losses)
      return {
        isWin: false,
        multiplier: -(0.8 + Math.random() * 0.2) // -0.8x to -1x
      };
    }
  }

  // Generate demo trade with realistic parameters
  generateDemoTrade(signal, currentPrice, settings) {
    const riskAmount = this.baseBalance * (settings.riskPerTrade / 100);
    const outcome = this.generateTradeOutcome();
    
    // Calculate realistic entry, SL, TP based on current market conditions
    const volatility = Math.random() * 0.02 + 0.01; // 1-3% volatility
    const slDistance = currentPrice * volatility;
    
    const entryPrice = currentPrice + (Math.random() - 0.5) * (currentPrice * 0.001); // Small slippage
    const stopLoss = signal.type === 'BUY' 
      ? entryPrice - slDistance
      : entryPrice + slDistance;
    const takeProfit = signal.type === 'BUY' 
      ? entryPrice + (slDistance * settings.rrr)
      : entryPrice - (slDistance * settings.rrr);
    
    const quantity = riskAmount / Math.abs(entryPrice - stopLoss);
    
    // Simulate trade execution with random delay
    const executionDelay = Math.random() * 5000 + 2000; // 2-7 seconds
    
    const trade = {
      id: `DEMO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol: signal.symbol,
      type: signal.type,
      quantity: parseFloat(quantity.toFixed(6)),
      entryPrice: parseFloat(entryPrice.toFixed(2)),
      stopLoss: parseFloat(stopLoss.toFixed(2)),
      takeProfit: parseFloat(takeProfit.toFixed(2)),
      timestamp: Date.now(),
      status: 'OPEN',
      signalScore: signal.score,
      counterTrend: signal.counterTrend || false,
      isDemo: true,
      outcome: outcome,
      executionDelay: executionDelay
    };
    
    this.tradeCount++;
    return trade;
  }

  // Simulate trade closure based on predetermined outcome
  simulateTradeClose(trade, currentPrice) {
    if (!trade.outcome || trade.status !== 'OPEN') return null;
    
    const { isWin, multiplier } = trade.outcome;
    const riskAmount = Math.abs(trade.entryPrice - trade.stopLoss) * trade.quantity;
    const pnl = riskAmount * multiplier;
    
    // Determine exit price based on outcome
    let exitPrice;
    if (isWin) {
      // Exit near take profit with some variance
      const tpVariance = Math.abs(trade.takeProfit - trade.entryPrice) * 0.1;
      exitPrice = trade.takeProfit + (Math.random() - 0.5) * tpVariance;
    } else {
      // Exit near stop loss with some variance
      const slVariance = Math.abs(trade.stopLoss - trade.entryPrice) * 0.1;
      exitPrice = trade.stopLoss + (Math.random() - 0.5) * slVariance;
    }
    
    return {
      ...trade,
      exitPrice: parseFloat(exitPrice.toFixed(2)),
      closeTime: Date.now(),
      status: 'CLOSED',
      pnl: parseFloat(pnl.toFixed(2)),
      closeReason: isWin ? 'TP HIT' : 'SL HIT'
    };
  }
}

const ProfessionalTradingBot = () => {
  // State management
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('5m');
  const [balance, setBalance] = useState({ USDT: 10000, BTC: 0 });
  const [trades, setTrades] = useState([]);
  const [signals, setSignals] = useState([]);
  const [botStatus, setBotStatus] = useState('stopped');
  const [settings, setSettings] = useState({
    riskPerTrade: 1,
    rrr: 2.5,
    emaShort: 9,
    emaLong: 21,
    rsiPeriod: 14,
    stochasticPeriod: 14,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    atrPeriod: 14,
    demoMode: true, // Always in demo mode
  });
  const [candles, setCandles] = useState([]);
  const [h1Candles, setH1Candles] = useState([]);
  const [d1Candles, setD1Candles] = useState([]);
  const [indicators, setIndicators] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [botLogs, setBotLogs] = useState([]);
  
  // Ambil config dari environment variables
  const [config] = useState({
    apiKey: process.env.NEXT_PUBLIC_BINANCE_API_KEY || '',
    apiSecret: process.env.NEXT_PUBLIC_BINANCE_API_SECRET || '',
    isTestnet: process.env.NEXT_PUBLIC_BINANCE_TESTNET === 'true',
  });
  
  const [performanceStats, setPerformanceStats] = useState(null);
  const [demoSimulator] = useState(new DemoTradingSimulator());
  
  const clientRef = useRef(null);
  const wsRef = useRef(null);
  const botIntervalRef = useRef(null);
  const demoTradeTimeouts = useRef(new Map());

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedBalance = loadFromLocalStorage(LOCAL_STORAGE_KEYS.DEMO_BALANCE);
    const savedTrades = loadFromLocalStorage(LOCAL_STORAGE_KEYS.DEMO_TRADES, []);
    const savedSettings = loadFromLocalStorage(LOCAL_STORAGE_KEYS.BOT_SETTINGS);
    
    if (savedBalance) {
      setBalance(savedBalance);
    }
    
    if (savedTrades.length > 0) {
      setTrades(savedTrades);
    }
    
    if (savedSettings) {
      setSettings(prev => ({ ...prev, ...savedSettings }));
    }
    
    addLog("🔄 Data demo trading dimuat dari local storage");
  }, []);

  // Save data to localStorage when state changes
  useEffect(() => {
    if (balance.USDT !== 10000 || balance.BTC !== 0) {
      saveToLocalStorage(LOCAL_STORAGE_KEYS.DEMO_BALANCE, balance);
    }
  }, [balance]);

  useEffect(() => {
    if (trades.length > 0) {
      saveToLocalStorage(LOCAL_STORAGE_KEYS.DEMO_TRADES, trades);
    }
  }, [trades]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.BOT_SETTINGS, settings);
  }, [settings]);

  // Fungsi untuk menambahkan log
  const addLog = (message) => {
    setBotLogs(prev => [
      { timestamp: new Date(), message },
      ...prev.slice(0, 19) // Simpan hanya 20 log terbaru
    ]);
  };

  // Hitung semua indikator
  const calculateAllIndicators = (candles) => {
    if (!candles || candles.length < 30) {
      addLog(`Tidak cukup data untuk kalkulasi indikator (hanya ${candles?.length || 0} candle)`);
      return {};
    }
    
    try {
      const closes = candles.map(c => parseFloat(c.close));
      const highs = candles.map(c => parseFloat(c.high));
      const lows = candles.map(c => parseFloat(c.low));
      const volumes = candles.map(c => parseFloat(c.volume));
      
      // EMA
      const emaShort = EMA.calculate({ period: settings.emaShort, values: closes });
      const emaLong = EMA.calculate({ period: settings.emaLong, values: closes });
      
      // RSI
      const rsi = RSI.calculate({ values: closes, period: settings.rsiPeriod });
      
      // Stochastic
      const stochastic = Stochastic.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: settings.stochasticPeriod,
        signalPeriod: 3
      });
      
      // MACD
      const macd = MACD.calculate({
        values: closes,
        fastPeriod: settings.macdFast,
        slowPeriod: settings.macdSlow,
        signalPeriod: settings.macdSignal,
        SimpleMAOscillator: false,
        SimpleMASignal: false
      });
      
      // ATR
      const atr = ATR.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: settings.atrPeriod
      });
      
      // Volume SMA
      const volumeSMA = SMA.calculate({ period: 20, values: volumes });
      
      // Fibonacci Levels (dari 100 candle terakhir)
      const recentHigh = Math.max(...highs.slice(-100));
      const recentLow = Math.min(...lows.slice(-100));
      const fibLevels = {
        level0: recentHigh,
        level23: recentHigh - (recentHigh - recentLow) * 0.236,
        level38: recentHigh - (recentHigh - recentLow) * 0.382,
        level50: recentHigh - (recentHigh - recentLow) * 0.5,
        level61: recentHigh - (recentHigh - recentLow) * 0.618,
        level100: recentLow
      };
      
      return {
        emaShort: emaShort[emaShort.length - 1],
        emaLong: emaLong[emaLong.length - 1],
        rsi: rsi[rsi.length - 1],
        stochasticK: stochastic[stochastic.length - 1]?.k || 0,
        stochasticD: stochastic[stochastic.length - 1]?.d || 0,
        macdHistogram: macd[macd.length - 1]?.histogram || 0,
        macdSignal: macd[macd.length - 1]?.signal || 0,
        macd: macd[macd.length - 1]?.macd || 0,
        atr: atr[atr.length - 1] || 0,
        volumeSMA: volumeSMA[volumeSMA.length - 1] || 0,
        fibLevels,
        recentHigh,
        recentLow
      };
    } catch (e) {
      addLog(`Error kalkulasi indikator: ${e.message}`);
      return {};
    }
  };

  // Fetch data candle untuk multi timeframe
  const fetchMultiTimeframeCandles = async () => {
    if (!clientRef.current) {
      addLog("Client Binance belum diinisialisasi");
      return;
    }
    
    try {
      setLoading(true);
      addLog(`Memulai fetch candle untuk ${symbol} (${timeframe})`);
      
      // Timeframe utama
      const mainCandles = await clientRef.current.candles({
        symbol,
        interval: timeframe,
        limit: 100
      });
      setCandles(mainCandles);
      addLog(`Berhasil fetch ${mainCandles.length} candle utama`);
      
      // Konfirmasi tren (H1)
      const h1Candles = await clientRef.current.candles({
        symbol,
        interval: '1h',
        limit: 50
      });
      setH1Candles(h1Candles);
      
      // Tren besar (D1)
      const d1Candles = await clientRef.current.candles({
        symbol,
        interval: '1d',
        limit: 30
      });
      setD1Candles(d1Candles);
      
      // Hitung indikator untuk semua timeframe
      const mainIndicators = calculateAllIndicators(mainCandles);
      const h1Indicators = calculateAllIndicators(h1Candles);
      const d1Indicators = calculateAllIndicators(d1Candles);
      
      setIndicators({
        main: mainIndicators,
        h1: h1Indicators,
        d1: d1Indicators
      });
      
      addLog("Indikator berhasil dihitung");
      
      return {
        mainCandles,
        h1Candles,
        d1Candles,
        mainIndicators,
        h1Indicators,
        d1Indicators
      };
    } catch (error) {
      const errMsg = `Error fetching candles: ${error.message}`;
      console.error(errMsg);
      setError(errMsg);
      addLog(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Generate trading signal dengan multi konfirmasi
  const generateSignal = (candlesData, indicatorsData) => {
    if (!candlesData || !indicatorsData) {
      addLog("Data candle/indikator tidak tersedia untuk generate sinyal");
      return null;
    }
    
    const { mainCandles, h1Indicators, d1Indicators } = candlesData;
    const { main: mainInd, h1: h1Ind, d1: d1Ind } = indicatorsData;
    
    if (!mainInd || !h1Ind || !d1Ind) {
      addLog("Indikator utama tidak lengkap");
      return null;
    }
    
    try {
      const lastCandle = mainCandles[mainCandles.length - 1];
      const lastClose = parseFloat(lastCandle.close);
      const lastVolume = parseFloat(lastCandle.volume);
      
      // 1. Konfirmasi arah tren besar (H1 dan D1)
      const isBullishTrend = 
        h1Ind.emaShort > h1Ind.emaLong && 
        d1Ind.emaShort > d1Ind.emaLong;
        
      const isBearishTrend = 
        h1Ind.emaShort < h1Ind.emaLong && 
        d1Ind.emaShort < d1Ind.emaLong;
      
      // 2. Kondisi entry (dilonggarkan sedikit)
      const buyConditions = {
        rsi: mainInd.rsi < 35,  // dari 30 menjadi 35
        stochastic: mainInd.stochasticK < 25 && mainInd.stochasticK > mainInd.stochasticD, // dari 20 menjadi 25
        ema: mainInd.emaShort > mainInd.emaLong,
        macd: mainInd.macdHistogram > 0 && mainInd.macdHistogram > mainInd.macdSignal,
        volume: lastVolume > (mainInd.volumeSMA * 1.3), // dari 1.5 menjadi 1.3
        fibonacci: lastClose <= (mainInd.fibLevels.level61 * 1.01) // tambah toleransi 1%
      };
      
      const sellConditions = {
        rsi: mainInd.rsi > 65,  // dari 70 menjadi 65
        stochastic: mainInd.stochasticK > 75 && mainInd.stochasticK < mainInd.stochasticD, // dari 80 menjadi 75
        ema: mainInd.emaShort < mainInd.emaLong,
        macd: mainInd.macdHistogram < 0 && mainInd.macdHistogram < mainInd.macdSignal,
        volume: lastVolume > (mainInd.volumeSMA * 1.3), // dari 1.5 menjadi 1.3
        fibonacci: lastClose >= (mainInd.fibLevels.level38 * 0.99) // tambah toleransi 1%
      };
      
      // Hitung jumlah kondisi terpenuhi
      const buyScore = Object.values(buyConditions).filter(Boolean).length;
      const sellScore = Object.values(sellConditions).filter(Boolean).length;
      
      // 3. Validasi sinyal dengan tren besar
      let signal = null;
      
      // Sinyal beli kuat: tren bullish + 4+ kondisi
      if (isBullishTrend && buyScore >= 4) {
        signal = {
          type: 'BUY',
          price: lastClose,
          timestamp: Date.now(),
          symbol,
          timeframe,
          conditions: buyConditions,
          score: buyScore
        };
        addLog(`🚀 BUY signal terdeteksi! Skor: ${buyScore}/6 | Harga: $${lastClose}`);
      }
      // Sinyal jual kuat: tren bearish + 4+ kondisi
      else if (isBearishTrend && sellScore >= 4) {
        signal = {
          type: 'SELL',
          price: lastClose,
          timestamp: Date.now(),
          symbol,
          timeframe,
          conditions: sellConditions,
          score: sellScore
        };
        addLog(`🚨 SELL signal terdeteksi! Skor: ${sellScore}/6 | Harga: $${lastClose}`);
      }
      // Sinyal counter-trend (hanya jika 5+ kondisi)
      else if (buyScore >= 4) { // dari 5 menjadi 4
        signal = {
          type: 'BUY',
          price: lastClose,
          timestamp: Date.now(),
          symbol,
          timeframe,
          conditions: buyConditions,
          score: buyScore,
          counterTrend: true
        };
        addLog(`⚠️ Counter BUY signal terdeteksi! Skor: ${buyScore}/6 | Harga: $${lastClose}`);
      }
      else if (sellScore >= 4) { // dari 5 menjadi 4
        signal = {
          type: 'SELL',
          price: lastClose,
          timestamp: Date.now(),
          symbol,
          timeframe,
          conditions: sellConditions,
          score: sellScore,
          counterTrend: true
        };
        addLog(`⚠️ Counter SELL signal terdeteksi! Skor: ${sellScore}/6 | Harga: $${lastClose}`);
      } else {
        addLog(`Tidak ada sinyal yang memenuhi syarat. Skor BUY: ${buyScore}, SELL: ${sellScore}`);
      }
      
      return signal;
    } catch (e) {
      addLog(`Error generate sinyal: ${e.message}`);
      return null;
    }
  };

  // Eksekusi trade dengan sistem demo
  const executeTrade = async (signal) => {
    if (!signal) return;
    
    try {
      addLog(`🎯 Memulai eksekusi DEMO order ${signal.type}...`);
      
      const currentPrice = signal.price;
      
      // Generate demo trade using simulator
      const demoTrade = demoSimulator.generateDemoTrade(signal, currentPrice, settings);
      
      addLog(`📊 DEMO Trade dibuat dengan outcome: ${demoTrade.outcome.isWin ? 'WIN' : 'LOSS'} 
        (${(demoTrade.outcome.multiplier * 100).toFixed(1)}% dari risk)`);
      
      // Update state immediately
      setTrades(prev => [...prev, demoTrade]);
      
      // Simulate balance update (demo only - no real money involved)
      const riskAmount = Math.abs(demoTrade.entryPrice - demoTrade.stopLoss) * demoTrade.quantity;
      if (demoTrade.type === 'BUY') {
        setBalance(prev => ({
          USDT: prev.USDT - riskAmount,
          BTC: prev.BTC + demoTrade.quantity
        }));
      } else {
        setBalance(prev => ({
          USDT: prev.USDT + riskAmount,
          BTC: prev.BTC - demoTrade.quantity
        }));
      }
      
      addLog(`✅ DEMO Order ${demoTrade.type} dieksekusi! 
        Jumlah: ${demoTrade.quantity.toFixed(6)} | 
        Entry: $${demoTrade.entryPrice.toFixed(2)} | 
        SL: $${demoTrade.stopLoss.toFixed(2)} | 
        TP: $${demoTrade.takeProfit.toFixed(2)}`);
      
      // Schedule automatic trade closure based on predetermined outcome
      const closeDelay = Math.random() * 120000 + 30000; // 30 seconds to 2.5 minutes
      const timeoutId = setTimeout(() => {
        closeDemoTrade(demoTrade.id);
        demoTradeTimeouts.current.delete(demoTrade.id);
      }, closeDelay);
      
      demoTradeTimeouts.current.set(demoTrade.id, timeoutId);
      
      return demoTrade;
      
    } catch (error) {
      const errMsg = `Demo trade execution error: ${error.message}`;
      console.error(errMsg);
      addLog(errMsg);
    }
  };

  // Close demo trade based on predetermined outcome
  const closeDemoTrade = (tradeId) => {
    setTrades(prev => prev.map(trade => {
      if (trade.id !== tradeId || trade.status !== 'OPEN') return trade;
      
      const currentPrice = candles[candles.length - 1]?.close || trade.entryPrice;
      const closedTrade = demoSimulator.simulateTradeClose(trade, currentPrice);
      
      if (closedTrade) {
        // Update balance with PnL
        const pnl = closedTrade.pnl;
        setBalance(prev => {
          if (trade.type === 'BUY') {
            return {
              USDT: prev.USDT + (closedTrade.exitPrice * trade.quantity),
              BTC: prev.BTC - trade.quantity
            };
          } else {
            return {
              USDT: prev.USDT - (closedTrade.exitPrice * trade.quantity) + pnl,
              BTC: prev.BTC + trade.quantity
            };
          }
        });
        
        const pnlEmoji = pnl > 0 ? '💰' : '📉';
        addLog(`${pnlEmoji} DEMO Trade ditutup: ${trade.type} ${trade.symbol} 
          | Alasan: ${closedTrade.closeReason} 
          | Profit: $${pnl.toFixed(2)}`);
        
        return closedTrade;
      }
      
      return trade;
    }));
  };

  // Cek apakah trade perlu ditutup (hanya untuk non-demo trades)
  const checkTradeClosure = () => {
    if (candles.length === 0) return;
    
    const currentPrice = parseFloat(candles[candles.length - 1]?.close);
    if (!currentPrice) {
      addLog("Harga saat ini tidak tersedia untuk pengecekan trade");
      return;
    }
    
    // Skip closure check for demo trades as they are handled automatically
    setTrades(prev => prev.map(trade => {
      if (trade.status !== 'OPEN' || trade.isDemo) return trade;
      
      let shouldClose = false;
      let closeReason = '';
      
      if (trade.type === 'BUY') {
        if (currentPrice >= trade.takeProfit) {
          shouldClose = true;
          closeReason = 'TP HIT';
        } else if (currentPrice <= trade.stopLoss) {
          shouldClose = true;
          closeReason = 'SL HIT';
        }
      } else {
        if (currentPrice <= trade.takeProfit) {
          shouldClose = true;
          closeReason = 'TP HIT';
        } else if (currentPrice >= trade.stopLoss) {
          shouldClose = true;
          closeReason = 'SL HIT';
        }
      }
      
      if (shouldClose) {
        // Simulasi update balance
        const profit = trade.type === 'BUY'
          ? (currentPrice - trade.entryPrice) * trade.quantity
          : (trade.entryPrice - currentPrice) * trade.quantity;
        
        setBalance(prev => ({
          USDT: prev.USDT + (trade.type === 'BUY' 
            ? currentPrice * trade.quantity 
            : (trade.entryPrice * trade.quantity) + profit),
          BTC: trade.type === 'BUY' 
            ? prev.BTC - trade.quantity 
            : prev.BTC + trade.quantity
        }));
        
        addLog(`🔔 Trade ditutup: ${trade.type} ${trade.symbol} 
          | Alasan: ${closeReason} 
          | Profit: $${profit.toFixed(2)}`);
        
        return {
          ...trade,
          exitPrice: currentPrice,
          closeTime: Date.now(),
          status: 'CLOSED',
          pnl: profit,
          closeReason
        };
      }
      
      return trade;
    }));
  };

  // Generate demo signals independent of real market analysis
  const generateDemoSignal = () => {
    if (candles.length === 0) return null;
    
    const lastCandle = candles[candles.length - 1];
    const currentPrice = parseFloat(lastCandle.close);
    
    // Generate random signal with some market-like behavior
    const shouldGenerateSignal = Math.random() < 0.3; // 30% chance per cycle
    if (!shouldGenerateSignal) return null;
    
    const signalType = Math.random() > 0.5 ? 'BUY' : 'SELL';
    
    // Create realistic looking conditions (always demo)
    const demoConditions = {
      rsi: Math.random() > 0.5,
      stochastic: Math.random() > 0.5,
      ema: Math.random() > 0.5,
      macd: Math.random() > 0.5,
      volume: Math.random() > 0.5,
      fibonacci: Math.random() > 0.5
    };
    
    const score = Object.values(demoConditions).filter(Boolean).length;
    
    const signal = {
      type: signalType,
      price: currentPrice,
      timestamp: Date.now(),
      symbol,
      timeframe,
      conditions: demoConditions,
      score: score,
      isDemo: true
    };
    
    addLog(`🎲 DEMO Signal generated: ${signalType} dengan skor ${score}/6`);
    return signal;
  };

  // Main bot loop dengan sistem demo
  const runBotCycle = async () => {
    if (botStatus !== 'running') {
      addLog("Bot tidak berjalan, skip cycle");
      return;
    }
    
    try {
      addLog("🔄 Memulai siklus DEMO bot...");
      
      // Fetch real market data for charts
      const candlesData = await fetchMultiTimeframeCandles();
      if (!candlesData) {
        addLog("Data candle tidak tersedia, skip siklus");
        return;
      }
      
      // Generate demo signal instead of real analysis
      const demoSignal = generateDemoSignal();
      
      if (demoSignal) {
        setSignals(prev => [demoSignal, ...prev.slice(0, 19)]);
        
        // Check if we should execute trade (limit concurrent trades)
        const openTrades = trades.filter(t => t.status === 'OPEN').length;
        if (openTrades < 3) { // Max 3 concurrent demo trades
          await executeTrade(demoSignal);
        } else {
          addLog("⚠️ Maksimal 3 trade aktif, skip eksekusi");
        }
      } else {
        addLog("📊 Tidak ada sinyal demo yang dihasilkan");
      }
      
      // Check non-demo trade closures
      checkTradeClosure();
      
      // Hitung statistik performa
      calculatePerformance();
      
      addLog("✅ Siklus DEMO bot selesai");
    } catch (error) {
      const errMsg = `Demo bot cycle error: ${error.message}`;
      console.error(errMsg);
      addLog(errMsg);
    }
  };

  // Setup Binance client
  useEffect(() => {
    const initClient = async () => {
      if (config.apiKey && config.apiSecret) {
        try {
          clientRef.current = createClient(
            config.apiKey, 
            config.apiSecret, 
            config.isTestnet
          );
          
          // Test connection
          await clientRef.current.time();
          
          addLog(`✅ Client Binance diinisialisasi (${config.isTestnet ? 'TESTNET' : 'LIVE'})`);
          
          // Inisialisasi balance
          setBalance({ USDT: 10000, BTC: 0 });
          await fetchMultiTimeframeCandles();
        } catch (e) {
          const errMsg = `❌ Gagal inisialisasi client: ${e.message}`;
          setError(errMsg);
          addLog(errMsg);
        }
      } else {
        const errMsg = "⚠️ API Key/Secret tidak ditemukan. Silakan konfigurasi di .env";
        setError(errMsg);
        addLog(errMsg);
      }
    };

    initClient();
  }, [config]);

  // Setup WebSocket untuk harga real-time
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
      addLog("WebSocket sebelumnya ditutup");
    }
    
    addLog(`Menyiapkan WebSocket untuk ${symbol}@kline_${timeframe}`);
    
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${timeframe}`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      addLog("✅ WebSocket terhubung");
    };
    
    ws.onerror = (err) => {
      addLog(`❌ WebSocket error: ${err.message || 'Unknown error'}`);
    };
    
    ws.onclose = () => {
      addLog("📛 WebSocket ditutup");
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const kline = data.k;
      
      // Update candle terakhir
      setCandles(prev => {
        if (!prev || prev.length === 0) return prev;
        
        const newCandles = [...prev];
        const lastCandle = newCandles[newCandles.length - 1];
        
        if (lastCandle && lastCandle.openTime === kline.t) {
          newCandles[newCandles.length - 1] = {
            open: kline.o,
            high: kline.h,
            low: kline.l,
            close: kline.c,
            volume: kline.v,
            openTime: kline.t,
            closeTime: kline.T
          };
        } else {
          newCandles.push({
            open: kline.o,
            high: kline.h,
            low: kline.l,
            close: kline.c,
            volume: kline.v,
            openTime: kline.t,
            closeTime: kline.T
          });
          
          // Pertahankan maks 100 candle
          if (newCandles.length > 100) {
            newCandles.shift();
          }
        }
        
        return newCandles;
      });
    };
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [symbol, timeframe]);

  // Setup bot interval
  useEffect(() => {
    if (botStatus === 'running') {
      addLog("🚀 Memulai bot trading");
      runBotCycle(); // Jalankan segera
      botIntervalRef.current = setInterval(runBotCycle, 30000); // Jalankan setiap 30 detik
      addLog("⏱️ Interval bot diatur setiap 30 detik");
    } else {
      if (botIntervalRef.current) {
        clearInterval(botIntervalRef.current);
        addLog("⏹️ Bot dihentikan");
      }
    }
    
    return () => {
      if (botIntervalRef.current) {
        clearInterval(botIntervalRef.current);
      }
    };
  }, [botStatus, symbol, timeframe]);

  // Kalkulasi statistik performa
  const calculatePerformance = () => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    if (closedTrades.length === 0) return;
    
    const winningTrades = closedTrades.filter(t => t.pnl > 0);
    const losingTrades = closedTrades.filter(t => t.pnl < 0);
    
    const winRate = (winningTrades.length / closedTrades.length) * 100;
    const avgWin = winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length;
    const avgLoss = losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length;
    const expectancy = (winRate/100 * avgWin) - ((100-winRate)/100 * Math.abs(avgLoss));
    
    const stats = {
      totalTrades: closedTrades.length,
      winRate: parseFloat(winRate.toFixed(2)),
      avgWin: parseFloat(avgWin.toFixed(2)),
      avgLoss: parseFloat(avgLoss.toFixed(2)),
      expectancy: parseFloat(expectancy.toFixed(2)),
      netProfit: closedTrades.reduce((sum, t) => sum + t.pnl, 0),
      bestTrade: Math.max(...closedTrades.map(t => t.pnl), 0),
      worstTrade: Math.min(...closedTrades.map(t => t.pnl), 0),
      maxDrawdown: 0
    };
    
    // Hitung drawdown
    let equity = 10000;
    let peak = 10000;
    let maxDD = 0;
    
    closedTrades.sort((a, b) => a.closeTime - b.closeTime).forEach(trade => {
      equity += trade.pnl;
      if (equity > peak) peak = equity;
      
      const drawdown = ((peak - equity) / peak) * 100;
      if (drawdown > maxDD) maxDD = drawdown;
    });
    
    stats.maxDrawdown = parseFloat(maxDD.toFixed(2));
    
    setPerformanceStats(stats);
  };

  // Render chart
  const renderMainChart = () => {
    if (loading) {
      return (
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Memuat data chart...</p>
          </div>
        </div>
      );
    }
    
    if (candles.length < 10) {
      return (
        <div className="h-80 flex items-center justify-center text-gray-400">
          Tidak cukup data untuk menampilkan chart (minimal 10 candle)
        </div>
      );
    }
    
    const labels = candles.map(c => new Date(c.openTime).toLocaleTimeString());
    const closes = candles.map(c => parseFloat(c.close));
    const volumes = candles.map(c => parseFloat(c.volume));
    
    const data = {
      labels,
      datasets: [
        {
          label: 'Price',
          data: closes,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.1,
          yAxisID: 'y',
        },
        {
          label: 'Volume',
          data: volumes,
          backgroundColor: 'rgba(107, 114, 128, 0.5)',
          borderColor: 'rgba(107, 114, 128, 1)',
          type: 'bar',
          yAxisID: 'y1',
        }
      ]
    };
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: 'rgba(55, 65, 81, 0.5)',
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
        },
        x: {
          grid: {
            color: 'rgba(55, 65, 81, 0.5)',
          },
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#D1D5DB',
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: '#60A5FA',
          bodyColor: '#D1D5DB',
          borderColor: '#4B5563',
          borderWidth: 1,
        }
      }
    };
    
    return (
      <div className="h-80">
        <Line data={data} options={options} />
      </div>
    );
  };

  // Render kondisi sinyal
  const renderConditionBadge = (condition, label) => {
    return (
      <span className={`px-2 py-1 rounded text-xs ${
        condition ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'
      }`}>
        {label}
      </span>
    );
  };

  // Render log timestamp
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Force refresh data
  const handleRefresh = async () => {
    setLoading(true);
    await fetchMultiTimeframeCandles();
    addLog("Data diperbarui manual");
  };

  // Reset demo data
  const handleResetDemo = () => {
    setBalance({ USDT: 10000, BTC: 0 });
    setTrades([]);
    setSignals([]);
    setPerformanceStats(null);
    
    // Clear localStorage
    localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_BALANCE);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_TRADES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.DEMO_PERFORMANCE);
    
    // Clear any pending timeouts
    demoTradeTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    demoTradeTimeouts.current.clear();
    
    addLog("🔄 Demo data direset ke kondisi awal");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-2 sm:px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FaChartLine className="text-blue-500 text-xl sm:text-2xl" />
            <h1 className="text-lg sm:text-xl font-bold">ProTrade Bot</h1>
            <span className="text-xs bg-orange-900 text-orange-200 px-2 py-1 rounded font-bold">
              DEMO MODE
            </span>
            <span className="text-xs bg-green-900 text-green-200 px-2 py-1 rounded hidden sm:block">
              WR: 10-11%
            </span>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-xs sm:text-sm">
              <span className="text-gray-400 hidden sm:inline">Equity: </span>
              <span className="font-bold">
                ${(balance.USDT + (balance.BTC * (candles[candles.length - 1]?.close || 0))).toFixed(2)}
              </span>
            </div>
            <div className="flex space-x-1 sm:space-x-2">
              <button 
                onClick={() => setBotStatus('running')}
                disabled={botStatus === 'running'}
                className={`px-2 py-1 sm:px-3 sm:py-1 rounded flex items-center text-xs sm:text-sm ${
                  botStatus === 'running' 
                    ? 'bg-green-700 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <FaPlay className="mr-0 sm:mr-1" /> 
                <span className="hidden sm:inline">Start</span>
              </button>
              <button 
                onClick={() => setBotStatus('stopped')}
                disabled={botStatus === 'stopped'}
                className={`px-2 py-1 sm:px-3 sm:py-1 rounded flex items-center text-xs sm:text-sm ${
                  botStatus === 'stopped' 
                    ? 'bg-red-700 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <FaStop className="mr-0 sm:mr-1" /> 
                <span className="hidden sm:inline">Stop</span>
              </button>
              <button
                onClick={handleRefresh}
                className="px-2 py-1 sm:px-3 sm:py-1 rounded flex items-center bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
              >
                <FaRedo className="mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleResetDemo}
                className="px-2 py-1 sm:px-3 sm:py-1 rounded flex items-center bg-orange-600 hover:bg-orange-700 text-xs sm:text-sm"
              >
                <FaRedo className="mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Reset Demo</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded-lg mb-4 flex items-center">
            <FaInfoCircle className="mr-2" />
            {error}
          </div>
        )}

        {/* Mobile Control Bar */}
        <div className="sm:hidden bg-gray-800 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-gray-700 text-white px-2 py-1 text-sm rounded"
              >
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="ETHUSDT">ETH/USDT</option>
                <option value="BNBUSDT">BNB/USDT</option>
                <option value="SOLUSDT">SOL/USDT</option>
                <option value="XRPUSDT">XRP/USDT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-gray-700 text-white px-2 py-1 text-sm rounded"
              >
                <option value="1m">1m</option>
                <option value="3m">3m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Panel Kontrol & Statistik */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Kontrol Bot */}
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
              <h2 className="text-md sm:text-lg font-semibold mb-3 flex items-center">
                <FaCog className="mr-2 text-blue-400 text-sm sm:text-base" /> Bot Control
                <span className="ml-2 text-xs bg-orange-700 text-orange-200 px-2 py-1 rounded">
                  DEMO
                </span>
              </h2>
              
              <div className="mb-3 p-2 bg-orange-900 bg-opacity-30 border border-orange-700 rounded text-xs">
                <div className="font-semibold text-orange-300 mb-1">🎯 Demo Trading Mode</div>
                <div className="text-orange-200">
                  • Win Rate: 10-11% (simulasi realistis)<br/>
                  • Data chart: Real-time dari Binance<br/>
                  • Balance & trades: Simulasi dummy<br/>
                  • Disimpan di local storage
                </div>
              </div>
              
              {/* Desktop-only controls */}
              <div className="hidden sm:grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Symbol</label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  >
                    <option value="BTCUSDT">BTC/USDT</option>
                    <option value="ETHUSDT">ETH/USDT</option>
                    <option value="BNBUSDT">BNB/USDT</option>
                    <option value="SOLUSDT">SOL/USDT</option>
                    <option value="XRPUSDT">XRP/USDT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Timeframe</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  >
                    <option value="1m">1 Minute</option>
                    <option value="3m">3 Minutes</option>
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm text-gray-400 mb-1">Risk Management</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Risk/Trade</span>
                      <span>{settings.riskPerTrade}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={settings.riskPerTrade}
                      onChange={e => setSettings({...settings, riskPerTrade: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Risk/Reward</span>
                      <span>1:{settings.rrr}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      value={settings.rrr}
                      onChange={e => setSettings({...settings, rrr: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                <div className="text-xs sm:text-sm">
                  <div className="text-gray-400">Status</div>
                  <div className={botStatus === 'running' ? 'text-green-400' : 'text-red-400'}>
                    {botStatus === 'running' ? 'RUNNING' : 'STOPPED'}
                  </div>
                </div>
                <div className="text-xs sm:text-sm">
                  <div className="text-gray-400">Last Signal</div>
                  <div>
                    {signals.length > 0 ? 
                      new Date(signals[0].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Statistik Akun */}
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
              <h2 className="text-md sm:text-lg font-semibold mb-3 flex items-center">
                <FaDollarSign className="mr-2 text-green-400 text-sm sm:text-base" /> Account
              </h2>
              
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">USDT:</span>
                  <span className="font-bold">${balance.USDT.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{symbol.replace('USDT', '')}:</span>
                  <span className="font-bold">{balance.BTC.toFixed(6)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Equity:</span>
                  <span className="font-bold">
                    ${(balance.USDT + (balance.BTC * (candles[candles.length - 1]?.close || 0))).toFixed(2)}
                  </span>
                </div>
                
                {performanceStats && (
                  <div className="pt-3 border-t border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Win Rate:</span>
                      <span className={performanceStats.winRate > 60 ? 'text-green-400' : 'text-yellow-400'}>
                        {performanceStats.winRate}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Profit:</span>
                      <span className={performanceStats.netProfit > 0 ? 'text-green-400' : 'text-red-400'}>
                        ${performanceStats.netProfit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bot Logs */}
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
              <h2 className="text-md sm:text-lg font-semibold mb-3 flex items-center">
                <FaInfoCircle className="mr-2 text-blue-400" /> Bot Logs
              </h2>
              <div className="h-60 overflow-y-auto">
                {botLogs.length > 0 ? (
                  <div className="text-xs space-y-2">
                    {botLogs.map((log, index) => (
                      <div key={index} className="border-b border-gray-700 pb-2">
                        <div className="text-gray-400 text-xs">
                          {formatTime(log.timestamp)}
                        </div>
                        <div className="mt-1">{log.message}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Tidak ada log tersedia
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Chart Utama */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4">
              <h2 className="text-md sm:text-lg font-semibold mb-2 sm:mb-0">
                {symbol} ({timeframe})
              </h2>
              <div className="flex space-x-1 sm:space-x-2">
                {indicators.main && (
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <div className={`px-2 py-1 rounded text-xs ${
                      indicators.main.emaShort > indicators.main.emaLong 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {indicators.main.emaShort > indicators.main.emaLong ? 'BULL' : 'BEAR'}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      indicators.main.rsi < 35 
                        ? 'bg-green-500 text-white' 
                        : indicators.main.rsi > 65 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-700 text-gray-300'
                    }`}>
                      RSI: {indicators.main.rsi?.toFixed(0) || 'N/A'}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {renderMainChart()}
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-4">
              <div className="bg-gray-700 p-2 rounded border border-gray-600">
                <div className="text-xs text-gray-400">Stochastic</div>
                <div className="text-sm sm:text-base">
                  {indicators.main?.stochasticK?.toFixed(0) || 'N/A'} / 
                  {indicators.main?.stochasticD?.toFixed(0) || 'N/A'}
                </div>
              </div>
              <div className="bg-gray-700 p-2 rounded border border-gray-600">
                <div className="text-xs text-gray-400">MACD</div>
                <div className="text-sm sm:text-base">
                  {indicators.main?.macdHistogram?.toFixed(1) || 'N/A'}
                </div>
              </div>
              <div className="bg-gray-700 p-2 rounded border border-gray-600">
                <div className="text-xs text-gray-400">Volume</div>
                <div className="text-sm sm:text-base">
                  {indicators.main?.volumeSMA 
                    ? (candles[candles.length - 1]?.volume / indicators.main.volumeSMA).toFixed(1) + 'x' 
                    : 'N/A'}
                </div>
              </div>
              <div className="bg-gray-700 p-2 rounded border border-gray-600">
                <div className="text-xs text-gray-400">ATR</div>
                <div className="text-sm sm:text-base">
                  {indicators.main?.atr?.toFixed(1) || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sinyal dan Trading */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Sinyal Terbaru */}
          <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
            <h2 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
              <FaSignal className="mr-2 text-yellow-400" /> Trading Signals
            </h2>
            
            <div className="space-y-3">
              {signals.slice(0, 3).map((signal, index) => (
                <div 
                  key={index} 
                  className={`p-2 sm:p-3 rounded border ${
                    signal.type === 'BUY' 
                      ? 'border-green-500 bg-green-900 bg-opacity-20' 
                      : 'border-red-500 bg-red-900 bg-opacity-20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1 sm:mb-2">
                    <div>
                      <span className={`font-bold text-sm sm:text-base ${
                        signal.type === 'BUY' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {signal.type}
                      </span>
                      <span className="text-xs bg-gray-700 px-1 sm:px-2 py-0.5 rounded ml-1">
                        {signal.score}/6
                      </span>
                      {signal.counterTrend && (
                        <span className="text-xs bg-yellow-700 px-1 sm:px-2 py-0.5 rounded ml-1">
                          Counter
                        </span>
                      )}
                      {signal.isDemo && (
                        <span className="text-xs bg-orange-700 px-1 sm:px-2 py-0.5 rounded ml-1">
                          DEMO
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(signal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                  
                  <div className="text-xs sm:text-sm mb-1">Price: ${signal.price.toFixed(2)}</div>
                  
                  <div className="flex flex-wrap gap-1">
                    {renderConditionBadge(signal.conditions.rsi, 'RSI')}
                    {renderConditionBadge(signal.conditions.stochastic, 'Stoch')}
                    {renderConditionBadge(signal.conditions.ema, 'EMA')}
                    {renderConditionBadge(signal.conditions.macd, 'MACD')}
                    {renderConditionBadge(signal.conditions.volume, 'Vol')}
                    {renderConditionBadge(signal.conditions.fibonacci, 'Fib')}
                  </div>
                </div>
              ))}
              
              {signals.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Tidak ada sinyal trading terdeteksi
                </div>
              )}
            </div>
          </div>
          
          {/* Trading Aktif */}
          <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
            <h2 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
              <FaExchangeAlt className="mr-2 text-purple-400" /> Active Positions
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] sm:min-w-0">
                <thead>
                  <tr className="text-left text-xs sm:text-sm text-gray-400">
                    <th className="pb-1 sm:pb-2">Symbol</th>
                    <th className="pb-1 sm:pb-2">Type</th>
                    <th className="pb-1 sm:pb-2">Entry</th>
                    <th className="pb-1 sm:pb-2">SL/TP</th>
                    <th className="pb-1 sm:pb-2">Current</th>
                    <th className="pb-1 sm:pb-2">PNL</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.filter(t => t.status === 'OPEN').map((trade) => {
                    const currentPrice = candles[candles.length - 1]?.close || trade.entryPrice;
                    const pnl = trade.type === 'BUY' 
                      ? (currentPrice - trade.entryPrice) * trade.quantity
                      : (trade.entryPrice - currentPrice) * trade.quantity;
                    
                    const pnlPercent = (pnl / (trade.entryPrice * trade.quantity)) * 100;
                    
                    return (
                      <tr key={trade.id} className="border-b border-gray-700 text-xs sm:text-sm">
                        <td className="py-1 sm:py-2">
                          {trade.symbol}
                          {trade.isDemo && (
                            <span className="ml-1 text-xs bg-orange-700 text-orange-200 px-1 rounded">
                              DEMO
                            </span>
                          )}
                        </td>
                        <td className={`py-1 sm:py-2 font-bold ${
                          trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {trade.type}
                        </td>
                        <td className="py-1 sm:py-2">${trade.entryPrice.toFixed(2)}</td>
                        <td className="py-1 sm:py-2">
                          <div>${trade.stopLoss.toFixed(2)}</div>
                          <div>${trade.takeProfit.toFixed(2)}</div>
                        </td>
                        <td className="py-1 sm:py-2">${parseFloat(currentPrice).toFixed(2)}</td>
                        <td className={`py-1 sm:py-2 font-bold ${
                          pnl > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${pnl.toFixed(2)}
                          <div className="text-xs">
                            {pnlPercent.toFixed(1)}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {trades.filter(t => t.status === 'OPEN').length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-4 text-center text-gray-500 text-sm">
                        Tidak ada posisi aktif
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Riwayat Trading */}
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <h2 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
            <FaHistory className="mr-2 text-blue-400" /> Trade History
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] sm:min-w-0">
              <thead>
                <tr className="text-left text-xs sm:text-sm text-gray-400">
                  <th className="pb-1 sm:pb-2">Time</th>
                  <th className="pb-1 sm:pb-2">Symbol</th>
                  <th className="pb-1 sm:pb-2">Type</th>
                  <th className="pb-1 sm:pb-2">Entry</th>
                  <th className="pb-1 sm:pb-2">Exit</th>
                  <th className="pb-1 sm:pb-2">PNL</th>
                </tr>
              </thead>
              <tbody>
                {trades.filter(t => t.status === 'CLOSED').slice(0, 5).map((trade) => (
                  <tr key={trade.id} className="border-b border-gray-700 text-xs sm:text-sm">
                    <td className="py-1 sm:py-2">
                      {new Date(trade.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="py-1 sm:py-2">
                      {trade.symbol}
                      {trade.isDemo && (
                        <span className="ml-1 text-xs bg-orange-700 text-orange-200 px-1 rounded">
                          DEMO
                        </span>
                      )}
                    </td>
                    <td className={`py-1 sm:py-2 font-bold ${
                      trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.type}
                    </td>
                    <td className="py-1 sm:py-2">${trade.entryPrice.toFixed(2)}</td>
                    <td className="py-1 sm:py-2">${trade.exitPrice.toFixed(2)}</td>
                    <td className={`py-1 sm:py-2 font-bold ${
                      trade.pnl > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${trade.pnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
                
                {trades.filter(t => t.status === 'CLOSED').length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-4 text-center text-gray-500 text-sm">
                      Tidak ada riwayat trading
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Analisis Teknikal Lanjutan */}
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <h2 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4">Technical Analysis</h2>
          <div className="h-80">
            <TechnicalAnalysis 
              symbol={`BINANCE:${symbol}`}
              colorTheme="dark"
              width="100%"
              height="100%"
              isTransparent
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfessionalTradingBot;