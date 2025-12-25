import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Field({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "-"}</div>
    </div>
  );
}

export default function PayrollDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setErr("");
    api(`/api/payrolls/${id}`)
      .then((res) => setData(res))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payroll Detail</h1>
          <p className="text-sm text-muted-foreground">ID: {id}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {err && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base">Tidak bisa akses data</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-500">{err}</CardContent>
        </Card>
      )}

      {data && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{data.user_name}</CardTitle>
            {data.masked ? <Badge variant="secondary">MASKED</Badge> : <Badge>OK</Badge>}
          </CardHeader>

          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Periode" value={data.periode} />
            <Field label="Catatan" value={data.catatan} />

            <Field label="Gaji Pokok" value={data.gaji_pokok} />
            <Field label="Tunjangan" value={data.tunjangan} />
            <Field label="Potongan" value={data.potongan} />
            <Field label="Total" value={data.total} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
