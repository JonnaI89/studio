import type { CheckedInEntry } from "./check-in-dashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CheckedInTableProps {
  entries: CheckedInEntry[];
}

export function CheckedInTable({ entries }: CheckedInTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Ingen har sjekket inn enda.
      </p>
    );
  }

  return (
    <ScrollArea className="h-[60vh] md:h-[400px] border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Navn</TableHead>
            <TableHead>Klubb</TableHead>
            <TableHead className="text-right">Tidspunkt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...entries].reverse().map(({ driver, checkInTime }) => (
            <TableRow key={`${driver.id}-${checkInTime}`}>
              <TableCell className="font-medium">{driver.name}</TableCell>
              <TableCell>{driver.club}</TableCell>
              <TableCell className="text-right">{checkInTime}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
