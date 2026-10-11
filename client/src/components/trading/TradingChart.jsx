import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts'

const CHART_COLORS = {
  bg: '#0f1118',
  grid: '#1a1e2e',
  text: '#848e9c',
  crosshair: '#555',
  up: '#26a69a',
  down: '#ef5350',
  volume: 'rgba(38,166,154,0.3)',
  volumeDown: 'rgba(239,83,80,0.3)',
  ema8: '#f0b90b',
  ema21: '#1e88e5',
  ema50: '#e040fb',
  bb_upper: 'rgba(33,150,243,0.5)',
  bb_lower: 'rgba(33,150,243,0.5)',
  bb_mid: 'rgba(33,150,243,0.3)',
  sl: '#ef5350',
  tp: '#26a69a',
  entry: '#f0b90b',
}

function calcEMA(data, period) {
  if (data.length < period) return []
  const k = 2 / (period + 1)
  const ema = [{ time: data[period - 1].time, value: data.slice(0, period).reduce((s, d) => s + d.close, 0) / period }]
  for (let i = period; i < data.length; i++) {
    ema.push({ time: data[i].time, value: data[i].close * k + ema[ema.length - 1].value * (1 - k) })
  }
  return ema
}

function calcBB(data, period = 20, mult = 2) {
  if (data.length < period) return { upper: [], lower: [], mid: [] }
  const upper = [], lower = [], mid = []
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1)
    const mean = slice.reduce((s, d) => s + d.close, 0) / period
    const std = Math.sqrt(slice.reduce((s, d) => s + (d.close - mean) ** 2, 0) / period)
    mid.push({ time: data[i].time, value: mean })
    upper.push({ time: data[i].time, value: mean + std * mult })
    lower.push({ time: data[i].time, value: mean - std * mult })
  }
  return { upper, lower, mid }
}

function calcRSI(data, period = 14) {
  if (data.length < period + 1) return []
  const rsi = []
  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close
    if (change >= 0) avgGain += change; else avgLoss += Math.abs(change)
  }
  avgGain /= period; avgLoss /= period
  rsi.push({ time: data[period].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) })
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period
    rsi.push({ time: data[i].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) })
  }
  return rsi
}

