"use client";

import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import backendUrl from "lib/backendUrl";
import React, { useEffect, useState } from "react";

export default function ListToolFiles() {
  interface Tool {
    CID: string;
    Name: string;
    WalletAddress: string;
  }

  const columns: ColumnDef<Tool>[] = [
    {
      accessorKey: "Name",
      header: "Name",
    },
    {
      accessorKey: "CID",
      header: "CID",
      cell: ({ row }) => {
        return (
          <a target="_blank" href={`${process.env.NEXT_PUBLIC_IPFS_GATEWAY_ENDPOINT}${row.getValue("CID")}/`}>
            {row.getValue("CID")}
          </a>
        );
      },
    },
    {
      accessorKey: "WalletAddress",
      header: "Wallet Address",
    },
  ];

  const [tools, setTools] = useState<Tool[]>([]);

  useEffect(() => {
    fetch(`${backendUrl()}/tools`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched tools:", data);
        setTools(data);
      })
      .catch((error) => {
        console.error("Error fetching tools:", error);
      });
  }, []);

  return (
    <div className="border rounded-lg overflow-hidden">
      <DataTable columns={columns} data={tools} />
    </div>
  );
}
