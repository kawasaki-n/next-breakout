"use client";

import dynamic from "next/dynamic";

// Use dynamic import for the Game component
const Game = dynamic(() => import("@/components/Game"));

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-8">ブロック崩し</h1>
      <Game />
    </div>
  );
}
