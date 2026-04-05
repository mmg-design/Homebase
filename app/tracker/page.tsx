"use client";
import dynamic from "next/dynamic";

const Tracker = dynamic(() => import("../../rule-of-100-tracker"), { ssr: false });

// Stub window.storage with localStorage so the tracker works in-browser
if (typeof window !== "undefined" && !(window as any).storage) {
  (window as any).storage = {
    get: (key: string) => Promise.resolve({ value: localStorage.getItem(key) }),
    set: (key: string, value: string) => { localStorage.setItem(key, value); return Promise.resolve(); },
  };
}

export default function TrackerPage() {
  return <Tracker />;
}
