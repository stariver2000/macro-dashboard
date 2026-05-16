"use client";
import { useState, useRef, useEffect } from "react";

const POPULAR_STOCKS = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "NVDA", name: "NVIDIA" },
  { ticker: "TSLA", name: "Tesla" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "META", name: "Meta" },
  { ticker: "GOOGL", name: "Alphabet" },
  { ticker: "JPM", name: "JPMorgan" },
  { ticker: "BRK-B", name: "Berkshire" },
  { ticker: "V", name: "Visa" },
  { ticker: "SPY", name: "S&P 500 ETF" },
  { ticker: "QQQ", name: "Nasdaq ETF" },
  { ticker: "GLD", name: "Gold ETF" },
  { ticker: "TLT", name: "장기채 ETF" },
  { ticker: "005930.KS", name: "삼성전자" },
  { ticker: "000660.KS", name: "SK하이닉스" },
];

interface Props {
  activeTickers: string[];
  onAdd: (ticker: string) => void;
  onClose: () => void;
}

export default function AddStockModal({ activeTickers, onAdd, onClose }: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim().toUpperCase();
    if (t) onAdd(t);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold">주식 종목 추가</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="티커 입력 (예: AAPL, 005930.KS)"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              추가
            </button>
          </form>

          <div>
            <p className="text-xs text-gray-500 mb-2">인기 종목</p>
            <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
              {POPULAR_STOCKS.map(({ ticker, name }) => {
                const isActive = activeTickers.includes(ticker);
                return (
                  <button
                    key={ticker}
                    type="button"
                    disabled={isActive}
                    onClick={() => !isActive && onAdd(ticker)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                      isActive
                        ? "border-gray-700 opacity-40 cursor-not-allowed"
                        : "border-gray-700 hover:border-gray-500 hover:bg-gray-800 cursor-pointer"
                    }`}
                  >
                    <span className="text-sm font-medium text-white">{ticker}</span>
                    <span className="text-xs text-gray-500 truncate">{name}</span>
                    {isActive && (
                      <span className="ml-auto text-xs text-gray-600 flex-shrink-0">추가됨</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-gray-600">
            Yahoo Finance 티커를 입력하세요. 이상탐지·S&P 동기화가 동일하게 적용됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