export default function TradingChart({ candles = [], positions = [], symbol, onSymbolChange, indicators = {}, height = 500 }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const candleSeriesRef = useRef(null)
  const volumeSeriesRef = useRef(null)
  const indicatorSeriesRef = useRef({})
  const markerCache = useRef([])

  // Create chart on mount
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: CHART_COLORS.bg },
        textColor: CHART_COLORS.text,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: CHART_COLORS.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#2B2B43' },
        horzLine: { color: CHART_COLORS.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#2B2B43' },
      },
      rightPriceScale: { borderColor: CHART_COLORS.grid, scaleMargins: { top: 0.1, bottom: 0.2 } },
      timeScale: {
        borderColor: CHART_COLORS.grid,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
      handleScroll: { vertTouchDrag: false },
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      borderUpColor: CHART_COLORS.up,
      borderDownColor: CHART_COLORS.down,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
    })

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      indicatorSeriesRef.current = {}
    }
  }, [height])

  // Update candle data
  useEffect(() => {
    if (!candleSeriesRef.current || !candles.length) return
    candleSeriesRef.current.setData(candles)
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(
        candles.map(c => ({
          time: c.time,
          value: c.volume || 0,
          color: c.close >= c.open ? CHART_COLORS.volume : CHART_COLORS.volumeDown,
        }))
      )
    }
  }, [candles])

  // Update indicators
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !candles.length) return

    // Remove old indicator series
    Object.values(indicatorSeriesRef.current).forEach(s => {
      try { chartRef.current.removeSeries(s) } catch (_) {}
    })
    indicatorSeriesRef.current = {}

    // EMA 8
    if (indicators.ema8) {
      const s = chartRef.current.addLineSeries({ color: CHART_COLORS.ema8, lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
      s.setData(calcEMA(candles, 8))
      indicatorSeriesRef.current.ema8 = s
    }
    // EMA 21
    if (indicators.ema21) {
      const s = chartRef.current.addLineSeries({ color: CHART_COLORS.ema21, lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
      s.setData(calcEMA(candles, 21))
      indicatorSeriesRef.current.ema21 = s
    }
    // EMA 50
    if (indicators.ema50) {
      const s = chartRef.current.addLineSeries({ color: CHART_COLORS.ema50, lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
      s.setData(calcEMA(candles, 50))
      indicatorSeriesRef.current.ema50 = s
    }
    // Bollinger Bands
    if (indicators.bb) {
      const bb = calcBB(candles, 20, 2)
      const su = chartRef.current.addLineSeries({ color: CHART_COLORS.bb_upper, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false })
      su.setData(bb.upper)
      indicatorSeriesRef.current.bb_upper = su
      const sl = chartRef.current.addLineSeries({ color: CHART_COLORS.bb_lower, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false })
      sl.setData(bb.lower)
      indicatorSeriesRef.current.bb_lower = sl
      const sm = chartRef.current.addLineSeries({ color: CHART_COLORS.bb_mid, lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false })
      sm.setData(bb.mid)
      indicatorSeriesRef.current.bb_mid = sm
    }
  }, [candles, indicators])

  // Update position markers + SL/TP lines
  useEffect(() => {
    if (!candleSeriesRef.current || !candles.length) return

    // Remove old price lines
    markerCache.current.forEach(line => {
      try { candleSeriesRef.current.removePriceLine(line) } catch (_) {}
    })
    markerCache.current = []

    const markers = []
    const openPositions = positions.filter(p => p.status === 'open' && p.symbol === symbol)

    openPositions.forEach(pos => {
      // Entry price line
      const entryLine = candleSeriesRef.current.createPriceLine({
        price: pos.price || pos.openPrice,
        color: CHART_COLORS.entry,
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `${pos.tradeType?.toUpperCase() || pos.type?.toUpperCase()} @ ${(pos.price || pos.openPrice)?.toFixed(5)}`,
      })
      markerCache.current.push(entryLine)

      // SL line
      if (pos.sl) {
        const slLine = candleSeriesRef.current.createPriceLine({
          price: pos.sl,
          color: CHART_COLORS.sl,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SL ${pos.sl?.toFixed(5)}`,
        })
        markerCache.current.push(slLine)
      }

      // TP line
      if (pos.tp) {
        const tpLine = candleSeriesRef.current.createPriceLine({
          price: pos.tp,
          color: CHART_COLORS.tp,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP ${pos.tp?.toFixed(5)}`,
        })
        markerCache.current.push(tpLine)
      }

      // Marker arrow
      const time = candles[candles.length - 1]?.time
      if (time) {
        markers.push({
          time,
          position: pos.tradeType === 'buy' || pos.type === 'buy' ? 'belowBar' : 'aboveBar',
          color: pos.tradeType === 'buy' || pos.type === 'buy' ? CHART_COLORS.up : CHART_COLORS.down,
          shape: pos.tradeType === 'buy' || pos.type === 'buy' ? 'arrowUp' : 'arrowDown',
          text: `${(pos.tradeType || pos.type).toUpperCase()} ${pos.symbol}`,
        })
      }
    })

    // Closed trade markers
    positions.filter(p => p.status === 'closed' && p.symbol === symbol).slice(0, 20).forEach(pos => {
      const time = candles[Math.max(0, candles.length - Math.floor(Math.random() * 30) - 1)]?.time
      if (time) {
        markers.push({
          time,
          position: 'inBar',
          color: (pos.profit || 0) >= 0 ? CHART_COLORS.up : CHART_COLORS.down,
          shape: 'circle',
          text: `${(pos.profit || 0) >= 0 ? '+' : ''}${(pos.profit || 0).toFixed(2)}$`,
        })
      }
    })

    if (markers.length) {
      markers.sort((a, b) => a.time - b.time)
      candleSeriesRef.current.setMarkers(markers)
    }
  }, [positions, candles, symbol])

  // Live tick update
  const updateTick = useCallback((candle) => {
    if (!candleSeriesRef.current || !candle) return
    candleSeriesRef.current.update(candle)
  }, [])

  // Expose updateTick via ref
  useEffect(() => {
    if (chartContainerRef.current) {
      chartContainerRef.current._updateTick = updateTick
    }
  }, [updateTick])

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-[#1a1e2e]" style={{ background: CHART_COLORS.bg }}>
      {/* Symbol + price header */}
      <div ref={chartContainerRef} />
    </div>
  )
}
