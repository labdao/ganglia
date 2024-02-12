"use client";

import { ColumnDef } from "@tanstack/react-table";
import backendUrl from "lib/backendUrl";
import { DownloadIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { CopyToClipboard } from "@/components/shared/CopyToClipboard";
import { TruncatedString } from "@/components/shared/TruncatedString";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataFile } from "@/lib/redux";

import LogViewer from "./LogViewer";

interface JobDetailProps {
  jobID: number;
}

export interface JobDetail {
  ID: number | null;
  BacalhauJobID: string;
  State: string;
  Error: string;
  ToolID: string;
  FlowID: string;
  Inputs: {};
  InputFiles: DataFile[];
  OutputFiles: DataFile[];
  Status: string;
}

export default function JobDetail({ jobID }: JobDetailProps) {
  const [job, setJob] = useState({} as JobDetail);
  const [loading, setLoading] = useState(false);
  interface File {
    CID: string;
    Filename: string;
    Tags: Tag[];
  }

  interface Tag {
    Name: string;
    Type: string;
  }

  useEffect(() => {
    setLoading(true);
    fetch(`${backendUrl()}/jobs/${jobID}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched job:", data);
        setJob(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching job:", error);
        setLoading(false);
      });
  }, [jobID]);

  console.log(job);

  return (
    <Tabs defaultValue="parameters" className="w-full @container ">
      <TabsList className="justify-start w-full px-6 pt-0 rounded-t-none">
        <TabsTrigger value="parameters">Parameters</TabsTrigger>
        <TabsTrigger value="outputs">Outputs</TabsTrigger>
        <TabsTrigger value="inputs">Inputs</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
      </TabsList>
      <TabsContent value="parameters" className="px-6 pt-0">
        {Object.entries(job.Inputs || {}).map(([key, val]) => (
          <div key={key} className="flex justify-between py-1 text-base border-b last:border-none last:mb-3">
            <span className="text-muted-foreground/50">{key.replaceAll("_", " ")}</span>
            <span>{val ? <TruncatedString value={val.toString()} trimLength={10} /> : <span className="text-muted-foreground">n/a</span>}</span>
          </div>
        ))}
      </TabsContent>
      <TabsContent value="outputs">
        <FileList files={job.OutputFiles} />
      </TabsContent>
      <TabsContent value="inputs">
        <FileList files={job.InputFiles} />
      </TabsContent>
      <TabsContent value="logs">
        <div className="w-full">
          <LogViewer jobID={job.BacalhauJobID} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

function FileList({ files }: { files: DataFile[] }) {
  return (
    <div>
      {!!files?.length ? (
        <>
          {files.map((file: DataFile) => (
            <div key={file.CID} className="flex items-center justify-between px-6 py-2 text-xs border-b border-border/50 last:border-none">
              <div>
                <a target="_blank" href={`${backendUrl()}/datafiles/${file.CID}/download`} className="text-accent">
                  <TruncatedString value={file.Filename} trimLength={30} />
                </a>
                <div className="opacity-70 text-muted-foreground">
                  <CopyToClipboard string={file.CID}>
                    cid: <TruncatedString value={file.CID} />
                  </CopyToClipboard>
                </div>
              </div>
              {/* @TODO: Add Filesize */}
              <Button size="icon" variant="outline" asChild>
                <a target="_blank" href={`${backendUrl()}/datafiles/${file.CID}/download`}>
                  <DownloadIcon />
                </a>
              </Button>
            </div>
          ))}
        </>
      ) : (
        <>No files found.</>
      )}
    </div>
  );
}
