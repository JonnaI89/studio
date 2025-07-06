"use client";

import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";

interface ScannerProps {
  onScan: () => void;
  isScanning: boolean;
}

export function Scanner({ onScan, isScanning }: ScannerProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-lg shadow-lg bg-card w-full max-w-md animate-in fade-in-50">
      <div className="relative w-48 h-48 mb-6">
        <div className="absolute inset-0 border-4 border-dashed border-primary/50 rounded-full animate-spin-slow"></div>
        {isScanning ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-1 bg-accent/80 rounded-full animate-ping"></div>
          </div>
        ) : null}
        <ScanLine
          className={`absolute inset-0 m-auto text-primary transition-transform duration-500 ${
            isScanning ? 'scale-110' : 'scale-100'
          }`}
          size={80}
        />
      </div>

      <h2 className="text-2xl font-bold mb-2 text-card-foreground">
        Ready for Check-in
      </h2>
      <p className="text-muted-foreground mb-6">
        {isScanning ? "Scanning for RFID chip..." : "Click the button below to scan the driver's RFID chip."}
      </p>

      <Button
        onClick={onScan}
        disabled={isScanning}
        size="lg"
        className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg py-7 px-8 shadow-md transition-transform transform hover:scale-105"
      >
        <ScanLine className="mr-2 h-6 w-6" />
        {isScanning ? "Scanning..." : "Scan RFID"}
      </Button>
    </div>
  );
}
