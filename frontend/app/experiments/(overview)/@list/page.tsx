"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { DataTable } from "@/components/ui/data-table";
import { AppDispatch, flowListThunk, selectFlowList } from "@/lib/redux";

export default function ListFlowFiles() {
  interface Flow {
    CID: string;
    Name: string;
    WalletAddress: string;
  }

  const shortenAddressOrCid = (addressOrCid: string) => {
    if (addressOrCid.length) {
      return `${addressOrCid.substring(0, 6)}...${addressOrCid.substring(addressOrCid.length - 4)}`;
    } else {
      return "";
    }
  }

  const columns: ColumnDef<Flow>[] = [
    {
      accessorKey: "Name",
      header: "Experiment",
      enableSorting: true,
      cell: ({ row }) => {
        return <Link href={`/experiments/${row.getValue("CID")}`}>{row.getValue("Name")}</Link>;
      },
    },
    {
      accessorKey: "CID",
      header: "CID",
      cell: ({ row }) => {
        return (
          <a target="_blank" href={`${process.env.NEXT_PUBLIC_IPFS_GATEWAY_ENDPOINT}${row.getValue("CID")}/`}>
            {shortenAddressOrCid(row.getValue("CID"))}
          </a>
        );
      },
    },
    {
      accessorKey: "WalletAddress",
      header: "User",
      cell: ({ row }) => {
        return shortenAddressOrCid(row.getValue("WalletAddress"));
      }
    },
    // {
    //   accessorKey: "Tags",
    //   header: "Tags",
    //   cell: ({ row }) => {
    //     return row.getValue("Tags").join(', ');
    //   }
    // },
  ];

  const dispatch = useDispatch<AppDispatch>();

  const flows = useSelector(selectFlowList);

  const [sorting, setSorting] = useState([{ id: "Name", desc: false }])

  useEffect(() => {
    dispatch(flowListThunk());
  }, [dispatch]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <DataTable columns={columns} data={flows} sorting={sorting} />
    </div>
  );
}
