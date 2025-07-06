"use client";

import { ScanLine } from "lucide-react";

export function Scanner() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-lg shadow-lg bg-card w-full max-w-md animate-in fade-in-50">
      <div className="relative w-48 h-48 mb-6">
        <div className="absolute inset-0 border-4 border-dashed border-primary/50 rounded-full animate-spin-slow"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-1 bg-accent/80 rounded-full animate-ping"></div>
        </div>
        <ScanLine
          className="absolute inset-0 m-auto text-primary scale-110"
          size={80}
        />
      </div>

      <h2 className="text-2xl font-bold mb-2 text-card-foreground">
        Automatisk skanning...
      </h2>
      <p className="text-muted-foreground mb-6">
        Vennligst hold førerens RFID-brikke nær leseren.
      </p>
    </div>
  );
}
