import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database operations for trading data
export const supabaseOperations = {
  // Save trade to database
  async saveTrade(trade) {
    const { data, error } = await supabase
      .from('trades')
      .insert([{
        id: trade.id,
        symbol: trade.symbol,
        type: trade.type,
        quantity: trade.quantity,
        entry_price: trade.entryPrice,
        exit_price: trade.exitPrice,
        stop_loss: trade.stopLoss,
        take_profit: trade.takeProfit,
        timestamp: trade.timestamp,
        close_time: trade.closeTime,
        status: trade.status,
        pnl: trade.pnl,
        close_reason: trade.closeReason,
        signal_score: trade.signalScore,
        counter_trend: trade.counterTrend,
        is_testnet: trade.isTestnet,
        trade_id: trade.tradeId,
        execution_delay: trade.executionDelay
      }])
    
    if (error) {
      console.error('Error saving trade:', error)
      throw error
    }
    return data
  },

  // Update trade
  async updateTrade(tradeId, updates) {
    const { data, error } = await supabase
      .from('trades')
      .update({
        exit_price: updates.exitPrice,
        close_time: updates.closeTime,
        status: updates.status,
        pnl: updates.pnl,
        close_reason: updates.closeReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', tradeId)
    
    if (error) {
      console.error('Error updating trade:', error)
      throw error
    }
    return data
  },

  // Save performance snapshot
  async savePerformanceSnapshot(performance) {
    const { data, error } = await supabase
      .from('performance_snapshots')
      .insert([{
        timestamp: Date.now(),
        total_trades: performance.totalTrades,
        winning_trades: performance.totalWins,
        losing_trades: performance.totalLosses,
        winrate: performance.winRate,
        total_pnl: performance.netProfit,
        balance_usdt: performance.balanceUSDT || 10000,
        balance_btc: performance.balanceBTC || 0,
        max_drawdown: performance.maxDrawdown,
        avg_win: performance.avgWin,
        avg_loss: performance.avgLoss,
        largest_win: performance.bestTrade,
        largest_loss: performance.worstTrade,
        consecutive_losses: performance.consecutiveLosses
      }])
    
    if (error) {
      console.error('Error saving performance snapshot:', error)
      throw error
    }
    return data
  },

  // Save winrate snapshot (every 5 minutes)
  async saveWinrateSnapshot(winrateData) {
    const { data, error } = await supabase
      .from('winrate_snapshots')
      .insert([{
        timestamp: Date.now(),
        winrate_1h: winrateData.winrate_1h || 0,
        winrate_4h: winrateData.winrate_4h || 0,
        winrate_24h: winrateData.winrate_24h || 0,
        winrate_7d: winrateData.winrate_7d || 0,
        winrate_30d: winrateData.winrate_30d || 0,
        trades_1h: winrateData.trades_1h || 0,
        trades_4h: winrateData.trades_4h || 0,
        trades_24h: winrateData.trades_24h || 0,
        trades_7d: winrateData.trades_7d || 0,
        trades_30d: winrateData.trades_30d || 0,
        wins_1h: winrateData.wins_1h || 0,
        wins_4h: winrateData.wins_4h || 0,
        wins_24h: winrateData.wins_24h || 0,
        wins_7d: winrateData.wins_7d || 0,
        wins_30d: winrateData.wins_30d || 0
      }])
    
    if (error) {
      console.error('Error saving winrate snapshot:', error)
      throw error
    }
    return data
  },

  // Get trades within time range
  async getTradesInTimeRange(startTime, endTime) {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .gte('timestamp', startTime)
      .lte('timestamp', endTime)
      .eq('status', 'CLOSED')
    
    if (error) {
      console.error('Error fetching trades:', error)
      throw error
    }
    return data
  },

  // Save bot log
  async saveLog(level, message, data = null) {
    const { error } = await supabase
      .from('bot_logs')
      .insert([{
        timestamp: Date.now(),
        level: level,
        message: message,
        data: data
      }])
    
    if (error) {
      console.error('Error saving log:', error)
    }
  },

  // Save balance snapshot
  async saveBalanceSnapshot(usdt, btc, totalValue) {
    const { data, error } = await supabase
      .from('balance_snapshots')
      .insert([{
        timestamp: Date.now(),
        usdt: usdt,
        btc: btc,
        total_value_usdt: totalValue
      }])
    
    if (error) {
      console.error('Error saving balance snapshot:', error)
      throw error
    }
    return data
  }
}