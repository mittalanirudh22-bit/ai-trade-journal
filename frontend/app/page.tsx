"use client";

import { useState } from "react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from "recharts";

export default function Home() {

  const [file, setFile] =
    useState<File | null>(null);

  const [analytics, setAnalytics] =
    useState<any>(null);

  const [editingTrade, setEditingTrade] =
    useState<any>(null);
  
  const [aiInsights, setAiInsights] =
    useState("");  

  // ====================================
  // FILTERS
  // ====================================

  const [selectedSymbol, setSelectedSymbol] =
    useState("ALL");

  const [tradeFilter, setTradeFilter] =
    useState("ALL");

  // ====================================
  // UPLOAD CSV
  // ====================================

  const handleUpload = async () => {

    if (!file) return;

    const formData = new FormData();

    formData.append("file", file);

    try {

      const response = await fetch(
        "https://ai-trade-journal-1.onrender.com/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      setAnalytics(data);

    } catch (error) {

      console.error(error);

      alert("Upload failed");
    }
  };

  const generateAIInsights =
  async () => {

    if (!analytics) return;

    try {

      const response = await fetch(
        "https://ai-trade-journal-1.onrender.com/ai-insights",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({

            trades:
              analytics.trades,
          }),
        }
      );

      const data =
        await response.json();

      setAiInsights(
        data.insights
      );

    } catch (error) {

      console.error(error);

      alert(
        "Failed to generate AI insights"
      );
    }
};

  // ====================================
  // FILTERED TRADES
  // ====================================

  const filteredTrades = analytics
    ? analytics.trades.filter(
        (trade: any) => {

          const symbolMatch =
            selectedSymbol === "ALL"
              ? true
              : trade.symbol === selectedSymbol;

          const pnlMatch =
            tradeFilter === "ALL"
              ? true
              : tradeFilter === "PROFIT"
              ? trade.pnl > 0
              : trade.pnl < 0;

          return symbolMatch && pnlMatch;
        }
      )
    : [];
  

  // ====================================
  // METRICS
  // ====================================

  const totalTrades =
    filteredTrades.length;

  const totalPnl =
    filteredTrades.reduce(
      (sum: number, trade: any) =>
        sum + trade.pnl,
      0
    );

  const winners =
    filteredTrades.filter(
      (trade: any) => trade.pnl > 0
    );

  const losers =
    filteredTrades.filter(
      (trade: any) => trade.pnl < 0
    );

  const winRate =
    totalTrades > 0
      ? (
          (winners.length /
            totalTrades) *
          100
        ).toFixed(2)
      : "0";

  const averageTrade =
    totalTrades > 0
      ? (
          totalPnl /
          totalTrades
        ).toFixed(2)
      : "0";

  const averageWinner =
    winners.length > 0
      ? (
          winners.reduce(
            (sum: number, t: any) =>
              sum + t.pnl,
            0
          ) / winners.length
        ).toFixed(2)
      : "0";

  const averageLoser =
    losers.length > 0
      ? (
          losers.reduce(
            (sum: number, t: any) =>
              sum + t.pnl,
            0
          ) / losers.length
        ).toFixed(2)
      : "0";

  // ====================================
  // PROFIT FACTOR
  // ====================================

  const grossProfit =
    winners.reduce(
      (sum: number, t: any) =>
        sum + t.pnl,
      0
    );

  const grossLoss = Math.abs(
    losers.reduce(
      (sum: number, t: any) =>
        sum + t.pnl,
      0
    )
  );

  const profitFactor =
    grossLoss > 0
      ? (
          grossProfit /
          grossLoss
        ).toFixed(2)
      : "0";

  // ====================================
  // EXPECTANCY
  // ====================================

  const expectancy =
    (
      (
        (Number(winRate) / 100) *
        Number(averageWinner)
      ) -
      (
        (1 -
          Number(winRate) / 100) *
        Math.abs(
          Number(averageLoser)
        )
      )
    ).toFixed(2);

  // ====================================
  // MAX DRAWDOWN
  // ====================================

  let cumulative = 0;

  let peak = 0;

  let maxDrawdown = 0;

  filteredTrades.forEach((trade: any) => {

    cumulative += trade.pnl;

    if (cumulative > peak) {
      peak = cumulative;
    }

    const drawdown =
      peak - cumulative;

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  // ====================================
  // STREAKS
  // ====================================

  let currentWinStreak = 0;
  let maxWinStreak = 0;

  let currentLossStreak = 0;
  let maxLossStreak = 0;

  filteredTrades.forEach((trade: any) => {

    if (trade.pnl > 0) {

      currentWinStreak++;

      currentLossStreak = 0;

    } else {

      currentLossStreak++;

      currentWinStreak = 0;
    }

    if (
      currentWinStreak >
      maxWinStreak
    ) {
      maxWinStreak =
        currentWinStreak;
    }

    if (
      currentLossStreak >
      maxLossStreak
    ) {
      maxLossStreak =
        currentLossStreak;
    }
  });

  // ====================================
  // PNL BY STOCK
  // ====================================

  const chartData = Object.values(
    filteredTrades.reduce(
      (acc: any, trade: any) => {

        if (!acc[trade.symbol]) {

          acc[trade.symbol] = {
            symbol: trade.symbol,
            pnl: 0,
          };
        }

        acc[trade.symbol].pnl +=
          trade.pnl;

        return acc;

      },
      {}
    )
  );

  // ====================================
  // EQUITY CURVE
  // ====================================

  let runningPnl = 0;

  const equityCurve =
    filteredTrades.map(
      (trade: any, index: number) => {

        runningPnl += trade.pnl;

        return {
          trade: index + 1,
          equity: runningPnl,
        };
      }
    );

  // ====================================
  // DAILY PNL
  // ====================================

  const dailyMap: any = {};

  filteredTrades.forEach((trade: any) => {

   const rawDate =
    trade.trade_date || "Unknown";

   let formattedDate = rawDate;

   try {

     formattedDate =
       new Date(rawDate)
         .toISOString()
         .split("T")[0];

   } catch {

     formattedDate = rawDate;
   }

   if (!dailyMap[formattedDate]) {
     dailyMap[formattedDate] = 0;
   }

   dailyMap[formattedDate] += trade.pnl;
  });

// SORT DATES PROPERLY

const dailyPnlData =
  Object.entries(dailyMap)

    .sort(
      ([dateA], [dateB]) =>
        new Date(dateA).getTime() -
        new Date(dateB).getTime()
    )

    .map(([date, pnl]) => ({
      date,
      pnl,
    }));

  // ====================================
  // SETUP ANALYTICS
  // ====================================

  const setupMap: any = {};

  filteredTrades.forEach((trade: any) => {

    const setup =
      trade.setup || "Unknown";

    if (!setupMap[setup]) {

      setupMap[setup] = {
        setup,
        pnl: 0,
        trades: 0,
      };
    }

    setupMap[setup].pnl +=
      trade.pnl;

    setupMap[setup].trades += 1;
  });

  const setupData =
    Object.values(setupMap);

  // ====================================
  // EMOTION ANALYTICS
  // ====================================

  const emotionMap: any = {};

  filteredTrades.forEach((trade: any) => {

    const emotion =
      trade.emotion || "Unknown";

    if (!emotionMap[emotion]) {

      emotionMap[emotion] = {
        emotion,
        pnl: 0,
        trades: 0,
      };
    }

    emotionMap[emotion].pnl +=
      trade.pnl;

    emotionMap[emotion].trades += 1;
  });

  const emotionData =
    Object.values(emotionMap);

  // ====================================
  // MISTAKE ANALYTICS
  // ====================================

  const mistakeMap: any = {};

  filteredTrades.forEach((trade: any) => {

    const mistake =
      trade.mistake || "None";

    if (!mistakeMap[mistake]) {

      mistakeMap[mistake] = {
        mistake,
        pnl: 0,
        trades: 0,
      };
    }

    mistakeMap[mistake].pnl +=
      trade.pnl;

    mistakeMap[mistake].trades += 1;
  });

  const mistakeData =
    Object.values(mistakeMap);

  return (

    <main className="min-h-screen bg-black text-white p-10">

      {/* Heading */}

      <h1 className="text-7xl font-bold text-center mb-16">
        AI Trade Journal
      </h1>

      {/* Upload */}

      <div className="max-w-4xl mx-auto bg-zinc-900 p-10 rounded-3xl flex justify-between items-center mb-14">

        <input
          type="file"
          onChange={(e) =>
            setFile(
              e.target.files
                ? e.target.files[0]
                : null
            )
          }
        />

        <button
          onClick={handleUpload}
          className="bg-white text-black px-10 py-4 rounded-2xl font-bold"
        >
          Upload CSV
        </button>

      </div>

      {/* FILTERS */}

      {analytics && (

        <div className="flex gap-4 mb-12">

          <select
            value={selectedSymbol}
            onChange={(e) =>
              setSelectedSymbol(
                e.target.value
              )
            }
            className="bg-zinc-900 p-4 rounded-xl"
          >

            <option value="ALL">
              All Symbols
            </option>

            {[
              ...new Set(
                analytics.trades.map(
                  (trade: any) =>
                    trade.symbol
                )
              ),
            ].map((symbol: any) => (

              <option
                key={symbol}
                value={symbol}
              >
                {symbol}
              </option>
            ))}

          </select>

          <select
            value={tradeFilter}
            onChange={(e) =>
              setTradeFilter(
                e.target.value
              )
            }
            className="bg-zinc-900 p-4 rounded-xl"
          >

            <option value="ALL">
              All Trades
            </option>

            <option value="PROFIT">
              Winners
            </option>

            <option value="LOSS">
              Losers
            </option>

          </select>

        </div>
      )}
      {analytics && (

        <div className="mb-10">

         <button
           onClick={generateAIInsights}
           className="bg-white text-black px-8 py-4 rounded-2xl font-bold hover:scale-105 transition"
         >
           Generate AI Insights
         </button>

      </div>
      )}

      {/* DASHBOARD */}

      {analytics && (

        <>

          {/* METRICS */}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">

            <MetricCard
              title="Total PnL"
              value={`₹${totalPnl.toFixed(2)}`}
            />

            <MetricCard
              title="Win Rate"
              value={`${winRate}%`}
            />

            <MetricCard
              title="Trades"
              value={totalTrades}
            />

            <MetricCard
              title="Average Trade"
              value={`₹${averageTrade}`}
            />

            <MetricCard
              title="Average Winner"
              value={`₹${averageWinner}`}
            />

            <MetricCard
              title="Average Loser"
              value={`₹${averageLoser}`}
            />

            <MetricCard
              title="Profit Factor"
              value={profitFactor}
            />

            <MetricCard
              title="Expectancy"
              value={`₹${expectancy}`}
            />

            <MetricCard
              title="Max Drawdown"
              value={`₹${maxDrawdown}`}
            />

            <MetricCard
              title="Win Streak"
              value={maxWinStreak}
            />

            <MetricCard
              title="Loss Streak"
              value={maxLossStreak}
            />

          </div>

          {/* PNL BY STOCK */}

          <ChartContainer title="PnL by Stock">

            <ResponsiveContainer
              width="100%"
              height={400}
            >

              <BarChart data={chartData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="symbol" />

                <YAxis />

                <Tooltip />

                <Bar dataKey="pnl">

                  {chartData.map(
                    (
                      item: any,
                      index: number
                    ) => (

                      <Cell
                        key={index}
                        fill={
                          item.pnl >= 0
                            ? "#22c55e"
                            : "#ef4444"
                        }
                      />
                    )
                  )}

                </Bar>

              </BarChart>

            </ResponsiveContainer>

          </ChartContainer>

          {/* EQUITY CURVE */}

          <ChartContainer title="Equity Curve">

            <ResponsiveContainer
              width="100%"
              height={400}
            >

              <LineChart
                data={equityCurve}
              >

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="trade" />

                <YAxis />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="#22c55e"
                  strokeWidth={3}
                />

              </LineChart>

            </ResponsiveContainer>

          </ChartContainer>

          {/* DAILY PNL */}

          <ChartContainer title="Daily PnL">

            <ResponsiveContainer
              width="100%"
              height={400}
            >

              <BarChart
                data={dailyPnlData}
              >

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="date"
                />

                <YAxis />

                <Tooltip />

                <Bar dataKey="pnl">

                  {dailyPnlData.map(
                    (
                      item: any,
                      index: number
                    ) => (

                      <Cell
                        key={index}
                        fill={
                          item.pnl >= 0
                            ? "#22c55e"
                            : "#ef4444"
                        }
                      />
                    )
                  )}

                </Bar>

              </BarChart>

            </ResponsiveContainer>

          </ChartContainer>

          {/* SETUP ANALYTICS */}

          <AnalyticsTable
            title="Setup Analytics"
            data={setupData}
            columns={[
              "setup",
              "pnl",
              "trades",
            ]}
          />

          {/* EMOTION ANALYTICS */}

          <AnalyticsTable
            title="Emotion Analytics"
            data={emotionData}
            columns={[
              "emotion",
              "pnl",
              "trades",
            ]}
          />

          {/* MISTAKE ANALYTICS */}

          <AnalyticsTable
            title="Mistake Analytics"
            data={mistakeData}
            columns={[
              "mistake",
              "pnl",
              "trades",
            ]}
          />
          {aiInsights && (

  <div className="bg-zinc-900 p-8 rounded-3xl mb-12">

    <h2 className="text-4xl font-bold mb-6">
      AI Trading Coach
    </h2>

    <div className="whitespace-pre-wrap text-zinc-300 leading-8 text-lg">

      {aiInsights}

    </div>

  </div>
)}

          {/* TRADE HISTORY */}

          <div className="bg-zinc-900 p-8 rounded-3xl overflow-x-auto">

            <h2 className="text-4xl font-bold mb-8">
              Trade History
            </h2>

            <table className="w-full">

              <thead>

                <tr className="border-b border-zinc-700">

                  <th className="text-left py-4">
                    Symbol
                  </th>

                  <th className="text-left py-4">
                    Entry
                  </th>

                  <th className="text-left py-4">
                    Exit
                  </th>

                  <th className="text-left py-4">
                    Quantity
                  </th>

                  <th className="text-left py-4">
                    PnL
                  </th>

                  <th className="text-left py-4">
                    Date
                  </th>

                  <th className="text-left py-4">
                    Setup
                  </th>

                  <th className="text-left py-4">
                    Emotion
                  </th>

                  <th className="text-left py-4">
                    Mistake
                  </th>

                  <th className="text-left py-4">
                    Notes
                  </th>

                  <th className="text-left py-4">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredTrades.map(
                  (
                    trade: any,
                    index: number
                  ) => (

                    <tr
                      key={index}
                      className="border-b border-zinc-800"
                    >

                      <td className="py-6">
                        {trade.symbol}
                      </td>

                      <td className="py-6">
                        ₹{trade.entry_price}
                      </td>

                      <td className="py-6">
                        ₹{trade.exit_price}
                      </td>

                      <td className="py-6">
                        {trade.quantity}
                      </td>

                      <td
                        className={`py-6 font-bold ${
                          trade.pnl >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        ₹{trade.pnl}
                      </td>

                      <td className="py-6">
                        {trade.trade_date}
                      </td>

                      <td className="py-6">
                        {trade.setup}
                      </td>

                      <td className="py-6">
                        {trade.emotion}
                      </td>

                      <td className="py-6">
                        {trade.mistake}
                      </td>

                      <td className="py-6">
                        {trade.notes}
                      </td>

                      <td className="py-6">

                        <button
                          onClick={() =>
                            setEditingTrade(
                              trade
                            )
                          }
                          className="bg-white text-black px-4 py-2 rounded-xl font-bold"
                        >
                          Edit
                        </button>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </>
      )}

      {/* EDIT MODAL */}

      {editingTrade && (

        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

          <div className="bg-zinc-900 p-8 rounded-3xl w-[500px]">

            <h2 className="text-3xl font-bold mb-6">
              Edit Trade Journal
            </h2>

            <div className="space-y-4">

              <input
                type="text"
                placeholder="Setup"
                value={
                  editingTrade.setup
                }
                onChange={(e) =>
                  setEditingTrade({
                    ...editingTrade,
                    setup:
                      e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl bg-black border border-zinc-700"
              />

              <input
                type="text"
                placeholder="Emotion"
                value={
                  editingTrade.emotion
                }
                onChange={(e) =>
                  setEditingTrade({
                    ...editingTrade,
                    emotion:
                      e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl bg-black border border-zinc-700"
              />

              <input
                type="text"
                placeholder="Mistake"
                value={
                  editingTrade.mistake
                }
                onChange={(e) =>
                  setEditingTrade({
                    ...editingTrade,
                    mistake:
                      e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl bg-black border border-zinc-700"
              />

              <textarea
                placeholder="Notes"
                value={
                  editingTrade.notes
                }
                onChange={(e) =>
                  setEditingTrade({
                    ...editingTrade,
                    notes:
                      e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl bg-black border border-zinc-700 h-32"
              />

              <div className="flex gap-4">

                <button
                  onClick={async () => {

                    await fetch(
                      `https://ai-trade-journal-1.onrender.com/update-trade/${editingTrade.id}`,
                      {
                        method: "PUT",

                        headers: {
                          "Content-Type":
                            "application/json",
                        },

                        body:
                          JSON.stringify({
                            setup:
                              editingTrade.setup,

                            emotion:
                              editingTrade.emotion,

                            mistake:
                              editingTrade.mistake,

                            notes:
                              editingTrade.notes,
                          }),
                      }
                    );

                    const updatedTrades =
                      analytics.trades.map(
                        (
                          trade: any
                        ) =>

                          trade.id ===
                          editingTrade.id
                            ? editingTrade
                            : trade
                      );

                    setAnalytics({
                      ...analytics,
                      trades:
                        updatedTrades,
                    });

                    setEditingTrade(
                      null
                    );

                  }}
                  className="bg-white text-black px-6 py-3 rounded-xl font-bold"
                >
                  Save
                </button>

                <button
                  onClick={() =>
                    setEditingTrade(
                      null
                    )
                  }
                  className="bg-red-500 px-6 py-3 rounded-xl font-bold"
                >
                  Cancel
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}

function MetricCard({
  title,
  value,
}: any) {

  return (

    <div className="bg-zinc-900 p-6 rounded-3xl">

      <p className="text-zinc-400 text-sm mb-2">
        {title}
      </p>

      <h2 className="text-2xl font-bold">
        {value}
      </h2>

    </div>
  );
}

function ChartContainer({
  title,
  children,
}: any) {

  return (

    <div className="bg-zinc-900 p-8 rounded-3xl mb-12">

      <h2 className="text-4xl font-bold mb-8">
        {title}
      </h2>

      {children}

    </div>
  );
}

function AnalyticsTable({
  title,
  data,
  columns,
}: any) {

  return (

    <div className="bg-zinc-900 p-8 rounded-3xl mb-12 overflow-x-auto">

      <h2 className="text-4xl font-bold mb-8">
        {title}
      </h2>

      <table className="w-full">

        <thead>

          <tr className="border-b border-zinc-700">

            {columns.map(
              (column: string) => (

                <th
                  key={column}
                  className="text-left py-4 capitalize"
                >
                  {column}
                </th>
              )
            )}

          </tr>

        </thead>

        <tbody>

          {data.map(
            (row: any, index: number) => (

              <tr
                key={index}
                className="border-b border-zinc-800"
              >

                {columns.map(
                  (column: string) => (

                    <td
                      key={column}
                      className="py-6"
                    >

                      {column === "pnl" ? (

                        <span
                          className={
                            row[column] >= 0
                              ? "text-green-400 font-bold"
                              : "text-red-400 font-bold"
                          }
                        >
                          ₹
                          {row[column].toFixed(
                            2
                          )}
                        </span>

                      ) : (

                        row[column]
                      )}

                    </td>
                  )
                )}

              </tr>
            )
          )}

        </tbody>

      </table>

    </div>
  );
}