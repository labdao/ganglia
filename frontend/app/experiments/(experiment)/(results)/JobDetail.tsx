"use client";

import { getAccessToken } from "@privy-io/react-auth";
import backendUrl from "lib/backendUrl";
import { ChevronsUpDownIcon, DownloadIcon } from "lucide-react";
import React, { useEffect, useState } from "react";

import { CopyToClipboard } from "@/components/shared/CopyToClipboard";
import { TruncatedString } from "@/components/shared/TruncatedString";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label, LabelDescription } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataFile, JobDetail, selectToolDetail, ToolDetail, useSelector } from "@/lib/redux";
import { cn } from "@/lib/utils";

import { groupInputs } from "../(forms)/formUtils";
import LogViewer from "./LogViewer";

interface JobDetailProps {
  jobID: number | null;
}

export default function JobDetail({ jobID }: JobDetailProps) {
  const [job, setJob] = useState({} as JobDetail);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("raw-files");

  const tool = useSelector(selectToolDetail);

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
    const fetchData = async () => {
      try {
        const authToken = await getAccessToken(); // Get the access token
        const response = await fetch(`${backendUrl()}/jobs/${jobID}`, {
          headers: {
            Authorization: `Bearer ${authToken}`, // Include the authorization header
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        console.log("Fetched job:", data);
        setJob(data);
      } catch (error) {
        console.error("Error fetching job:", error);
      } finally {
        setLoading(false);
      }
    };

    if (job.State === "running") {
      fetchData();
      const intervalId = setInterval(fetchData, 5000);

      return () => clearInterval(intervalId);
    } else {
      fetchData();
    }
  }, [jobID, job.State]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full @container">
      <TabsList className="justify-start w-full px-6 pt-0 rounded-t-none">
        <TabsTrigger value="raw-files">Raw Files</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
        <TabsTrigger value="inputs">Inputs</TabsTrigger>

        {/*
        <TabsTrigger value="parameters">Parameters</TabsTrigger>
        */}
      </TabsList>
      <TabsContent value="raw-files">
        <FileList files={job.OutputFiles} />
      </TabsContent>
      <TabsContent value="logs">
        <div className="w-full">
          <LogViewer bacalhauJobID={job.BacalhauJobID} />
        </div>
      </TabsContent>
      <TabsContent value="inputs">
        <InputList userInputs={job.Inputs} tool={tool} />
      </TabsContent>

      {/*
      <TabsContent value="parameters" className="px-6 pt-0">
        {Object.entries(job.Inputs || {}).map(([key, val]) => (
          <div key={key} className="flex justify-between py-1 text-base border-b last:border-none last:mb-3">
            <span className="text-muted-foreground/50">{key.replaceAll("_", " ")}</span>
            <span>{val ? <TruncatedString value={val.toString()} trimLength={10} /> : <span className="text-muted-foreground">n/a</span>}</span>
          </div>
        ))}
      </TabsContent>
        */}
    </Tabs>
  );
}

function InputInfo({ input, value, inputKey }: { input: any; value: any; inputKey: string }) {
  const fileInfo = input?.type === "file" ? value?.split("/") : [];
  const fileName = fileInfo?.[1] || "";
  const fileCID = fileInfo?.[0] || "";

  return (
    <div className="px-6 py-2 border-b border-border/50 ">
      <div>
        <Label className="flex items-center justify-between gap-2">
          <span>
            <span>{inputKey.replaceAll("_", " ")}</span>{" "}
            <LabelDescription>
              {input?.type} {input?.array ? "array" : ""}
            </LabelDescription>{" "}
          </span>
        </Label>
        <div className="text-base ">
          {input?.type === "file" ? (
            <>
              {value ? (
                <FileDownloadLink fileName={fileName} fileCID={fileCID} className="text-accent hover:underline">
                  {fileName}
                </FileDownloadLink>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </>
          ) : (
            <CopyToClipboard string={value}>
              <span className="pb-2 break-words">{value || <span className="text-muted-foreground">None</span>}</span>
            </CopyToClipboard>
          )}
        </div>
        <div className="text-xs lowercase text-muted-foreground">
          <LabelDescription>{!input?.required && input?.default === "" ? "(Optional)" : ""}</LabelDescription>
          {input?.description}
        </div>
      </div>
    </div>
  );
}

function InputList({ userInputs, tool }: { userInputs: { [key: string]: any }; tool: ToolDetail }) {
  const groupedInputs = groupInputs(tool.ToolJson.inputs);
  return userInputs ? (
    <>
      {!!groupedInputs?.standard && (
        <>
          {Object.keys(groupedInputs?.standard || {}).map((groupKey) => {
            return (
              <div key={groupKey}>
                <div>
                  {Object.keys(groupedInputs?.standard[groupKey] || {}).map((key) => {
                    const input = groupedInputs?.standard?.[groupKey]?.[key];
                    return <InputInfo key={key} input={input} inputKey={key} value={userInputs?.[key]} />;
                  })}
                </div>
              </div>
            );
          })}

          {Object.keys(groupedInputs?.collapsible || {}).map((groupKey) => {
            return (
              <div key={groupKey}>
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center w-full gap-2 px-6 py-3 text-sm text-left lowercase text-muted-foreground font-heading">
                    <ChevronsUpDownIcon />
                    {groupKey.replace("_", "")}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pt-0 space-y-4">
                      {Object.keys(groupedInputs?.collapsible[groupKey] || {}).map((key) => {
                        const input = groupedInputs?.collapsible?.[groupKey]?.[key];
                        return <InputInfo key={key} input={input} inputKey={key} value={userInputs?.[key]} />;
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </>
      )}
    </>
  ) : (
    <div className="px-6 py-5">No inputs found.</div>
  );
}

function FileDownloadLink({
  fileCID,
  fileName,
  children,
  className,
}: {
  fileName: string;
  fileCID: string;
  children: React.ReactNode;
  className?: string;
}) {
  const handleDownload = async (fileCID: string, fileName: string) => {
    try {
      const authToken = await getAccessToken();
      const response = await fetch(`${backendUrl()}/datafiles/${fileCID}/download`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to download file");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <a target="#" onClick={() => handleDownload(fileCID, fileName)} className={cn("cursor-pointer", className)}>
      {children}
    </a>
  );
}

function FileList({ files }: { files: DataFile[] }) {
  return (
    <div>
      {!!files?.length ? (
        <>
          {files.map((file: DataFile) => (
            <div key={file.CID} className="flex items-center justify-between px-6 py-2 border-b border-border/50 last:border-none">
              <div>
                <FileDownloadLink fileName={file.Filename} fileCID={file.CID} className="text-accent hover:underline">
                  <TruncatedString value={file.Filename} trimLength={30} />
                </FileDownloadLink>
                <div className="opacity-70 text-muted-foreground">
                  <CopyToClipboard string={file.CID}>
                    cid: <TruncatedString value={file.CID} />
                  </CopyToClipboard>
                </div>
              </div>
              {/* @TODO: Add Filesize */}
              <Button size="icon" variant="outline" asChild>
                <FileDownloadLink fileName={file.Filename} fileCID={file.CID}>
                  <DownloadIcon />
                </FileDownloadLink>
              </Button>
            </div>
          ))}
        </>
      ) : (
        <div className="px-6 py-5">No files found.</div>
      )}
    </div>
  );
}
