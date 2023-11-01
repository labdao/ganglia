"use client";

import { ColumnDef } from "@tanstack/react-table";
import { RefreshCcw } from "lucide-react";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { AppDispatch, jobDetailThunk, jobPatchDetailThunk, selectJobDetail, selectJobDetailError, selectJobDetailLoading } from "@/lib/redux";

import LogViewer from "./LogViewer";

export default function JobDetail() {
  const dispatch = useDispatch<AppDispatch>();

  const job = useSelector(selectJobDetail);
  const loading = useSelector(selectJobDetailLoading);
  const error = useSelector(selectJobDetailError);

  interface File {
    CID: string;
    Filename: string;
  }

  const columns: ColumnDef<File>[] = [
    {
      accessorKey: "CID",
      header: "CID",
    },
    {
      accessorKey: "Filename",
      header: "Filename",
    },
  ];

  useEffect(() => {
    const jobBacalhauID = window.location.href.split("/").pop();
    if (jobBacalhauID) {
      dispatch(jobDetailThunk(jobBacalhauID));
    }
  }, [dispatch]);

  return (
    <>
      <div className="container mt-8">
        <Card className="pt-4">
          <CardTitle className="px-4 flex justify-between items-center border-b pb-4 mb-4">
            Job {job.BacalhauJobID}{" "}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => dispatch(jobPatchDetailThunk(job.BacalhauJobID))} disabled={loading}>
                <RefreshCcw size={20} className="mr-2" /> {loading ? "Updating..." : "Update"}
              </Button>
            </div>
          </CardTitle>
          <CardContent>
            {error && <Alert variant="destructive">{error}</Alert>}
            <div className="py-4 border-b">
              Bacalhau ID: <strong>{job.BacalhauJobID}</strong>
            </div>
            <div className="py-4 border-b">
              Status: <strong className="capitalize">{job.State}</strong>
            </div>
            <div className="py-4 border-b">
              Error: <strong>{job.Error || "None"}</strong>
            </div>
            <div className="py-4 border-b">
              Tool CID: <strong>{job.ToolID}</strong>
            </div>
            <div className="py-4">
              Flow Initial CID: <strong>{job.FlowID}</strong>
            </div>
          </CardContent>
        </Card>
        <Card className="mt-4">
          <div className="p-4 font-medium uppercase">Logs</div>
          <div className="bg-gray-50 px-4 pb-6">
            <LogViewer />
          </div>
        </Card>
        <Card className="mt-4">
          <div className="p-4 font-medium uppercase">Inputs</div>
          <div className="bg-gray-50">
            <DataTable columns={columns} data={job.Inputs} />
          </div>
        </Card>
        <Card className="mt-4">
          <div className="p-4 font-medium uppercase">Outputs</div>
          <div className="bg-gray-50">
            <DataTable columns={columns} data={job.Outputs} />
          </div>
        </Card>
      </div>
    </>
  );
}
