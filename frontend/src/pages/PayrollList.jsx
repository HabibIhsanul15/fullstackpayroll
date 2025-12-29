import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { getUser, isAuthed } from "@/lib/auth";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PayrollList() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const user = getUser();
  const canManage = user?.role === "fat" || user?.role === "director";

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await api("/payrolls");
      setRows(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthed()) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDelete = async (id) => {
    const ok = confirm("Yakin mau hapus payroll ini?");
    if (!ok) return;

    try {
      await api(`/payrolls/${id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payroll</h1>
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Status</TableHead>
              {/* ✅ Aksi cuma muncul kalau fat/director */}
              {canManage && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-accent"
                onClick={() => navigate(`/payrolls/${r.id}`)}
              >
                <TableCell>
                  <div className="font-medium">{r.employee_name ?? "-"}</div>
                  {r.employee_code && (
                    <div className="text-xs text-muted-foreground">{r.employee_code}</div>
                  )}
                </TableCell>

                <TableCell>{r.periode}</TableCell>
                <TableCell>
                  {r.masked ? (
                    <Badge variant="secondary">MASKED</Badge>
                  ) : (
                    <Badge>OK</Badge>
                  )}
                </TableCell>

                {/* ✅ tombol edit/delete hanya untuk fat/director */}
                {canManage && (
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/payrolls/${r.id}/edit`)}
                      >
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(r.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}

            {rows.length === 0 && !err && !loading && (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 4 : 3}
                  className="text-center text-muted-foreground"
                >
                  Tidak ada data.
                </TableCell>
              </TableRow>
            )}

            {loading && (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 4 : 3}
                  className="text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
