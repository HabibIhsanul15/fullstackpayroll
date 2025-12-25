import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEmployees } from "@/lib/employeesApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";

export default function EmployeesPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await fetchEmployees();
      setRows(data);
    } catch (e) {
      setErr(e.message || "Gagal load employees");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Employees</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}>Refresh</Button>
            <Button onClick={() => nav("/employees/new")}>Add Employee</Button>
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
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employee_code}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.department ?? "-"}</TableCell>
                      <TableCell>{r.position ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "active" ? "default" : "secondary"}>
                          {r.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
