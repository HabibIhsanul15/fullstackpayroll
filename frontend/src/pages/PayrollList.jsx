import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { isAuthed } from "@/lib/auth";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function PayrollList() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ jangan fetch kalau belum login
    if (!isAuthed()) return;

    api("/payrolls") // ✅ jangan pakai /api/payrolls
      .then(setRows)
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Payroll</h1>
      {err && <p className="text-sm text-red-500">{err}</p>}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-accent"
                onClick={() => navigate(`/payrolls/${r.id}`)}
              >
                <TableCell>{r.user_name}</TableCell>
                <TableCell>{r.periode}</TableCell>
                <TableCell>
                  {r.masked ? (
                    <Badge variant="secondary">MASKED</Badge>
                  ) : (
                    <Badge>OK</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {rows.length === 0 && !err && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Tidak ada data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
