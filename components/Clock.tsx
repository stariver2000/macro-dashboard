"use client";
import { useState, useEffect } from "react";

function getTimeParts(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

function getEtLabel(date: Date) {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "short" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? "ET"
  );
}

export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const kst = getTimeParts(now, "Asia/Seoul");
  const et = getTimeParts(now, "America/New_York");
  const etLabel = getEtLabel(now);

  return (
    <div className="text-right text-xs leading-5">
      <div className="flex items-center justify-end gap-1">
        <span className="font-mono text-white">{kst.hour}:{kst.minute}:{kst.second}</span>
        <span className="text-gray-600">{kst.year}-{kst.month}-{kst.day}</span>
        <span className="text-gray-500">KST</span>
        <span className="text-gray-700 mx-1">·</span>
        <span className="font-mono text-gray-300">{et.hour}:{et.minute}:{et.second}</span>
        <span className="text-gray-600">{et.year}-{et.month}-{et.day}</span>
        <span className="text-gray-500">{etLabel}</span>
      </div>
    </div>
  );
}
