import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { fetchEmployees } from "@/lib/employeesApi";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export default function EmployeesPage() {
  const nav = useNavigate();
  const user = getUser();
  const canManage = user?.role === "fat" || user?.role === "director";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await fetchEmployees();
      setRows(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (e) {
      setErr(e.message || "Gagal load employees");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id) => {
    const ok = confirm("Yakin mau hapus employee ini?");
    if (!ok) return;

    try {
      await api(`/employees/${id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Employees</CardTitle>

          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              Refresh
            </Button>

            {canManage && (
              <Button onClick={() => nav("/employees/new")}>
                Add Employee
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {err && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {err}
            </div>
          )}

          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Belum ada pegawai.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow
                      key={r.id}
                      className="hover:bg-accent/40"
                    >
                      <TableCell className="font-medium">{r.employee_code}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.department ?? "-"}</TableCell>
                      <TableCell>{r.position ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "active" ? "default" : "secondary"}>
                          {r.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => nav(`/employees/${r.id}/salary-profile`)}
                          >
                            View Salary
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => nav(`/employees/${r.id}/salary-profile/new`)}
                          >
                            Set Salary
                          </Button>

                          {canManage && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => nav(`/employees/${r.id}/edit`)}
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
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!canManage && (
            <p className="mt-3 text-xs text-muted-foreground">
              *Staff hanya bisa melihat data employee dan salary profile. Edit/Delete hanya untuk FAT/DIRECTOR.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
