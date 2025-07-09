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
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";

interface CheckedInTableProps {
  entries: CheckedInEntry[];
  onDelete?: (entry: CheckedInEntry) => void;
}

export function CheckedInTable({ entries, onDelete }: CheckedInTableProps) {
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
            <TableHead>Tidspunkt</TableHead>
            {onDelete && <TableHead className="text-right">Handlinger</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.historyId}>
              <TableCell className="font-medium">{entry.driver.name}</TableCell>
              <TableCell>{entry.driver.club}</TableCell>
              <TableCell>
                <Badge variant={
                  entry.paymentStatus === 'paid' 
                    ? 'default' 
                    : entry.paymentStatus === 'season_pass'
                    ? 'secondary'
                    : entry.paymentStatus === 'one_time_license'
                    ? 'outline'
                    : 'destructive'
                }>
                  {
                    entry.paymentStatus === 'paid'
                    ? 'Betalt'
                    : entry.paymentStatus === 'season_pass'
                    ? 'Årskort'
                    : entry.paymentStatus === 'one_time_license'
                    ? 'Engangslisens'
                    : 'Ubetalt'
                  }
                </Badge>
              </TableCell>
              <TableCell className="text-right">{entry.checkInTime}</TableCell>
              {onDelete && (
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onDelete(entry)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
