import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database operations for trading bot
export const supabaseOperations = {
  // Trades operations
  async saveTrade(trade) {
    const { data, error } = await supabase
      .from('trades')
      .insert([trade])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateTrade(tradeId, updates) {
    const { data, error } = await supabase
      .from('trades')
      .update(updates)
      .eq('id', tradeId)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async getTrades(limit = 100) {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  },

  async getTradesByDateRange(startDate, endDate) {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Performance tracking
  async savePerformanceSnapshot(performance) {
    const { data, error } = await supabase
      .from('performance_snapshots')
      .insert([performance])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async getLatestPerformance() {
    const { data, error } = await supabase
      .from('performance_snapshots')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
    
    if (error) throw error
    return data[0]
  },

  async getPerformanceHistory(hours = 24) {
    const startTime = Date.now() - (hours * 60 * 60 * 1000)
    const { data, error } = await supabase
      .from('performance_snapshots')
      .select('*')
      .gte('timestamp', startTime)
      .order('timestamp', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Winrate calculations
  async saveWinrateSnapshot(winrateData) {
    const { data, error } = await supabase
      .from('winrate_snapshots')
      .insert([winrateData])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async getWinrateHistory(hours = 24) {
    const startTime = Date.now() - (hours * 60 * 60 * 1000)
    const { data, error } = await supabase
      .from('winrate_snapshots')
      .select('*')
      .gte('timestamp', startTime)
      .order('timestamp', { ascending: true })
    
    if (error) throw error
    return data
  },

  async calculateCurrentWinrate() {
    // Get trades from last 24 hours for current winrate
    const last24h = Date.now() - (24 * 60 * 60 * 1000)
    const { data: trades, error } = await supabase
      .from('trades')
      .select('pnl, status')
      .eq('status', 'CLOSED')
      .gte('timestamp', last24h)
    
    if (error) throw error
    
    if (!trades || trades.length === 0) {
      return { winrate: 0, totalTrades: 0, wins: 0, losses: 0 }
    }

    const wins = trades.filter(trade => trade.pnl > 0).length
    const losses = trades.filter(trade => trade.pnl < 0).length
    const totalTrades = wins + losses
    const winrate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0

    return { winrate, totalTrades, wins, losses }
  },

  // Bot settings
  async saveBotSettings(settings) {
    const { data, error } = await supabase
      .from('bot_settings')
      .upsert([{ id: 'main', ...settings, updated_at: new Date().toISOString() }])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async getBotSettings() {
    const { data, error } = await supabase
      .from('bot_settings')
      .select('*')
      .eq('id', 'main')
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Balance tracking
  async saveBalanceSnapshot(balance) {
    const { data, error } = await supabase
      .from('balance_snapshots')
      .insert([{ ...balance, timestamp: Date.now() }])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async getLatestBalance() {
    const { data, error } = await supabase
      .from('balance_snapshots')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
    
    if (error) throw error
    return data[0]
  },

  // Real-time subscriptions
  subscribeToTrades(callback) {
    return supabase
      .channel('trades_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'trades' }, 
        callback
      )
      .subscribe()
  },

  subscribeToPerformance(callback) {
    return supabase
      .channel('performance_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'performance_snapshots' }, 
        callback
      )
      .subscribe()
  }
}