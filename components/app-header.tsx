"use client";

import { Bell, Search } from "lucide-react";

export default function AppHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">

      <div className="flex items-center gap-4">

        <h1 className="text-xl font-semibold">
          Dashboard
        </h1>

      </div>

      <div className="flex items-center gap-4">

        <div className="relative">

          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search Property..."
            className="w-72 rounded-lg border pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

        </div>

        <button className="rounded-lg border p-2 hover:bg-gray-100">

          <Bell size={20} />

        </button>

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-semibold">

            M

          </div>

          <div>

            <p className="text-sm font-semibold">
              Mardiangr
            </p>

            <p className="text-xs text-gray-500">
              Administrator
            </p>

          </div>

        </div>

      </div>

    </header>
  );
}