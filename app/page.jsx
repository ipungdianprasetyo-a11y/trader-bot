// app/page.jsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { TechnicalAnalysis } from 'react-ts-tradingview-widgets';
import { FaPlay, FaStop, FaSync, FaChartLine, FaDollarSign } from 'react-icons/fa';

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

const ProfessionalTradingBot = () => {
  // State management
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('5m');
  const [balance, setBalance] = useState({ USDT: 0, BTC: 0 });
  const [positions, setPositions] = useState([]);
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
  });
  const [candles, setCandles] = useState([]);
  const [h1Candles, setH1Candles] = useState([]);
  const [d1Candles, setD1Candles] = useState([]);
  const [indicators, setIndicators] = useState({});
  const [config, setConfig] = useState({
    apiKey: '',
    apiSecret: '',
    isTestnet: true,
  });
  const [performanceStats, setPerformanceStats] = useState(null);
  
  const clientRef = useRef(null);
  const wsRef = useRef(null);
  const botIntervalRef = useRef(null);

  // Hitung semua indikator
  const calculateAllIndicators = (candles) => {
    if (candles.length < 100) return {};
    
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
      stochasticK: stochastic[stochastic.length - 1].k,
      stochasticD: stochastic[stochastic.length - 1].d,
      macdHistogram: macd[macd.length - 1].histogram,
      macdSignal: macd[macd.length - 1].signal,
      macd: macd[macd.length - 1].macd,
      atr: atr[atr.length - 1],
      volumeSMA: volumeSMA[volumeSMA.length - 1],
      fibLevels,
      recentHigh,
      recentLow
    };
  };

  // Fetch data candle untuk multi timeframe
  const fetchMultiTimeframeCandles = async () => {
    if (!clientRef.current) return;
    
    try {
      // Timeframe utama (M5)
      const mainCandles = await clientRef.current.candles({
        symbol,
        interval: timeframe,
        limit: 100
      });
      setCandles(mainCandles);
      
      // Konfirmasi tren (H1)
      const h1Candles = await clientRef.current.candles({
        symbol,
        interval: '1h',
        limit: 100
      });
      setH1Candles(h1Candles);
      
      // Tren besar (D1)
      const d1Candles = await clientRef.current.candles({
        symbol,
        interval: '1d',
        limit: 100
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
      
      return {
        mainCandles,
        h1Candles,
        d1Candles,
        mainIndicators,
        h1Indicators,
        d1Indicators
      };
    } catch (error) {
      console.error('Error fetching candles:', error);
    }
  };

  // Generate trading signal dengan multi konfirmasi
  const generateSignal = (candlesData, indicatorsData) => {
    if (!candlesData || !indicatorsData) return null;
    
    const { mainCandles, h1Indicators, d1Indicators } = candlesData;
    const { main: mainInd, h1: h1Ind, d1: d1Ind } = indicatorsData;
    
    if (!mainInd || !h1Ind || !d1Ind) return null;
    
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
    
    // 2. Kondisi entry
    const buyConditions = {
      rsi: mainInd.rsi < 30,
      stochastic: mainInd.stochasticK < 20 && mainInd.stochasticK > mainInd.stochasticD,
      ema: mainInd.emaShort > mainInd.emaLong,
      macd: mainInd.macdHistogram > 0 && mainInd.macdHistogram > mainInd.macdSignal,
      volume: lastVolume > mainInd.volumeSMA * 1.5,
      fibonacci: lastClose <= mainInd.fibLevels.level61
    };
    
    const sellConditions = {
      rsi: mainInd.rsi > 70,
      stochastic: mainInd.stochasticK > 80 && mainInd.stochasticK < mainInd.stochasticD,
      ema: mainInd.emaShort < mainInd.emaLong,
      macd: mainInd.macdHistogram < 0 && mainInd.macdHistogram < mainInd.macdSignal,
      volume: lastVolume > mainInd.volumeSMA * 1.5,
      fibonacci: lastClose >= mainInd.fibLevels.level38
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
    }
    // Sinyal counter-trend (hanya jika 5+ kondisi)
    else if (buyScore >= 5) {
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
    }
    else if (sellScore >= 5) {
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
    }
    
    return signal;
  };

  // Eksekusi trade dengan manajemen risiko
  const executeTrade = async (signal) => {
    if (!clientRef.current || !signal) return;
    
    try {
      // Hitung ukuran posisi (1% risiko)
      const usdtBalance = balance.USDT;
      const riskAmount = usdtBalance * (settings.riskPerTrade / 100);
      const entryPrice = signal.price;
      
      // Hitung SL dan TP berdasarkan ATR
      const atrValue = indicators.main.atr;
      const sl = signal.type === 'BUY' 
        ? entryPrice - (1.5 * atrValue)
        : entryPrice + (1.5 * atrValue);
      
      const tp = signal.type === 'BUY' 
        ? entryPrice + (settings.rrr * 1.5 * atrValue)
        : entryPrice - (settings.rrr * 1.5 * atrValue);
      
      // Hitung kuantitas
      const priceDifference = Math.abs(entryPrice - sl);
      const quantity = riskAmount / priceDifference;
      
      // Simulasi order
      const newTrade = {
        id: `TRADE-${Date.now()}`,
        symbol,
        type: signal.type,
        quantity: parseFloat(quantity.toFixed(6)),
        entryPrice,
        stopLoss: parseFloat(sl.toFixed(2)),
        takeProfit: parseFloat(tp.toFixed(2)),
        timestamp: Date.now(),
        status: 'OPEN',
        signalScore: signal.score,
        counterTrend: signal.counterTrend || false
      };
      
      // Update state
      setTrades(prev => [...prev, newTrade]);
      
      // Simulasi update balance
      if (signal.type === 'BUY') {
        setBalance(prev => ({
          USDT: prev.USDT - (entryPrice * quantity),
          BTC: prev.BTC + quantity
        }));
      } else {
        setBalance(prev => ({
          USDT: prev.USDT + (entryPrice * quantity),
          BTC: prev.BTC - quantity
        }));
      }
      
      return newTrade;
      
    } catch (error) {
      console.error('Trade execution error:', error);
    }
  };

  // Main bot loop
  const runBotCycle = async () => {
    if (botStatus !== 'running') return;
    
    try {
      const candlesData = await fetchMultiTimeframeCandles();
      if (!candlesData) return;
      
      const signal = generateSignal(candlesData, indicators);
      if (signal) {
        setSignals(prev => [signal, ...prev.slice(0, 19)]);
        await executeTrade(signal);
      }
      
      // Hitung statistik performa
      calculatePerformance();
      
    } catch (error) {
      console.error('Bot cycle error:', error);
    }
  };

  // Setup Binance client
  useEffect(() => {
    if (config.apiKey && config.apiSecret) {
      clientRef.current = createClient(
        config.apiKey, 
        config.apiSecret, 
        config.isTestnet
      );
      
      // Inisialisasi balance
      setBalance({ USDT: 10000, BTC: 0 });
      fetchMultiTimeframeCandles();
    }
  }, [config]);

  // Setup bot interval
  useEffect(() => {
    if (botStatus === 'running') {
      runBotCycle(); // Jalankan segera
      botIntervalRef.current = setInterval(runBotCycle, 30000); // Jalankan setiap 30 detik
    } else {
      clearInterval(botIntervalRef.current);
    }
    
    return () => clearInterval(botIntervalRef.current);
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
    if (candles.length < 30) return null;
    
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
      <div className="h-96">
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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FaChartLine className="text-blue-500 text-2xl" />
            <h1 className="text-xl font-bold">ProTrade Bot</h1>
            <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
              {config.isTestnet ? 'TESTNET' : 'LIVE'}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-400">Equity: </span>
              <span className="font-bold">
                ${(balance.USDT + (balance.BTC * (candles[candles.length - 1]?.close || 0))).toFixed(2)}
              </span>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => setBotStatus('running')}
                disabled={botStatus === 'running'}
                className={`px-3 py-1 rounded flex items-center ${
                  botStatus === 'running' 
                    ? 'bg-green-700 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <FaPlay className="mr-1" /> Start
              </button>
              <button 
                onClick={() => setBotStatus('stopped')}
                disabled={botStatus === 'stopped'}
                className={`px-3 py-1 rounded flex items-center ${
                  botStatus === 'stopped' 
                    ? 'bg-red-700 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <FaStop className="mr-1" /> Stop
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Panel Kontrol & Statistik */}
          <div className="lg:col-span-1 space-y-6">
            {/* Kontrol Bot */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <FaSync className="mr-2 text-blue-400" /> Bot Control
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Symbol</label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="1m">1 Minute</option>
                    <option value="3m">3 Minutes</option>
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Risk Management</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Risk per Trade</span>
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
                <div className="text-sm">
                  <div className="text-gray-400">Current Status</div>
                  <div className={botStatus === 'running' ? 'text-green-400' : 'text-red-400'}>
                    {botStatus === 'running' ? 'RUNNING' : 'STOPPED'}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-gray-400">Last Signal</div>
                  <div>
                    {signals.length > 0 ? 
                      new Date(signals[0].timestamp).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Statistik Akun */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <FaDollarSign className="mr-2 text-green-400" /> Account Summary
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">USDT Balance:</span>
                  <span className="font-bold">${balance.USDT.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Crypto Balance:</span>
                  <span className="font-bold">{balance.BTC.toFixed(6)} {symbol.replace('USDT', '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Equity:</span>
                  <span className="font-bold">
                    ${(balance.USDT + (balance.BTC * (candles[candles.length - 1]?.close || 0))).toFixed(2)}
                  </span>
                </div>
                
                {performanceStats && (
                  <div className="pt-3 border-t border-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Win Rate:</span>
                      <span className={performanceStats.winRate > 60 ? 'text-green-400' : 'text-yellow-400'}>
                        {performanceStats.winRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expectancy:</span>
                      <span className={performanceStats.expectancy > 0 ? 'text-green-400' : 'text-red-400'}>
                        ${performanceStats.expectancy}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Net Profit:</span>
                      <span className={performanceStats.netProfit > 0 ? 'text-green-400' : 'text-red-400'}>
                        ${performanceStats.netProfit.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Drawdown:</span>
                      <span className="text-orange-400">
                        {performanceStats.maxDrawdown}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Chart Utama */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Market Analysis - {symbol} ({timeframe})</h2>
              <div className="flex space-x-2">
                {indicators.main && (
                  <div className="flex space-x-2">
                    <div className={`px-2 py-1 rounded text-xs ${
                      indicators.main.emaShort > indicators.main.emaLong 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white'
                    }`}>
                      EMA: {indicators.main.emaShort > indicators.main.emaLong ? 'BULL' : 'BEAR'}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      indicators.main.rsi < 30 
                        ? 'bg-green-500 text-white' 
                        : indicators.main.rsi > 70 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-700 text-gray-300'
                    }`}>
                      RSI: {indicators.main.rsi?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {renderMainChart()}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-700 p-3 rounded border border-gray-600">
                <div className="text-sm text-gray-400">Stochastic</div>
                <div className="text-xl">
                  {indicators.main?.stochasticK?.toFixed(1) || 'N/A'} / 
                  {indicators.main?.stochasticD?.toFixed(1) || 'N/A'}
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded border border-gray-600">
                <div className="text-sm text-gray-400">MACD</div>
                <div className="text-xl">
                  {indicators.main?.macdHistogram?.toFixed(2) || 'N/A'}
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded border border-gray-600">
                <div className="text-sm text-gray-400">Volume</div>
                <div className="text-xl">
                  {indicators.main?.volumeSMA 
                    ? (candles[candles.length - 1]?.volume / indicators.main.volumeSMA).toFixed(1) + 'x' 
                    : 'N/A'}
                </div>
              </div>
              <div className="bg-gray-700 p-3 rounded border border-gray-600">
                <div className="text-sm text-gray-400">ATR</div>
                <div className="text-xl">
                  {indicators.main?.atr?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sinyal dan Trading */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sinyal Terbaru */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Trading Signals</h2>
            
            <div className="space-y-4">
              {signals.slice(0, 3).map((signal, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded border ${
                    signal.type === 'BUY' 
                      ? 'border-green-500 bg-green-900 bg-opacity-20' 
                      : 'border-red-500 bg-red-900 bg-opacity-20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`font-bold ${
                        signal.type === 'BUY' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {signal.type} SIGNAL
                      </span>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded ml-2">
                        Score: {signal.score}/6
                      </span>
                      {signal.counterTrend && (
                        <span className="text-xs bg-yellow-700 px-2 py-1 rounded ml-2">
                          Counter-Trend
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(signal.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="text-sm mb-2">Price: ${signal.price.toFixed(2)}</div>
                  
                  <div className="flex flex-wrap gap-2">
                    {renderConditionBadge(signal.conditions.rsi, 'RSI')}
                    {renderConditionBadge(signal.conditions.stochastic, 'Stoch')}
                    {renderConditionBadge(signal.conditions.ema, 'EMA')}
                    {renderConditionBadge(signal.conditions.macd, 'MACD')}
                    {renderConditionBadge(signal.conditions.volume, 'Volume')}
                    {renderConditionBadge(signal.conditions.fibonacci, 'Fib')}
                  </div>
                </div>
              ))}
              
              {signals.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No trading signals detected yet
                </div>
              )}
            </div>
          </div>
          
          {/* Trading Aktif */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Active Positions</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-400">
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Entry</th>
                    <th className="pb-2">SL/TP</th>
                    <th className="pb-2">Current</th>
                    <th className="pb-2">PNL</th>
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
                      <tr key={trade.id} className="border-b border-gray-700">
                        <td className="py-2">{trade.symbol}</td>
                        <td className={`py-2 font-bold ${
                          trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {trade.type}
                        </td>
                        <td className="py-2">${trade.entryPrice.toFixed(2)}</td>
                        <td className="py-2">
                          <div>${trade.stopLoss.toFixed(2)}</div>
                          <div>${trade.takeProfit.toFixed(2)}</div>
                        </td>
                        <td className="py-2">${parseFloat(currentPrice).toFixed(2)}</td>
                        <td className={`py-2 font-bold ${
                          pnl > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${pnl.toFixed(2)}
                          <div className="text-xs">
                            {pnlPercent.toFixed(2)}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {trades.filter(t => t.status === 'OPEN').length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-500">
                        No active positions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Analisis Teknikal Lanjutan */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
          <h2 className="text-lg font-semibold mb-4">Advanced Technical Analysis</h2>
          <div className="h-96">
            <TechnicalAnalysis 
              symbol={`BINANCE:${symbol}`}
              colorTheme="dark"
              width="100%"
              height="100%"
              isTransparent
            />
          </div>
        </div>
        
        {/* Riwayat Trading */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Trade History</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400">
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Entry</th>
                  <th className="pb-2">Exit</th>
                  <th className="pb-2">Size</th>
                  <th className="pb-2">Duration</th>
                  <th className="pb-2">PNL</th>
                  <th className="pb-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {trades.filter(t => t.status === 'CLOSED').slice(0, 10).map((trade) => (
                  <tr key={trade.id} className="border-b border-gray-700">
                    <td className="py-2">
                      {new Date(trade.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="py-2">{trade.symbol}</td>
                    <td className={`py-2 font-bold ${
                      trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.type}
                    </td>
                    <td className="py-2">${trade.entryPrice.toFixed(2)}</td>
                    <td className="py-2">${trade.exitPrice.toFixed(2)}</td>
                    <td className="py-2">{trade.quantity.toFixed(6)}</td>
                    <td className="py-2">
                      {Math.round((trade.closeTime - trade.timestamp) / 60000)} min
                    </td>
                    <td className={`py-2 font-bold ${
                      trade.pnl > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${trade.pnl.toFixed(2)}
                    </td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        trade.closeReason === 'TP HIT' 
                          ? 'bg-green-900 text-green-300' 
                          : trade.closeReason === 'SL HIT'
                            ? 'bg-red-900 text-red-300'
                            : 'bg-gray-700'
                      }`}>
                        {trade.closeReason}
                      </span>
                    </td>
                  </tr>
                ))}
                
                {trades.filter(t => t.status === 'CLOSED').length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-gray-500">
                      No trade history yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfessionalTradingBot;