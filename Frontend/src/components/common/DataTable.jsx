import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EmptyState from "@/features/customer/components/EmptyState";
import { cn } from "@/lib/utils";

/**
 * Card-wrapped table with built-in loading and empty states.
 *
 * @param columns [{ key, header, cell: (row) => node, className?, align?: "right" }]
 * @param empty   { icon, title, subtitle } shown when there are no rows
 */
export default function DataTable({ columns, rows, rowKey = (r) => r.id, loading, hideEmpty, empty, loadingText = "Loading…" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/5 bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={cn(c.align === "right" && "text-right")}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                {loadingText}
              </TableCell>
            </TableRow>
          )}

          {!loading && rows.length === 0 && !hideEmpty && (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-0">
                <EmptyState
                  icon={empty?.icon}
                  title={empty?.title ?? "Nothing here yet"}
                  subtitle={empty?.subtitle}
                  className="border-0"
                />
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn(c.align === "right" && "text-right", c.className)}>
                    {c.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
