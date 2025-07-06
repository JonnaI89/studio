import type { CheckedInEntry } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
            <TableHead>Betalingsstatus</TableHead>
            <TableHead className="text-right">Tidspunkt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...entries].reverse().map(({ driver, checkInTime, paymentStatus }) => (
            <TableRow key={`${driver.id}-${checkInTime}`}>
              <TableCell className="font-medium">{driver.name}</TableCell>
              <TableCell>{driver.club}</TableCell>
              <TableCell>
                <Badge variant={
                  paymentStatus === 'paid' 
                    ? 'default' 
                    : paymentStatus === 'season_pass'
                    ? 'secondary'
                    : 'destructive'
                }>
                  {
                    paymentStatus === 'paid'
                    ? 'Betalt'
                    : paymentStatus === 'season_pass'
                    ? 'Årskort'
                    : 'Ubetalt'
                  }
                </Badge>
              </TableCell>
              <TableCell className="text-right">{checkInTime}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
